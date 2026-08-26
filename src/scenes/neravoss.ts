/**
 * NERAVOSS.
 *
 * The climax. Four phases, and the whole point of the file is that they are
 * four DIFFERENT VERBS rather than one health bar wearing four hats:
 *
 *   1. SURVIVE      -- you move. There is no attack button. The sea comes at
 *                      the shelf and you get out of the way, six times.
 *   2. RESTRAINTS   -- you time. Meridian's clamps are still bolted through it
 *                      and the plates only part when it breathes in. You are
 *                      not hitting the animal; you are getting the machine off
 *                      it, and a mistimed press makes it CRY OUT rather than
 *                      making a number go down.
 *   3. THE TIDEHEART-- you hold, and you steer. The object Elias died to keep
 *                      out of Meridian's hands, used at last for the one thing
 *                      the Aurelians built it for: to talk.
 *   4. REACH IT     -- you close the distance, on its terms. Move while it is
 *                      watching and it recoils and you lose ground. Move when
 *                      it settles and you get nearer. That is the entire
 *                      mechanic and it is the entire theme.
 *
 * THERE IS NO HP ANYWHERE IN THIS FILE, on either side. Nothing the player can
 * press hurts it, no vessel can be thrown, and there is no lose state -- a
 * player who plays badly takes longer, makes the storm worse and is scored
 * lower in `neravoss_grace`, and still gets to the end. That is deliberate on
 * two counts. The design brief has asked four times for an easier game and this
 * is the last gate in the story; and a climax about trust cannot be a climax
 * you fail. Every phase's difficulty assist widens SILENTLY as the player
 * struggles, so the floor rises to meet them without ever saying so.
 *
 * THE STARTER APPEARS IN PHASE FOUR, and does the last of it alone. The shelf
 * runs out before the player does; the creature they chose in Sorrell's field
 * station in Act 1 walks the last of the stone by itself and sits down in front
 * of the largest storm in Caelora's history. There is no line of dialogue on
 * that beat and there must never be one.
 *
 * ART. Everything on screen is drawn here in code -- storm, sea, restraints and
 * the animal itself. Neravoss is rendered as a column field: a parametric spine
 * running from a head right-of-centre out past the left edge, sampled once per
 * authoring block, each column filled as back / body / belly / rim. That keeps
 * the edges hard at the density the rest of the game is drawn at, gives the
 * breathing and the thrashing for free (they are terms in the spine), and never
 * needs an image file. The only imported pixels are the player's own character
 * sheet and their starter's back sprite.
 */

import type { Game } from '../core/game.js';
import type { Scene } from '../core/scene.js';
import { DETAIL, Renderer, SCREEN_H, SCREEN_W } from '../engine/renderer.js';
import { DialogueScene } from '../ui/dialogue.js';
import { audio } from '../audio/audio.js';
import { registry } from '../data/registry.js';
import { backSprite } from '../gfx/kinsprite.js';
import { getAppearanceSheet, CHAR_W, CHAR_H, type CharDir } from '../gfx/charsprite.js';
import type { GameState } from '../systems/state.js';
import { TIDEHEART } from '../systems/tideheart.js';
// The post-credits film. This import and the one in postcredits.ts form a
// cycle, and it is a safe one: neither module reads anything of the other's at
// evaluation time -- the reference here is inside setPieceScene, the references
// there are inside draw calls, and `postCreditsScene` is a hoisted function
// declaration. Keep it that way if either file grows a top-level constant.
import { postCreditsScene } from './postcredits.js';
// The ending's chart of Averra. No cycle: averra.ts imports nothing from here.
import { AverraScene } from './averra.js';

/* ===================================================================== *
 *  THE SET-PIECE REGISTRY
 *
 *  The event VM's `setPiece` action lands here. It is a named lookup rather
 *  than a per-scene action kind so that a story beat which needs a bespoke
 *  screen stays what every other beat in this game is: a line of JSON.
 * ===================================================================== */

export interface SetPieceContext {
  game: Game;
  state: GameState;
  done: () => void;
}

/** Builds the scene for a set-piece id, or null if the id is unknown. */
export function setPieceScene(id: string, ctx: SetPieceContext): Scene | null {
  if (id === 'neravoss') return new NeravossScene(ctx.state, ctx.done);
  // The post-credits cinematic. It lives in its own file and is registered here
  // rather than there so that every bespoke screen in the game is reached the
  // same way -- through one line of JSON in an event script.
  if (id === 'postcredits') return postCreditsScene(ctx.state, ctx.done);
  // Stage 7's ending: the chart of Averra unrolling on the player's own desk,
  // called from data/events/hearthmere_house_up.json. See src/scenes/averra.ts.
  if (id === 'averra') return new AverraScene(ctx.done);
  return null;
}

/* ===================================================================== *
 *  PALETTE
 *
 *  Two of everything: how it looks while the animal is frightened, and how it
 *  looks once it is not. `calm` runs 0..1 across the last phase and every
 *  colour on screen is mixed between the two by it, so the weather lifting is
 *  one number rather than a second set of draw calls.
 * ===================================================================== */

const STORM = {
  skyTop: '#070d16',
  skyMid: '#101d2c',
  skyLow: '#1b3242',
  sea: '#0b2a3b',
  seaLit: '#1d6c86',
  foam: '#6ea6bb',
} as const;

const CLEAR = {
  skyTop: '#1d3a55',
  skyMid: '#3a6b86',
  skyLow: '#79a8b4',
  sea: '#155a72',
  seaLit: '#2e93a8',
  foam: '#cfeaf0',
} as const;

/**
 * The animal. Dark ocean colours, lit from above and from its own markings.
 *
 * Exported because the post-credits cinematic draws this creature a second
 * time, in a different pose, in a different place. It has to be the same
 * animal: if these ever change, the one on the wall changes with them.
 */
export const BODY = {
  back: '#081420',
  mid: '#173950',
  belly: '#215a6d',
  rim: '#5aafc6',
  edge: '#050b12',
} as const;

/**
 * The body, top to bottom, as a share of its own thickness.
 *
 * Monotonic: every band is darker than the one above it. See the comment at
 * the draw site for why that is not a detail.
 */
export const BODY_BANDS = [
  { share: 0.13, color: '#6cc4da' },
  { share: 0.16, color: '#3f8da6' },
  { share: 0.24, color: '#255c72' },
  { share: 0.26, color: '#174154' },
  { share: 0.21, color: '#0d2836' },
];

const GLOW_HURT = '#7fe2ff';
export const GLOW_CALM = '#9ff0d6';

/**
 * What the confirm key is called in a prompt. Bindings are remappable, so every
 * prompt in this game names the action rather than the key; so does this one.
 */
const CONFIRM_NAME = 'CONFIRM';

/** Meridian's hardware. Grey plate, amber running lights, and nothing warm. */
const RIG = {
  dark: '#232a36',
  metal: '#4d586b',
  lit: '#8b97ad',
  lamp: '#ffb648',
  dead: '#3a3f4a',
} as const;

/* ===================================================================== *
 *  LAYOUT
 * ===================================================================== */

/**
 * The room this is set in.
 *
 * data/maps/temple_deep_heart.json is THE LISTENING FLOOR: an Aurelian chamber
 * forty tiles across with a great circular pool of deep water in the middle of
 * it, walls all round, and the player arriving on the south rim. The set piece
 * has to be recognisably the same place the player just walked into, so the
 * picture is built out of that room and not out of an open coast --
 *
 *   HORIZON       where the water meets the far wall of the chamber
 *   RIM_Y         the near rim the player is standing on, which CURVES: a
 *                 round pool seen from its south side is nearest the camera in
 *                 the middle and turns away at both edges, and that curve is
 *                 what makes the last phase's "the stone runs out" true
 *                 without a railing or an invisible wall
 *   RIM_TURN      the x past which the rim has turned far enough away from the
 *                 animal that walking further stops closing the distance
 */
const HORIZON = 72;
const SHELF_Y = 104;
/** How far the near rim bulges toward the camera at the middle of the pool. */
const RIM_BOW = 8;
/** Where the rim has turned away. The player cannot go past it, and that is the point. */
const RIM_TURN = 212;

/**
 * The three stances on the shelf, and the spur the player walks out along in
 * the last phase.
 *
 * Spaced across nearly the whole width on purpose. A dodge you make by nudging
 * a few units is a dodge you can make without looking; at this spacing the
 * player has to commit to a side, which is what makes the sea feel like it is
 * aimed at them.
 */
const LANES = [42, 118, 196];

/* ===================================================================== *
 *  TIMING  (simulation frames at 60Hz)
 * ===================================================================== */

/** Waves the player has to weather in phase one. */
const WAVES = 6;
/** Frames of telegraph before a wave lands, before any assist. */
const WAVE_TELL = 74;
/** Every hit buys this much extra warning, for good. See the file header. */
const WAVE_ASSIST = 14;
const WAVE_TELL_MAX = 140;
/** Frames the wall of water is actually on the shelf. */
const WAVE_STRIKE = 14;
/** Recovery between waves. */
const WAVE_GAP = 34;
/** Frames the player spends on the stone after being caught. */
const WAVE_DOWN = 46;
/** Soakings that cost ground. Past this, being caught only costs the stumble. */
const WAVE_FORGIVE = 2;

/**
 * The four clamps, as positions along the spine (0 = head, 1 = tail).
 *
 * All four must be ON SCREEN. The spine runs 300 units and the snout sits near
 * x=186, so anything past s=0.62 is off the left edge -- and a clamp the player
 * is being asked to get off the animal has to be a thing they can see.
 */
const RINGS = [0.10, 0.22, 0.35, 0.50];
/** Frames for one there-and-back sweep of each clamp's breathing gauge. */
const RING_PERIOD = [150, 132, 118, 104];
/** Fraction of the sweep the plates are parted for. Ring one is nearly free. */
const RING_BAND = [0.40, 0.32, 0.28, 0.25];
/**
 * Bolts per clamp.
 *
 * A clamp is not one press. Each bolt is its own timing, the sweep restarts
 * between them and the animal shudders every time one lets go -- which is what
 * turns the phase from a reflex test into a piece of work being done ON
 * something, at its pace, twelve separate times.
 */
const RING_BOLTS = [2, 3, 3, 4];
/** Each bolt out leaves the clamp looser: faster breathing, wider window. */
const BOLT_FASTER = 0.90;
const BOLT_WIDER = 1.08;
/** Frames the animal takes each bolt, before the gauge starts again. */
const BOLT_CLUNK = 34;
/**
 * Frames the clamp bites down for after a mistimed press.
 *
 * The cost of a miss, and it is the only cost. Nothing loses health, the
 * window does not narrow, and the player is not sent back -- the animal
 * thrashes and there is nothing to be done with the clamp until it stops.
 * It is also the whole answer to mashing: measured, a bot pressing blind
 * every nine frames finished this phase in the same time as a bot reading
 * the gauge, which made the timing decorative. With this it does not.
 */
const MISS_BITE = 42;
/** Every two misses on the same clamp widen its window by this much. */
const RING_ASSIST = 1.22;
const RING_ASSIST_CAP = 2.1;

/** Charge per frame while the link holds, out of 100. */
const LINK_GAIN = 0.20;
/** Frames the link holds still while each fragment of the record plays. */
const LINK_LISTEN = 110;
/** Charge lost per frame while it slips. Deliberately far below the gain. */
const LINK_DRAIN = 0.11;
/** How fast the player can steer the link, in track units per frame. */
const LINK_STEER = 0.0105;

