// Measuring tape for the item screens. Every layout number in bag.ts and
// shop.ts is chosen against a real string measured in the real face; this
// prints the strings that decide them.

const d = window.dev;
const r = d.game.renderer;
const reg = (await import('/build/js/data/registry.js')).registry;
await d.loadWait(600);

const items = [...reg.items.values()];
const byName = items.slice().sort((a, b) => r.textWidth(b.name) - r.textWidth(a.name));
const out = {
  longestNames: byName.slice(0, 5).map((i) => `${i.name}=${r.textWidth(i.name)}`),
  counts: ['x1', 'x99'].map((s) => `${s}=${r.textWidth(s)}`),
  prices: ['M~200', 'M~1000', 'M~1200'].map((s) => `${s}=${r.textWidth(s)}`),
  // The longest single WORD in any item name: what decides how narrow the
  // name column beside a 16-unit icon may be before a name hard-breaks.
  nameWidestWord: (() => {
    let best = '';
    for (const i of items) for (const w of i.name.split(/\s+/)) {
      if (r.textWidth(w) > r.textWidth(best)) best = w;
    }
    return `${best}=${r.textWidth(best)}`;
  })(),
  descWidest: (() => {
    // The longest single WORD in any description: the thing that decides how
    // narrow a description column may be before it breaks mid-word.
    let best = '';
    for (const i of items) for (const w of i.description.split(/\s+/)) {
      if (r.textWidth(w) > r.textWidth(best)) best = w;
    }
    return `${best}=${r.textWidth(best)}`;
  })(),
};
return out;
