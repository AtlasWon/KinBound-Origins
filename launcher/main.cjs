/**
 * KinBound launcher -- Electron main process.
 *
 * Two windows and one job. The launcher window is the shopfront: version,
 * update state, and a Play button. The game window is the game, opened on
 * demand and sized to a whole-number scale of the 480x320 back buffer.
 *
 * CommonJS on purpose. The project itself is an ES module package, but the
 * Electron main process and its preload have the fewest surprises in CJS, and
 * electron-updater is CJS anyway.
 */

const { app, BrowserWindow, ipcMain, shell, protocol, net, screen } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');

const { Updater } = require('./updater.cjs');

/** Logical size of the game's back buffer, from src/engine/renderer.ts. */
const BUFFER_W = 480;
const BUFFER_H = 320;

/**
 * The game is served from a custom scheme rather than from a local HTTP port.
 *
 * This is not cosmetic. Save games live in localStorage, which is keyed by
 * origin -- and a throwaway HTTP server on a random port hands the game a new
 * origin on every launch, silently wiping every save. A fixed scheme gives one
 * stable origin (kinbound://game) for the life of the install.
 *
 * `standard` gives it real URL semantics so relative paths resolve, `secure`
 * satisfies the checks ES modules make, and `supportFetchAPI` lets the data
 * loader work unchanged.
 */
const GAME_SCHEME = 'kinbound';
const GAME_ORIGIN = `${GAME_SCHEME}://game`;

protocol.registerSchemesAsPrivileged([
  {
    scheme: GAME_SCHEME,
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
  },
]);

let launcherWindow = null;
let gameWindow = null;
let updater = null;
/** When the current game window opened, for the play-time counter. */
let gameStartedAt = 0;

/**
 * Whether this run should make any sound.
 *
 * Belt and braces, because getting this wrong plays music over whatever the
 * person at the keyboard is already listening to: the page is told to disable
 * its own audio *and* the renderer is muted at the Chromium level, so neither
 * a bug nor a stray Audio element can get through.
 */
function isSilentRun() {
  return Boolean(process.env.KINBOUND_SMOKE || process.env.KINBOUND_MUTE)
    || process.argv.includes('--mute')
    || process.argv.includes('--smoke');
}

/**
 * A smoke run is not a second launcher.
 *
 * It captures screenshots and quits. Two of those distinctions matter here:
 * it must not be turned away by the single-instance lock -- which exists so
 * two *player-facing* launchers cannot fight over an update -- and it must not
 * steal focus from whatever the person at the keyboard is actually doing.
 * Being silently killed by a launcher somebody left open is how a broken
 * screen ships unnoticed.
 */
const SMOKE = Boolean(process.env.KINBOUND_SMOKE) || process.argv.includes('--smoke');

/** Everything shipped with the app: index.html, build/js, data. */
function gameRoot() {
  return app.getAppPath();
}

/* ------------------------------------------------------------- protocol */

/**
 * The creature-art listing.
 *
 * Hand-drawn sprites live in assets/kin as <species-id>-front.png. The game
 * will not probe 96 URLs to find out which of them exist, so it asks for this
 * index; answering it from a directory read means the packaged app and a run
 * from source both report exactly what they are carrying, with no generated
 * file to keep in step. (fs reads through the asar transparently, so this works
 * inside the installer as well.) tools/serve.js answers it the same way for the
 * browser build, and tools/kinart.js writes a static copy for a plain host.
 */
const KIN_ART_INDEX = '/assets/kin/index.json';

