/**
 * Kin instances.
 *
 * A species is data; a kin is one living individual with its own genes, nature,
 * experience, moves and scars. Everything that makes two Sprigling feel like
 * different animals lives here.
 */

import { registry } from '../data/registry.js';
import {
  calcHp, calcStat, expForLevel, levelForExp, natureMultiplier, MAX_LEVEL,
} from '../battle/formulas.js';
import type { Rng } from '../core/rng.js';
import type {
  Evolution, SpeciesData, StatKey, StatSpread, StatusId, TimeOfDay, TypeId,
} from '../data/schema.js';
import { STAT_KEYS } from '../data/schema.js';

export interface MoveSlot {
  id: string;
  pp: number;
  maxPp: number;
  /** PP Up style boosts, 0..3. */
  ppBoosts?: number;
}

export interface KinInit {
  species: string;
  level: number;
  nickname?: string;
  ivs?: Partial<StatSpread>;
  evs?: Partial<StatSpread>;
  nature?: string;
  ability?: string;
  moves?: string[];
  item?: string;
  gender?: 'male' | 'female' | 'none';
  originalTrainer?: string;
  friendship?: number;
}

let nextUid = 1;

export class Kin {
  uid: number;
  species: string;
  nickname?: string;
  level: number;
  exp: number;

  ivs: StatSpread;
  evs: StatSpread;
  nature: string;
  ability: string;
  gender: 'male' | 'female' | 'none';

  moves: MoveSlot[] = [];

  currentHp: number;
  status: StatusId = 'none';
  /** Turns of sleep remaining; also reused as toxic counter. */
  statusCounter = 0;

  heldItem?: string;
  friendship: number;
  originalTrainer?: string;
  /** Set once so the Vellum can show where it came from. */
  metAt?: string;
  metLevel?: number;

  constructor(init: KinInit, rng: Rng) {
    this.uid = nextUid++;
    this.species = init.species;
    this.nickname = init.nickname;
    this.level = Math.max(1, Math.min(MAX_LEVEL, init.level));

    const sp = this.data;
    this.exp = expForLevel(sp?.growthRate ?? 'mediumFast', this.level);

    this.ivs = fillSpread(init.ivs, () => rng.int(0, 31));
    this.evs = fillSpread(init.evs, () => 0);

    this.nature = init.nature ?? (registry.natures.length
      ? rng.pick(registry.natures).id
      : 'steady');

    const abilityPool = sp?.abilities ?? [];
    this.ability = init.ability ?? (abilityPool.length ? rng.pick(abilityPool) : 'none');

    if (init.gender) this.gender = init.gender;
    else if (!sp || sp.genderRatio < 0) this.gender = 'none';
    else this.gender = rng.next() < sp.genderRatio ? 'female' : 'male';

    this.friendship = init.friendship ?? sp?.baseFriendship ?? 70;
    this.originalTrainer = init.originalTrainer;
    this.heldItem = init.item;
    this.metLevel = this.level;

    this.setMoves(init.moves ?? this.defaultMoves());
    this.currentHp = this.maxHp;
  }

  /* ------------------------------------------------------------- species */

  get data(): SpeciesData | undefined {
    return registry.species.get(this.species);
  }

  get name(): string {
    return this.nickname ?? this.data?.name ?? this.species;
  }

  get speciesName(): string {
    return this.data?.name ?? this.species;
  }

  get types(): TypeId[] {
    return (this.data?.types ?? ['beast']) as TypeId[];
  }

  get fainted(): boolean {
    return this.currentHp <= 0;
  }

  /* --------------------------------------------------------------- stats */

  private natureMod(stat: StatKey): number {
    const n = registry.natures.find((x) => x.id === this.nature);
    if (!n) return 1;
    return natureMultiplier(n.up, n.down, stat);
  }

  stat(key: StatKey): number {
    const sp = this.data;
    const base = sp?.base[key] ?? 50;
    if (key === 'hp') return calcHp(base, this.ivs.hp, this.evs.hp, this.level);
    return calcStat(base, this.ivs[key], this.evs[key], this.level, this.natureMod(key));
  }

  get maxHp(): number { return this.stat('hp'); }
  get atk(): number { return this.stat('atk'); }
  get def(): number { return this.stat('def'); }
  get spa(): number { return this.stat('spa'); }
  get spd(): number { return this.stat('spd'); }
  get spe(): number { return this.stat('spe'); }

  get hpFraction(): number {
    return this.maxHp > 0 ? this.currentHp / this.maxHp : 0;
  }

