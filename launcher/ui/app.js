/*
 * Launcher UI logic.
 *
 * Two views, one state machine. The library view owns Play and never lets an
 * update stand in front of it: a player who is offline, or who does not want
 * the patch right now, still gets their game. The update bar is the only part
 * of the screen that changes shape, and it walks a fixed path:
 *
 *   idle / up-to-date  -> hidden, Play enabled
 *   available          -> "Update available", button reads Update
 *   downloading        -> progress bar, button disabled
 *   downloaded         -> "Ready to install", button reads Restart and install
 *   error              -> the reason, button reads Try again
 *   unconfigured       -> a one-line note, Play unaffected
 *
 * Patch notes come from the main process (the renderer has no network of its
 * own -- its CSP is default-src 'none') and are rendered as constructed DOM
 * nodes. Never innerHTML: a release body is remote text, and the one place a
 * launcher touches remote text is not the place to be relaxed about it.
 */

const el = (id) => document.getElementById(id);

const ui = {
  railVersion: el('rail-version'),
  notesDot: el('notes-dot'),
  shelfSize: el('shelf-size'),
  cardFlag: el('card-flag'),

  sVersion: el('s-version'),
  sPlaytime: el('s-playtime'),
  sLast: el('s-last'),
  sUpdates: el('s-updates'),

  bar: el('update-bar'),
  barTitle: el('ub-title'),
  barSub: el('ub-sub'),
  barProgress: el('ub-progress'),
  barFill: el('ub-fill'),
  btnUpdate: el('btn-update'),
  btnBarNotes: el('btn-ub-notes'),
  btnBarClose: el('btn-ub-close'),

  btnPlay: el('btn-play'),
  btnCheck: el('btn-check'),
  btnFolder: el('btn-folder'),
  btnRefreshNotes: el('btn-refresh-notes'),

  notesBody: el('notes-body'),
  notesSource: el('notes-source'),
  toast: el('toast'),
};

let repoSlug = null;
let installed = '0.0.0';
let update = { status: 'idle' };
let notes = null;          // last successful payload from the main process
let notesSeen = null;      // newest version the player has already looked at
let dismissed = false;     // update bar closed by hand, until the state changes

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
  if (mins < 60) return mins + ' min ago';
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours + ' hour' + (hours === 1 ? '' : 's') + ' ago';
  const days = Math.floor(hours / 24);
  if (days < 30) return days + ' day' + (days === 1 ? '' : 's') + ' ago';
  return new Date(ms).toLocaleDateString();
}

function playTime(seconds) {
  if (!seconds || seconds < 60) return 'Under a minute';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h ? h + 'h ' + m + 'm' : m + 'm';
}

function fileSize(bytes) {
  if (!bytes) return '--';
  const mb = bytes / (1024 * 1024);
  return mb >= 1024 ? (mb / 1024).toFixed(1) + ' GB' : Math.round(mb) + ' MB';
}

/** Semver-ish compare, enough for x.y.z tags. */
function newer(a, b) {
  const pa = String(a || '0').split('.').map(Number);
  const pb = String(b || '0').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d > 0;
  }
  return false;
}

/* --------------------------------------------------------------- views */

function showView(name) {
  for (const btn of document.querySelectorAll('.rail-btn')) {
    const on = btn.dataset.view === name;
    btn.classList.toggle('is-active', on);
    btn.setAttribute('aria-selected', String(on));
  }
  el('view-library').classList.toggle('is-active', name === 'library');
  el('view-notes').classList.toggle('is-active', name === 'notes');

  if (name === 'notes') {
    loadNotes(false);
    markNotesSeen();
  }
}

/* --------------------------------------------------------- update state */

function statusLabel(s) {
  switch (s.status) {
    case 'unconfigured': return ['Not configured', ''];
    case 'checking': return ['Checking...', ''];
    case 'up-to-date': return ['Up to date', 'good'];
    case 'available': return ['v' + (s.info?.version ?? '?') + ' ready', 'warn'];
    case 'downloading': return ['Downloading', 'warn'];
    case 'downloaded': return ['Ready to install', 'warn'];
    case 'error': return ['Check failed', 'bad'];
    // Deliberately *not* "Up to date". The startup check is silent and falls
    // back to idle when it cannot reach GitHub, so a confident green tick here
    // would be shown to somebody who is offline, or whose repository has no
    // releases yet -- the two cases where they most need to know the check did
    // not happen.
    default: return ['Not checked', ''];
  }
}

