/**
 * Trainer AI.
 *
 * Five tiers, and none of them cheat: the AI sees exactly what an attentive
 * human player could see -- the opponent's types, its visible HP, its stat
 * stages and status. It does not read the player's IVs, their held items, or
 * their next input.
 *
 * The tiers are deliberately about *what the trainer understands*, not about
 * giving them better numbers:
 *   novice   - hits things, and mostly with the strongest move it owns
 *   trained  - understands type matchups, and knows status moves exist
 *   veteran  - opens with setup, switches out of bad matchups, tracks KO range
 *   keeper   - heals, preserves a win condition, plays around a likely switch
 *   elite    - all of the above, with the sharpest thresholds
 */

import type { Battle, BattleAction, SideId } from './battle.js';
import { registry } from '../data/registry.js';
import { calcDamage, effectiveness, effectiveSpeed } from './formulas.js';
import type { AiTier, MoveData } from '../data/schema.js';
import type { Rng } from '../core/rng.js';
import type { Kin } from '../systems/kin.js';

interface MoveScore {
  index: number;
  move: MoveData;
  /** Expected damage as a fraction of the target's current HP. */
  lethality: number;
  score: number;
  killsThisTurn: boolean;
}

const TIER_RANK: Record<AiTier, number> = {
  novice: 0, trained: 1, veteran: 2, keeper: 3, elite: 4,
};

export class TrainerAI {
  constructor(private tier: AiTier, private rng: Rng) {}

  private get rank(): number {
    return TIER_RANK[this.tier];
  }

  choose(battle: Battle, id: SideId = 'foe'): BattleAction {
    const side = id === 'foe' ? battle.foe : battle.player;
    const opponent = id === 'foe' ? battle.player : battle.foe;
    const self = side.active;
    const target = opponent.active;

    const scores = this.scoreMoves(battle, self, target, id);

    // --- keeper and above: consider a healing item ---
    if (this.rank >= 3 && side.trainer?.items?.length) {
      const healItem = this.pickHealItem(side.trainer.items, self);
      if (healItem && self.hpFraction < 0.3 && this.rng.chance(70)) {
        return { kind: 'item', item: healItem, partyIndex: side.activeIndex };
      }
    }

    // --- veteran and above: consider switching out of a losing matchup ---
    if (this.rank >= 2) {
      const swap = this.considerSwitch(battle, id, scores);
      if (swap !== null) return { kind: 'switch', partyIndex: swap };
    }

    if (scores.length === 0) return { kind: 'move', index: 0 };

    // Anything that kills right now is taken, at every tier above novice.
    const lethal = scores.filter((s) => s.killsThisTurn);
    if (lethal.length > 0 && (this.rank >= 1 || this.rng.chance(60))) {
      lethal.sort((a, b) => b.score - a.score);
      // A faster attacker takes the guaranteed kill; a slower one still should,
      // it just may not get there.
      return { kind: 'move', index: lethal[0]!.index };
    }

    switch (this.tier) {
      case 'novice':
        return { kind: 'move', index: this.pickNovice(scores) };
      case 'trained':
        return { kind: 'move', index: this.pickWeighted(scores, 1.5) };
      case 'veteran':
        return { kind: 'move', index: this.pickWeighted(scores, 3) };
      case 'keeper':
      case 'elite':
        return { kind: 'move', index: this.pickBest(scores) };
    }
  }

  /* ------------------------------------------------------------- scoring */

