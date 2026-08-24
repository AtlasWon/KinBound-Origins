/**
 * Letter spacing.
 *
 * Three separate player reports said text was "too close to other letters".
 * The first two were read as layout and fixed as layout; they were not. The
 * fault was inside the font: a handful of narrow glyphs are drawn centred in
 * the 5-wide cell but were given advances chosen as if their ink were flush
 * left, so the glyph overhung its own advance and the next letter was drawn on
 * top of it. Lowercase `i` overlapped by a full pixel, which is why Cinderpaw
 * and Sprigling and Rimehound all had two letters fused into one shape.
 *
 * These tests state the rule that was being broken -- one blank column after
 * every glyph, one blank column between every pair -- and check it against the
 * strings the player actually reads, so a fourth report cannot come from here.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  glyphKeys, validateFont, rightBearing, pairGap, measureText, tokenize, advanceOf,
} from '../build/js/gfx/font.js';

const read = (p) => JSON.parse(readFileSync(fileURLToPath(new URL(p, import.meta.url)), 'utf8'));
const SPECIES = read('../data/creatures/species.json').map((s) => s.name);
const MOVES = read('../data/moves/moves.json').map((m) => m.name);

test('every glyph parses', () => {
  assert.deepEqual(validateFont(), []);
});

test('no glyph overhangs its own advance', () => {
  const tight = glyphKeys().filter((ch) => rightBearing(ch) < 1);
  assert.deepEqual(
    tight, [],
    `these glyphs are drawn past the point where the next letter starts, so the `
    + `two share pixels: ${tight.map((c) => `"${c}" (bearing ${rightBearing(c)})`).join(', ')}`,
  );
});

test('no two letters touch in any creature or move name', () => {
  const bad = [];
  for (const name of [...SPECIES, ...MOVES]) {
    const t = tokenize(name);
    for (let i = 0; i + 1 < t.length; i++) {
      if (t[i] === ' ' || t[i + 1] === ' ') continue;
      const gap = pairGap(t[i], t[i + 1]);
      if (gap < 1) bad.push(`${name}: "${t[i]}${t[i + 1]}" gap ${gap}`);
    }
  }
  assert.deepEqual(bad, [], `letters collide inside names the player reads: ${bad.join('; ')}`);
});

test('no two characters touch across the printable set', () => {
  const printable = glyphKeys().filter((k) => k !== ' ');
  const bad = [];
  for (const a of printable) {
    for (const b of printable) {
      if (pairGap(a, b) < 1) bad.push(`"${a}${b}"`);
    }
  }
  assert.deepEqual(bad, [], `colliding pairs: ${bad.slice(0, 40).join(' ')}`);
});

test('a measured string is the sum of its advances less the trailing column', () => {
  const s = 'Sprigling Lv.12';
  const sum = tokenize(s).reduce((w, ch) => w + advanceOf(ch), 0);
  assert.equal(measureText(s), sum - 1);
  assert.equal(measureText(''), 0);
});

test('the narrow glyphs stay narrower than a full cell', () => {
  // The face reads as proportional because i, l and the punctuation are not
  // given a full 6 units. If a future spacing fix widens them to the default,
  // dialogue gets longer and starts wrapping differently -- so hold the line.
  for (const ch of ['i', 'l', '.', ',', ':', ';', '!', "'", '(', ')']) {
    assert.ok(advanceOf(ch) < 6, `"${ch}" advances ${advanceOf(ch)}, no longer narrow`);
  }
});