function renderUpdate(next) {
  if (next && next.status !== update.status) dismissed = false;
  update = next || { status: 'idle' };
  const s = update.status;

  const [label, tone] = statusLabel(update);
  ui.sUpdates.textContent = label;
  ui.sUpdates.className = 'stat-v' + (tone ? ' ' + tone : '');

  ui.cardFlag.hidden = !(s === 'available' || s === 'downloaded');
  ui.cardFlag.textContent = s === 'downloaded' ? 'READY' : 'NEW';
  ui.btnBarNotes.hidden = !repoSlug;

  ui.bar.classList.toggle('ready', s === 'downloaded');
  ui.bar.classList.toggle('failed', s === 'error');

  const show = !dismissed && (s === 'available' || s === 'downloading'
    || s === 'downloaded' || s === 'error' || s === 'unconfigured');
  ui.bar.hidden = !show;

  // Play is never blocked by any of this.
  ui.btnPlay.disabled = false;
  ui.btnCheck.disabled = s === 'downloading';
  if (!show) return;

  ui.barProgress.hidden = true;
  ui.btnUpdate.disabled = false;
  ui.btnUpdate.hidden = false;

  const version = update.info?.version ? 'v' + update.info.version : '';

  switch (s) {
    case 'unconfigured':
      ui.barTitle.textContent = 'Update checks are not set up yet';
      ui.barSub.textContent = 'Add a GitHub owner and repo to launcher/config.json.';
      ui.btnUpdate.disabled = true;
      ui.btnUpdate.textContent = 'Update';
      ui.btnBarNotes.hidden = true;
      break;

    case 'available':
      ui.barTitle.textContent = 'Update available';
      ui.barSub.textContent = version
        + (update.info?.releaseName ? ' - ' + update.info.releaseName : '')
        + ' - updates the launcher and the game together.';
      ui.btnUpdate.textContent = 'Update';
      break;

    case 'downloading': {
      const pct = Math.max(0, Math.min(100, update.progress || 0));
      ui.barTitle.textContent = 'Downloading ' + (version || 'update');
      ui.barProgress.hidden = false;
      ui.barFill.style.width = pct + '%';
      ui.barSub.textContent = pct.toFixed(0) + '% complete';
      ui.btnUpdate.disabled = true;
      ui.btnUpdate.textContent = 'Downloading...';
      break;
    }

    case 'downloaded':
      ui.barTitle.textContent = 'Update ready to install';
      ui.barProgress.hidden = false;
      ui.barFill.style.width = '100%';
      ui.barSub.textContent = 'KinBound will close, install and reopen. Your saves are not touched.';
      ui.btnUpdate.textContent = 'Restart and install';
      break;

    case 'error':
      ui.barTitle.textContent = 'Could not check for updates';
      ui.barSub.textContent = update.error || 'Something went wrong.';
      ui.btnUpdate.textContent = 'Try again';
      break;
  }
}

async function refresh() {
  const state = await window.launcher.getState();
  installed = state.version;
  notesSeen = state.play?.notesSeen ?? null;
  repoSlug = state.update?.repo ?? null;

  ui.railVersion.textContent = 'v' + state.version;
  ui.sVersion.textContent = 'v' + state.version;
  ui.sPlaytime.textContent = state.play?.seconds ? playTime(state.play.seconds) : 'Not yet';
  ui.sLast.textContent = relativeTime(state.play?.lastPlayed);
  ui.shelfSize.textContent = fileSize(state.install?.bytes);

  renderUpdate(state.update);
  updateNotesDot();
}

/* ---------------------------------------------------------- patch notes */

function updateNotesDot() {
  const latest = notes?.releases?.[0]?.version
    ?? (update.status === 'available' ? update.info?.version : null);
  ui.notesDot.hidden = !(latest && newer(latest, notesSeen ?? installed));
}

function markNotesSeen() {
  const latest = notes?.releases?.[0]?.version;
  if (!latest || !newer(latest, notesSeen ?? installed)) { ui.notesDot.hidden = true; return; }
  notesSeen = latest;
  ui.notesDot.hidden = true;
  window.launcher.markNotesSeen(latest);
}

let notesLoading = false;
async function loadNotes(force) {
  if (notesLoading) return;
  if (notes && !force) { renderNotes(notes); return; }
  notesLoading = true;
  ui.btnRefreshNotes.disabled = true;
  if (!notes) {
    ui.notesBody.replaceChildren(node('p', 'muted', 'Loading...'));
  }

  const payload = await window.launcher.getReleaseNotes(Boolean(force));
  if (payload?.releases?.length) notes = payload;
  renderNotes(payload);
  updateNotesDot();

  notesLoading = false;
  ui.btnRefreshNotes.disabled = false;
}

function node(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

/**
 * Inline markdown, as text nodes and <strong>.
 *
 * Only bold and code spans, because that is all the changelog uses. Anything
 * unrecognised stays as literal text, which is the safe direction to fail in.
 */
function inline(parent, text) {
  const parts = String(text).split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith('**') && part.endsWith('**')) {
      parent.appendChild(node('strong', null, part.slice(2, -2)));
    } else if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      parent.appendChild(node('strong', null, part.slice(1, -1)));
    } else {
      parent.appendChild(document.createTextNode(part));
    }
  }
}

