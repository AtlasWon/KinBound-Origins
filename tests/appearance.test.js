/**
 * Character creation.
 *
 * The appearance is twelve numbers that decide what the player looks like for
 * the rest of the game, and it is written into every save. These cover the two
 * ways that goes wrong: a save that loses the character, and a save from an
 * older build whose indices no longer point anywhere.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { loadRegistry } from './helpers/loadRegistry.js';
import { GameState } from '../build/js/systems/state.js';
import {
  DEFAULT_APPEARANCE, appearancePalette, normaliseAppearance,
  HAIR_STYLES, HAT_STYLES, JACKET_STYLES, CLOTH_COLOURS,
} from '../build/js/gfx/charsprite.js';
import { resolveTokens, setToken } from '../build/js/core/tokens.js';

loadRegistry();

test('a made character survives a save and load round trip', () => {
  const s = new GameState();
  s.playerName = 'MARA';
  s.appearance = {
    ...DEFAULT_APPEARANCE,
    build: 1, skin: 4, hairStyle: 5, hairColour: 9, eyes: 7,
    hat: 2, hatColour: 3, jacket: 1, jacketColour: 11, shirt: 6, trousers: 5, shoes: 2,
  };

  const back = GameState.fromJSON(JSON.parse(JSON.stringify(s.toJSON())));
  assert.equal(back.playerName, 'MARA');
  assert.deepEqual(back.appearance, s.appearance);
});

test('a save written before character creation existed still loads', () => {
  const s = new GameState();
  const raw = s.toJSON();
  delete raw.appearance;
  const back = GameState.fromJSON(JSON.parse(JSON.stringify(raw)));
  assert.deepEqual(back.appearance, DEFAULT_APPEARANCE);
});

test('an index past the end of a table wraps instead of crashing', () => {
  // A palette that was retuned, or a save hand-edited by somebody curious.
  const pal = appearancePalette({ ...DEFAULT_APPEARANCE, shirt: 999, skin: -3, hairStyle: 40 });
  assert.match(pal.top, /^#[0-9a-f]{6}$/i);
  assert.match(pal.skin, /^#[0-9a-f]{6}$/i);
  assert.ok(HAIR_STYLES.some((h) => h.style === pal.hairStyle));
});

test('choosing no hat and no jacket leaves them off the palette entirely', () => {
  const bare = appearancePalette({ ...DEFAULT_APPEARANCE, hat: 0, jacket: 0 });
  assert.equal(HAT_STYLES[0].style, null);
  assert.equal(JACKET_STYLES[0].style, null);
  assert.equal(bare.hat, undefined);
  assert.equal(bare.jacket, undefined);

  const dressed = appearancePalette({ ...DEFAULT_APPEARANCE, hat: 1, hatColour: 0, jacket: 1, jacketColour: 4 });
  assert.equal(dressed.hat, CLOTH_COLOURS[0].c);
  assert.equal(dressed.jacket, CLOTH_COLOURS[4].c);
});

test('normalising fills the gaps without discarding what was set', () => {
  const partial = normaliseAppearance({ hairStyle: 3 });
  assert.equal(partial.hairStyle, 3);
  assert.equal(partial.skin, DEFAULT_APPEARANCE.skin);
});

test('dialogue calls the player by the name they chose', () => {
  const s = new GameState();
  s.playerName = 'ROWAN';
  assert.equal(resolveTokens('There you are, {name}.'), 'There you are, ROWAN.');

  // An unknown token is left visible rather than swallowed: a typo somebody can
  // see is a typo somebody can fix.
  assert.equal(resolveTokens('Hello {nmae}.'), 'Hello {nmae}.');
  setToken('name', 'AVEN');
  assert.equal(resolveTokens('{name} and {name}'), 'AVEN and AVEN');
});
