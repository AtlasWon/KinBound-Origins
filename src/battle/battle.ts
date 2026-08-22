/**
 * Battle engine.
 *
 * Pure simulation. It never draws anything: a turn is resolved into a list of
 * BattleEvents which the battle scene then plays back at whatever speed the
 * player has chosen. That split is what makes battles testable headlessly, what
 * makes "fast battle text" a presentation setting rather than a rules change,
 * and what will let a replay be reconstructed from a seed.
 */

import { Kin } from '../systems/kin.js';
import { registry } from '../data/registry.js';
import { Rng } from '../core/rng.js';
import {
  accuracyCheck, attemptCapture, calcDamage, clampStage, effectiveness,
  effectivenessMessage, effectiveSpeed, escapeChance, expGain, prizeMoney,
  rollCrit, statusCaptureBonus,
} from './formulas.js';
import type {
  BattleStatKey, MoveData, MoveEffect, StatusId, TrainerData, TypeId,
  VolatileId, WeatherId,
} from '../data/schema.js';

/* ===================================================================== *
 *  EVENTS
 * ===================================================================== */

export type SideId = 'player' | 'foe';

export type BattleEvent =
  | { t: 'message'; text: string }
  /** A sound the presentation layer should play at this point in the script. */
  | { t: 'sfx'; id: string }
  | { t: 'sendOut'; side: SideId; kin: Kin; fromTrainer?: string }
  | { t: 'withdraw'; side: SideId; kin: Kin }
  | { t: 'useMove'; side: SideId; kin: Kin; move: MoveData }
  | { t: 'damage'; side: SideId; kin: Kin; amount: number; hpAfter: number; effectiveness: number; critical: boolean }
  | { t: 'heal'; side: SideId; kin: Kin; amount: number; hpAfter: number }
  | { t: 'miss'; side: SideId; kin: Kin }
  | { t: 'noEffect'; side: SideId; kin: Kin }
  | { t: 'faint'; side: SideId; kin: Kin }
  | { t: 'statChange'; side: SideId; kin: Kin; stat: BattleStatKey; delta: number; failed?: boolean }
  | { t: 'status'; side: SideId; kin: Kin; status: StatusId }
  | { t: 'statusCured'; side: SideId; kin: Kin; status: StatusId }
  | { t: 'volatile'; side: SideId; kin: Kin; volatile: VolatileId; on: boolean }
  | { t: 'weather'; weather: WeatherId; starting: boolean }
  | { t: 'throwVessel'; item: string; shakes: number; caught: boolean; kin: Kin }
  | { t: 'useItem'; side: SideId; item: string; kin?: Kin }
  | { t: 'expGain'; kin: Kin; amount: number }
  | { t: 'levelUp'; kin: Kin; level: number }
  | { t: 'learnMove'; kin: Kin; move: string }
  | { t: 'evolutionReady'; kin: Kin; into: string }
  | { t: 'fleeSuccess' }
  | { t: 'fleeFailed' }
  | { t: 'end'; result: BattleResult };

export type BattleResult = 'win' | 'loss' | 'caught' | 'fled' | 'foeFled';

/* ===================================================================== *
 *  ACTIONS
 * ===================================================================== */

export type BattleAction =
  | { kind: 'move'; index: number }
  | { kind: 'switch'; partyIndex: number }
  | { kind: 'item'; item: string; partyIndex?: number }
  | { kind: 'run' };

/* ===================================================================== *
 *  SIDE STATE
 * ===================================================================== */

const ZERO_STAGES: Record<BattleStatKey, number> = {
  atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0,
};

export class BattleSide {
  activeIndex = 0;
  stages: Record<BattleStatKey, number> = { ...ZERO_STAGES };
  volatiles = new Map<VolatileId, number>();
  screens = { physical: 0, special: 0 };
  hazards = { spikes: 0, grit: 0, spores: 0 };
  /** Kin that have been on the field since the last foe fainted, for EXP. */
  participants = new Set<number>();
  /** Consecutive protect uses, which make it progressively likely to fail. */
  protectStreak = 0;
  lastMoveId?: string;
  /** Set while a two-turn move is charging. */
  charging?: { moveId: string; semiInvulnerable?: string };
  /** Counts run attempts for the escape formula. */
  escapeAttempts = 0;

  constructor(public party: Kin[], public isPlayer: boolean, public trainer?: TrainerData) {}

  get active(): Kin {
    return this.party[this.activeIndex]!;
  }

  get hasUsableKin(): boolean {
    return this.party.some((k) => !k.fainted);
  }

  firstUsableIndex(): number {
    return this.party.findIndex((k) => !k.fainted);
  }

  /** Everything that should be forgotten when a kin leaves the field. */
  resetOnSwitch(): void {
    this.stages = { ...ZERO_STAGES };
    this.volatiles.clear();
    this.protectStreak = 0;
    this.lastMoveId = undefined;
    this.charging = undefined;
  }
}

/* ===================================================================== *
 *  BATTLE
 * ===================================================================== */

export interface BattleConfig {
  playerParty: Kin[];
  foeParty: Kin[];
  foeTrainer?: TrainerData;
  isWild: boolean;
  weather?: WeatherId;
  /** Blocks capture and fleeing, e.g. for a scripted duel. */
  noCapture?: boolean;
  noFlee?: boolean;
  /** Suppress the trainer intro lines; the caller has already shown them. */
  skipIntroLines?: boolean;
  seed?: string | number;
  /** Player's bag, so battle items can be consumed. */
  bag?: { has(item: string, n?: number): boolean; take(item: string, n?: number): boolean };
}

