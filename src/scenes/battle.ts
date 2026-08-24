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
import { backSprite, frontSprite, ICON_SIZE, iconSprite, SPRITE_SIZE, whiteSprite } from '../gfx/kinsprite.js';
import { kinAnchor } from '../gfx/kinanchor.js';
import { fxTargetsSelf, MoveFx } from '../gfx/movefx.js';
import { ListMenu, type MenuItem } from '../ui/menu.js';
import { battleSpeedScale, textDelayFrames } from '../core/settings.js';
import type { Kin } from '../systems/kin.js';
import type { GameState } from '../systems/state.js';
import type { AiTier, StatusId, TrainerData, TypeId, WeatherId } from '../data/schema.js';
import { expForLevel } from '../battle/formulas.js';
import { audio } from '../audio/audio.js';
import { drawShutters } from '../ui/transition.js';
import { drawArena, drawPads, FOE_PAD, PLAYER_PAD } from '../gfx/arena.js';

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
// FOE_PAD and PLAYER_PAD now come from the arena, which derives them from where
// feet actually land (design row 123) rather than from a guess. The old values
// here had the foe's platform at y=70 with the horizon at 84 -- that pad was
// drawn in the sky, which is why the far creature never looked planted.
const FOE_BOX = { x: 6, y: 10, w: 100, h: 28 };
const PLAYER_BOX = { x: 134, y: 68, w: 100, h: 36 };
const MSG = { x: 0, y: 114, w: SCREEN_W, h: SCREEN_H - 114 };

/**
 * Where each trainer is stood, just off the edge of the field.
 *
 * Vessels leave from here and come back to here. It is the whole reason a
 * send-out reads as somebody throwing something rather than as a sprite fading
 * in: the capsule has to arrive from a person, and go back to one.
 */
const THROW_FROM: Record<SideId, { x: number; y: number }> = {
  player: { x: -12, y: 124 },
  foe: { x: 254, y: 44 },
};

/** Fallback split height, for a side with nothing measurable on it yet. */
const OPEN_FALLBACK = 30;

/** 0 before `a`, 1 after `b`, linear between. Every beat below is cut from it. */
function ramp(x: number, a: number, b: number): number {
  return Math.max(0, Math.min(1, (x - a) / (b - a)));
}

/** A one-shot: nothing until `at`, full there, gone `span` later. */
function pop(x: number, at: number, span: number): number {
  return x < at ? 0 : 1 - ramp(x, at, at + span);
}

/** A thrown vessel travels on a lob, never on a straight line. */
function arcTo(
  from: { x: number; y: number }, to: { x: number; y: number }, p: number,
): { x: number; y: number } {
  return {
    x: Math.round(from.x + (to.x - from.x) * p),
    y: Math.round(from.y + (to.y - from.y) * p - Math.sin(p * Math.PI) * 30),
  };
}

/**
 * The vessel and its light, while one is on the field.
 *
 * Sending out, recalling and capturing are the same three parts in a different
 * order -- a thrown capsule, a cone of light, and a creature either arriving or
 * leaving along it -- so all three drive this one structure and share a
 * renderer rather than each growing their own.
 */
interface Capsule {
  x: number;
  y: number;
  /** 0 shut, 1 fully split. */
  open: number;
  /** Cone strength, 0..1. */
  beam: number;
  /** Where the cone lands; null while the vessel is merely in flight. */
  beamTo: { x: number; y: number } | null;
  /** Tumble phase across a throw, 0..1. */
  spin: number;
  /** One-shot burst: 1 the instant it fires, 0 once it has expanded away. */
  burst: number;
  /**
   * The same one-shot, but where the cone LANDS rather than at the vessel.
   *
   * This is the beat the creature forms on. Without something happening on the
   * ground at that moment the arrival is a crossfade, and a crossfade is what
   * the eye reads as a sprite fading in rather than as a thing being poured
   * out of a capsule.
   */
  land: number;
  /** The failure mark, drawn above the vessel. */
  tell: string | null;
}

function capsuleAt(x: number, y: number, o: Partial<Capsule> = {}): Capsule {
  return { x, y, open: 0, beam: 0, beamTo: null, spin: 0, burst: 0, land: 0, tell: null, ...o };
}

/** Authored lengths of the capture performance, already speed-scaled. */
interface VesselPhases {
  throw: number;
  suck: number;
  settle: number;
  wobble: number;
  finish: number;
}

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
  | { kind: 'vessel'; shakes: number; caught: boolean; ph: VesselPhases; frames: number; t: number }
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
  /** Frames of hit flicker still owed. Counted down by update() rather than by
   *  the flash step, so the flicker can run on over the HP drain instead of
   *  holding the queue up in front of it. */
  flashT: number;
  visible: boolean;
  /** How far the sprite has been replaced by its own white silhouette:
   *  0 flesh, 1 pure light. */
  ghost: number;
  /** How brightly the silhouette is glowing, 0..1. Drives the halo that makes
   *  a materialising kin read as light rather than as a faded sprite. Only the
   *  vessel steps ever raise it. */
  bloom: number;
  /** Absolute logical y the sprite is cut off at, so a beaten kin sinks into
   *  the ground rather than sliding off the bottom of the screen. */
  clipY: number | null;
  /** Staging offset, positive toward the opponent, with its spring state. */
  dash: number;
  dashV: number;
  dashTo: number;
  /** Breathing clock. Only runs while this side is actually stood there. */
  idleT: number;
}

