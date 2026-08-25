// Measures every authored line I own against the dialogue box's real wrap
// width at the narrowest view, and reports boxes that spill onto a second page
// -- which is what leaves a single orphan word alone on a screen.
const d = window.dev;
await d.loadWait(800);
const r = d.game.renderer;
const MAX_W = 240 - 4 * 2 - 10 - 18;   // SCREEN_W - margins - TEXT_X - arrow gutter
const MAX_LINES = 3;

const FILES = [
  'data/events/route_2.json',
  'data/events/route_2_ruin.json',
  'data/dialogue/route_2.json',
  'data/maps/route_1.json',
  'data/maps/route_2.json',
  'data/maps/route_1_hollow.json',
  'data/maps/route_2_ruin.json',
  'data/maps/route_2_cave.json',
];

const report = [];
for (const f of FILES) {
  const json = await (await fetch('/' + f)).json();
  const boxes = [];
  const walk = (o, where) => {
    if (Array.isArray(o)) { o.forEach((v, i) => walk(v, where)); return; }
    if (!o || typeof o !== 'object') return;
    for (const [k, v] of Object.entries(o)) {
      if ((k === 'lines' || k === 'text') && Array.isArray(v) && typeof v[0] === 'string') {
        boxes.push({ where: o.id || o.kind || where, lines: v });
      } else walk(v, o.id || where);
    }
  };
  walk(json, f);
  for (const b of boxes) {
    let n = 0;
    const bad = [];
    for (const line of b.lines) {
      const w = r.wrapText(line.replace('{name}', 'ROWAN'), MAX_W);
      n += w.length;
      if (w.length > 1) bad.push(line);
    }
    if (n > MAX_LINES) {
      report.push(f.split('/').pop() + ' ' + b.where + ': ' + n + ' rendered lines ('
        + Math.ceil(n / MAX_LINES) + ' pages, last page has ' + (n % MAX_LINES || 3) + ')'
        + (bad.length ? ' | spilling: ' + JSON.stringify(bad[0]).slice(0, 60) : ''));
    }
  }
}
return { over: report.length, report };
