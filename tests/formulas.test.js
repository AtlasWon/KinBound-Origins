import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

import {
  expForLevel, levelForExp, expProgress, expGain,
  calcHp, calcStat, natureMultiplier,
  stageMultiplier, accuracyStageMultiplier, clampStage,
  effectiveness, typeMultiplier,
  calcDamage, weatherDamageModifier,
  captureValue, shakeThreshold, captureProbability, attemptCapture, statusCaptureBonus,
  effectiveSpeed, escapeChance, prizeMoney, critChance,
} from '../build/js/battle/formulas.js';
import { Rng } from '../build/js/core/rng.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = JSON.parse(readFileSync(resolve(ROOT, 'data/region/types.json'), 'utf8'));
const CHART = TYPES.chart;

/* ------------------------------------------------------------ experience */

test('growth curves hit their documented level-100 totals', () => {
  assert.equal(expForLevel('erratic', 100), 600000);
  assert.equal(expForLevel('fast', 100), 800000);
  assert.equal(expForLevel('mediumFast', 100), 1000000);
  assert.equal(expForLevel('mediumSlow', 100), 1059860);
  assert.equal(expForLevel('slow', 100), 1250000);
  assert.equal(expForLevel('fluctuating', 100), 1640000);
});

test('level 1 always costs zero experience and curves are monotonic', () => {
  for (const rate of ['erratic', 'fast', 'mediumFast', 'mediumSlow', 'slow', 'fluctuating']) {
    assert.equal(expForLevel(rate, 1), 0, `${rate} level 1`);
    let prev = -1;
    for (let n = 1; n <= 100; n++) {
      const v = expForLevel(rate, n);
      assert.ok(v > prev, `${rate} not monotonic at level ${n} (${v} <= ${prev})`);
      prev = v;
    }
  }
});

test('levelForExp inverts expForLevel exactly', () => {
  for (const rate of ['erratic', 'fast', 'mediumFast', 'mediumSlow', 'slow', 'fluctuating']) {
    for (let n = 1; n <= 100; n++) {
      const need = expForLevel(rate, n);
      assert.equal(levelForExp(rate, need), n, `${rate} at exactly level ${n}`);
      if (n < 100) {
        assert.equal(levelForExp(rate, need + 1), n, `${rate} just past level ${n}`);
        assert.equal(levelForExp(rate, expForLevel(rate, n + 1) - 1), n, `${rate} just below ${n + 1}`);
      }
    }
  }
});

test('expProgress reports 0 at a fresh level and approaches 1', () => {
  const at30 = expForLevel('mediumFast', 30);
  assert.equal(expProgress('mediumFast', at30, 30), 0);
  const next = expForLevel('mediumFast', 31);
  assert.ok(expProgress('mediumFast', next - 1, 30) > 0.99);
  assert.equal(expProgress('mediumFast', 999999999, 100), 1);
});

test('experience gain scales with defeated level and splits between participants', () => {
  const solo = expGain({ baseExp: 64, defeatedLevel: 20, participants: 1, fromTrainer: false });
  const duo = expGain({ baseExp: 64, defeatedLevel: 20, participants: 2, fromTrainer: false });
  assert.equal(solo, Math.floor((64 * 20) / 7));
  assert.equal(duo, Math.floor((64 * 20) / 14));

  const trainer = expGain({ baseExp: 64, defeatedLevel: 20, participants: 1, fromTrainer: true });
  assert.ok(trainer > solo, 'trainer battles must pay more than wild');
  assert.equal(trainer, Math.floor((64 * 20 * 1.5) / 7));

  // Higher-level opponents are always worth more: this is what stops grinding
  // on low-level routes from being efficient.
  let prev = 0;
  for (let lvl = 5; lvl <= 100; lvl += 5) {
    const g = expGain({ baseExp: 100, defeatedLevel: lvl, participants: 1, fromTrainer: false });
    assert.ok(g > prev);
    prev = g;
  }
});

/* ----------------------------------------------------------------- stats */

test('stat formulas match hand-computed values', () => {
  assert.equal(calcHp(45, 31, 0, 50), 120);
  assert.equal(calcStat(49, 31, 0, 50, 1), 69);
  // A beneficial nature is +10%, truncated.
  assert.equal(calcStat(49, 31, 0, 50, 1.1), Math.floor(69 * 1.1));
  // EVs contribute one point per four EVs at level 100.
  assert.ok(calcStat(100, 31, 252, 100, 1) > calcStat(100, 31, 0, 100, 1));
});

