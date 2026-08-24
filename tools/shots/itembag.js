// The delivered item art where it is actually seen: a bag pocket, a shop row,
// the description panel, and the frames of one icon side by side.
//
// tools/shots/items.js is the contact sheet of every icon. This is the other
// half of the question -- whether the drawn ones sit in a list next to the
// generated ones without looking like they came from a different game.
//
// Usage: node tools/serve.js
//        npx electron tools/capture.cjs tools/shots/itembag.js

const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];

// Boot to the overworld. Written as "press on until the scene changes" rather
// than as a fixed number of Enters: the title and the opening have both grown
// a beat since the older drivers were written, and a count goes stale silently.
await d.loadWait(1400);
for (let i = 0; i < 12 && top().name !== 'creator'; i++) d.key('Enter', 30);
out.push('scene: ' + top().name);
for (let i = 0; i < 30; i++) {
  const rows = top().rows();
  if ((rows[top().sel] || {}).action === 'begin') break;
  d.key('KeyS', 2);
}
d.key('Enter', 60);
await d.loadWait(1600);
for (let i = 0; i < 24 && top().name === 'dialogue'; i++) d.key('Enter', 8);
d.tick(4);
out.push('scene: ' + top().name);

const art = await import('/build/js/gfx/itemart.js');
const { registry } = await import('/build/js/data/registry.js');
const state = top().state;

const report = art.itemArtReport();
out.push(`drawn: ${report.keys.join(', ') || 'none'}`);
out.push(`frames: ${report.frames.map((f) => f.key + ' ' + f.state).join(', ') || 'none'}`);
for (const n of report.notes) out.push(`note ${n.level}: ${n.file} ${n.message}`);

// Stock the bag so the drawn icons sit next to generated ones in one list.
for (const [id, n] of [
  ['potion', 12], ['strong_potion', 3], ['great_potion', 1], ['full_restore', 1],
  ['tonic_berry', 5], ['clearleaf', 2], ['rouse', 1], ['ward_incense', 2],
  ['field_vessel', 20], ['fine_vessel', 6], ['deep_vessel', 2],
]) {
  if (registry.items.has(id)) state.giveItem(id, n);
  else out.push(`no such item: ${id}`);
}
state.money = 9999;

// ---------------------------------------------------------------- the bag
d.key('KeyI', 20);
out.push('scene: ' + top().name);
await d.shoot('itembag-01-items', 8);
d.key('KeyS', 6);
await d.shoot('itembag-02-items-potion-selected', 6);
d.key('KeyX', 8);
await d.shoot('itembag-03-vessels', 8);
d.key('Escape', 10);

// --------------------------------------------------------------- the shop
const shopMod = await import('/build/js/scenes/shop.js');
d.game.scenes.push(new shopMod.ShopScene(state, 'kellowmere_provisioner'));
d.tick(6);
d.key('Enter', 8);
await d.shoot('itembag-04-shop-buy', 8);
d.key('Escape', 8);
d.key('Escape', 8);
d.tick(6);

// ------------------------------------------------- the sprite and its frames
//
// The two sizes the game draws, at 1x, on the bag's own background -- and the
// icon beside its open frame, drawn at the same spot, which is the whole point
// of seating them together: the base must not move.
const keys = [...new Set([...registry.items.values()].map((i) => i.icon))];
const drawn = keys.filter((k) => art.hasItemArt(k));
const cv = document.createElement('canvas');
cv.width = 300;
cv.height = 150;
const c = cv.getContext('2d');
c.imageSmoothingEnabled = false;
c.fillStyle = '#4a4257';
c.fillRect(0, 0, cv.width, cv.height);
c.font = '9px monospace';

let x = 6;
for (const k of drawn) {
  const cat = [...registry.items.values()].find((i) => i.icon === k)?.category;
  c.drawImage(art.itemSprite(k, cat), x, 14);
  c.drawImage(art.itemIcon(k, cat), x + 36, 22);
  c.fillStyle = '#ffd98a';
  c.fillText(k, x, 10);
  // The frames of this key, each drawn at the same origin as the icon.
  let fy = 56;
  for (const s of art.itemFrameStates(k)) {
    const f = art.itemArt(k, s);
    c.fillStyle = '#c8cede';
    c.fillText(s, x + 36, fy + 20);
    c.drawImage(f, x, fy);
    fy += 40;
  }
  x += 74;
}
// The icon and its open frame overlaid at one spot, alternating: if the seating
// is right the base is identical in both and only the lid moves.
const withFrames = drawn.filter((k) => art.itemFrameStates(k).length);
let ox = 6;
for (const k of withFrames) {
  const cat = [...registry.items.values()].find((i) => i.icon === k)?.category;
  c.fillStyle = '#c8cede';
  c.fillText('shut / open, same origin', ox, 142 - 36);
  c.drawImage(art.itemSprite(k, cat), ox, 142 - 32);
  c.drawImage(art.itemArt(k, 'open'), ox + 36, 142 - 32);
  ox += 90;
}
await fetch('/__shot/itembag-05-sprites', { method: 'POST', body: cv.toDataURL('image/png') });

out.push('drawn keys: ' + drawn.join(', '));
return out.join('\n');
