/**
 * Update checking, against GitHub releases.
 *
 * The launcher and the game ship as one package, so one update covers both --
 * a release contains the Electron shell *and* the current build/js, data and
 * index.html. That is deliberate: splitting them would let a player end up
 * running new game data on an old launcher, which is the failure mode this
 * whole feature exists to prevent.
 *
 * Everything degrades quietly. If config.json has no repository filled in, the
 * launcher reports "not configured" and the Play button still works -- an
 * unconfigured or offline update check must never stand between a player and
 * their game.
 */

const fs = require('node:fs');
const path = require('node:path');
const { app } = require('electron');

/** @typedef {'unconfigured'|'idle'|'checking'|'available'|'downloading'|'downloaded'|'up-to-date'|'error'} Status */

class Updater {
  /**
   * @param {{ configPath: string, send: (payload: object) => void }} opts
   */
  constructor(opts) {
    this.send = opts.send;
    /** @type {Status} */
    this.status = 'idle';
    this.info = null;
    this.progress = 0;
    this.error = null;
    this.config = readConfig(opts.configPath);

    if (!this.configured) {
      this.status = 'unconfigured';
      return;
    }

    try {
      const { autoUpdater } = require('electron-updater');
      this.autoUpdater = autoUpdater;
      // The player presses the button; nothing downloads behind their back.
      autoUpdater.autoDownload = false;
      autoUpdater.autoInstallOnAppQuit = false;
      autoUpdater.allowPrerelease = Boolean(this.config.allowPrerelease);
      // Lets the check run from a dev checkout as well as a packaged build,
      // so the flow can actually be tested without cutting a release first.
      autoUpdater.forceDevUpdateConfig = true;
      autoUpdater.setFeedURL({
        provider: 'github',
        owner: this.config.github.owner,
        repo: this.config.github.repo,
      });
      this.bind();
    } catch (err) {
      this.status = 'error';
      this.error = describe(err);
    }
  }

  get configured() {
    const g = this.config?.github;
    return Boolean(g && g.owner && g.repo
      && !/^YOUR[-_]/i.test(g.owner) && !/^YOUR[-_]/i.test(g.repo));
  }

  channelLabel() {
    if (!this.configured) return 'unconfigured';
    return `${this.config.github.owner}/${this.config.github.repo}`;
  }

  bind() {
    const u = this.autoUpdater;
    u.on('checking-for-update', () => this.set('checking'));
    u.on('update-available', (info) => this.set('available', { info: pick(info) }));
    u.on('update-not-available', () => this.set('up-to-date'));
    u.on('download-progress', (p) => this.set('downloading', { progress: p.percent ?? 0 }));
    u.on('update-downloaded', (info) => this.set('downloaded', { info: pick(info), progress: 100 }));
    u.on('error', (err) => this.set('error', { error: describe(err) }));
  }

  /** @param {Status} status */
  set(status, extra = {}) {
    this.status = status;
    if ('info' in extra) this.info = extra.info;
    if ('progress' in extra) this.progress = extra.progress;
    this.error = 'error' in extra ? extra.error : null;
    this.send(this.snapshot());
  }

  snapshot() {
    return {
      status: this.status,
      current: app.getVersion(),
      info: this.info,
      progress: this.progress,
      error: this.error,
      repo: this.configured ? this.channelLabel() : null,
    };
  }

  /**
   * @param {boolean} manual True when the player pressed Check, which is the
   *   only case where "you are up to date" is worth saying out loud.
   */
  async check(manual) {
    if (!this.configured) { this.set('unconfigured'); return this.snapshot(); }
    // If the module failed to load, the constructor already recorded why.
    // Without this guard the next line throws "Cannot read properties of
    // undefined", which tells the player nothing and buries the real cause.
    if (!this.autoUpdater) {
      this.set('error', { error: this.error ?? 'The update component failed to load.' });
      return this.snapshot();
    }
    try {
      await this.autoUpdater.checkForUpdates();
    } catch (err) {
      // Offline is the common case here and is not an error worth shouting
      // about on a silent startup check.
      if (manual) this.set('error', { error: describe(err) });
      else this.set('idle');
    }
    return this.snapshot();
  }

  async download() {
    if (this.status !== 'available') return this.snapshot();
    try {
      this.set('downloading', { progress: 0 });
      await this.autoUpdater.downloadUpdate();
    } catch (err) {
      this.set('error', { error: describe(err) });
    }
    return this.snapshot();
  }

  /** Restarts into the installer. Nothing after this line runs. */
  install() {
    if (this.status !== 'downloaded') return false;
    setImmediate(() => this.autoUpdater.quitAndInstall(false, true));
    return true;
  }
}

/**
 * Config, with a user-writable override.
 *
 * The bundled copy ends up inside app.asar, which is read only -- so an
 * installed launcher whose repository was never filled in would have no way
 * back short of a full rebuild. Anything in the user data folder wins, which
 * means the repository can be pointed (or repointed) after install by dropping
 * one small file next to the save data.
 */
function readConfig(bundled) {
  const override = path.join(app.getPath('userData'), 'update-config.json');
  for (const file of [override, bundled]) {
    try {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (parsed && parsed.github && (parsed.github.owner || file === bundled)) return parsed;
    } catch {
      // Missing or malformed: fall through to the next candidate.
    }
  }
  return { github: { owner: '', repo: '' }, allowPrerelease: false };
}

/** Only the fields the launcher UI shows, so nothing large crosses the bridge. */
function pick(info) {
  if (!info) return null;
  return {
    version: info.version ?? null,
    releaseName: info.releaseName ?? null,
    releaseDate: info.releaseDate ?? null,
    releaseNotes: typeof info.releaseNotes === 'string'
      ? info.releaseNotes.replace(/<[^>]+>/g, '').trim().slice(0, 900)
      : null,
  };
}

function describe(err) {
  const msg = err && err.message ? String(err.message) : String(err);
  if (/ENOTFOUND|EAI_AGAIN|ETIMEDOUT|ECONNREFUSED|net::/i.test(msg)) {
    return 'Could not reach GitHub. Check your connection and try again.';
  }
  if (/404/.test(msg)) {
    return 'No releases found for that repository yet.';
  }
  // electron-builder only packages *production* dependencies. If
  // electron-updater ever drifts back into devDependencies it vanishes from
  // the build and only fails once installed, where it is hardest to diagnose.
  if (/Cannot find module 'electron-updater'/.test(msg)) {
    return 'This build shipped without its updater. electron-updater must be a '
      + 'dependency, not a devDependency.';
  }
  return msg.slice(0, 300);
}

module.exports = { Updater };