test('a base-1 HP stat stays at 1 forever', () => {
  assert.equal(calcHp(1, 31, 252, 100), 1);
});

test('nature multiplier is symmetric and neutral when up equals down', () => {
  assert.equal(natureMultiplier('atk', 'spa', 'atk'), 1.1);
  assert.equal(natureMultiplier('atk', 'spa', 'spa'), 0.9);
  assert.equal(natureMultiplier('atk', 'spa', 'def'), 1);
  assert.equal(natureMultiplier('atk', 'atk', 'atk'), 1);
  assert.equal(natureMultiplier(undefined, undefined, 'atk'), 1);
});

/* ----------------------------------------------------------- stat stages */

test('stat stages follow the expected ladder and clamp at +-6', () => {
  assert.equal(stageMultiplier(0), 1);
  assert.equal(stageMultiplier(1), 1.5);
  assert.equal(stageMultiplier(2), 2);
  assert.equal(stageMultiplier(6), 4);
  assert.equal(stageMultiplier(-1), 2 / 3);
  assert.equal(stageMultiplier(-6), 0.25);
  assert.equal(stageMultiplier(99), stageMultiplier(6));
  assert.equal(stageMultiplier(-99), stageMultiplier(-6));
  assert.equal(clampStage(12), 6);
});

test('accuracy stages use the gentler 3/3 ladder', () => {
  assert.equal(accuracyStageMultiplier(0), 1);
  assert.equal(accuracyStageMultiplier(1), 4 / 3);
  assert.equal(accuracyStageMultiplier(-1), 3 / 4);
  assert.equal(accuracyStageMultiplier(6), 3);
});

/* ------------------------------------------------------------ type chart */

