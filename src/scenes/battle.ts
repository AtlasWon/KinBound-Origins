/**
 * Battle scene.
 *
 * Presentation only. The engine resolves a whole turn into BattleEvents; this
 * scene turns that list into an animation queue and plays it back at the speed
 * the player asked for. Nothing here decides what happens in a battle -- which
 * is why "fast text" and "skip animations" are safe settings rather than
 * rule changes.
 */

import type { Game } from '../core/game.js';
import type { Scene } from '../core/scene.js';
import { DETAIL, Renderer, SCREEN_H, SCREEN_W } from '../engine/renderer.js';
import { Battle, type BattleAction, type BattleEvent, type SideId } from '../battle/battle.js';
import { TrainerAI } from '../battle/ai.js';
import { registry } from '../data/registry.js';
import { backSprite, frontSprite, iconSprite, SPRITE_SIZE, whiteSprite } from '../gfx/kinsprite.js';
import { fxTargetsSelf, MoveFx } from '../gfx/movefx.js';
import { ListMenu, type MenuItem } from '../ui/menu.js';
import { battleSpeedScale, textDelayFrames } from '../core/settings.js';
import type { Kin } from '../systems/kin.js';
import type { GameState } from '../systems/state.js';
import type { AiTier, StatusId, TrainerData, TypeId, WeatherId } from '../data/schema.js';
import { expForLevel } from '../battle/formulas.js';
import { audio } from '../audio/audio.js';
import { drawShutters } from '../ui/transition.js';

/**
 * Which sound plays with which move animation. Grouped by feel rather than by
 * type, so a new move inherits something appropriate the moment it picks an
 * animation id.
 */
function sfxForAnim(anim: string): string {
  if (anim.startsWith('flame')) return 'fx_fire';
  if (anim.startsWith('water') || anim === 'dive') return 'fx_water';
  if (anim.startsWith('spark')) return 'fx_spark';
  if (anim.startsWith('frost')) return 'fx_frost';
  if (anim.startsWith('leaf') || anim === 'vine' || anim === 'drain' || anim === 'powder') return 'fx_leaf';
  if (anim.startsWith('earth') || anim.startsWith('rock') || anim === 'hazard') return 'fx_quake';
  if (anim.startsWith('psy')) return 'fx_psy';
  if (anim.startsWith('iron')) return 'fx_iron';
  if (anim.startsWith('dark')) return 'fx_dark';
  if (anim.startsWith('light')) return 'fx_light';
  if (anim.startsWith('spirit')) return 'fx_spirit';
  if (anim.startsWith('venom')) return 'fx_venom';
  if (anim.startsWith('bug')) return 'fx_swarm';
  if (anim === 'wind_small' || anim === 'wing' || anim === 'sky') return 'fx_wind';
  if (anim === 'heal') return 'fx_heal';
  if (anim === 'shield' || anim === 'buff') return 'fx_buff';
  if (anim === 'debuff' || anim === 'status') return 'fx_debuff';
  if (anim === 'weather') return 'fx_weather';
  if (anim === 'charge') return 'fx_charge';
  if (anim === 'punch_heavy' || anim === 'kick_big' || anim === 'grapple') return 'fx_heavy';
  return 'fx_hit';
}

/* ----------------------------------------------------------- layout */

/*
 * Field layout.
 *
 * Pulled apart and pushed outward compared to the first pass. The two
 * combatants used to sit close to the middle with big status panels crowding
 * them, which made a 240x160 field feel like a cupboard. Moving each sprite
 * toward its own corner, shrinking the panels and taking six units off the
 * message box buys back a visible band of open ground between the two
 * creatures -- the empty space is what makes the shot read as a *field* rather
 * than as two portraits side by side.
 */
const FOE_SPRITE = { x: 158, y: 2 };
const PLAYER_SPRITE = { x: 14, y: 40 };
const FOE_PAD = { x: 190, y: 70 };
const PLAYER_PAD = { x: 46, y: 106 };
const FOE_BOX = { x: 6, y: 10, w: 100, h: 28 };
const PLAYER_BOX = { x: 134, y: 68, w: 100, h: 36 };
const MSG = { x: 0, y: 114, w: SCREEN_W, h: SCREEN_H - 114 };

/** Panel palette. Warm off-white with a slate frame, per the reference UI. */
const UI = {
  frame: '#283048',
  fill: '#f8fafe',
  fillDim: '#e4e9f4',
  shade: '#aab4cc',
  ink: '#28304a',
  inkSoft: '#5a6484',
  hpGood: '#48d058',
  hpWarn: '#f0c030',
  hpBad: '#e85048',
  hpBack: '#3c4460',
  exp: '#58c8f0',
} as const;

/* ------------------------------------------------------- animations */

type Anim =
  | { kind: 'text'; text: string; hold: 'input' | 'time'; frames: number }
  | { kind: 'hp'; side: SideId; kin: Kin; from: number; to: number; frames: number; t: number }
  | { kind: 'flash'; side: SideId; frames: number; t: number; effectiveness: number }
  | { kind: 'shake'; side: SideId; frames: number; t: number }
  | { kind: 'faint'; side: SideId; frames: number; t: number }
  | { kind: 'sendOut'; side: SideId; frames: number; t: number }
  | { kind: 'withdraw'; side: SideId; frames: number; t: number }
  | { kind: 'windup'; side: SideId; self: boolean; frames: number; t: number }
  | { kind: 'moveFx'; side: SideId; anim: string; type: TypeId; frames: number; t: number }
  | { kind: 'vessel'; shakes: number; caught: boolean; frames: number; t: number }
  | { kind: 'exp'; kin: Kin; from: number; to: number; frames: number; t: number }
  | { kind: 'weather'; weather: WeatherId; frames: number; t: number }
  | { kind: 'wait'; frames: number; t: number }
  | { kind: 'sfx'; id: string }
  | { kind: 'end' };

type Phase =
  | 'anim' | 'menu' | 'moves' | 'party' | 'bag' | 'forcedSwitch' | 'finished';

/** Per-side presentation state, independent of the simulation. */
interface SideView {
  /** The kin this side is currently *drawing*, which lags the engine's
   *  active kin by exactly one send-out animation. */
  kin: Kin | null;
  /** Fractional on purpose. The meter takes a fraction, so a bar fed from a
   *  whole-HP value steps once per point of damage -- on a thirty HP rookie
   *  that is five buffer pixels a jump, which is a stutter, not a drain. */
  displayHp: number;
  offsetX: number;
  offsetY: number;
  alpha: number;
  flash: number;
  visible: boolean;
  /** Staging offset, positive toward the opponent, with its spring state. */
  dash: number;
  dashV: number;
  dashTo: number;
  /** Breathing clock. Only runs while this side is actually stood there. */
  idleT: number;
}

const NEW_VIEW = (): SideView => ({
  kin: null, displayHp: 0, offsetX: 0, offsetY: 0, alpha: 1, flash: 0, visible: true,
  dash: 0, dashV: 0, dashTo: 0, idleT: 0,
});