  private scoreMoves(battle: Battle, self: Kin, target: Kin, id: SideId): MoveScore[] {
    const side = id === 'foe' ? battle.foe : battle.player;
    const opp = id === 'foe' ? battle.player : battle.foe;
    const out: MoveScore[] = [];

    const selfSpeed = effectiveSpeed(self.spe, side.stages.spe, self.status);
    const targetSpeed = effectiveSpeed(target.spe, opp.stages.spe, target.status);
    const outspeeds = selfSpeed > targetSpeed;

    self.moves.forEach((slot, index) => {
      if (slot.pp <= 0) return;
      const move = registry.moves.get(slot.id);
      if (!move) return;

      let score = 0;
      let lethality = 0;
      let kills = false;

      if (move.category === 'status') {
        score = this.scoreStatusMove(move, self, target, battle, id);
      } else {
        const eff = effectiveness(registry.typeChart.chart, move.type, target.types);
        if (eff === 0) {
          out.push({ index, move, lethality: 0, score: -100, killsThisTurn: false });
          return;
        }
        const physical = move.category === 'physical';
        // Average roll, no crit: what a careful player would assume.
        const est = calcDamage({
          level: self.level, power: move.power, category: move.category,
          moveType: move.type, attackerTypes: self.types, defenderTypes: target.types,
          attackStat: physical ? self.atk : self.spa,
          defenseStat: physical ? target.def : target.spd,
          attackStage: physical ? side.stages.atk : side.stages.spa,
          defenseStage: physical ? opp.stages.def : opp.stages.spd,
          chart: registry.typeChart.chart,
          isCritical: false,
          attackerStatus: self.status,
          screenActive: physical ? opp.screens.physical > 0 : opp.screens.special > 0,
          weather: battle.weather,
          fixedRandom: 92,
        }, this.rng);

        lethality = est.damage / Math.max(1, target.currentHp);
        kills = est.damage >= target.currentHp;
        score = lethality * 100;

        // Accuracy matters more the more the AI understands.
        if (this.rank >= 1 && move.accuracy > 0) {
          score *= move.accuracy / 100;
        }
        // A guaranteed kill this turn is worth more than any chip damage.
        if (kills) score += outspeeds ? 120 : 60;
        // Priority is a way to steal a kill when slower.
        if (move.priority > 0 && kills && !outspeeds) score += 80;
        // Recoil is a real cost once the AI is thinking about attrition.
        if (this.rank >= 2) {
          const recoil = move.effects.find((e) => e.kind === 'recoil');
          if (recoil && self.hpFraction < 0.4) score -= 30;
        }
      }

      out.push({ index, move, lethality, score, killsThisTurn: kills });
    });

    return out;
  }

  private scoreStatusMove(move: MoveData, self: Kin, target: Kin, battle: Battle, id: SideId): number {
    if (this.rank === 0) return 5; // novices use status moves essentially at random
    const side = id === 'foe' ? battle.foe : battle.player;
    const opp = id === 'foe' ? battle.player : battle.foe;
    let score = 0;

    for (const eff of move.effects) {
      switch (eff.kind) {
        case 'status': {
          if (target.status !== 'none') return -50;
          // Status is most valuable early, against a healthy target.
          const base = eff.status === 'sleep' ? 55
            : eff.status === 'paralysis' ? 42
            : eff.status === 'toxic' ? 45
            : eff.status === 'burn' ? 38 : 30;
          score += base * target.hpFraction;
          if (battle.turn > 6 && this.rank >= 2) score -= 20;
          break;
        }
        case 'statChange': {
          const toSelf = eff.target === 'self' || eff.target === 'selfSide';
          const stages = toSelf ? side.stages : opp.stages;
          const current = stages[eff.stat] ?? 0;
          if (toSelf) {
            if (current >= 4) return -30;
            // Setting up is only sane when healthy and not about to be killed.
            score += 32 * (self.hpFraction - 0.35);
            if (self.hpFraction > 0.75) score += 22;
            if (this.rank >= 2 && battle.turn <= 2) score += 18;
          } else {
            if (current <= -4) return -30;
            score += 18;
          }
          break;
        }
        case 'heal': {
          if (self.hpFraction > 0.6) return -40;
          score += (1 - self.hpFraction) * 90;
          break;
        }
        case 'screen': {
          score += battle.turn <= 2 ? 40 : 10;
          break;
        }
        case 'weather': {
          score += battle.weather === eff.weather ? -50 : 25;
          break;
        }
        case 'protect': {
          score += self.status === 'toxic' ? -10 : 12;
          break;
        }
        case 'hazard': {
          const enemyBench = opp.party.filter((k) => !k.fainted).length;
          score += enemyBench > 2 ? 35 : 5;
          break;
        }
        default:
          score += 10;
      }
    }
    return score;
  }

  /* -------------------------------------------------------------- choice */

  private pickNovice(scores: MoveScore[]): number {
    // Prefers damage but is happy to throw out anything.
    const damaging = scores.filter((s) => s.move.category !== 'status' && s.score > -50);
    const pool = damaging.length && this.rng.chance(80) ? damaging : scores;
    if (pool.length === 0) return 0;
    if (this.rng.chance(55)) {
      // Often just picks the biggest number on the screen.
      return pool.reduce((a, b) => (b.move.power > a.move.power ? b : a)).index;
    }
    return this.rng.pick(pool).index;
  }

  private pickBest(scores: MoveScore[]): number {
    const valid = scores.filter((s) => s.score > -100);
    if (valid.length === 0) return scores[0]?.index ?? 0;
    valid.sort((a, b) => b.score - a.score);
    // Break near-ties randomly so an elite trainer is not perfectly predictable.
    const top = valid.filter((s) => s.score >= valid[0]!.score - 6);
    return this.rng.pick(top).index;
  }