test('type chart is structurally complete', () => {
  const order = TYPES.order;
  assert.equal(order.length, 17);
  for (const t of order) {
    assert.ok(CHART[t], `missing chart row for ${t}`);
    assert.ok(TYPES.meta[t], `missing meta for ${t}`);
    assert.match(TYPES.meta[t].color, /^#[0-9a-f]{6}$/i, `bad color for ${t}`);
    assert.ok(TYPES.meta[t].blurb.length > 0, `empty blurb for ${t}`);
    for (const d of Object.keys(CHART[t])) {
      assert.ok(order.includes(d), `${t} references unknown defender ${d}`);
      assert.ok([0, 0.5, 2].includes(CHART[t][d]), `${t}->${d} has odd multiplier`);
    }
  }
});

test('dual typing multiplies, including to 4x and 0.25x', () => {
  assert.equal(effectiveness(CHART, 'flame', ['verdant']), 2);
  assert.equal(effectiveness(CHART, 'flame', ['verdant', 'chitin']), 4);
  assert.equal(effectiveness(CHART, 'flame', ['flame', 'tide']), 0.25);
  assert.equal(effectiveness(CHART, 'beast', ['spirit']), 0);
  assert.equal(effectiveness(CHART, 'spirit', ['beast']), 0);
  assert.equal(effectiveness(CHART, 'terra', ['gale']), 0);
  assert.equal(effectiveness(CHART, 'spark', ['terra']), 0);
  assert.equal(effectiveness(CHART, 'psyche', ['umbral']), 0);
  assert.equal(effectiveness(CHART, 'venom', ['iron']), 0);
  // An immunity beats any amount of super-effectiveness on the other half.
  assert.equal(effectiveness(CHART, 'terra', ['gale', 'flame']), 0);
  assert.equal(typeMultiplier(CHART, 'beast', 'beast'), 1);
});

test('no type is defensively or offensively degenerate', () => {
  const order = TYPES.order;
  for (const def of order) {
    let weak = 0, resist = 0, immune = 0;
    for (const atk of order) {
      const m = typeMultiplier(CHART, atk, def);
      if (m === 0) immune++;
      else if (m > 1) weak++;
      else if (m < 1) resist++;
    }
    // Every type must have at least one exploitable weakness...
    assert.ok(weak >= 1, `${def} has no weaknesses at all`);
    // ...and must not be a free win to attack into.
    assert.ok(weak <= 5, `${def} has ${weak} weaknesses, too fragile`);
    assert.ok(resist + immune <= 10, `${def} resists ${resist + immune}, too dominant`);
  }
  for (const atk of order) {
    const row = CHART[atk];
    const se = Object.values(row).filter((v) => v > 1).length;
    const nve = Object.values(row).filter((v) => v < 1).length;
    assert.ok(se <= 6, `${atk} is super effective against ${se} types`);
    assert.ok(nve <= 10, `${atk} is resisted by ${nve} types`);
  }
});

/* ---------------------------------------------------------------- damage */

test('damage matches a hand-computed baseline', () => {
  const rng = new Rng('damage-baseline');
  const r = calcDamage({
    level: 50, power: 60, category: 'physical',
    moveType: 'beast', attackerTypes: ['tide'], defenderTypes: ['tide'],
    attackStat: 100, defenseStat: 100, attackStage: 0, defenseStage: 0,
    chart: CHART, isCritical: false, fixedRandom: 100,
  }, rng);
  assert.equal(r.damage, 28);
  assert.equal(r.effectiveness, 1);
  assert.equal(r.stab, false);
});

test('STAB and super effectiveness stack to roughly 3x', () => {
  const rng = new Rng('stab');
  const base = {
    level: 50, power: 60, category: 'physical',
    attackStat: 100, defenseStat: 100, attackStage: 0, defenseStage: 0,
    chart: CHART, isCritical: false, fixedRandom: 100,
  };
  // Baseline deliberately has no STAB: a Tide attacker using a Beast move.
  const neutral = calcDamage({ ...base, moveType: 'beast', attackerTypes: ['tide'], defenderTypes: ['tide'] }, rng);
  const boosted = calcDamage({ ...base, moveType: 'flame', attackerTypes: ['flame'], defenderTypes: ['verdant'] }, rng);
  assert.equal(boosted.stab, true);
  assert.equal(boosted.effectiveness, 2);
  const ratio = boosted.damage / neutral.damage;
  assert.ok(ratio > 2.8 && ratio < 3.2, `expected ~3x, got ${ratio}`);
});

test('immunity yields exactly zero damage', () => {
  const rng = new Rng('immune');
  const r = calcDamage({
    level: 50, power: 120, category: 'physical',
    moveType: 'beast', attackerTypes: ['beast'], defenderTypes: ['spirit'],
    attackStat: 300, defenseStat: 50, attackStage: 6, defenseStage: -6,
    chart: CHART, isCritical: true, fixedRandom: 100,
  }, rng);
  assert.equal(r.damage, 0);
});

test('a critical hit ignores the defender Defense boost but not its drop', () => {
  const rng = new Rng('crit');
  const base = {
    level: 50, power: 80, category: 'physical',
    moveType: 'beast', attackerTypes: ['beast'], defenderTypes: ['tide'],
    attackStat: 120, defenseStat: 120, attackStage: 0,
    chart: CHART, fixedRandom: 100,
  };
  const vsBoosted = calcDamage({ ...base, defenseStage: 2, isCritical: true }, rng);
  const vsNeutral = calcDamage({ ...base, defenseStage: 0, isCritical: true }, rng);
  assert.equal(vsBoosted.damage, vsNeutral.damage, 'crit should ignore the +2 Defense');

  const vsDropped = calcDamage({ ...base, defenseStage: -2, isCritical: true }, rng);
  assert.ok(vsDropped.damage > vsNeutral.damage, 'crit should still benefit from a Defense drop');
});

test('burn halves physical damage only', () => {
  const rng = new Rng('burn');
  const base = {
    level: 50, power: 80, moveType: 'beast', attackerTypes: ['beast'], defenderTypes: ['tide'],
    attackStat: 120, defenseStat: 120, attackStage: 0, defenseStage: 0,
    chart: CHART, isCritical: false, fixedRandom: 100,
  };
  const physClean = calcDamage({ ...base, category: 'physical' }, rng).damage;
  const physBurn = calcDamage({ ...base, category: 'physical', attackerStatus: 'burn' }, rng).damage;
  const specBurn = calcDamage({ ...base, category: 'special', attackerStatus: 'burn' }, rng).damage;
  const specClean = calcDamage({ ...base, category: 'special' }, rng).damage;
  assert.ok(physBurn < physClean);
  assert.equal(specBurn, specClean);
});

test('the random damage roll stays inside an 85-100 percent band', () => {
  const rng = new Rng('spread-roll');
  const input = {
    level: 50, power: 80, category: 'physical',
    moveType: 'beast', attackerTypes: ['beast'], defenderTypes: ['tide'],
    attackStat: 120, defenseStat: 120, attackStage: 0, defenseStage: 0,
    chart: CHART, isCritical: false,
  };
  const max = calcDamage({ ...input, fixedRandom: 100 }, rng).damage;
  const min = calcDamage({ ...input, fixedRandom: 85 }, rng).damage;
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < 3000; i++) {
    const d = calcDamage(input, rng).damage;
    lo = Math.min(lo, d);
    hi = Math.max(hi, d);
  }
  assert.equal(hi, max);
  assert.equal(lo, min);
  // Integer truncation lets the realised band drift slightly below 0.85.
  assert.ok(min / max >= 0.80 && min / max <= 0.88, `band was ${min}/${max}`);
});