  /* --------------------------------------------------------------- moves */

  /** The four most recent level-up moves at or below the current level. */
  defaultMoves(): string[] {
    const sp = this.data;
    if (!sp) return ['strike'];
    const learned = sp.learnset
      .filter((l) => l.level <= this.level)
      .map((l) => l.move);
    const unique: string[] = [];
    for (const m of learned) if (!unique.includes(m)) unique.push(m);
    return unique.slice(-4);
  }

  setMoves(ids: string[]): void {
    this.moves = ids.slice(0, 4).map((id) => {
      const md = registry.moves.get(id);
      const pp = md?.pp ?? 10;
      return { id, pp, maxPp: pp, ppBoosts: 0 };
    });
    if (this.moves.length === 0) {
      this.moves = [{ id: 'strike', pp: 35, maxPp: 35, ppBoosts: 0 }];
    }
  }

  knowsMove(id: string): boolean {
    return this.moves.some((m) => m.id === id);
  }

  /** Returns false when the moveset is full and the caller must choose. */
  learnMove(id: string): boolean {
    if (this.knowsMove(id)) return true;
    if (this.moves.length >= 4) return false;
    const md = registry.moves.get(id);
    const pp = md?.pp ?? 10;
    this.moves.push({ id, pp, maxPp: pp, ppBoosts: 0 });
    return true;
  }

  replaceMove(index: number, id: string): void {
    const md = registry.moves.get(id);
    const pp = md?.pp ?? 10;
    this.moves[index] = { id, pp, maxPp: pp, ppBoosts: 0 };
  }

  /** Moves this kin would learn on reaching `level`. */
  movesLearnedAt(level: number): string[] {
    return (this.data?.learnset ?? []).filter((l) => l.level === level).map((l) => l.move);
  }

  restorePp(): void {
    for (const m of this.moves) m.pp = m.maxPp;
  }

  get hasUsablePp(): boolean {
    return this.moves.some((m) => m.pp > 0);
  }

  /* ---------------------------------------------------------- experience */

  get growthRate() {
    return this.data?.growthRate ?? 'mediumFast';
  }

  expToNextLevel(): number {
    if (this.level >= MAX_LEVEL) return 0;
    return expForLevel(this.growthRate, this.level + 1) - this.exp;
  }

  /**
   * Adds experience and reports every level crossed, so the battle scene can
   * animate them one at a time and prompt for move learning at each step.
   */
  gainExp(amount: number): { levels: number[]; learned: { level: number; move: string }[] } {
    const levels: number[] = [];
    const learned: { level: number; move: string }[] = [];
    if (this.level >= MAX_LEVEL) return { levels, learned };

    this.exp += Math.max(0, Math.floor(amount));
    const cap = expForLevel(this.growthRate, MAX_LEVEL);
    if (this.exp > cap) this.exp = cap;

    const newLevel = levelForExp(this.growthRate, this.exp);
    while (this.level < newLevel) {
      const before = this.maxHp;
      this.level++;
      // Level-ups raise max HP; the current HP rises by the same amount so a
      // level up never feels like a heal or a punishment.
      this.currentHp += this.maxHp - before;
      levels.push(this.level);
      for (const move of this.movesLearnedAt(this.level)) {
        learned.push({ level: this.level, move });
      }
    }
    return { levels, learned };
  }

  /** EVs from a defeated opponent, respecting both caps. */
  gainEvs(yieldSpread: Partial<StatSpread>): void {
    let total = STAT_KEYS.reduce((s, k) => s + this.evs[k], 0);
    for (const key of STAT_KEYS) {
      const gain = yieldSpread[key] ?? 0;
      if (gain <= 0) continue;
      const room = Math.min(255 - this.evs[key], 510 - total, gain);
      if (room <= 0) continue;
      this.evs[key] += room;
      total += room;
    }
  }

  /* ----------------------------------------------------------- evolution */