/** Ground closed per frame while it is settled, out of 100. */
const REACH_GAIN = 0.15;
/** Ground lost when the player moves under its eye. */
const REACH_RECOIL = 11;
/** Where the spur runs out. The starter walks the rest. */
const REACH_FLOOR = 22;

/** Frames the weather takes to lift once it settles. */
const CALM_FRAMES = 260;

/** Frames a caption stays up before it fades out of the way. */
const CAPTION_HOLD = 230;

/* ===================================================================== *
 *  SMALL MATHS
 * ===================================================================== */

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);
const clamp01 = (v: number): number => clamp(v, 0, 1);
const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;
const easeOut = (k: number): number => 1 - (1 - k) * (1 - k);
const easeIn = (k: number): number => k * k;

/**
 * Read a colour back apart, in either form this file produces.
 *
 * IT HAS TO ACCEPT `rgb(...)` AS WELL AS `#rrggbb`, and that is not a nicety.
 * `mix` and `shade` both RETURN `rgb(...)`, and half the drawing here feeds
 * one of them into another -- the glow colour is a mix, the markings mix that
 * against the hull, the pool bands mix two mixes. A parser that only knew
 * hex turned every one of those into `rgb(NaN,NaN,NaN)`, which is not a CSS
 * colour, so the canvas silently kept whatever fill was set last. The symptom
 * was subtle and completely misleading: the creature's bioluminescence drew as
 * flat grey plates and the pool drew as one flat slab, and every attempt to
 * fix it by choosing better colours changed nothing, because the colours were
 * never reaching the canvas.
 */