function kinArtIndex(root) {
  let files = [];
  try {
    files = fs.readdirSync(path.join(root, 'assets', 'kin'))
      .filter((f) => f.toLowerCase().endsWith('.png'))
      .sort();
  } catch {
    // No art folder in this build: an empty listing is the right answer.
  }
  return new Response(JSON.stringify({ note: 'served from assets/kin', files }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function registerGameProtocol() {
  const root = gameRoot();
  protocol.handle(GAME_SCHEME, (request) => {
    const url = new URL(request.url);
    let rel = decodeURIComponent(url.pathname);
    if (rel === '' || rel === '/') rel = '/index.html';
    if (rel === KIN_ART_INDEX) return kinArtIndex(root);

    // Resolve inside the app directory and refuse anything that escapes it.
    const target = path.normalize(path.join(root, rel));
    if (target !== root && !target.startsWith(root + path.sep)) {
      return new Response('Forbidden', { status: 403 });
    }
    return net.fetch(pathToFileURL(target).toString());
  });
}

/* --------------------------------------------------------------- windows */

function createLauncherWindow() {
  launcherWindow = new BrowserWindow({
    // Wide enough that the shelf, the stats row and the buttons all fit on one
    // line at the minimum size; below that the dock wraps rather than squashes.
    width: 1160,
    height: 720,
    minWidth: 980,
    minHeight: 640,
    show: false,
    frame: false,
    backgroundColor: '#12151f',
    title: 'KinBound',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  launcherWindow.removeMenu();
  launcherWindow.loadFile(path.join(__dirname, 'ui', 'index.html'));
  launcherWindow.once('ready-to-show', () => {
    if (SMOKE) launcherWindow.showInactive();
    else launcherWindow.show();
  });
  launcherWindow.on('closed', () => { launcherWindow = null; });
}

/**
 * Size the game window to an exact whole-number scale of the back buffer.
 *
 * The renderer only ever blits at integer scales, so any other size just adds
 * letterboxing. Picking the largest scale that fits comfortably on the display
 * means the window is pixel-perfect and full the moment it opens.
 */
function bestGameSize() {
  const { workAreaSize } = screen.getPrimaryDisplay();
  const scale = Math.max(
    1,
    Math.min(
      Math.floor((workAreaSize.width * 0.92) / BUFFER_W),
      Math.floor((workAreaSize.height * 0.88) / BUFFER_H),
    ),
  );
  return { width: BUFFER_W * scale, height: BUFFER_H * scale, scale };
}

function createGameWindow() {
  if (gameWindow) { gameWindow.focus(); return; }

  const { width, height } = bestGameSize();
  gameStartedAt = Date.now();
  gameWindow = new BrowserWindow({
    width,
    height,
    // Without this the frame is counted inside width/height, the canvas ends up
    // a few pixels short of a whole scale step, and the renderer drops to the
    // next one down -- a visibly smaller picture for no reason.
    useContentSize: true,
    backgroundColor: '#05060a',
    title: 'KinBound - Amber Version',
    icon: path.join(__dirname, 'icon.png'),
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      // The game is a plain web page and asks nothing of Node.
      preload: undefined,
      backgroundThrottling: false,
    },
  });

  gameWindow.removeMenu();
  const silent = isSilentRun();
  gameWindow.loadURL(`${GAME_ORIGIN}/index.html${silent ? '?mute=1' : ''}`);
  if (silent) gameWindow.webContents.setAudioMuted(true);
  gameWindow.once('ready-to-show', () => {
    if (SMOKE) gameWindow.showInactive();
    else gameWindow.show();
    if (launcherWindow) launcherWindow.hide();
  });

  // F11 toggles fullscreen; the game has no window management of its own.
  gameWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') {
      gameWindow.setFullScreen(!gameWindow.isFullScreen());
      event.preventDefault();
    }
  });

  gameWindow.on('closed', () => {
    if (gameStartedAt) {
      const record = readPlayRecord();
      record.seconds = (record.seconds ?? 0) + Math.round((Date.now() - gameStartedAt) / 1000);
      writePlayRecord(record);
      gameStartedAt = 0;
    }
    gameWindow = null;
    if (launcherWindow) {
      launcherWindow.show();
      launcherWindow.focus();
      launcherWindow.webContents.send('launcher:game-closed');
    } else if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}

/* ------------------------------------------------------------------- ipc */

function readPlayRecord() {
  const file = path.join(app.getPath('userData'), 'launcher-state.json');
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return { lastPlayed: null, launches: 0 };
  }
}

function writePlayRecord(record) {
  const file = path.join(app.getPath('userData'), 'launcher-state.json');
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(record, null, 2));
  } catch {
    // A launcher that cannot write its own stats is still a working launcher.
  }
}