export class Battle {
  readonly player: BattleSide;
  readonly foe: BattleSide;
  readonly isWild: boolean;
  readonly rng: Rng;

  weather: WeatherId = 'clear';
  weatherTurns = 0;
  turn = 0;
  over = false;
  result?: BattleResult;
  prize = 0;

  private events: BattleEvent[] = [];
  private config: BattleConfig;

  constructor(config: BattleConfig) {
    this.config = config;
    this.rng = new Rng(config.seed ?? Date.now());
    this.player = new BattleSide(config.playerParty, true);
    this.foe = new BattleSide(config.foeParty, false, config.foeTrainer);
    this.isWild = config.isWild;
    if (config.weather && config.weather !== 'clear') {
      this.weather = config.weather;
      this.weatherTurns = 9999;
    }
    this.player.activeIndex = Math.max(0, this.player.firstUsableIndex());
    this.player.participants.add(this.player.active.uid);
  }

  /* ------------------------------------------------------------- helpers */

  private side(id: SideId): BattleSide {
    return id === 'player' ? this.player : this.foe;
  }

  private otherId(id: SideId): SideId {
    return id === 'player' ? 'foe' : 'player';
  }

  private emit(e: BattleEvent): void {
    this.events.push(e);
  }

  private msg(text: string): void {
    this.emit({ t: 'message', text });
  }

  /** Drains and returns everything queued since the last drain. */
  drainEvents(): BattleEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  /** Display name with the "wild"/"foe" qualifier the genre expects. */
  label(id: SideId, kin = this.side(id).active): string {
    if (id === 'player') return kin.name;
    if (this.isWild) return `the wild ${kin.name}`;
    return `the opposing ${kin.name}`;
  }

  /* --------------------------------------------------------------- start */

  begin(): BattleEvent[] {
    if (this.isWild) {
      this.msg(`A wild ${this.foe.active.name} appeared!`);
    } else if (this.foe.trainer) {
      this.msg(`${this.foe.trainer.className} ${this.foe.trainer.name} wants to battle!`);
      if (!this.config.skipIntroLines) {
        for (const line of this.foe.trainer.intro) this.msg(line);
      }
      this.emit({ t: 'sendOut', side: 'foe', kin: this.foe.active, fromTrainer: this.foe.trainer.name });
    }
    if (!this.isWild) {
      this.msg(`${this.foe.trainer?.name ?? 'The opponent'} sent out ${this.foe.active.name}!`);
    }
    this.emit({ t: 'sendOut', side: 'player', kin: this.player.active });
    this.msg(`Go, ${this.player.active.name}!`);
    if (this.weather !== 'clear') {
      this.emit({ t: 'weather', weather: this.weather, starting: true });
    }
    return this.drainEvents();
  }

  /* ----------------------------------------------------------- turn flow */

  /**
   * Resolve one full turn. The player's action comes in; the opponent's is
   * chosen by the AI (injected by the caller to keep this module dependency
   * free in tests).
   */
  takeTurn(playerAction: BattleAction, foeAction: BattleAction): BattleEvent[] {
    if (this.over) return this.drainEvents();
    this.turn++;

    // Switches and items resolve before any move, in that order.
    const pre: { side: SideId; action: BattleAction }[] = [];
    const moves: { side: SideId; action: BattleAction }[] = [];

    for (const [id, action] of [['player', playerAction], ['foe', foeAction]] as const) {
      if (action.kind === 'move') moves.push({ side: id, action });
      else pre.push({ side: id, action });
    }

    for (const p of pre) {
      if (this.over) break;
      this.performNonMove(p.side, p.action);
    }
    if (this.over) return this.drainEvents();

    this.orderMoves(moves);
    for (const m of moves) {
      if (this.over) break;
      const side = this.side(m.side);
      if (side.active.fainted) continue;
      this.performMove(m.side, (m.action as { kind: 'move'; index: number }).index);
      this.checkFaints();
    }

    if (!this.over) this.endOfTurn();
    if (!this.over) this.checkFaints();

    return this.drainEvents();
  }

  private orderMoves(entries: { side: SideId; action: BattleAction }[]): void {
    const priorityOf = (e: { side: SideId; action: BattleAction }): number => {
      const a = e.action as { kind: 'move'; index: number };
      const kin = this.side(e.side).active;
      const slot = kin.moves[a.index];
      return registry.moves.get(slot?.id ?? '')?.priority ?? 0;
    };
    const speedOf = (e: { side: SideId; action: BattleAction }): number => {
      const s = this.side(e.side);
      return effectiveSpeed(s.active.spe, s.stages.spe, s.active.status);
    };
    entries.sort((a, b) => {
      const pa = priorityOf(a), pb = priorityOf(b);
      if (pa !== pb) return pb - pa;
      const sa = speedOf(a), sb = speedOf(b);
      if (sa !== sb) return sb - sa;
      return this.rng.next() < 0.5 ? -1 : 1;
    });
  }

  /* ------------------------------------------------------- non-move acts */

  private performNonMove(id: SideId, action: BattleAction): void {
    switch (action.kind) {
      case 'switch':
        this.doSwitch(id, action.partyIndex);
        break;
      case 'item':
        this.doItem(id, action.item, action.partyIndex);
        break;
      case 'run':
        this.doRun(id);
        break;
    }
  }

