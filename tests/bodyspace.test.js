/**
 * Regression: nobody may stand in the half of the player that is not counted.
 *
 * THE BUG. The player is a body, not a grid square -- an 11x9 feet box on a
 * 16px grid -- so `tileX`/`tileY` name only the tile its centre is in. For most
 * of every step the box is inside two tiles at once, with up to eight pixels of
 * it in the tile behind. Everything that decided whether somebody else could
 * stand somewhere asked those two numbers, so the overlap read as empty ground.
 *
 * What that cost: being spotted freezes the body on the spot, mid-step, and the
 * trainer then walked to the tile in front of the player's tile -- very often a
 * tile the player was still physically standing in. The trainer became a solid
 * inside the player, collision is tested against the whole box, and a box
 * cannot leave a tile it is already in without being inside it on the way. So
 * after the battle every direction was blocked at once. No fade, no flag, no
 * dialogue: `busy`, `wipe`, `events.running` and the fade were all clear and
 * the character simply would not move. That is why every driver that inferred
 * "can walk" from those flags reported everything was fine.
 *
 * Measured before the fix: 138 sub-tile standing positions across eight placed
 * trainers were hard locks, and a walked reproduction locked six trainers out
 * of six. Both are zero now.
 *
 * The three rules pinned down here:
 *   1. the box's tiles are all of them, not just the centre's;
 *   2. a trainer closing on the player stops at the last tile the player is not
 *      standing in;
 *   3. and if anything ever does end up inside the player anyway, the player
 *      can always walk out of it -- but never further in.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { OverworldScene } from '../build/js/scenes/overworld.js';
import { BODY_W, BODY_H } from '../build/js/world/body.js';
import { TILE_SIZE } from '../build/js/gfx/tileset.js';

/**
 * A stand-in for the player's body.
 *
 * PlayerBody itself needs a character sheet and therefore a document, so the
 * geometry is reproduced here from the same three constants the real one uses
 * -- setTile's centring, and the two getters that decide which tile you are
 * "on". Nothing else about the body matters to the code under test.
 */
function bodyAt(tileX, tileY, dx = 0, dy = 0) {
  return {
    x: tileX * TILE_SIZE + (TILE_SIZE - BODY_W) / 2 + dx,
    y: tileY * TILE_SIZE + (TILE_SIZE - BODY_H) - 1 + dy,
    get centerX() { return this.x + BODY_W / 2; },
    get footY() { return this.y + BODY_H - 1; },
    get tileX() { return Math.floor(this.centerX / TILE_SIZE); },
    get tileY() { return Math.floor(this.footY / TILE_SIZE); },
  };
}

/** An overworld with nothing in it but open ground and the actors given. */
function field(body, npcTiles = []) {
  const scene = new OverworldScene({}, 'test_map', 0, 0, 'down');
  scene.player = body;
  scene.npcs = npcTiles.map(([x, y], i) => ({
    data: { id: 'npc' + i, movement: { kind: 'static' } },
    actor: { tileX: x, tileY: y, moving: false, targetX: x, targetY: y },
    progress: 0, cooldown: 0, homeX: x, homeY: y,
  }));
  scene.map = {
    inBounds: () => true,
    collisionAt: () => 0,
    warpAt: () => undefined,
  };
  return scene;
}

/* ------------------------------------------------- 1. the box is two tiles */

test('a body that has just crossed a boundary is standing in both tiles', () => {
  // Two pixels past the left edge of tile 19 -- where a key comes up after a
  // step to the right. The centre says tile 19; the box is also in tile 18.
  const scene = field(bodyAt(19, 25, -6));
  assert.equal(scene.player.tileX, 19, 'the centre is in tile 19');
  assert.ok(scene.playerCovers(19, 25), 'the box is in tile 19');
  assert.ok(scene.playerCovers(18, 25),
    'and still in tile 18 -- this is the ground that used to read as empty');
});

test('a body parked in the middle of a tile is standing in that tile only', () => {
  const scene = field(bodyAt(19, 25));
  assert.ok(scene.playerCovers(19, 25));
  for (const [x, y] of [[18, 25], [20, 25], [19, 24], [19, 26]]) {
    assert.equal(scene.playerCovers(x, y), false, `${x},${y} must be free`);
  }
});

/* ---------------------------------------------- 2. the trainer stops short */

test('a trainer closing in stops before the tile the player is standing in', () => {
  // Ottel's shape: he is two tiles to the player's left and faces right, so he
  // used to take one step and land in tile 18 -- which the player is in.
  const scene = field(bodyAt(19, 25, -6));
  assert.equal(scene.approachSteps(17, 25, 'right', 2), 0,
    'closing that one tile puts him inside the player');
});

test('a trainer still closes the whole way when the player is clear of the tile', () => {
  const scene = field(bodyAt(19, 25));
  assert.equal(scene.approachSteps(17, 25, 'right', 2), 1);
  assert.equal(scene.approachSteps(15, 25, 'right', 4), 3,
    'a longer sight line still ends face to face');
});

test('a trainer already face to face takes no steps', () => {
  const scene = field(bodyAt(19, 25));
  assert.equal(scene.approachSteps(18, 25, 'right', 1), 0);
});

/* ------------------------------------------------- 3. always a way out */

test('an npc standing inside the player does not block the way out', () => {
  const body = bodyAt(19, 25, -6);
  const scene = field(body, [[18, 25]]);
  assert.ok(scene.playerCovers(18, 25), 'precondition: the npc is inside the box');

  assert.equal(scene.solidTest(18, 25, 'right'), false,
    'stepping right is stepping out of them, and must be allowed');
  assert.equal(scene.solidTest(18, 25, 'left'), true,
    'stepping left is stepping further into them, and must not be');
});

test('an npc the player is not standing in is solid from every direction', () => {
  const scene = field(bodyAt(19, 25), [[18, 25]]);
  for (const from of ['left', 'right', 'up', 'down']) {
    assert.equal(scene.solidTest(18, 25, from), true,
      `an npc a tile away must still be solid when approached from ${from}`);
  }
});

test('the same rule holds on the vertical axis', () => {
  // Eight pixels up: the box's top row is in the tile above.
  const body = bodyAt(19, 25, 0, -8);
  const scene = field(body, [[19, 24]]);
  assert.equal(body.tileY, 25);
  assert.ok(scene.playerCovers(19, 24));
  assert.equal(scene.solidTest(19, 24, 'down'), false, 'downward is out');
  assert.equal(scene.solidTest(19, 24, 'up'), true, 'upward is further in');
});

/* --------------------------------------- 4. wanderers respect the body too */

test('a wandering npc will not step into the tile the player is half in', () => {
  const scene = field(bodyAt(19, 25, -6));
  assert.equal(scene.npcCanEnter(18, 25), false,
    'townsfolk used to walk into the eight pixels nobody was measuring');
  assert.equal(scene.npcCanEnter(19, 25), false);
  assert.equal(scene.npcCanEnter(17, 25), true, 'ground the player is not in is still free');
});