function hexRgb(color: string): [number, number, number] {
  if (color.charCodeAt(0) === 35) {
    const hex = color.slice(1);
    if (hex.length === 3) {
      const n = parseInt(hex, 16);
      const r = (n >> 8) & 15, g = (n >> 4) & 15, b = n & 15;
      return [r * 17, g * 17, b * 17];
    }
    const n = parseInt(hex, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const open = color.indexOf('(');
  const parts = color.slice(open + 1, color.indexOf(')')).split(',');
  return [
    Math.round(Number(parts[0])) || 0,
    Math.round(Number(parts[1])) || 0,
    Math.round(Number(parts[2])) || 0,
  ];
}

/** Mix two hex colours. Used for every part of the weather lifting. */
function mix(a: string, b: string, k: number): string {
  const [ar, ag, ab] = hexRgb(a);
  const [br, bg, bb] = hexRgb(b);
  const t = clamp01(k);
  return `rgb(${Math.round(lerp(ar, br, t))},${Math.round(lerp(ag, bg, t))},${Math.round(lerp(ab, bb, t))})`;
}

/** Deterministic hash noise, so the storm is the same storm on every replay. */
function noise(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/* ===================================================================== *
 *  THE STARTER'S BACK SPRITE, AT HALF SIZE
 *
 *  The battle scene draws a kin at 64 logical units. On this shelf that is
 *  four times the height of the person standing next to it, and Neravoss is
 *  the only thing in this picture allowed to be enormous. So the back sprite
 *  is reduced the same way `iconSprite` reduces the front one -- the dominant
 *  colour of each 2x2 block, which is exact on art drawn on the authoring grid
 *  and invents no colours on art that is not.
 * ===================================================================== */

const halfCache = new Map<string, HTMLCanvasElement>();

function halfBack(speciesId: string): HTMLCanvasElement {
  const hit = halfCache.get(speciesId);
  if (hit) return hit;

  const src = backSprite(speciesId);
  const data = src.getContext('2d')!.getImageData(0, 0, src.width, src.height).data;
  const w = Math.floor(src.width / 2);
  const h = Math.floor(src.height / 2);

  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const cx = cv.getContext('2d')!;
  cx.imageSmoothingEnabled = false;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const counts = new Map<string, number>();
      for (let dy = 0; dy < 2; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          const i = ((y * 2 + dy) * src.width + (x * 2 + dx)) * 4;
          if (data[i + 3]! < 128) continue;
          const key = `${data[i]},${data[i + 1]},${data[i + 2]}`;
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
      }
      if (counts.size === 0) continue;
      let best = '', bestN = 0;
      for (const [k, n] of counts) if (n > bestN) { best = k; bestN = n; }
      cx.fillStyle = `rgb(${best})`;
      cx.fillRect(x, y, 1, 1);
    }
  }
  halfCache.set(speciesId, cv);
  return cv;
}

interface Ink { x0: number; y0: number; x1: number; y1: number }
const inkCache = new Map<string, Ink>();

/**
 * Ink bounds of a reduced sprite, so it can be seated on the stone.
 *
 * Cached by species: this reads the whole sprite back out of the canvas, which
 * is not something to do on the frame the starter walks out.
 */
function inkBox(speciesId: string): Ink {
  const hit = inkCache.get(speciesId);
  if (hit) return hit;
  const cv = halfBack(speciesId);
  const d = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data;
  let x0 = cv.width, y0 = cv.height, x1 = -1, y1 = -1;
  for (let y = 0; y < cv.height; y++) {
    for (let x = 0; x < cv.width; x++) {
      if (d[(y * cv.width + x) * 4 + 3]! < 128) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  const box: Ink = x1 < 0
    ? { x0: 0, y0: 0, x1: cv.width - 1, y1: cv.height - 1 }
    : { x0, y0, x1, y1 };
  inkCache.set(speciesId, box);
  return box;
}

/**
 * Which kin walks out onto the spur.
 *
 * The starter, in whatever form it is in now -- a player who reached the
 * climax is holding a Thornmarch, not a Sprigling, and the argument this beat
 * makes is about the animal they raised, not the egg it came out of. So the
 * flag names the line and the PARTY names the member: walk the party for
 * anything descended from the recorded starter and take that. A save that has
 * somehow parted with it falls back to whatever is standing first, because a
 * climax that cannot draw a creature is worse than one that draws the wrong
 * creature.
 */
function starterOf(state: GameState): string | null {
  const roots = ['sprigling', 'cinderpaw', 'rilltail'];
  const root = roots.find((r) => state.hasFlag(`starter_${r}`));

  if (root) {
    const line = new Set<string>([root]);
    // Walk the evolution graph forward; three stages, so a bounded loop.
    for (let pass = 0; pass < 4; pass++) {
      for (const id of [...line]) {
        for (const evo of registry.species.get(id)?.evolutions ?? []) line.add(evo.to);
      }
    }
    const held = state.party.find((k) => line.has(k.species));
    if (held) return held.species;
  }
  return state.party[0]?.species ?? null;
}

/* ===================================================================== *
 *  THE SCENE
 * ===================================================================== */

type Phase =
  | 'open' | 'survive' | 'restraints' | 'tideheart' | 'reach' | 'calm' | 'gone';

/** One queued step of the connective tissue between phases. */
type Beat = () => void;

export class NeravossScene implements Scene {
  readonly name = 'neravoss';
  readonly transparent = false;

  /* -------------------------------------------------------- clock & flow */

  private t = 0;
  private phase: Phase = 'open';
  private beats: Beat[] = [];
  private blocked = false;
  /** Frames left on an internal hold, used by `pause` beats. */
  private holding = 0;

  /* ------------------------------------------------------------ the world */

  /**
   * How badly the animal is thrashing, 0..1.
   *
   * This is the storm. It is the only running score in the encounter and it is
   * never drawn as a bar -- it IS the sky, the rain, the swell and the shake.
   * A player who mistimes things is told so by the weather.
   */
  private distress = 0.55;
  /** 0..1 once it settles. Drives every colour on screen back to daylight. */
  private calm = 0;
  /** Frames left of a lightning flash. */
  private flash = 0;
  /** Frames left of a white spray burst, and where. */
  private spray: { x: number; t: number }[] = [];

  /* ---------------------------------------------------------- the animal */

  /** Which clamps are still on it. */
  private ringsOn = [true, true, true, true];
  /** Frames left of a pain reaction. Drives the recoil and the eye. */
  private hurt = 0;
  /** 0 = terrified, 1 = looking at you. Drives the eye and the head carriage. */
  private trust = 0;

  /* -------------------------------------------------------- phase 1 state */

  private wave = 0;
  private waveTell = WAVE_TELL;
  private waveT = 0;
  private waveLanes: number[] = [];
  private waveState: 'gap' | 'tell' | 'strike' = 'gap';
  private down = 0;
  /** Soakings so far. After WAVE_FORGIVE they stop costing progress. */
  private waveHits = 0;

  /* -------------------------------------------------------- phase 2 state */

  private ring = 0;
  private bolt = 0;
  private ringT = 0;
  private ringMiss = 0;
  private ringWide = 1;
  private ringCentre = 0.5;
  /** Frames left of the shudder after a bolt lets go. */
  private clunk = 0;

  /* -------------------------------------------------------- phase 3 state */

  private link = 0;
  private linkP = 0.5;
  private linkZ = 0.5;
  private linkDrift = 0;
  private linkSaid = 0;
  /** Frames left of a fragment of the record playing back. */
  private linkListen = 0;
  /** Frames spent in the phase, which drives the silent assist. */
  private linkT = 0;
  /** The open width the HUD should draw, kept in step with the rule. */
  private linkWidth = 0.30;

  /* -------------------------------------------------------- phase 4 state */

  private reach = 100;
  private watching = false;
  private watchT = 0;
  private watchNext = 110;
  private tell = 0;
  private starterOut = 0;

  /* ------------------------------------------------------------- the cast */

  private playerX = LANES[1]!;
  private playerTargetX = LANES[1]!;
  private playerFacing: CharDir = 'right';
  private walkPhase = 0;
  private starterSpecies: string | null = null;

  /** 100 down to 0: how gently this was done. Handed to the aftermath. */
  private grace = 100;

  /**
   * The caption band.
   *
   * Two lines at most, and it LEAVES. It carries the one instruction a phase
   * needs and the three fragments of the Aurelian record, and then it goes,
   * because for most of this encounter the bottom of the screen has the player
   * standing on it and a permanent box over their feet is a box over the whole
   * point of the last phase. Character speech is not this: that goes through
   * DialogueScene, in the game's own box, with the game's own voices.
   */
  private caption: string[] = [];
  private captionFade = 0;
  private captionHold = 0;

  constructor(private state: GameState, private onDone: () => void) {}

  /* ===================================================================== *
   *  LIFECYCLE
   * ===================================================================== */

  enter(): void {
    this.starterSpecies = starterOf(this.state);
    // Warm the sprite caches now rather than on the frame the starter walks
    // out, which is the one frame of this encounter that must not stutter.
    if (this.starterSpecies) inkBox(this.starterSpecies);

    /*
     * NO MUSIC, AND THAT IS A CHOICE RATHER THAN AN OMISSION.
     *
     * data/audio/tracks.json carries sixteen tracks and not one of them is
     * this: the closest fits are a Kin Hall theme and a clinic theme, and
     * either would be recognised instantly as something else. The scene next
     * door (data/events/temple_deep_power.json) reaches the same conclusion
     * and cuts the music dead for its heavy beats, so this is the act's
     * house style rather than a shortcut.
     *
     * What carries it instead is the weather: rain on a slow bed, thunder on
     * the lightning, the metal, and the animal. If a track is ever written for
     * this room, one call to the audio manager here is the whole change. Note
     * that tests/audio.test.js scans this file for that call as plain text and
     * insists the id is real -- including inside comments, which is why no
     * example of one is written out here.
     */
    audio.stopMusic();

    this.queueOpening();
  }

  exit(): void {
    audio.stopMusic();
  }

  /* ===================================================================== *
   *  BEATS
   *
   *  A tiny cooperative queue, the same contract the event VM runs on: a beat
   *  may block, and whatever it blocked on releases it later. It exists so the
   *  connective tissue between phases reads top to bottom in one place instead
   *  of being scattered through the phase updates.
   * ===================================================================== */

  private say(lines: string[], who?: string): Beat {
    return () => {
      this.blocked = true;
      this.pushDialogue(lines, who);
    };
  }

  private pushDialogue(lines: string[], who?: string): void {
    // Deferred to the scene stack, which flushes between updates.
    this.pendingDialogue = { lines, who };
  }

  private pendingDialogue: { lines: string[]; who?: string } | null = null;

  private note(lines: string[], hold = CAPTION_HOLD): Beat {
    return () => { this.caption = lines; this.captionHold = hold; };
  }

  private pause(frames: number): Beat {
    return () => { this.blocked = true; this.holding = frames; };
  }

  private go(phase: Phase): Beat {
    return () => { this.phase = phase; this.t = 0; };
  }

  private act(fn: () => void): Beat {
    return () => fn();
  }

  private queueOpening(): void {
    this.beats = [
      this.act(() => { this.phase = 'open'; this.distress = 0.62; }),
      this.pause(90),
      // Observed, not explained. What it is doing and why is the player's to
      // work out from the picture, and the picture is unambiguous.
      this.say(['Something the size of the harbour comes up out of the pool.',
        'There is machinery still bolted along its back.']),
      this.pause(30),
      this.note(['SURVIVE.', 'Get out of the way.']),
      this.pause(40),
      this.go('survive'),
    ];
  }

  private queueRestraints(): void {
    this.beats = [
      this.pause(50),
      this.say(['Those clamps are still on it. Get them off!'], 'Tarin'),
      this.note(['BREAK THE RESTRAINTS.', 'The plates part when it breathes in.']),
      this.pause(40),
      this.act(() => {
        this.ring = 0; this.bolt = 0; this.ringT = 0;
        this.ringMiss = 0; this.ringWide = 1; this.clunk = 0;
      }),
      this.go('restraints'),
    ];
  }

  private queueTideheart(): void {
    const held = this.state.hasItem(TIDEHEART);
    this.beats = [
      this.pause(60),
      this.say(['It has only ever been touched by machines.', 'Show it something else.'], 'Lyra'),
      // Canon is explicit that Meridian hold the Tideheart until Cassian gives
      // it back partway through this act, so this asks rather than assumes. If
      // some other route into this encounter has left it out of the bag the
      // beat still plays -- a soft-locked climax is not an acceptable way to
      // enforce a story flag.
      held
        ? this.note(['USE THE TIDEHEART.', 'Hold ' + CONFIRM_NAME + '. Steer left and right.'])
        : this.note(['REACH OUT.', 'Hold ' + CONFIRM_NAME + '. Steer left and right.']),
      this.pause(40),
      this.act(() => {
        this.link = 0; this.linkP = 0.5; this.linkZ = 0.5;
        this.linkSaid = 0; this.linkT = 0; this.linkWidth = 0.30;
      }),
      this.go('tideheart'),
    ];
  }

  private queueReach(): void {
    this.beats = [
      this.pause(70),
      this.note(['REACH IT.', 'Move when it is not watching you.']),
      this.pause(40),
      this.act(() => {
        this.reach = 100;
        this.watching = false;
        this.watchT = 0;
        this.watchNext = 120;
        this.playerX = LANES[1]!;
        this.playerTargetX = LANES[1]!;
        this.playerFacing = 'right';
      }),
      this.go('reach'),
    ];
  }

  private queueCalm(): void {
    this.beats = [
      this.pause(60),
      // No line here, and there must never be one. The creature they chose in
      // Sorrell's field station in Act 1 walks the last of the stone by itself
      // and sits down in front of the largest storm in Caelora's history. That
      // is the argument, and a caption over it would be somebody explaining a
      // joke. The hold is long on purpose: it is the beat the whole game has
      // been building toward and it is allowed to take its time.
      this.pause(210),
      this.go('calm'),
    ];
  }

  private queueEnding(): void {
    this.beats = [
      this.pause(60),
      this.note(['The sea is going quiet.']),
      this.pause(120),
      this.act(() => { this.captionHold = 0; }),
      this.say(['It looks at you for a long moment.', 'Then it turns, and goes down into the dark.']),
      this.pause(90),
      this.act(() => {
        this.state.setVar('neravoss_grace', Math.round(clamp(this.grace, 0, 100)));
        this.state.setFlag('neravoss_calm');
      }),
      this.go('gone'),
    ];
  }

  /* ===================================================================== *
   *  UPDATE
   * ===================================================================== */

  update(game: Game, _dt: number): void {
    this.t++;

    this.tickWorld();

    // A dialogue box was requested last frame; push it now, at the top of a
    // tick, so the scene stack's flush order stays predictable.
    if (this.pendingDialogue) {
      const { lines, who } = this.pendingDialogue;
      this.pendingDialogue = null;
      game.scenes.push(new DialogueScene(lines, {
        who,
        onDone: () => { this.blocked = false; },
      }));
      return;
    }

    if (this.holding > 0) {
      this.holding--;
      if (this.holding === 0) this.blocked = false;
      return;
    }
    if (this.blocked) return;

    if (this.beats.length > 0) {
      const beat = this.beats.shift()!;
      beat();
      return;
    }

    switch (this.phase) {
      case 'survive': this.updateSurvive(game); break;
      case 'restraints': this.updateRestraints(game); break;
      case 'tideheart': this.updateTideheart(game); break;
      case 'reach': this.updateReach(game); break;
      case 'calm': this.updateCalm(); break;
      case 'gone': this.updateGone(game); break;
      default: break;
    }
  }

  /** Everything that keeps moving no matter which phase is running. */
  private tickWorld(): void {
    if (this.hurt > 0) this.hurt--;
    if (this.flash > 0) this.flash--;

    // The storm relaxes very slowly on its own, so a clean run visibly settles
    // the weather and a scrappy one visibly does not.
    const floor = this.phase === 'calm' || this.phase === 'gone' ? 0 : 0.24;
    this.distress = Math.max(floor, this.distress - 0.00035);

    for (let i = this.spray.length - 1; i >= 0; i--) {
      const s = this.spray[i]!;
      s.t--;
      if (s.t <= 0) this.spray.splice(i, 1);
    }

    // Lightning is rare when it is calm and common when it is not.
    if (this.flash === 0 && this.calm < 0.6 && noise(this.t) < 0.0016 + this.distress * 0.004) {
      this.flash = 9;
      audio.playSfx('thunder', { volume: 0.35 + this.distress * 0.3 });
    }

    // The rain is the score. See `enter`: there is no music in this room, so
    // the bed has to be laid by hand, and it thins out as the weather lifts --
    // which means the last minute of the encounter gets quieter and quieter
    // without anything fading a track out.
    const wet = clamp01(0.3 + this.distress * 0.7) * (1 - this.calm);
    if (wet > 0.05 && this.t % 26 === 0) {
      audio.playSfx('rain', { volume: 0.05 + wet * 0.12, pitch: 0.9 + noise(this.t) * 0.25 });
    }

    if (this.captionHold > 0) {
      this.captionHold--;
      this.captionFade = Math.min(1, this.captionFade + 0.09);
    } else if (this.captionFade > 0) {
      this.captionFade -= 0.05;
      if (this.captionFade <= 0) { this.captionFade = 0; this.caption = []; }
    }

    // The player slides between stances rather than teleporting.
    const dx = this.playerTargetX - this.playerX;
    if (Math.abs(dx) > 0.6) {
      this.playerX += clamp(dx, -2.6, 2.6);
      this.walkPhase += 0.22;
      this.playerFacing = dx > 0 ? 'right' : 'left';
    } else {
      this.playerX = this.playerTargetX;
    }

    if (this.down > 0) this.down--;

    // The starter's walk out onto the spur is simulation, not decoration, and
    // must not be advanced from render -- that runs on a different clock.
    if (this.starterOut > 0) this.starterOut = Math.min(400, this.starterOut + 1);
  }

  /* --------------------------------------------------------- phase 1 */

  private updateSurvive(game: Game): void {
    if (this.down === 0) {
      if (game.input.repeated('left', 14, 9) && this.laneOf(this.playerTargetX) > 0) {
        this.playerTargetX = LANES[this.laneOf(this.playerTargetX) - 1]!;
        audio.playSfx('step_stone');
      }
      if (game.input.repeated('right', 14, 9) && this.laneOf(this.playerTargetX) < LANES.length - 1) {
        this.playerTargetX = LANES[this.laneOf(this.playerTargetX) + 1]!;
        audio.playSfx('step_stone');
      }
    }

    this.waveT++;
    switch (this.waveState) {
      case 'gap':
        if (this.waveT >= WAVE_GAP) this.beginWave();
        break;
      case 'tell':
        if (this.waveT >= this.waveTell) this.strikeWave();
        break;
      case 'strike':
        if (this.waveT >= WAVE_STRIKE) {
          this.waveState = 'gap';
          this.waveT = 0;
          if (this.wave >= WAVES) {
            this.phase = 'open';
            this.queueRestraints();
          }
        }
        break;
    }
  }

  private laneOf(x: number): number {
    let best = 0;
    for (let i = 1; i < LANES.length; i++) {
      if (Math.abs(LANES[i]! - x) < Math.abs(LANES[best]! - x)) best = i;
    }
    return best;
  }

  private beginWave(): void {
    this.waveState = 'tell';
    this.waveT = 0;
    // The last two waves take two lanes, which leaves exactly one safe stance.
    // It reads as the animal losing patience with the rock rather than as a
    // difficulty step, which is what it is.
    const doubled = this.wave >= WAVES - 2;
    const first = Math.floor(noise(this.t * 3.7 + this.wave * 11) * LANES.length) % LANES.length;
    if (!doubled) {
      this.waveLanes = [first];
    } else {
      let second = (first + 1 + Math.floor(noise(this.t * 5.3) * 2)) % LANES.length;
      if (second === first) second = (first + 1) % LANES.length;
      this.waveLanes = [first, second];
    }
    this.distress = clamp(this.distress + 0.02, 0, 1);
    audio.playSfx('fx_water', { volume: 0.35, pitch: 0.7 });
  }

  private strikeWave(): void {
    this.waveState = 'strike';
    this.waveT = 0;
    const lane = this.laneOf(this.playerX);
    const caught = this.waveLanes.includes(lane) && this.down === 0;

    for (const l of this.waveLanes) this.spray.push({ x: LANES[l]!, t: 22 });
    audio.playSfx('fx_water', { volume: 0.55 });

    if (caught) {
      this.down = WAVE_DOWN;
      this.waveHits++;
      this.grace -= 5;
      this.distress = clamp(this.distress + 0.1, 0, 1);
      // THE CONVERGENCE GUARANTEE. The first couple of soakings cost ground;
      // after that they only cost the stumble and the weather. Without this
      // the phase has no floor at all -- a player who is always half a second
      // late loses a wave for every wave they gain and the sea never stops,
      // and it was measured at four and a half minutes of it.
      if (this.waveHits <= WAVE_FORGIVE) this.wave = Math.max(0, this.wave - 1);
      else this.wave++;
      // The silent assist. Every soaking buys more warning, permanently.
      this.waveTell = Math.min(WAVE_TELL_MAX, this.waveTell + WAVE_ASSIST);
      audio.playSfx('hit', { volume: 0.5, pitch: 0.7 });
    } else {
      this.wave++;
      this.distress = Math.max(0.2, this.distress - 0.03);
    }
  }

  /* --------------------------------------------------------- phase 2 */

  /** The breathing period and open window of the clamp being worked on now. */
  private ringGauge(): { period: number; band: number } {
    const period = (RING_PERIOD[this.ring] ?? 96) * Math.pow(BOLT_FASTER, this.bolt);
    const band = Math.min(0.72,
      (RING_BAND[this.ring] ?? 0.3) * this.ringWide * Math.pow(BOLT_WIDER, this.bolt));
    return { period, band };
  }

  /** Where the marker is on that gauge, 0..1, as a there-and-back sweep. */
  private ringSweep(): number {
    const { period } = this.ringGauge();
    const raw = (this.ringT % period) / period;
    return raw < 0.5 ? raw * 2 : 2 - raw * 2;
  }

  private updateRestraints(game: Game): void {
    // The animal takes each bolt before the next one can be reached.
    if (this.clunk > 0) { this.clunk--; return; }

    this.ringT++;
    this.ringCentre = 0.5;

    if (game.input.pressed('confirm')) {
      const { band } = this.ringGauge();
      if (Math.abs(this.ringSweep() - this.ringCentre) <= band / 2) this.popBolt();
      else this.missRing();
    }
  }

  private popBolt(): void {
    this.bolt++;
    this.ringT = 0;
    this.clunk = BOLT_CLUNK;
    audio.playSfx('fx_iron', { volume: 0.55, pitch: 0.9 + this.bolt * 0.06 });
    this.distress = Math.max(0.18, this.distress - 0.03);

    if (this.bolt < (RING_BOLTS[this.ring] ?? 2)) return;
    this.popRing();
  }

  private popRing(): void {
    this.ringsOn[this.ring] = false;
    audio.playSfx('fx_heavy', { volume: 0.6 });
    audio.playSfx('stat_up', { volume: 0.45 });
    this.distress = Math.max(0.16, this.distress - 0.11);
    this.trust = clamp(this.trust + 0.07, 0, 1);
    this.ring++;
    this.bolt = 0;
    this.ringT = 0;
    this.ringMiss = 0;
    this.ringWide = 1;
    this.clunk = BOLT_CLUNK + 26;
    if (this.ring >= RINGS.length) {
      this.phase = 'open';
      this.queueTideheart();
    }
  }

  private missRing(): void {
    // A miss does not cost health, because there is no health. It bites, and
    // the animal screams, and the storm gets worse. That is the whole feedback
    // loop of this phase and it is the reason the phase exists.
    this.ringMiss++;
    this.grace -= 4;
    this.hurt = 30;
    this.clunk = MISS_BITE;
    this.flash = Math.max(this.flash, 4);
    this.distress = clamp(this.distress + 0.09, 0, 1);
    audio.playSfx('fx_debuff', { volume: 0.5, pitch: 0.55 });
    if (this.ringMiss % 2 === 0) this.ringWide = Math.min(RING_ASSIST_CAP, this.ringWide * RING_ASSIST);
  }

  /* --------------------------------------------------------- phase 3 */

  private updateTideheart(game: Game): void {
    // While a fragment of the Aurelians' record is playing, the link holds
    // itself. The player is listening, not steering, and the object is doing
    // the one thing it was built to do.
    if (this.linkListen > 0) { this.linkListen--; return; }

    this.linkT++;
    // THE SILENT ASSIST. After twenty seconds of trying, the zone slows and
    // widens, and it keeps doing so. A player who cannot steer at all still
    // gets there; they simply take longer, which is the only currency this
    // encounter charges in.
    const assist = clamp01((this.linkT - 1200) / 2400);

    // The zone wanders, and wanders harder the closer the link gets: it is not
    // a difficulty curve, it is the animal pulling away from a thing it has
    // only ever felt as a machine.
    const speed = (0.0035 + (this.link / 100) * 0.0042) * (1 - assist * 0.6);
    this.linkZ = 0.5 + Math.sin(this.linkT * speed * 3.1) * 0.24 + Math.sin(this.linkT * speed * 7.3 + 1.7) * 0.11;
    this.linkZ = clamp(this.linkZ, 0.12, 0.88);

    const width = lerp(0.30, 0.20, this.link / 100) + assist * 0.22;

    // Left/right steer; the link itself always slides back toward the middle,
    // so letting go is a decision rather than a rest.
    if (game.input.down('left')) this.linkP -= LINK_STEER;
    if (game.input.down('right')) this.linkP += LINK_STEER;
    this.linkDrift = Math.sin(this.t * 0.021) * 0.0016 + (0.5 - this.linkP) * 0.0026;
    this.linkP = clamp(this.linkP + this.linkDrift, 0, 1);

    this.linkWidth = width;
    const holding = game.input.down('confirm');
    const inZone = Math.abs(this.linkP - this.linkZ) <= width / 2;

    if (holding && inZone) {
      this.link = Math.min(100, this.link + LINK_GAIN);
      this.trust = clamp(this.trust + 0.0016, 0, 1);
      this.distress = Math.max(0.16, this.distress - 0.0016);
      if (this.t % 14 === 0) audio.playSfx('fx_charge', { volume: 0.16, pitch: 1 + this.link / 260 });
    } else if (holding) {
      this.link = Math.max(0, this.link - LINK_DRAIN);
    }

    // Three fragments as it opens. The Aurelians left a record and this is the
    // only moment in the game where it is worth hearing all of it.
    const marks = [26, 56, 86];
    while (this.linkSaid < marks.length && this.link >= marks[this.linkSaid]!) {
      const line = [
        ['It answers.', 'Something very old is speaking.'],
        ['"We built the rings."', '"We made it carry the weather for us."'],
        ['"When it broke, we drowned."', '"So we made this, to ask instead."'],
      ][this.linkSaid]!;
      this.note(line)();
      this.linkSaid++;
      this.linkListen = LINK_LISTEN;
      audio.playSfx('key_item', { volume: 0.4 });
    }

    if (this.link >= 100) {
      this.phase = 'open';
      this.trust = Math.max(this.trust, 0.4);
      this.queueReach();
    }
  }

  /* --------------------------------------------------------- phase 4 */

  private updateReach(game: Game): void {
    this.watchT++;

    if (this.watching) {
      if (this.watchT >= this.watchNext) {
        this.watching = false;
        this.watchT = 0;
        this.watchNext = 80 + Math.floor(noise(this.t * 2.1) * 70);
      }
    } else {
      // The tell: the markings brighten and the lid lifts a beat before the
      // eye is actually on you. Moving during the tell is safe, which is what
      // makes this a fair thing to read rather than a coin toss.
      this.tell = clamp(this.watchT - (this.watchNext - 28), 0, 28);
      if (this.watchT >= this.watchNext) {
        this.watching = true;
        this.watchT = 0;
        this.watchNext = 46 + Math.floor(noise(this.t * 3.9) * 46);
        this.tell = 0;
        audio.playSfx('fx_psy', { volume: 0.2, pitch: 0.7 });
      }
    }

    const moving = game.input.down('right') || game.input.down('up');
    const backing = game.input.down('left');

    if (moving && this.watching) {
      this.reach = Math.min(100, this.reach + REACH_RECOIL);
      this.grace -= 4;
      this.hurt = 22;
      this.distress = clamp(this.distress + 0.07, 0, 1);
      audio.playSfx('fx_dark', { volume: 0.4, pitch: 0.8 });
      this.watching = false;
      this.watchT = 0;
      // The silent assist again: it settles for longer after it has scared you.
      this.watchNext = 110 + Math.floor(noise(this.t) * 60);
    } else if (moving) {
      this.reach = Math.max(REACH_FLOOR, this.reach - REACH_GAIN);
      this.trust = clamp(this.trust + 0.0012, 0, 1);
      this.walkPhase += 0.16;
      this.playerFacing = 'right';
    } else if (backing) {
      this.reach = Math.min(100, this.reach + REACH_GAIN * 0.8);
      this.walkPhase += 0.16;
      this.playerFacing = 'left';
    }

    if (this.reach <= REACH_FLOOR) {
      this.phase = 'open';
      this.starterOut = 1;
      this.queueCalm();
    }
  }

  /* --------------------------------------------------------- the end */

  private updateCalm(): void {
    this.calm = Math.min(1, this.calm + 1 / CALM_FRAMES);
    this.trust = Math.min(1, this.trust + 0.004);
    this.distress = Math.max(0, this.distress - 0.004);
    if (this.calm >= 1) {
      this.phase = 'open';
      this.queueEnding();
    }
  }

  private updateGone(game: Game): void {
    // It sinks, the foam closes, and the scene hands back to the script.
    if (this.t > 190) {
      game.scenes.pop();
      this.onDone();
      this.phase = 'open';
      this.beats = [];
      this.blocked = true;
    }
  }

  /* ===================================================================== *
   *  RENDER
   * ===================================================================== */

  render(_game: Game, r: Renderer): void {
    const c = this.calm;
    this.drawSky(r, c);
    this.drawFarWall(r, c);
    this.drawSea(r, c);
    this.drawCreature(r, c);
    this.drawRain(r, c);
    this.drawFloor(r, c);
    this.drawCast(r);
    this.drawHud(r);
    if (this.flash > 0) r.tint('#dff2ff', 0.30 * (this.flash / 9));
  }

  /* --------------------------------------------------------------- sky */

  private drawSky(r: Renderer, c: number): void {
    const top = mix(STORM.skyTop, CLEAR.skyTop, c);
    const mid = mix(STORM.skyMid, CLEAR.skyMid, c);
    const low = mix(STORM.skyLow, CLEAR.skyLow, c);

    r.rect(0, 0, SCREEN_W, Math.floor(HORIZON * 0.36), top);
    r.rect(0, Math.floor(HORIZON * 0.36), SCREEN_W, Math.floor(HORIZON * 0.34), mid);
    r.rect(0, Math.floor(HORIZON * 0.70), SCREEN_W, HORIZON - Math.floor(HORIZON * 0.70), low);

    // Cloud: hard-edged bands on three speeds. Banded rather than smooth for
    // the same reason the fog is -- a gradient is the one modern thing that
    // would show on this screen.
    const heavy = 1 - c * 0.85;
    for (let layer = 0; layer < 3; layer++) {
      const speed = 0.10 + layer * 0.16 + this.distress * 0.20;
      const h = 5 + layer * 3;
      const y = 6 + layer * 19;
      const alpha = (0.16 + layer * 0.05) * heavy;
      for (let i = 0; i < 7; i++) {
        const seed = layer * 17 + i;
        const w = 44 + noise(seed) * 78;
        let x = ((-this.t * speed + i * 62 + noise(seed + 3) * 40) % (SCREEN_W + 160)) - 80;
        if (x < -160) x += SCREEN_W + 160;
        const yy = y + Math.round(noise(seed + 7) * 8);
        r.rect(Math.round(x), yy, Math.round(w), h, `rgba(6,12,20,${alpha.toFixed(3)})`);
        r.rect(Math.round(x + 6), yy - 2, Math.round(w - 14), 2, `rgba(10,20,32,${(alpha * 0.7).toFixed(3)})`);
      }
    }
  }

  /* --------------------------------------------------------------- sea */

  private drawSea(r: Renderer, c: number): void {
    const sea = mix(STORM.sea, CLEAR.sea, c);
    const lit = mix(STORM.seaLit, CLEAR.seaLit, c);
    const foam = mix(STORM.foam, CLEAR.foam, c);

    // The pool gets lighter toward the camera, which is what separates it from
    // the wall standing behind it. Banded rather than smooth, like the fog.
    const depth = SCREEN_H - HORIZON;
    for (let band = 0; band < 7; band++) {
      const k = band / 6;
      const y = HORIZON + Math.round(easeIn(k) * depth);
      const h = HORIZON + Math.round(easeIn((band + 1) / 6) * depth) - y;
      r.rect(0, y, SCREEN_W, Math.max(1, h), mix(sea, lit, k * 0.45));
    }
    // The waterline against the far wall: the brightest line in the picture,
    // and the one that tells the eye where the floor of the room stops.
    r.rect(0, HORIZON - 1, SCREEN_W, 1, rgba(foam, 0.55));
    r.rect(0, HORIZON, SCREEN_W, 1, foam);

    // Swell. The rows get taller and further apart toward the camera, which is
    // the whole of the perspective in this picture.
    const swellPower = 0.35 + this.distress * 0.65 - c * 0.55;
    for (let i = 0; i < 11; i++) {
      const k = i / 10;
      const y = HORIZON + 2 + Math.round(easeIn(k) * (SHELF_Y - HORIZON + 18));
      if (y > SCREEN_H) break;
      const amp = 1 + easeIn(k) * 5 * Math.max(0.15, swellPower);
      const speed = 0.25 + k * 1.5;
      const wavelength = 26 + k * 46;
      for (let x = 0; x < SCREEN_W; x += 2) {
        const dy = Math.round(Math.sin((x / wavelength) + this.t * 0.02 * speed + i) * amp);
        r.rect(x, y + dy, 2, 1, i % 2 === 0 ? lit : mix(sea, lit, 0.2));
      }
      if (i % 3 === 2) {
        for (let x = 0; x < SCREEN_W; x += 2) {
          const dy = Math.round(Math.sin((x / wavelength) + this.t * 0.02 * speed + i) * amp);
          if (noise(x * 0.7 + i * 31 + Math.floor(this.t / 6)) < 0.12 + swellPower * 0.16) {
            r.rect(x, y + dy - 1, 2, 1, foam);
          }
        }
      }
    }
  }

  /* -------------------------------------------------------------- rain */

  private drawRain(r: Renderer, c: number): void {
    const strength = clamp01(0.32 + this.distress * 0.68) * (1 - c);
    if (strength <= 0.02) return;
    const drops = Math.round(60 + strength * 130);
    const lean = 3 + this.distress * 3;
    const alpha = 0.12 + strength * 0.20;
    for (let i = 0; i < drops; i++) {
      const seed = i * 1.37;
      const speed = 5 + noise(seed) * 6;
      const x = (noise(seed + 1) * (SCREEN_W + 90) - this.t * lean * 0.35) % (SCREEN_W + 90);
      const y = (noise(seed + 2) * SCREEN_H + this.t * speed) % (SCREEN_H + 20);
      const len = 4 + Math.round(noise(seed + 3) * 5);
      const px = Math.round((x + 90) % (SCREEN_W + 90)) - 45;
      r.rect(px, Math.round(y) - len, 1, len, `rgba(178,214,232,${alpha.toFixed(3)})`);
    }
  }

  /* ===================================================================== *
   *  NERAVOSS
   *
   *  A parametric spine sampled once per authoring block. `s` runs 0 at the
   *  snout to 1 out past the left edge of the screen; every part of the animal
   *  -- carriage, breathing, thrashing, the hump that breaks the surface -- is
   *  a term in `spineY`, so the whole body moves as one thing.
   * ===================================================================== */

  /**
   * How hard it is looking at you, 0..1.
   *
   * The whole of phase four's readability. It drives the eye AND every marking
   * on the flank, because the player is looking at their own figure at the far
   * end of the screen when they have to make the decision, and a tell that
   * only happens inside a seven-unit eye is a tell nobody sees in time.
   */
  private watchHeat(): number {
    if (this.phase !== 'reach') return 0;
    return this.watching ? 1 : clamp01(this.tell / 28);
  }

  /** Where the snout is. Lifts as it calms, drops as it recoils. */
  private headX(): number {
    return 186 - this.calm * 6;
  }

  private headY(): number {
    const settle = this.calm * 16 + this.trust * 6;
    const recoil = (this.hurt / 30) * 9;
    return 44 + settle + recoil + Math.sin(this.t * 0.017) * 2.2;
  }

  /** Body centre-line at spine position s. */
  private spineY(s: number): number {
    const head = this.headY();
    // The long dive: the animal comes out of the water on the right, arcs over
    // and goes back under toward the left, so the far body is under the swell.
    const arc = Math.sin(s * Math.PI * 0.92) * (26 - this.calm * 9);
    // Breathing: one slow wave running down the whole length.
    const breath = Math.sin(this.t * 0.026 - s * 3.1) * (1.6 + this.calm * 0.8);
    // Thrashing: fast, short-wavelength, and scaled by how frightened it is.
    const rage = (this.distress * (1 - this.calm)) * (2 + s * 7);
    const thrash = Math.sin(this.t * 0.11 - s * 8.4) * rage
      + Math.sin(this.t * 0.19 - s * 13.1) * rage * 0.4;
    const jolt = (this.hurt / 30) * Math.sin(this.t * 0.55 - s * 6) * 5;
    return head + 12 + arc + breath + thrash + jolt;
  }

  /** Half-thickness of the body at spine position s. */
  private spineR(s: number): number {
    if (s < 0.055) {
      // The head: a blunt wedge that swells behind the jaw.
      const k = s / 0.055;
      return 6 + easeOut(k) * 15;
    }
    if (s < 0.16) return 21 + Math.sin((s - 0.055) / 0.105 * Math.PI) * 5;
    // Then a long taper out to the tail.
    const k = (s - 0.16) / 0.84;
    return Math.max(2, 24 * (1 - easeIn(k) * 0.94));
  }

  /** Screen x for a spine position. */
  private spineX(s: number): number {
    return this.headX() - s * 300;
  }

  private drawCreature(r: Renderer, c: number): void {
    const glow = mix(GLOW_HURT, GLOW_CALM, c);
    const sink = this.phase === 'gone' ? easeIn(clamp01(this.t / 170)) * 70 : 0;

    this.drawPectoral(r, sink);

    const hx = this.headX();
    // Sampled per authoring block so the silhouette stays hard-edged. The
    // whole animal is 300 units of spine over about 240 of screen.
    for (let x = -2; x <= hx + 22; x += 1) {
      const s = (hx - x) / 300;
      if (s < -0.02 || s > 1) continue;
      const ss = Math.max(0, s);
      const cy = this.spineY(ss) + sink;
      let rad = this.spineR(ss);

      // The snout tapers ahead of s=0.
      if (s < 0) rad = Math.max(0, 6 + s * 90);
      if (rad <= 0.5) continue;

      const top = Math.round(cy - rad);
      const bot = Math.round(cy + rad);
      if (bot < -4 || top > SCREEN_H) continue;

      // Underwater ROWS are drawn dimmer -- rows, not whole columns, so the
      // waterline cuts straight across the body wherever it happens to fall.
      // Switching the whole column at once made half the animal go flat the
      // moment its top edge dipped under, which is the opposite of what water
      // does to a thing lying in it.
      const dimAt = (yy: number): number => (yy > HORIZON ? 0.5 : 1);
      const dim = dimAt(top);

      // FIVE BANDS, AND THE RAMP RUNS ONE WAY.
      //
      // Bright along the back and darkening all the way to the belly, which is
      // how a round thing lit from a stormy sky looks. The first pass had the
      // belly LIGHTER than the middle, and the result was a thin bright line
      // with a gap under it and a separate teal slab below -- three shapes
      // where there should have been one animal. Plus one unit of bounce off
      // the water along the very bottom, which is the trick that keeps a dark
      // body from disappearing into a dark room.
      const h = bot - top;
      let y = top;
      this.column(r, x, y, 1, `rgba(5,11,18,${(0.9 * dim).toFixed(2)})`);
      y += 1;
      for (let b = 0; b < BODY_BANDS.length; b++) {
        const bh = b === BODY_BANDS.length - 1
          ? Math.max(1, top + h - 2 - y)
          : Math.max(1, Math.round(h * BODY_BANDS[b]!.share));
        // Split the band at the waterline if it straddles it.
        if (y < HORIZON && y + bh > HORIZON) {
          this.column(r, x, y, HORIZON - y, BODY_BANDS[b]!.color);
          this.column(r, x, HORIZON, y + bh - HORIZON, shade(BODY_BANDS[b]!.color, 0.5));
        } else {
          this.column(r, x, y, bh, shade(BODY_BANDS[b]!.color, dimAt(y)));
        }
        y += bh;
        if (y >= top + h - 1) break;
      }
      this.column(r, x, bot - 2, 1, shade('#1d6c86', dimAt(bot - 2) * 0.55));
      this.column(r, x, bot - 1, 1, shade(BODY.back, dimAt(bot - 1)));
    }

    this.drawMarkings(r, glow, sink);
    this.drawDorsal(r, sink);
    this.drawRings(r, sink);
    this.drawHead(r, glow, sink);
  }

  private column(r: Renderer, x: number, y: number, h: number, color: string): void {
    if (h <= 0) return;
    if (y + h < 0 || y > SCREEN_H) return;
    r.rect(x, y, 1, h, color);
  }

  /** The manta-like pectoral, swept back and down behind the jaw. */
  private drawPectoral(r: Renderer, sink: number): void {
    const baseS = 0.19;
    const bx = this.spineX(baseS);
    const by = this.spineY(baseS) + sink;
    const sweep = 74;
    const beat = Math.sin(this.t * 0.03) * 6 * (0.4 + this.distress);
    for (let i = 0; i < sweep; i++) {
      const k = i / sweep;
      const x = Math.round(bx - i * 0.92);
      const y = Math.round(by + 6 + easeIn(k) * (30 + beat));
      const h = Math.max(1, Math.round((1 - easeIn(k)) * 15));
      if (x < -2 || x > SCREEN_W) continue;
      const dim = y > HORIZON ? 0.45 : 1;
      this.column(r, x, y, h, shade(BODY.mid, dim));
      this.column(r, x, y, 1, shade(BODY.rim, dim));
      this.column(r, x, y + h - 1, 1, shade(BODY.edge, dim));
    }
  }

  /** The ridge of small crests running down the spine. */
  private drawDorsal(r: Renderer, sink: number): void {
    for (let i = 0; i < 22; i++) {
      const s = 0.10 + i * 0.038;
      if (s > 0.94) break;
      const x = Math.round(this.spineX(s));
      const y = Math.round(this.spineY(s) - this.spineR(s)) + sink;
      if (x < -4 || x > SCREEN_W) continue;
      const h = Math.max(1, Math.round(this.spineR(s) * 0.16));
      const dim = y > HORIZON ? 0.45 : 1;
      // A low ridge, not a row of spines: three units wide with a lit face on
      // the near side. Tall black spikes on a frightened animal read as teeth,
      // which is exactly the wrong thing for this creature to look like.
      r.rect(x - 2, y - h, 4, h + 1, shade(BODY.back, dim));
      r.rect(x - 2, y - h, 4, 1, shade(BODY.rim, dim * 0.8));
    }
  }

  /**
   * The markings.
   *
   * Two rows of them running the length of the body. They are the animal's
   * state made visible: hard and stuttering while it is frightened, steady and
   * slow once it is not, and they light back up under each clamp the moment it
   * comes off, which is the only reward phase two ever gives.
   */
  private drawMarkings(r: Renderer, glow: string, sink: number): void {
    const stutter = this.distress * (1 - this.calm);
    const heat = this.watchHeat();
    for (let i = 0; i < 18; i++) {
      const s = 0.07 + i * 0.048;
      if (s > 0.96) break;
      const x = Math.round(this.spineX(s));
      if (x < -4 || x > SCREEN_W) continue;

      // A clamp still on the body holds the light under it down.
      let suppress = 0;
      RINGS.forEach((rs, idx) => {
        if (!this.ringsOn[idx]) return;
        suppress = Math.max(suppress, clamp01(1 - Math.abs(s - rs) / 0.09));
      });

      const pulse = 0.74 + 0.26 * Math.sin(this.t * (0.05 + stutter * 0.16) - i * 0.6);
      const flicker = stutter > 0.35 && noise(i * 9 + Math.floor(this.t / 4)) < stutter * 0.22 ? 0.25 : 1;
      let a = clamp01(pulse * flicker * (1 - suppress * 0.85) * (0.62 + this.trust * 0.30 + this.calm * 0.30));
      a = Math.max(a, heat);
      if (a <= 0.04) continue;

      const cy = this.spineY(s) + sink;
      const rad = this.spineR(s);
      const dim = cy > HORIZON ? 0.5 : 1;
      // Small. Two rows of big lozenges is a row of LIT WINDOWS ON A LINER,
      // which is what the last pass looked like once the colour bug was out
      // of the way. These are spots on an animal, and the lower row is offset
      // half a step along so the flank never reads as a grid.
      const w = Math.max(1, Math.round(rad * 0.085));
      const h = Math.max(1, Math.round(rad * 0.055));

      for (const [off, slide] of [[-0.34, 0], [0.28, 0.024]] as const) {
        const mx = Math.round(this.spineX(s + slide));
        if (mx < -4 || mx > SCREEN_W) continue;
        const my = Math.round(this.spineY(s + slide) + this.spineR(s + slide) * off) + sink;
        // OPAQUE LIGHT, AND ITS OWN FLOOR.
        //
        // Two earlier passes failed the same way. Drawing these translucently
        // over a body this dark turned cyan into grey and the two rows read as
        // PORTHOLES ON A SUBMARINE; mixing them out of the body's own colour
        // made them vanish into whichever band they landed on. So they are
        // mixed out of a fixed lit blue instead, which means the dimmest one
        // is still plainly a light and the brightest is nearly white -- and
        // being light, they are not dimmed underwater the way the hull is.
        const lit = mix(mix('#2f7ea0', glow, clamp01(a)), '#ffffff', heat * 0.75);
        r.rect(mx - w - 1, my - h - 1, (w + 1) * 2, (h + 1) * 2, rgba(glow, a * 0.26));
        r.rect(mx - w, my - h, w * 2, h * 2, lit);
        // One narrower row above and below turns the block into a blob.
        r.rect(mx - w + 1, my - h - 1, Math.max(1, w - 1) * 2, 1, lit);
        r.rect(mx - w + 1, my + h, Math.max(1, w - 1) * 2, 1, lit);
        r.rect(mx - 1, my - 1, 2, 2, mix(lit, '#ffffff', 0.4));
      }
    }
  }

  /**
   * Meridian's clamps.
   *
   * Deliberately the only thing on screen with a straight line in it. The
   * animal, the sea and the sky are all curves; the machine is plate, bolt and
   * cable, and it should look bolted ON rather than part of anything.
   */
  private drawRings(r: Renderer, sink: number): void {
    RINGS.forEach((s, idx) => {
      const on = this.ringsOn[idx];
      const x = Math.round(this.spineX(s));
      if (x < -12 || x > SCREEN_W + 12) return;
      const cy = this.spineY(s) + sink;
      const rad = this.spineR(s);
      const active = this.phase === 'restraints' && idx === this.ring;

      if (!on) {
        // What is left: a scar of bare unpowered plate where it was bolted on.
        r.rect(x - 2, Math.round(cy - rad) - 1, 4, 2, RIG.dead);
        return;
      }

      const w = 7;
      const top = Math.round(cy - rad) - 3;
      // CUT OFF AT THE WATERLINE. A band that runs the full thickness of the
      // body runs well below the surface, where the hull is dark and the pool
      // is dark, and the four of them stopped reading as clamps and started
      // reading as PILINGS the creature happened to be lying behind. Ending
      // them at the water -- with the foam breaking round each one and the
      // umbilical carrying on down -- puts them back on the animal.
      const h = Math.max(14, Math.min(Math.round(rad * 2) + 8, Math.round(HORIZON + 10 - top)));

      // The shadow the hardware throws on the animal underneath it, which is
      // most of what makes it read as bolted ON rather than as part of it.
      r.rect(x - w / 2 - 2, top + 2, w + 4, h - 4, 'rgba(0,0,0,0.35)');

      // The band itself: plate, a lit left edge and a hard right one.
      r.rect(x - w / 2, top, w, h, RIG.metal);
      r.rect(x - w / 2, top, 2, h, RIG.lit);
      r.rect(x + w / 2 - 2, top, 2, h, RIG.dark);
      for (let y = top + 5; y < top + h - 4; y += 6) {
        r.rect(x - w / 2, y, w, 1, RIG.dark);
      }

      // Flanges over and under the body, wider than the band, with the bolts
      // driven through them. Straight lines and right angles: this is the only
      // thing in the picture that is not a curve.
      for (const fy of [top, top + h - 4]) {
        r.rect(x - w / 2 - 2, fy, w + 4, 4, RIG.dark);
        r.rect(x - w / 2 - 2, fy, w + 4, 1, RIG.lit);
        for (let b = 0; b < 2; b++) r.rect(x - 4 + b * 6, fy + 1, 2, 2, RIG.metal);
      }

      // Running lights. They breathe with this clamp's own gauge while it is
      // the one being worked on, so the thing on screen and the thing under
      // the player's thumb are visibly the same object.
      const beat = active
        ? 0.45 + 0.55 * Math.abs(Math.sin(this.ringT * Math.PI / (RING_PERIOD[idx] ?? 96)))
        : 0.35 + 0.25 * Math.sin(this.t * 0.09 + idx);
      const bolts = active ? this.bolt : 0;
      const need = RING_BOLTS[idx] ?? 2;
      for (let b = 0; b < need; b++) {
        const by = top + 8 + b * 5;
        if (by > top + h - 8) break;
        r.rect(x - 2, by, 4, 3, b < bolts ? RIG.dead : rgba(RIG.lamp, beat));
      }

      // Foam breaking where the hardware goes into the water.
      const waterAt = top + h;
      for (let i = 0; i < 7; i++) {
        const dx = Math.round((noise(i * 4 + idx * 13 + Math.floor(this.t / 6)) - 0.5) * 22);
        r.rect(x + dx, waterAt - 2 + Math.round(Math.sin(this.t * 0.07 + i) * 1.5), 2, 1,
          rgba('#cfeaf0', 0.35));
      }

      // The umbilical, running away toward the drowned rig below.
      for (let i = 0; i < 11; i++) {
        const cx = Math.round(x + 5 + i * 2.2);
        const cyy = Math.round(waterAt + 2 + i * 1.7 + Math.sin(this.t * 0.05 + i) * 1.2);
        if (cyy > SCREEN_H || cx > SCREEN_W) break;
        r.rect(cx, cyy, 2, 2, i % 2 ? RIG.dark : RIG.metal);
      }

      if (active && this.hurt > 0) {
        const a = this.hurt / 30;
        r.rect(x - w / 2 - 5, top - 2, w + 10, 2, rgba('#ffd9a0', a));
        r.rect(x - w / 2 - 5, top + h + 1, w + 10, 2, rgba('#ffd9a0', a));
      }
    });
  }

  /**
   * The head, and the eye.
   *
   * The single most important twenty pixels in the game. Frightened, the lid is
   * up and there is white all the way round a small hard pupil. Calm, the lid
   * comes down to a level line and the pupil opens. Nothing else on this screen
   * has to change for the encounter to have landed.
   */
  private drawHead(r: Renderer, glow: string, sink: number): void {
    const hx = this.headX();
    const hy = this.headY() + 12 + sink;

    // Crown growths: canon asks for crown-like structures round the head, and
    // they are what makes the silhouette read as this animal from one frame.
    for (let i = 0; i < 5; i++) {
      const s = 0.045 + i * 0.021;
      const x = Math.round(this.spineX(s));
      const y = Math.round(this.spineY(s) - this.spineR(s)) + sink;
      const len = 8 + i * 3 - Math.abs(i - 2) * 2;
      const lean = 2 + i;
      for (let k = 0; k < len; k++) {
        const kk = k / len;
        const bw = Math.max(1, 4 - Math.round(kk * 3));
        const bx = x - Math.round(kk * lean);
        r.rect(bx - 1, y - k, bw + 1, 1, BODY.back);
        r.rect(bx - 1, y - k, 1, 1, shade(BODY.rim, 0.8));
      }
      r.rect(x - lean - 1, y - len - 1, 3, 3, mix(BODY.back, glow, 0.4 + this.trust * 0.5));
    }

    // Jaw line: one hard stroke under the head, which is what separates the
    // head from the neck without a second silhouette.
    for (let i = 0; i < 34; i++) {
      const x = Math.round(hx - i);
      const s = i / 300;
      const y = Math.round(this.spineY(Math.max(0, s)) + this.spineR(Math.max(0, s)) * 0.42) + sink;
      r.rect(x, y, 1, 1, BODY.edge);
      if (i % 4 === 0) r.rect(x, y - 1, 1, 1, rgba(glow, 0.25));
    }

    // Gill slits.
    for (let i = 0; i < 4; i++) {
      const s = 0.075 + i * 0.013;
      const x = Math.round(this.spineX(s));
      const cy = this.spineY(s) + sink;
      const rad = this.spineR(s);
      r.rect(x, Math.round(cy - rad * 0.1), 1, Math.max(2, Math.round(rad * 0.5)), BODY.edge);
    }

    this.drawEye(r, Math.round(hx - 16), Math.round(hy - 5));
  }

  /**
   * THE EYE.
   *
   * Built row by row as a lens rather than as a box, because the difference
   * between a frightened animal and a calm one is entirely in the shape of the
   * opening, and a rectangle cannot make that shape. Three things move:
   *
   *   THE APERTURE. Terror holds it wide open with the pale ring showing all
   *   the way round a small hard pupil -- the sclera-round-the-iris look that
   *   reads as panic on any face, in any species. Calm brings the lid down to
   *   a level line and lets the pupil open.
   *
   *   THE PUPIL. Small and hard when frightened, wide and soft when not.
   *
   *   THE BROW. A hard ridge over the top that lowers as it settles, which is
   *   what stops a half-lidded eye reading as sleepy instead of as easy.
   */
  private drawEye(r: Renderer, ex: number, ey: number): void {
    const fear = 1 - Math.max(this.trust, this.calm);
    // In the last phase the eye is the whole readout: half-lidded while it is
    // settled, and wide the instant it looks at you.
    const open = this.phase === 'reach'
      ? (this.watching ? 1 : this.tell > 14 ? 0.75 : 0.30)
      : lerp(1, 0.45, Math.max(this.trust, this.calm));

    const ew = 7;
    const eh = 1 + open * 4.6;
    // The lid sits this many rows down from the top of the aperture.
    const lidTop = -eh + (1 - open) * eh * 0.9;

    const white = mix('#e2f2f8', '#a8ecd8', this.calm);
    const iris = mix('#2b6f8c', '#3f9c8a', this.calm);

    for (let dy = -Math.ceil(eh) - 1; dy <= Math.ceil(eh) + 1; dy++) {
      const k = Math.abs(dy) / (eh + 1);
      if (k > 1) continue;
      const w = Math.round(ew * Math.sqrt(Math.max(0, 1 - k * k)));
      if (w <= 0) continue;
      const y = ey + dy;

      // The socket: one dark unit all the way round the aperture.
      r.rect(ex - w - 1, y, w * 2 + 2, 1, '#040a12');
      if (dy < lidTop) continue;
      r.rect(ex - w, y, w * 2, 1, white);
    }

    // Iris and pupil, both round, both centred a little forward of the middle
    // so the animal is looking at the player rather than into the room.
    const pr = 2.6 + (1 - fear) * 1.8;
    for (let dy = -Math.ceil(pr); dy <= Math.ceil(pr); dy++) {
      const k = Math.abs(dy) / (pr + 0.5);
      if (k > 1) continue;
      const w = Math.round((pr + 0.5) * Math.sqrt(Math.max(0, 1 - k * k)));
      const y = ey + dy + Math.round((1 - open) * 1.5);
      if (y < ey + lidTop) continue;
      r.rect(ex - 1 - w, y, w * 2, 1, iris);
      const inner = Math.max(1, Math.round(w * 0.55));
      r.rect(ex - 1 - inner, y, inner * 2, 1, '#03080e');
    }
    r.rect(ex + 1, ey - Math.round(pr * 0.5), 1, 1, 'rgba(255,255,255,0.85)');

    // The brow. A hard ridge over the aperture, lowering as it settles.
    const brow = Math.round(-eh - 2 + (1 - open) * 2);
    r.rect(ex - ew - 2, ey + brow, ew * 2 + 3, 2, BODY.back);
    r.rect(ex - ew - 2, ey + brow, ew * 2 + 3, 1, shade(BODY.rim, 0.7));

    // Watching, in the last phase, is announced round the eye as well as in
    // it: the player has to be able to read it from the corner of the screen
    // while they are looking at their own feet.
    const heat = this.watchHeat();
    if (heat > 0.02) {
      // A ring round the socket, drawn as a lens the same way the eye is, so
      // it hugs the shape rather than boxing it.
      const rw = ew + 4, rh = eh + 4;
      for (let dy = -Math.ceil(rh); dy <= Math.ceil(rh); dy++) {
        const k = Math.abs(dy) / rh;
        if (k > 1) continue;
        const w = Math.round(rw * Math.sqrt(Math.max(0, 1 - k * k)));
        const edgeRow = Math.abs(dy) >= rh - 1;
        const col = rgba('#ffffff', heat * (edgeRow ? 0.55 : 0.75));
        if (edgeRow) r.rect(ex - w, ey + dy, w * 2, 1, col);
        else { r.rect(ex - w, ey + dy, 2, 1, col); r.rect(ex + w - 2, ey + dy, 2, 1, col); }
      }
    }
  }

  /* ===================================================================== *
   *  THE CHAMBER
   * ===================================================================== */

  /**
   * The near rim of the pool at a given x.
   *
   * A cosine, not a jagged coastline: this is cut stone in a round room, and
   * the curve is doing structural work. It is nearest the camera in the middle
   * and turns away toward both edges, which is what makes "you cannot get any
   * closer" a fact about the architecture rather than an invisible wall.
   */
  private rimY(x: number): number {
    return SHELF_Y + Math.cos((x / SCREEN_W - 0.5) * Math.PI) * RIM_BOW;
  }

  /** Where a figure standing on the rim puts its feet. */
  private standY(x: number): number {
    return Math.round(this.rimY(x) + 9);
  }

  /**
   * The far side of the chamber.
   *
   * A band of Aurelian wall behind the water, flaring up out of frame at both
   * edges as the ring comes round toward the camera. That flare is the only
   * thing that says "you are inside something" rather than "you are on a
   * coast", and it leaves the sky open through the crown in the middle, which
   * is where the storm has to be visible from.
   */
  private drawFarWall(r: Renderer, c: number): void {
    const stone = mix('#0a121c', '#31414e', c);
    const lip = mix('#16222f', '#4e6675', c);
    const vein = mix('#2a6f86', '#57b0b8', c);

    const dark = mix('#050a12', '#1e2a35', c);
    const slot = mix('#0e3d4c', '#2f7f8c', c);

    for (let x = 0; x < SCREEN_W; x++) {
      const edge = Math.min(x, SCREEN_W - 1 - x);
      const k = clamp01(1 - edge / 54);
      const top = Math.round(HORIZON - 26 - easeIn(k) * 84);
      const h = HORIZON - top;

      r.rect(x, top, 1, h, stone);
      // A bright lip along the crown, which is what makes the ring read as an
      // edge with sky beyond it rather than as a smear of dark paint.
      r.rect(x, top, 1, 1, lip);
      r.rect(x, top + 1, 1, 1, mix('#1c2c3a', '#5d7684', c));

      // Masonry courses. Horizontal, evenly spaced, and one unit of shadow
      // under each: without them a wall this size is a flat field of colour.
      for (let y = top + 6; y < HORIZON; y += 7) {
        r.rect(x, y, 1, 1, x % 24 < 12 ? dark : mix('#071019', '#26333e', c));
      }

      // Column ribs, closing up toward the edges. That squeeze IS the
      // perspective of a round room.
      const pitch = k > 0.45 ? 8 : 20;
      if (x % pitch < 2) {
        r.rect(x, top + 2, 1, h - 2, dark);
      } else if (x % pitch === 2) {
        r.rect(x, top + 2, 1, h - 2, mix('#13202c', '#41545f', c));
      }

      // Vein courses: the same lit seams the player has walked over in every
      // Aurelian room in the game, running round the wall at eye height.
      if ((x + Math.floor(this.t * 0.03)) % 19 < 10 && h > 14) {
        r.rect(x, top + 11, 1, 1, rgba(vein, 0.45 + this.calm * 0.35));
      }
      // Tall slots cut through the wall, with the storm behind them.
      if (h > 22 && x % 40 > 17 && x % 40 < 21) {
        r.rect(x, top + 8, 1, h - 12, slot);
        r.rect(x, top + 8, 1, 2, rgba('#ffffff', 0.10));
      }
    }
  }

  /**
   * The floor the player is standing on, and the water breaking over its edge.
   */
  private drawFloor(r: Renderer, c: number): void {
    const stone = mix('#0d1620', '#2f3f4b', c);
    const lit = mix('#1c2c3c', '#546b78', c);
    const wet = mix('#0a1119', '#1d2c34', c);
    const glyph = mix('#1b4a5a', '#3f8a92', c);

    for (let x = 0; x < SCREEN_W; x++) {
      const top = Math.round(this.rimY(x));
      r.rect(x, top, 1, SCREEN_H - top, stone);
      r.rect(x, top, 1, 2, lit);
      r.rect(x, top + 2, 1, 1, wet);
    }

    // Aurelian floor: one vein course following the rim, and the plate joints
    // radiating away from the pool. Both are on the map the player just walked
    // in over, and both are why this reads as a room.
    for (let x = 0; x < SCREEN_W; x += 2) {
      const top = Math.round(this.rimY(x));
      if ((x + Math.floor(this.t * 0.03)) % 15 < 8) {
        r.rect(x, top + 7, 2, 1, rgba(glyph, 0.35 + this.calm * 0.25));
      }
    }
    for (let i = 0; i < 11; i++) {
      const bx = 10 + i * 22;
      const top = Math.round(this.rimY(bx));
      for (let y = top + 11; y < SCREEN_H; y += 2) {
        const spread = Math.round((bx - SCREEN_W / 2) * (y - top) * 0.006);
        r.rect(bx + spread, y, 1, 1, rgba('#000000', 0.30));
      }
    }

    // Water breaking over the rim.
    const surf = 0.3 + this.distress * 0.7 - c * 0.5;
    for (let x = 0; x < SCREEN_W; x += 2) {
      const top = Math.round(this.rimY(x));
      const roll = Math.sin(x * 0.11 + this.t * 0.06) * 2 + Math.sin(this.t * 0.03) * 1.5;
      if (noise(x + Math.floor(this.t / 5)) < 0.14 + surf * 0.2) {
        r.rect(x, top - 1 + Math.round(roll), 2, 1, mix(STORM.foam, CLEAR.foam, c));
      }
    }

    // The wall of water in the phase-one waves.
    for (const s of this.spray) {
      const k = 1 - s.t / 22;
      const h = Math.round(easeOut(k) * 34);
      const a = (1 - k) * 0.85;
      const base = Math.round(this.rimY(s.x));
      for (let i = 0; i < 26; i++) {
        const dx = Math.round((noise(i * 3 + Math.floor(s.t / 2)) - 0.5) * 46);
        const dy = Math.round(noise(i * 7 + s.t) * h);
        r.rect(s.x + dx, base - dy - 2, 2, 2, rgba('#ffffff', a * (0.3 + noise(i) * 0.5)));
      }
    }
  }

  /* -------------------------------------------------------------- cast */

  private drawCast(r: Renderer): void {
    // Where the player is standing. In the last phase their position is not a
    // stance, it IS the distance: the whole progress readout for phase four is
    // the fact that the figure has moved along the rim.
    const x = this.phase === 'reach' || this.starterOut > 0
      ? lerp(LANES[0]!, RIM_TURN - 18, 1 - (this.reach - REACH_FLOOR) / (100 - REACH_FLOOR))
      : this.playerX;

    const groundY = this.standY(x);

    if (this.starterOut > 0 && this.starterSpecies) this.drawStarter(r, x, groundY);

    this.drawPlayer(r, x, groundY);
  }

  private drawPlayer(r: Renderer, x: number, groundY: number): void {
    const sheet = getAppearanceSheet(this.state.appearance);
    const walking = Math.abs(this.playerTargetX - this.playerX) > 0.6
      || (this.phase === 'reach' && (this.walkPhase % 1) > 0);
    const step = walking ? Math.floor(this.walkPhase) % 4 : 0;
    const src = sheet.src(this.playerFacing, step);

    const gx = Math.round(x * DETAIL);
    const gy = Math.round(groundY * DETAIL);
    r.ellipsePixel(gx, gy - 2, 8, 3, 'rgba(6,10,16,0.42)');

    const c = r.bctx;
    c.save();
    // Knocked flat by a wave: the sprite lies over on its side for as long as
    // it takes to get up, which is the only feedback phase one needs.
    if (this.down > 0) {
      c.translate(gx, gy);
      c.rotate(-Math.PI / 2);
      c.translate(-CHAR_W / 2, -CHAR_H);
    } else {
      c.translate(gx - CHAR_W / 2, gy - CHAR_H);
    }
    if (src.flip) {
      c.translate(CHAR_W, 0);
      c.scale(-1, 1);
    }
    c.drawImage(sheet.canvas, src.x, src.y, CHAR_W, CHAR_H, 0, 0, CHAR_W, CHAR_H);
    c.restore();
  }

  /**
   * The starter, walking the last of the stone by itself.
   *
   * It goes out ahead of the player and sits down. There is no input here and
   * no line of dialogue, and the whole game has been arguing for this picture
   * since the field station in Act 1.
   */
  private drawStarter(r: Renderer, playerX: number, groundY: number): void {
    const sp = this.starterSpecies!;
    const cv = halfBack(sp);
    const box = inkBox(sp);

    const k = easeOut(clamp01(this.starterOut / 150));

    const x = lerp(playerX + 7, RIM_TURN - 4, k);
    const gy = this.standY(x);

    const w = box.x1 - box.x0 + 1;
    const h = box.y1 - box.y0 + 1;
    const dx = x - w / (2 * DETAIL);
    const dy = gy - h / DETAIL;

    r.ellipsePixel(Math.round(x * DETAIL), Math.round(gy * DETAIL) - 2, w * 0.36, 3, 'rgba(6,10,16,0.42)');
    r.image(cv, dx, dy, box.x0, box.y0, w, h);

    // A thread of the animal's own light reaching the small creature standing
    // in front of it, once it has settled. Nothing says it; it just happens.
    if (this.calm > 0.1) {
      const a = clamp01((this.calm - 0.1) * 1.2) * 0.5;
      const from = { x: this.headX() - 18, y: this.headY() + 8 };
      const steps = 16;
      for (let i = 0; i < steps; i++) {
        const kk = i / steps;
        const px = Math.round(lerp(from.x, x, kk));
        const py = Math.round(lerp(from.y, gy - h / (2 * DETAIL), kk) + Math.sin(kk * 6 + this.t * 0.06) * 3);
        r.rect(px, py, 2, 1, rgba(GLOW_CALM, a * (1 - kk * 0.4)));
      }
    }
  }

  /* ===================================================================== *
   *  HUD
   *
   *  No bar on this screen is ever allowed to look like a health bar, because
   *  nothing in this encounter has health. Phase one counts waves as marks;
   *  phase two shows a breathing gauge that is plainly a timing gauge; phase
   *  three shows the object's own light filling; phase four shows nothing at
   *  all, because the distance is drawn as distance.
   * ===================================================================== */

  private drawHud(r: Renderer): void {
    if (this.phase === 'survive') this.drawWaveHud(r);
    if (this.phase === 'restraints') this.drawRingHud(r);
    if (this.phase === 'tideheart') this.drawLinkHud(r);
    this.drawCaption(r);
  }

  private drawWaveHud(r: Renderer): void {
    // The telegraph: a bracket that closes over the lane the sea is aimed at.
    if (this.waveState === 'tell') {
      const k = clamp01(this.waveT / this.waveTell);
      for (const l of this.waveLanes) {
        const x = LANES[l]!;
        const base = Math.round(this.rimY(x));
        const spread = Math.round((1 - k) * 26) + 8;
        const a = 0.35 + k * 0.55;
        const pulse = k > 0.82 && Math.floor(this.t / 3) % 2 === 0 ? 1 : a;
        r.rect(x - spread, base - 26, 2, 12, rgba('#ffe4b0', pulse));
        r.rect(x + spread - 2, base - 26, 2, 12, rgba('#ffe4b0', pulse));
        r.rect(x - spread, base - 26, spread * 2, 2, rgba('#ffe4b0', pulse * 0.6));
        // A rising churn of water in the lane, so the warning is diegetic as
        // well as drawn.
        for (let i = 0; i < 10; i++) {
          const dx = Math.round((noise(i * 5 + Math.floor(this.t / 3)) - 0.5) * spread * 1.6);
          const dy = Math.round(noise(i * 11 + this.t) * k * 20);
          r.rect(x + dx, base - dy - 2, 2, 2, rgba('#bfe6f2', 0.25 + k * 0.4));
        }
      }
    }

    // Waves weathered, as marks. Deliberately not a bar.
    for (let i = 0; i < WAVES; i++) {
      const x = SCREEN_W - 8 - (WAVES - i) * 6;
      const done = i < this.wave;
      r.rect(x, 6, 4, 4, done ? '#a8e8ff' : 'rgba(180,220,240,0.22)');
      if (done) r.rect(x, 6, 4, 1, '#ffffff');
    }
  }

  private drawRingHud(r: Renderer): void {
    if (this.ring >= RINGS.length) return;
    const { band } = this.ringGauge();
    const sweep = this.ringSweep();

    const w = 150;
    const x = Math.round((SCREEN_W - w) / 2);
    const y = 8;

    r.window(x - 3, y - 3, w + 6, 16, {
      fill: 'rgba(10,18,28,0.82)', border: '#0a1018', highlight: '#22384a',
    });

    // The gauge itself: the whole sweep dark, the open window lit.
    r.rect(x, y, w, 8, '#0d1a26');
    const bw = Math.round(w * band);
    const bx = Math.round(x + w * this.ringCentre - bw / 2);
    r.rect(bx, y, bw, 8, 'rgba(120,230,255,0.24)');
    r.rect(bx, y, bw, 1, 'rgba(160,240,255,0.55)');
    r.rect(bx, y + 7, bw, 1, 'rgba(160,240,255,0.35)');

    // The marker. It stops dead while the animal is taking a bolt, which is
    // the only pause in this phase and is there to be felt.
    const mx = Math.round(x + w * sweep);
    r.rect(mx - 1, y - 2, 2, 12, this.clunk > 0 ? '#7d8798' : '#ffe9c4');

    // Bolts out of this clamp, on the left; clamps off the animal, on the
    // right. Neither is a bar and neither counts down.
    const need = RING_BOLTS[this.ring] ?? 2;
    for (let b = 0; b < need; b++) {
      r.rect(x + 2 + b * 5, y + 11, 3, 3, b < this.bolt ? 'rgba(120,230,255,0.6)' : RIG.lamp);
    }
    for (let i = 0; i < RINGS.length; i++) {
      const px = x + w - 4 - (RINGS.length - i) * 7;
      r.rect(px, y + 11, 5, 3, this.ringsOn[i] ? RIG.lamp : 'rgba(120,230,255,0.5)');
    }

    // A line drawn from the gauge up to the clamp it belongs to, so there is
    // never a question about which piece of hardware this is.
    const rx = Math.round(this.spineX(RINGS[this.ring] ?? 0.3));
    const ry = Math.round(this.spineY(RINGS[this.ring] ?? 0.3) - this.spineR(RINGS[this.ring] ?? 0.3)) - 6;
    if (rx > 0 && rx < SCREEN_W && ry > y + 16) {
      for (let yy = y + 16; yy < ry; yy += 4) {
        r.rect(Math.round(lerp(x + w / 2, rx, (yy - y - 16) / Math.max(1, ry - y - 16))), yy, 1, 2,
          'rgba(255,233,196,0.35)');
      }
    }
  }

  private drawLinkHud(r: Renderer): void {
    const w = 150;
    const x = Math.round((SCREEN_W - w) / 2);
    const y = 10;
    const width = this.linkWidth;

    r.window(x - 3, y - 3, w + 6, 16, {
      fill: 'rgba(10,18,28,0.82)', border: '#0a1018', highlight: '#22384a',
    });

    r.rect(x, y, w, 8, '#0d1a26');

    const zw = Math.round(w * width);
    const zx = Math.round(x + w * this.linkZ - zw / 2);
    r.rect(zx, y, zw, 8, 'rgba(120,230,255,0.20)');
    r.rect(zx, y, zw, 1, 'rgba(160,240,255,0.5)');

    const px = Math.round(x + w * this.linkP);
    const held = Math.abs(this.linkP - this.linkZ) <= width / 2;
    r.rect(px - 1, y - 2, 2, 12, held ? '#c8fff0' : '#ffb0a0');

    // The object itself, filling. This is the only meter in the encounter and
    // it is drawn as the Tideheart rather than as a bar for that reason.
    const ox = SCREEN_W - 22;
    const oy = 18;
    const k = this.link / 100;
    r.rect(ox - 7, oy - 7, 14, 14, '#2b2f3a');
    r.rect(ox - 6, oy - 6, 12, 12, '#0d2430');
    const fill = Math.round(k * 10);
    if (fill > 0) r.rect(ox - 5, oy + 5 - fill, 10, fill, rgba(GLOW_HURT, 0.55 + k * 0.45));
    r.rect(ox - 7, oy - 7, 14, 1, '#7d8798');
    for (let i = 0; i < 4; i++) {
      const a = k > i / 4 ? 0.8 : 0.15;
      r.rect(ox - 9 - i * 2, oy - 1, 1, 2, rgba(GLOW_HURT, a));
    }
  }

  private drawCaption(r: Renderer): void {
    if (this.caption.length === 0) return;
    const a = clamp01(this.captionFade);
    if (a <= 0.02) return;

    // WRAPPED, not trusted. Centred text that overruns its box does not clip,
    // it spills out of both ends of the screen, and one line of the Aurelian
    // record duly shipped as "swers. Something very old is speaking throu".
    // The lines below are written short; this is the guard, not the plan.
    const boxW = SCREEN_W - 12;
    const lines: string[] = [];
    for (const line of this.caption) {
      for (const part of r.wrapText(line, boxW - 10)) lines.push(part);
    }
    if (lines.length === 0) return;

    const h = 8 + lines.length * 10;
    const y = SCREEN_H - h - 4;
    r.window(6, y, boxW, h, {
      fill: `rgba(7,14,22,${(0.95 * a).toFixed(2)})`,
      border: `rgba(6,10,16,${a.toFixed(2)})`,
      highlight: `rgba(40,70,90,${a.toFixed(2)})`,
    });
    lines.forEach((line, i) => {
      r.text(line, SCREEN_W / 2, y + 4 + i * 10, {
        align: 'center',
        color: i === 0 ? `rgba(228,248,255,${a.toFixed(2)})` : `rgba(186,216,232,${a.toFixed(2)})`,
      });
    });
  }
}

/* ===================================================================== *
 *  COLOUR HELPERS
 * ===================================================================== */

/** Flat multiply, for the rows of the body that are under the swell. */
function shade(hex: string, k: number): string {
  if (k >= 1) return hex;
  const [r, g, b] = hexRgb(hex);
  return `rgb(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)})`;
}

function rgba(hex: string, a: number): string {
  const [r, g, b] = hexRgb(hex);
  return `rgba(${r},${g},${b},${clamp01(a).toFixed(3)})`;
}