  doSwitch(id: SideId, partyIndex: number): boolean {
    const side = this.side(id);
    const target = side.party[partyIndex];
    if (!target || target.fainted || partyIndex === side.activeIndex) return false;

    if (!side.active.fainted) {
      // A trapped kin cannot be recalled.
      if (side.volatiles.has('trapped') && id === 'player') {
        this.msg(`${side.active.name} cannot get away!`);
        return false;
      }
      this.emit({ t: 'withdraw', side: id, kin: side.active });
      this.msg(id === 'player' ? `Come back, ${side.active.name}!` : `${side.trainer?.name ?? 'The opponent'} withdrew ${side.active.name}!`);
    }

    side.resetOnSwitch();
    side.activeIndex = partyIndex;
    side.participants.add(target.uid);
    this.emit({ t: 'sendOut', side: id, kin: target });
    this.msg(id === 'player' ? `Go, ${target.name}!` : `${side.trainer?.name ?? 'The opponent'} sent out ${target.name}!`);
    this.applyEntryHazards(id);
    return true;
  }

  private applyEntryHazards(id: SideId): void {
    const side = this.side(id);
    const kin = side.active;
    if (kin.fainted) return;
    if (side.hazards.grit > 0) {
      const dmg = Math.max(1, Math.floor(kin.maxHp / 8));
      kin.damage(dmg);
      this.emit({ t: 'damage', side: id, kin, amount: dmg, hpAfter: kin.currentHp, effectiveness: 1, critical: false });
      this.msg(`${this.label(id)} is hurt by the loose grit!`);
    }
    if (side.hazards.spikes > 0) {
      const frac = [0, 8, 6, 4][Math.min(3, side.hazards.spikes)]!;
      const dmg = Math.max(1, Math.floor(kin.maxHp / frac));
      kin.damage(dmg);
      this.emit({ t: 'damage', side: id, kin, amount: dmg, hpAfter: kin.currentHp, effectiveness: 1, critical: false });
    }
  }

  private doItem(id: SideId, itemId: string, partyIndex?: number): void {
    const side = this.side(id);
    const item = registry.getItem(itemId);
    if (!item) return;

    if (id === 'player' && this.config.bag && !this.config.bag.has(itemId)) return;

    const target = partyIndex !== undefined ? side.party[partyIndex] : side.active;

    for (const eff of item.effects) {
      if (eff.kind === 'catch') {
        this.tryCapture(itemId, eff.modifier, eff.special);
        return;
      }
    }

    if (!target) return;
    this.emit({ t: 'useItem', side: id, item: itemId, kin: target });
    this.msg(`${side.isPlayer ? 'You' : side.trainer?.name ?? 'The opponent'} used the ${item.name}.`);

    for (const eff of item.effects) {
      switch (eff.kind) {
        case 'healHp': {
          if (target.fainted) break;
          const amount = eff.amount === 'full' ? target.maxHp : eff.amount;
          const healed = target.heal(amount);
          if (healed > 0) {
            this.emit({ t: 'heal', side: id, kin: target, amount: healed, hpAfter: target.currentHp });
            this.msg(`${target.name} recovered ${healed} HP.`);
          } else {
            this.msg('It had no effect.');
          }
          break;
        }
        case 'healStatus': {
          if (target.status === 'none') break;
          if (eff.status === 'all' || eff.status === target.status) {
            const was = target.status;
            target.status = 'none';
            target.statusCounter = 0;
            this.emit({ t: 'statusCured', side: id, kin: target, status: was });
            this.msg(`${target.name} shook it off.`);
          }
          break;
        }
        case 'revive': {
          if (!target.fainted) break;
          target.currentHp = Math.max(1, Math.floor(target.maxHp * eff.fraction));
          target.status = 'none';
          this.emit({ t: 'heal', side: id, kin: target, amount: target.currentHp, hpAfter: target.currentHp });
          this.msg(`${target.name} is back on its feet.`);
          break;
        }
        case 'battleStat': {
          this.changeStat(id, eff.stat, eff.stages, true);
          break;
        }
      }
    }
    if (id === 'player') this.config.bag?.take(itemId, 1);
  }

  private doRun(id: SideId): void {
    if (id !== 'player') return;
    if (this.config.noFlee) {
      this.msg('There is no getting away from this.');
      return;
    }
    if (!this.isWild) {
      this.msg('You cannot run from a trainer battle!');
      return;
    }
    if (this.player.volatiles.has('trapped')) {
      this.msg(`${this.player.active.name} cannot get away!`);
      return;
    }
    this.player.escapeAttempts++;
    const chance = escapeChance(
      effectiveSpeed(this.player.active.spe, this.player.stages.spe, this.player.active.status),
      effectiveSpeed(this.foe.active.spe, this.foe.stages.spe, this.foe.active.status),
      this.player.escapeAttempts,
    );
    if (this.rng.next() < chance) {
      this.emit({ t: 'fleeSuccess' });
      this.msg('You got away safely!');
      this.finish('fled');
    } else {
      this.emit({ t: 'fleeFailed' });
      this.msg('You could not get away!');
    }
  }

  /* -------------------------------------------------------------- capture */