/**
 * How big the install is on disk.
 *
 * Measured once and remembered: it does not change while the launcher is open,
 * and walking a tree on every state request would be a silly thing to do for a
 * line of text. node_modules and build output are skipped in a dev checkout so
 * the number means the same thing there as it does in a real install.
 */
let installBytes = null;
const SIZE_SKIP = new Set(['node_modules', '.git', 'dist', '.github']);

function dirSize(root, budget = 20000) {
  let total = 0;
  const stack = [root];
  while (stack.length && budget > 0) {
    const dir = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (SIZE_SKIP.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else {
        budget--;
        try { total += fs.statSync(full).size; } catch { /* vanished; ignore */ }
      }
    }
  }
  return total;
}

function installSize() {
  if (installBytes !== null) return installBytes;
  const root = app.isPackaged ? path.dirname(app.getPath('exe')) : app.getAppPath();
  try {
    const stat = fs.statSync(root);
    installBytes = stat.isDirectory() ? dirSize(root) : stat.size;
  } catch {
    installBytes = 0;
  }
  return installBytes;
}

/**
 * Release notes for the Patch Notes tab.
 *
 * Fetched here rather than in the page: the launcher UI runs under
 * default-src 'none' and has no network of its own, which is exactly how a
 * renderer that displays remote text should be. What crosses the bridge is a
 * fixed shape with the fields the tab draws, and nothing else.
 *
 * When GitHub cannot be reached -- offline, rate limited, no releases yet --
 * the bundled CHANGELOG.md answers instead, so the tab still says something
 * true about the version that is actually installed.
 */
function localChangelog() {
  try {
    const md = fs.readFileSync(path.join(app.getAppPath(), 'CHANGELOG.md'), 'utf8');
    const sections = [];
    const heading = /^##\s+v?(\d+\.\d+\.\d+)\s*$/gm;
    let match;
    let previous = null;
    while ((match = heading.exec(md))) {
      if (previous) previous.end = match.index;
      previous = { version: match[1], start: match.index + match[0].length, end: undefined };
      sections.push(previous);
    }
    return sections.map((s) => ({
      version: s.version,
      name: null,
      date: null,
      body: md.slice(s.start, s.end).replace(/^\s*---\s*$/gm, '').trim(),
      prerelease: false,
    }));
  } catch {
    return [];
  }
}

let notesCache = null;
const NOTES_TTL = 5 * 60 * 1000;

async function fetchReleaseNotes(force) {
  if (!force && notesCache && Date.now() - notesCache.at < NOTES_TTL) return notesCache.payload;

  const repo = updater && updater.configured ? updater.channelLabel() : null;
  let payload;

  if (!repo) {
    payload = { source: 'local', releases: localChangelog(), error: null };
  } else {
    try {
      const res = await net.fetch(
        'https://api.github.com/repos/' + repo + '/releases?per_page=12',
        { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'KinBound-Launcher' } },
      );
      if (!res.ok) throw new Error('GitHub returned ' + res.status);
      // A release published before the notes pipeline existed has an empty body
      // on GitHub. The changelog inside the package still knows what changed in
      // those versions, so it fills the gaps rather than leaving a version
      // heading with nothing under it.
      const local = new Map(localChangelog().map((r) => [r.version, r.body]));

      const releases = (await res.json())
        .filter((r) => !r.draft)
        .map((r) => {
          const version = String(r.tag_name || '').replace(/^v/, '');
          const body = String(r.body || '').trim();
          return {
            version,
            name: r.name || null,
            date: r.published_at || r.created_at || null,
            body: body || local.get(version) || '',
            prerelease: Boolean(r.prerelease),
          };
        })
        .filter((r) => /^\d+\.\d+\.\d+/.test(r.version));

      payload = releases.length
        ? { source: 'github', releases, error: null }
        : { source: 'local', releases: localChangelog(), error: 'No releases published yet.' };
    } catch {
      payload = {
        source: 'local',
        releases: localChangelog(),
        error: 'could not reach GitHub',
      };
    }
  }

  notesCache = { at: Date.now(), payload };
  return payload;
}

