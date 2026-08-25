// CONTINUE, from where the menu lives now.
//
// A save is written straight through the save system, the session is reset to a
// cold boot, and the screen is driven the way a returning player would: the
// overture plays, the menu arrives with CONTINUE already under the cursor and a
// play time beside it, and pressing it has to land in the world.

const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];

await d.loadWait(400);
const mod = await import('/build/js/scenes/title.js');
const saves = await import('/build/js/systems/save.js');
const state = await import('/build/js/systems/state.js');

localStorage.clear();
const st = new state.GameState();
st.playTime = 60 * 62 + 30;
out.push('wrote: ' + JSON.stringify(saves.save(1, st, 'Tidefall Rise', st.playTime)));
out.push('loads back: ' + !!saves.load(1));

mod.resetTitleSession();
d.game.scenes.replaceAll(new mod.TitleScene());
d.tick(2);
out.push('boot -> ' + top().name + ' (' + (top().reel ? top().reel.length : '?') + ' shots)');

let guard = 0;
while (top().name !== 'title' && guard++ < 4000) d.tick(10);
d.tick(200);
out.push('menu row ' + top().menu.index + ' = ' + top().menu.selectedValue
  + ' detail=' + JSON.stringify(top().menu.items[1].detail));
await d.shoot('cont-menu', 0);
await d.shoot('cont-menu-zoom', 0, 3);

d.key('Enter', 2);
for (let i = 0; i < 5; i++) { await d.shoot('cont-go-' + i, 0); d.tick(13); }
d.tick(40);
out.push('landed in: ' + top().name);
await d.shoot('cont-landed', 0);

return { out };