  private tryCapture(itemId: string, modifier: number, special?: string): void {
    if (!this.isWild || this.config.noCapture) {
      this.msg('You cannot use that here.');
      return;
    }
    const target = this.foe.active;
    const item = registry.getItem(itemId);
    this.msg(`You threw the ${item?.name ?? 'vessel'}!`);

    let situational = 1;
    if (special === 'netTypes' && target.types.some((t) => t === 'tide' || t === 'chitin')) situational = 3;

    const res = attemptCapture({
      hpMax: target.maxHp,
      hpCurrent: target.currentHp,
      catchRate: target.data?.catchRate ?? 100,
      ballModifier: modifier,
      status: target.status,
      situationalModifier: situational,
    }, this.rng);

    this.emit({ t: 'throwVessel', item: itemId, shakes: res.shakes, caught: res.caught, kin: target });
    this.config.bag?.take(itemId, 1);

    if (res.caught) {
      this.msg(`${target.name} was caught!`);
      this.finish('caught');
    } else {
      const lines = [
        'It broke free immediately!',
        'Not even close.',
        'So close! It got out.',
        'It almost had it...',
      ];
      this.msg(lines[Math.min(res.shakes, 3)]!);
    }
  }

  /* ----------------------------------------------------------- move logic */

  private performMove(id: SideId, moveIndex: number): void {
    const side = this.side(id);
    const foeId = this.otherId(id);
    const foeSide = this.side(foeId);
    const user = side.active;

    if (user.fainted) return;

    // --- pre-move status gates ---
    if (!this.canAct(id)) return;

    const slot = user.moves[moveIndex];
    if (!slot) return;
    const move = registry.getMove(slot.id);
    if (!move) return;

    if (slot.pp <= 0) {
      this.msg(`${user.name} has no power left for that move!`);
      return;
    }
    slot.pp--;
    side.lastMoveId = move.id;

    this.emit({ t: 'useMove', side: id, kin: user, move });
    this.msg(`${id === 'player' ? user.name : this.label(id)} used ${move.name}!`);

    // Protect-style moves resolve immediately and do not target anyone.
    if (move.effects.some((e) => e.kind === 'protect')) {
      const odds = 1 / Math.pow(2, side.protectStreak);
      if (this.rng.next() < odds) {
        side.volatiles.set('protect', 1);
        side.protectStreak++;
        this.msg(`${user.name} braced itself.`);
      } else {
        side.protectStreak = 0;
        this.msg('But it failed!');
      }
      return;
    }
    side.protectStreak = 0;

    const selfOnly = move.target === 'self' || move.target === 'selfSide' || move.target === 'field';

    if (!selfOnly && foeSide.volatiles.has('protect')) {
      this.msg(`${this.label(foeId)} protected itself!`);
      return;
    }

    if (!selfOnly) {
      const target = foeSide.active;
      const eff = effectiveness(registry.typeChart.chart, move.type, target.types);
      if (eff === 0 && move.category !== 'status') {
        this.emit({ t: 'noEffect', side: foeId, kin: target });
        this.msg(`It has no effect on ${this.label(foeId)}...`);
        return;
      }
      if (!this.rollAccuracy(id, foeId, move)) {
        this.emit({ t: 'miss', side: id, kin: user });
        this.emit({ t: 'sfx', id: 'miss' });
        this.msg(`${user.name}'s attack missed!`);
        this.applyCrashOnMiss(id, move);
        return;
      }
    }

    if (move.category === 'status') {
      this.applyEffects(id, foeId, move, 0, true);
      return;
    }

    // --- damage ---
    const target = foeSide.active;
    const multi = move.effects.find((e) => e.kind === 'multiHit') as Extract<MoveEffect, { kind: 'multiHit' }> | undefined;
    const hits = multi
      ? (user.ability === 'swarming' ? multi.max : this.rollMultiHit(multi.min, multi.max))
      : 1;

    let totalDamage = 0;
    let lastEff = 1;
    let anyCrit = false;

    for (let i = 0; i < hits; i++) {
      if (target.fainted) break;
      const critStageBonus = move.effects.find((e) => e.kind === 'highCrit') as Extract<MoveEffect, { kind: 'highCrit' }> | undefined;
      const critStage = (critStageBonus?.stages ?? 0) + (side.volatiles.has('focusEnergy') ? 2 : 0);
      const crit = rollCrit(critStage, this.rng);
      anyCrit = anyCrit || crit;

      const physical = move.category === 'physical';
      const res = calcDamage({
        level: user.level,
        power: move.power,
        category: move.category,
        moveType: move.type,
        attackerTypes: user.types,
        defenderTypes: target.types,
        attackStat: physical ? user.atk : user.spa,
        defenseStat: physical ? target.def : target.spd,
        attackStage: physical ? side.stages.atk : side.stages.spa,
        defenseStage: physical ? foeSide.stages.def : foeSide.stages.spd,
        chart: registry.typeChart.chart,
        isCritical: crit,
        attackerStatus: user.status,
        screenActive: physical ? foeSide.screens.physical > 0 : foeSide.screens.special > 0,
        weather: this.weather,
      }, this.rng);

      lastEff = res.effectiveness;
      const dealt = target.damage(res.damage);
      totalDamage += dealt;
      this.emit({
        t: 'damage', side: foeId, kin: target, amount: dealt,
        hpAfter: target.currentHp, effectiveness: res.effectiveness, critical: crit,
      });
    }

    if (hits > 1) this.msg(`It hit ${hits} times!`);
    if (anyCrit) {
      this.emit({ t: 'sfx', id: 'crit' });
      this.msg('A critical hit!');
    }
    const effMsg = effectivenessMessage(lastEff, this.label(foeId));
    if (effMsg) this.msg(effMsg);

    this.applyContactEffects(id, foeId, move);
    this.applyEffects(id, foeId, move, totalDamage, false);
  }

  private rollMultiHit(min: number, max: number): number {
    // 2 and 3 hits are common, 4 and 5 rare: the classic weighting.
    if (min === 2 && max === 5) {
      const r = this.rng.below(8);
      if (r < 3) return 2;
      if (r < 6) return 3;
      if (r < 7) return 4;
      return 5;
    }
    return this.rng.int(min, max);
  }