export interface BattleSceneOptions {
  state: GameState;
  playerParty: Kin[];
  foeParty: Kin[];
  isWild: boolean;
  trainerId?: string;
  aiTier?: AiTier;
  backdrop?: string;
  weather?: WeatherId;
  noFlee?: boolean;
  noCapture?: boolean;
  /** The challenge lines were already delivered in the field, so the engine
   *  should not repeat them at the top of the battle log. */
  skipIntroLines?: boolean;
  onFinish: (result: string, battle: Battle) => void;
}

export class BattleScene implements Scene {
  readonly name = 'battle';

  private battle!: Battle;
  private ai!: TrainerAI;
  private queue: Anim[] = [];
  /** Whether the beat before the action menu has already been spent. */
  private menuPause = false;
  private current: Anim | null = null;
  private phase: Phase = 'anim';

  private message = '';
  private revealed = 0;
  private revealTimer = 0;

  private actionMenu = new ListMenu<string>([], 4);
  private moveMenu = new ListMenu<number>([], 4);
  private partyMenu = new ListMenu<number>([], 6);
  private bagMenu = new ListMenu<string>([], 5);

  private view: Record<SideId, SideView> = {
    player: NEW_VIEW(),
    foe: NEW_VIEW(),
  };

  private displayExp = 0;
  private vesselState: { shakes: number; caught: boolean; t: number } | null = null;
  private fx = new MoveFx();
  /** Which side is mid-attack, so the lunge is applied to the right sprite. */
  private fxSide: SideId | null = null;
  /** Counts the opening shutters back off the screen. */
  private introWipe = 0;
  private readonly introFrames = 22;
  private ticks = 0;
  /** Frames until the next low-HP beep, or 0 when the party lead is healthy. */
  private lowHpTimer = 0;

  constructor(private opts: BattleSceneOptions) {}

  /* ---------------------------------------------------------- lifecycle */

  enter(game: Game): void {
    const trainer = this.opts.trainerId ? registry.trainers.get(this.opts.trainerId) : undefined;
    this.battle = new Battle({
      playerParty: this.opts.playerParty,
      foeParty: this.opts.foeParty,
      foeTrainer: trainer,
      isWild: this.opts.isWild,
      weather: this.opts.weather,
      noFlee: this.opts.noFlee,
      noCapture: this.opts.noCapture,
      skipIntroLines: this.opts.skipIntroLines,
      seed: `${Date.now()}`,
      bag: {
        has: (item, n = 1) => this.opts.state.hasItem(item, n),
        take: (item, n = 1) => this.opts.state.takeItem(item, n),
      },
    });
    this.ai = new TrainerAI(this.opts.aiTier ?? trainer?.ai ?? 'novice', this.battle.rng);

    this.view.player.kin = this.battle.player.active;
    this.view.foe.kin = this.battle.foe.active;
    this.view.player.displayHp = this.battle.player.active.currentHp;
    this.view.foe.displayHp = this.battle.foe.active.currentHp;
    this.displayExp = this.battle.player.active.exp;

    this.opts.state.markSeen(this.battle.foe.active.species);
    audio.playMusic(this.battleTrack(trainer));

    this.enqueue(this.battle.begin());
    this.buildActionMenu();
    void game;
  }

  /**
   * Which theme this fight gets.
   *
   * A Keeper and a route trainer sharing one piece of music flattens the
   * whole difficulty curve into a single texture. The soundtrack is the
   * first thing that tells a player this one is different, and it says so
   * before the opponent has finished walking on.
   */
  private battleTrack(trainer: TrainerData | undefined): string {
    if (this.opts.isWild) return 'battle_wild';
    if (this.opts.trainerId?.startsWith('perrin')) return 'battle_rival';
    const tier = this.opts.aiTier ?? trainer?.ai;
    if (tier === 'keeper' || tier === 'elite') return 'battle_bastion';
    return 'battle_trainer';
  }

  /* ------------------------------------------------------- event mapping */

  private frames(n: number, game?: Game): number {
    const scale = game ? battleSpeedScale(game.settings.battleSpeed) : 0.6;
    return Math.max(1, Math.round(n * scale));
  }

  /**
   * A line of dialogue and the beat it is held for once it has finished
   * revealing. The hold is authored as time *after* the last character lands,
   * not as a budget the reveal eats into.
   */
  private pushText(text: string, game: Game | undefined, hold = 30): void {
    this.queue.push({ kind: 'text', text, hold: 'time', frames: this.frames(hold, game) });
  }

