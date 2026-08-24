// Type specimens, drawn through the game's own renderer.
//
// The point is to look at letters inside words rather than at blocks of text:
// the alphabet, the digits, the punctuation, then every creature name and
// every move name in the game. Pages are posted straight to /__shot so the
// game's own frame never paints over them.
//
// Usage: npx electron tools/capture.cjs tools/shots/fontspec.js

const d = window.dev;
await d.loadWait(1200);

const r = d.game.renderer;
const rend = await import('/build/js/engine/renderer.js');
const SCREEN_W = rend.SCREEN_W, SCREEN_H = rend.SCREEN_H;

const species = await (await fetch('/data/creatures/species.json')).json();
const moves = await (await fetch('/data/moves/moves.json')).json();
const kinNames = species.map((s) => s.name);
const moveNames = moves.map((m) => m.name);

async function post(name, canvas) {
  const res = await fetch('/__shot/' + encodeURIComponent(name), {
    method: 'POST', body: canvas.toDataURL('image/png'),
  });
  return res.text();
}

function zoom(src, factor) {
  const cv = document.createElement('canvas');
  cv.width = src.width * factor;
  cv.height = src.height * factor;
  const c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  c.drawImage(src, 0, 0, cv.width, cv.height);
  return cv;
}

// Draw a page of lines through the real text path and post it at 1x and 4x.
async function page(name, lines, opts) {
  const o = opts || {};
  r.clear(o.bg || '#f4f6fb');
  const color = o.color || '#232a3d';
  let y = 4;
  for (const line of lines) {
    r.text(line, 4, y, { color });
    y += 10;
  }
  await post(name, r.buffer);
  await post(name + '-4x', zoom(r.buffer, 4));
}

const out = [];

// 1. The alphabet and the digits, isolated and then packed.
out.push(await page('spec-alpha', [
  'ABCDEFGHIJKLM',
  'NOPQRSTUVWXYZ',
  'abcdefghijklm',
  'nopqrstuvwxyz',
  '0123456789',
  '.,:;!?\'"()[]',
  '-+=/\\<>@#$%&',
  'HHH III lll',
  'nnn ooo mmm',
]));

// 2. The pairs a 5x7 face traditionally gets wrong.
out.push(await page('spec-pairs', [
  'rn rm nn m ni in',
  'il li ll lI Il ii',
  'VA AV To Ta Ty Yo',
  'fi fl ft tt ry vy',
  'cl d. l. i. r. t.',
  'Hi Hill Mill Milk',
  'clim rnb bin lin',
]));

// 3. Every creature name, four to a line, as the player reads them.
const kinLines = [];
for (let i = 0; i < kinNames.length; i += 2) kinLines.push(kinNames.slice(i, i + 2).join('   '));
for (let p = 0; p * 14 < kinLines.length; p++) {
  out.push(await page('spec-kin' + p, kinLines.slice(p * 14, p * 14 + 14)));
}

// 4. Every move name.
const mvLines = [];
for (let i = 0; i < moveNames.length; i += 2) mvLines.push(moveNames.slice(i, i + 2).join('   '));
for (let p = 0; p * 14 < mvLines.length; p++) {
  out.push(await page('spec-move' + p, mvLines.slice(p * 14, p * 14 + 14)));
}

// 5. The tightest real names, big, on their own.
out.push(await page('spec-worst', [
  'Sprigling', 'Cinderpaw', 'Pipwing', 'Anchorling',
  'Silkbind', 'Rilltail', 'Chillbite', 'Bristlebuck',
  'Rimehound', 'Volcatrix', 'Quickstep', 'Wallshield',
]));

return { screen: [SCREEN_W, SCREEN_H], pages: out.length, kin: kinNames.length, moves: moveNames.length };