function registerIpc() {
  ipcMain.handle('launcher:state', () => ({
    version: app.getVersion(),
    channel: updater?.channelLabel() ?? 'unconfigured',
    update: updater?.snapshot() ?? { status: 'unconfigured' },
    play: readPlayRecord(),
    gameFolder: gameRoot(),
    install: { bytes: installSize() },
  }));

  ipcMain.handle('launcher:play', () => {
    const record = readPlayRecord();
    writePlayRecord({ lastPlayed: Date.now(), launches: (record.launches ?? 0) + 1 });
    createGameWindow();
    return true;
  });

  ipcMain.handle('launcher:check-update', () => updater?.check(true));
  ipcMain.handle('launcher:download-update', () => updater?.download());
  ipcMain.handle('launcher:install-update', () => updater?.install());

  ipcMain.handle('launcher:release-notes', (_e, force) => fetchReleaseNotes(Boolean(force)));

  ipcMain.handle('launcher:mark-notes-seen', (_e, version) => {
    // Written to the same file as the play record, not to the page's storage:
    // a "you have already read this" flag that an update could wipe would go
    // off again on every release.
    if (typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version)) return false;
    writePlayRecord({ ...readPlayRecord(), notesSeen: version });
    return true;
  });

  ipcMain.handle('launcher:open-folder', () => shell.openPath(gameRoot()));
  ipcMain.handle('launcher:open-external', (_e, url) => {
    // Only ever open the project's own links, never something a page supplied.
    if (typeof url === 'string' && /^https:\/\/github\.com\//.test(url)) {
      return shell.openExternal(url);
    }
    return false;
  });

  ipcMain.on('launcher:minimize', () => launcherWindow?.minimize());
  ipcMain.on('launcher:close', () => {
    if (gameWindow) gameWindow.close();
    launcherWindow?.close();
  });
}

/* ------------------------------------------------------------ smoke test */

/**
 * Render both windows, capture them, quit.
 *
 * The counterpart to the game's `?dev=1` harness: a way to check the launcher
 * still draws after a change without a person having to look at it. Writes into
 * build/shots, same as the game's screenshot flow.
 */