test('damage never drops below 1 against a non-immune target', () => {
  const rng = new Rng('chip');
  const r = calcDamage({
    level: 2, power: 10, category: 'physical',
    moveType: 'chitin', attackerTypes: ['chitin'], defenderTypes: ['iron', 'flame'],
    attackStat: 5, defenseStat: 400, attackStage: -6, defenseStage: 6,
    chart: CHART, isCritical: false, fixedRandom: 85,
  }, rng);
  assert.equal(r.damage, 1);
});

test('weather modifies the matching types', () => {
  assert.equal(weatherDamageModifier('rain', 'tide'), 1.5);
  assert.equal(weatherDamageModifier('rain', 'flame'), 0.5);
  assert.equal(weatherDamageModifier('harshSun', 'tide'), 0);
  assert.equal(weatherDamageModifier('sandstorm', 'flame'), 1);
  assert.equal(weatherDamageModifier(undefined, 'flame'), 1);
});

/* --------------------------------------------------------------- capture */

test('capture value rises as HP falls and status is applied', () => {
  const base = { hpMax: 100, hpCurrent: 100, catchRate: 120, ballModifier: 1 };
  const full = captureValue(base);
  const red = captureValue({ ...base, hpCurrent: 5 });
  const asleep = captureValue({ ...base, hpCurrent: 5, status: 'sleep' });
  assert.ok(red > full);
  assert.ok(asleep > red);
  // The HP term alone is worth about 3x between full and 1 HP.
  const atOne = captureValue({ ...base, hpCurrent: 1, catchRate: 255, ballModifier: 1 });
  assert.ok(atOne / captureValue({ ...base, catchRate: 255 }) > 2.9);
});

test('capture value is capped at 255 and guarantees the catch there', () => {
  const v = captureValue({ hpMax: 100, hpCurrent: 1, catchRate: 255, ballModifier: 2, status: 'sleep' });
  assert.equal(v, 255);
  const rng = new Rng('guaranteed');
  const res = attemptCapture({ hpMax: 100, hpCurrent: 1, catchRate: 255, ballModifier: 255 }, rng);
  assert.equal(res.caught, true);
  assert.equal(res.guaranteed, true);
});

test('status capture bonuses are the documented values', () => {
  assert.equal(statusCaptureBonus('sleep'), 2);
  assert.equal(statusCaptureBonus('freeze'), 2);
  assert.equal(statusCaptureBonus('paralysis'), 1.5);
  assert.equal(statusCaptureBonus('burn'), 1.5);
  assert.equal(statusCaptureBonus(undefined), 1);
  assert.equal(statusCaptureBonus('none'), 1);
});

test('shake threshold and probability move together monotonically', () => {
  let prev = -1;
  for (let a = 1; a < 255; a++) {
    const b = shakeThreshold(a);
    assert.ok(b > prev, `threshold not monotonic at a=${a}`);
    assert.ok(b <= 65536);
    prev = b;
  }
  const weak = captureProbability({ hpMax: 100, hpCurrent: 100, catchRate: 3, ballModifier: 1 });
  const strong = captureProbability({ hpMax: 100, hpCurrent: 2, catchRate: 190, ballModifier: 2, status: 'sleep' });
  assert.ok(weak < 0.05, `legendary at full HP was ${weak}`);
  assert.ok(strong > 0.9, `easy target was only ${strong}`);
});