  /** The evolution triggered by the current state, if any. */
  checkEvolution(ctx: {
    trigger: 'levelUp' | 'item' | 'trade';
    item?: string;
    mapId?: string;
    time?: TimeOfDay;
  }): Evolution | undefined {
    const evos = this.data?.evolutions ?? [];
    for (const evo of evos) {
      const m = evo.method;
      switch (m.kind) {
        case 'level':
          if (ctx.trigger === 'levelUp' && this.level >= m.level) return evo;
          break;
        case 'levelWithStat':
          if (ctx.trigger === 'levelUp' && this.level >= m.level) {
            const a = this.atk, d = this.def;
            if (m.compare === 'atkGtDef' && a > d) return evo;
            if (m.compare === 'defGtAtk' && d > a) return evo;
            if (m.compare === 'atkEqDef' && a === d) return evo;
          }
          break;
        case 'item':
          if (ctx.trigger === 'item' && ctx.item === m.item) return evo;
          break;
        case 'friendship':
          if (ctx.trigger === 'levelUp' && this.friendship >= m.threshold) {
            if (!m.time) return evo;
            const night = ctx.time === 'night' || ctx.time === 'evening';
            if ((m.time === 'night') === night) return evo;
          }
          break;
        case 'levelAtTime':
          if (ctx.trigger === 'levelUp' && this.level >= m.level && ctx.time === m.time) return evo;
          break;
        case 'location':
          if (ctx.trigger === 'levelUp' && ctx.mapId === m.mapId &&
              (m.level === undefined || this.level >= m.level)) return evo;
          break;
        case 'knowsMove':
          if (ctx.trigger === 'levelUp' && this.knowsMove(m.move) &&
              (m.level === undefined || this.level >= m.level)) return evo;
          break;
        case 'bond':
          if (ctx.trigger === 'levelUp' && this.level >= m.level) return evo;
          break;
        case 'holdingItem':
          if (ctx.trigger === 'levelUp' && this.heldItem === m.item) return evo;
          break;
        case 'weatherLevel':
          if (ctx.trigger === 'levelUp' && this.level >= m.level) return evo;
          break;
      }
    }
    return undefined;
  }

  /** Applies an evolution in place, preserving everything that should persist. */
  evolveInto(speciesId: string): void {
    const beforeMax = this.maxHp;
    this.species = speciesId;
    const gain = this.maxHp - beforeMax;
    this.currentHp = Math.min(this.maxHp, this.currentHp + Math.max(0, gain));
    // An evolved form may have a different ability slot count.
    const pool = this.data?.abilities ?? [];
    if (pool.length && !pool.includes(this.ability)) this.ability = pool[0]!;
  }

  /* ------------------------------------------------------------- healing */

  healFull(): void {
    this.currentHp = this.maxHp;
    this.status = 'none';
    this.statusCounter = 0;
    this.restorePp();
  }

  heal(amount: number): number {
    const before = this.currentHp;
    this.currentHp = Math.min(this.maxHp, this.currentHp + Math.max(0, Math.floor(amount)));
    return this.currentHp - before;
  }

  damage(amount: number): number {
    const before = this.currentHp;
    this.currentHp = Math.max(0, this.currentHp - Math.max(0, Math.floor(amount)));
    return before - this.currentHp;
  }

  /* ------------------------------------------------------- serialisation */

  toJSON(): Record<string, unknown> {
    return {
      species: this.species, nickname: this.nickname, level: this.level, exp: this.exp,
      ivs: this.ivs, evs: this.evs, nature: this.nature, ability: this.ability,
      gender: this.gender, moves: this.moves, currentHp: this.currentHp,
      status: this.status, statusCounter: this.statusCounter, heldItem: this.heldItem,
      friendship: this.friendship, originalTrainer: this.originalTrainer,
      metAt: this.metAt, metLevel: this.metLevel,
    };
  }

  static fromJSON(data: Record<string, any>, rng: Rng): Kin {
    const k = new Kin({ species: data.species, level: data.level }, rng);
    k.nickname = data.nickname;
    k.exp = data.exp ?? k.exp;
    k.ivs = data.ivs ?? k.ivs;
    k.evs = data.evs ?? k.evs;
    k.nature = data.nature ?? k.nature;
    k.ability = data.ability ?? k.ability;
    k.gender = data.gender ?? k.gender;
    k.moves = data.moves ?? k.moves;
    k.currentHp = data.currentHp ?? k.maxHp;
    k.status = data.status ?? 'none';
    k.statusCounter = data.statusCounter ?? 0;
    k.heldItem = data.heldItem;
    k.friendship = data.friendship ?? k.friendship;
    k.originalTrainer = data.originalTrainer;
    k.metAt = data.metAt;
    k.metLevel = data.metLevel;
    return k;
  }
}

function fillSpread(partial: Partial<StatSpread> | undefined, fallback: () => number): StatSpread {
  const out = {} as StatSpread;
  for (const k of STAT_KEYS) out[k] = partial?.[k] ?? fallback();
  return out;
}

/** Convenience factory. */
export function createKin(species: string, level: number, rng: Rng, opts: Partial<KinInit> = {}): Kin {
  return new Kin({ species, level, ...opts }, rng);
}