  /** Turn engine events into presentation steps. */
  private enqueue(events: BattleEvent[], game?: Game): void {
    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      switch (e.t) {
        case 'message':
          this.pushText(e.text, game);
          break;
        case 'sfx':
          this.queue.push({ kind: 'sfx', id: e.id });
          break;
        case 'sendOut':
          this.queue.push({ kind: 'sendOut', side: e.side, frames: this.frames(20, game), t: 0 });
          break;
        case 'withdraw':
          this.queue.push({ kind: 'withdraw', side: e.side, frames: this.frames(14, game), t: 0 });
          break;
        case 'useMove': {
          // The engine emits useMove *before* the line announcing it, so played
          // back in order the sprite lunged while the text was still typing. A
          // turn only reads as a sequence if the name lands first, so the
          // announcement is lifted out of the event list here and the whole
          // performance queued behind it: name, beat, wind-up, move.
          const next = events[i + 1];
          if (next && next.t === 'message') { this.pushText(next.text, game, 38); i++; }
          this.queue.push({ kind: 'wait', frames: this.frames(9, game), t: 0 });
          if (game?.settings.battleAnimations !== false) {
            this.queue.push({
              kind: 'windup', side: e.side, self: fxTargetsSelf(e.move.animation),
              frames: this.frames(12, game), t: 0,
            });
          }
          this.queue.push({
            kind: 'moveFx', side: e.side, anim: e.move.animation,
            type: e.move.type, frames: this.frames(46, game), t: 0,
          });
          // A beat between the move landing and the damage showing. Without it
          // the effect, the flash and the bar all happen on the same frame and
          // the turn reads as one blur.
          this.queue.push({ kind: 'wait', frames: this.frames(10, game), t: 0 });
          break;
        }
        case 'damage': {
          this.queue.push({ kind: 'flash', side: e.side, frames: this.frames(14, game), t: 0, effectiveness: e.effectiveness });
          this.queue.push({ kind: 'wait', frames: this.frames(8, game), t: 0 });
          this.queue.push({
            kind: 'hp', side: e.side, kin: e.kin,
            from: -1, to: e.hpAfter, frames: this.frames(38, game), t: 0,
          });
          this.queue.push({ kind: 'wait', frames: this.frames(12, game), t: 0 });
          break;
        }
        case 'heal': {
          this.queue.push({
            kind: 'hp', side: e.side, kin: e.kin,
            from: -1, to: e.hpAfter, frames: this.frames(26, game), t: 0,
          });
          break;
        }
        case 'faint':
          this.queue.push({ kind: 'wait', frames: this.frames(10, game), t: 0 });
          this.queue.push({ kind: 'faint', side: e.side, frames: this.frames(32, game), t: 0 });
          this.queue.push({ kind: 'wait', frames: this.frames(14, game), t: 0 });
          break;
        case 'throwVessel':
          this.queue.push({
            kind: 'vessel', shakes: e.shakes, caught: e.caught,
            frames: this.frames(30 + e.shakes * 22, game), t: 0,
          });
          break;
        case 'expGain': {
          this.queue.push({
            kind: 'exp', kin: e.kin, from: -1, to: e.kin.exp + e.amount,
            frames: this.frames(34, game), t: 0,
          });
          break;
        }
        case 'weather':
          this.queue.push({ kind: 'weather', weather: e.weather, frames: this.frames(20, game), t: 0 });
          break;
        case 'end':
          this.queue.push({ kind: 'end' });
          break;
        default:
          break;
      }
    }
  }

  /* ------------------------------------------------------------- update */

  update(game: Game, _dt: number): void {
    this.ticks++;
    if (this.introWipe < this.introFrames) this.introWipe++;
    this.fx.update();
    // Hit-stop freezes the whole presentation, not just the particles: a blow
    // that stops the sparks but keeps draining the HP bar reads as a dropped
    // frame rather than as impact.
    if (this.fx.hitStop > 0) return;
    this.lowHpWarning(game);

    for (const side of ['player', 'foe'] as SideId[]) {
      const v = this.view[side];
      if (v.flash > 0) v.flash--;
      this.stageStep(v, game.settings.battleAnimations);
      if (this.breathing(side, game)) v.idleT++;
    }

    if (this.current || this.queue.length > 0) {
      this.phase = this.phase === 'finished' ? 'finished' : 'anim';
      this.advanceAnimation(game);
      return;
    }

    switch (this.phase) {
      case 'anim':
        this.afterAnimations(game);
        break;
      case 'menu':
        this.updateActionMenu(game);
        break;
      case 'moves':
        this.updateMoveMenu(game);
        break;
      case 'party':
        this.updatePartyMenu(game);
        break;
      case 'bag':
        this.updateBagMenu(game);
        break;
      case 'forcedSwitch':
        this.updatePartyMenu(game, true);
        break;
      case 'finished':
        if (game.input.pressed('confirm') || game.input.mouse.leftPressed) {
          game.scenes.pop();
          this.opts.onFinish(this.battle.result ?? 'win', this.battle);
        }
        break;
    }
  }

  /**
   * The red-bar beep. It is the single most useful piece of audio feedback in
   * a battle -- it tells you to act without taking your eyes off the field --
   * so it runs from the displayed HP, not the true HP, and stays in step with
   * the bar draining.
   */
  private lowHpWarning(game: Game): void {
    const v = this.view.player;
    const kin = v.kin;
    const critical = kin && kin.currentHp > 0
      && v.displayHp > 0
      && v.displayHp / kin.maxHp <= 0.2
      && this.battle.result === undefined;

    if (!critical || !game.settings.battleAnimations) { this.lowHpTimer = 0; return; }
    if (this.lowHpTimer > 0) { this.lowHpTimer--; return; }
    audio.playSfx('hp_low', { volume: 0.7 });
    this.lowHpTimer = 34;
  }

  /**
   * Attack staging.
   *
   * Wind-up, drive and recoil are one spring per side rather than three
   * scripted offsets, because the interesting part is the overshoot: letting
   * the target snap back to zero after a lunge produces the recoil for free,
   * and a defender shoved backwards settles instead of teleporting home.
   * Positive is toward the opponent, whichever side that is.
   *
   * It is deliberately under-damped but short: two or three frames of
   * overshoot reads as weight, ten reads as rubber.
   */
  private stageStep(v: SideView, animations: boolean): void {
    if (!animations) { v.dash = 0; v.dashV = 0; v.dashTo = 0; return; }
    v.dashV += (v.dashTo - v.dash) * 0.34;
    v.dashV *= 0.66;
    v.dash += v.dashV;
    if (Math.abs(v.dash - v.dashTo) < 0.04 && Math.abs(v.dashV) < 0.04) {
      v.dash = v.dashTo;
      v.dashV = 0;
    }
  }

  /**
   * Whether a side should be breathing this frame.
   *
   * A kin that is falling, being recalled, arriving, or already at zero is not
   * idling, and neither is anything during hit-stop -- which is free, because
   * update() has already returned by the time this is reached. Freezing the
   * clock rather than the pose means the breath resumes where it left off
   * instead of snapping back to the top of the cycle.
   */
  private breathing(side: SideId, game: Game): boolean {
    if (!game.settings.battleAnimations) return false;
    const v = this.view[side];
    if (!v.visible || v.alpha < 1 || !v.kin || v.kin.currentHp <= 0) return false;
    const a = this.current;
    if (a && (a.kind === 'faint' || a.kind === 'withdraw' || a.kind === 'sendOut') && a.side === side) {
      return false;
    }
    return true;
  }

  /** One press means "get on with it", whatever beat is currently on screen. */
  private skip(game: Game): boolean {
    return game.input.pressed('confirm') || game.input.mouse.leftPressed;
  }

  private advanceAnimation(game: Game): void {
    if (!this.current) {
      this.current = this.queue.shift() ?? null;
      if (!this.current) return;
      this.onAnimStart(this.current, game);
    }
    const a = this.current;
    const skip = this.skip(game);

    switch (a.kind) {
      case 'text': {
        const delay = textDelayFrames(game.settings.textSpeed);
        if (this.revealed < this.message.length) {
          this.revealTimer++;
          if (delay === 0 || this.revealTimer >= delay) {
            this.revealTimer = 0;
            this.revealed += delay === 0 ? 999 : 1;
          }
        }
        const done = this.revealed >= this.message.length;
        // The hold only starts once the last character is on screen. Counting
        // it down during the reveal meant a long line on slow text had nothing
        // left of its hold by the time it finished, so "X used Y!" was still
        // being read as the sprite lunged.
        if (done) a.frames--;
        // Confirm skips the reveal, then skips the hold.
        if (skip) {
          if (!done) this.revealed = this.message.length;
          else a.frames = 0;
        }
        if (done && a.frames <= 0) this.current = null;
        break;
      }
      case 'hp': {
        a.t++;
        // A bar animating a kin that is no longer the one on screen would drag
        // the wrong meter; skip straight to the value.
        if (this.view[a.side].kin && this.view[a.side].kin !== a.kin) {
          this.current = null;
          break;
        }
        const p = Math.min(1, a.t / a.frames);
        // Smoothstep. A linear drain starts and stops dead, which reads as a
        // progress bar filling; easing in and out reads as something leaving.
        // The value stays fractional -- renderInfo rounds it for the readout
        // and feeds the raw number to the meter.
        const e = p * p * (3 - 2 * p);
        this.view[a.side].displayHp = a.from + (a.to - a.from) * e;
        if (a.t >= a.frames || skip) { this.view[a.side].displayHp = a.to; this.current = null; }
        break;
      }
      case 'exp': {
        a.t++;
        const p = Math.min(1, a.t / a.frames);
        this.displayExp = Math.round(a.from + (a.to - a.from) * p);
        if (a.t >= a.frames || skip) { this.displayExp = a.to; this.current = null; }
        break;
      }
      case 'flash': {
        a.t++;
        this.view[a.side].flash = a.t % 6 < 3 ? 1 : 0;
        if (a.t >= a.frames || skip) {
          this.view[a.side].flash = 0;
          // Release the flinch: the spring carries the defender back and
          // settles it, so the recovery is not a snap.
          this.view[a.side].dashTo = 0;
          this.current = null;
        }
        break;
      }
      case 'windup': {
        a.t++;
        if (a.t >= a.frames || skip) this.current = null;
        break;
      }
      case 'shake': {
        a.t++;
        this.view[a.side].offsetX = a.t % 4 < 2 ? 2 : -2;
        if (a.t >= a.frames) { this.view[a.side].offsetX = 0; this.current = null; }
        break;
      }
      case 'faint': {
        a.t++;
        const p = Math.min(1, a.t / a.frames);
        this.view[a.side].offsetY = Math.round(p * 40);
        this.view[a.side].alpha = 1 - p;
        if (a.t >= a.frames) { this.view[a.side].visible = false; this.current = null; }
        break;
      }
      case 'sendOut': {
        a.t++;
        const p = Math.min(1, a.t / a.frames);
        const v = this.view[a.side];
        v.visible = true;
        v.alpha = p;
        v.offsetY = 0;
        v.offsetX = Math.round((1 - p) * (a.side === 'player' ? -50 : 50));
        if (a.t >= a.frames) {
          v.alpha = 1; v.offsetX = 0;
          this.current = null;
        }
        break;
      }
      case 'withdraw': {
        a.t++;
        const p = Math.min(1, a.t / a.frames);
        const v = this.view[a.side];
        v.alpha = 1 - p;
        v.offsetX = Math.round(p * (a.side === 'player' ? -40 : 40));
        if (a.t >= a.frames) { v.visible = false; this.current = null; }
        break;
      }
      case 'sfx':
        this.current = null;
        break;
      case 'moveFx': {
        a.t++;
        if (a.t === 1) {
          if (game.settings.battleAnimations) this.startFx(a.side, a.anim, a.type);
          // Drive forward out of the wind-up. Modest on purpose: the punch
          // archetypes add their own lunge on top of this one.
          this.view[a.side].dashTo = fxTargetsSelf(a.anim) ? 0 : 3.5;
        }
        // Release partway through, so the recoil is finishing while the effect
        // is still on screen rather than after everything has gone quiet.
        if (a.t === Math.max(2, Math.round(a.frames * 0.4))) this.view[a.side].dashTo = 0;
        // Hold until the performance is done, but never past the budget: a
        // player on fast battles has told us they do not want to wait.
        if (a.t >= a.frames || (!this.fx.busy && a.t > 6) || skip) {
          if (skip) this.fx.clear();
          this.view[a.side].dashTo = 0;
          this.current = null;
          this.fxSide = null;
        }
        break;
      }
      case 'vessel': {
        a.t++;
        this.vesselState = { shakes: a.shakes, caught: a.caught, t: a.t };
        if (a.t >= a.frames) { this.vesselState = null; this.current = null; }
        break;
      }
      case 'weather': {
        a.t++;
        if (a.t >= a.frames || skip) this.current = null;
        break;
      }
      case 'wait': {
        a.t++;
        if (a.t >= a.frames || skip) this.current = null;
        break;
      }
      case 'end': {
        if (this.battle.result === 'win' && !this.opts.isWild) audio.playMusic('victory');
        this.phase = 'finished';
        this.current = null;
        this.queue.length = 0;
        break;
      }
    }
  }

  private onAnimStart(a: Anim, game: Game): void {
    switch (a.kind) {
      case 'sendOut': {
        const kin = a.side === 'player' ? this.battle.player.active : this.battle.foe.active;
        const v = this.view[a.side];
        v.kin = kin;
        v.displayHp = kin.currentHp;
        // A fresh kin arrives square on its pad and takes its first breath
        // there, rather than inheriting whatever the last one was mid-flinch.
        v.dash = 0; v.dashV = 0; v.dashTo = 0; v.idleT = 0;
        if (a.side === 'player') this.displayExp = kin.exp;
        audio.playSfx('send_out');
        if (kin) audio.playCry(kin.species);
        break;
      }
      case 'withdraw':
        audio.playSfx('withdraw');
        break;
      case 'sfx':
        audio.playSfx(a.id);
        break;
      case 'flash':
        audio.playSfx(a.effectiveness > 1 ? 'hit_super' : a.effectiveness < 1 ? 'hit_weak' : 'hit');
        // Give ground. A defender that takes a hit without moving is the main
        // reason a trade of blows used to read as two sprites flickering at
        // each other; a super-effective hit shoves it further.
        this.view[a.side].dashTo = a.effectiveness > 1 ? -5 : a.effectiveness < 1 ? -2.2 : -3.4;
        break;
      case 'windup':
        // Anticipation. The move's own effect takes over the frame it starts,
        // so this is only the pull back in front of it -- a self-targeting move
        // braces rather than winding up at nobody.
        this.view[a.side].dashTo = a.self ? -1.4 : -3.2;
        break;
      case 'faint':
        audio.playSfx('faint');
        break;
      case 'vessel':
        audio.playSfx('vessel_throw');
        break;
      case 'heal' as never:
        break;
      default:
        break;
    }
    if (a.kind === 'text') {
      this.message = a.text;
      this.revealed = textDelayFrames(game.settings.textSpeed) === 0 ? a.text.length : 0;
      this.revealTimer = 0;
    }
    if (a.kind === 'hp') {
      if (a.from < 0) a.from = this.view[a.side].displayHp;
      // A scratch and a near-KO should not take the same time to drain. The
      // authored length is the one a full bar gets; anything less is scaled
      // down against it, so chip damage never holds the turn up and a big hit
      // still gets to be slow on purpose.
      const share = Math.min(1, Math.abs(a.from - a.to) / Math.max(1, a.kin.maxHp));
      a.frames = Math.max(6, Math.round(a.frames * (0.35 + 0.75 * share)));
    }
    if (a.kind === 'exp' && a.from < 0) a.from = this.displayExp;
    if (a.kind === 'sendOut' && a.side === 'foe') {
      this.opts.state.markSeen(this.battle.foe.active.species);
    }
  }

  /** Runs once the queue empties: decide what the player should be doing. */
  private afterAnimations(game: Game): void {
    if (this.battle.over) {
      this.phase = 'finished';
      return;
    }
    if (this.battle.awaitingFoeReplacement) {
      this.enqueue(this.battle.sendNextFoe(), game);
      return;
    }
    if (this.battle.awaitingPlayerReplacement) {
      this.phase = 'forcedSwitch';
      this.buildPartyMenu();
      this.message = 'Which kin will you send out?';
      this.revealed = this.message.length;
      return;
    }
    // A beat between the last thing that happened and being asked what to do
    // next. Without it the menu lands on the same frame as the final hit and
    // the player is choosing before they have read the result.
    if (!this.menuPause) {
      this.menuPause = true;
      this.queue.push({ kind: 'wait', frames: this.frames(20, game), t: 0 });
      return;
    }
    this.menuPause = false;

    this.phase = 'menu';
    this.buildActionMenu();
    const name = this.battle.player.active.name;
    this.message = `What will ${name} do?`;
    this.revealed = this.message.length;
  }

  /* --------------------------------------------------------------- menus */

  private buildActionMenu(): void {
    this.actionMenu.setItems([
      { label: 'FIGHT', value: 'fight' },
      { label: 'BAG', value: 'bag' },
      { label: 'KIN', value: 'party' },
      { label: this.battle.isWild ? 'RUN' : 'FLEE', value: 'run', enabled: this.battle.isWild },
    ], true);
    this.actionMenu.visible = 4;
  }

  private buildMoveMenu(): void {
    const kin = this.battle.player.active;
    const items: MenuItem<number>[] = kin.moves.map((slot, i) => {
      const md = registry.moves.get(slot.id);
      return {
        label: md?.name ?? slot.id,
        value: i,
        detail: `${slot.pp}/${slot.maxPp}`,
        enabled: slot.pp > 0,
      };
    });
    this.moveMenu.setItems(items, true);
    this.moveMenu.visible = 4;
  }

  private buildPartyMenu(): void {
    const items: MenuItem<number>[] = this.battle.player.party.map((k, i) => ({
      label: k.name,
      value: i,
      detail: k.fainted ? 'FAINTED' : `Lv${k.level}  ${k.currentHp}/${k.maxHp}`,
      enabled: !k.fainted && i !== this.battle.player.activeIndex,
    }));
    this.partyMenu.setItems(items, true);
    this.partyMenu.visible = Math.min(6, items.length);
  }

  private buildBagMenu(): void {
    const usable = this.opts.state.inventory.filter((e) => {
      const item = registry.getItem(e.item);
      return item?.usableInBattle;
    });
    const items: MenuItem<string>[] = usable.map((e) => ({
      label: registry.itemName(e.item),
      value: e.item,
      detail: `x${e.count}`,
    }));
    if (items.length === 0) items.push({ label: 'Nothing usable', value: '', enabled: false });
    this.bagMenu.setItems(items, true);
    this.bagMenu.visible = Math.min(5, items.length);
  }

  private updateActionMenu(game: Game): void {
    const res = this.actionMenu.update(game);
    if (res !== 'select') return;
    switch (this.actionMenu.selectedValue) {
      case 'fight':
        this.phase = 'moves';
        this.buildMoveMenu();
        break;
      case 'bag':
        this.phase = 'bag';
        this.buildBagMenu();
        break;
      case 'party':
        this.phase = 'party';
        this.buildPartyMenu();
        break;
      case 'run':
        this.submit(game, { kind: 'run' });
        break;
    }
  }

  private updateMoveMenu(game: Game): void {
    const res = this.moveMenu.update(game);
    if (res === 'cancel') { this.phase = 'menu'; return; }
    if (res === 'select') {
      const idx = this.moveMenu.selectedValue ?? 0;
      this.submit(game, { kind: 'move', index: idx });
    }
  }

  private updatePartyMenu(game: Game, forced = false): void {
    const res = this.partyMenu.update(game);
    if (res === 'cancel' && !forced) { this.phase = 'menu'; return; }
    if (res === 'select') {
      const idx = this.partyMenu.selectedValue ?? 0;
      if (forced) {
        this.battle.doSwitch('player', idx);
        this.enqueue(this.battle.drainEvents(), game);
        this.phase = 'anim';
      } else {
        this.submit(game, { kind: 'switch', partyIndex: idx });
      }
    }
  }

  private updateBagMenu(game: Game): void {
    const res = this.bagMenu.update(game);
    if (res === 'cancel') { this.phase = 'menu'; return; }
    if (res === 'select') {
      const item = this.bagMenu.selectedValue;
      if (!item) return;
      this.submit(game, { kind: 'item', item, partyIndex: this.battle.player.activeIndex });
    }
  }

  /** Hand the chosen action to the engine along with the AI's. */
  private submit(game: Game, action: BattleAction): void {
    const foeAction = this.ai.choose(this.battle, 'foe');
    const events = this.battle.takeTurn(action, foeAction);
    this.enqueue(events, game);
    this.phase = 'anim';
  }

  /* ------------------------------------------------------------ effects */

  /**
   * Kick off a move's effect. Positions are the middle of each sprite rather
   * than the pad, because that is where the eye is already looking.
   */
  private startFx(side: SideId, anim: string, type: TypeId): void {
    const meta = registry.typeChart?.meta?.[type];
    const color = meta?.color ?? '#ffffff';
    const half = SPRITE_SIZE / DETAIL / 2;
    const centre = (p: { x: number; y: number }) => ({ x: p.x + half, y: p.y + half * 0.9 });

    const user = centre(side === 'player' ? PLAYER_SPRITE : FOE_SPRITE);
    const target = fxTargetsSelf(anim)
      ? user
      : centre(side === 'player' ? FOE_SPRITE : PLAYER_SPRITE);

    this.fxSide = side;
    this.fx.play(anim, user, target, color);
    audio.playSfx(sfxForAnim(anim));
  }

  /* ------------------------------------------------------------- render */

  render(game: Game, r: Renderer): void {
    r.camX = 0; r.camY = 0;
    this.renderBackdrop(r);

    // The field shakes; the interface does not. Shaking the whole screen makes
    // text unreadable and reads as a bug rather than as force.
    const sx = this.fx.shakeX, sy = this.fx.shakeY;
    const c = r.bctx;
    c.save();
    if (sx || sy) c.translate(sx * DETAIL, sy * DETAIL);
    this.renderPads(r);
    this.renderKin(r, 'foe');
    this.renderKin(r, 'player');
    this.fx.render(r);
    this.renderVessel(r);
    c.restore();

    // A negative flash is a dim rather than a bloom, which is how the dark
    // effects land without washing the screen out.
    if (this.fx.flash > 0) r.tint(this.fx.flashColor, this.fx.flash);
    else if (this.fx.flash < 0) r.tint('#000000', -this.fx.flash);

    this.renderInfo(r, 'foe');
    this.renderInfo(r, 'player');
    this.renderMessage(game, r);

    // The overworld left the screen closed; run the same shape backwards so
    // the two halves read as one continuous move.
    if (this.introWipe < this.introFrames) {
      drawShutters(r, 1 - this.introWipe / this.introFrames);
    }
  }

  /**
   * Backdrops are painted from banded palettes rather than art files, so a new
   * region only needs an entry here. The horizon detail differs per backdrop
   * because a flat seam between sky and ground is the thing that makes a
   * battle screen look unfinished.
   */
  private renderBackdrop(r: Renderer): void {
    const kind = this.opts.backdrop ?? 'highland';
    const palettes: Record<string, { sky: string[]; ground: string[]; hill?: string }> = {
      indoor: { sky: ['#3a3448', '#463e56', '#524a64'], ground: ['#6b5440', '#7d6450', '#8d7460'] },
      cave: { sky: ['#1c2030', '#242a3c', '#2c3448'], ground: ['#3a3a44', '#46464f', '#52525c'] },
      quarry: { sky: ['#8fa8c0', '#a8bcd0', '#c0d0e0'], ground: ['#8a8478', '#9a9488', '#aaa498'], hill: '#6e6a60' },
      coast: { sky: ['#8fc0dc', '#a8d4e8', '#c8e4f0'], ground: ['#cdb682', '#d8c48c', '#e2d0a2'], hill: '#3f7aa8' },
      highland: { sky: ['#7fb0d8', '#9cc4e4', '#bcd8ee'], ground: ['#5f8f4a', '#6fa055', '#7fb060'], hill: '#4f7a48' },
    };
    const pal = palettes[kind] ?? palettes.highland!;

    const horizon = 84;
    pal.sky.forEach((c, i) =>
      r.rect(0, i * (horizon / pal.sky.length), SCREEN_W, horizon / pal.sky.length + 1, c));
    pal.ground.forEach((c, i) => {
      const h = (MSG.y - horizon) / pal.ground.length;
      r.rect(0, horizon + i * h, SCREEN_W, h + 1, c);
    });

    if (!pal.hill) return;

    if (kind === 'coast') {
      // Open water along the horizon, with a drifting glitter line.
      r.rect(0, horizon - 14, SCREEN_W, 14, pal.hill);
      for (let i = 0; i < 10; i++) {
        const y = horizon - 12 + (i % 6) * 2;
        const x = ((i * 37 + Math.floor(this.ticks / 3)) % (SCREEN_W + 30)) - 15;
        r.rect(x, y, 5 + (i % 4), 1, '#7fb8d8');
      }
      r.rect(0, horizon - 1, SCREEN_W, 1, '#e8dcb0');
      return;
    }

    // Distant relief, so the horizon is never a straight seam.
    for (let i = 0; i < 5; i++) {
      const hx = 20 + i * 52;
      const hw = 34 + (i % 3) * 10;
      for (let x = -hw; x <= hw; x++) {
        const h = kind === 'quarry'
          // A quarry face is cut in steps, not rounded.
          ? Math.round((1 - Math.abs(x) / hw) * 18) - (Math.abs(x) % 6 < 3 ? 0 : 3)
          : Math.round(Math.cos((x / hw) * (Math.PI / 2)) * (12 + (i % 3) * 5));
        if (h > 0) r.rect(hx + x, horizon - h, 1, h, pal.hill);
      }
    }
  }

  private renderPads(r: Renderer): void {
    for (const pad of [FOE_PAD, PLAYER_PAD]) {
      const rx = pad === FOE_PAD ? 30 : 36;
      const ry = pad === FOE_PAD ? 8 : 10;
      for (let y = -ry; y <= ry; y++) {
        const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y / ry) ** 2)));
        if (w <= 0) continue;
        const shade = y < 0 ? '#6fa055' : '#54833f';
        r.rect(pad.x - w, pad.y + y, w * 2, 1, shade);
      }
      r.rect(pad.x - rx, pad.y, 1, 1, '#3f6432');
    }
  }

  /**
   * Idle breathing.
   *
   * A creature standing perfectly still is what makes a battle screen look
   * like a screenshot of itself. This returns whole design pixels rather than a
   * float: the sprite rises one pixel at the top of the breath, sits neutral
   * through the middle, and compresses one pixel at the bottom. That is the
   * entire range the grid allows and about as much as the era ever used -- any
   * more and it stops reading as breathing and starts reading as floating.
   *
   * The two sides run a little over half a cycle apart so they never pulse
   * together, which would read as one shared heartbeat rather than two animals.
   */
  private breath(side: SideId): { lift: number; squash: number } {
    const v = this.view[side];
    const p = Math.sin(v.idleT / 22 + (side === 'foe' ? Math.PI * 1.15 : 0));
    return { lift: p > 0.55 ? -1 : 0, squash: p < -0.6 ? 1 : 0 };
  }

  private renderKin(r: Renderer, side: SideId): void {
    const v = this.view[side];
    if (!v.visible) return;
    const kin = v.kin;
    if (!kin) return;

    const back = side === 'player';
    const sprite = back ? backSprite(kin.species) : frontSprite(kin.species);
    const pos = back ? PLAYER_SPRITE : FOE_SPRITE;
    const face = back ? 1 : -1;

    // Staging and the effect's own lunge are both measured toward the opponent,
    // so they add. The ceiling is the biggest lunge any archetype asks for on
    // its own, so a heavy punch still travels its full authored distance and
    // the step forward underneath it cannot push the sprite off its pad.
    const fxLunge = this.fxSide === side ? this.fx.lunge : 0;
    const dash = Math.max(-7, Math.min(13, v.dash + fxLunge));

    const br = this.breath(side);
    // Rounded to whole logical units, always: r.image snaps to the buffer, so a
    // fractional position would land the sprite's pixels on the odd row and
    // undo the whole 2x2 design grid.
    const x = Math.round(pos.x + v.offsetX + dash * face);
    const y = Math.round(pos.y + v.offsetY + br.lift);
    const size = SPRITE_SIZE;

    /*
     * Squashing without scaling.
     *
     * Nothing in this game is ever resampled -- a sprite drawn at 63/64 height
     * would land half its rows off the design grid and read as blur. So the
     * compressed pose is two blits instead: the top of the sprite is dropped a
     * pixel onto the bottom and the single source row at the seam is simply not
     * drawn. The silhouette loses exactly one design pixel of height, the feet
     * stay planted, and every pixel that survives is still where the grid says.
     */
    const cut = Math.round(size * 0.62 / DETAIL) * DETAIL;
    const blit = (img: CanvasImageSource, alpha: number) => {
      if (br.squash === 0) {
        r.image(img, x, y, 0, 0, size, size, false, false, alpha);
        return;
      }
      r.image(img, x, y + 1, 0, 0, size, cut - DETAIL, false, false, alpha);
      r.image(img, x, y + cut / DETAIL, 0, cut, size, size - cut, false, false, alpha);
    };

    blit(sprite, v.alpha);

    if (v.flash > 0) {
      // A white silhouette over the sprite: the era's standard hit tell, and
      // far more readable than a translucent box.
      blit(whiteSprite(kin.species, back), 0.75);
    }
  }

  private renderVessel(r: Renderer): void {
    if (!this.vesselState) return;
    const { shakes, caught, t } = this.vesselState;
    const throwFrames = 20;
    if (t < throwFrames) {
      // Arc from the player's side to the foe.
      const p = t / throwFrames;
      const x = Math.round(PLAYER_PAD.x + (FOE_PAD.x - PLAYER_PAD.x) * p);
      const y = Math.round(PLAYER_PAD.y - 20 + (FOE_PAD.y - PLAYER_PAD.y) * p - Math.sin(p * Math.PI) * 34);
      this.drawVesselIcon(r, x, y);
      return;
    }
    const after = t - throwFrames;
    const wobble = Math.floor(after / 22);
    const local = after % 22;
    const tilt = wobble < shakes ? Math.round(Math.sin(local / 22 * Math.PI * 2) * 3) : 0;
    this.drawVesselIcon(r, FOE_PAD.x + tilt, FOE_PAD.y - 8);
    if (!caught && wobble >= shakes) {
      r.text('!', FOE_PAD.x + 10, FOE_PAD.y - 24, { color: '#ffffff', shadow: '#000000' });
    }
  }

  private drawVesselIcon(r: Renderer, x: number, y: number): void {
    r.rect(x - 4, y - 4, 8, 8, '#c8a05a');
    r.rect(x - 4, y - 4, 8, 3, '#e0c07a');
    r.rect(x - 4, y + 2, 8, 2, '#8a6a34');
    r.outline(x - 5, y - 5, 10, 10, '#2a2018');
    r.rect(x - 1, y - 1, 2, 2, '#f4f0e0');
  }

  /**
   * Status panel.
   *
   * A type-coloured strip along the top edge, the name and level on one line,
   * and a single fat HP bar under them. The strip is doing real work: it is the
   * only place in the battle UI that tells the player what they are looking at
   * without them having to read anything.
   *
   * The name is measured and clipped against the space the level needs. A
   * nickname is player-supplied and can be any length, so a panel that assumes
   * it fits will collide the moment somebody types one.
   */
  private renderInfo(r: Renderer, side: SideId): void {
    const kin = this.view[side].kin;
    if (!kin) return;
    const box = side === 'player' ? PLAYER_BOX : FOE_BOX;
    const v = this.view[side];
    if (!v.visible && v.alpha <= 0) return;

    r.window(box.x, box.y, box.w, box.h, {
      fill: UI.fill, border: UI.frame, highlight: UI.shade,
    });

    // Type strip across the top of the panel.
    const stripC = registry.typeChart?.meta?.[kin.types[0]!]?.color ?? UI.shade;
    r.rect(box.x + 3, box.y + 3, box.w - 6, 2, stripC);
    if (kin.types[1]) {
      const c2 = registry.typeChart?.meta?.[kin.types[1]]?.color ?? UI.shade;
      r.rect(box.x + 3 + Math.floor((box.w - 6) / 2), box.y + 3, Math.ceil((box.w - 6) / 2), 2, c2);
    }

    const left = box.x + 7;
    const levelText = `Lv${kin.level}`;
    const levelW = r.textWidth(levelText);
    const genderText = kin.gender === 'none' ? '' : kin.gender === 'female' ? 'oF' : 'oM';
    const genderW = genderText ? r.textWidth(genderText) + 2 : 0;
    const nameRoom = box.w - 14 - levelW - genderW - 4;

    let name = kin.name;
    while (name.length > 1 && r.textWidth(name) > nameRoom) name = name.slice(0, -1);
    if (name !== kin.name) name = name.slice(0, -1) + '..';

    const nameY = box.y + 7;
    r.text(name, left, nameY, { color: UI.ink });
    if (genderText) {
      r.text(genderText, left + r.textWidth(name) + 2, nameY, {
        color: kin.gender === 'female' ? '#d0608c' : '#5a86cc',
      });
    }
    r.text(levelText, box.x + box.w - 7, nameY, { color: UI.ink, align: 'right' });

    const barY = box.y + 17;
    const barX = left + 14;
    const barW = box.w - (barX - box.x) - 7;
    r.text('HP', left, barY - 1, { color: UI.inkSoft });
    // The raw fraction goes to the meter, which fills at buffer resolution, so
    // the bar slides across half-units instead of stepping one HP at a time.
    // The readout is the same number rounded, so the digits fall in step with
    // the bar rather than running their own clock.
    const frac = v.displayHp / Math.max(1, kin.maxHp);
    const shown = Math.max(0, Math.round(v.displayHp));
    const color = frac > 0.5 ? UI.hpGood : frac > 0.2 ? UI.hpWarn : UI.hpBad;
    r.meter(barX, barY, barW, 6, frac, color, UI.hpBack, UI.frame);

    if (side === 'player') {
      r.text(`${shown}/${kin.maxHp}`, box.x + box.w - 7, barY + 8, {
        color: UI.ink, align: 'right',
      });
      // Experience runs along the very bottom edge, full width, so it never
      // competes with the HP bar for attention.
      const cur = expForLevel(kin.growthRate, kin.level);
      const next = expForLevel(kin.growthRate, Math.min(100, kin.level + 1));
      const prog = next > cur ? Math.max(0, Math.min(1, (this.displayExp - cur) / (next - cur))) : 1;
      r.meter(box.x + 4, box.y + box.h - 5, box.w - 8, 2, prog, UI.exp, '#39415c', null);
    }

    if (kin.status !== 'none') this.renderStatusChip(r, left, barY + 8, kin.status);
  }

  private renderStatusChip(r: Renderer, x: number, y: number, status: StatusId): void {
    const map: Record<string, { label: string; color: string }> = {
      burn: { label: 'BRN', color: '#e06a3a' },
      freeze: { label: 'FRZ', color: '#6ac0e0' },
      paralysis: { label: 'PAR', color: '#d8c040' },
      poison: { label: 'PSN', color: '#a05ab0' },
      toxic: { label: 'TOX', color: '#8040a0' },
      sleep: { label: 'SLP', color: '#8890a8' },
    };
    const s = map[status];
    if (!s) return;
    r.rect(x, y, 20, 9, s.color);
    r.outline(x, y, 20, 9, '#282838');
    r.text(s.label, x + 3, y + 1, { color: '#ffffff' });
  }

  private renderMessage(game: Game, r: Renderer): void {
    r.window(MSG.x, MSG.y, MSG.w, MSG.h, { fill: UI.fill, border: UI.frame, highlight: UI.shade });

    const showMenu = this.phase === 'menu';
    const textW = showMenu ? 120 : MSG.w - 20;

    if (this.phase === 'moves') { this.renderMoveMenu(r); return; }
    if (this.phase === 'party' || this.phase === 'forcedSwitch') { this.renderPartyMenu(r); return; }
    if (this.phase === 'bag') { this.renderBagMenu(r); return; }

    const lines = r.wrapText(this.message, textW);
    let left = this.revealed;
    let y = MSG.y + 9;
    for (const line of lines.slice(0, 3)) {
      const visible = line.slice(0, Math.max(0, left));
      r.text(visible, MSG.x + 10, y, { color: UI.ink });
      left -= line.length;
      y += 11;
      if (left <= 0) break;
    }

    if (showMenu) {
      this.renderActionMenu(game, r);
    } else if (this.revealed >= this.message.length && this.phase !== 'anim') {
      const bob = Math.floor(this.ticks / 16) % 2;
      r.text('>>', MSG.x + MSG.w - 14, MSG.y + MSG.h - 13 + bob, { color: UI.inkSoft });
    }
  }

  /**
   * The four-way command pad.
   *
   * Each command owns a colour and keeps it forever, so after a few battles the
   * player stops reading the words and just goes for the red square. The
   * selected tile lifts, brightens and takes a white keyline -- three cues at
   * once, because this is the one widget that must never be ambiguous.
   */
  private renderActionMenu(game: Game, r: Renderer): void {
    const bx = 132, by = MSG.y + 3, bw = 104, bh = MSG.h - 6;
    const cw = bw / 2;
    const ch = bh / 2;

    const cells: { label: string; x: number; y: number; base: string; lit: string }[] = [
      { label: 'FIGHT', x: 0, y: 0, base: '#c8483c', lit: '#e8685c' },
      { label: 'BAG', x: 1, y: 0, base: '#d08c30', lit: '#efad4e' },
      { label: 'KIN', x: 0, y: 1, base: '#3f9a52', lit: '#5cba6e' },
      { label: this.battle.isWild ? 'RUN' : 'FLEE', x: 1, y: 1, base: '#3f7cc0', lit: '#5c9ade' },
    ];

    cells.forEach((c, i) => {
      const x = bx + c.x * cw;
      const y = by + c.y * ch;
      const hovered = game.input.mouseOver(x, y, cw, ch);
      // Hovering with the mouse moves the keyboard cursor too, so the two input
      // methods never disagree about what is selected.
      if (hovered && game.input.mouse.idleFrames < 2) this.actionMenu.index = i;
      const selected = this.actionMenu.index === i;
      const enabled = this.actionMenu.items[i]?.enabled !== false;

      const lift = selected ? 1 : 0;
      const face = !enabled ? '#8a90a4' : selected ? c.lit : c.base;

      r.rect(x + 2, y + 2 - lift, cw - 4, ch - 4, face);
      // A lit top edge and a dark bottom edge turn a flat square into a key.
      r.rect(x + 2, y + 2 - lift, cw - 4, 1, 'rgba(255,255,255,0.5)');
      r.rect(x + 2, y + ch - 3 - lift, cw - 4, 1, 'rgba(0,0,0,0.28)');
      r.outline(x + 2, y + 2 - lift, cw - 4, ch - 4, selected ? '#ffffff' : UI.frame);

      const tw = r.textWidth(c.label);
      r.text(c.label, x + Math.round((cw - tw) / 2), y + Math.round(ch / 2) - 4 - lift, {
        color: '#ffffff', shadow: 'rgba(0,0,0,0.45)',
      });

      if (hovered && game.input.mouse.leftPressed && enabled) this.actionMenu.index = i;
    });
  }

  /**
   * Move list.
   *
   * Every row carries its own type colour as a chip, which is the fastest way
   * for a player to find the coverage move they are looking for without reading
   * four names. The right-hand panel shows power and accuracy as bars as well
   * as numbers, so relative strength is legible at a glance.
   */
  private renderMoveMenu(r: Renderer): void {
    const kin = this.view.player.kin ?? this.battle.player.active;
    const listW = 146;
    const rowH = 10;

    for (let i = 0; i < 4; i++) {
      const slot = kin.moves[i];
      const y = MSG.y + 5 + i * rowH;
      if (!slot) continue;
      const md = registry.moves.get(slot.id);
      const meta = md ? registry.typeChart?.meta?.[md.type] : undefined;
      const sel = this.moveMenu.index === i;
      const out = slot.pp <= 0;

      if (sel) r.rect(MSG.x + 4, y - 1, listW - 6, rowH, '#d4e0f6');
      r.rect(MSG.x + 8, y + 1, 6, 6, out ? '#98a0b4' : (meta?.color ?? '#888'));
      r.outline(MSG.x + 8, y + 1, 6, 6, UI.frame);
      r.text(md?.name ?? slot.id, MSG.x + 18, y, { color: out ? '#98a0b4' : UI.ink });
      r.text(`${slot.pp}/${slot.maxPp}`, MSG.x + listW - 10, y, {
        color: out ? '#c05048' : UI.inkSoft, align: 'right',
      });
      if (sel) r.cursor(MSG.x + 2, y, UI.frame);
    }

    const slot = kin.moves[this.moveMenu.index];
    const md = slot ? registry.moves.get(slot.id) : undefined;
    const px0 = MSG.x + listW;
    const pw = MSG.w - listW - 4;
    r.rect(px0, MSG.y + 4, pw, MSG.h - 8, UI.fillDim);
    r.outline(px0, MSG.y + 4, pw, MSG.h - 8, UI.shade);
    if (!md) return;

    const meta = registry.typeChart?.meta?.[md.type];
    r.rect(px0 + 4, MSG.y + 7, pw - 8, 9, meta?.color ?? '#888');
    r.outline(px0 + 4, MSG.y + 7, pw - 8, 9, UI.frame);
    r.text((meta?.name ?? md.type).toUpperCase(), px0 + 7, MSG.y + 8, {
      color: '#ffffff', shadow: 'rgba(0,0,0,0.4)',
    });

    const cat = md.category === 'physical' ? 'PHYS' : md.category === 'special' ? 'SPEC' : 'STATUS';
    r.text(cat, px0 + 4, MSG.y + 19, { color: UI.inkSoft });

    const bar = (label: string, y: number, value: number, max: number, color: string) => {
      r.text(label, px0 + 4, y, { color: UI.inkSoft });
      r.meter(px0 + 24, y + 1, pw - 34, 4, Math.min(1, value / max), color, '#c2cade', UI.frame);
    };
    if (md.power > 0) bar('PWR', MSG.y + 27, md.power, 140, '#e07048');
    else r.text('PWR  --', px0 + 4, MSG.y + 27, { color: UI.inkSoft });
    if (md.accuracy >= 0) bar('ACC', MSG.y + 36, md.accuracy, 100, '#58a8e0');
    else r.text('ACC  --', px0 + 4, MSG.y + 36, { color: UI.inkSoft });
  }

  private renderPartyMenu(r: Renderer): void {
    this.partyMenu.render(r, MSG.x + 2, MSG.y + 2, MSG.w - 4, {
      rowHeight: 11, padY: 3, frame: false,
    });
    // Icon for the highlighted kin, so the list is not just names.
    const kin = this.battle.player.party[this.partyMenu.index];
    if (kin) r.image(iconSprite(kin.species), MSG.w - 36, MSG.y + 10);
  }

  private renderBagMenu(r: Renderer): void {
    this.bagMenu.render(r, MSG.x + 2, MSG.y + 2, 150, {
      rowHeight: 11, padY: 3, frame: false,
    });
    const item = this.bagMenu.selectedValue;
    const data = item ? registry.getItem(item) : undefined;
    if (data) {
      const px = MSG.x + 154;
      r.text(r.wrapText(data.description, 80).slice(0, 4).join('\n'), px, MSG.y + 8, {
        color: '#3a4258', lineHeight: 9,
      });
    }
  }
}
