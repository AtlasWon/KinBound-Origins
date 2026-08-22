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

/** Everything shipped with the app: index.html, build/js, data. */
function gameRoot() {
  return app.getAppPath();
}

/* ------------------------------------------------------------- protocol */

function registerGameProtocol() {
  const root = gameRoot();
  protocol.handle(GAME_SCHEME, (request) => {
    const url = new URL(request.url);
    let rel = decodeURIComponent(url.pathname);
    if (rel === '' || rel === '/') rel = '/index.html';

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
    width: 940,
    height: 600,
    minWidth: 820,
    minHeight: 540,
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
  launcherWindow.once('ready-to-show', () => launcherWindow.show());
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
    gameWindow.show();
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

function registerIpc() {
  ipcMain.handle('launcher:state', () => ({
    version: app.getVersion(),
    channel: updater?.channelLabel() ?? 'unconfigured',
    update: updater?.snapshot() ?? { status: 'unconfigured' },
    play: readPlayRecord(),
    gameFolder: gameRoot(),
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
    const probe = await gameWindow?.webContents.executeJavaScript(
      "import('./build/js/audio/audio.js').then((m) => JSON.stringify({"
      + " scene: window.game && window.game.scenes.top && window.game.scenes.top.name,"
      + " assets: window.game && window.game.assets.stats(),"
      + " audioOff: m.audio.isDisabled,"
      + " rendererMuted: true }))");
    console.log('  game state: ' + probe);
    if (probe && probe.includes('"audioOff":false')) {
      console.error('  !! WARNING: this run was NOT silent');
    }
    if (gameWindow) await shoot(gameWindow, 'launcher-03-game');
  } catch (err) {
    console.error('smoke failed:', err);
  } finally {
    app.exit(0);
  }
}

/* ------------------------------------------------------------------ boot */

// One launcher at a time: a second copy would fight the first over the update.
if (!app.requestSingleInstanceLock()) {
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
    if (process.env.KINBOUND_SMOKE || process.argv.includes('--smoke')) void runSmokeTest();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