  private rollAccuracy(id: SideId, foeId: SideId, move: MoveData): boolean {
    const side = this.side(id);
    const foeSide = this.side(foeId);
    let weatherMod = 1;
    if (this.weather === 'fog') weatherMod = 0.8;
    if (move.type === 'spark' && (this.weather === 'rain' || this.weather === 'storm') &&
        side.active.ability === 'stormborn') {
      return true;
    }
    return accuracyCheck({
      moveAccuracy: move.accuracy,
      accuracyStage: side.stages.acc,
      evasionStage: foeSide.stages.eva,
      weatherModifier: weatherMod,
    }, this.rng);
  }

  private applyCrashOnMiss(id: SideId, move: MoveData): void {
    const crash = move.effects.find((e) => e.kind === 'crashOnMiss') as Extract<MoveEffect, { kind: 'crashOnMiss' }> | undefined;
    if (!crash) return;
    const user = this.side(id).active;
    const dmg = Math.max(1, Math.floor(user.maxHp * crash.fraction));
    user.damage(dmg);
    this.emit({ t: 'damage', side: id, kin: user, amount: dmg, hpAfter: user.currentHp, effectiveness: 1, critical: false });
    this.msg(`${user.name} kept going and crashed!`);
  }

  private applyContactEffects(id: SideId, foeId: SideId, move: MoveData): void {
    if (!move.contact) return;
    const attacker = this.side(id).active;
    const defender = this.side(foeId).active;
    if (defender.fainted || attacker.fainted) return;

    if (defender.ability === 'thornskin') {
      const dmg = Math.max(1, Math.floor(attacker.maxHp / 8));
      attacker.damage(dmg);
      this.emit({ t: 'damage', side: id, kin: attacker, amount: dmg, hpAfter: attacker.currentHp, effectiveness: 1, critical: false });
      this.msg(`${attacker.name} was pricked by Thornskin!`);
    }
    if (defender.ability === 'staticcling' && attacker.status === 'none' && this.rng.chance(30)) {
      this.setStatus(id, 'paralysis');
    }
  }

  /* ------------------------------------------------------------- effects */

  private applyEffects(id: SideId, foeId: SideId, move: MoveData, damageDealt: number, isStatusMove: boolean): void {
    const side = this.side(id);
    const foeSide = this.side(foeId);
    const user = side.active;
    const target = foeSide.active;

    // Short Fuse doubles secondary chances.
    const chanceScale = user.ability === 'shortfuse' ? 2 : 1;

    for (const eff of move.effects) {
      switch (eff.kind) {
        case 'status': {
          const targetId = (eff.target === 'self') ? id : foeId;
          const victim = this.side(targetId).active;
          if (victim.fainted) break;
          const chance = Math.min(100, eff.chance * (eff.chance < 100 ? chanceScale : 1));
          if (this.rng.chance(chance)) this.setStatus(targetId, eff.status);
          break;
        }
        case 'volatile': {
          const targetId = (eff.target === 'self') ? id : foeId;
          const chance = Math.min(100, eff.chance * (eff.chance < 100 ? chanceScale : 1));
          if (this.rng.chance(chance)) this.setVolatile(targetId, eff.volatile, eff.turns ?? 3);
          break;
        }
        case 'flinch': {
          if (this.rng.chance(Math.min(100, eff.chance * chanceScale))) {
            this.setVolatile(foeId, 'flinch', 1);
          }
          break;
        }
        case 'statChange': {
          const targetId = (eff.target === 'self' || eff.target === 'selfSide') ? id : foeId;
          if (this.side(targetId).active.fainted) break;
          const chance = Math.min(100, eff.chance * (eff.chance < 100 ? chanceScale : 1));
          if (this.rng.chance(chance)) {
            this.changeStat(targetId, eff.stat, eff.stages, isStatusMove);
          }
          break;
        }
        case 'heal': {
          const amount = Math.floor(user.maxHp * eff.fraction);
          const healed = user.heal(amount);
          if (healed > 0) {
            this.emit({ t: 'heal', side: id, kin: user, amount: healed, hpAfter: user.currentHp });
            this.msg(`${user.name} recovered.`);
          } else {
            this.msg('But it failed!');
          }
          break;
        }
        case 'drain': {
          if (damageDealt <= 0) break;
          const healed = user.heal(Math.max(1, Math.floor(damageDealt * eff.fraction)));
          if (healed > 0) {
            this.emit({ t: 'heal', side: id, kin: user, amount: healed, hpAfter: user.currentHp });
            this.msg(`${user.name} drained the difference.`);
          }
          break;
        }
        case 'recoil': {
          if (damageDealt <= 0) break;
          const dmg = Math.max(1, Math.floor(damageDealt * eff.fraction));
          user.damage(dmg);
          this.emit({ t: 'damage', side: id, kin: user, amount: dmg, hpAfter: user.currentHp, effectiveness: 1, critical: false });
          this.msg(`${user.name} took the impact too.`);
          break;
        }
        case 'weather': {
          this.setWeather(eff.weather, eff.turns);
          break;
        }
        case 'screen': {
          const s = this.side(id);
          if (eff.screen === 'physical') s.screens.physical = eff.turns;
          else s.screens.special = eff.turns;
          this.msg(eff.screen === 'physical'
            ? 'A hard shield settles over the party.'
            : 'A shimmering wall settles over the party.');
          break;
        }
        case 'hazard': {
          const s = this.side(foeId);
          s.hazards[eff.hazard] = Math.min(3, s.hazards[eff.hazard] + eff.layers);
          this.msg('The ground on the far side is treacherous now.');
          break;
        }
        case 'cureParty': {
          let any = false;
          for (const k of side.party) {
            if (k.status !== 'none' && (eff.status === 'all' || k.status === eff.status)) {
              const was = k.status;
              k.status = 'none';
              k.statusCounter = 0;
              this.emit({ t: 'statusCured', side: id, kin: k, status: was });
              any = true;
            }
          }
          this.msg(any ? 'The whole party steadied.' : 'But it failed!');
          break;
        }
        case 'trap': {
          const turns = this.rng.int(eff.minTurns, eff.maxTurns) + (user.ability === 'gripjaw' ? 2 : 0);
          this.setVolatile(foeId, 'trapped', turns);
          break;
        }
        case 'forceSwitch': {
          this.forceSwitch(foeId);
          break;
        }
        case 'fixedDamage': {
          if (target.fainted) break;
          const dealt = target.damage(eff.amount);
          this.emit({ t: 'damage', side: foeId, kin: target, amount: dealt, hpAfter: target.currentHp, effectiveness: 1, critical: false });
          break;
        }
        case 'levelDamage': {
          if (target.fainted) break;
          const dealt = target.damage(user.level);
          this.emit({ t: 'damage', side: foeId, kin: target, amount: dealt, hpAfter: target.currentHp, effectiveness: 1, critical: false });
          break;
        }
      }
    }
  }

