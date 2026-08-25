// JOB 1, geometry probe. No battles -- just the question underneath them.
//
// The player is an 11x9 feet box on a 16px grid, so its tile is where its
// centre is, not where all of it is. Being spotted freezes the body exactly
// where it stands (busy), and the trainer then walks to the tile beside the
// player's tile. If the box is still standing in that tile, the trainer becomes
// a solid the player is inside of.
//
// This asks, for every trainer, every tile they can spot from, and every
// sub-tile position a walking player can legally be stopped in: after the
// approach, can the player still move at all? It uses the real body, the real
// solid test and the real npc list, so a "no" here is a lock in the game.
const d = window.dev;
const top = () => d.game.scenes.top;
const ow = () => d.game.scenes.find('overworld');
const out = [];

await d.loadWait(1400);
// Reach the title, then choose NEW JOURNEY deliberately -- the cursor starts
// on CONTINUE whenever a save exists, so pressing Enter blindly loads that
// save and skips the creator entirely.
for (let i = 0; i < 90 && top().name !== 'title'; i++) d.key('Enter', 10);
if (top().name === 'title' && top().menu) { top().menu.index = 0; d.key('Enter', 24); }
for (let i = 0; i < 60 && top().name !== 'creator'; i++) d.key('Enter', 10);
for (let i = 0; i < 30; i++) {
  if (typeof top().rows !== 'function') { d.key('Enter', 20); continue; }
  const rows = top().rows();
  if ((rows[top().sel] || {}).action === 'begin') break;
  d.key('KeyS', 2);
}
d.key('Enter', 60);
await d.loadWait(1800);
for (let i = 0; i < 16 && top().name === 'dialogue'; i++) d.key('Enter', 10);

const OW = ow().constructor;
const state = ow().state;

async function goTo(map) {
  d.game.scenes.replaceAll(new OW(state, map, 5, 5, 'down'));
  await d.loadWait(1200);
  for (let i = 0; i < 30 && top().name === 'dialogue'; i++) d.key('Enter', 10);
  for (let i = 0; i < 400 && ow().events && ow().events.running; i++) {
    d.tick(1);
    if (top().name === 'dialogue') d.key('Enter', 4);
  }
  d.tick(10);
}

const V = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const TILE = 16;

// Can the body move at all from where it is? Uses the real update + solid test.
function mobile(o) {
  const p = o.player;
  const sx = p.x, sy = p.y;
  for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    p.x = sx; p.y = sy;
    for (let i = 0; i < 6; i++) p.update(ax, ay, o.solidTest);
    if (Math.abs(p.x - sx) > 0.5 || Math.abs(p.y - sy) > 0.5) { p.x = sx; p.y = sy; return true; }
  }
  p.x = sx; p.y = sy;
  return false;
}

const maps = ['route_1', 'route_2', 'route_3', 'route_4',
  'kellowmere_bastion', 'brackwater_bastion'];

let totalTraps = 0;
for (const map of maps) {
  await goTo(map);
  const o = ow();
  for (const npc of o.npcs.slice()) {
    if (!npc.data.trainer) continue;
    const f = npc.actor.facing;
    const v = V[f];
    const range = npc.data.sightRange || 4;
    const homeX = npc.actor.tileX, homeY = npc.actor.tileY;
    const traps = [];

    for (let dist = 1; dist <= range; dist++) {
      const sxT = homeX + v[0] * dist, syT = homeY + v[1] * dist;
      if (!o.map.inBounds(sxT, syT)) break;
      if (o.map.collisionAt(sxT, syT) === 1) break;
      // Where the trainer ends up: one tile short of the player.
      const lx = homeX + v[0] * (dist - 1), ly = homeY + v[1] * (dist - 1);

      for (let dy = -8; dy <= 7; dy++) {
        for (let dx = -6; dx <= 6; dx++) {
          npc.actor.tileX = homeX; npc.actor.tileY = homeY;
          o.player.setTile(sxT, syT);
          o.player.x += dx;
          o.player.y += dy;
          // Only positions the player could actually be standing in, and that
          // still count as this tile.
          if (o.player.tileX !== sxT || o.player.tileY !== syT) continue;
          if (!mobile(o)) continue;               // illegal spot to begin with
          const px = o.player.x, py = o.player.y;

          npc.actor.tileX = lx; npc.actor.tileY = ly;
          o.player.x = px; o.player.y = py;
          if (!mobile(o)) traps.push(dist + ':' + dx + ',' + dy);
        }
      }
    }
    npc.actor.tileX = homeX; npc.actor.tileY = homeY;
    if (traps.length) {
      totalTraps += traps.length;
      out.push(map + '/' + npc.data.id + ' faces ' + f + ' TRAPS=' + traps.length
        + ' e.g. ' + traps.slice(0, 6).join(' '));
    } else {
      out.push(map + '/' + npc.data.id + ' faces ' + f + ' clear');
    }
  }
}
out.push('TOTAL TRAPPED POSITIONS = ' + totalTraps);
return out;