/** A release body, built as DOM nodes. Headings group, dashes list. */
function renderBody(parent, body) {
  const lines = String(body || '').replace(/\r/g, '').split('\n');
  let list = null;

  const closeList = () => { list = null; };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { closeList(); continue; }

    const heading = line.match(/^#{1,6}\s+(.*)$/);
    if (heading) {
      closeList();
      parent.appendChild(node('div', 'rel-group', heading[1]));
      continue;
    }

    const bullet = line.match(/^[-*]\s+(.*)$/);
    if (bullet) {
      if (!list) { list = node('ul', 'rel-list'); parent.appendChild(list); }
      const li = document.createElement('li');
      inline(li, bullet[1]);
      list.appendChild(li);
      continue;
    }

    // A wrapped continuation of the previous bullet, not a new paragraph.
    if (list) {
      const li = list.lastElementChild;
      if (li) { li.appendChild(document.createTextNode(' ')); inline(li, line); continue; }
    }

    const p = node('p', 'rel-para');
    inline(p, line);
    parent.appendChild(p);
  }
}

function renderNotes(payload) {
  const body = ui.notesBody;
  body.replaceChildren();

  const releases = payload?.releases ?? [];
  ui.notesSource.textContent = payload?.source === 'github'
    ? 'From ' + (repoSlug || 'GitHub')
    : payload?.source === 'local'
      ? 'From the bundled changelog' + (payload.error ? ' - ' + payload.error : '')
      : '\u00a0';

  if (!releases.length) {
    body.appendChild(node('p', 'muted',
      payload?.error || 'No releases have been published yet.'));
    return;
  }

  for (const rel of releases) {
    const card = node('section', 'release');
    const head = node('div', 'rel-head');
    head.appendChild(node('span', 'rel-ver', 'v' + rel.version));

    if (rel.version === installed) {
      head.appendChild(node('span', 'rel-tag installed', 'Installed'));
    } else if (newer(rel.version, installed)) {
      head.appendChild(node('span', 'rel-tag', 'New'));
    }
    if (rel.date) {
      head.appendChild(node('span', 'rel-date',
        new Date(rel.date).toLocaleDateString(undefined,
          { year: 'numeric', month: 'long', day: 'numeric' })));
    }

    card.appendChild(head);
    if (rel.body) renderBody(card, rel.body);
    else card.appendChild(node('p', 'muted', 'No notes were written for this release.'));
    body.appendChild(card);
  }
}

/* ------------------------------------------------------------- wiring */

for (const btn of document.querySelectorAll('.rail-btn')) {
  btn.addEventListener('click', () => showView(btn.dataset.view));
}

for (const card of document.querySelectorAll('.game-card')) {
  window.paintKeyArt?.(card.querySelector('.card-art'));
  card.addEventListener('click', () => {
    for (const other of document.querySelectorAll('.game-card')) {
      other.classList.toggle('is-active', other === card);
      other.setAttribute('aria-selected', String(other === card));
    }
  });
}

ui.btnPlay.addEventListener('click', async () => {
  ui.btnPlay.disabled = true;
  ui.btnPlay.textContent = 'STARTING';
  await window.launcher.play();
});

ui.btnCheck.addEventListener('click', async () => {
  ui.btnCheck.disabled = true;
  ui.btnCheck.textContent = 'Checking...';
  const next = await window.launcher.checkForUpdates();
  renderUpdate(next);
  if (next?.status === 'up-to-date') toast('You are on the latest version.');
  if (next?.status === 'unconfigured') toast('Set your repo in launcher/config.json first.');
  // A manual check is also the moment to pull fresh notes: whatever it found is
  // exactly what the Patch Notes tab should be showing.
  loadNotes(true);
  ui.btnCheck.textContent = 'Check for updates';
  ui.btnCheck.disabled = false;
});

ui.btnUpdate.addEventListener('click', async () => {
  if (update.status === 'downloaded') { window.launcher.installUpdate(); return; }
  if (update.status === 'error') { renderUpdate(await window.launcher.checkForUpdates()); return; }
  renderUpdate(await window.launcher.downloadUpdate());
});

ui.btnBarNotes.addEventListener('click', () => showView('notes'));
ui.btnBarClose.addEventListener('click', () => { dismissed = true; ui.bar.hidden = true; });
ui.btnRefreshNotes.addEventListener('click', () => loadNotes(true));
ui.btnFolder.addEventListener('click', () => window.launcher.openGameFolder());

el('btn-min').addEventListener('click', () => window.launcher.minimize());
el('btn-close').addEventListener('click', () => window.launcher.close());

window.launcher.onUpdateStatus(renderUpdate);
window.launcher.onGameClosed(() => {
  ui.btnPlay.disabled = false;
  ui.btnPlay.textContent = 'PLAY';
  refresh();
});

refresh();
// Fetched up front rather than on first visit: it decides whether the tab wears
// a dot, and a tab that only tells you it has news once you open it is not
// telling you anything.
loadNotes(false);