  private forceSwitch(id: SideId): void {
    const side = this.side(id);
    if (side.active.ability === 'deeproot' || side.active.ability === 'stonebound') {
      this.msg(`${this.label(id)} would not budge.`);
      return;
    }
    const options = side.party
      .map((k, i) => ({ k, i }))
      .filter((e) => !e.k.fainted && e.i !== side.activeIndex);
    if (options.length === 0) {
      if (this.isWild && id === 'foe') {
        this.msg(`${this.label(id)} fled!`);
        this.finish('foeFled');
      }
      return;
    }
    const pick = this.rng.pick(options);
    this.doSwitch(id, pick.i);
  }

  /* -------------------------------------------------------------- status */

  setStatus(id: SideId, status: StatusId): boolean {
    const side = this.side(id);
    const kin = side.active;
    if (kin.fainted || status === 'none') return false;
    if (kin.status !== 'none') {
      return false;
    }
    // Type immunities to their own status.
    if (status === 'burn' && kin.types.includes('flame')) return false;
    if (status === 'freeze' && kin.types.includes('frost')) return false;
    if ((status === 'poison' || status === 'toxic') &&
        (kin.types.includes('venom') || kin.types.includes('iron'))) return false;
    if (status === 'paralysis' && kin.types.includes('spark')) return false;

    kin.status = status;
    kin.statusCounter = status === 'sleep' ? this.rng.int(1, 3) : (status === 'toxic' ? 1 : 0);
    this.emit({ t: 'status', side: id, kin, status });
    this.msg(this.statusMessage(id, status));
    return true;
  }

  private statusMessage(id: SideId, status: StatusId): string {
    const n = this.label(id);
    switch (status) {
      case 'burn': return `${n} was burned!`;
      case 'freeze': return `${n} froze solid!`;
      case 'paralysis': return `${n} is paralysed! It may not move.`;
      case 'poison': return `${n} was poisoned!`;
      case 'toxic': return `${n} was badly poisoned!`;
      case 'sleep': return `${n} fell asleep!`;
      default: return '';
    }
  }

  setVolatile(id: SideId, volatile: VolatileId, turns: number): void {
    const side = this.side(id);
    if (side.active.fainted) return;
    if (volatile === 'confusion' && side.active.ability === 'stillwater') return;
    if (side.volatiles.has(volatile) && volatile !== 'flinch') return;
    side.volatiles.set(volatile, turns);
    this.emit({ t: 'volatile', side: id, kin: side.active, volatile, on: true });
    if (volatile === 'confusion') this.msg(`${this.label(id)} became confused!`);
    if (volatile === 'trapped') this.msg(`${this.label(id)} cannot escape!`);
  }

  changeStat(id: SideId, stat: BattleStatKey, delta: number, announce: boolean): void {
    const side = this.side(id);
    const kin = side.active;
    if (kin.fainted) return;
    if (stat === 'acc' && delta < 0 && kin.ability === 'keeneye') {
      this.msg(`${kin.name}'s Keen Eye held steady.`);
      return;
    }
    const before = side.stages[stat];
    const after = clampStage(before + delta);
    if (after === before) {
      this.emit({ t: 'sfx', id: 'denied' });
      this.emit({ t: 'statChange', side: id, kin, stat, delta: 0, failed: true });
      this.msg(delta > 0
        ? `${this.label(id)}'s ${statName(stat)} will not go any higher!`
        : `${this.label(id)}'s ${statName(stat)} will not go any lower!`);
      return;
    }
    side.stages[stat] = after;
    this.emit({ t: 'sfx', id: after > before ? 'stat_up' : 'stat_down' });
    this.emit({ t: 'statChange', side: id, kin, stat, delta: after - before });
    if (announce || true) {
      const amount = Math.abs(after - before);
      const word = amount >= 2 ? 'sharply ' : '';
      this.msg(delta > 0
        ? `${this.label(id)}'s ${statName(stat)} ${word}rose!`
        : `${this.label(id)}'s ${statName(stat)} ${word}fell!`);
    }
  }

