/**
 * Pure battle mathematics.
 *
 * Nothing in this file touches rendering, the DOM, or global state. Every
 * function is deterministic given its inputs (plus an explicit Rng where a roll
 * is required), which is what makes the whole combat system unit-testable.
 *
 * The shapes of these formulas follow the conventions of the early-2000s
 * handheld RPGs studied in docs/RESEARCH_NOTES.md, tuned for this game.
 */

import type {
  GrowthRate, MoveCategory, StatusId, TypeId, WeatherId,
} from '../data/schema.js';
import type { Rng } from '../core/rng.js';

export const MAX_LEVEL = 100;
export const MIN_LEVEL = 1;
export const MAX_IV = 31;
export const MAX_EV_PER_STAT = 255;
export const MAX_EV_TOTAL = 510;

/* ===================================================================== *
 *  EXPERIENCE
 * ===================================================================== */

/** Total experience required to *be* level `n` under a given growth curve. */
export function expForLevel(rate: GrowthRate, n: number): number {
  if (n <= 1) return 0;
  const c = n * n * n;
  switch (rate) {
    case 'fast':
      return Math.floor((4 * c) / 5);
    case 'mediumFast':
      return c;
    case 'mediumSlow':
      return Math.max(0, Math.floor((6 / 5) * c - 15 * n * n + 100 * n - 140));
    case 'slow':
      return Math.floor((5 * c) / 4);
    case 'erratic':
      if (n < 50) return Math.floor((c * (100 - n)) / 50);
      if (n < 68) return Math.floor((c * (150 - n)) / 100);
      if (n < 98) return Math.floor((c * Math.floor((1911 - 10 * n) / 3)) / 500);
      return Math.floor((c * (160 - n)) / 100);
    case 'fluctuating':
      if (n < 15) return Math.floor((c * (Math.floor((n + 1) / 3) + 24)) / 50);
      if (n < 36) return Math.floor((c * (n + 14)) / 50);
      return Math.floor((c * (Math.floor(n / 2) + 32)) / 50);
    default:
      return c;
  }
}