async function runSmokeTest() {
  // In a packaged build the app directory lives inside app.asar and is read
  // only, so the captures go to temp instead. Being able to run this against
  // the *installed* app is the whole point -- asar path resolution is exactly
  // what differs between a dev checkout and a real build.
  const out = app.isPackaged
    ? path.join(app.getPath('temp'), 'kinbound-smoke')
    : path.join(app.getAppPath(), 'build', 'shots');
  fs.mkdirSync(out, { recursive: true });

  const shoot = async (win, name) => {
    const image = await win.webContents.capturePage();
    fs.writeFileSync(path.join(out, `${name}.png`), image.toPNG());
    console.log(`smoke: ${name}.png`);
  };
  const settle = (ms) => new Promise((r) => setTimeout(r, ms));

  try {
    await settle(1200);
    if (launcherWindow) await shoot(launcherWindow, 'launcher-01-idle');

    // Drive the update panel through its states without touching the network,
    // so the layout of each one can actually be reviewed.
    for (const state of [
      { status: 'available', current: app.getVersion(), info: { version: '0.2.0', releaseNotes: 'New Bastion, rebuilt tileset, launcher update flow.' }, progress: 0, repo: 'example/kinbound' },
      { status: 'downloading', current: app.getVersion(), info: { version: '0.2.0' }, progress: 46, repo: 'example/kinbound' },
      { status: 'downloaded', current: app.getVersion(), info: { version: '0.2.0' }, progress: 100, repo: 'example/kinbound' },
    ]) {
      launcherWindow?.webContents.send('launcher:update-status', state);
      await settle(320);
      if (launcherWindow) await shoot(launcherWindow, `launcher-02-${state.status}`);
    }

    // Patch Notes. The fetch happens in the main process, so this exercises the
    // real call as well as the layout -- and prints what came back, because a
    // tab that quietly falls back to the bundled changelog looks fine in a
    // screenshot and is not fine.
    const notes = await fetchReleaseNotes(true);
    console.log('  release notes: ' + notes.source + ', ' + notes.releases.length + ' entries'
      + (notes.error ? ' (' + notes.error + ')' : ''));
    await launcherWindow?.webContents.executeJavaScript("showView('notes')");
    await settle(450);
    if (launcherWindow) await shoot(launcherWindow, 'launcher-04-notes');
    await launcherWindow?.webContents.executeJavaScript("showView('library')");
    await settle(200);

    createGameWindow();
    // Surface anything the game logs, so a broken data path shows up here
    // rather than as a mysteriously blank screenshot.
    gameWindow?.webContents.on('console-message', (_e, level, message) => {
      if (level >= 2) console.log('  game console: ' + message);
    });
    await settle(3500);
    const size = gameWindow?.getContentSize();
    const want = bestGameSize();
    console.log('  game window: ' + (size ? size.join('x') : 'none')
      + '  wanted ' + want.width + 'x' + want.height + ' (scale ' + want.scale + ')'
      + '  workArea ' + JSON.stringify(screen.getPrimaryDisplay().workAreaSize));
    // Audio state is part of the probe on purpose: the whole point of a silent
    // smoke run is that it makes no noise, and that is exactly the kind of
    // thing that quietly regresses. If this ever reports audioOff:false, an
    // automated run just played music over somebody's desk.
    // The kin-art count is here for the same reason: hand-drawn creature PNGs
    // live in assets/, are fetched over kinbound://game, and are only in the
    // installer because build.files says so. Every one of those three can be
    // true in a dev checkout and false in a real build, and the symptom -- a
    // roster that quietly reverts to generated sprites -- looks like nothing.
    const probe = await gameWindow?.webContents.executeJavaScript(
      "Promise.all([import('./build/js/audio/audio.js'), import('./build/js/gfx/kinart.js')])"
      + ".then(([m, k]) => { const art = k.kinArtReport(); return JSON.stringify({"
      + " scene: window.game && window.game.scenes.top && window.game.scenes.top.name,"
      + " assets: window.game && window.game.assets.stats(),"
      + " audioOff: m.audio.isDisabled,"
      + " kinArt: { species: art.species.length, images: art.entries.length,"
      + "   failed: art.notes.filter((n) => n.level === 'error').length },"
      + " rendererMuted: true }); })");
    console.log('  game state: ' + probe);
    if (probe && probe.includes('"audioOff":false')) {
      console.error('  !! WARNING: this run was NOT silent');
    }
    if (gameWindow) await shoot(gameWindow, 'launcher-03-game');

    // Exercise the real update check. This path has broken three times and
    // every failure only showed up on an installed build, so the smoke run
    // does the one thing a screenshot cannot: actually calls it.
    if (updater) {
      const snap = await updater.check(true);
      console.log(`  update check: ${snap.status}${snap.error ? ' - ' + snap.error : ''}`);
      if (snap.status === 'error') console.error('  !! the update check is broken');
      else console.log('  update check reached GitHub and returned a real answer');
    }
  } catch (err) {
    console.error('smoke failed:', err);
  } finally {
    app.exit(0);
  }
}

/* ------------------------------------------------------------------ boot */

// One launcher at a time: a second copy would fight the first over the update.
if (!SMOKE && !app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (gameWindow) { gameWindow.focus(); return; }
    if (launcherWindow) {
      if (launcherWindow.isMinimized()) launcherWindow.restore();
      launcherWindow.show();
      launcherWindow.focus();
    }
  });

  app.whenReady().then(() => {
    registerGameProtocol();
    registerIpc();
    createLauncherWindow();

    updater = new Updater({
      configPath: path.join(__dirname, 'config.json'),
      send: (payload) => launcherWindow?.webContents.send('launcher:update-status', payload),
    });
    // A silent check on startup, so the Play button already knows whether an
    // update is waiting by the time the player has read the version number.
    updater.check(false);

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createLauncherWindow();
    });

    // Smoke mode: render both windows, capture them, quit. Same idea as the
    // game's ?dev=1 harness -- a way to regression-check the launcher visually
    // without a human at the keyboard. Never runs unless the env var is set.
    if (SMOKE) void runSmokeTest();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