  private setWeather(weather: WeatherId, turns: number): void {
    if (this.weather === weather) {
      this.msg('But it failed!');
      return;
    }
    this.weather = weather;
    this.weatherTurns = turns;
    this.emit({ t: 'weather', weather, starting: true });
    this.msg(weatherMessage(weather));
  }

  /* ----------------------------------------------------------- can act? */

  private canAct(id: SideId): boolean {
    const side = this.side(id);
    const kin = side.active;

    if (side.volatiles.has('flinch')) {
      side.volatiles.delete('flinch');
      this.msg(`${this.label(id)} flinched and could not move!`);
      return false;
    }

    if (kin.status === 'freeze') {
      if (this.rng.chance(20)) {
        kin.status = 'none';
        this.emit({ t: 'statusCured', side: id, kin, status: 'freeze' });
        this.msg(`${this.label(id)} thawed out!`);
      } else {
        this.msg(`${this.label(id)} is frozen solid!`);
        return false;
      }
    }

    if (kin.status === 'sleep') {
      kin.statusCounter--;
      if (kin.statusCounter <= 0) {
        kin.status = 'none';
        this.emit({ t: 'statusCured', side: id, kin, status: 'sleep' });
        this.msg(`${this.label(id)} woke up!`);
      } else {
        this.msg(`${this.label(id)} is fast asleep.`);
        return false;
      }
    }

    if (kin.status === 'paralysis' && this.rng.chance(25)) {
      this.msg(`${this.label(id)} is paralysed and could not move!`);
      return false;
    }

    const conf = side.volatiles.get('confusion');
    if (conf !== undefined) {
      if (conf <= 0) {
        side.volatiles.delete('confusion');
        this.msg(`${this.label(id)} snapped out of its confusion.`);
      } else {
        side.volatiles.set('confusion', conf - 1);
        this.msg(`${this.label(id)} is confused!`);
        if (this.rng.chance(33)) {
          // Self-hit uses a typeless 40-power physical calculation.
          const res = calcDamage({
            level: kin.level, power: 40, category: 'physical',
            moveType: 'beast', attackerTypes: [], defenderTypes: [],
            attackStat: kin.atk, defenseStat: kin.def,
            attackStage: side.stages.atk, defenseStage: side.stages.def,
            chart: {}, isCritical: false,
          }, this.rng);
          const dealt = kin.damage(res.damage);
          this.emit({ t: 'damage', side: id, kin, amount: dealt, hpAfter: kin.currentHp, effectiveness: 1, critical: false });
          this.msg('It hurt itself in its confusion!');
          return false;
        }
      }
    }

    return true;
  }

  /* -------------------------------------------------------- end of turn */

  private endOfTurn(): void {
    // Protect only lasts the turn it was used.
    this.player.volatiles.delete('protect');
    this.foe.volatiles.delete('protect');

    for (const id of ['player', 'foe'] as SideId[]) {
      const side = this.side(id);
      const kin = side.active;
      if (kin.fainted) continue;

      if (kin.status === 'burn') {
        const dmg = Math.max(1, Math.floor(kin.maxHp / 16));
        kin.damage(dmg);
        this.emit({ t: 'damage', side: id, kin, amount: dmg, hpAfter: kin.currentHp, effectiveness: 1, critical: false });
        this.msg(`${this.label(id)} is hurt by its burn.`);
      } else if (kin.status === 'poison') {
        const dmg = Math.max(1, Math.floor(kin.maxHp / 8));
        kin.damage(dmg);
        this.emit({ t: 'damage', side: id, kin, amount: dmg, hpAfter: kin.currentHp, effectiveness: 1, critical: false });
        this.msg(`${this.label(id)} is hurt by poison.`);
      } else if (kin.status === 'toxic') {
        kin.statusCounter = Math.min(15, kin.statusCounter + 1);
        const dmg = Math.max(1, Math.floor((kin.maxHp * kin.statusCounter) / 16));
        kin.damage(dmg);
        this.emit({ t: 'damage', side: id, kin, amount: dmg, hpAfter: kin.currentHp, effectiveness: 1, critical: false });
        this.msg(`${this.label(id)} is getting worse.`);
      }

      const trapped = side.volatiles.get('trapped');
      if (trapped !== undefined) {
        if (trapped <= 1) {
          side.volatiles.delete('trapped');
          this.msg(`${this.label(id)} was freed.`);
        } else {
          side.volatiles.set('trapped', trapped - 1);
          const dmg = Math.max(1, Math.floor(kin.maxHp / 16));
          kin.damage(dmg);
          this.emit({ t: 'damage', side: id, kin, amount: dmg, hpAfter: kin.currentHp, effectiveness: 1, critical: false });
        }
      }

      // Weather chip.
      if (this.weather === 'sandstorm' && kin.ability !== 'gritskin' &&
          !kin.types.some((t) => t === 'stone' || t === 'terra' || t === 'iron')) {
        const dmg = Math.max(1, Math.floor(kin.maxHp / 16));
        kin.damage(dmg);
        this.emit({ t: 'damage', side: id, kin, amount: dmg, hpAfter: kin.currentHp, effectiveness: 1, critical: false });
        this.msg(`${this.label(id)} is battered by the sandstorm.`);
      }
    }

    for (const side of [this.player, this.foe]) {
      if (side.screens.physical > 0) side.screens.physical--;
      if (side.screens.special > 0) side.screens.special--;
    }

    if (this.weatherTurns > 0 && this.weatherTurns < 9999) {
      this.weatherTurns--;
      if (this.weatherTurns === 0 && this.weather !== 'clear') {
        this.emit({ t: 'weather', weather: 'clear', starting: false });
        this.msg('The weather settled.');
        this.weather = 'clear';
      }
    }
  }

