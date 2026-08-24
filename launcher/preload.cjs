/**
 * Preload bridge.
 *
 * The launcher UI is a web page and is treated as one: it gets a small, fixed
 * list of verbs and no access to Node, the filesystem or arbitrary IPC. Every
 * function here is a whole action rather than a primitive, so the page can ask
 * for "install the update" but never for "run this path".
 *
 * Two windows load this file, and they get different bridges. The game gets
 * exactly one verb -- "put my window into this display mode" -- because the
 * page cannot resize the window it lives in and the Fullscreen API is not the
 * same thing as a borderless-fullscreen desktop window. It does not get the
 * launcher's verbs, and the launcher does not get the game's.
 */

const { contextBridge, ipcRenderer } = require('electron');

/**
 * Which window is this?
 *
 * The flag comes from `additionalArguments` in main.cjs, which survives a
 * sandboxed preload where a lot of other things do not. The scheme check is a
 * belt-and-braces second opinion: the game is the only thing served over
 * kinbound://, and the launcher UI is the only thing loaded from a file URL.
 */
const isGameWindow =
  (Array.isArray(process.argv) && process.argv.includes('--kinbound-game'))
  || (typeof location !== 'undefined' && location.protocol === 'kinbound:');

if (isGameWindow) {
  contextBridge.exposeInMainWorld('kinbound', {
    /**
     * 'borderless' or 'windowed'. Applied to the window immediately and
     * remembered for the next launch. Anything else is ignored by the main
     * process rather than trusted.
     */
    setDisplayMode: (mode) => ipcRenderer.invoke('game:display-mode', mode),
    getDisplayMode: () => ipcRenderer.invoke('game:display-mode-get'),
  });
  // Nothing below this point is for the game.
  return;
}

contextBridge.exposeInMainWorld('launcher', {
  /** Version, update state, last-played record and install folder. */
  getState: () => ipcRenderer.invoke('launcher:state'),

  play: () => ipcRenderer.invoke('launcher:play'),

  checkForUpdates: () => ipcRenderer.invoke('launcher:check-update'),
  downloadUpdate: () => ipcRenderer.invoke('launcher:download-update'),
  installUpdate: () => ipcRenderer.invoke('launcher:install-update'),

  /** Release notes for the Patch Notes tab, fetched in the main process. */
  getReleaseNotes: (force) => ipcRenderer.invoke('launcher:release-notes', force),
  markNotesSeen: (version) => ipcRenderer.invoke('launcher:mark-notes-seen', version),

  /** 'borderless' or 'windowed'; how the game window opens, remembered. */
  setDisplayMode: (mode) => ipcRenderer.invoke('launcher:set-display-mode', mode),

  openGameFolder: () => ipcRenderer.invoke('launcher:open-folder'),
  openReleases: (url) => ipcRenderer.invoke('launcher:open-external', url),

  minimize: () => ipcRenderer.send('launcher:minimize'),
  close: () => ipcRenderer.send('launcher:close'),

  /** Push updates from the main process: update progress, game exit. */
  onUpdateStatus: (cb) => {
    ipcRenderer.on('launcher:update-status', (_e, payload) => cb(payload));
  },
  onGameClosed: (cb) => {
    ipcRenderer.on('launcher:game-closed', () => cb());
  },
});
