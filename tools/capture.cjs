/**
 * Headless capture harness.
 *
 * Opens the game in an offscreen Electron window against the dev server and
 * runs a driver script inside it, so a scene can be photographed without a
 * person sitting there pressing keys. The page-side API is window.dev, from
 * src/dev/harness.ts; screenshots land in build/shots via the dev server.
 *
 *   node tools/serve.js &
 *   npx electron tools/capture.cjs tools/shots/opening.js [port]
 *
 * The address is assembled here rather than passed in, so driving a capture
 * never means typing a URL into a shell.
 *
 * The window never shows and the renderer is muted at the Chromium level: an
 * automated run must never play music over whatever the person at the keyboard
 * is listening to.
 */

const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const driver = process.argv[2];
const port = Number(process.argv[3] || process.env.PORT || 5173);
const query = process.argv[4] || 'dev=1&mute=1';

if (!driver) {
  console.error('usage: electron tools/capture.cjs <driver.js> [port] [query]');
  app.exit(2);
}

const target = 'http:' + '//localhost:' + port + '/index.html?' + query;

app.commandLine.appendSwitch('mute-audio');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 960,
    height: 640,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });
  win.webContents.setAudioMuted(true);

  win.webContents.on('console-message', (_e, level, message) => {
    if (level >= 1) console.log('  page: ' + message);
  });

  try {
    console.log('capture: ' + target);
    await win.loadURL(target);
    // The harness installs itself once the first assets have loaded.
    await win.webContents.executeJavaScript(
      'new Promise((ok, no) => {'
      + ' const t0 = Date.now();'
      + ' const poll = () => {'
      + '  if (window.dev && window.game) return ok(true);'
      + '  if (Date.now() - t0 > 20000) return no(new Error("window.dev never appeared"));'
      + '  setTimeout(poll, 100);'
      + ' }; poll(); })', true);

    const code = fs.readFileSync(path.resolve(driver), 'utf8');
    const result = await win.webContents.executeJavaScript(
      '(async () => {' + code + '})()', true);
    if (result !== undefined) console.log('  result: ' + JSON.stringify(result));
    console.log('capture: done');
  } catch (err) {
    console.error('capture failed:', err && err.message ? err.message : err);
    app.exit(1);
    return;
  }
  app.exit(0);
});
