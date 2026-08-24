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
import { kinBreath } from '../gfx/kinbreath.js';
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
  from: { x: number; y: number }, to: { x: number; y: number }, p: number, lift = 30,
): { x: number; y: number } {
  return {
    x: Math.round(from.x + (to.x - from.x) * p),
    y: Math.round(from.y + (to.y - from.y) * p - Math.sin(p * Math.PI) * lift),
  };
}

/**
 * Two earlier points on the same arc, for the flight trail.
 *
 * Sampled rather than recorded, because the alternative is a ring buffer that
 * has to be cleared every time the vessel teleports between beats -- and it
 * teleports three times in a capture.
 */
function arcTrail(
  from: { x: number; y: number }, to: { x: number; y: number }, p: number, lift = 30,
): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (const back of [0.055, 0.115]) {
    const q = p - back;
    if (q <= 0) break;
    out.push(arcTo(from, to, q, lift));
  }
  return out;
}

/** Decelerating: a thrown thing arrives, it does not stop dead. */
function easeOut(x: number): number {
  return 1 - (1 - x) * (1 - x);
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
  /** Tumble phase across a throw, 0..1 per revolution and free to exceed 1. */
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
  /**
   * Where the vessel has just been, newest first.
   *
   * A thing that crosses a 240-unit screen in a quarter of a second is on any
   * given pixel for one frame, and one frame of an eight-pixel object is not a
   * throw -- it is a flicker. The trail is what makes the flight legible, and
   * it is the cheapest possible version: the same icon, smaller and fainter, at
   * two earlier points on the same arc.
   */
  trail: { x: number; y: number }[];
  /**
   * Phase of the light running along the cone. Signed: increasing pours light
   * DOWN the beam for a send-out, decreasing draws it UP for a recall.
   *
   * Without it the cone is a static white wedge, and a static wedge is a shape
   * sitting between two objects rather than something moving between them.
   */
  flow: number;
  /** A flare cross at the vessel, one-shot, on the frame it splits. */
  flare: number;
  /** Feet arriving on the pad: a low ring of dust, one-shot. */
  dust: number;
  /** The failure mark, drawn above the vessel. */
  tell: string | null;
}

