// Every screen that names an item to the player, at 1x, loaded so that the two
// hand-drawn icons and the twenty-one generated ones stand side by side in the
// same list. That adjacency is the whole point: a drawn potion that looks right
// on its own and wrong next to a generated flask is still a defect.
//
// Shots: the three bag pockets, the shop's buy and sell lists, the quantity
// spinner, and the description panel in each.
//
// Usage: npx electron tools/capture.cjs tools/shots/item-ui.js

const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];

const clear = () => {
  for (let i = 0; i < 24 && top().name === 'dialogue'; i++) d.key('Enter', 8);
  d.tick(4);
};

// A crop of the back buffer, blown up. Judging happens at 1x -- these exist
// only to answer "is that one clear unit of gap or none", which is a question
// about single pixels and cannot be answered by staring harder at a 1x shot.
// Arguments are in LOGICAL units; the buffer is DETAIL times that.
const zoom = async (name, x, y, w, h, z = 5) => {
  const src = d.game.renderer.buffer;
  const D = src.width / 240;
  const cv = document.createElement('canvas');
  cv.width = w * D * z;
  cv.height = h * D * z;
  const c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  c.drawImage(src, x * D, y * D, w * D, h * D, 0, 0, cv.width, cv.height);
  await fetch('/__shot/' + encodeURIComponent(name), {
    method: 'POST', body: cv.toDataURL('image/png'),
  });
};

await d.loadWait(1400);
// Reach the title, then choose NEW JOURNEY deliberately -- the cursor starts
// on CONTINUE whenever a save exists, so pressing Enter blindly loads that
// save and skips the creator entirely.
for (let i = 0; i < 90 && top().name !== 'title'; i++) d.key('Enter', 10);
if (top().name === 'title' && top().menu) { top().menu.index = 0; d.key('Enter', 24); }
for (let i = 0; i < 60 && top().name !== 'creator'; i++) d.key('Enter', 10);
for (let i = 0; i < 30 && typeof top().rows === 'function'; i++) {
  const rows = top().rows();
  if ((rows[top().sel] || {}).action === 'begin') break;
  d.key('KeyS', 2);
}
d.key('Enter', 60);
await d.loadWait(1600);
clear();

const kinMod = await import('/build/js/systems/kin.js');
const reg = (await import('/build/js/data/registry.js')).registry;
const art = await import('/build/js/gfx/itemart.js');
const state = top().state;

state.party.length = 0;
state.party.push(kinMod.createKin('cinderpaw', 12, d.game.rng, { originalTrainer: 'player' }));
state.money = 999999;
// Every item, so no pocket is empty and every generated design is on screen
// next to the two that are drawn.
for (const it of reg.items.values()) state.giveItem(it.id, 99);
// Crest count opens the whole shelf, which is the longest buy list the game can
// produce and therefore the one whose rows are tightest.
state.crests = state.crests || [];
out.push('drawn: ' + art.itemArtKeys().join(', '));
out.push('frames: ' + JSON.stringify(art.itemArtReport().frames));

// --------------------------------------------------------------------- bag
const bagMod = await import('/build/js/scenes/bag.js');
d.game.scenes.push(new bagMod.BagScene(state));
d.tick(6);
out.push('scene: ' + top().name);
await d.shoot('item-01-bag-items', 8);
await zoom('item-01z-bag-rows', 6, 24, 80, 50);
await zoom('item-01z-bag-panel', 139, 22, 95, 60, 4);
// Down the list, so a drawn icon (the potion) and generated ones are both
// under the cursor at some point and the panel is checked with each.
for (let i = 0; i < 3; i++) d.key('KeyS', 4);
await d.shoot('item-02-bag-items-potion', 8);
for (let i = 0; i < 7; i++) d.key('KeyS', 4);
await d.shoot('item-03-bag-items-scrolled', 8);
d.key('KeyX', 8);
await d.shoot('item-04-bag-vessels', 8);
// Field Vessel first: "clay-and-copper" is the widest word in any description
// in the game and the panel is sized to hold it unbroken. If it ever splits,
// this is the shot that shows it.
for (let i = 0; i < 5; i++) d.key("KeyW", 4);
await d.shoot('item-04a-bag-vessels-widest', 8);
await zoom('item-04az-bag-panel', 139, 22, 95, 90, 4);
d.key('KeyX', 8);
await d.shoot('item-05-bag-key', 8);
d.key('Escape', 10);

// -------------------------------------------------------------------- shop
const shopMod = await import('/build/js/scenes/shop.js');
d.game.scenes.push(new shopMod.ShopScene(state, 'tanners_provisioner'));
d.tick(6);
out.push('scene: ' + top().name);
await d.shoot('item-06-shop-root', 8);
d.key('Enter', 10);
out.push('mode: ' + top().mode + ' rows: ' + top().list.items.length);
await d.shoot('item-07-shop-buy', 8);
await zoom('item-07z-shop-rows', 6, 28, 90, 50);
await zoom('item-07z-shop-bar', 6, 110, 130, 46, 4);
for (let i = 0; i < 3; i++) d.key('KeyS', 4);
await d.shoot('item-08-shop-buy-potion', 8);
// "Strong Potion" is 74 units against a 70-unit panel: the one name in the
// shop that has to wrap rather than break, and the reason the name sits under
// the picture here instead of beside it.
d.key('KeyS', 4);
await d.shoot('item-09a-shop-buy-longname', 8);
for (let i = 0; i < 4; i++) d.key('KeyS', 4);
await d.shoot('item-09-shop-buy-scrolled', 8);
d.key('Enter', 10);
for (let i = 0; i < 4; i++) d.key('KeyW', 4);
await d.shoot('item-10-shop-quantity', 8);
d.key('Escape', 8);
d.key('Escape', 8);
d.key('KeyS', 6);
d.key('Enter', 10);
out.push('mode: ' + top().mode + ' rows: ' + top().list.items.length);
await d.shoot('item-11-shop-sell', 8);
for (let i = 0; i < 4; i++) d.key('KeyS', 4);
await d.shoot('item-12-shop-sell-scrolled', 8);

return { out };