/** Highest level whose requirement is satisfied by `exp`. */
export function levelForExp(rate: GrowthRate, exp: number): number {
  let lo = 1;
  let hi = MAX_LEVEL;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (expForLevel(rate, mid) <= exp) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/** Fraction (0..1) of the way from the current level to the next. */
export function expProgress(rate: GrowthRate, exp: number, level: number): number {
  if (level >= MAX_LEVEL) return 1;
  const cur = expForLevel(rate, level);
  const next = expForLevel(rate, level + 1);
  if (next <= cur) return 1;
  return Math.min(1, Math.max(0, (exp - cur) / (next - cur)));
}

export interface ExpGainInput {
  baseExp: number;
  defeatedLevel: number;
  /** Number of participants that are still conscious. */
  participants: number;
  fromTrainer: boolean;
  /** Held-item / event multipliers, e.g. 1.5 for a lucky charm. */
  bonusMultiplier?: number;
  /** Traded/outsider kin learn faster. */
  outsider?: boolean;
}

export function expGain(input: ExpGainInput): number {
  const a = input.fromTrainer ? 1.5 : 1;
  const t = input.outsider ? 1.5 : 1;
  const e = input.bonusMultiplier ?? 1;
  const s = Math.max(1, input.participants);
  return Math.max(1, Math.floor((input.baseExp * input.defeatedLevel * a * t * e) / (7 * s)));
}

/* ===================================================================== *
 *  STATS
 * ===================================================================== */

export function calcHp(base: number, iv: number, ev: number, level: number): number {
  // A base of 1 marks a "one hit and it's out" design; keep it at exactly 1.
  if (base === 1) return 1;
  return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
}

export function calcStat(
  base: number, iv: number, ev: number, level: number, natureMod = 1,
): number {
  const raw = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5;
  return Math.floor(raw * natureMod);
}

/** +10% / -10% / neutral. */
export function natureMultiplier(up: string | undefined, down: string | undefined, stat: string): number {
  if (!up || !down || up === down) return 1;
  if (stat === up) return 1.1;
  if (stat === down) return 0.9;
  return 1;
}

/* ===================================================================== *
 *  STAT STAGES
 * ===================================================================== */

export function clampStage(stage: number): number {
  return Math.max(-6, Math.min(6, stage));
}

/** Multiplier for atk/def/spa/spd/spe stages. */
export function stageMultiplier(stage: number): number {
  const s = clampStage(stage);
  return s >= 0 ? (2 + s) / 2 : 2 / (2 - s);
}

/** Multiplier for accuracy/evasion stages (a gentler curve). */
export function accuracyStageMultiplier(stage: number): number {
  const s = clampStage(stage);
  return s >= 0 ? (3 + s) / 3 : 3 / (3 - s);
}

/* ===================================================================== *
 *  TYPE EFFECTIVENESS
 * ===================================================================== */

export type TypeChartMap = Record<string, Partial<Record<string, number>>>;

export function typeMultiplier(
  chart: TypeChartMap, attacking: TypeId, defending: TypeId,
): number {
  const row = chart[attacking];
  if (!row) return 1;
  const v = row[defending];
  return v === undefined ? 1 : v;
}

export function effectiveness(
  chart: TypeChartMap, attacking: TypeId, defenderTypes: readonly TypeId[],
): number {
  let mult = 1;
  for (const d of defenderTypes) mult *= typeMultiplier(chart, attacking, d);
  return mult;
}

/** Player-facing wording for an effectiveness multiplier. */
export function effectivenessMessage(mult: number, name: string): string | null {
  if (mult === 0) return `It has no effect on ${name}.`;
  if (mult >= 4) return 'It is devastatingly effective!';
  if (mult > 1) return 'It is super effective!';
  if (mult > 0 && mult <= 0.25) return 'It barely does anything.';
  if (mult < 1) return 'It is not very effective.';
  return null;
}

/* ===================================================================== *
 *  ACCURACY
 * ===================================================================== */

export interface AccuracyInput {
  /** Move accuracy 0..100, or -1 for "always hits". */
  moveAccuracy: number;
  accuracyStage: number;
  evasionStage: number;
  /** e.g. 0.8 in fog, 1.0 normally. */
  weatherModifier?: number;
  /** Ability/item multipliers on the attacker's accuracy. */
  attackerModifier?: number;
}

export function accuracyCheck(input: AccuracyInput, rng: Rng): boolean {
  if (input.moveAccuracy < 0) return true;
  const stage = clampStage(input.accuracyStage) - clampStage(input.evasionStage);
  const stageMod = accuracyStageMultiplier(stage);
  const chance =
    input.moveAccuracy *
    stageMod *
    (input.weatherModifier ?? 1) *
    (input.attackerModifier ?? 1);
  if (chance >= 100) return true;
  return rng.next() * 100 < chance;
}

/* ===================================================================== *
 *  CRITICAL HITS
 * ===================================================================== */

/** Crit chance by stage: 1/16, 1/8, 1/4, 1/3, 1/2. */
export const CRIT_RATES = [1 / 16, 1 / 8, 1 / 4, 1 / 3, 1 / 2] as const;

export function critChance(stage: number): number {
  const s = Math.max(0, Math.min(CRIT_RATES.length - 1, Math.floor(stage)));
  return CRIT_RATES[s]!;
}

export function rollCrit(stage: number, rng: Rng, immune = false): boolean {
  if (immune) return false;
  return rng.next() < critChance(stage);
}

/* ===================================================================== *
 *  DAMAGE
 * ===================================================================== */

export interface DamageInput {
  level: number;
  power: number;
  category: MoveCategory;
  moveType: TypeId;
  attackerTypes: readonly TypeId[];
  defenderTypes: readonly TypeId[];

  /** Raw stats before stage modifiers. */
  attackStat: number;
  defenseStat: number;
  attackStage: number;
  defenseStage: number;

  chart: TypeChartMap;

  isCritical: boolean;
  /** Physical damage is halved while burned. */
  attackerStatus?: StatusId;
  /** A screen halves damage of the matching category (unless critical). */
  screenActive?: boolean;
  /** 0.5 when a spread move hits more than one target. */
  spread?: boolean;
  weather?: WeatherId;
  /** Extra multiplicative modifiers from abilities, items, terrain, etc. */
  extraModifiers?: number[];
  /** Same-type attack bonus, normally 1.5. */
  stabMultiplier?: number;
  /** Set to skip the 85..100 roll (used by the AI's expected-damage preview). */
  fixedRandom?: number;
}

export interface DamageResult {
  damage: number;
  effectiveness: number;
  critical: boolean;
  stab: boolean;
}

/** Weather boost/penalty for a move type. */
export function weatherDamageModifier(weather: WeatherId | undefined, moveType: TypeId): number {
  switch (weather) {
    case 'rain':
    case 'storm':
      if (moveType === 'tide') return 1.5;
      if (moveType === 'flame') return 0.5;
      return 1;
    case 'heavyRain':
      if (moveType === 'tide') return 1.5;
      if (moveType === 'flame') return 0;
      return 1;
    case 'sun':
      if (moveType === 'flame') return 1.5;
      if (moveType === 'tide') return 0.5;
      return 1;
    case 'harshSun':
      if (moveType === 'flame') return 1.5;
      if (moveType === 'tide') return 0;
      return 1;
    default:
      return 1;
  }
}

export function calcDamage(input: DamageInput, rng: Rng): DamageResult {
  const eff = effectiveness(input.chart, input.moveType, input.defenderTypes);

  if (input.power <= 0 || eff === 0) {
    return { damage: 0, effectiveness: eff, critical: false, stab: false };
  }

  // A critical hit ignores the defender's positive Defense stages and the
  // attacker's negative Attack stages.
  const atkStage = input.isCritical ? Math.max(0, input.attackStage) : input.attackStage;
  const defStage = input.isCritical ? Math.min(0, input.defenseStage) : input.defenseStage;

  const a = Math.max(1, Math.floor(input.attackStat * stageMultiplier(atkStage)));
  const d = Math.max(1, Math.floor(input.defenseStat * stageMultiplier(defStage)));

  let dmg = Math.floor(
    Math.floor(Math.floor((2 * input.level) / 5 + 2) * input.power * a / d) / 50,
  );

  // Pre-"+2" multiplicative block.
  if (input.category === 'physical' && input.attackerStatus === 'burn') {
    dmg = Math.floor(dmg / 2);
  }
  if (input.screenActive && !input.isCritical) {
    dmg = Math.floor(dmg / 2);
  }
  if (input.spread) {
    dmg = Math.floor(dmg * 0.5);
  }
  const weatherMod = weatherDamageModifier(input.weather, input.moveType);
  if (weatherMod !== 1) dmg = Math.floor(dmg * weatherMod);

  dmg += 2;

  if (input.isCritical) dmg = Math.floor(dmg * 2);

  const isStab = input.attackerTypes.includes(input.moveType);
  if (isStab) dmg = Math.floor(dmg * (input.stabMultiplier ?? 1.5));

  dmg = Math.floor(dmg * eff);

  for (const m of input.extraModifiers ?? []) {
    dmg = Math.floor(dmg * m);
  }

  const roll = input.fixedRandom ?? rng.int(85, 100);
  dmg = Math.floor((dmg * roll) / 100);

  return {
    damage: Math.max(1, dmg),
    effectiveness: eff,
    critical: input.isCritical,
    stab: isStab,
  };
}

/* ===================================================================== *
 *  CAPTURE
 * ===================================================================== */

export function statusCaptureBonus(status: StatusId | undefined): number {
  switch (status) {
    case 'sleep':
    case 'freeze':
      return 2;
    case 'paralysis':
    case 'poison':
    case 'toxic':
    case 'burn':
      return 1.5;
    default:
      return 1;
  }
}

export interface CaptureInput {
  hpMax: number;
  hpCurrent: number;
  /** Species catch rate, 3..255. */
  catchRate: number;
  /** Vessel modifier, e.g. 1 field, 1.5 fine, 2 deep, 255 warden. */
  ballModifier: number;
  status?: StatusId;
  /** Level of the wild kin, for vessels that care about it. */
  targetLevel?: number;
  /** Extra multiplier from special vessels (dusk, net, dive equivalents). */
  situationalModifier?: number;
}

export interface CaptureResult {
  caught: boolean;
  /** How many of the four checks passed. Drives the shake animation. */
  shakes: number;
  /** Guaranteed captures skip the tension entirely. */
  guaranteed: boolean;
  /** Chance of capture for this attempt, for debug tooling. */
  probability: number;
}

/** The modified catch value `a`, capped at 255. */
export function captureValue(input: CaptureInput): number {
  const hpMax = Math.max(1, input.hpMax);
  const hpCur = Math.max(1, Math.min(input.hpCurrent, hpMax));
  const hpTerm = (3 * hpMax - 2 * hpCur) / (3 * hpMax);
  const a =
    hpTerm *
    input.catchRate *
    input.ballModifier *
    (input.situationalModifier ?? 1) *
    statusCaptureBonus(input.status);
  return Math.max(1, Math.min(255, Math.floor(a)));
}

/** Per-shake threshold out of 65536. */
export function shakeThreshold(a: number): number {
  if (a >= 255) return 65536;
  return Math.floor(1048560 / Math.sqrt(Math.sqrt(16711680 / a)));
}

export function captureProbability(input: CaptureInput): number {
  const a = captureValue(input);
  if (a >= 255) return 1;
  const b = shakeThreshold(a);
  return Math.pow(b / 65536, 4);
}

export function attemptCapture(input: CaptureInput, rng: Rng): CaptureResult {
  const a = captureValue(input);
  if (a >= 255) {
    return { caught: true, shakes: 4, guaranteed: true, probability: 1 };
  }
  const b = shakeThreshold(a);
  let shakes = 0;
  for (let i = 0; i < 4; i++) {
    if (rng.below(65536) < b) shakes++;
    else break;
  }
  return {
    caught: shakes === 4,
    shakes,
    guaranteed: false,
    probability: Math.pow(b / 65536, 4),
  };
}

/* ===================================================================== *
 *  MISC BATTLE MATH
 * ===================================================================== */

/** Turn order: higher priority first, then higher speed, ties broken randomly. */
export function compareTurnOrder(
  aPriority: number, aSpeed: number,
  bPriority: number, bSpeed: number,
  rng: Rng,
): number {
  if (aPriority !== bPriority) return bPriority - aPriority;
  if (aSpeed !== bSpeed) return bSpeed - aSpeed;
  return rng.next() < 0.5 ? -1 : 1;
}

/** Paralysis quarters speed. */
export function effectiveSpeed(speed: number, stage: number, status: StatusId | undefined, weatherBoost = 1): number {
  let s = Math.floor(speed * stageMultiplier(stage) * weatherBoost);
  if (status === 'paralysis') s = Math.floor(s / 4);
  return Math.max(1, s);
}

/** Chance to escape a wild battle. */
export function escapeChance(playerSpeed: number, wildSpeed: number, attempts: number): number {
  if (playerSpeed > wildSpeed) return 1;
  const odds = (Math.floor((playerSpeed * 128) / Math.max(1, wildSpeed)) + 30 * attempts) % 256;
  return Math.min(1, odds / 256);
}

/** Prize money for defeating a trainer. */
export function prizeMoney(payout: number, highestLevel: number, multiplier = 1): number {
  return Math.max(1, Math.floor(payout * highestLevel * multiplier));
}