const NEW_VIEW = (): SideView => ({
  kin: null, displayHp: 0, offsetX: 0, offsetY: 0, alpha: 1, flash: 0, flashT: 0,
  visible: true, ghost: 0, bloom: 0, clipY: null,
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
  /** The vessel currently on the field, if any. Written by whichever of the
   *  send-out, recall or capture steps is running; read only by the renderer. */
  private capsule: Capsule | null = null;
  /** A click on a party card, resolved on the next update. The cards are drawn
   *  by this scene rather than by the list widget, so the widget has no
   *  rectangles of its own to hit-test against. */
  private partyClick = false;
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

    // The opening send-out is the animation the whole scene is judged on, so it
    // is queued with the player's real settings rather than with the neutral
    // fallback frames() uses when nobody hands it a game.
    this.enqueue(this.battle.begin(), game);

    // A side that is about to be thrown out must not already be stood on its
    // pad while the intro line types, or it appears, vanishes, and is then
    // sent out -- which is worse than the no-animation version it replaces.
    // A wild encounter emits no send-out for the foe, and that one is right to
    // be there from the first frame.
    for (const a of this.queue) {
      if (a.kind !== 'sendOut') continue;
      const v = this.view[a.side];
      v.visible = false; v.alpha = 0; v.ghost = 1;
    }

    this.buildActionMenu();
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
        case 'withdraw': {
          // Same lift as useMove below: the engine emits the step in front of
          // the line that narrates it, and "Go, X!" has to be on screen before
          // the vessel leaves the trainer's hand or the throw reads as
          // happening to nobody. The hold is short -- the animation is the
          // sentence, the text is only its subject.
          const next = events[i + 1];
          if (next && next.t === 'message') { this.pushText(next.text, game, 8); i++; }
          this.queue.push(e.t === 'sendOut'
            ? { kind: 'sendOut', side: e.side, frames: this.frames(52, game), t: 0 }
            : { kind: 'withdraw', side: e.side, frames: this.frames(36, game), t: 0 });
          break;
        }
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
          // Barely a beat between the move landing and the damage showing. It
          // used to be ten frames, plus a whole flash, plus eight more before
          // the bar moved, and the cost of a hit arrived long after the hit.
          // The pause that does useful work is the one *after* the drain.
          this.queue.push({ kind: 'wait', frames: this.frames(3, game), t: 0 });
          break;
        }
        case 'damage': {
          // Only the lead-in of the flash blocks; the flicker itself runs on
          // the defender's own clock, so it is still going while the bar
          // drains and the two read as one blow rather than two events.
          this.queue.push({
            kind: 'flash', side: e.side, frames: this.frames(4, game), t: 0,
            effectiveness: e.effectiveness,
          });
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
          this.queue.push({ kind: 'faint', side: e.side, frames: this.frames(40, game), t: 0 });
          this.queue.push({ kind: 'wait', frames: this.frames(14, game), t: 0 });
          break;
        case 'throwVessel': {
          // The capture is five separate beats, so its lengths are scaled once
          // here and carried on the step: working them out again inside the
          // playback from one total would mean re-deriving the speed setting.
          const ph: VesselPhases = {
            throw: this.frames(22, game),
            suck: this.frames(20, game),
            settle: this.frames(10, game),
            wobble: this.frames(24, game),
            finish: this.frames(34, game),
          };
          this.queue.push({
            kind: 'vessel', shakes: e.shakes, caught: e.caught, ph, t: 0,
            frames: ph.throw + ph.suck + ph.settle + e.shakes * ph.wobble + ph.finish,
          });
          break;
        }
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
      this.flickerStep(v);
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
   * The hit flicker.
   *
   * Driven here rather than by the flash step it belongs to, because that step
   * has to hand the queue straight on to the HP drain: a defender that has
   * finished flashing before its bar so much as twitches reads as two separate
   * events instead of one blow landing. The flinch is released on the same beat
   * the flicker stops, so the spring still carries the sprite home rather than
   * snapping it back.
   */
  private flickerStep(v: SideView): void {
    if (v.flashT <= 0) return;
    v.flashT--;
    v.flash = v.flashT % 6 < 3 ? 1 : 0;
    if (v.flashT === 0) {
      v.flash = 0;
      v.dashTo = 0;
    }
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
    // Half-materialised is not idling either, whichever step put it there.
    if (v.ghost > 0 || v.bloom > 0 || v.clipY !== null) return false;
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
        // Only the lead-in is on the queue's clock; flickerStep owns the rest.
        if (a.t >= a.frames || skip) {
          if (skip) {
            const v = this.view[a.side];
            v.flashT = 0; v.flash = 0; v.dashTo = 0;
          }
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
        const v = this.view[a.side];
        const pad = a.side === 'player' ? PLAYER_PAD : FOE_PAD;
        // Beaten, not deleted. It blanches on the blow, goes limp, slides down
        // through its own pad -- the clip is what sells "into the ground"
        // rather than "off the bottom of the screen" -- and on the way down it
        // gives itself back to the light it was sent out as. The second rise of
        // `ghost` is that return: same silhouette, same glow, run the other way,
        // so a knockout and a recall are visibly the same event happening for
        // different reasons.
        const blanch = 1 - ramp(p, 0.02, 0.20);
        const dissolve = ramp(p, 0.46, 0.78);
        v.ghost = Math.max(blanch, dissolve);
        v.bloom = dissolve * 0.8;
        v.offsetY = Math.round(Math.pow(p, 1.6) * 46);
        v.offsetX = Math.round(Math.sin(p * Math.PI * 1.2) * 2);
        v.clipY = pad.y + 3;
        v.alpha = 1 - ramp(p, 0.62, 1);
        if (a.t >= a.frames || skip) {
          v.visible = false; v.alpha = 0; v.ghost = 0; v.bloom = 0;
          v.offsetX = 0; v.offsetY = 0; v.clipY = null;
          this.current = null;
        }
        break;
      }
      case 'sendOut': {
        a.t++;
        this.sendOutFrame(a.side, a.t, a.frames);
        if (a.t >= a.frames || skip) { this.arrive(a.side); this.current = null; }
        break;
      }
      case 'withdraw': {
        a.t++;
        this.withdrawFrame(a.side, a.t, a.frames);
        if (a.t >= a.frames || skip) {
          const v = this.view[a.side];
          v.visible = false; v.alpha = 0; v.ghost = 0; v.bloom = 0; v.clipY = null;
          v.offsetX = 0; v.offsetY = 0;
          this.capsule = null;
          this.current = null;
        }
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
        this.vesselFrame(a);
        if (a.t >= a.frames || skip) {
          this.capsule = null;
          if (a.caught) {
            // Caught: the field is empty, and the status panel goes with it.
            const v = this.view.foe;
            v.visible = false; v.alpha = 0; v.ghost = 0; v.bloom = 0; v.clipY = null;
            v.offsetX = 0; v.offsetY = 0;
          } else {
            this.arrive('foe');
          }
          this.current = null;
        }
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
        v.flash = 0; v.flashT = 0; v.clipY = null;
        if (a.side === 'player') this.displayExp = kin.exp;
        // With animations off the whole performance collapses onto its last
        // frame. sendOutFrame still runs there, so the cry and the arrival
        // both still happen -- those are information, not spectacle.
        if (!game.settings.battleAnimations) a.frames = 1;
        else audio.playSfx('vessel_throw');
        break;
      }
      case 'withdraw':
        if (!game.settings.battleAnimations) a.frames = 1;
        else audio.playSfx('vessel_throw');
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
        // The flicker outlasts the step that starts it, by design.
        this.view[a.side].flashT = game.settings.battleAnimations ? this.frames(22, game) : 0;
        break;
      case 'windup':
        // Anticipation. The move's own effect takes over the frame it starts,
        // so this is only the pull back in front of it -- a self-targeting move
        // braces rather than winding up at nobody.
        this.view[a.side].dashTo = a.self ? -1.4 : -3.2;
        break;
      case 'faint':
        audio.playSfx('faint');
        if (!game.settings.battleAnimations) a.frames = 1;
        break;
      case 'vessel':
        audio.playSfx('vessel_throw');
        if (!game.settings.battleAnimations) {
          // Still five beats, so the shake count stays legible; just no
          // performance around them.
          a.ph = { throw: 1, suck: 1, settle: 1, wobble: 2, finish: 2 };
          a.frames = 5 + a.shakes * 2;
        }
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
      enabled: !k.fainted && i !== this.battle.player.activeIndex,
    }));
    this.partyMenu.setItems(items, true);
    // The screen draws every kin at once, so the list must never scroll: a
    // scrolled index would stop lining up with the card it points at.
    this.partyMenu.visible = Math.max(1, items.length);
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
    let res = this.partyMenu.update(game);
    // The widget hit-tests against the rectangle it last drew itself into, and
    // this screen draws its own cards, so a click on one is resolved here.
    if (this.partyClick) {
      this.partyClick = false;
      if (res !== 'select') {
        audio.playSfx('confirm');
        res = 'select';
      }
    }
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

  /* ------------------------------------------------------- vessel beats */

  /** Everything a side looks like once it is simply stood on its pad. */
  private arrive(side: SideId): void {
    const v = this.view[side];
    v.visible = true; v.alpha = 1; v.ghost = 0; v.bloom = 0; v.clipY = null;
    v.offsetX = 0; v.offsetY = 0;
    this.capsule = null;
  }

  /**
   * Send-out.
   *
   * Throw, split, light, animal, vessel home -- five beats laid out as
   * overlapping ramps across one progress value rather than as five steps in
   * the queue, because they have to overlap: the capsule starts closing while
   * the creature is still solidifying, which is what stops the sequence reading
   * as a list of things that happened one after another.
   *
   * HOW THE CREATURE ARRIVES, and why it is not how it used to.
   *
   * It used to be grown out of the ground: the sprite was revealed by a source
   * rectangle that crept up from the feet, a whole design pixel at a time. That
   * was chosen to obey the rule that nothing is ever resampled -- a sprite drawn
   * at a fraction of its height lands its rows off the design grid and reads as
   * blur -- and on a flat generated silhouette it passed for growth. On drawn
   * artwork it does not. A hard horizontal line travelling up a detailed animal
   * is read by the eye as a CUT, and the player reported exactly that: it looks
   * like the kin falls in half.
   *
   * So nothing is cropped any more, at either end. The whole silhouette is
   * present from the first frame it exists and the only things that change are
   * how bright it is and how much colour it has: it fades up out of the cone as
   * pure white light with a glow around it, settles the last two pixels onto its
   * pad, and then the colour comes back into it from underneath. No edge crosses
   * the creature at any point -- which is also why the no-resampling rule costs
   * nothing here. There is no scale to snap to the grid because there is no
   * scale. See renderKin.
   */
  private sendOutFrame(side: SideId, t: number, frames: number): void {
    const v = this.view[side];
    const p = Math.min(1, t / frames);
    const home = THROW_FROM[side];
    const open = this.openPoint(side);
    const pad = side === 'player' ? PLAYER_PAD : FOE_PAD;

    const back = ramp(p, 0.84, 1);
    const pos = back > 0 ? arcTo(open, home, back) : arcTo(home, open, ramp(p, 0, 0.30));

    this.capsule = capsuleAt(pos.x, pos.y, {
      open: ramp(p, 0.30, 0.38) - ramp(p, 0.76, 0.86),
      beam: ramp(p, 0.31, 0.42) - ramp(p, 0.72, 0.86),
      beamTo: p > 0.30 && p < 0.86 ? { x: pad.x, y: pad.y } : null,
      spin: p < 0.30 ? p / 0.30 : 0,
      burst: pop(p, 0.30, 0.18),
      // Light striking the ground, on the beat the silhouette appears in it.
      land: pop(p, 0.36, 0.34),
    });

    v.offsetX = 0;
    v.clipY = null;
    // Poured, not stamped: it forms a couple of pixels high in the cone and
    // settles onto its feet. Whole logical pixels, so it stays on the grid.
    v.offsetY = -Math.round(2 * (1 - ramp(p, 0.48, 0.68)) * (p > 0.34 ? 1 : 0));
    v.alpha = ramp(p, 0.34, 0.52);
    v.ghost = 1 - ramp(p, 0.58, 0.82);
    // Brightest while it is still nothing but light, gone by the time it is
    // flesh: the halo is what makes the difference between arriving and simply
    // fading in.
    v.bloom = ramp(p, 0.34, 0.44) - ramp(p, 0.62, 0.84);
    v.visible = v.alpha > 0;

    // Keyed off the frame index rather than a latch, so a skip cannot leave a
    // cry owed. The max() is for the collapsed one-frame version.
    if (t === Math.max(1, Math.round(frames * 0.30))) audio.playSfx('send_out');
    if (t === Math.max(1, Math.round(frames * 0.66)) && v.kin) audio.playCry(v.kin.species);
  }

  /**
   * Recall: the send-out run backwards, beam first and creature last.
   *
   * The same rebuild as the arrival and for the same reason. It blanches into
   * its own silhouette where it stands, glows, lifts a few pixels toward the
   * open vessel and thins away. Nothing is cropped, so no edge travels across
   * the artwork.
   */
  private withdrawFrame(side: SideId, t: number, frames: number): void {
    const v = this.view[side];
    const p = Math.min(1, t / frames);
    const home = THROW_FROM[side];
    const open = this.openPoint(side);
    const pad = side === 'player' ? PLAYER_PAD : FOE_PAD;

    const back = ramp(p, 0.74, 1);
    const pos = back > 0 ? arcTo(open, home, back) : arcTo(home, open, ramp(p, 0, 0.22));

    this.capsule = capsuleAt(pos.x, pos.y, {
      open: ramp(p, 0.22, 0.30) - ramp(p, 0.62, 0.72),
      beam: ramp(p, 0.24, 0.34) - ramp(p, 0.62, 0.74),
      beamTo: p > 0.22 && p < 0.74 ? { x: pad.x, y: pad.y } : null,
      spin: p < 0.22 ? p / 0.22 : 0,
      burst: pop(p, 0.64, 0.16),
      land: pop(p, 0.30, 0.30),
    });

    v.offsetX = 0;
    v.clipY = null;
    v.ghost = ramp(p, 0.24, 0.42);
    // Drawn up the cone. Six pixels is enough to say "leaving" and little
    // enough that a heavy creature does not appear to jump.
    v.offsetY = -Math.round(6 * ramp(p, 0.40, 0.70));
    // The alpha trails the blanch so the light thins rather than snapping out,
    // and so the status panel -- which hides on alpha -- leaves with it.
    v.alpha = 1 - ramp(p, 0.46, 0.70);
    v.bloom = ramp(p, 0.22, 0.38) - ramp(p, 0.52, 0.72);
    v.visible = v.alpha > 0;

    if (t === Math.max(1, Math.round(frames * 0.24))) audio.playSfx('withdraw');
  }

  /**
   * Capture.
   *
   * The throw and the wobble were already here; what was missing was the part
   * that makes it read as a capture at all -- the beam that takes the kin, the
   * dissolve into the vessel, and either a burst on the click or the whole
   * thing given back. Walked as a countdown through the phase lengths rather
   * than as fractions of the total, because the number of wobbles varies.
   */
  private vesselFrame(a: Extract<Anim, { kind: 'vessel' }>): void {
    const v = this.view.foe;
    const ph = a.ph;
    const open = this.openPoint('foe');
    const pad = FOE_PAD;
    const rest = pad.y - 6;
    let t = a.t;

    if (t <= ph.throw) {
      const q = t / ph.throw;
      const at = arcTo(THROW_FROM.player, open, q);
      this.capsule = capsuleAt(at.x, at.y, { spin: q });
      return;
    }
    t -= ph.throw;

    if (t <= ph.suck) {
      const q = t / ph.suck;
      if (t === 1) audio.playSfx('withdraw');
      this.capsule = capsuleAt(open.x, open.y, {
        open: ramp(q, 0, 0.22) - ramp(q, 0.72, 0.94),
        beam: ramp(q, 0.04, 0.26) - ramp(q, 0.70, 0.92),
        beamTo: { x: pad.x, y: pad.y },
        // Spent by the end of the phase: the next one builds a fresh capsule
        // and a burst still running would be cut off mid-expansion.
        burst: pop(q, 0.72, 0.28),
        land: pop(q, 0.10, 0.30),
      });
      // Taken as light, exactly as a recall takes it: blanch, glow, lift, thin.
      // Never cropped -- a horizontal edge climbing a captured creature was the
      // same "falls in half" read as the send-out had.
      v.ghost = ramp(q, 0.04, 0.28);
      v.offsetY = -Math.round(6 * ramp(q, 0.22, 0.66));
      v.alpha = 1 - ramp(q, 0.36, 0.74);
      v.bloom = ramp(q, 0.04, 0.24) - ramp(q, 0.48, 0.72);
      v.visible = v.alpha > 0;
      return;
    }
    t -= ph.suck;

    v.visible = false;
    v.alpha = 0;
    v.bloom = 0;
    v.offsetY = 0;

    if (t <= ph.settle) {
      // Falls to the ground with the kin inside it, accelerating.
      const q = t / ph.settle;
      this.capsule = capsuleAt(open.x, Math.round(open.y + (rest - open.y) * q * q));
      return;
    }
    t -= ph.settle;

    const shaking = a.shakes * ph.wobble;
    if (t <= shaking) {
      const local = (t - 1) % ph.wobble;
      if (local === 0) audio.playSfx('vessel_shake');
      const q = local / ph.wobble;
      this.capsule = capsuleAt(
        pad.x + Math.round(Math.sin(q * Math.PI * 2) * 3),
        rest - Math.round(Math.sin(q * Math.PI) * 2),
      );
      return;
    }
    t -= shaking;

    const q = Math.min(1, t / ph.finish);
    if (a.caught) {
      if (t === 1) audio.playSfx('vessel_click');
      this.capsule = capsuleAt(pad.x, rest, { burst: pop(q, 0, 0.55) });
      return;
    }

    if (t === 1) audio.playSfx('vessel_break');
    // Given back. The vessel lifts off the ground as it splits, or the cone
    // would have ten units to travel and the kin would appear to grow out of
    // the lid rather than to be poured onto the pad.
    this.capsule = capsuleAt(pad.x, Math.round(rest + (open.y - rest) * ramp(q, 0, 0.22)), {
      open: ramp(q, 0, 0.18) - ramp(q, 0.62, 0.84),
      beam: ramp(q, 0.06, 0.26) - ramp(q, 0.62, 0.86),
      beamTo: { x: pad.x, y: pad.y },
      burst: pop(q, 0, 0.26),
      land: pop(q, 0.18, 0.32),
      tell: q > 0.7 ? '!' : null,
    });
    // Given back the same way it would have been sent out.
    v.offsetY = -Math.round(2 * (1 - ramp(q, 0.34, 0.56)) * (q > 0.18 ? 1 : 0));
    v.alpha = ramp(q, 0.18, 0.40);
    v.ghost = 1 - ramp(q, 0.44, 0.70);
    v.bloom = ramp(q, 0.18, 0.30) - ramp(q, 0.48, 0.72);
    v.visible = v.alpha > 0;
  }

  /* ------------------------------------------------------------ effects */

  /**
   * Where an effect happens to a side: on the creature's body.
   *
   * This used to be the geometric centre of the sprite FRAME, which was near
   * enough right while the generator filled the frame and is wrong now. Drawn
   * artwork is seated by its ink on the ground line, so cinderpaw's frame
   * centre is thirteen logical pixels above its actual middle and every effect
   * played over its head -- which is what the player reported. The generated
   * roster turns out to have the same problem in a quieter form: pebblet's ink
   * starts at design row 64, so its frame centre is a point in the sky.
   *
   * So both routes ask kinanchor for the real thing. A blow lands on mass.
   */
  private bodyPoint(side: SideId): { x: number; y: number } {
    const back = side === 'player';
    const pos = back ? PLAYER_SPRITE : FOE_SPRITE;
    const kin = this.view[side].kin;
    if (!kin) {
      const half = SPRITE_SIZE / DETAIL / 2;
      return { x: pos.x + half, y: pos.y + half * 0.9 };
    }
    const a = kinAnchor(kin.species, back);
    return { x: pos.x + a.hitX / DETAIL, y: pos.y + a.hitY / DETAIL };
  }

  /**
   * Where a side's vessel splits open.
   *
   * Over its own pad, and -- this is the measured part -- clear of the top of
   * whatever is arriving. A fixed thirty pixels above the pad put the two open
   * halves of the capsule in the middle of a short creature's chest, and light
   * that starts inside the thing it is delivering does not read as delivering
   * it.
   *
   * Both clamps are load-bearing. A very tall kin would otherwise push the
   * vessel off the top of the field -- or, for the player's side, up behind the
   * opponent's status panel, which is drawn over the field and would simply eat
   * it. The far clamp keeps some distance for the cone to travel down.
   */
  private openPoint(side: SideId): { x: number; y: number } {
    const pad = side === 'player' ? PLAYER_PAD : FOE_PAD;
    const back = side === 'player';
    const pos = back ? PLAYER_SPRITE : FOE_SPRITE;
    // The player's vessel rises over the pad that sits under the foe's panel.
    const ceiling = back ? FOE_BOX.y + FOE_BOX.h + 6 : 12;
    const kin = this.view[side].kin;
    if (!kin) return { x: pad.x, y: Math.max(ceiling, pad.y - OPEN_FALLBACK) };
    const top = pos.y + kinAnchor(kin.species, back).y0 / DETAIL;
    return { x: pad.x, y: Math.round(Math.max(ceiling, Math.min(pad.y - 22, top - 12))) };
  }

  /** Kick off a move's effect, anchored to each creature's body. */
  private startFx(side: SideId, anim: string, type: TypeId): void {
    const meta = registry.typeChart?.meta?.[type];
    const color = meta?.color ?? '#ffffff';

    const user = this.bodyPoint(side);
    const target = fxTargetsSelf(anim)
      ? user
      : this.bodyPoint(side === 'player' ? 'foe' : 'player');

    this.fxSide = side;
    this.fx.play(anim, user, target, color);
    audio.playSfx(sfxForAnim(anim));
  }

  /* ------------------------------------------------------------- render */

  render(game: Game, r: Renderer): void {
    r.camX = 0; r.camY = 0;
    // The field sits outside the shake; the pads go inside it with the
    // combatants, so the ground the creatures stand on moves with them.
    drawArena(r, this.opts.backdrop ?? 'highland', this.ticks, { pads: false });

    // The field shakes; the interface does not. Shaking the whole screen makes
    // text unreadable and reads as a bug rather than as force.
    const sx = this.fx.shakeX, sy = this.fx.shakeY;
    const c = r.bctx;
    c.save();
    if (sx || sy) c.translate(sx * DETAIL, sy * DETAIL);
    drawPads(r, this.opts.backdrop ?? 'highland');
    // The cone lands on the pad and the creature stands IN it, so the light
    // goes down before the sprite does. Drawn over the top -- which is where it
    // used to be -- it put a hard white stripe down the middle of whatever it
    // was delivering, and that is the last thing a materialise needs.
    this.renderBeam(r);
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
   * Idle breathing, as whole logical pixels of compression.
   *
   * A creature standing perfectly still is what makes a battle screen look like
   * a screenshot of itself. Two things about this are deliberate.
   *
   * **It is compression, not a lift.** The old cycle spent half its range
   * raising the whole sprite by a pixel, feet included, which is a hop rather
   * than a breath. Every pixel of movement now comes out of the lower body and
   * the feet never leave the pad.
   *
   * **Two pixels, not one.** The player asked for more movement and one pixel
   * on a sixty-four pixel creature is barely visible. The second pixel is only
   * available to a creature with the body depth to spare it -- see the `seams`
   * list in kinanchor, whose length is the deepest squash that species can take
   * -- so a small one still breathes a single pixel and does not stamp.
   *
   * The two sides run a little over half a cycle apart so they never pulse
   * together, which would read as one shared heartbeat rather than two animals.
   * Zero has to be the resting pose: a side whose clock is frozen sits at
   * idleT 0 and must not be caught mid-squash.
   */
  private breath(side: SideId): number {
    const v = this.view[side];
    const p = Math.sin(v.idleT / 26 + (side === 'foe' ? Math.PI * 1.15 : 0));
    return p < -0.75 ? 2 : p < -0.25 ? 1 : 0;
  }

  private renderKin(r: Renderer, side: SideId): void {
    const v = this.view[side];
    if (!v.visible || v.alpha <= 0) return;
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

    // Rounded to whole logical units, always: r.image snaps to the buffer, so a
    // fractional position would land the sprite's pixels on the odd row and
    // undo the whole 2x2 design grid.
    const x = Math.round(pos.x + v.offsetX + dash * face);
    const y = Math.round(pos.y + v.offsetY);
    const size = SPRITE_SIZE;

    /*
     * `clipY` cuts the sprite off at an absolute line on the field, which is
     * how a beaten kin sinks into its own pad rather than sliding off the
     * bottom of the screen. It is the one horizontal edge left in here, and it
     * is a piece of ground occluding a creature -- not an edge travelling
     * across one.
     */
    let drawH = size;
    if (v.clipY !== null) {
      drawH = Math.min(size, Math.max(0, Math.floor(v.clipY - y) * DETAIL));
      if (drawH <= 0) return;
    }

    /*
     * Squashing without scaling.
     *
     * Nothing in this game is ever resampled -- a sprite drawn at 63/64 height
     * would land half its rows off the design grid and read as blur. So the
     * compressed pose is a split blit instead: everything above a seam is
     * dropped a whole logical pixel onto the row below it and the source rows
     * at the seam are simply not drawn. The silhouette loses exactly one
     * design-grid step of height per seam, the feet stay planted, and every
     * pixel that survives is still exactly where the grid says.
     *
     * WHERE THE SEAMS GO is the part that was wrong. They used to sit at a
     * fixed 62% of the FRAME, which was mid-body on a generated sprite that
     * filled its cell and is 45% of the way UP a drawn one -- straight through
     * cinderpaw's chest and head. The head compressed and the legs did not
     * move, which is backwards, and the player said so. They are now measured
     * off the creature's own ink and sit low in its body, so a breath moves the
     * haunches and carries the skull as a rigid block.
     *
     * Only a whole, plainly-standing sprite is ever squashed: a clipped or
     * half-materialised one is drawn flat, and nothing is breathing during
     * either of those anyway.
     */
    const settled = drawH === size && v.clipY === null && v.ghost === 0
      && v.bloom === 0 && v.alpha >= 1;
    const anchor = kinAnchor(kin.species, back);
    const depth = settled ? Math.min(this.breath(side), anchor.seams.length) : 0;
    const seams = depth > 0 ? anchor.seams.slice(anchor.seams.length - depth) : [];

    const blit = (img: CanvasImageSource, alpha: number, ox = 0, oy = 0) => {
      if (seams.length === 0) {
        r.image(img, x + ox, y + oy, 0, 0, size, drawH, false, false, alpha);
        return;
      }
      let from = 0;
      let drop = seams.length;
      for (const seam of seams) {
        const h = seam - DETAIL - from;
        if (h > 0) {
          r.image(img, x + ox, y + oy + from / DETAIL + drop, 0, from, size, h, false, false, alpha);
        }
        from = seam;
        drop--;
      }
      r.image(img, x + ox, y + oy + from / DETAIL, 0, from, size, size - from, false, false, alpha);
    };

    const white = v.ghost > 0 || v.bloom > 0 || v.flash > 0
      ? whiteSprite(kin.species, back) : null;

    // The glow around a materialising kin. Three offset copies of its own
    // silhouette at low alpha -- cheap, on the grid, and the thing that makes
    // the difference between a creature arriving as light and a sprite fading
    // in. Nothing below the feet, so it never spills onto the pad.
    if (white && v.bloom > 0) {
      const a = Math.max(0, Math.min(1, v.alpha)) * v.bloom * 0.26;
      blit(white, a, -1, 0);
      blit(white, a, 1, 0);
      blit(white, a, 0, -1);
    }

    // Colour underneath, light over the top, and never both at part alpha: a
    // straight crossfade between the two leaves the backdrop showing through
    // the middle of the animal, and a half-transparent creature is a ghost
    // rather than one that is still forming. While it is pure light there is
    // no colour drawn at all; after that the colour is solid and the white
    // simply recedes off it.
    if (v.ghost < 1) blit(sprite, v.alpha);
    // The same white silhouette does three jobs: the light a kin arrives as,
    // the light it leaves as, and the blanching of a beaten one.
    if (white && v.ghost > 0) blit(white, v.alpha * v.ghost);

    if (white && v.flash > 0) {
      // A white silhouette over the sprite: the era's standard hit tell, and
      // far more readable than a translucent box.
      blit(white, 0.75);
    }
  }

  /** The half of the vessel's light that belongs behind the creature. */
  private renderBeam(r: Renderer): void {
    const c = this.capsule;
    if (!c || !c.beamTo) return;
    if (c.beam > 0) this.drawBeam(r, c, c.beamTo);
    if (c.land > 0) this.drawLanding(r, c.beamTo.x, c.beamTo.y, c.land, true);
  }

  private renderVessel(r: Renderer): void {
    const c = this.capsule;
    if (!c) return;
    if (c.land > 0 && c.beamTo) this.drawLanding(r, c.beamTo.x, c.beamTo.y, c.land, false);
    this.drawVesselIcon(r, c.x, c.y, c.open, c.spin);
    if (c.burst > 0) this.drawBurst(r, c.x, c.y, c.burst);
    if (c.tell) r.text(c.tell, c.x + 10, c.y - 22, { color: '#ffffff', shadow: '#000000' });
  }

  /**
   * Light striking the pad.
   *
   * Flat on purpose -- a pool that spreads outward along the ground and a ring
   * of sparks leaving it. It is deliberately not the starburst the vessel
   * itself throws: that one is an explosion at head height and would read as
   * the creature being hit rather than as it arriving. This one belongs to the
   * floor, so the eye reads the animal above it as standing in the light rather
   * than as being drawn on top of it.
   */
  private drawLanding(r: Renderer, x: number, y: number, k: number, behind: boolean): void {
    const q = Math.max(0, Math.min(1, k));
    const grow = 1 - q;
    const rad = 8 + grow * 22;
    if (behind) {
      // The pool goes under the feet, not over them.
      r.ellipsePixel(x * DETAIL, y * DETAIL, rad * DETAIL, rad * 0.32 * DETAIL,
        `rgba(255,252,226,${(0.42 * q).toFixed(3)})`);
      return;
    }
    const col = `rgba(255,248,208,${q.toFixed(3)})`;
    for (let i = 0; i < 10; i++) {
      const ang = (i / 10) * Math.PI * 2;
      r.rect(
        Math.round(x + Math.cos(ang) * rad * 1.15) - 1,
        Math.round(y + Math.sin(ang) * rad * 0.34) - 1 - Math.round(grow * 6),
        2, 2, col,
      );
    }
  }

  /**
   * The cone of light.
   *
   * Two nested wedges rather than one. A single flat triangle of white reads as
   * a rendering artefact; the hard core down the middle is what makes it read
   * as a beam with something travelling inside it. The pool on the ground is
   * there so the light has somewhere to land -- a cone that stops in mid-air
   * looks like it has been clipped.
   */
  private drawBeam(r: Renderer, c: Capsule, to: { x: number; y: number }): void {
    const k = Math.max(0, Math.min(1, c.beam));
    const span = Math.max(1, Math.round(to.y - c.y));
    const soft = `rgba(255,255,255,${(0.30 * k).toFixed(3)})`;
    const core = `rgba(255,252,224,${(0.85 * k).toFixed(3)})`;
    for (let i = 0; i <= span; i++) {
      const t = i / span;
      const x = Math.round(c.x + (to.x - c.x) * t);
      const wide = Math.max(1, Math.round((2 + t * 24) * k));
      r.rect(x - wide, c.y + i, wide * 2, 1, soft);
      const hot = Math.max(1, Math.round(wide * 0.34));
      r.rect(x - hot, c.y + i, hot * 2, 1, core);
    }
    r.ellipsePixel(to.x * DETAIL, to.y * DETAIL, 26 * k * DETAIL, 7 * k * DETAIL, soft);
  }

  /**
   * The vessel itself, as two halves that come apart.
   *
   * A tumbling one swaps its lit and dark bands instead of rotating: at eight
   * design pixels across there is nothing in a rotation to see, and rotating
   * would take the whole thing off the grid to say it.
   */
  private drawVesselIcon(r: Renderer, x: number, y: number, open = 0, spin = 0): void {
    const gap = Math.round(open * 5);
    const flipped = Math.floor(spin * 7) % 2 === 1;
    const lit = flipped ? '#8a6a34' : '#e0c07a';
    const dark = flipped ? '#e0c07a' : '#8a6a34';

    const ty = y - 4 - gap;
    r.rect(x - 4, ty, 8, 4, '#c8a05a');
    r.rect(x - 4, ty, 8, 2, lit);
    r.outline(x - 5, ty - 1, 10, 6, '#2a2018');

    const by = y + gap;
    r.rect(x - 4, by, 8, 4, '#c8a05a');
    r.rect(x - 4, by + 2, 8, 2, dark);
    r.outline(x - 5, by - 1, 10, 6, '#2a2018');

    if (gap === 0) r.rect(x - 1, y - 1, 2, 2, '#f4f0e0');
  }

  /** A one-shot starburst: a ring of sparks and a cross, expanding as it dies. */
  private drawBurst(r: Renderer, x: number, y: number, k: number): void {
    const rad = 3 + (1 - k) * 20;
    const col = `rgba(255,248,208,${k.toFixed(3)})`;
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      r.rect(
        Math.round(x + Math.cos(ang) * rad) - 1,
        Math.round(y + Math.sin(ang) * rad * 0.8) - 1,
        2, 2, col,
      );
    }
    const rx = Math.round(rad), ry = Math.round(rad * 0.8);
    r.rect(x - rx, y, rx * 2, 1, col);
    r.rect(x, y - ry, 1, ry * 2, col);
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
    if (this.phase === 'party' || this.phase === 'forcedSwitch') {
      this.renderPartyMenu(game, r);
      return;
    }
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
   * player stops reading the words and just goes for the red square.
   *
   * The selected tile lifts, brightens and takes a heavy dark ring; the other
   * three carry no outline at all. It used to be the other way round -- white
   * keyline on the choice, dark frames on everything else -- and three dark
   * boxes against one open square reads as three things ringed and one left
   * out, which is the opposite of what a cursor is for.
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
      if (selected) {
        // Two dark rings, one proud of the tile, so the keyline has real weight
        // against the colour underneath; the white line sits inside them and
        // lifts the dark off the face rather than competing with it.
        r.outline(x + 1, y + 1 - lift, cw - 2, ch - 2, UI.frame);
        r.outline(x + 2, y + 2 - lift, cw - 4, ch - 4, UI.frame);
        r.outline(x + 3, y + 3 - lift, cw - 6, ch - 6, 'rgba(255,255,255,0.8)');
      }

      const tw = r.textWidth(c.label);
      r.text(c.label, x + Math.round((cw - tw) / 2), y + Math.round(ch / 2) - 4 - lift, {
        color: '#ffffff', shadow: 'rgba(0,0,0,0.45)',
      });

      if (hovered && game.input.mouse.leftPressed && enabled) this.actionMenu.index = i;
    });
  }

  /**
   * Move list and the detail panel beside it.
   *
   * Boxed rows in three columns -- type, name, PP -- so four moves scan as a
   * table rather than as four lines of text, with the selected row taking the
   * same dark keyline the command pad uses.
   *
   * The panel is laid out from one padded inner rectangle, and everything in it
   * is measured against that. The version before this one placed each element
   * at a hand-picked offset from the frame, which is how the type name ended up
   * against the edge of its own chip and the two bars ended up against the
   * border: nothing had a stated width, so nothing could be told it had run out
   * of room.
   */
  private renderMoveMenu(r: Renderer): void {
    const kin = this.view.player.kin ?? this.battle.player.active;
    const listW = 138;
    const rowH = 10;
    const rowX = MSG.x + 5;
    const rowW = listW - 10;
    const ppCol = 32;

    for (let i = 0; i < 4; i++) {
      const y = MSG.y + 3 + i * rowH;
      const slot = kin.moves[i];
      if (!slot) {
        // An empty slot still gets its box, or the list loses its shape and the
        // four rows stop reading as four rows.
        r.rect(rowX, y, rowW, rowH - 1, UI.fillDim);
        r.outline(rowX, y, rowW, rowH - 1, UI.shade);
        r.text('--', rowX + 12, y + 1, { color: UI.shade });
        continue;
      }
      const md = registry.moves.get(slot.id);
      const meta = md ? registry.typeChart?.meta?.[md.type] : undefined;
      const sel = this.moveMenu.index === i;
      const out = slot.pp <= 0;

      r.rect(rowX, y, rowW, rowH - 1, sel ? '#dbe6fb' : UI.fillDim);
      r.outline(rowX, y, rowW, rowH - 1, sel ? UI.frame : UI.shade);

      r.rect(rowX + 3, y + 2, 5, 5, out ? '#98a0b4' : (meta?.color ?? '#888'));
      r.outline(rowX + 3, y + 2, 5, 5, UI.frame);

      // Clipped against the PP column rather than allowed to run into it: a
      // long move name would otherwise print straight through the divider.
      const full = md?.name ?? slot.id;
      let name = full;
      const room = rowW - 14 - ppCol;
      while (name.length > 1 && r.textWidth(name) > room) name = name.slice(0, -1);
      if (name !== full) name = name.slice(0, -1) + '..';
      r.text(name, rowX + 12, y + 1, { color: out ? '#98a0b4' : UI.ink });

      r.rect(rowX + rowW - ppCol - 4, y + 2, 1, rowH - 5, UI.shade);
      r.text(`${slot.pp}/${slot.maxPp}`, rowX + rowW - 4, y + 1, {
        color: out ? '#c05048' : UI.inkSoft, align: 'right',
      });
      if (sel) r.cursor(MSG.x + 1, y, UI.frame);
    }

    const slot = kin.moves[this.moveMenu.index];
    const md = slot ? registry.moves.get(slot.id) : undefined;
    const px = MSG.x + listW;
    const pw = MSG.w - listW - 4;
    r.window(px, MSG.y + 4, pw, MSG.h - 8, {
      fill: UI.fillDim, border: UI.frame, highlight: UI.shade,
    });
    if (!md) return;

    const ix = px + 5;
    const iw = pw - 10;
    const catW = 32;
    const typeW = iw - catW - 3;
    const chipY = MSG.y + 8;

    const meta = registry.typeChart?.meta?.[md.type];
    r.rect(ix, chipY, typeW, 11, meta?.color ?? '#888');
    r.outline(ix, chipY, typeW, 11, UI.frame);
    let typeName = (meta?.name ?? md.type).toUpperCase();
    while (typeName.length > 1 && r.textWidth(typeName) > typeW - 6) {
      typeName = typeName.slice(0, -1);
    }
    r.text(typeName, ix + Math.round((typeW - r.textWidth(typeName)) / 2), chipY + 2, {
      color: '#ffffff', shadow: 'rgba(0,0,0,0.45)',
    });

    // The category earns a chip of its own rather than a line of grey text: it
    // is the second thing a player checks and it should be found by shape.
    const cat = md.category === 'physical' ? 'PHYS' : md.category === 'special' ? 'SPEC' : 'STAT';
    const catC = md.category === 'physical' ? '#c8663c'
      : md.category === 'special' ? '#5a72c0' : '#7a8298';
    const catX = ix + typeW + 3;
    r.rect(catX, chipY, catW, 11, catC);
    r.outline(catX, chipY, catW, 11, UI.frame);
    r.text(cat, catX + Math.round((catW - r.textWidth(cat)) / 2), chipY + 2, {
      color: '#ffffff', shadow: 'rgba(0,0,0,0.45)',
    });

    const statRow = (label: string, y: number, value: number, max: number, color: string) => {
      r.text(label, ix, y, { color: UI.inkSoft });
      if (value >= 0) {
        r.meter(ix + 20, y + 1, iw - 40, 5, Math.min(1, value / max), color, '#c2cade', UI.frame);
      }
      r.text(value >= 0 ? String(value) : '--', ix + iw, y, { color: UI.ink, align: 'right' });
    };
    statRow('PWR', MSG.y + 22, md.power > 0 ? md.power : -1, 140, '#e07048');
    statRow('ACC', MSG.y + 32, md.accuracy >= 0 ? md.accuracy : -1, 100, '#58a8e0');
  }

  /**
   * The switch screen.
   *
   * A full-field takeover rather than a list crammed into the message box.
   * That is what it was: six rows eleven units tall inside a box forty-six
   * units deep, so a full party ran a clear foot past the bottom of the screen
   * and the only picture on it was one icon bolted to the side.
   *
   * Slot one gets the big card and the rest get rows, which is the same shape
   * the party screen outside battle uses, and every one of them carries its own
   * portrait, level, bar and status -- a switch is a decision about numbers and
   * they all have to be on screen at once for it to be one.
   */
  private renderPartyMenu(game: Game, r: Renderer): void {
    const party = this.battle.player.party;
    r.rect(0, 0, SCREEN_W, SCREEN_H, '#3c4664');
    for (let y = 0; y < SCREEN_H; y += 4) r.rect(0, y, SCREEN_W, 1, '#424d6e');

    for (let i = 0; i < Math.min(6, party.length); i++) this.renderPartyCard(game, r, i);

    r.window(2, 132, SCREEN_W - 4, 26, { fill: UI.fill, border: UI.frame, highlight: UI.shade });
    // No "press X to go back" hint: cancel does that on every other list in
    // the game without being told to, and the keys are rebindable anyway.
    r.text(this.phase === 'forcedSwitch'
      ? 'Which kin will you send out?'
      : 'Choose a kin to switch in.', 8, 140, { color: UI.ink });
  }

  private partyCardRect(i: number): { x: number; y: number; w: number; h: number } {
    if (i === 0) return { x: 3, y: 3, w: 92, h: 126 };
    return { x: 99, y: 3 + (i - 1) * 25, w: 138, h: 23 };
  }

  private renderPartyCard(game: Game, r: Renderer, i: number): void {
    const kin = this.battle.player.party[i];
    if (!kin) return;
    const c = this.partyCardRect(i);
    const sel = this.partyMenu.index === i;
    const active = i === this.battle.player.activeIndex;
    const down = kin.fainted;
    const usable = this.partyMenu.items[i]?.enabled !== false;

    // Hovering moves the cursor, the same as it does on the command pad, so
    // the two input methods never disagree about what is selected.
    const hovered = game.input.mouseOver(c.x, c.y, c.w, c.h);
    if (hovered && game.input.mouse.idleFrames < 2 && usable) this.partyMenu.index = i;
    if (hovered && game.input.mouse.leftPressed && usable) {
      this.partyMenu.index = i;
      this.partyClick = true;
    }

    const fill = down ? '#c6cad6' : sel ? '#eef3fd' : '#d8def0';
    r.window(c.x, c.y, c.w, c.h, {
      fill, border: UI.frame, highlight: sel ? '#8fa8d8' : UI.shade,
    });
    if (sel) {
      // Dark ring on the card you are on and nothing on the ones you are not,
      // matching the command pad. Same rule, same reason.
      r.outline(c.x - 1, c.y - 1, c.w + 2, c.h + 2, UI.frame);
      r.outline(c.x + 2, c.y + 2, c.w - 4, c.h - 4, 'rgba(255,255,255,0.75)');
    }

    const frac = Math.max(0, kin.currentHp / Math.max(1, kin.maxHp));
    const hpC = frac > 0.5 ? UI.hpGood : frac > 0.2 ? UI.hpWarn : UI.hpBad;
    const ink = down ? '#6e7488' : UI.ink;
    const art = down ? 0.4 : 1;

    if (i === 0) {
      r.image(frontSprite(kin.species), c.x + Math.floor((c.w - 64) / 2), c.y + 4,
        0, 0, SPRITE_SIZE, SPRITE_SIZE, false, false, art);
      const tx = c.x + 6;
      const rx = c.x + c.w - 6;
      this.partyName(r, kin.name, tx, c.y + 73, rx - tx - r.textWidth(`Lv${kin.level}`) - 4, ink);
      r.text(`Lv${kin.level}`, rx, c.y + 73, { color: ink, align: 'right' });
      r.text('HP', tx, c.y + 84, { color: UI.inkSoft });
      r.meter(tx + 16, c.y + 85, c.w - 12 - 16, 6, frac, hpC, UI.hpBack, UI.frame);
      r.text(`${kin.currentHp}/${kin.maxHp}`, rx, c.y + 94, { color: ink, align: 'right' });
      this.partyChip(r, kin, tx, c.y + 105, down);
      if (active) this.partyBadge(r, c.x + 5, c.y + 5);
      return;
    }

    // The icon is cropped to the row height rather than scaled, so it stays on
    // the pixel grid. Icons are built bottom-aligned on their own ground line,
    // so the crop comes almost entirely off the headroom at the top -- take it
    // off the bottom instead and the row shows a creature with no feet.
    r.image(iconSprite(kin.species), c.x + 3, c.y + 2, 0, 18, ICON_SIZE, 38, false, false, art);
    const tx = c.x + 38;
    const rx = c.x + c.w - 6;
    this.partyName(r, kin.name, tx, c.y + 3, rx - tx - r.textWidth(`Lv${kin.level}`) - 4, ink);
    r.text(`Lv${kin.level}`, rx, c.y + 3, { color: ink, align: 'right' });
    r.meter(tx, c.y + 14, 44, 5, frac, hpC, UI.hpBack, UI.frame);
    r.text(`${kin.currentHp}/${kin.maxHp}`, rx, c.y + 13, { color: ink, align: 'right' });
    // Both tags ride the portrait, top and bottom, so the text columns beside
    // it keep their full width whether a kin is carrying one or not.
    this.partyChip(r, kin, c.x + 3, c.y + c.h - 11, down);
    if (active) this.partyBadge(r, c.x + 3, c.y + 2);
  }

  /** A nickname is player-supplied, so it is measured against its column. */
  private partyName(r: Renderer, name: string, x: number, y: number, room: number, ink: string): void {
    let text = name;
    while (text.length > 1 && r.textWidth(text) > room) text = text.slice(0, -1);
    if (text !== name) text = text.slice(0, -1) + '..';
    r.text(text, x, y, { color: ink });
  }

  /** Fainted beats status: a kin at zero has nothing else worth reporting. */
  private partyChip(r: Renderer, kin: Kin, x: number, y: number, down: boolean): void {
    if (down) {
      r.rect(x, y, 20, 9, '#8a4048');
      r.outline(x, y, 20, 9, '#282838');
      r.text('FNT', x + 2, y + 1, { color: '#ffffff' });
      return;
    }
    if (kin.status !== 'none') this.renderStatusChip(r, x, y, kin.status);
  }

  /** The kin that is out. Marked, not selectable -- it is already in the fight. */
  private partyBadge(r: Renderer, x: number, y: number): void {
    r.rect(x, y, 20, 9, '#3f7cc0');
    r.outline(x, y, 20, 9, '#282838');
    r.text('OUT', x + 2, y + 1, { color: '#ffffff' });
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
