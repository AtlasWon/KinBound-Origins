// Scouting shots for the multiplayer investigation: the title menu (where a
// MULTIPLAYER entry would have to fit), the in-game pause menu, and the
// overworld camera at 1x so the "two players on one 240x160 screen" question
// can be judged from a picture rather than from arithmetic.

const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];

await d.loadWait(1400);
out.push('scene: ' + top().name);
await d.shoot('mp-01-title-attract', 6);

d.key('Enter', 8);
out.push('phase: ' + top().phase);
await d.shoot('mp-02-title-menu', 6);
await d.shoot('mp-02-title-menu-x4', 0, 4);

// Straight into a loaded world without playing the opening: build a state by
// hand and drop the overworld on top, the way the other drivers do.
const stateMod = await import('/build/js/systems/state.js');
const kinMod = await import('/build/js/systems/kin.js');
const owMod = await import('/build/js/scenes/overworld.js');

const state = new stateMod.GameState();
state.playerName = 'AVEN';
state.party.push(kinMod.createKin('cinderpaw', 12, d.game.rng, { originalTrainer: 'player' }));
state.giveItem('vellum', 1);
d.game.scenes.replaceAll(new owMod.OverworldScene(state, 'hearthmere', 10, 12, 'down'));
d.tick(2);
await d.loadWait(1600);
d.tick(40);
out.push('map: ' + (top().map && top().map.id));
await d.shoot('mp-03-overworld', 30);
await d.shoot('mp-03-overworld-x4', 0, 4);

// The pause menu, which is what the player calls "the main menu" in game.
d.key('Tab', 10);
out.push('menu scene: ' + top().name);
await d.shoot('mp-04-pause-menu', 6);

return { out };