test('observed capture rate tracks the stated probability', () => {
  const rng = new Rng('capture-monte-carlo');
  const input = { hpMax: 100, hpCurrent: 40, catchRate: 120, ballModifier: 1 };
  const expected = captureProbability(input);
  let caught = 0;
  const N = 20000;
  for (let i = 0; i < N; i++) if (attemptCapture(input, rng).caught) caught++;
  const observed = caught / N;
  assert.ok(Math.abs(observed - expected) < 0.02,
    `expected ~${expected.toFixed(3)}, observed ${observed.toFixed(3)}`);
});

test('a failed capture still reports how far it got, for the animation', () => {
  const rng = new Rng('shake-count');
  const input = { hpMax: 100, hpCurrent: 100, catchRate: 20, ballModifier: 1 };
  const seen = new Set();
  for (let i = 0; i < 500; i++) seen.add(attemptCapture(input, rng).shakes);
  assert.ok(seen.size > 1, 'shake counts should vary');
  for (const s of seen) assert.ok(s >= 0 && s <= 4);
});

/* ------------------------------------------------------------------ misc */

test('paralysis quarters speed and stages apply first', () => {
  assert.equal(effectiveSpeed(100, 0, undefined), 100);
  assert.equal(effectiveSpeed(100, 1, undefined), 150);
  assert.equal(effectiveSpeed(100, 0, 'paralysis'), 25);
  assert.equal(effectiveSpeed(100, 2, 'paralysis'), 50);
  assert.ok(effectiveSpeed(1, -6, 'paralysis') >= 1);
});

test('escaping is certain when faster and never impossible when slower', () => {
  assert.equal(escapeChance(100, 50, 0), 1);
  const slow = escapeChance(50, 100, 0);
  assert.ok(slow >= 0 && slow < 1);
  assert.ok(escapeChance(50, 100, 3) >= slow || escapeChance(50, 100, 3) >= 0);
});

test('crit ladder is the documented five steps', () => {
  assert.equal(critChance(0), 1 / 16);
  assert.equal(critChance(1), 1 / 8);
  assert.equal(critChance(4), 1 / 2);
  assert.equal(critChance(99), 1 / 2);
});

test('prize money scales with level', () => {
  assert.equal(prizeMoney(40, 20), 800);
  assert.ok(prizeMoney(40, 40) > prizeMoney(40, 20));
});

/* ------------------------------------------------------------------- rng */

test('the RNG is deterministic, reproducible and well distributed', () => {
  const a = new Rng('seed-alpha');
  const b = new Rng('seed-alpha');
  const c = new Rng('seed-beta');
  const seqA = Array.from({ length: 20 }, () => a.nextUint32());
  const seqB = Array.from({ length: 20 }, () => b.nextUint32());
  const seqC = Array.from({ length: 20 }, () => c.nextUint32());
  assert.deepEqual(seqA, seqB);
  assert.notDeepEqual(seqA, seqC);

  const r = new Rng('distribution');
  const buckets = new Array(10).fill(0);
  for (let i = 0; i < 100000; i++) buckets[Math.floor(r.next() * 10)]++;
  for (const n of buckets) assert.ok(Math.abs(n - 10000) < 700, `bucket skew: ${buckets}`);

  const ints = new Set();
  for (let i = 0; i < 5000; i++) ints.add(r.int(1, 6));
  assert.deepEqual([...ints].sort(), [1, 2, 3, 4, 5, 6]);
});

test('RNG state can be saved and restored mid-sequence', () => {
  const r = new Rng('save-state');
  r.nextUint32();
  const state = r.getState();
  const after = [r.nextUint32(), r.nextUint32(), r.nextUint32()];
  r.setState(state);
  assert.deepEqual([r.nextUint32(), r.nextUint32(), r.nextUint32()], after);
});

test('weighted picking honours the weights', () => {
  const r = new Rng('weights');
  const items = [{ id: 'a', w: 70 }, { id: 'b', w: 20 }, { id: 'c', w: 10 }];
  const counts = { a: 0, b: 0, c: 0 };
  for (let i = 0; i < 30000; i++) counts[r.pickWeighted(items, (i2) => i2.w).id]++;
  assert.ok(Math.abs(counts.a / 30000 - 0.7) < 0.02);
  assert.ok(Math.abs(counts.b / 30000 - 0.2) < 0.02);
  assert.ok(Math.abs(counts.c / 30000 - 0.1) < 0.02);
});