function capsuleAt(x: number, y: number, o: Partial<Capsule> = {}): Capsule {
  return {
    x, y, open: 0, beam: 0, beamTo: null, spin: 0, burst: 0, land: 0,
    trail: [], flow: 0, flare: 0, dust: 0, tell: null, ...o,
  };
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
  | { kind: 'levelUp'; kin: Kin; level: number; frames: number; t: number }
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
  /**
   * The level the player's panel is CURRENTLY showing, which lags the kin's
   * real level until the level-up animation gets to it.
   *
   * Without this the number changed the instant the engine resolved the turn --
   * so the "grew to level 15" line arrived under a panel that had said Lv15 for
   * a second already -- and the experience bar was measured against a band the
   * kin had not visibly reached yet, so it emptied and refilled in one frame
   * instead of running up to the top and starting again. One number fixes both.
   */
  private displayLevel = 0;
  /**
   * The level-up flourish, counted down by update() rather than by the queue
   * step that starts it, so the rings and the glow are still going while the
   * line types underneath them. Nothing waits for it.
   */
  private levelFx = 0;
  private levelFxLen = 1;
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
  /**
   * The closing transition. -1 until the player has acknowledged the result;
   * after that it counts up, and the scene pops when it runs out.
   *
   * It is deliberately not the intro run backwards. The way in is a pair of
   * shutters, which is a shape that says "something is starting"; the way out
   * has to say the opposite, and an aperture closing on the field and pinching
   * the last of it into a line is the plainest way to say it. See renderOutro.
   */
  private outroT = -1;
  private readonly outroLen = 44;
  /** The winner's little celebration, in frames remaining. */
  private cheer = 0;
  private cheerLen = 1;
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
    this.displayLevel = this.battle.player.active.level;

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
          // Longer than they were. Both performances now have a hold in them
          // and a beat where the vessel shuts, and neither of those survives
          // being squeezed into the old budget -- an anticipation beat that
          // lasts one frame is not an anticipation beat.
          this.queue.push(e.t === 'sendOut'
            ? { kind: 'sendOut', side: e.side, frames: this.frames(60, game), t: 0 }
            : { kind: 'withdraw', side: e.side, frames: this.frames(46, game), t: 0 });
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
        case 'levelUp': {
          // The engine puts the announcement AFTER the event, and a level-up
          // that is announced before anything happens is the version the player
          // said breezes past. So the flourish goes first, the line is lifted
          // out of the event list and queued behind it, and the line is held a
          // good long time -- the glow is still running underneath it.
          const next = events[i + 1];
          const line = next && next.t === 'message'
            ? next.text : `${e.kin.name} grew to level ${e.level}!`;
          if (next && next.t === 'message') i++;
          this.queue.push({
            kind: 'levelUp', kin: e.kin, level: e.level,
            frames: this.frames(26, game), t: 0,
          });
          this.pushText(line, game, 52);
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

    // Once the aperture is closing, nothing else in the scene matters. The
    // queue is empty by then and the simulation is over; all that is left is to
    // finish the picture and hand control back.
    if (this.outroT >= 0) {
      this.outroT++;
      this.cheerStep();
      if (this.outroT >= this.outroLen + 5) {
        game.scenes.pop();
        this.opts.onFinish(this.battle.result ?? 'win', this.battle);
      }
      return;
    }

    if (this.introWipe < this.introFrames) this.introWipe++;
    this.fx.update();
    // Hit-stop freezes the whole presentation, not just the particles: a blow
    // that stops the sparks but keeps draining the HP bar reads as a dropped
    // frame rather than as impact.
    if (this.fx.hitStop > 0) return;
    this.lowHpWarning(game);

    this.levelStep();

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
        this.cheerStep();
        // The result line is still on screen and the winner is still stood
        // there celebrating; the press is the player saying they have read it.
        // Only then does the field close -- and the closing is a beat of its
        // own now, not the frame the scene disappears on.
        if (game.input.pressed('confirm') || game.input.mouse.leftPressed) {
          this.outroT = 0;
          audio.playSfx('battle_swoosh');
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
   * The level-up flourish, one frame on.
   *
   * The only thing it touches on the creature itself is `bloom`, which is the
   * halo channel the materialise already uses -- three offset copies of the
   * sprite's own white silhouette. Borrowing it means a levelling kin glows
   * with its own outline rather than being covered by a shape drawn near it,
   * and it costs nothing new. Colour is never replaced: `ghost` stays at zero
   * throughout, so the creature is plainly itself with light coming off it.
   */
  private levelStep(): void {
    if (this.levelFx <= 0) return;
    this.levelFx--;
    const v = this.view.player;
    // The moment anything else has taken hold of the sprite -- a recall, a
    // knockout, a capture -- the flourish is over. It is a reward, not a claim.
    if (!v.visible || v.alpha < 1 || v.ghost > 0 || v.clipY !== null) {
      this.levelFx = 0;
      v.bloom = 0;
      return;
    }
    const p = 1 - this.levelFx / this.levelFxLen;
    v.bloom = Math.max(0, ramp(p, 0, 0.09) - ramp(p, 0.40, 0.92)) * 0.95;
    if (this.levelFx === 0) v.bloom = 0;
  }

  /**
   * The winner's hop.
   *
   * Two of them, the second smaller than the first, off the same eased arc a
   * jump uses everywhere else in the game. It is applied as offsetY, which
   * nothing else is writing by this point -- the queue is empty and the battle
   * is over -- and it deliberately does not stop the breathing underneath it.
   */
  private cheerStep(): void {
    if (this.cheer <= 0) return;
    this.cheer--;
    const v = this.view.player;
    if (!v.visible || !v.kin || v.kin.currentHp <= 0) { this.cheer = 0; v.offsetY = 0; return; }
    const p = 1 - this.cheer / this.cheerLen;
    // Two arcs, the first over the opening 45% and the second, shorter, after.
    const first = ramp(p, 0, 0.45);
    const second = ramp(p, 0.50, 0.86);
    const a = first > 0 && first < 1 ? Math.sin(first * Math.PI) * 6 : 0;
    const b = second > 0 && second < 1 ? Math.sin(second * Math.PI) * 3 : 0;
    v.offsetY = -Math.round(Math.max(a, b));
    if (this.cheer === 0) v.offsetY = 0;
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
      case 'levelUp': {
        a.t++;
        // Short on the queue on purpose. This step only owns the beat between
        // the burst and the line that names it; the flourish itself is on the
        // scene's own clock and outlives the step by a second.
        if (a.t >= a.frames || skip) this.current = null;
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
        // The winner gets a moment. Two hops and its own cry is the whole of
        // it -- a fight that simply stops the instant the last HP is gone has
        // no punctuation, and the player asked for punctuation.
        const v = this.view.player;
        if (this.battle.result === 'win' && game.settings.battleAnimations
          && v.visible && v.kin && v.kin.currentHp > 0) {
          this.cheerLen = this.frames(52, game);
          this.cheer = this.cheerLen;
          audio.playCry(v.kin.species);
        }
        this.phase = 'finished';
        this.current = null;
        this.queue.length = 0;
        break;
      }
    }
  }

  private onAnimStart(a: Anim, game: Game): void {
    // Anything that takes the creature off its pad owns the glow channel from
    // here on, so a flourish still running is dropped rather than fought over.
    if (a.kind === 'sendOut' || a.kind === 'withdraw' || a.kind === 'faint'
      || a.kind === 'vessel') {
      // The glow has to be put back too, and not only when the step is about
      // the player's own side: a second foe walking on while the flourish is
      // still running would otherwise leave the player's kin lit for the rest
      // of the fight -- and a kin with bloom on it never breathes again.
      this.levelFx = 0;
      this.view.player.bloom = 0;
    }
    switch (a.kind) {
      case 'levelUp': {
        // A benched participant can level too. It gets the line and the sound
        // and nothing else -- there is no sprite on the field to put a ring
        // around, and moving the panel's number would be a lie.
        const shown = this.view.player.kin === a.kin;
        if (shown) this.displayLevel = a.level;
        audio.playSfx('levelup');
        if (shown && game.settings.battleAnimations) {
          // Deliberately NOT scaled all the way down by the speed setting. Fast
          // battles are a request to skip the waiting, not a request to be
          // denied the one moment in a fight that is purely a reward, and the
          // cue itself runs the better part of a second whatever the setting.
          this.levelFxLen = Math.max(58, this.frames(84, game));
          this.levelFx = this.levelFxLen;
        } else {
          a.frames = 1;
        }
        break;
      }
      case 'sendOut': {
        const kin = a.side === 'player' ? this.battle.player.active : this.battle.foe.active;
        const v = this.view[a.side];
        v.kin = kin;
        v.displayHp = kin.currentHp;
        // A fresh kin arrives square on its pad and takes its first breath
        // there, rather than inheriting whatever the last one was mid-flinch.
        v.dash = 0; v.dashV = 0; v.dashTo = 0; v.idleT = 0;
        v.flash = 0; v.flashT = 0; v.clipY = null;
        if (a.side === 'player') { this.displayExp = kin.exp; this.displayLevel = kin.level; }
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

  /**
   * The order the switch screen lays the party out in: whoever is out, first.
   *
   * The player asked for this and they are right. The big card on the left is
   * the only slot on the screen with a full portrait on it, and until now it
   * held party slot one -- which after two switches is very often a kin that is
   * asleep in the back of the bag. A switch is a comparison, and the thing you
   * are comparing everything AGAINST is the one currently taking the hits, so
   * that is what belongs in the slot you can actually see.
   *
   * Nothing else reorders. This is a view of the party, not a change to it, so
   * the values on the menu items stay real party indices and the engine is
   * never told about any of this.
   */
  private partyOrder(): number[] {
    const party = this.battle.player.party;
    const active = this.battle.player.activeIndex;
    const order: number[] = [];
    if (party[active]) order.push(active);
    for (let i = 0; i < party.length; i++) if (i !== active && party[i]) order.push(i);
    return order;
  }

  private buildPartyMenu(): void {
    const party = this.battle.player.party;
    const items: MenuItem<number>[] = this.partyOrder().map((idx) => ({
      label: party[idx]!.name,
      value: idx,
      enabled: !party[idx]!.fainted && idx !== this.battle.player.activeIndex,
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

    /*
     * THE SHAPE OF THE SEQUENCE, and where the beats are.
     *
     *   .00 - .24   the throw. Fast, decelerating into the stop, with a trail.
     *   .24 - .30   the hold. Six per cent of nothing, which is the single
     *               cheapest thing in here: a vessel that stops and hangs for
     *               three frames before it opens gives the eye somewhere to be
     *               when the burst happens. Without it the flight and the flash
     *               are one event and neither is legible.
     *   .30         the split, the burst, the flare.
     *   .32 - .58   the pour. Light runs down the cone, the pool spreads.
     *   .38 - .56   the silhouette arrives inside it and brightens.
     *   .56 - .80   colour comes back and it settles onto its feet.
     *   .70         the feet land: dust.
     *   .74 - .84   the vessel shuts.
     *   .82 - 1.0   the vessel goes home, faster and flatter than it came.
     */
    const back = ramp(p, 0.82, 1);
    const fly = easeOut(ramp(p, 0, 0.24));
    const pos = back > 0
      ? arcTo(open, home, back, 20)
      : arcTo(home, open, fly, 32);
    const trail = back > 0
      ? arcTrail(open, home, back, 20)
      : arcTrail(home, open, fly, 32);

    // A one-frame cock upward the instant before it opens. Anticipation is the
    // difference between a lid coming off and a lid having come off.
    const cock = p >= 0.26 && p < 0.30 ? 1 : 0;

    this.capsule = capsuleAt(pos.x, pos.y - cock, {
      trail: p > 0.02 ? trail : [],
      open: ramp(p, 0.30, 0.35) - ramp(p, 0.74, 0.84),
      beam: ramp(p, 0.31, 0.40) - ramp(p, 0.70, 0.82),
      beamTo: p > 0.30 && p < 0.84 ? { x: pad.x, y: pad.y } : null,
      // Three and a bit turns on the way out and one and a bit on the way back:
      // enough to read as tumbling, few enough that the phases are separable.
      spin: back > 0 ? 1.4 * back : 3.4 * ramp(p, 0, 0.24),
      burst: pop(p, 0.30, 0.20),
      flare: pop(p, 0.30, 0.11),
      flow: p * 7,
      // Light striking the ground, on the beat the silhouette appears in it.
      land: pop(p, 0.34, 0.32),
      dust: pop(p, 0.70, 0.26),
    });

    v.offsetX = 0;
    v.clipY = null;
    // Poured, not stamped: it forms a few pixels high in the cone and settles
    // onto its feet. Whole logical pixels, so it stays on the grid.
    v.offsetY = -Math.round(3 * (1 - ramp(p, 0.52, 0.70)) * (p > 0.36 ? 1 : 0));
    v.alpha = ramp(p, 0.36, 0.50);
    v.ghost = 1 - ramp(p, 0.56, 0.80);
    // Brightest while it is still nothing but light, gone by the time it is
    // flesh: the halo is what makes the difference between arriving and simply
    // fading in.
    v.bloom = ramp(p, 0.36, 0.44) - ramp(p, 0.60, 0.82);
    v.visible = v.alpha > 0;

    // Keyed off the frame index rather than a latch, so a skip cannot leave a
    // cry owed. The max() is for the collapsed one-frame version.
    if (t === Math.max(1, Math.round(frames * 0.30))) audio.playSfx('send_out');
    if (t === Math.max(1, Math.round(frames * 0.70)) && v.kin) audio.playCry(v.kin.species);
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

    /*
     * The send-out with every arrow reversed, and reversed properly rather than
     * merely reordered. The light in the cone runs UPWARD -- `flow` counts down
     * -- the creature is lifted rather than settled, and the burst is at the
     * END, on the vessel, because the thing that happens last in a recall is a
     * capsule swallowing something and shutting.
     *
     *   .00 - .18   the vessel arrives, on a flatter, faster arc than a throw.
     *   .20         it opens. No burst here: it is receiving, not delivering.
     *   .22 - .60   the cone; the creature blanches, glows and is drawn up it.
     *   .60         the catch: a burst at the vessel and the light snuffs out.
     *   .62 - .72   it shuts.
     *   .74 - 1.0   it goes home.
     */
    const back = ramp(p, 0.74, 1);
    const fly = easeOut(ramp(p, 0, 0.18));
    const pos = back > 0 ? arcTo(open, home, back, 20) : arcTo(home, open, fly, 26);
    const trail = back > 0 ? arcTrail(open, home, back, 20) : arcTrail(home, open, fly, 26);

    this.capsule = capsuleAt(pos.x, pos.y, {
      trail: p > 0.02 ? trail : [],
      open: ramp(p, 0.20, 0.27) - ramp(p, 0.62, 0.72),
      beam: ramp(p, 0.22, 0.32) - ramp(p, 0.56, 0.64),
      beamTo: p > 0.20 && p < 0.70 ? { x: pad.x, y: pad.y } : null,
      spin: back > 0 ? 1.4 * back : 2.6 * ramp(p, 0, 0.18),
      burst: pop(p, 0.60, 0.18),
      flare: pop(p, 0.60, 0.10),
      // Negative: the bands climb the cone instead of falling down it.
      flow: -p * 7,
      land: pop(p, 0.26, 0.26),
    });

    v.offsetX = 0;
    v.clipY = null;
    v.ghost = ramp(p, 0.22, 0.40);
    // Drawn up the cone. Eight pixels is enough to say "leaving the ground" and
    // little enough that a heavy creature does not appear to jump.
    v.offsetY = -Math.round(8 * ramp(p, 0.36, 0.62));
    // The alpha trails the blanch so the light thins rather than snapping out,
    // and so the status panel -- which hides on alpha -- leaves with it.
    v.alpha = 1 - ramp(p, 0.42, 0.60);
    v.bloom = ramp(p, 0.20, 0.34) - ramp(p, 0.46, 0.62);
    v.visible = v.alpha > 0;

    if (t === Math.max(1, Math.round(frames * 0.20))) audio.playSfx('withdraw');
    if (t === Math.max(1, Math.round(frames * 0.62))) audio.playSfx('vessel_click');
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
      const at = arcTo(THROW_FROM.player, open, easeOut(q), 34);
      this.capsule = capsuleAt(at.x, at.y, {
        spin: 3.4 * q,
        trail: arcTrail(THROW_FROM.player, open, easeOut(q), 34),
      });
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
        // Upward, like a recall: this is a recall, of somebody else's kin.
        // Leaving it at zero would freeze the bands in the cone as three static
        // stripes, which is worse than having no bands at all.
        flow: -q * 6,
        // Spent by the end of the phase: the next one builds a fresh capsule
        // and a burst still running would be cut off mid-expansion.
        burst: pop(q, 0.72, 0.28),
        flare: pop(q, 0.72, 0.12),
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
      this.capsule = capsuleAt(pad.x, rest, {
        burst: pop(q, 0, 0.55), flare: pop(q, 0, 0.16),
      });
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
      flow: q * 6,
      burst: pop(q, 0, 0.26),
      flare: pop(q, 0, 0.12),
      land: pop(q, 0.18, 0.32),
      dust: pop(q, 0.52, 0.26),
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
    this.renderLevelUp(r, true);
    this.renderKin(r, 'foe');
    this.renderKin(r, 'player');
    this.renderLevelUp(r, false);
    this.fx.render(r);
    this.renderVessel(r);
    c.restore();

    // A negative flash is a dim rather than a bloom, which is how the dark
    // effects land without washing the screen out.
    if (this.fx.flash > 0) r.tint(this.fx.flashColor, this.fx.flash);
    else if (this.fx.flash < 0) r.tint('#000000', -this.fx.flash);

    // One short warm pulse on the frame the level lands, and nothing after it.
    // A tint that outstays its welcome washes the panels out and the panels are
    // where the number the player is being shown actually is.
    if (this.levelFx > 0) {
      const lp = 1 - this.levelFx / this.levelFxLen;
      const k = Math.max(0, ramp(lp, 0, 0.04) - ramp(lp, 0.06, 0.22)) * 0.40;
      if (k > 0) r.tint('#fff4c0', k);
    }

    this.renderInfo(r, 'foe');
    this.renderInfo(r, 'player');
    if (this.levelFx > 0) this.renderLevelBanner(r, 1 - this.levelFx / this.levelFxLen);
    this.renderMessage(game, r);

    // The overworld left the screen closed; run the same shape backwards so
    // the two halves read as one continuous move.
    if (this.introWipe < this.introFrames) {
      drawShutters(r, 1 - this.introWipe / this.introFrames);
    }
    this.renderOutro(r);
  }

  /**
   * The way out.
   *
   * An aperture, not a fade. A fade to black is what every scene in every game
   * does when nothing has been decided about how it should end, and it is the
   * reason the player said the fight "cuts away": a fade removes the picture
   * without doing anything TO it.
   *
   * This closes ON the field. Four bars come in from the edges with a warm rim
   * on their leading edge, so the eye follows the light rather than the dark;
   * the opening squeezes down to a horizontal slit; and as the last of it goes
   * the slit is replaced by a bright line that snaps shut and leaves nothing.
   * The vertical bars are started a few frames after the horizontal ones and
   * arrive a few frames later, which is what stops the whole thing reading as
   * one rectangle scaling down -- the picture is pinched into a line first, and
   * only then does the line go.
   *
   * Built here rather than in ui/transition.ts because that file belongs to the
   * shutters the battle opens with, and the two are deliberately different
   * shapes: shutters part to start something, an aperture closes to end it.
   */
  private renderOutro(r: Renderer): void {
    if (this.outroT < 0) return;
    const p = Math.min(1, this.outroT / this.outroLen);
    const soft = (x: number) => x * x * (3 - 2 * x);

    // The field loses its light before it loses its picture.
    const dim = ramp(p, 0, 0.42) * 0.5;
    if (dim > 0) r.tint('#05070e', dim);

    const vy = soft(ramp(p, 0.02, 0.58));
    const vx = soft(ramp(p, 0.16, 0.74));
    const halfH = Math.round((SCREEN_H / 2) * vy);
    const halfW = Math.round((SCREEN_W / 2) * vx);
    const dark = '#04060c';

    if (halfH > 0) {
      r.rect(0, 0, SCREEN_W, halfH, dark);
      r.rect(0, SCREEN_H - halfH, SCREEN_W, halfH, dark);
    }
    if (halfW > 0) {
      r.rect(0, 0, halfW, SCREEN_H, dark);
      r.rect(SCREEN_W - halfW, 0, halfW, SCREEN_H, dark);
    }

    // The rim. It only exists while a bar is actually travelling; a glowing
    // edge sitting still is a border, and a border is not a transition.
    const openW = SCREEN_W - halfW * 2;
    const openH = SCREEN_H - halfH * 2;
    const rimA = Math.max(0, Math.min(1, 1 - ramp(p, 0.56, 0.80)));
    if (rimA > 0 && openW > 0 && openH > 0) {
      const warm = `rgba(255,236,180,${(0.85 * rimA).toFixed(3)})`;
      const faint = `rgba(255,206,120,${(0.35 * rimA).toFixed(3)})`;
      if (halfH > 0) {
        r.rect(halfW, halfH - 1, openW, 1, warm);
        r.rect(halfW, SCREEN_H - halfH, openW, 1, warm);
        r.rect(halfW, halfH - 2, openW, 1, faint);
        r.rect(halfW, SCREEN_H - halfH + 1, openW, 1, faint);
      }
      if (halfW > 0) {
        r.rect(halfW - 1, halfH, 1, openH, warm);
        r.rect(SCREEN_W - halfW, halfH, 1, openH, warm);
      }
    }

    // Belt and braces: the horizontal bars have covered the screen by now, but
    // this guarantees black behind the line whatever the rounding did.
    if (p >= 0.58) r.tint(dark, ramp(p, 0.58, 0.94));

    // The pinch. A bright line the width of what is left, laid over the top of
    // everything, shortening to nothing.
    const shut = ramp(p, 0.52, 0.90);
    if (shut > 0 && shut < 1) {
      const w = Math.max(1, Math.round((SCREEN_W * 0.46) * (1 - shut)));
      const h = shut < 0.7 ? 2 : 1;
      const y = Math.round(SCREEN_H / 2) - Math.floor(h / 2);
      const x = Math.round(SCREEN_W / 2 - w / 2);
      r.rect(x, y, w, h, `rgba(255,250,226,${(1 - shut * 0.35).toFixed(3)})`);
      r.rect(x, y - 1, w, 1, `rgba(255,224,150,${(0.4 * (1 - shut)).toFixed(3)})`);
      r.rect(x, y + h, w, 1, `rgba(255,224,150,${(0.4 * (1 - shut)).toFixed(3)})`);
    }

  }


  /**
   * Idle breathing: a signed whole-pixel change at each of the creature's own
   * breath seams, in the order kinbreath lists them (lowest seam first).
   *
   * +1 is a pixel of barrel GAINED, -1 a pixel lost, 0 the resting pose.
   *
   * WHY IT IS SIGNED, which it was not before. The old cycle only ever squashed:
   * rest was the creature's full height, it stood there for most of the cycle,
   * and then it lost two pixels. Whatever the seams were doing, a shape that
   * only ever gets shorter is a shape being crushed, and "smushed" is what the
   * player called it. Rest is now the middle of the range and the creature
   * spends the cycle a pixel either side of it, so the same amount of movement
   * reads as a chest going in and out instead of as a body settling.
   *
   * WHY THE SEAMS LAG EACH OTHER. A creature with two of them would otherwise
   * shut both at once, which is one big compression in two places rather than a
   * breath. Half a radian of lag sends it up the body as a wave.
   *
   * The two sides run a little over half a cycle apart so they never pulse
   * together, which would read as one shared heartbeat rather than two animals.
   * Zero has to be the resting pose: a side whose clock is frozen sits at
   * idleT 0 and must not be caught mid-squash, and sin(0) and sin(1.15*PI) are
   * both inside the dead band.
   */
  private breath(side: SideId, seams: number): number[] {
    if (seams <= 0) return [];
    const v = this.view[side];
    const base = side === 'foe' ? Math.PI * 1.15 : 0;
    const out: number[] = [];
    for (let i = 0; i < seams; i++) {
      const p = Math.sin(v.idleT / 27 + base - i * 0.55);
      out.push(p > 0.65 ? 1 : p < -0.65 ? -1 : 0);
    }
    return out;
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
     * WHERE THE SEAMS GO is the part that has been wrong twice, and the second
     * time is the one worth recording. They were moved off a fixed percentage
     * of the FRAME onto 66% and 86% of each creature's own INK, which is much
     * better placed and still not measured: cinderpaw's ink runs rows 46..123
     * and its legs start around row 98, so 66% is row 96 and 86% is row 112 and
     * BOTH seams were in the legs. Every breath took four design rows out of a
     * twenty-five-row leg and dropped the entire animal onto the stumps. That
     * is the "top half is being smushed" the player reported -- the top half
     * was not being compressed, it was being driven down into legs that were.
     *
     * kinbreath measures the barrel instead: the wide solid part of the
     * silhouette, found from the sprite's own alpha, with limbs and tails
     * excluded because they are thin. Seams go inside it and nowhere else, so
     * the ribcage is the only thing that changes shape and the head and the
     * legs are carried as rigid blocks.
     *
     * A seam can also RUN THE OTHER WAY. A positive delta repeats one logical
     * pixel of barrel instead of dropping one, which costs nothing -- the
     * repeat is on the grid and inside a region of the drawing that was already
     * uniform -- and it is what lets the resting pose sit in the middle of the
     * range rather than at the top of it.
     *
     * Only a whole, plainly-standing sprite is ever squashed: a clipped or
     * half-materialised one is drawn flat, and nothing is breathing during
     * either of those anyway.
     */
    const settled = drawH === size && v.clipY === null && v.ghost === 0
      && v.bloom === 0 && v.alpha >= 1;
    const br = kinBreath(kin.species, back);
    const deltas = settled ? this.breath(side, br.seams.length) : [];
    // kinbreath lists its seams lowest-first, because that is priority order;
    // a split blit walks the sprite downward and needs them the other way up.
    const cuts = br.seams
      .map((seam, i) => ({ seam, d: deltas[i] ?? 0 }))
      .sort((a, b) => a.seam - b.seam);
    const moving = cuts.some((cs) => cs.d !== 0);

    const blit = (img: CanvasImageSource, alpha: number, ox = 0, oy = 0) => {
      if (!moving) {
        r.image(img, x + ox, y + oy, 0, 0, size, drawH, false, false, alpha);
        return;
      }
      // The feet are the fixed end, so the block below the lowest seam is drawn
      // where it always is and every block above it carries the running total
      // of everything the seams beneath it have done.
      let shift = 0;
      for (const cs of cuts) shift -= cs.d;
      let from = 0;
      for (const cs of cuts) {
        const end = cs.d < 0 ? cs.seam - DETAIL : cs.seam;
        const h = end - from;
        if (h > 0) {
          r.image(img, x + ox, y + oy + from / DETAIL + shift, 0, from, size, h,
            false, false, alpha);
        }
        if (cs.d > 0) {
          // The pixel the stretch just opened, filled with the barrel row above
          // it drawn a second time.
          r.image(img, x + ox, y + oy + cs.seam / DETAIL + shift, 0, cs.seam - DETAIL,
            size, DETAIL, false, false, alpha);
        }
        shift += cs.d;
        from = cs.seam;
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

  /* -------------------------------------------------------- level up */

  /**
   * The level-up flourish.
   *
   * Three parts, because one on its own always reads as a decoration sitting
   * near the creature rather than as something happening TO it:
   *
   *  - a pool of light on the pad, drawn UNDER the sprite, so the creature is
   *    standing in it rather than in front of it;
   *  - rings that leave that pool and travel UP the body, narrowing as they go.
   *    The direction is the whole point. Everything else in this battle screen
   *    that puts a ring on a creature is a blow landing, and a blow expands
   *    outward from a point of contact; a ring that climbs is the only shape
   *    here that means "rising";
   *  - motes carried up with them, on their own spiral, so the column has grain
   *    and does not read as three clean geometric arcs.
   *
   * On top of that the sprite itself glows -- see levelStep -- and the panel's
   * level number ticks over on the same frame. The player asked for this not to
   * breeze past, so the whole thing runs about a second and a half and the line
   * that names it is held underneath for most of that.
   */
  private renderLevelUp(r: Renderer, behind: boolean): void {
    if (this.levelFx <= 0) return;
    const v = this.view.player;
    const kin = v.kin;
    if (!kin || !v.visible) return;

    const p = 1 - this.levelFx / this.levelFxLen;
    const pad = PLAYER_PAD;
    // The top of the creature's own ink, not the top of its frame: the column
    // has to finish at the animal's head and every frame is mostly empty above
    // whatever is drawn in it.
    const top = PLAYER_SPRITE.y + kinAnchor(kin.species, true).y0 / DETAIL;
    const rise = Math.max(18, pad.y - top + 6);

    if (behind) {
      // The pool. Swells fast, holds, and is gone before the rings are, so the
      // light reads as having been released rather than as switched on.
      const glow = Math.max(0, ramp(p, 0, 0.10) - ramp(p, 0.46, 0.9));
      if (glow > 0) {
        r.ellipsePixel(pad.x * DETAIL, pad.y * DETAIL,
          (14 + glow * 12) * DETAIL, (4 + glow * 4) * DETAIL,
          `rgba(255,236,168,${(0.40 * glow).toFixed(3)})`);
        r.ellipsePixel(pad.x * DETAIL, pad.y * DETAIL,
          (7 + glow * 6) * DETAIL, (2 + glow * 2) * DETAIL,
          `rgba(255,252,232,${(0.55 * glow).toFixed(3)})`);
      }
      return;
    }

    // Rings. Two units wide per dot and two rows deep on the near side: a
    // one-pixel dot at 240x160 against a busy field is not a ring, it is dust,
    // and the first pass of this was exactly that -- invisible at 1x and fine
    // when zoomed in, which is this project's oldest way of being wrong.
    for (let i = 0; i < 3; i++) {
      const q = ramp(p, 0.02 + i * 0.16, 0.02 + i * 0.16 + 0.46);
      if (q <= 0 || q >= 1) continue;
      const y = pad.y - rise * q;
      const rad = 23 - 13 * q;
      const a = Math.min(1, (1 - q) * 2.2);
      const dots = 24;
      for (let k = 0; k < dots; k++) {
        const ang = (k / dots) * Math.PI * 2 + q * 1.4;
        const px = Math.round(pad.x + Math.cos(ang) * rad);
        const py = Math.round(y + Math.sin(ang) * rad * 0.30);
        // The near half of the ring is brighter and thicker than the far half,
        // which is what stops a flat ellipse of dots reading as a flat ellipse
        // of dots and starts it reading as a hoop around something.
        if (Math.sin(ang) > 0) {
          r.rect(px - 1, py, 2, 2, `rgba(255,255,246,${a.toFixed(3)})`);
          r.rect(px - 1, py + 2, 2, 1, `rgba(255,206,88,${(a * 0.55).toFixed(3)})`);
        } else {
          r.rect(px - 1, py, 2, 1, `rgba(255,222,120,${(a * 0.72).toFixed(3)})`);
        }
      }
    }

    // Motes: short vertical streaks rather than points, because a point that
    // moves four pixels a frame is a point and a streak is a spark.
    const motes = 16;
    for (let i = 0; i < motes; i++) {
      const q = ramp(p, 0.04 + (i % 8) * 0.055, 0.04 + (i % 8) * 0.055 + 0.54);
      if (q <= 0 || q >= 1) continue;
      const ang = i * 2.39 + q * 3.4;
      const spread = 18 - 10 * q;
      const px = pad.x + Math.cos(ang) * spread;
      const py = pad.y + 2 - (rise + 10) * q + Math.sin(ang * 2) * 1.5;
      // Twinkling: a mote that never blinks is a dot, and sixteen dots on
      // fixed paths read as a diagram.
      if ((this.ticks + i * 3) % 9 < 6) {
        const a = Math.min(1, (1 - q) * 1.8);
        r.rect(Math.round(px), Math.round(py), 1, 2, `rgba(255,252,226,${a.toFixed(3)})`);
        r.rect(Math.round(px), Math.round(py) + 2, 1, 1, `rgba(255,214,110,${(a * 0.5).toFixed(3)})`);
      }
    }

    // The plate is interface, not field: it is drawn outside the shake by
    // render(), so a screen-shaking hit never wobbles the words.
  }

  /**
   * The plate that says so in words.
   *
   * It arrives over the player's own panel because that is where the number it
   * is about lives, and it slides rather than appearing: something that cuts in
   * and cuts out at 240x160 is indistinguishable from a rendering fault.
   */
  private renderLevelBanner(r: Renderer, p: number): void {
    const label = 'LEVEL UP!';
    const w = r.textWidth(label) + 12;
    const h = 13;
    const restX = PLAYER_BOX.x + PLAYER_BOX.w - w;
    const inP = ramp(p, 0.02, 0.16);
    const outP = ramp(p, 0.80, 0.98);
    if (inP <= 0) return;
    // Overshoots by two units on the way in and settles, so it lands rather
    // than stopping.
    const ease = 1 - Math.pow(1 - inP, 3);
    const x = Math.round(restX + (SCREEN_W + 8 - restX) * (1 - ease) + (SCREEN_W - restX) * outP);
    if (x >= SCREEN_W) return;
    const y = PLAYER_BOX.y - h - 2;

    const lit = Math.floor(this.levelFx / 5) % 2 === 0;
    r.rect(x, y, w, h, lit ? '#ffe89a' : '#f6c85a');
    r.rect(x, y, w, 1, '#fffbe4');
    r.rect(x, y + h - 1, w, 1, '#a87a24');
    r.outline(x - 1, y - 1, w + 2, h + 2, UI.frame);
    r.text(label, x + 6, y + 3, { color: '#4a3208', shadow: 'rgba(255,255,255,0.45)' });
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
    if (c.dust > 0 && c.beamTo) this.drawDust(r, c.beamTo.x, c.beamTo.y, c.dust);
    // Oldest first, so the newest streak sits on top of the older one and the
    // trail thins away behind the vessel rather than in front of it.
    //
    // Ghosted copies of the icon are what this was, and at 0.42 alpha a copy
    // with its own dark outline still reads as an OBJECT: the throw looked like
    // three capsules in a row rather than one moving fast. A trail has to be
    // light, not a second vessel.
    for (let i = c.trail.length - 1; i >= 0; i--) {
      const g = c.trail[i]!;
      const a = 0.34 - i * 0.14;
      const rad = 4 - i;
      for (let dy = -rad; dy <= rad; dy++) {
        const hw = Math.round(Math.sqrt(Math.max(0, rad * rad - dy * dy)));
        if (hw <= 0) continue;
        r.rect(g.x - hw, g.y + dy, hw * 2 + 1, 1, `rgba(255,232,168,${a.toFixed(3)})`);
      }
      r.rect(g.x - 1, g.y - 1, 2, 2, `rgba(255,250,224,${(a * 1.6).toFixed(3)})`);
    }
    this.drawVesselIcon(r, c.x, c.y, c.open, c.spin);
    if (c.burst > 0) this.drawBurst(r, c.x, c.y, c.burst);
    if (c.flare > 0) this.drawFlare(r, c.x, c.y, c.flare);
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
    const rad = 7 + grow * 18;
    if (behind) {
      // The pool goes under the feet, not over them. Two tones rather than one:
      // a single flat ellipse at 0.42 alpha was a white smear the size of the
      // pad, and it took the pad's own drawing with it.
      r.ellipsePixel(x * DETAIL, y * DETAIL, rad * DETAIL, rad * 0.30 * DETAIL,
        `rgba(255,236,168,${(0.30 * q).toFixed(3)})`);
      r.ellipsePixel(x * DETAIL, y * DETAIL, rad * 0.55 * DETAIL, rad * 0.17 * DETAIL,
        `rgba(255,252,232,${(0.42 * q).toFixed(3)})`);
      return;
    }
    // Sparks leaving the pool along the ground, two units wide so they are
    // still there at 240x160.
    const col = `rgba(255,246,196,${q.toFixed(3)})`;
    for (let i = 0; i < 10; i++) {
      const ang = (i / 10) * Math.PI * 2;
      r.rect(
        Math.round(x + Math.cos(ang) * rad * 1.2) - 1,
        Math.round(y + Math.sin(ang) * rad * 0.32) - Math.round(grow * 5),
        2, 1, col,
      );
    }
  }

  /**
   * Feet arriving.
   *
   * A low ring of dashes running outward along the floor and nothing above
   * ankle height, because that is the whole point: the creature has been light
   * for half a second and this is the frame it acquires weight. It is drawn in
   * the pad's own dust colours rather than in the vessel's light, so it reads
   * as ground being disturbed and not as more of the same effect.
   */
  private drawDust(r: Renderer, x: number, y: number, k: number): void {
    const q = Math.max(0, Math.min(1, k));
    const grow = 1 - q;
    const rad = 6 + grow * 20;
    const a = q * 0.8;
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2 + 0.4;
      const px = Math.round(x + Math.cos(ang) * rad);
      const py = Math.round(y + Math.sin(ang) * rad * 0.30 - grow * 2);
      r.rect(px - 1, py, 3, 1, `rgba(236,232,214,${a.toFixed(3)})`);
      r.rect(px - 1, py + 1, 3, 1, `rgba(168,158,132,${(a * 0.5).toFixed(3)})`);
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
    // The light leaves from BETWEEN the halves, so the cone starts at the seam
    // and the lower half sits inside the top of it -- which is what the shape
    // is supposed to say: something is being poured out past the lid.
    const top = c.y + 1 + Math.round(c.open * 4);
    const span = Math.max(1, Math.round(to.y - top));
    // Narrower than it was, by a lot. The old cone reached twenty-four units
    // either side at the floor, which at 240x160 is a fifth of the screen: the
    // creature it was supposed to be delivering formed inside a white slab and
    // could not be seen until the slab went away. It is now about the width of
    // the pad, and the reason it still reads as a beam is the core and the
    // bands, not the acreage.
    const soft = `rgba(255,250,230,${(0.24 * k).toFixed(3)})`;
    const core = `rgba(255,252,224,${(0.62 * k).toFixed(3)})`;
    for (let i = 0; i <= span; i++) {
      const t = i / span;
      const x = Math.round(c.x + (to.x - c.x) * t);
      const wide = Math.max(1, Math.round((2 + t * 10) * k));
      r.rect(x - wide, top + i, wide * 2, 1, soft);
      const hot = Math.max(1, Math.round(wide * 0.40));
      r.rect(x - hot, top + i, hot * 2, 1, core);
    }

    // Light actually travelling. Three bands walking the length of the cone,
    // each a few rows of much brighter fill; the direction is the sign of
    // `flow`, so the identical code pours a creature out and hauls one back.
    for (let b = 0; b < 3; b++) {
      const bt = ((c.flow + b / 3) % 1 + 1) % 1;
      const i0 = Math.round(bt * span);
      for (let d = 0; d < 4; d++) {
        const i = i0 + d;
        if (i < 0 || i > span) continue;
        const t = i / span;
        const x = Math.round(c.x + (to.x - c.x) * t);
        const wide = Math.max(1, Math.round((2 + t * 10) * k));
        const fade = (1 - d / 4) * k;
        r.rect(x - wide, top + i, wide * 2, 1, `rgba(255,255,246,${(0.55 * fade).toFixed(3)})`);
      }
    }
  }

  /**
   * The vessel itself: a round capsule, split by a band, that comes apart.
   *
   * WHAT IT WAS. Two eight-by-four rectangles with a dark outline round each,
   * which at 1x is a pair of beige crates. Every other object on this screen is
   * either a creature or a panel; the one prop in the whole battle looked like
   * neither, and since the send-out is a story about that prop, the prop had to
   * be drawn properly.
   *
   * It is eleven units across, plotted from a scanline table so the silhouette
   * is a real circle rather than a rounded rectangle, and it is rung in its own
   * dark first so it reads against grass, sky and pad alike.
   *
   * THE TUMBLE is a rotation of the split line, not a swap of two colours. Per
   * pixel, which side of the band a point falls on is decided by the rotated
   * coordinate `dx*sin + dy*cos`, so at a quarter turn the light half is on the
   * left and the band runs vertically. One hundred and twenty-one pixels a
   * frame is nothing, and a capsule that visibly turns over is worth far more
   * than the two colours flickering that stood in for it.
   */
  private drawVesselIcon(r: Renderer, x: number, y: number, open = 0, spin = 0, alpha = 1): void {
    const gap = Math.round(open * 6);
    const a = Math.max(0, Math.min(1, alpha));
    if (a <= 0) return;
    const A = (hex: string, mul = 1) => (a >= 1 && mul >= 1 ? hex : this.fade(hex, a * mul));

    // Half-widths of an eleven-pixel disc, rows -5..5.
    const HW = [2, 3, 4, 4, 5, 5, 5, 4, 4, 3, 2];
    const ang = spin * Math.PI * 2;
    const sa = Math.sin(ang), ca = Math.cos(ang);

    const shell = A('#1c1409');
    const lit = A('#f2cc78');
    const litLow = A('#c9a14e');
    // Deliberately not white. The lower half spends the whole of a send-out
    // sitting in the top of a cone of white light, and the first version of
    // this was cream: it vanished into the beam and left the open vessel
    // looking like a lampshade on a stick.
    const pale = A('#d2c8a8');
    const paleLow = A('#9c9174');
    const band = A('#3a2c18');

    for (let dy = -5; dy <= 5; dy++) {
      // Open: the two halves travel apart and the band goes with the top piece,
      // so the seam stays a seam instead of dissolving into the gap.
      const shift = gap === 0 ? 0 : (dy <= 0 ? -gap : gap);
      const hw = HW[dy + 5]!;
      // The ring, drawn as a row one pixel proud on each side plus caps.
      r.rect(x - hw - 1, y + dy + shift, hw * 2 + 3, 1, shell);
      if (dy === -5) r.rect(x - hw, y + dy + shift - 1, hw * 2 + 1, 1, shell);
      if (dy === 5) r.rect(x - hw, y + dy + shift + 1, hw * 2 + 1, 1, shell);
    }
    for (let dy = -5; dy <= 5; dy++) {
      const shift = gap === 0 ? 0 : (dy <= 0 ? -gap : gap);
      const hw = HW[dy + 5]!;
      for (let dx = -hw; dx <= hw; dx++) {
        // Which side of the split this pixel is on, in the capsule's own frame.
        const d = gap === 0 ? dx * sa + dy * ca : dy;
        let col: string;
        if (d >= -0.6 && d <= 0.6) col = band;
        else if (d < 0) col = dy < -2 || dx < -2 ? lit : litLow;
        else col = dy > 3 || dx > 2 ? paleLow : pale;
        r.rect(x + dx, y + dy + shift, 1, 1, col);
      }
    }
    // The stud, and the highlight that tells the eye this thing is round. The
    // highlight travels with the top half when it opens; without it the dome
    // goes flat at exactly the moment it is largest on screen.
    if (gap === 0) r.rect(x - 1, y, 2, 1, A('#f8f2dc'));
    r.rect(x - 3, y - 3 - gap, 2, 1, A('#fffaea'));
    r.rect(x - 4, y - 2 - gap, 1, 1, A('#fffaea'));
    if (gap > 0) r.rect(x - 2, y + 4 + gap, 3, 1, A('#e6dcc0'));
  }

  /** `#rrggbb` at an alpha, for the ghosted trail copies. */
  private fade(hex: string, a: number): string {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a.toFixed(3)})`;
  }

  /**
   * A one-shot starburst: an expanding ring of sparks with a cross through it.
   *
   * The ring is drawn as dashes rather than dots and the cross tapers, so at
   * the size this is played back it reads as an explosion of light instead of
   * as eight pixels arranged in a circle.
   */
  private drawBurst(r: Renderer, x: number, y: number, k: number): void {
    const grow = 1 - k;
    const rad = 4 + grow * 22;
    const col = `rgba(255,250,220,${k.toFixed(3)})`;
    const warm = `rgba(255,206,96,${(k * 0.75).toFixed(3)})`;
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2 + 0.26;
      const cx = Math.cos(ang), cy = Math.sin(ang) * 0.86;
      const px = Math.round(x + cx * rad);
      const py = Math.round(y + cy * rad);
      r.rect(px - 1, py, 2, 1, col);
      r.rect(Math.round(x + cx * rad * 0.72) - 1, Math.round(y + cy * rad * 0.72), 2, 1, warm);
    }
    const rx = Math.round(rad * 1.25), ry = Math.round(rad * 0.95);
    r.rect(x - rx, y, rx * 2, 1, warm);
    r.rect(x, y - ry, 1, ry * 2, warm);
    if (k > 0.55) r.rect(x - 2, y - 2, 4, 4, col);
  }

  /**
   * The flare cross on the frame the vessel splits.
   *
   * Two lines, one long and horizontal and one short and vertical, both of them
   * gone within a few frames. It exists to give the split a single unmissable
   * frame -- a burst that expands is already fading by the time the eye finds
   * it, and something has to be at full brightness exactly once.
   */
  private drawFlare(r: Renderer, x: number, y: number, k: number): void {
    const w = Math.round(22 + 26 * k);
    const h = Math.round(8 + 22 * k);
    r.rect(x - w, y, w * 2, 1, `rgba(255,255,248,${(0.9 * k).toFixed(3)})`);
    r.rect(x - Math.round(w * 0.6), y - 1, Math.round(w * 1.2), 1,
      `rgba(255,232,160,${(0.5 * k).toFixed(3)})`);
    r.rect(x - Math.round(w * 0.6), y + 1, Math.round(w * 1.2), 1,
      `rgba(255,232,160,${(0.5 * k).toFixed(3)})`);
    r.rect(x, y - h, 1, h * 2, `rgba(255,255,248,${(0.8 * k).toFixed(3)})`);
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
    // The player's own panel counts up on the beat the flourish plays; the
    // foe's has nothing to lag behind and reads its kin directly.
    const shownLevel = side === 'player' && this.view.player.kin === kin
      ? Math.max(1, Math.min(kin.level, this.displayLevel)) : kin.level;
    const levelText = `Lv${shownLevel}`;
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
      // competes with the HP bar for attention. Measured against the level the
      // PANEL is showing, so a gain that carries a level runs the bar up to the
      // end of the band, stops there, and starts the next band on the beat the
      // flourish fires -- instead of emptying in one frame the way it did when
      // this asked the kin for a level it had already been given.
      const cur = expForLevel(kin.growthRate, shownLevel);
      const next = expForLevel(kin.growthRate, Math.min(100, shownLevel + 1));
      const prog = next > cur ? Math.max(0, Math.min(1, (this.displayExp - cur) / (next - cur))) : 1;
      const expLit = this.levelFx > 0 && Math.floor(this.levelFx / 4) % 2 === 0;
      r.meter(box.x + 4, box.y + box.h - 5, box.w - 8, 2, prog,
        expLit ? '#ffffff' : UI.exp, '#39415c', null);
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
   * The kin in the fight gets the big card and the rest get rows, which is the
   * same shape the party screen outside battle uses, and every one of them
   * carries its own portrait, level, bar and status -- a switch is a decision
   * about numbers and they all have to be on screen at once for it to be one.
   */
  private renderPartyMenu(game: Game, r: Renderer): void {
    r.rect(0, 0, SCREEN_W, SCREEN_H, '#3c4664');
    for (let y = 0; y < SCREEN_H; y += 4) r.rect(0, y, SCREEN_W, 1, '#424d6e');

    const order = this.partyOrder();
    for (let s = 0; s < Math.min(6, order.length); s++) {
      this.renderPartyCard(game, r, s, order[s]!);
    }

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

  /**
   * One card. `slot` is where on the screen it is drawn and which menu row it
   * answers to; `idx` is which kin in the party it shows. They are not the same
   * number any more -- see partyOrder -- and every lookup has to use the right
   * one or the cursor stops pointing at the card it is drawn on.
   */
  private renderPartyCard(game: Game, r: Renderer, slot: number, idx: number): void {
    const kin = this.battle.player.party[idx];
    if (!kin) return;
    const c = this.partyCardRect(slot);
    const sel = this.partyMenu.index === slot;
    const active = idx === this.battle.player.activeIndex;
    const down = kin.fainted;
    const usable = this.partyMenu.items[slot]?.enabled !== false;

    // Hovering moves the cursor, the same as it does on the command pad, so
    // the two input methods never disagree about what is selected.
    const hovered = game.input.mouseOver(c.x, c.y, c.w, c.h);
    if (hovered && game.input.mouse.idleFrames < 2 && usable) this.partyMenu.index = slot;
    if (hovered && game.input.mouse.leftPressed && usable) {
      this.partyMenu.index = slot;
      this.partyClick = true;
    }

    const fill = down ? '#c6cad6' : sel ? '#eef3fd' : '#d8def0';
    r.window(c.x, c.y, c.w, c.h, {
      fill, border: UI.frame, highlight: sel ? '#8fa8d8' : UI.shade,
    });
    if (sel) {
      // A ring on the card you are on and nothing on the ones you are not,
      // matching the command pad -- but LIGHT here, not dark. The pad's rings
      // are dark because they sit on saturated colour; this screen's backdrop
      // is a dark slate and a dark ring on it was very nearly invisible, which
      // on the one screen in a battle where you are choosing between six things
      // is the wrong thing to be subtle about.
      r.outline(c.x - 1, c.y - 1, c.w + 2, c.h + 2, '#f2c94c');
      r.outline(c.x + 2, c.y + 2, c.w - 4, c.h - 4, 'rgba(255,255,255,0.75)');
    }

    const frac = Math.max(0, kin.currentHp / Math.max(1, kin.maxHp));
    const hpC = frac > 0.5 ? UI.hpGood : frac > 0.2 ? UI.hpWarn : UI.hpBad;
    const ink = down ? '#6e7488' : UI.ink;
    const art = down ? 0.4 : 1;

    if (slot === 0) {
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
