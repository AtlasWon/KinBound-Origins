/**
 * Preload bridge.
 *
 * The launcher UI is a web page and is treated as one: it gets a small, fixed
 * list of verbs and no access to Node, the filesystem or arbitrary IPC. Every
 * function here is a whole action rather than a primitive, so the page can ask
 * for "install the update" but never for "run this path".
 */

const { contextBridge, ipcRenderer } = require('electron');

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
