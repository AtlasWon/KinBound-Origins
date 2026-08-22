/*
 * Launcher UI logic.
 *
 * One state machine drives the whole dock. The update panel is the only part
 * that changes shape, and it walks a fixed path:
 *
 *   idle / up-to-date  -> hidden, Play enabled
 *   available          -> "Update available", button reads Update
 *   downloading        -> progress bar, button disabled
 *   downloaded         -> "Ready to install", button reads Restart and install
 *   error              -> the reason, button reads Try again
 *   unconfigured       -> a one-line note, Play unaffected
 *
 * The rule the whole screen obeys: an update must never block Play. A player
 * who is offline, or who does not want the patch right now, still gets their
 * game. Only a *downloaded* update takes over, and even then only because
 * restarting is one click and reversible by just... not clicking it.
 */

const el = (id) => document.getElementById(id);

const ui = {
  version: el('version'),
  lastPlayed: el('last-played'),
  channel: el('channel'),
  panel: el('update-panel'),
  title: el('update-title'),
  updVersion: el('update-version'),
  notes: el('update-notes'),
  track: el('progress-track'),
  bar: el('progress-bar'),
  btnUpdate: el('btn-update'),
  btnNotes: el('btn-notes'),
  btnPlay: el('btn-play'),
  btnCheck: el('btn-check'),
  btnFolder: el('btn-folder'),
  toast: el('toast'),
};

let repoSlug = null;
let current = { status: 'idle' };

/* ------------------------------------------------------------- helpers */

let toastTimer = null;
function toast(message) {
  ui.toast.textContent = message;
  ui.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { ui.toast.hidden = true; }, 2600);
}

function relativeTime(ms) {
  if (!ms) return 'Never';
  const mins = Math.floor((Date.now() - ms) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(ms).toLocaleDateString();
}

/* --------------------------------------------------------- update panel */

function render(state) {
  current = state || { status: 'idle' };
  const s = current.status;

  ui.panel.classList.toggle('ready', s === 'downloaded');
  ui.panel.classList.toggle('failed', s === 'error');
  ui.btnNotes.hidden = !repoSlug;

  // Channel line.
  if (s === 'unconfigured') {
    ui.channel.textContent = 'Not configured';
    ui.channel.className = 'value';
  } else if (s === 'checking') {
    ui.channel.textContent = 'Checking...';
    ui.channel.className = 'value';
  } else if (s === 'up-to-date' || s === 'idle') {
    ui.channel.textContent = 'Up to date';
    ui.channel.className = 'value good';
  } else if (s === 'error') {
    ui.channel.textContent = 'Check failed';
    ui.channel.className = 'value warn';
  } else {
    ui.channel.textContent = 'Update ready';
    ui.channel.className = 'value warn';
  }

  const showPanel = s === 'available' || s === 'downloading' || s === 'downloaded'
    || s === 'error' || s === 'unconfigured';
  ui.panel.hidden = !showPanel;
  if (!showPanel) {
    ui.btnPlay.disabled = false;
    ui.btnCheck.disabled = false;
    return;
  }

  ui.updVersion.textContent = current.info?.version ? `v${current.info.version}` : '';
  ui.updVersion.hidden = !current.info?.version;
  ui.notes.textContent = '';
  ui.track.hidden = true;
  ui.btnUpdate.disabled = false;
  ui.btnCheck.disabled = false;
  ui.btnPlay.disabled = false;

  switch (s) {
    case 'unconfigured':
      ui.title.textContent = 'Update checks are not set up yet';
      ui.notes.textContent =
        'Add your GitHub owner and repo to launcher/config.json and the launcher '
        + 'will check for new versions of the launcher and the game together.';
      ui.btnUpdate.disabled = true;
      ui.btnUpdate.textContent = 'Update';
      ui.updVersion.hidden = true;
      break;

    case 'available':
      ui.title.textContent = 'Update available';
      ui.notes.textContent = current.info?.releaseNotes
        || 'Updates the launcher and the game together.';
      ui.btnUpdate.textContent = 'Update';
      break;

    case 'downloading': {
      const pct = Math.max(0, Math.min(100, current.progress || 0));
      ui.title.textContent = 'Downloading update';
      ui.track.hidden = false;
      ui.bar.style.width = `${pct}%`;
      ui.notes.textContent = `${pct.toFixed(0)}% complete`;
      ui.btnUpdate.disabled = true;
      ui.btnUpdate.textContent = 'Downloading...';
      ui.btnCheck.disabled = true;
      break;
    }

    case 'downloaded':
      ui.title.textContent = 'Update ready to install';
      ui.track.hidden = false;
      ui.bar.style.width = '100%';
      ui.notes.textContent =
        'KinBound will close, install, and reopen. Your saves are not touched.';
      ui.btnUpdate.textContent = 'Restart and install';
      break;

    case 'error':
      ui.title.textContent = 'Could not check for updates';
      ui.notes.textContent = current.error || 'Something went wrong.';
      ui.btnUpdate.textContent = 'Try again';
      ui.updVersion.hidden = true;
      break;
  }
}

/* ------------------------------------------------------------- wiring */

async function refresh() {
  const state = await window.launcher.getState();
  ui.version.textContent = `v${state.version}`;
  ui.lastPlayed.textContent = relativeTime(state.play?.lastPlayed);
  repoSlug = state.update?.repo ?? null;
  render(state.update);
}

ui.btnPlay.addEventListener('click', async () => {
  ui.btnPlay.disabled = true;
  ui.btnPlay.textContent = 'STARTING';
  await window.launcher.play();
});

ui.btnCheck.addEventListener('click', async () => {
  ui.btnCheck.disabled = true;
  const state = await window.launcher.checkForUpdates();
  render(state);
  if (state?.status === 'up-to-date') toast('You are on the latest version.');
  if (state?.status === 'unconfigured') toast('Set your repo in launcher/config.json first.');
  ui.btnCheck.disabled = false;
});

ui.btnUpdate.addEventListener('click', async () => {
  if (current.status === 'downloaded') { window.launcher.installUpdate(); return; }
  if (current.status === 'error') { render(await window.launcher.checkForUpdates()); return; }
  render(await window.launcher.downloadUpdate());
});

ui.btnNotes.addEventListener('click', () => {
  if (!repoSlug) return;
  window.launcher.openReleases(`https://github.com/${repoSlug}/releases`);
});

ui.btnFolder.addEventListener('click', () => window.launcher.openGameFolder());
el('btn-min').addEventListener('click', () => window.launcher.minimize());
el('btn-close').addEventListener('click', () => window.launcher.close());

window.launcher.onUpdateStatus(render);
window.launcher.onGameClosed(() => {
  ui.btnPlay.disabled = false;
  ui.btnPlay.textContent = 'PLAY';
  refresh();
});

refresh();
