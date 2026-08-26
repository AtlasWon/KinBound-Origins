// Page-breaks the Observatory scripts through the game's own text wrapper.
//
//   npx electron tools/capture.cjs tools/shots/_obsbox.js
//
// The dialogue box re-wraps authored lines by PIXEL width and then chunks the
// result three display lines to a page (src/ui/dialogue.ts, MAX_LINES). So a
// two-line `say` is usually two pages, and where the split lands is decided by
// the font rather than by the author -- which is how "There has never been" /
// "another way." ended up broken across a page turn in the middle of the most
// important sentence in the scene.
//
// This runs every line of every Observatory script through `wrapText` at the
// AUTHORED width of 240 (the narrowest view the game ever uses, and therefore
// the one that breaks worst) and prints the pages a player will actually see.
// Nothing about the scene is judged by eye from the JSON.

const d = window.dev;
await d.loadWait(1200);

const r = d.game.renderer;
const BOX_MARGIN = 4, TEXT_X = 10, ARROW_GUTTER = 18, MAX_LINES = 3;
const AUTHORED_W = 240;
const maxW = AUTHORED_W - BOX_MARGIN * 2 - TEXT_X - ARROW_GUTTER;

const files = [
  'frostmere_observatory',
  'frostmere_observatory_gallery',
  'frostmere_observatory_dome',
];

const out = [];
const bad = [];

const pagesFor = (lines) => {
  const wrapped = [];
  for (const line of lines) for (const w of r.wrapText(line, maxW)) wrapped.push(w);
  const pages = [];
  for (let i = 0; i < wrapped.length; i += MAX_LINES) pages.push(wrapped.slice(i, i + MAX_LINES));
  return pages;
};

const walk = (actions, path) => {
  for (const a of actions ?? []) {
    if (a.kind === 'say' || a.kind === 'ask' || a.kind === 'choice') {
      const pages = pagesFor(a.lines);
      out.push(`${path} [${a.who || '-'}] ${pages.length} page(s)`);
      pages.forEach((p, i) => out.push(`   p${i + 1}: ` + p.join(' / ')));
      // A page that ends without finishing the authored line it started is the
      // failure this tool exists to find.
      for (let i = 0; i < pages.length - 1; i++) {
        const last = pages[i][pages[i].length - 1];
        if (!/[.!?"'’-]$/.test(last.trim())) {
          bad.push(`${path}: page ${i + 1} ends mid-sentence on "${last}"`);
        }
      }
      for (const line of a.lines) {
        if (line.length > 120) bad.push(`${path}: line over 120 chars`);
      }
    }
    if (a.kind === 'if') { walk(a.then, path); walk(a.else, path); }
    if (a.kind === 'ask') { walk(a.yes, path); walk(a.no, path); }
    if (a.kind === 'choice') for (const o of a.options ?? []) walk(o.then, path);
  }
};

for (const f of files) {
  const scripts = await (await fetch(`/data/events/${f}.json`)).json();
  for (const s of scripts) walk(s.actions, `${f}/${s.id}`);
}

// The map signs go through the same box.
for (const f of files) {
  const map = await (await fetch(`/data/maps/${f}.json`)).json();
  for (const o of map.objects ?? []) {
    if (!o.text) continue;
    const pages = pagesFor(o.text);
    out.push(`${f} sign ${o.x},${o.y}: ${pages.length} page(s)`);
    pages.forEach((p, i) => out.push(`   p${i + 1}: ` + p.join(' / ')));
    for (let i = 0; i < pages.length - 1; i++) {
      const last = pages[i][pages[i].length - 1];
      if (!/[.!?"'’-]$/.test(last.trim())) {
        bad.push(`${f} sign ${o.x},${o.y}: page ${i + 1} ends mid-sentence on "${last}"`);
      }
    }
  }
}

for (const l of out) console.log(l);
console.log('--- bad breaks ---');
for (const b of bad) console.log('!! ' + b);
return { lines: out.length, bad };
