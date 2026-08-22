import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { noteToHz } from '../build/js/audio/synth.js';
import { parsePattern } from '../build/js/audio/audio.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TRACKS = JSON.parse(readFileSync(resolve(ROOT, 'data/audio/tracks.json'), 'utf8'));

test('note names convert to the right frequencies', () => {
  assert.equal(Math.round(noteToHz('A4')), 440);
  assert.equal(Math.round(noteToHz('A3')), 220);
  assert.equal(Math.round(noteToHz('A5')), 880);
  assert.equal(Math.round(noteToHz('C4')), 262);
  assert.equal(Math.round(noteToHz('E4')), 330);
  assert.equal(Math.round(noteToHz('G4')), 392);
  // Rests and nonsense are silent rather than throwing.
  assert.equal(noteToHz('-'), 0);
  assert.equal(noteToHz(''), 0);
  assert.equal(noteToHz('H9'), 0);
});

test('enharmonic spellings agree', () => {
  assert.equal(noteToHz('C#4'), noteToHz('Db4'));
  assert.equal(noteToHz('A#3'), noteToHz('Bb3'));
});

test('patterns parse into notes with durations', () => {
  const notes = parsePattern('C4:4 -:2 E4:8', 0);
  assert.equal(notes.length, 3);
  assert.equal(Math.round(notes[0].hz), 262);
  assert.equal(notes[0].steps, 4);
  assert.equal(notes[1].hz, 0);
  assert.equal(notes[1].steps, 2);
  assert.equal(notes[2].steps, 8);
});

test('transposition shifts the whole channel but leaves rests alone', () => {
  const plain = parsePattern('A4:4 -:4', 0);
  const up = parsePattern('A4:4 -:4', 12);
  assert.ok(Math.abs(up[0].hz - plain[0].hz * 2) < 0.01);
  assert.equal(up[1].hz, 0);
});

test('every track is playable and its channels are the same length', () => {
  assert.ok(TRACKS.length >= 6, `only ${TRACKS.length} tracks`);
  const ids = new Set();
  for (const track of TRACKS) {
    assert.ok(!ids.has(track.id), `duplicate track id ${track.id}`);
    ids.add(track.id);
    assert.ok(track.tempo >= 40 && track.tempo <= 240, `${track.id} tempo ${track.tempo}`);
    assert.ok(track.channels.length >= 1, `${track.id} has no channels`);

    const lengths = track.channels.map((ch) => {
      const notes = parsePattern(ch.pattern, ch.transpose ?? 0);
      assert.ok(notes.length > 0, `${track.id} channel has an empty pattern`);
      for (const n of notes) {
        assert.ok(Number.isFinite(n.hz) && n.hz >= 0, `${track.id} produced a bad frequency`);
        assert.ok(n.steps >= 1 && n.steps <= 64, `${track.id} note length ${n.steps}`);
      }
      return notes.reduce((a, n) => a + n.steps, 0);
    });

    // Channels that do not share a bar length drift audibly on every loop.
    const longest = Math.max(...lengths);
    for (const len of lengths) {
      assert.equal(longest % len, 0,
        `${track.id}: channel lengths ${lengths.join(', ')} do not divide evenly`);
    }
    assert.equal(longest % 16, 0, `${track.id} is ${longest} steps, not a whole number of bars`);
  }
});

test('the tracks the maps ask for all exist', () => {
  const ids = new Set(TRACKS.map((t) => t.id));
  const needed = ['town_hollow', 'town_indoor', 'station', 'route_west',
    'battle_wild', 'battle_trainer', 'victory', 'title_theme'];
  for (const id of needed) assert.ok(ids.has(id), `missing track "${id}"`);
});