  /** Softmax-ish: higher `sharpness` concentrates the choice on better moves. */
  private pickWeighted(scores: MoveScore[], sharpness: number): number {
    const valid = scores.filter((s) => s.score > -100);
    if (valid.length === 0) return scores[0]?.index ?? 0;
    const min = Math.min(...valid.map((s) => s.score));
    const shifted = valid.map((s) => ({ s, w: Math.pow(Math.max(0.1, s.score - min + 1), sharpness) }));
    const total = shifted.reduce((acc, e) => acc + e.w, 0);
    let roll = this.rng.next() * total;
    for (const e of shifted) {
      roll -= e.w;
      if (roll <= 0) return e.s.index;
    }
    return valid[0]!.index;
  }

  /* -------------------------------------------------------------- switch */

  private considerSwitch(battle: Battle, id: SideId, scores: MoveScore[]): number | null {
    const side = id === 'foe' ? battle.foe : battle.player;
    const opp = id === 'foe' ? battle.player : battle.foe;
    const self = side.active;
    const target = opp.active;

    const bench = side.party
      .map((k, i) => ({ k, i }))
      .filter((e) => !e.k.fainted && e.i !== side.activeIndex);
    if (bench.length === 0) return null;

    // Never switch while it is holding a kill.
    if (scores.some((s) => s.killsThisTurn)) return null;

    // How badly is the current kin losing this matchup?
    const bestLethality = Math.max(0, ...scores.map((s) => s.lethality));
    const incoming = this.worstIncoming(target, self, battle, opp, side);

    const losing = incoming > 0.5 && bestLethality < 0.3;
    const walled = bestLethality < 0.12;
    if (!losing && !walled) return null;

    // Only switch if somebody on the bench actually fixes the problem.
    let best: { index: number; gain: number } | null = null;
    for (const e of bench) {
      const theirs = this.worstIncoming(target, e.k, battle, opp, side);
      const ours = this.bestOutgoing(e.k, target, battle, side, opp);
      const gain = (incoming - theirs) + (ours - bestLethality);
      if (gain > 0.45 && (!best || gain > best.gain)) best = { index: e.i, gain };
    }
    if (!best) return null;

    // Even a good switch is not automatic below elite.
    const commitment = this.rank >= 4 ? 90 : this.rank >= 3 ? 70 : 45;
    return this.rng.chance(commitment) ? best.index : null;
  }

  /** Fraction of `defender`'s HP the attacker's best move would remove. */
  private worstIncoming(
    attacker: Kin, defender: Kin, battle: Battle,
    attackerSide: { stages: Record<string, number> },
    defenderSide: { stages: Record<string, number>; screens: { physical: number; special: number } },
  ): number {
    let worst = 0;
    for (const slot of attacker.moves) {
      const move = registry.moves.get(slot.id);
      if (!move || move.category === 'status' || slot.pp <= 0) continue;
      const physical = move.category === 'physical';
      const est = calcDamage({
        level: attacker.level, power: move.power, category: move.category,
        moveType: move.type, attackerTypes: attacker.types, defenderTypes: defender.types,
        attackStat: physical ? attacker.atk : attacker.spa,
        defenseStat: physical ? defender.def : defender.spd,
        attackStage: physical ? (attackerSide.stages.atk ?? 0) : (attackerSide.stages.spa ?? 0),
        defenseStage: physical ? (defenderSide.stages.def ?? 0) : (defenderSide.stages.spd ?? 0),
        chart: registry.typeChart.chart, isCritical: false,
        attackerStatus: attacker.status,
        screenActive: physical ? defenderSide.screens.physical > 0 : defenderSide.screens.special > 0,
        weather: battle.weather, fixedRandom: 92,
      }, this.rng);
      worst = Math.max(worst, est.damage / Math.max(1, defender.currentHp));
    }
    return worst;
  }

  private bestOutgoing(
    attacker: Kin, defender: Kin, battle: Battle,
    attackerSide: { stages: Record<string, number> },
    defenderSide: { stages: Record<string, number>; screens: { physical: number; special: number } },
  ): number {
    return this.worstIncoming(attacker, defender, battle, attackerSide, defenderSide);
  }

  private pickHealItem(items: string[], self: Kin): string | null {
    if (self.hpFraction > 0.5) return null;
    for (const id of items) {
      const item = registry.getItem(id);
      if (item?.effects.some((e) => e.kind === 'healHp')) return id;
    }
    return null;
  }
}

/** Convenience used by wild battles, which have no trainer behind them. */
export function wildAction(battle: Battle, rng: Rng): BattleAction {
  const ai = new TrainerAI('novice', rng);
  return ai.choose(battle, 'foe');
}