  /* -------------------------------------------------------------- faints */

  /**
   * Announce anything that has just fainted.
   *
   * Called after every move and again at the end of the turn, which is why it
   * has to remember: a kin that faints on the first move of a turn is still
   * the active kin at the end of it -- replacements happen between turns --
   * so the second pass used to announce the same faint again and, worse, award
   * the experience for it a second time.
   */
  private announcedFaints = new Set<Kin>();

  checkFaints(): void {
    for (const id of ['player', 'foe'] as SideId[]) {
      const side = this.side(id);
      const kin = side.active;
      if (!kin.fainted) { this.announcedFaints.delete(kin); continue; }
      if (this.announcedFaints.has(kin)) continue;
      this.announcedFaints.add(kin);
      this.emit({ t: 'faint', side: id, kin });
      this.msg(`${this.label(id, kin)} fainted!`);

      if (id === 'foe') this.awardExp(kin);

      if (!side.hasUsableKin) {
        this.finish(id === 'foe' ? 'win' : 'loss');
        return;
      }
    }
  }

  /** True when the player must choose a replacement before the next turn. */
  get awaitingPlayerReplacement(): boolean {
    return !this.over && this.player.active.fainted && this.player.hasUsableKin;
  }

  get awaitingFoeReplacement(): boolean {
    return !this.over && this.foe.active.fainted && this.foe.hasUsableKin;
  }

  /** Send out the AI's next kin after a faint. */
  sendNextFoe(): BattleEvent[] {
    if (!this.foe.active.fainted) return [];
    const idx = this.foe.firstUsableIndex();
    if (idx < 0) return this.drainEvents();
    this.foe.resetOnSwitch();
    this.foe.activeIndex = idx;
    this.foe.participants.add(this.foe.active.uid);
    this.emit({ t: 'sendOut', side: 'foe', kin: this.foe.active });
    this.msg(this.isWild
      ? `Another ${this.foe.active.name} appeared!`
      : `${this.foe.trainer?.name ?? 'The opponent'} sent out ${this.foe.active.name}!`);
    this.applyEntryHazards('foe');
    return this.drainEvents();
  }

  private awardExp(defeated: Kin): void {
    const participants = this.player.party.filter(
      (k) => !k.fainted && this.player.participants.has(k.uid),
    );
    const share = participants.length || 1;
    for (const k of participants) {
      const amount = expGain({
        baseExp: defeated.data?.baseExp ?? 60,
        defeatedLevel: defeated.level,
        participants: share,
        fromTrainer: !this.isWild,
        outsider: k.originalTrainer !== undefined && k.originalTrainer !== 'player',
      });
      const before = k.level;
      this.emit({ t: 'expGain', kin: k, amount });
      this.msg(`${k.name} gained ${amount} EXP.`);
      const res = k.gainExp(amount);
      k.gainEvs(defeated.data?.evYield ?? {});
      for (const lvl of res.levels) {
        this.emit({ t: 'levelUp', kin: k, level: lvl });
        this.msg(`${k.name} grew to level ${lvl}!`);
      }
      for (const l of res.learned) {
        this.emit({ t: 'learnMove', kin: k, move: l.move });
      }
      if (res.levels.length > 0) {
        const evo = k.checkEvolution({ trigger: 'levelUp' });
        if (evo) this.emit({ t: 'evolutionReady', kin: k, into: evo.to });
      }
      void before;
    }
    // A new opponent means a fresh participant list.
    this.player.participants.clear();
    if (!this.player.active.fainted) this.player.participants.add(this.player.active.uid);
  }

  /* --------------------------------------------------------------- close */

  private finish(result: BattleResult): void {
    if (this.over) return;
    this.over = true;
    this.result = result;

    if (result === 'win' && this.foe.trainer) {
      const highest = Math.max(...this.foe.party.map((k) => k.level));
      this.prize = prizeMoney(this.foe.trainer.payout, highest);
      for (const line of this.foe.trainer.defeat) this.msg(line);
      this.msg(`You received ${this.prize} marks.`);
    }
    if (result === 'loss' && this.foe.trainer) {
      for (const line of this.foe.trainer.victory) this.msg(line);
    }
    this.emit({ t: 'end', result });
  }

  /** Called by the scene when the player has no kin left. */
  forceLoss(): BattleEvent[] {
    this.finish('loss');
    return this.drainEvents();
  }
}

function statName(stat: BattleStatKey): string {
  switch (stat) {
    case 'atk': return 'Attack';
    case 'def': return 'Defence';
    case 'spa': return 'Special Attack';
    case 'spd': return 'Special Defence';
    case 'spe': return 'Speed';
    case 'acc': return 'accuracy';
    case 'eva': return 'evasiveness';
  }
}

function weatherMessage(w: WeatherId): string {
  switch (w) {
    case 'rain': return 'Rain began to fall.';
    case 'heavyRain': return 'A downpour opened up.';
    case 'storm': return 'The sky turned over.';
    case 'sun': return 'The light turned harsh.';
    case 'harshSun': return 'The air went white with heat.';
    case 'sandstorm': return 'A sandstorm whipped up.';
    case 'snow': return 'Snow started falling.';
    case 'fog': return 'Fog rolled in.';
    default: return 'The weather cleared.';
  }
}

export { statusCaptureBonus, type TypeId };
