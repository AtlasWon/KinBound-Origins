/**
 * Move effects.
 *
 * Every move carries an `animation` id in its JSON. This module turns that id
 * into a short scripted performance: emitters scheduled over time, particles
 * with their own physics, and a handful of dedicated drawables (beams, bolts,
 * slash arcs, shock rings, ground cracks, barriers) that particles alone
 * cannot fake.
 *
 * The design rule is that a player should be able to tell what happened with
 * the sound off and the text skipped. So each archetype owns a distinct
 * *motion*, not just a distinct colour: a punch compresses and snaps back, a
 * beam charges then releases, ice converges inward, earth erupts from below,
 * wind sweeps sideways. Colour comes from the move's type on top of that.
 *
 * Every offensive archetype is built in three beats, because that is what the
 * reference games do and it is what an effect needs to read as an *action*
 * rather than a decoration:
 *
 *   WIND-UP at the attacker  -- the move has an author. Motes gather, the user
 *                               lunges back, a glow builds.
 *   TRAVEL across the field  -- the move has distance. This is where each
 *                               archetype's character actually lives: a stream,
 *                               a jet, a forked path, a spinning blade.
 *   ARRIVAL on the defender  -- the move has weight. Hit-stop, a burst, debris.
 *
 * Effects that were only a burst at the destination all looked like the same
 * move in a different colour, which is the single thing this pass set out to
 * fix.
 *
 * Coordinates are logical units, matching the battle scene's layout; the
 * conversion to buffer pixels happens once at draw time.
 */

import { DETAIL, SCREEN_W, type Renderer } from '../engine/renderer.js';

export interface FxPoint { x: number; y: number }

/**
 * The field the effects may paint in.
 *
 * The message box starts at y=114 and the battle scene draws it *after* the
 * effect layer, so a stray particle could never actually cover the text -- but
 * an ember sliding under the box and vanishing mid-fall looks broken. Clipping
 * here keeps every effect inside the arena it belongs to.
 */
const FIELD_BOTTOM = 112;

/** Hard ceiling on live particles. A dropped frame costs more than a puff. */
const MAX_PARTICLES = 360;

type Kind =
  | 'dot' | 'streak' | 'star' | 'wisp' | 'smoke'
  | 'flame' | 'drop' | 'glob' | 'bug'
  | 'shard' | 'rock' | 'blade' | 'crystal' | 'gear' | 'glyph' | 'crescent' | 'arrow';

/** Shapes that are baked onto the design grid at a fixed set of angles. */
const MASKED: ReadonlySet<Kind> = new Set<Kind>(
  ['shard', 'rock', 'blade', 'crystal', 'gear', 'glyph', 'crescent', 'arrow'],
);

/**
 * A particle that drips off another particle as it flies.
 *
 * This is what turns a fireball into a *flamethrower*: the smoke curling off
 * the tail is not a separate emitter guessing where the fire went, it is spawned
 * from the fireball's own position every couple of frames. Venom drips, frost
 * sparkle and blade swirl all fall out of the same mechanism.
 */
interface Trail {
  every: number;
  kind: Kind;
  size: number;
  life: number;
  c0: string; c1: string;
  add: boolean;
  /** Vertical drift given to each puff; negative rises. */
  rise: number;
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  ax: number; ay: number;
  life: number; max: number;
  size: number;
  c0: string; c1: string;
  kind: Kind;
  rot: number; spin: number;
  drag: number;
  add: boolean;
  /** Radians the velocity turns by each frame -- straight lines become arcs. */
  curl: number;
  /** Per-frame size multiplier. Globs swell, crystals assemble, smoke opens. */
  grow: number;
  age: number;
  /** Per-particle random phase, so flicker does not sync across a cloud. */
  phase: number;
  trail?: Trail;
}

interface Ring {
  x: number; y: number;
  r0: number; r1: number;
  squash: number;
  t: number; frames: number;
  color: string; width: number;
  add: boolean;
  /** Fraction of the life held at full opacity before the fade starts. */
  hold: number;
  /** Interior fill opacity. Zero for a plain ring, >0 for a pool or a bloom. */
  fill: number;
  rot: number; spin: number;
}

interface Beam {
  from: FxPoint; to: FxPoint;
  t: number; frames: number;
  color: string; width: number;
}

interface Bolt {
  from: FxPoint; to: FxPoint;
  t: number; frames: number;
  color: string;
  seed: number;
  branches: number;
  width: number;
  /** Draw the previous frame's path faintly behind this one. */
  ghost: boolean;
}

interface Slash {
  x: number; y: number;
  angle: number; len: number;
  t: number; frames: number;
  color: string; width: number;
  /** Perpendicular bow of the arc's midpoint. Zero is a straight cut. */
  bow: number;
}

/** A split in the ground running from the attacker toward the defender. */
interface Crack {
  from: FxPoint; to: FxPoint;
  t: number; frames: number;
  color: string;
  width: number;
  seed: number;
}

/** A polygonal shield that snaps into place and then flickers. */
interface Barrier {
  x: number; y: number;
  r: number; squash: number;
  t: number; frames: number;
  color: string;
  sides: number;
}

interface Timer { at: number; fn: () => void; }

/* ------------------------------------------------------------- colours */

function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16) || 0,
    parseInt(h.slice(2, 4), 16) || 0,
    parseInt(h.slice(4, 6), 16) || 0,
  ];
}

function mix(a: string, b: string, t: number): string {
  const A = hexRgb(a), B = hexRgb(b);
  const f = (i: number) => Math.round(A[i]! + (B[i]! - A[i]!) * t).toString(16).padStart(2, '0');
  return `#${f(0)}${f(1)}${f(2)}`;
}

const lighten = (c: string, t: number) => mix(c, '#ffffff', t);
const darken = (c: string, t: number) => mix(c, '#101018', t);

function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexRgb(hex);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha))})`;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/* --------------------------------------------------- design-grid pixels */

/**
 * A filled ellipse rasterised in 2x2 blocks.
 *
 * `ctx.ellipse` antialiases, which puts colour at half-block offsets and makes
 * a fireball look like an airbrush. Scanning rows and filling whole blocks
 * costs the same and keeps every edge on the grid the rest of the game is
 * authored on.
 */
function oval(c: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, style: string): void {
  const RY = Math.max(0, Math.round(ry));
  const X = Math.round(cx), Y = Math.round(cy);
  c.fillStyle = style;
  for (let dy = -RY; dy <= RY; dy++) {
    // The +0.35 fattens the waist slightly, which stops radius-2 blobs from
    // rasterising into a plus sign.
    const t = RY === 0 ? 0 : dy / (RY + 0.35);
    const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - t * t)));
    c.fillRect((X - w) * DETAIL, (Y + dy) * DETAIL, (w * 2 + 1) * DETAIL, DETAIL);
  }
}

/** Cell classes a baked shape can paint: body, lit facet, shaded facet, edge. */
type Cell = 0 | 1 | 2 | 3 | 4;
interface Run { y: number; x: number; w: number; v: Cell }

/**
 * Shape functions, sampled in a unit square that runs -1..1 on both axes.
 *
 * Each returns which shading band a design pixel belongs to. Light comes from
 * the upper left throughout, matching the tiles and the creature sprites; a
 * leaf lit from the other side in the middle of a battle is exactly the kind of
 * inconsistency that reads as "engine effect" rather than "art".
 */
const SHAPES: Record<string, (u: number, v: number) => Cell> = {
  // A leaf blade: pointed at both ends, with a vein down the middle.
  blade: (u, v) => {
    const half = (1 - Math.abs(u) ** 1.7) * 0.52;
    if (Math.abs(v) > half) return 0;
    if (Math.abs(v) < 0.1 && Math.abs(u) < 0.72) return 3;
    return v < -half * 0.3 ? 2 : 1;
  },
  // Ice: a long diamond with one bright facet and one in shadow.
  crystal: (u, v) => {
    if (Math.abs(u) + Math.abs(v) / 0.52 > 1) return 0;
    if (u < -0.05 && v < 0.08) return 2;
    return u > 0.32 ? 3 : 1;
  },
  // Steel: a toothed gear, hollow at the hub so it reads as machined.
  gear: (u, v) => {
    const r = Math.hypot(u, v);
    if (r < 0.24) return 0;
    const tooth = Math.cos(Math.atan2(v, u) * 6) > 0.4;
    if (r > (tooth ? 0.99 : 0.7)) return 0;
    if (r < 0.4) return 3;
    return u + v < -0.5 ? 2 : 1;
  },
  // Psychic: a broken ring with three outer ticks and a bright core.
  glyph: (u, v) => {
    const r = Math.hypot(u, v);
    const th = Math.atan2(v, u);
    if (r < 0.3) return 2;
    if (r > 0.44 && r < 0.78) return Math.abs(Math.sin(th * 3)) > 0.28 ? 1 : 0;
    if (r >= 0.82 && r < 1 && Math.cos(th * 3) > 0.8) return 2;
    return 0;
  },
  shard: (u, v) => {
    if (Math.abs(u) + Math.abs(v) / 0.58 > 1) return 0;
    return v < -0.12 ? 2 : u > 0.3 ? 3 : 1;
  },
  // Stone: a circle with three faces knocked off it, shaded on the underside.
  rock: (u, v) => {
    const r = Math.hypot(u, v);
    const th = Math.atan2(v, u);
    const lim = 0.84 + 0.16 * Math.cos(th * 3 + 0.7);
    if (r > lim) return 0;
    if (r > lim - 0.26 && v > 0.15) return 3;
    return u + v < -0.55 ? 2 : 1;
  },
  // Wind: an open crescent, fat at the belly and tapering to points.
  crescent: (u, v) => {
    const r = Math.hypot(u, v);
    const th = Math.atan2(v, u);
    if (Math.abs(th) > 1.35) return 0;
    const thick = Math.max(0.12, 0.6 * Math.cos(th * 1.1));
    if (r > 0.98 || r < 0.98 - thick) return 0;
    return v < 0 ? 2 : 1;
  },
  // Stat arrows point up at rot 0; a debuff just bakes them at rot PI.
  arrow: (u, v) => {
    const head = v >= -0.95 && v <= -0.08 && Math.abs(u) <= ((v + 0.95) / 0.87) * 0.9;
    const shaft = Math.abs(u) <= 0.3 && v > -0.08 && v < 0.9;
    if (!head && !shaft) return 0;
    return u < -0.1 ? 2 : u > 0.32 ? 3 : 1;
  },
};

/**
 * Shapes the automatic outline is skipped for.
 *
 * The outline pass marks every filled cell that touches empty space, which is
 * exactly right for a solid leaf or rock and exactly wrong for line art: a
 * two-pixel-thick rune is *all* edge, so it comes out solid black and the
 * psychic effect turns into scribble. These two carry their own shading.
 */
const NO_OUTLINE: ReadonlySet<string> = new Set(['glyph', 'crescent']);

const ROT_STEPS = 16;
const MASKS = new Map<string, Run[]>();

/**
 * Bake a shape at one size and one of sixteen angles, as horizontal runs.
 *
 * Rotating with the canvas transform would land the shape's pixels between grid
 * cells -- sub-block detail, which is the one thing the art rule forbids. Baking
 * instead means a spinning gear steps through sixteen crisp poses, which is
 * both cheaper and much closer to how the reference games animate rotation.
 */
function maskFor(shape: string, size: number, rot: number): Run[] {
  const R = Math.max(2, Math.min(8, Math.round(size)));
  const step = ((Math.round(rot / (Math.PI * 2) * ROT_STEPS) % ROT_STEPS) + ROT_STEPS) % ROT_STEPS;
  const key = `${shape}|${R}|${step}`;
  const hit = MASKS.get(key);
  if (hit) return hit;

  const fn = SHAPES[shape] ?? SHAPES.shard!;
  const a = -(step / ROT_STEPS) * Math.PI * 2;
  const ca = Math.cos(a), sa = Math.sin(a);
  const N = R * 2 + 1;
  const grid = new Uint8Array(N * N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const u = (x - R) / R, w = (y - R) / R;
      grid[y * N + x] = fn(u * ca - w * sa, u * sa + w * ca);
    }
  }

  // Hard outline, derived rather than authored: any filled cell touching empty
  // space becomes an edge pixel. Doing it here gives every shape in the game the
  // same one-pixel border the reference sprites have, for free.
  const out = new Uint8Array(grid);
  if (!NO_OUTLINE.has(shape)) {
    const empty = (x: number, y: number) => x < 0 || y < 0 || x >= N || y >= N || grid[y * N + x] === 0;
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        if (grid[y * N + x] === 0) continue;
        if (empty(x - 1, y) || empty(x + 1, y) || empty(x, y - 1) || empty(x, y + 1)) out[y * N + x] = 4;
      }
    }
  }

  const runs: Run[] = [];
  for (let y = 0; y < N; y++) {
    let x = 0;
    while (x < N) {
      const v = out[y * N + x] as Cell;
      let w = 1;
      while (x + w < N && out[y * N + x + w] === v) w++;
      if (v !== 0) runs.push({ y: y - R, x: x - R, w, v });
      x += w;
    }
  }
  MASKS.set(key, runs);
  return runs;
}

function drawMask(
  c: CanvasRenderingContext2D, shape: string, cx: number, cy: number,
  size: number, rot: number, col: string, alpha: number,
): void {
  const runs = maskFor(shape, size, rot);
  const X = Math.round(cx), Y = Math.round(cy);
  const cols: (string | null)[] = [null, null, null, null, null];
  let cur: Cell = 0;
  for (const r of runs) {
    if (r.v !== cur) {
      cur = r.v;
      let s = cols[cur];
      if (s === null) {
        s = cur === 1 ? rgba(col, alpha)
          : cur === 2 ? rgba(lighten(col, 0.42), alpha)
          : cur === 3 ? rgba(darken(col, 0.36), alpha)
          : rgba(darken(col, 0.78), alpha);
        cols[cur] = s;
      }
      c.fillStyle = s;
    }
    c.fillRect((X + r.x) * DETAIL, (Y + r.y) * DETAIL, r.w * DETAIL, DETAIL);
  }
}

/* --------------------------------------------------- particle factory */

function particle(p: Partial<Particle> & { x: number; y: number }): Particle {
  return {
    vx: 0, vy: 0, ax: 0, ay: 0,
    life: 20, max: 20, size: 2,
    c0: '#ffffff', c1: '#ffffff',
    kind: 'dot', rot: 0, spin: 0, drag: 1, add: true,
    curl: 0, grow: 1, age: 0, phase: 0,
    ...p,
  } as Particle;
}

/* ----------------------------------------------------------- the system */

export class MoveFx {
  private particles: Particle[] = [];
  private rings: Ring[] = [];
  private beams: Beam[] = [];
  private bolts: Bolt[] = [];
  private slashes: Slash[] = [];
  private cracks: Crack[] = [];
  private barriers: Barrier[] = [];
  private timers: Timer[] = [];
  private t = 0;

  /** Requested screen shake and full-screen flash, read by the battle scene. */
  shakeAmp = 0;
  shakeDecay = 0.86;
  flash = 0;
  flashColor = '#ffffff';
  /** Lunge offset the attacker sprite should take, in logical units. */
  lunge = 0;
  lungeSide: -1 | 1 = 1;
  /**
   * Frames the whole battle presentation should hold still for.
   *
   * Hit-stop. Freezing everything for a handful of frames at the moment of
   * contact is the single cheapest way to make a blow feel like it has mass --
   * fighting games have run on this for thirty years. Read and consumed by the
   * battle scene, which stops advancing its animation queue while it is set.
   */
  hitStop = 0;

  get busy(): boolean {
    return this.particles.length > 0 || this.rings.length > 0 || this.beams.length > 0
      || this.bolts.length > 0 || this.slashes.length > 0 || this.cracks.length > 0
      || this.barriers.length > 0 || this.timers.length > 0;
  }

  clear(): void {
    this.particles.length = 0;
    this.rings.length = 0;
    this.beams.length = 0;
    this.bolts.length = 0;
    this.slashes.length = 0;
    this.cracks.length = 0;
    this.barriers.length = 0;
    this.timers.length = 0;
    this.shakeAmp = 0;
    this.flash = 0;
    this.lunge = 0;
    this.hitStop = 0;
  }

  get shakeX(): number {
    if (this.shakeAmp < 0.2) return 0;
    return Math.round(Math.sin(this.t * 1.9) * this.shakeAmp);
  }

  get shakeY(): number {
    if (this.shakeAmp < 0.2) return 0;
    return Math.round(Math.sin(this.t * 2.7 + 1.1) * this.shakeAmp * 0.6);
  }

  /* --------------------------------------------------------- scheduling */

  private after(frames: number, fn: () => void): void {
    this.timers.push({ at: this.t + frames, fn });
  }

  private emit(n: number, make: (i: number) => Partial<Particle> & { x: number; y: number }): void {
    for (let i = 0; i < n; i++) {
      if (this.particles.length >= MAX_PARTICLES) return;
      this.particles.push(particle(make(i)));
    }
  }

  private ring(r: Partial<Ring> & { x: number; y: number }): void {
    this.rings.push({
      r0: 2, r1: 26, squash: 1, t: 0, frames: 14,
      color: '#ffffff', width: 2, add: true, hold: 0, fill: 0,
      rot: 0, spin: 0, ...r,
    });
  }

  private cut(s: Partial<Slash> & { x: number; y: number; angle: number; len: number }): void {
    this.slashes.push({
      t: 0, frames: 11, color: '#ffffff', width: 2, bow: 0, ...s,
    });
  }

  /* ------------------------------------------------------ shared beats */

  /** Straight-line interpolation between the two combatants. */
  private at(from: FxPoint, to: FxPoint, t: number): FxPoint {
    return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
  }

  /**
   * The gathering beat every offensive move opens on.
   *
   * An effect that starts at the defender has no author -- it reads as something
   * that happened *to* the user's Kin rather than something it did. A handful of
   * motes spiralling inward for half a second fixes that, and it gives the eye
   * somewhere to be before the travel phase crosses the field.
   */
  private windUp(
    at: FxPoint, c: string, frames: number,
    opts: { kind?: Kind; rate?: number; radius?: number; ring?: boolean; curl?: number } = {},
  ): void {
    const kind = opts.kind ?? 'star';
    const rate = opts.rate ?? 2;
    const R = opts.radius ?? 30;
    const curl = opts.curl ?? 0.1;
    for (let f = 0; f < frames; f++) {
      this.after(f, () => {
        // The cloud closes in as the wind-up runs, so the last motes are already
        // on top of the user when the move fires.
        const tight = 1 - (f / frames) * 0.55;
        this.emit(rate, () => {
          const a = rand(0, Math.PI * 2);
          const r = R * tight * rand(0.55, 1.1);
          const life = Math.round(rand(8, 13));
          return {
            x: at.x + Math.cos(a) * r, y: at.y + Math.sin(a) * r * 0.8,
            vx: -Math.cos(a) * r / life, vy: -Math.sin(a) * r * 0.8 / life,
            curl, life, max: life,
            size: rand(1, 2.4), kind,
            c0: '#ffffff', c1: c,
          };
        });
      });
    }
    if (opts.ring !== false) {
      this.after(Math.max(0, frames - 4), () => {
        this.ring({ x: at.x, y: at.y, r0: 20, r1: 3, frames: 9, color: lighten(c, 0.6), width: 2 });
      });
    }
  }

  /** The attacker rocks back, then drives forward. Read by the battle scene. */
  private crouch(back: number, hold: number, drive: number, at: number): void {
    this.after(0, () => { this.lunge = -back; });
    this.after(hold, () => { this.lunge = drive; });
    this.after(at, () => { this.lunge = 0; });
  }

  /**
   * The shared impact finisher.
   *
   * Every offensive archetype gets this on top of its own performance, at the
   * frame its payload lands. Layering one consistent punctuation mark over
   * twenty different effects is what makes them all feel like they belong to
   * the same game -- and it means a new move gets real weight for free by
   * picking any existing animation id.
   *
   * The burst has a DIRECTION. A symmetric twelve-spoke star is a decoration
   * that happens to be centred on somebody; a blow that came from the left
   * throws its chips to the right, and that one change is most of the
   * difference between an effect that decorates the target and one that hits
   * it. Everything here is fanned around `dir`: the long spokes, the chip
   * shower, the ground kick, and the short back-spray that sells the rebound.
   *
   * The white is deliberately small and brief. A big white core covering the
   * defender for ten frames reads as the sprite being deleted rather than
   * struck, and it made fire, water and thunder all land identically -- so the
   * white says *contact* for four frames and the colour is what is left.
   */
  private impactBurst(
    to: FxPoint, c: string, k: number,
    opts: { dir?: number; physical?: boolean; dark?: boolean } = {},
  ): void {
    const dir = opts.dir ?? 0;
    const phys = opts.physical === true;
    const hot = opts.dark ? mix(c, '#c9d0e2', 0.6) : lighten(c, 0.45);
    // The brightest thing in the burst. A dark move gets a cold grey rim where
    // everything else gets white -- pure white in the middle of a shadow is
    // what made umbral read as a light move wearing a black costume.
    const flare = opts.dark ? '#d6dbe8' : '#ffffff';

    // The freeze holds the burst's FIRST frame on screen, so whatever that
    // frame looks like is what the player actually sees for an eighth of a
    // second. Everything below therefore has to be spread out at birth: thirty
    // particles all spawned on the exact hit point and then frozen is one
    // white blob sitting where the defender used to be.
    this.hitStop = Math.round(3 + 2.5 * k);
    this.shakeAmp = Math.max(this.shakeAmp, (phys ? 7.5 : 5.5) * k);
    // A dark move dims the field instead of blooming it. Umbral landing on a
    // white flash was the one effect that fought its own type outright.
    if (opts.dark) {
      this.flash = Math.min(this.flash, -0.32);
      this.flashColor = '#000000';
    } else {
      // Kept well short of the old 0.42: at that strength the tint was still
      // visible eight frames later and the whole arena washed out behind it.
      this.flash = Math.max(this.flash, 0.3);
      this.flashColor = mix(c, '#ffffff', 0.22);
    }

    // Contact: small, hard, gone in four frames.
    this.ring({ x: to.x, y: to.y, r0: 2, r1: 13 * k, squash: 0.85, frames: 5, color: flare, width: 3 });
    // Kind: the two that are left once the white has cleared, in the move's
    // own colour, and squashed along the direction of travel so even the
    // shockwave leans the way the blow was going.
    this.ring({
      x: to.x + Math.cos(dir) * 3, y: to.y + Math.sin(dir) * 2,
      r0: 4, r1: 33 * k, squash: 0.78, frames: 13, color: hot, width: 2.5,
    });
    this.ring({ x: to.x, y: to.y, r0: 8, r1: 50 * k, squash: 0.66, frames: 19, color: c, width: 2 });
    // The floor the blow was delivered against.
    this.ring({
      x: to.x, y: to.y + 8, r0: 3, r1: 26 * k, squash: 0.24, frames: 12,
      color: opts.dark ? darken(c, 0.4) : lighten(c, 0.2), width: 2,
    });

    // Spokes, fanned forward. The two closest to the line of travel take the
    // flare and run long; the rest carry the colour, and three short ones
    // spray back the way the blow came from.
    for (let i = 0; i < 5; i++) {
      const off = (i - 2) * 0.42;
      const a = dir + off;
      const len = (40 - Math.abs(i - 2) * 6) * k;
      this.cut({
        x: to.x + Math.cos(a) * len * 0.42,
        y: to.y + Math.sin(a) * len * 0.34,
        angle: a, len, frames: Math.abs(off) < 0.5 ? 10 : 8,
        color: Math.abs(off) < 0.5 ? flare : hot,
        width: Math.abs(off) < 0.5 ? 2.6 : 1.8,
      });
    }
    for (let i = 0; i < 3; i++) {
      const a = dir + Math.PI + (i - 1) * 0.5;
      const len = 17 * k;
      this.cut({
        x: to.x + Math.cos(a) * len * 0.4, y: to.y + Math.sin(a) * len * 0.3,
        angle: a, len, frames: 7, color: hot, width: 1.5,
      });
    }

    // Chips. Fast, forward, gravity-bound: this is the debris the brief asks
    // for and it is the part that carries the direction after the rings go.
    this.emit(Math.round(13 * k), () => {
      const a = dir + rand(-0.85, 0.85);
      const sp = rand(3.4, 9) * k;
      return {
        x: to.x + Math.cos(a) * rand(1, 7), y: to.y + Math.sin(a) * rand(1, 6),
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.8 - 1.4,
        ay: 0.24, drag: 0.9,
        life: Math.round(rand(10, 22)), max: 22,
        size: rand(1, 2.6), kind: 'streak',
        c0: flare, c1: hot,
      };
    });
    // A thinner spray straight back out of the wound, so the point of contact
    // is a place things come *out of* and not just a place things fly past.
    this.emit(Math.round(5 * k), () => {
      const a = dir + Math.PI + rand(-0.7, 0.7);
      const sp = rand(1.4, 3.6) * k;
      return {
        x: to.x + Math.cos(a) * rand(1, 7), y: to.y + Math.sin(a) * rand(1, 6),
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7 - 0.9,
        ay: 0.22, drag: 0.91,
        life: Math.round(rand(9, 18)), max: 18,
        size: rand(1, 2), kind: 'star',
        c0: flare, c1: c,
      };
    });
    // The slow coloured shower, which is all that is still on screen a third
    // of a second later and is therefore what the move is remembered as.
    this.emit(Math.round(9 * k), () => {
      const a = rand(0, Math.PI * 2);
      const sp = rand(1.0, 3.4) * k;
      return {
        x: to.x + Math.cos(a) * rand(1, 7), y: to.y + Math.sin(a) * rand(1, 6),
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6 - 0.4,
        ay: 0.12, drag: 0.93,
        life: Math.round(rand(16, 32)), max: 32,
        size: rand(1, 2), kind: 'wisp',
        c0: hot, c1: c,
      };
    });
    // Ground kick: dust squeezed out sideways from under the point of contact.
    // Kept low and small on purpose -- at the target's own height and at full
    // size this was a brown cloud sitting over the defender's chest, which is
    // the exact failure the brief warns about.
    this.emit(Math.round(4 * k), () => ({
      x: to.x + rand(-5, 5), y: to.y + rand(9, 14),
      vx: (Math.cos(dir) > 0 ? 1 : -1) * rand(0.6, 3.2) * k, vy: rand(-0.6, 0.1),
      drag: 0.9, grow: 1.06,
      life: Math.round(rand(10, 17)), max: 17,
      size: rand(1.6, 2.6) * k, kind: 'smoke',
      c0: lighten(c, 0.3), c1: darken(c, 0.5), add: false,
    }));

    // The rebound. A blow that lands and leaves the attacker standing where it
    // finished has no follow-through; this bounces it back out of the hit.
    if (phys) this.after(3, () => { this.lunge = -3.4 * k; });
  }

  /* -------------------------------------------------------------- entry */

  /**
   * Start an effect. `from` is the attacker's sprite centre, `to` the
   * defender's; both in logical units.
   */
  play(anim: string, from: FxPoint, to: FxPoint, typeColor: string): void {
    const dirX = Math.sign(to.x - from.x) || 1;
    this.lungeSide = dirX as -1 | 1;

    // Size tier read off the id suffix, so a big move genuinely looks bigger.
    const scale = anim.endsWith('_big') || anim.includes('heavy') ? 1.45
      : anim.endsWith('_mid') ? 1.0
      : anim.endsWith('_small') ? 0.72
      : 1.0;

    const c = typeColor;
    switch (archetypeOf(anim)) {
      case 'impact': this.impact(from, to, c, scale, anim); break;
      case 'slash': this.slash(from, to, c, scale); break;
      case 'flame': this.flame(from, to, c, scale, anim); break;
      case 'water': this.water(from, to, c, scale, anim); break;
      case 'leaf': this.leaf(from, to, c, scale, anim); break;
      case 'bolt': this.bolt(from, to, c, scale); break;
      case 'frost': this.frost(from, to, c, scale); break;
      case 'venom': this.venom(from, to, c, scale, anim); break;
      case 'quake': this.quake(from, to, c, scale, anim); break;
      case 'wind': this.wind(from, to, c, scale, anim); break;
      case 'psy': this.psy(from, to, c, scale); break;
      case 'swarm': this.swarm(from, to, c, scale); break;
      case 'iron': this.iron(from, to, c, scale); break;
      case 'umbral': this.umbral(from, to, c, scale); break;
      case 'radiant': this.radiant(from, to, c, scale); break;
      case 'spirit': this.spirit(from, to, c, scale); break;
      case 'charge': this.charge(from, c); break;
      case 'heal': this.heal(from, '#7fe08a'); break;
      case 'shield': this.shield(from, c); break;
      case 'buff': this.statField(from, lighten(c, 0.3), 'up'); break;
      case 'debuff': this.statField(to, darken(c, 0.2), 'down'); break;
      case 'weather': this.weather(c); break;
      default: this.impact(from, to, c, scale, anim); break;
    }

    // Layer the shared finisher on anything that is actually hitting someone,
    // timed to each archetype's own moment of contact.
    const arch = archetypeOf(anim);
    const land = IMPACT_AT[arch];
    if (land !== undefined) {
      // The line the blow travelled along. Everything the burst throws is
      // fanned around this, so a hit from the left throws its debris right.
      // Measured from the *user* to the target rather than from wherever the
      // archetype happened to put its muzzle, because that is the line the
      // player watched the move cross.
      const dir = Math.hypot(to.x - from.x, to.y - from.y) < 1
        ? 0 : Math.atan2(to.y - from.y, to.x - from.x);
      const physical = PHYSICAL.has(arch);
      const dark = arch === 'umbral';
      this.after(land, () => this.impactBurst(to, c, scale, { dir, physical, dark }));
    }
  }

  /* ---------------------------------------------------------- archetypes */

  /** Blunt force: crouch, drive, compress, snap back, throw debris. */
  private impact(from: FxPoint, to: FxPoint, c: string, k: number, anim: string): void {
    const heavy = k > 1.2 || anim === 'grapple';
    this.lunge = 0;

    // Wind-up: the user digs in. Dust off the feet sells the plant before the
    // sprite has moved a pixel.
    for (let f = 0; f < 7; f++) {
      this.after(f, () => {
        this.emit(1, () => ({
          x: from.x + rand(-9, 9), y: from.y + rand(10, 16),
          vx: rand(-0.5, 0.5) * -this.lungeSide, vy: rand(-0.7, -0.2),
          drag: 0.94, grow: 1.05,
          life: Math.round(rand(12, 20)), max: 20,
          size: rand(1.6, 3) * k, kind: 'smoke',
          c0: lighten(c, 0.35), c1: darken(c, 0.5), add: false,
        }));
      });
    }
    this.windUp(from, c, 7, { rate: 1, radius: 20, ring: false });

    // Travel: the drive itself.
    //
    // Nothing is drawn in mid-field. Speed lines strung along the path were
    // the previous attempt and at 1x they are a row of pale dashes floating
    // over the grass with no body attached to them -- scratches on the
    // picture, not something crossing it. The reference games never draw the
    // charging body either; what sells the drive is the push-off, and the
    // sprite itself does the travelling by way of the lunge.
    const dirX = Math.sign(to.x - from.x) || 1;
    this.crouch(4, 7, 11 * k, 14);
    this.after(7, () => {
      // The kick off the back foot. A hard flat ring on the floor and a
      // shovel of dirt thrown the way the user came from.
      this.ring({
        x: from.x - dirX * 4, y: from.y + 12, r0: 2, r1: 17 * k, squash: 0.26,
        frames: 9, color: lighten(c, 0.45), width: 2,
      });
      this.emit(Math.round(7 * k), () => ({
        x: from.x - dirX * rand(0, 8), y: from.y + rand(9, 14),
        vx: -dirX * rand(1.4, 3.6), vy: rand(-1.8, -0.4),
        ay: 0.16, drag: 0.93, grow: 1.06,
        life: Math.round(rand(9, 16)), max: 16,
        size: rand(1.8, 3.2) * k, kind: 'smoke',
        c0: lighten(c, 0.3), c1: darken(c, 0.55), add: false,
      }));
    });
    // Wind lines peeling off the user for the three frames it is in motion,
    // pinned to the user and blowing straight back -- so they belong to a
    // thing that is moving rather than marking where it has been.
    for (let f = 0; f < 3; f++) {
      this.after(8 + f, () => {
        this.emit(2, () => ({
          x: from.x - dirX * rand(2, 10), y: from.y + rand(-10, 8),
          vx: -dirX * rand(3.2, 5), vy: rand(-0.2, 0.2),
          drag: 0.88,
          life: 4, max: 4,
          size: rand(1.4, 2.4), kind: 'streak',
          c0: '#ffffff', c1: c,
        }));
      });
    }

    // Arrival: the compression and the debris.
    //
    // The rings that used to be here are gone: the shared finisher fires on
    // this same frame and drew four of its own, so a punch was landing eight
    // concentric circles at once and the target vanished inside them. What is
    // left is what only a punch has -- a wall of force ACROSS the line of
    // travel, and rubble knocked off whatever was standing there.
    this.after(14, () => {
      this.shakeAmp = (heavy ? 6 : 3.5) * k;
      // The shared finisher already tints the field on this frame; stacking a
      // second one on top of it washed the whole arena pale for six frames and
      // took the contrast out of the blow it was supposed to be selling.
      this.flash = Math.max(this.flash, heavy ? 0.22 : 0.12);
      this.flashColor = lighten(c, 0.45);

      // One flattened wall, perpendicular to the blow: the compression.
      const across = Math.atan2(to.y - from.y, to.x - from.x) + Math.PI / 2;
      for (let i = 0; i < 3; i++) {
        this.cut({
          x: to.x + Math.cos(across) * (i - 1) * 3,
          y: to.y + Math.sin(across) * (i - 1) * 3,
          angle: across + rand(-0.14, 0.14),
          len: (34 - Math.abs(i - 1) * 10) * k, frames: 9,
          color: i === 1 ? '#ffffff' : lighten(c, 0.6),
          width: i === 1 ? 3 : 2,
        });
      }
      // Rubble knocked out from UNDER the target, not through it. Spawned at
      // chest height and full size these were half a dozen brown boulders
      // parked over the defender for twenty frames.
      this.emit(Math.round(4 * k), () => ({
        x: to.x + rand(-9, 9), y: to.y + rand(8, 14),
        vx: rand(-1.4, 1.4) + dirX * 1.4, vy: rand(-3.4, -1.8),
        ay: 0.3, spin: rand(-0.3, 0.3), rot: rand(0, 6),
        life: Math.round(rand(14, 24)), max: 24,
        size: rand(1.6, 2.6) * k, kind: 'rock',
        c0: lighten(c, 0.3), c1: darken(c, 0.45), add: false,
      }));
    });
    // The recoil: a short bounce back out of the hit.
    this.after(17, () => { this.lunge = -3 * k; });
  }

  /** A dash through the target leaving three curved cuts behind it. */
  private slash(from: FxPoint, to: FxPoint, c: string, k: number): void {
    // A cut is a thin bright line, not a wide pale one. At lighten 0.7 the
    // arcs came out near-white for every type, and the slash renderer already
    // lays a pure white core down the middle of whatever colour it is given --
    // so the colour's only job here is to say which type cut you.
    const edge = lighten(c, 0.4);
    // Wind-up: a gleam runs along the weapon before the dash.
    this.after(2, () => {
      this.cut({ x: from.x, y: from.y - 6, angle: -0.6, len: 22 * k, frames: 7, color: '#ffffff', width: 2 });
    });
    this.windUp(from, c, 6, { rate: 1, radius: 18, ring: false });
    this.crouch(4, 6, 13 * k, 13);

    // Travel: an afterimage streak crossing the gap.
    for (let f = 0; f < 5; f++) {
      this.after(6 + f, () => {
        const p = this.at(from, to, 0.15 + f * 0.18);
        this.cut({
          x: p.x, y: p.y + rand(-6, 6),
          angle: Math.atan2(to.y - from.y, to.x - from.x),
          len: 26 * k, frames: 7, color: edge, width: 1.6,
        });
      });
    }

    // Arrival: three cuts, offset in time and bowed so the eye follows them.
    // Tight in time and short-lived: three forty-pixel arcs each held for
    // twelve frames overlapped into one pale smear across the defender.
    for (let i = 0; i < 3; i++) {
      this.after(11 + i * 2, () => {
        this.cut({
          x: to.x + rand(-6, 6), y: to.y + rand(-8, 8),
          angle: -0.8 + i * 0.5, len: 44 * k, bow: (i % 2 ? 7 : -7) * k,
          frames: 8, color: edge, width: 2.4,
        });
        this.shakeAmp = 2.6 * k;
        this.emit(5, () => {
          const a = -0.8 + i * 0.3 + Math.PI / 2;
          return {
            x: to.x + rand(-10, 10), y: to.y + rand(-12, 12),
            vx: Math.cos(a) * rand(1.5, 4), vy: Math.sin(a) * rand(1.5, 4),
            ay: 0.12, drag: 0.94,
            life: Math.round(rand(8, 16)), max: 16,
            size: rand(1, 2), kind: 'streak', c0: '#ffffff', c1: c,
          };
        });
      });
    }
    this.after(13, () => { this.flash = 0.24; this.flashColor = edge; });
  }

  /**
   * Fire: a continuous stream of overlapping fireballs.
   *
   * This is the effect the whole pass was measured against. The read is: a hot
   * white core inside an orange body, dark smoke curling off the tail, embers
   * falling out of the underside, and the whole thing *arriving over several
   * frames* rather than appearing as one puff. The stream is not drawn as a
   * shape -- it emerges from firing fireballs at the target every frame and
   * letting them overlap along the path.
   */
  private flame(from: FxPoint, to: FxPoint, c: string, k: number, anim: string): void {
    const core = '#fff6d2';
    const hot = lighten(c, 0.45);
    const cool = c;
    // Smoke is grey, not a dark version of the flame. Tinting it with the type
    // colour is what turned the trail into more brown fire.
    const soot = '#6a5c55';
    // Fire leaves the mouth, not the middle of the sprite.
    const mouth = { x: from.x + (to.x - from.x) * 0.14, y: from.y - 2 };
    const dist = Math.hypot(to.x - mouth.x, to.y - mouth.y) || 1;
    const cross = 11;
    const stream = anim === 'flame_whip' ? 18 : 14;
    const base = Math.atan2(to.y - mouth.y, to.x - mouth.x);

    this.windUp(mouth, hot, 9, { rate: 2, radius: 26 });
    this.after(8, () => {
      // The hot point that the stream comes out of.
      this.emit(1, () => ({
        x: mouth.x, y: mouth.y, life: 7, max: 7,
        size: 4.5 * k, kind: 'flame', grow: 1.06,
        c0: core, c1: hot, add: false,
      }));
    });

    for (let f = 0; f < stream; f++) {
      this.after(9 + f, () => {
        // The jet fans out the longer it is held, which is what stops a long
        // stream from looking like a rope.
        const spread = 0.09 + (f / stream) * 0.15;
        this.emit(3, (i) => {
          const a = base + rand(-spread, spread);
          const sp = (dist / cross) * rand(0.85, 1.18);
          const lead = i === 0;
          const life = Math.round(cross * rand(1.05, 1.4));
          return {
            x: mouth.x + rand(-2, 2), y: mouth.y + rand(-2, 2),
            vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.18,
            ay: -0.05, drag: 0.985, grow: 1.025,
            life, max: life,
            size: Math.min(7, (lead ? rand(3.6, 5) : rand(2.2, 3.6)) * k), kind: 'flame',
            phase: rand(0, 6.3), c0: core, c1: cool, add: false,
            // Every seventh frame, not every frame. Three fireballs a frame
            // for fourteen frames, each shedding a puff every fourth, laid a
            // wall of soot across the whole right-hand half of the field and
            // the defender spent the last twenty frames behind it. Fire needs
            // enough smoke to say it is burning and no more.
            trail: {
              every: 7, kind: 'smoke', size: 2 * k, life: 9,
              c0: soot, c1: '#3f3733', add: false, rise: -0.4,
            },
          };
        });
        // Embers dropping out of the underside of the jet.
        if (f % 2 === 0) {
          const p = this.at(mouth, to, rand(0.15, 0.8));
          this.emit(1, () => ({
            x: p.x, y: p.y + rand(0, 5),
            vx: Math.cos(base) * rand(0.4, 1.4), vy: rand(-0.4, 0.6),
            ay: 0.22, drag: 0.98,
            life: Math.round(rand(16, 28)), max: 28,
            size: rand(1, 2), kind: 'streak',
            c0: '#fff2b0', c1: c,
          }));
        }
      });
    }

    // Arrival: the stream piles up and CLIMBS. The old drag of 0.95 killed the
    // rise inside three frames, so the bloom sat on top of the defender like a
    // sticker for half a second; fire that has hit something goes up.
    for (let i = 0; i < 5; i++) {
      this.after(19 + i * 2, () => {
        this.emit(3, () => {
          const a = rand(-Math.PI, 0.4);
          const sp = rand(0.8, 2.6) * k;
          const life = Math.round(rand(14, 26));
          return {
            x: to.x + rand(-8, 8), y: to.y + rand(-6, 6),
            vx: Math.cos(a) * sp * 0.7, vy: Math.sin(a) * sp - 1.5,
            ay: -0.12, drag: 0.99, grow: 1.03,
            life, max: life,
            size: Math.min(7.5, rand(2.6, 4.8) * k), kind: 'flame',
            phase: rand(0, 6.3), c0: core, c1: cool, add: false,
            trail: {
              every: 6, kind: 'smoke', size: 2.6 * k, life: 12,
              c0: soot, c1: darken(c, 0.92), add: false, rise: -0.5,
            },
          };
        });
      });
    }
    this.after(21, () => {
      this.flash = 0.32; this.flashColor = hot;
      this.shakeAmp = 3.4 * k;
      this.ring({ x: to.x, y: to.y, r0: 4, r1: 32 * k, frames: 13, color: hot, width: 3 });
      this.ring({ x: to.x, y: to.y + 7, r0: 3, r1: 26 * k, squash: 0.35, frames: 16, color: lighten(c, 0.2), width: 2 });
      this.emit(Math.round(9 * k), () => {
        const a = rand(-Math.PI, 0.3);
        const sp = rand(2, 5.5) * k;
        return {
          x: to.x, y: to.y,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          ay: 0.2, drag: 0.96,
          life: Math.round(rand(16, 30)), max: 30,
          size: rand(1, 2), kind: 'streak',
          c0: '#fff2b0', c1: c,
        };
      });
    });
  }

  /** Water: a pressurised jet with a leading blob and a wet splash. */
  private water(from: FxPoint, to: FxPoint, c: string, k: number, anim: string): void {
    const foam = lighten(c, 0.55);
    // Water has a dark side. Every drop used to run white -> type colour, so a
    // jet came out the colour of steam; a body colour below the type colour is
    // what gives the stream an edge and a volume.
    const deep = darken(c, 0.3);
    const pull = anim === 'water_pull';
    // A pull drags water off the target instead of firing it at them.
    const src = pull ? to : from;
    const dst = pull ? from : to;
    const mouth = { x: src.x + (dst.x - src.x) * 0.14, y: src.y - 2 };
    const dist = Math.hypot(dst.x - mouth.x, dst.y - mouth.y) || 1;
    const cross = 10;
    const base = Math.atan2(dst.y - mouth.y, dst.x - mouth.x);

    // Wind-up: droplets pulled in and packed into one bright blob.
    this.windUp(mouth, foam, 9, { kind: 'dot', rate: 2, radius: 28 });
    this.after(8, () => {
      this.emit(1, () => ({
        x: mouth.x, y: mouth.y, life: 6, max: 6,
        size: 2 * k, kind: 'drop', grow: 1.2,
        c0: '#ffffff', c1: foam, add: false,
      }));
    });

    // Travel: a tight jet led by one heavy blob, with spray peeling off it.
    this.after(9, () => {
      this.emit(1, () => ({
        x: mouth.x, y: mouth.y,
        vx: Math.cos(base) * (dist / cross), vy: Math.sin(base) * (dist / cross) - 0.3,
        ay: 0.08, life: cross + 3, max: cross + 3,
        size: 5.5 * k, kind: 'drop', add: false,
        c0: '#ffffff', c1: c,
        trail: { every: 1, kind: 'dot', size: 1.6 * k, life: 9, c0: foam, c1: deep, add: false, rise: 0 },
      }));
    });
    for (let f = 0; f < 14; f++) {
      this.after(10 + f, () => {
        this.emit(3, () => {
          const a = base + rand(-0.07, 0.07);
          const sp = (dist / cross) * rand(0.9, 1.15);
          const life = Math.round(cross * rand(0.9, 1.15));
          return {
            x: mouth.x + rand(-2, 2), y: mouth.y + rand(-3, 3),
            vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.25,
            ay: 0.07, life, max: life,
            size: rand(1.6, 3.4) * k, kind: 'drop',
            c0: foam, c1: deep, add: false,
          };
        });
        // Spray thrown clear of the jet, arcing away under gravity.
        const p = this.at(mouth, dst, rand(0.2, 0.85));
        this.emit(2, () => ({
          x: p.x, y: p.y + rand(-4, 4),
          vx: Math.cos(base) * rand(0.6, 1.6) + rand(-1, 1),
          vy: rand(-2.4, -0.6),
          ay: 0.24, curl: rand(-0.04, 0.04),
          life: Math.round(rand(14, 24)), max: 24,
          size: rand(1, 2.2), kind: 'dot',
          c0: foam, c1: deep, add: false,
        }));
      });
    }

    // Arrival: the wet splash. A flat ring on the ground, a rising sheet, and
    // droplets that fall back down.
    this.after(20, () => {
      this.shakeAmp = 3 * k;
      this.flash = 0.2; this.flashColor = foam;
      this.ring({ x: dst.x, y: dst.y + 7, r0: 3, r1: 34 * k, squash: 0.32, frames: 15, color: foam, width: 2.5 });
      this.ring({ x: dst.x, y: dst.y + 7, r0: 2, r1: 20 * k, squash: 0.3, frames: 20, color: lighten(c, 0.2), width: 2, fill: 0.22, hold: 0.35, add: false });
      this.ring({ x: dst.x, y: dst.y, r0: 4, r1: 26 * k, frames: 11, color: '#ffffff', width: 2 });
      this.emit(Math.round(18 * k), () => ({
        x: dst.x + rand(-9, 9), y: dst.y + rand(0, 8),
        vx: rand(-3.2, 3.2) * k, vy: rand(-5, -1.8) * k,
        ay: 0.28,
        life: Math.round(rand(16, 30)), max: 30,
        size: rand(1, 2.8), kind: 'drop',
        c0: '#eaf6ff', c1: c, add: false,
      }));
      // A low sheet of foam sliding outward along the ground. LOW: at chest
      // height and full size this was a pale slab parked over the defender for
      // most of the splash, and the splash is the beat the player is meant to
      // be reading the damage off.
      this.emit(Math.round(6 * k), () => ({
        x: dst.x + rand(-7, 7), y: dst.y + rand(8, 13),
        vx: rand(-3.6, 3.6), vy: rand(-0.4, 0.2),
        drag: 0.92, grow: 1.06,
        life: Math.round(rand(10, 16)), max: 16,
        size: rand(1.8, 2.8) * k, kind: 'smoke',
        c0: foam, c1: deep, add: false,
      }));
    });
  }

  /** Leaves: spinning blades on curved paths, each dragging a swirl. */
  private leaf(from: FxPoint, to: FxPoint, c: string, k: number, anim: string): void {
    const drain = anim === 'drain';
    const src = drain ? to : from;
    const dst = drain ? from : to;
    const pale = lighten(c, 0.45);

    // Wind-up: a swirl gathers, lifting the first blades off the ground.
    this.windUp(src, pale, 8, { kind: 'dot', rate: 2, radius: 30, curl: 0.2 });
    for (let f = 0; f < 8; f++) {
      this.after(f, () => {
        this.emit(1, () => ({
          x: src.x + rand(-16, 16), y: src.y + rand(6, 14),
          vx: rand(-0.6, 0.6), vy: rand(-1.2, -0.4),
          curl: 0.12, drag: 0.98,
          life: Math.round(rand(10, 16)), max: 16,
          size: rand(2, 3) * k, kind: 'blade',
          rot: rand(0, 6.3), spin: rand(-0.3, 0.3),
          c0: pale, c1: darken(c, 0.3), add: false,
        }));
      });
    }

    // Travel: blades launched in two fans that curve in opposite directions,
    // so the volley reads as a spiral rather than a spray.
    const n = Math.round(14 * k);
    for (let i = 0; i < n; i++) {
      this.after(9 + i * 0.7, () => {
        const side = i % 2 === 0 ? 1 : -1;
        const a = Math.atan2(dst.y - src.y, dst.x - src.x) + side * rand(0.3, 0.7);
        const sp = Math.hypot(dst.x - src.x, dst.y - src.y) / 13;
        const life = Math.round(rand(14, 20));
        this.emit(1, () => ({
          x: src.x + rand(-6, 6), y: src.y + rand(-8, 8),
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          // The curl is what bends each blade back onto the target.
          curl: -side * 0.075,
          life, max: life,
          // Floored, because the blade is the whole read of this archetype and
          // a small move must not shrink it into confetti.
          size: Math.max(3, rand(2.5, 3.8) * k), kind: 'blade',
          rot: a, spin: side * rand(0.25, 0.45),
          c0: pale, c1: darken(c, 0.32), add: false,
          trail: { every: 3, kind: 'dot', size: 1.2, life: 8, c0: lighten(c, 0.6), c1: c, add: true, rise: -0.1 },
        }));
      });
    }

    // Arrival: the blades bite, then the swirl closes over the target.
    for (let i = 0; i < 3; i++) {
      this.after(17 + i * 2, () => {
        this.cut({
          x: dst.x + rand(-8, 8), y: dst.y + rand(-8, 8),
          angle: rand(0, Math.PI), len: 30 * k, bow: rand(-7, 7),
          frames: 9, color: pale, width: 2,
        });
      });
    }
    this.after(19, () => {
      this.shakeAmp = 2.4 * k;
      this.ring({ x: dst.x, y: dst.y, r0: 30 * k, r1: 5, frames: 13, color: pale, width: 2, spin: 0.1 });
      this.emit(Math.round(10 * k), () => {
        const a = rand(0, Math.PI * 2);
        return {
          x: dst.x, y: dst.y,
          vx: Math.cos(a) * rand(1.4, 3.6), vy: Math.sin(a) * rand(1.4, 3.6) - 0.5,
          ay: 0.14, drag: 0.95, curl: 0.06,
          life: Math.round(rand(16, 28)), max: 28,
          size: rand(2, 3.4), kind: 'blade',
          rot: a, spin: rand(-0.3, 0.3),
          c0: pale, c1: darken(c, 0.35), add: false,
        };
      });
    });
  }

  /** Lightning: a forked path that re-forks every frame, blooming at both ends. */
  private bolt(from: FxPoint, to: FxPoint, c: string, k: number): void {
    const hot = lighten(c, 0.5);
    const head = { x: from.x, y: from.y - 8 };

    // Wind-up: charge crackling around the user, with short arcs snapping
    // between the motes before the main strike leaves.
    this.windUp(head, c, 9, { rate: 2, radius: 24, curl: 0.16 });
    for (let i = 0; i < 3; i++) {
      this.after(3 + i * 2, () => {
        const a = rand(0, Math.PI * 2);
        const r = rand(10, 20);
        this.bolts.push({
          from: { x: head.x, y: head.y },
          to: { x: head.x + Math.cos(a) * r, y: head.y + Math.sin(a) * r },
          t: 0, frames: 5, color: hot,
          seed: Math.floor(rand(0, 9999)), branches: 1, width: 1, ghost: false,
        });
      });
    }
    this.after(8, () => {
      this.ring({ x: head.x, y: head.y, r0: 16, r1: 2, frames: 7, color: '#ffffff', width: 2 });
    });

    // Travel: the strike. It lives long enough to be a *path* the eye can
    // follow, and re-jitters each frame so it crackles instead of sitting there.
    // Three strikes down the same channel rather than one held for fourteen
    // frames. A bolt that lives half a second is a painted line; real
    // lightning is a stutter, and re-seeding it twice is what turns the
    // channel into something that fires rather than something that hangs.
    for (let i = 1; i < 3; i++) {
      this.after(10 + i * 4, () => {
        this.bolts.push({
          from: head, to,
          t: 0, frames: 5 - i, color: hot,
          seed: Math.floor(rand(0, 9999)),
          branches: Math.round(2 + k * 2),
          width: (1 + k * 0.5) * (1 - i * 0.22), ghost: true,
        });
        this.flash = Math.max(this.flash, 0.3 - i * 0.08);
        this.flashColor = lighten(c, 0.7);
      });
    }
    this.after(10, () => {
      this.bolts.push({
        from: head, to,
        t: 0, frames: 6, color: hot,
        seed: Math.floor(rand(0, 9999)),
        branches: Math.round(3 + k * 3),
        width: 1 + k * 0.5, ghost: true,
      });
      this.flash = 0.5; this.flashColor = lighten(c, 0.85);
      this.shakeAmp = 4.4 * k;
      // Blooms at both ends: the muzzle and the strike point.
      this.ring({ x: head.x, y: head.y, r0: 2, r1: 20 * k, frames: 8, color: '#ffffff', width: 3 });
      this.ring({ x: to.x, y: to.y, r0: 2, r1: 30 * k, frames: 9, color: '#ffffff', width: 3 });
      this.emit(Math.round(14 * k), () => {
        const a = rand(0, Math.PI * 2);
        const sp = rand(2, 6) * k;
        return {
          x: to.x, y: to.y,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          drag: 0.9,
          life: Math.round(rand(8, 18)), max: 18,
          size: rand(1, 2.2), kind: 'star',
          c0: '#ffffff', c1: c,
        };
      });
    });

    // Arrival tail: residual arcs crawling over the target.
    for (let i = 0; i < 4; i++) {
      this.after(13 + i * 3, () => {
        const a = rand(0, Math.PI * 2);
        const r = rand(8, 18) * k;
        this.bolts.push({
          from: { x: to.x + Math.cos(a) * r, y: to.y + Math.sin(a) * r * 0.8 },
          to: { x: to.x - Math.cos(a) * r * 0.4, y: to.y - Math.sin(a) * r * 0.4 },
          t: 0, frames: 6, color: hot,
          seed: Math.floor(rand(0, 9999)), branches: 1, width: 0.8, ghost: false,
        });
      });
    }
    this.after(16, () => { this.flash = 0.2; });
  }

  /**
   * Ice: crystals assemble in the air, fly, and freeze the target over before
   * the whole shell shatters.
   *
   * The old version was a bank of white smoke crossing the field. White smoke
   * is what fire's exhaust looks like, what dust looks like and what a
   * psychic distortion looks like -- ice has to be *cold*, which means the
   * mist has to hold the type's blue rather than washing to white, and it has
   * to be *hard*, which means the payload is faceted and the arrival is a
   * break rather than a bloom.
   *
   * The freeze-over is the beat that was missing. Ice that only explodes on
   * the defender is a blue firework; ice that closes over the defender for
   * five frames and *then* explodes is ice.
   */
  private frost(from: FxPoint, to: FxPoint, c: string, k: number): void {
    const pale = lighten(c, 0.35);
    // The type's own blue, undiluted. Lightening it -- which is what this used
    // to do everywhere -- lands on white, and frost's colour is the entire
    // difference between it and a dust cloud.
    const ice = c;
    const deep = darken(c, 0.4);
    const n = Math.round(6 * k);
    const front = { x: from.x + (to.x - from.x) * 0.2, y: from.y - 4 };

    // Wind-up: cold rolls off the user and pools on the floor. The mist keeps
    // its blue -- a white puff at the user's mouth is a breath, not a freeze.
    this.windUp(front, ice, 8, { kind: 'dot', rate: 2, radius: 30 });
    for (let f = 0; f < 8; f++) {
      this.after(f, () => {
        this.emit(1, () => ({
          x: front.x + rand(-14, 14), y: front.y + rand(-6, 12),
          vx: rand(-0.4, 0.4), vy: rand(-0.5, 0.1),
          drag: 0.96, grow: 1.05,
          life: Math.round(rand(14, 22)), max: 22,
          size: rand(2, 3.4) * k, kind: 'smoke',
          c0: pale, c1: deep, add: false,
        }));
      });
    }
    // Cold air is heavy: a low sheet of it spreads out over the ground.
    this.after(3, () => {
      this.ring({
        x: front.x, y: from.y + 9, r0: 3, r1: 26 * k, squash: 0.26,
        frames: 16, color: ice, width: 2, fill: 0.14, hold: 0.3, add: false,
      });
    });

    // Travel: each crystal grows from a spark into a shape, then launches. The
    // assembly is the whole point -- ice that simply appears reads as a sparkle.
    // The volley has to be *in flight* while the freeze closes and gone by the
    // shatter. It used to assemble late and cross slowly, so the ice arrived
    // four frames after its own impact had finished -- the payload landing
    // after the explosion it caused.
    for (let i = 0; i < n; i++) {
      const slot = i;
      this.after(6 + i * 0.6, () => {
        const off = { x: front.x + rand(-14, 14), y: front.y + rand(-14, 10) };
        const a = Math.atan2(to.y - off.y, to.x - off.x);
        const sp = Math.hypot(to.x - off.x, to.y - off.y) / 6;
        // Assemble in place...
        this.emit(1, () => ({
          x: off.x, y: off.y,
          life: 5, max: 5, size: 1.4, grow: 1.3,
          kind: 'crystal', rot: a + Math.PI / 2, spin: 0.05,
          c0: '#ffffff', c1: ice, add: false,
        }));
        this.ring({ x: off.x, y: off.y, r0: 12, r1: 2, frames: 5, color: pale, width: 1.5 });
        // ...then fire.
        this.after(5, () => {
          this.emit(1, () => ({
            x: off.x, y: off.y,
            vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
            life: 7, max: 7,
            // Floored hard: the crystal mask is a flat diamond, so at radius
            // four it is nine logical pixels of a five-pixel-tall sliver and
            // reads as a stray sparkle rather than as a shard of ice.
            size: Math.max(5, rand(5, 6.4) * k), kind: 'crystal',
            rot: a, spin: 0.02 * (slot % 2 ? 1 : -1),
            c0: '#ffffff', c1: deep, add: false,
            trail: { every: 2, kind: 'star', size: 1.3, life: 8, c0: '#ffffff', c1: ice, add: true, rise: 0.05 },
          }));
        });
      });
    }

    // The freeze-over. Six facets grow outward from the target's mass and hold
    // there, so for a moment the defender is visibly *inside* something.
    for (let i = 0; i < 6; i++) {
      this.after(17 + i * 0.5, () => {
        const ang = (i / 6) * Math.PI * 2 + 0.4;
        const r = rand(7, 13) * k;
        this.emit(1, () => ({
          x: to.x + Math.cos(ang) * r, y: to.y + Math.sin(ang) * r * 0.85,
          life: 8, max: 8, size: 1.8, grow: 1.26,
          kind: 'crystal', rot: ang + Math.PI / 2, spin: 0,
          c0: pale, c1: deep, add: false,
        }));
      });
    }
    this.after(18, () => {
      this.ring({
        x: to.x, y: to.y, r0: 24 * k, r1: 15 * k, squash: 0.95, frames: 6,
        color: ice, width: 2.5, fill: 0.34, hold: 0.6, add: false,
      });
    });

    // Arrival: the shell breaks. Splinters, one hard rim, and a cold bloom --
    // the ring carries the blue, not white, so the last thing on screen still
    // says which move this was.
    this.after(21, () => {
      this.flash = 0.3; this.flashColor = mix(c, '#ffffff', 0.45);
      this.shakeAmp = 3.6 * k;
      this.ring({ x: to.x, y: to.y, r0: 2, r1: 16 * k, frames: 5, color: '#ffffff', width: 2.5 });
      this.ring({ x: to.x, y: to.y, r0: 6, r1: 34 * k, frames: 13, color: ice, width: 2.5 });
      this.ring({ x: to.x, y: to.y, r0: 36 * k, r1: 6, frames: 10, color: pale, width: 2 });
      this.emit(Math.round(18 * k), () => {
        const a = rand(0, Math.PI * 2);
        const sp = rand(1.8, 5.4) * k;
        return {
          x: to.x, y: to.y,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          ay: 0.12, drag: 0.95,
          life: Math.round(rand(12, 24)), max: 24,
          size: rand(2, 3.4), kind: 'shard',
          rot: a, spin: rand(-0.2, 0.2),
          c0: '#eafaff', c1: deep, add: false,
        };
      });
      // A few whole crystals survive the break and tumble away.
      this.emit(Math.round(4 * k), () => {
        const a = rand(-Math.PI, 0);
        return {
          x: to.x, y: to.y,
          vx: Math.cos(a) * rand(1.4, 3), vy: Math.sin(a) * rand(1.4, 3),
          ay: 0.24,
          life: Math.round(rand(18, 28)), max: 28,
          size: rand(2.4, 3.6), kind: 'crystal',
          rot: a, spin: rand(-0.18, 0.18),
          c0: '#ffffff', c1: c, add: false,
        };
      });
    });
  }

  /** Poison: globs that stretch as they fly, drip, and pool on landing. */
  private venom(from: FxPoint, to: FxPoint, c: string, k: number, anim: string): void {
    const cloud = anim === 'venom_cloud';
    const bright = lighten(c, 0.4);
    const mouth = { x: from.x + (to.x - from.x) * 0.15, y: from.y - 2 };
    const drip: Trail = {
      every: 3, kind: 'dot', size: 1.4 * k, life: 16,
      c0: bright, c1: darken(c, 0.5), add: false, rise: 0.4,
    };

    // Wind-up: the venom bubbles up before it is spat.
    this.windUp(mouth, bright, 9, { kind: 'dot', rate: 1, radius: 22 });
    for (let f = 0; f < 9; f++) {
      this.after(f, () => {
        this.emit(1, () => ({
          x: mouth.x + rand(-5, 5), y: mouth.y + rand(-4, 4),
          vy: rand(-0.5, -0.1), grow: 1.08,
          life: Math.round(rand(6, 12)), max: 12,
          size: rand(1.4, 2.6) * k, kind: 'glob',
          c0: bright, c1: darken(c, 0.45), add: false,
        }));
      });
    }

    // Travel: heavy globs on a lobbed arc, each shedding drips behind it.
    const shots = cloud ? 14 : 8;
    for (let i = 0; i < shots; i++) {
      this.after(9 + i * 1.4, () => {
        const sx = cloud ? mouth.x + rand(-6, 6) : mouth.x;
        const sy = cloud ? mouth.y + rand(-6, 6) : mouth.y;
        const life = 12;
        this.emit(1, () => ({
          x: sx, y: sy,
          vx: (to.x - sx) / life + rand(-0.5, 0.5),
          vy: (to.y - sy) / life - 1.5 + rand(-0.4, 0.4),
          ay: 0.25, life, max: life,
          size: rand(2.6, 4.6) * k, kind: 'glob', grow: 1.02,
          c0: bright, c1: darken(c, 0.5), add: false,
          trail: drip,
        }));
      });
    }

    // Arrival: a splat that spreads into a pool, then bubbles off it.
    this.after(21, () => {
      this.shakeAmp = 1.8 * k;
      this.flash = 0.16; this.flashColor = c;
      this.ring({ x: to.x, y: to.y + 7, r0: 3, r1: 28 * k, squash: 0.34, frames: 26, color: darken(c, 0.3), width: 2, fill: 0.4, hold: 0.5, add: false });
      this.ring({ x: to.x, y: to.y + 7, r0: 3, r1: 32 * k, squash: 0.34, frames: 14, color: bright, width: 2 });
      this.emit(Math.round(12 * k), () => ({
        x: to.x + rand(-6, 6), y: to.y + rand(0, 6),
        vx: rand(-3, 3) * k, vy: rand(-3.6, -1.2) * k,
        ay: 0.3,
        life: Math.round(rand(12, 22)), max: 22,
        size: rand(1.6, 3) * k, kind: 'glob',
        c0: bright, c1: darken(c, 0.5), add: false,
      }));
      // Bubbles rising off the pool and popping.
      for (let i = 0; i < 10; i++) {
        this.after(i * 2, () => {
          this.emit(1, () => ({
            x: to.x + rand(-16, 16), y: to.y + rand(2, 9),
            vx: rand(-0.3, 0.3), vy: rand(-1.2, -0.5),
            grow: 1.07,
            life: Math.round(rand(14, 24)), max: 24,
            size: rand(1.4, 2.8), kind: 'glob',
            c0: lighten(c, 0.55), c1: c, add: false,
          }));
        });
      }
    });
  }

  /** Earth and stone: the ground splits toward the target, then erupts. */
  private quake(from: FxPoint, to: FxPoint, c: string, k: number, anim: string): void {
    const rocky = anim.startsWith('rock');
    const lip = lighten(c, 0.4);
    const ground = 9;

    // Wind-up: the user plants and stamps. The shake starts before anything
    // visible happens, which is what makes the split feel caused.
    this.crouch(3, 5, 5 * k, 9);
    this.after(6, () => {
      this.shakeAmp = 2.4 * k;
      this.ring({ x: from.x, y: from.y + ground, r0: 2, r1: 18 * k, squash: 0.3, frames: 10, color: lip, width: 2 });
      this.emit(Math.round(6 * k), () => ({
        x: from.x + rand(-12, 12), y: from.y + ground + rand(-2, 3),
        vx: rand(-1.4, 1.4), vy: rand(-1.4, -0.4),
        drag: 0.94, grow: 1.06,
        life: Math.round(rand(14, 24)), max: 24,
        size: rand(2, 3.6) * k, kind: 'smoke',
        c0: lighten(c, 0.35), c1: darken(c, 0.45), add: false,
      }));
    });

    // Travel: the crack itself, running along the ground and widening as it
    // goes, with rubble kicked up by the leading edge.
    this.after(9, () => {
      this.cracks.push({
        from: { x: from.x, y: from.y + ground },
        to: { x: to.x, y: to.y + ground },
        t: 0, frames: 30, color: lip, width: 7 * k,
        seed: Math.floor(rand(0, 9999)),
      });
    });
    for (let f = 0; f < 11; f++) {
      this.after(10 + f, () => {
        const p = this.at(
          { x: from.x, y: from.y + ground },
          { x: to.x, y: to.y + ground },
          Math.min(1, (f + 1) / 11),
        );
        this.emit(2, () => ({
          x: p.x + rand(-5, 5), y: p.y + rand(-2, 2),
          vx: rand(-1.2, 1.2), vy: rand(-3.4, -1.2),
          ay: 0.3, spin: rand(-0.24, 0.24), rot: rand(0, 6.3),
          life: Math.round(rand(12, 22)), max: 22,
          size: rand(2, 3.6) * k, kind: rocky ? 'rock' : 'shard',
          c0: lighten(c, 0.3), c1: darken(c, 0.45), add: false,
        }));
        this.emit(1, () => ({
          x: p.x + rand(-8, 8), y: p.y,
          vx: rand(-0.8, 0.8), vy: rand(-0.7, -0.2),
          drag: 0.95, grow: 1.07,
          life: Math.round(rand(12, 22)), max: 22,
          size: rand(2, 3.6) * k, kind: 'smoke',
          c0: lighten(c, 0.3), c1: darken(c, 0.5), add: false,
        }));
      });
    }

    // Arrival: the eruption. Slabs up, dust rolling outward, the heaviest
    // shake in the game.
    this.after(21, () => {
      this.shakeAmp = 8 * k;
      this.flash = 0.24; this.flashColor = lighten(c, 0.4);
      this.ring({ x: to.x, y: to.y + ground, r0: 4, r1: 46 * k, squash: 0.28, frames: 18, color: lip, width: 3 });
      this.ring({ x: to.x, y: to.y + ground, r0: 4, r1: 30 * k, squash: 0.28, frames: 12, color: '#ffffff', width: 2 });
      this.emit(Math.round(12 * k), () => ({
        x: to.x + rand(-20, 20), y: to.y + ground + rand(-3, 3),
        vx: rand(-2.6, 2.6), vy: rand(-6.4, -3) * k,
        ay: 0.34,
        life: Math.round(rand(20, 34)), max: 34,
        size: rand(2.6, 5) * k, kind: rocky ? 'rock' : 'shard',
        rot: rand(0, 6.3), spin: rand(-0.18, 0.18),
        c0: lighten(c, 0.3), c1: darken(c, 0.45), add: false,
      }));
      // Dust rolling out along the floor rather than puffing upward.
      this.emit(Math.round(10 * k), () => ({
        x: to.x + rand(-10, 10), y: to.y + ground + rand(-2, 4),
        vx: rand(-3.4, 3.4) * k, vy: rand(-0.6, 0.1),
        drag: 0.91, grow: 1.08,
        life: Math.round(rand(18, 30)), max: 30,
        size: rand(2.4, 4.4) * k, kind: 'smoke',
        c0: lighten(c, 0.35), c1: darken(c, 0.5), add: false,
      }));
    });
  }

  /** Wind: curved crescents sweeping across, with debris caught in them. */
  private wind(from: FxPoint, to: FxPoint, c: string, k: number, anim: string): void {
    const dive = anim === 'dive' || anim === 'sky';
    const pale = lighten(c, 0.62);
    const base = Math.atan2(to.y - from.y, to.x - from.x);

    // Wind-up: air spirals in around the user, dragging leaf litter with it.
    this.windUp(from, pale, 7, { kind: 'dot', rate: 2, radius: 30, curl: 0.22 });
    if (dive) {
      // The user leaves the field and comes back down on top of the target.
      this.after(0, () => { this.lunge = -16; });
      this.after(10, () => { this.lunge = 14 * k; });
      this.after(17, () => { this.lunge = 0; this.shakeAmp = 5 * k; });
    } else {
      this.crouch(4, 6, 7 * k, 14);
    }

    // Travel: crescents sweeping along the path, alternating their bow so the
    // gust reads as turbulence rather than as a row of identical arcs.
    for (let i = 0; i < 8; i++) {
      this.after(8 + i * 1.6, () => {
        const t = 0.1 + i * 0.11;
        const p = this.at(from, to, t);
        const side = i % 2 === 0 ? 1 : -1;
        this.cut({
          x: p.x + rand(-6, 6), y: p.y + rand(-14, 14),
          angle: base + rand(-0.22, 0.22),
          len: rand(30, 50) * k, bow: side * rand(6, 12),
          frames: 12, color: pale, width: 2,
        });
        // Debris caught in the gust, curling with it.
        this.emit(3, () => ({
          x: p.x + rand(-8, 8), y: p.y + rand(-14, 14),
          vx: Math.cos(base) * rand(2.4, 4.2), vy: Math.sin(base) * 2 + rand(-1, 1),
          curl: side * 0.05, drag: 0.985,
          life: Math.round(rand(12, 22)), max: 22,
          size: i % 3 === 0 ? rand(3, 4.2) : rand(1.6, 2.8),
          kind: i % 3 === 0 ? 'blade' : 'streak',
          rot: base, spin: side * 0.3,
          c0: '#ffffff', c1: c, add: i % 3 !== 0,
        }));
      });
    }

    // Arrival: two big crescents closing over the target, then the scatter.
    this.after(17, () => {
      this.shakeAmp = Math.max(this.shakeAmp, 3 * k);
      for (let i = 0; i < 2; i++) {
        this.cut({
          x: to.x, y: to.y, angle: base + (i ? 1.2 : -1.2),
          len: 46 * k, bow: (i ? 10 : -10) * k, frames: 12,
          color: '#ffffff', width: 2.6,
        });
      }
      this.ring({ x: to.x, y: to.y, r0: 4, r1: 32 * k, squash: 0.8, frames: 13, color: pale, width: 2, spin: 0.08 });
      this.emit(Math.round(8 * k), () => {
        const a = rand(0, Math.PI * 2);
        return {
          x: to.x, y: to.y,
          // They have to CLEAR the defender. At drag 0.94 the scatter stalled
          // within three frames and left half a dozen pale arcs parked on top
          // of the sprite for the rest of the effect.
          vx: Math.cos(a) * rand(3, 6.5), vy: Math.sin(a) * rand(2.6, 5.5),
          curl: 0.07, drag: 0.985,
          life: Math.round(rand(10, 18)), max: 18,
          // Crescents need the size: below about four the baked arc is one
          // block thick and reads as a stray dash.
          size: rand(4.5, 6), kind: 'crescent',
          rot: a, spin: 0.2,
          c0: pale, c1: c, add: false,
        };
      });
    });
  }

  /** Psychic: distortion rings and slow-turning glyphs closing on the target. */
  private psy(from: FxPoint, to: FxPoint, c: string, k: number): void {
    const pale = lighten(c, 0.55);

    // Wind-up: the user's aura pulses and glyphs rise around it.
    this.windUp(from, pale, 9, { rate: 2, radius: 26, curl: 0.14 });
    for (let i = 0; i < 3; i++) {
      this.after(i * 3, () => {
        this.ring({
          x: from.x, y: from.y, r0: 4, r1: 26, squash: 0.8, frames: 12,
          color: pale, width: 2, rot: i * 0.6, spin: 0.05,
        });
      });
    }
    for (let i = 0; i < 3; i++) {
      this.after(2 + i * 2, () => {
        this.emit(1, () => ({
          x: from.x + rand(-16, 16), y: from.y + rand(-6, 10),
          vy: rand(-0.7, -0.3), grow: 1.03,
          life: Math.round(rand(14, 20)), max: 20,
          size: rand(3, 4.4), kind: 'glyph',
          rot: rand(0, 6.3), spin: 0.035,
          c0: '#ffffff', c1: c, add: false,
        }));
      });
    }

    // Travel: the distortion crosses the field as a chain of rings, with the
    // glyphs drifting after it. Nothing is thrown -- the space itself moves.
    for (let i = 0; i < 7; i++) {
      this.after(9 + i * 1.4, () => {
        const p = this.at(from, to, 0.12 + i * 0.13);
        this.ring({
          x: p.x, y: p.y, r0: 3, r1: 20 * k, squash: 0.85, frames: 12,
          color: pale, width: 2, rot: i * 0.5, spin: 0.06,
        });
        if (i % 2 === 0) {
          this.emit(1, () => ({
            x: p.x, y: p.y + rand(-10, 10),
            vx: (to.x - from.x) / 22, vy: (to.y - from.y) / 22,
            drag: 0.99,
            life: Math.round(rand(14, 22)), max: 22,
            size: rand(3, 4.6) * k, kind: 'glyph',
            rot: rand(0, 6.3), spin: 0.04,
            c0: '#ffffff', c1: c, add: false,
          }));
        }
      });
    }

    // Arrival: rings contract onto the target and the space crushes shut.
    for (let i = 0; i < 4; i++) {
      this.after(15 + i * 2, () => {
        this.ring({
          x: to.x, y: to.y, r0: 46 * k, r1: 4, frames: 14,
          color: pale, width: 2, rot: i * 0.4, spin: -0.06,
        });
      });
    }
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      this.after(14 + i * 0.4, () => {
        this.emit(1, () => ({
          x: to.x + Math.cos(a) * 40, y: to.y + Math.sin(a) * 32,
          vx: -Math.cos(a) * 2.8, vy: -Math.sin(a) * 2.2,
          curl: 0.06, drag: 0.99,
          life: 16, max: 16, size: rand(1.4, 3), kind: 'star',
          c0: '#ffffff', c1: c,
        }));
      });
    }
    this.after(21, () => {
      this.flash = 0.32; this.flashColor = pale;
      this.shakeAmp = 3.6 * k;
      this.emit(Math.round(14 * k), () => {
        const a = rand(0, Math.PI * 2);
        const sp = rand(1.4, 4.6) * k;
        return {
          x: to.x, y: to.y,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.8,
          curl: -0.05, drag: 0.93,
          life: Math.round(rand(14, 26)), max: 26,
          size: rand(1.4, 3.2), kind: 'star',
          c0: '#ffffff', c1: c,
        };
      });
      this.emit(3, () => {
        const a = rand(0, Math.PI * 2);
        return {
          x: to.x, y: to.y,
          vx: Math.cos(a) * 1.6, vy: Math.sin(a) * 1.3,
          drag: 0.92, grow: 1.04,
          life: 20, max: 20, size: 4 * k, kind: 'glyph',
          rot: a, spin: 0.05,
          c0: '#ffffff', c1: c, add: false,
        };
      });
    });
  }

  /** Bugs: a cloud of individual insects, each with its own wing flicker. */
  private swarm(from: FxPoint, to: FxPoint, c: string, k: number): void {
    const n = Math.round(34 * k);

    // Wind-up: the swarm lifts off the user a few at a time and circles.
    for (let i = 0; i < 10; i++) {
      this.after(i * 0.8, () => {
        const a = rand(0, Math.PI * 2);
        this.emit(1, () => ({
          x: from.x + rand(-8, 8), y: from.y + rand(-4, 12),
          vx: Math.cos(a) * 1.4, vy: Math.sin(a) * 1.2 - 0.4,
          curl: 0.2, drag: 0.99,
          life: Math.round(rand(10, 16)), max: 16,
          size: 2.4, kind: 'bug', phase: rand(0, 6.3),
          c0: lighten(c, 0.45), c1: c, add: false,
        }));
      });
    }

    // Travel: the cloud crosses in three waves.
    //
    // It used to leave one insect every half frame with a wobble as large as
    // its own travel speed, which spreads thirty-odd bugs so thinly across the
    // field that at 1x it is a scatter of specks with no shape -- the one
    // thing a swarm has to have is *density*. Three tight departures with the
    // wobble cut to a fifth of the crossing speed gives the eye three clumps
    // to track, and clumps are what read as a swarm.
    const wave = Math.ceil(n / 3);
    for (let w = 0; w < 3; w++) {
      for (let i = 0; i < wave; i++) {
        this.after(9 + w * 3 + i * 0.16, () => {
          const wob = rand(0, Math.PI * 2);
          const life = Math.round(rand(15, 20));
          this.emit(1, () => ({
            x: from.x + rand(-7, 7), y: from.y + rand(-7, 7),
            vx: (to.x - from.x) / 14 + Math.cos(wob) * 0.85,
            vy: (to.y - from.y) / 14 + Math.sin(wob) * 0.85,
            curl: (i % 2 ? 1 : -1) * 0.07, drag: 0.99,
            life, max: life,
            size: 2.4, kind: 'bug', phase: rand(0, 6.3),
            c0: lighten(c, 0.45), c1: c, add: false,
          }));
        });
      }
    }

    // Arrival: the cloud tightens and bites, over several frames.
    for (let i = 0; i < 5; i++) {
      this.after(19 + i * 2, () => {
        this.cut({
          x: to.x + rand(-12, 12), y: to.y + rand(-12, 12),
          angle: rand(0, Math.PI), len: 14 * k, frames: 6,
          color: lighten(c, 0.6), width: 1.6,
        });
      });
    }
    // The boil: insects held in a tight orbit around the target rather than
    // thrown away from it, so the moment of the bite is the one moment the
    // swarm is a solid mass instead of a scatter.
    for (let i = 0; i < Math.round(16 * k); i++) {
      this.after(22 + i * 0.2, () => {
        const a = rand(0, Math.PI * 2);
        const r = rand(6, 15) * k;
        this.emit(1, () => ({
          x: to.x + Math.cos(a) * r, y: to.y + Math.sin(a) * r * 0.85,
          vx: -Math.sin(a) * 2.4, vy: Math.cos(a) * 2,
          curl: 0.24, drag: 0.99,
          life: Math.round(rand(12, 20)), max: 20,
          size: 2.4, kind: 'bug', phase: rand(0, 6.3),
          c0: lighten(c, 0.45), c1: c, add: false,
        }));
      });
    }
    this.after(24, () => {
      this.shakeAmp = 2.6 * k;
      this.ring({ x: to.x, y: to.y, r0: 30 * k, r1: 5, frames: 12, color: lighten(c, 0.5), width: 2 });
      this.emit(Math.round(10 * k), () => {
        const a = rand(0, Math.PI * 2);
        return {
          x: to.x, y: to.y,
          vx: Math.cos(a) * rand(1.6, 3.6), vy: Math.sin(a) * rand(1.6, 3.6),
          curl: 0.12, drag: 0.97,
          life: Math.round(rand(14, 24)), max: 24,
          size: 2.4, kind: 'bug', phase: rand(0, 6.3),
          c0: lighten(c, 0.45), c1: c, add: false,
        };
      });
    });
  }

  /** Steel: a gear spun up at the user, thrown across, sparking on contact. */
  private iron(from: FxPoint, to: FxPoint, c: string, k: number): void {
    const steel = lighten(c, 0.5);
    const dark = darken(c, 0.5);
    const spark = '#ffb23a';
    const head = { x: from.x + (to.x - from.x) * 0.16, y: from.y - 4 };
    const sp = Math.hypot(to.x - head.x, to.y - head.y) / 9;
    const a = Math.atan2(to.y - head.y, to.x - head.x);
    const perp = a + Math.PI / 2;

    // Wind-up: plates fold in and forge into one mass.
    //
    // The old wind-up was a gleam and a two-pixel gear, which at 1x was a grey
    // speck -- steel's whole read is that a heavy thing is being assembled, and
    // nothing was being assembled. Four plates fly in from the sides and stop
    // dead on the head point, each one landing with a spark.
    this.after(1, () => {
      this.cut({ x: from.x, y: from.y - 8, angle: -0.5, len: 30, frames: 8, color: '#ffffff', width: 2 });
    });
    for (let i = 0; i < 4; i++) {
      this.after(1 + i * 1.6, () => {
        const ang = perp + (i % 2 ? 1 : -1) * (0.5 + i * 0.25);
        const r = 22;
        const life = 6;
        this.emit(1, () => ({
          x: head.x + Math.cos(ang) * r, y: head.y + Math.sin(ang) * r * 0.8,
          vx: -Math.cos(ang) * r / life, vy: -Math.sin(ang) * r * 0.8 / life,
          life, max: life, size: 3.4 * k, kind: 'shard',
          rot: ang, spin: 0.08,
          c0: '#ffffff', c1: steel, add: false,
        }));
      });
      this.after(7 + i * 1.6, () => {
        // The clink as each plate seats.
        this.emit(3, () => {
          const s = rand(1, 2.6);
          const ang = rand(0, Math.PI * 2);
          return {
            x: head.x, y: head.y,
            vx: Math.cos(ang) * s, vy: Math.sin(ang) * s - 0.5,
            ay: 0.26, life: Math.round(rand(5, 10)), max: 10,
            size: rand(1, 1.8), kind: 'streak',
            c0: '#ffffff', c1: spark,
          };
        });
      });
    }
    this.after(7, () => {
      this.ring({ x: head.x, y: head.y, r0: 20, r1: 3, frames: 7, color: steel, width: 2 });
      this.emit(1, () => ({
        x: head.x, y: head.y,
        life: 5, max: 5, size: 3.2 * k, grow: 1.16,
        kind: 'gear', rot: 0, spin: 0.5,
        c0: '#ffffff', c1: steel, add: false,
      }));
    });
    this.crouch(4, 8, 9 * k, 18);

    // Travel: the mass crosses. Heavy, so it carries a solid metal blur behind
    // it rather than a dotted line of white sparks -- the old trail was one
    // additive streak per frame and at 1x that is a row of dashes.
    this.after(9, () => {
      this.emit(1, () => ({
        x: head.x, y: head.y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 10, max: 10,
        size: Math.max(6, 7 * k), kind: 'gear', rot: 0, spin: 0.62,
        c0: '#ffffff', c1: steel, add: false,
        trail: { every: 1, kind: 'gear', size: 5.2 * k, life: 4, c0: steel, c1: dark, add: false, rise: 0 },
      }));
    });
    // Sparks scraped off it on the way over, thrown backward down the path.
    for (let f = 0; f < 8; f++) {
      this.after(10 + f, () => {
        const p = this.at(head, to, Math.min(1, (f + 1) / 9));
        this.emit(2, () => ({
          x: p.x + rand(-3, 3), y: p.y + rand(-3, 3),
          vx: -Math.cos(a) * rand(0.6, 2), vy: rand(-0.8, 0.8),
          ay: 0.2, drag: 0.95,
          life: Math.round(rand(6, 13)), max: 13,
          size: rand(1, 1.8), kind: 'streak',
          c0: '#ffffff', c1: spark,
        }));
      });
    }

    // Arrival: the clang. Short, hard and loud in the picture -- a flat white
    // ring gone in four frames, a forged X of two cuts, and a genuine shower of
    // hot sparks along the line of travel, not a white sphere on the defender.
    this.after(18, () => {
      this.flash = 0.36; this.flashColor = lighten(c, 0.5);
      this.shakeAmp = 7.5 * k;
      this.ring({ x: to.x, y: to.y, r0: 2, r1: 15 * k, squash: 0.6, frames: 5, color: '#ffffff', width: 3 });
      this.ring({ x: to.x, y: to.y, r0: 5, r1: 34 * k, squash: 0.55, frames: 12, color: steel, width: 2 });
      for (let i = 0; i < 2; i++) {
        this.cut({
          x: to.x, y: to.y, angle: -0.9 + i * 1.8, len: 40 * k,
          frames: 9, color: steel, width: 3,
        });
      }
      // Sparks behave like metal on metal: fast along the blow, then gravity.
      this.emit(Math.round(24 * k), () => {
        const ang = a + rand(-1.5, 1.5) - 0.5;
        const s = rand(2.6, 8) * k;
        return {
          x: to.x, y: to.y,
          vx: Math.cos(ang) * s, vy: Math.sin(ang) * s - 1,
          ay: 0.36, drag: 0.97,
          life: Math.round(rand(12, 26)), max: 26,
          size: rand(1, 2), kind: 'streak',
          c0: '#ffffff', c1: spark,
        };
      });
      // Shrapnel: a couple of teeth knocked loose, tumbling.
      this.emit(Math.round(5 * k), () => {
        const ang = a + rand(-1.2, 1.2) - 0.4;
        return {
          x: to.x, y: to.y,
          vx: Math.cos(ang) * rand(2, 4.4), vy: Math.sin(ang) * rand(2, 4.4) - 0.8,
          ay: 0.3,
          life: Math.round(rand(16, 26)), max: 26,
          size: rand(2.2, 3.4), kind: 'shard',
          rot: ang, spin: rand(-0.3, 0.3),
          c0: steel, c1: dark, add: false,
        };
      });
      // The mass itself rebounds off what it hit and tumbles away. Without
      // this the thing that crossed the field simply ceases to exist on
      // contact, which is the one thing a solid object must never do.
      this.emit(1, () => ({
        x: to.x, y: to.y,
        vx: -Math.cos(a) * 2.2, vy: -2.6,
        ay: 0.32, drag: 0.99,
        life: 20, max: 20, size: Math.max(5, 6 * k), kind: 'gear',
        rot: 0, spin: -0.34,
        c0: steel, c1: dark, add: false,
      }));
    });
  }

  /**
   * Dark: a shadow races along the floor, opens into a pool, and throws
   * tendrils up out of it.
   *
   * Two things were wrong with this and both were the same mistake -- the
   * effect kept reaching for light. It travelled as eight grey puffs that
   * looked like ordinary dust, and it *finished on a white bloom*, which is
   * the one thing a dark move cannot do. So the pale here is a cold grey-blue
   * rim on a near-black body, the way an unlit shape reads against a lit
   * field, and every beat that used to brighten now dims instead.
   */
  private umbral(from: FxPoint, to: FxPoint, c: string, k: number): void {
    // A rim, not a tint: cold and light enough to draw the shape of the
    // shadow, never warm enough to read as the shadow glowing.
    const pale = mix(c, '#c8cfe0', 0.62);
    const body = darken(c, 0.55);
    const ground = 8;
    const dirX = Math.sign(to.x - from.x) || 1;

    // Wind-up: the field dims and dark motes gather at the user.
    this.after(0, () => { this.flash = -0.35; this.flashColor = '#000000'; });
    this.windUp(from, c, 9, { kind: 'dot', rate: 2, radius: 28, curl: -0.14 });
    this.after(6, () => {
      // The user's own shadow pulls in under it before it is thrown.
      this.ring({
        x: from.x, y: from.y + ground, r0: 22 * k, r1: 4, squash: 0.28,
        frames: 10, color: body, width: 3, fill: 0.4, hold: 0.4, add: false,
      });
    });

    // Travel: the shadow runs along the floor rather than through the air. A
    // low dark wedge with a lit leading edge, moving fast enough that the eye
    // reads one thing crossing rather than a row of puffs.
    for (let i = 0; i < 10; i++) {
      this.after(9 + i * 0.8, () => {
        const p = this.at(
          { x: from.x, y: from.y + ground },
          { x: to.x, y: to.y + ground },
          Math.min(1, 0.08 + i * 0.105),
        );
        this.emit(2, () => ({
          x: p.x + rand(-5, 5), y: p.y + rand(-3, 2),
          vx: dirX * rand(1.6, 3.2), vy: rand(-0.3, 0.2),
          drag: 0.93, grow: 1.06,
          life: Math.round(rand(8, 14)), max: 14,
          size: rand(2.6, 4.4) * k, kind: 'smoke',
          c0: body, c1: '#0c0a12', add: false,
        }));
        // The lit edge of the wave, so there is something to track.
        this.cut({
          x: p.x, y: p.y - 1, angle: Math.PI / 2,
          len: rand(9, 15) * k, bow: dirX * 4,
          frames: 6, color: pale, width: 1.6,
        });
      });
    }
    this.after(17, () => {
      this.ring({
        x: to.x, y: to.y + ground, r0: 2, r1: 34 * k, squash: 0.3,
        frames: 30, color: body, width: 2, fill: 0.62, hold: 0.45, add: false,
      });
      this.ring({ x: to.x, y: to.y + ground, r0: 2, r1: 36 * k, squash: 0.3, frames: 14, color: pale, width: 2 });
      // The light goes out over the target as the pool opens.
      this.flash = Math.min(this.flash, -0.3);
      this.flashColor = '#000000';
    });

    // Arrival: tendrils thrown up out of the pool, then it snaps shut.
    for (let i = 0; i < 7; i++) {
      this.after(20 + i * 0.8, () => {
        const spread = (i / 6 - 0.5) * 2;
        this.cut({
          x: to.x + spread * 16 * k, y: to.y + 2,
          angle: -Math.PI / 2 + spread * 0.5,
          len: rand(26, 42) * k, bow: spread * 8,
          frames: 13, color: pale, width: 2.6,
        });
        this.emit(2, () => ({
          x: to.x + spread * 16 * k + rand(-3, 3), y: to.y + rand(-4, 6),
          vx: spread * rand(0.4, 1.4), vy: rand(-3, -1.2),
          ay: 0.18, grow: 1.04,
          life: Math.round(rand(12, 22)), max: 22,
          size: rand(2.4, 4) * k, kind: 'smoke',
          c0: pale, c1: '#140f1e', add: false,
        }));
      });
    }
    this.after(24, () => {
      this.shakeAmp = 3.8 * k;
      // The snap shut is a *darkening*, not a bloom. This was the single line
      // that made every dark move in the game finish looking like a light one.
      this.flash = Math.min(this.flash, -0.34); this.flashColor = '#000000';
      this.ring({ x: to.x, y: to.y, r0: 30 * k, r1: 2, frames: 10, color: pale, width: 3 });
      this.ring({
        x: to.x, y: to.y, r0: 6, r1: 26 * k, squash: 0.9, frames: 9,
        color: body, width: 3, fill: 0.34, add: false,
      });
    });
  }

  /** Light: a lens flare at the source, then a beam with rays fanning out. */
  private radiant(from: FxPoint, to: FxPoint, c: string, k: number): void {
    const hot = lighten(c, 0.45);
    const head = { x: from.x + (to.x - from.x) * 0.14, y: from.y - 3 };

    // Wind-up: the flare. A bright point, a horizontal streak across it and a
    // pair of collapsing rings -- the classic lens read.
    this.windUp(head, hot, 11, { rate: 3, radius: 34 });
    for (let i = 0; i < 3; i++) {
      this.after(4 + i * 3, () => {
        this.cut({ x: head.x, y: head.y, angle: 0, len: (26 + i * 10) * k, frames: 9, color: '#fffbe8', width: 2 });
        this.cut({ x: head.x, y: head.y, angle: Math.PI / 2, len: (14 + i * 6) * k, frames: 9, color: hot, width: 1.6 });
        this.ring({ x: head.x, y: head.y, r0: 18 - i * 4, r1: 2, frames: 8, color: '#ffffff', width: 2 });
      });
    }

    // Travel: the beam, with motes streaming along it toward the target so the
    // light reads as moving rather than as a painted line.
    this.after(12, () => {
      this.beams.push({ from: { x: head.x, y: head.y }, to, t: 0, frames: 18, color: hot, width: 7 * k });
      this.flash = 0.5; this.flashColor = '#fffbe8';
      this.shakeAmp = 4 * k;
    });
    for (let f = 0; f < 10; f++) {
      this.after(13 + f, () => {
        this.emit(2, () => {
          const t = rand(0, 0.5);
          const p = this.at(head, to, t);
          const a = Math.atan2(to.y - head.y, to.x - head.x);
          const sp = Math.hypot(to.x - head.x, to.y - head.y) / 8;
          return {
            x: p.x + rand(-4, 4), y: p.y + rand(-4, 4),
            vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
            life: 8, max: 8, size: rand(1.2, 2.4), kind: 'streak',
            c0: '#ffffff', c1: hot,
          };
        });
      });
    }

    // Arrival: the bloom, with rays fanning out and holding.
    this.after(17, () => {
      this.ring({ x: to.x, y: to.y, r0: 2, r1: 40 * k, frames: 15, color: '#ffffff', width: 3 });
      for (let i = 0; i < 10; i++) {
        const ang = (i / 10) * Math.PI * 2 + 0.15;
        const long = i % 2 === 0;
        this.cut({
          x: to.x, y: to.y, angle: ang,
          len: (long ? 44 : 26) * k, frames: long ? 16 : 12,
          color: long ? '#fffbe8' : hot, width: long ? 2.4 : 1.6,
        });
      }
      this.emit(Math.round(16 * k), () => {
        const ang = rand(0, Math.PI * 2);
        const sp = rand(1.6, 5) * k;
        return {
          x: to.x, y: to.y,
          vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
          drag: 0.93,
          life: Math.round(rand(14, 28)), max: 28,
          size: rand(1.4, 3), kind: 'star',
          c0: '#ffffff', c1: hot,
        };
      });
    });
  }

  /** Spirit: wisps drift over from the user and pass through the target. */
  private spirit(from: FxPoint, to: FxPoint, c: string, k: number): void {
    // A light violet rather than a lightened grey-purple: the type colour is
    // already desaturated, and lightening it lands on the same neutral the
    // dust and smoke effects use.
    const pale = mix(c, '#d9c6ff', 0.55);

    // Wind-up: something detaches from the user.
    this.windUp(from, pale, 8, { kind: 'wisp', rate: 1, radius: 24, curl: -0.1 });
    for (let f = 0; f < 8; f++) {
      this.after(f, () => {
        this.emit(1, () => ({
          x: from.x + rand(-10, 10), y: from.y + rand(0, 12),
          vy: rand(-1.2, -0.5), curl: rand(-0.05, 0.05), grow: 1.04,
          life: Math.round(rand(12, 20)), max: 20,
          size: rand(2.4, 4) * k, kind: 'wisp',
          c0: pale, c1: c,
        }));
      });
    }

    // Travel: the wisps cross in a slow, wavering line.
    for (let i = 0; i < 10; i++) {
      this.after(8 + i * 0.9, () => {
        const life = Math.round(rand(12, 18));
        const side = i % 2 ? 1 : -1;
        this.emit(1, () => ({
          x: from.x + rand(-6, 6), y: from.y + rand(-8, 8),
          vx: (to.x - from.x) / life, vy: (to.y - from.y) / life - 0.4,
          curl: side * 0.06,
          life, max: life,
          size: rand(3, 4.6) * k, kind: 'wisp',
          c0: pale, c1: c,
          trail: { every: 3, kind: 'dot', size: 1.2, life: 8, c0: pale, c1: c, add: true, rise: -0.2 },
        }));
      });
    }

    // Arrival: they pass THROUGH, rising out of the target and flickering out.
    //
    // "Through" is the whole point of this archetype and it was the part that
    // did not happen: two wisps a frame for twelve frames, all born on the
    // defender and drifting up at half a pixel, is a static purple cloud that
    // sits on the sprite until the move ends. They now come off it fast and
    // keep climbing, so the defender is momentarily passed through rather
    // than permanently covered.
    for (let f = 0; f < 10; f++) {
      this.after(16 + f, () => {
        this.emit(1, () => ({
          x: to.x + rand(-16, 16), y: to.y + rand(2, 12),
          vx: rand(-0.9, 0.9), vy: -rand(1.8, 3.4),
          ax: rand(-0.05, 0.05), drag: 0.995, grow: 1.02,
          life: Math.round(rand(12, 22)), max: 22,
          size: rand(2.2, 4) * k, kind: 'wisp',
          c0: pale, c1: c,
        }));
      });
    }
    // Two cold points that hold on the target and then blink out -- the read
    // is a thing looking back at you, and it is the only beat in this effect
    // that is not made of drifting soft shapes.
    for (let i = 0; i < 2; i++) {
      this.after(17, () => {
        this.emit(1, () => ({
          x: to.x + (i ? 5 : -5), y: to.y - 3,
          vy: -0.25,
          life: 12, max: 12, size: 2.4, kind: 'star',
          c0: '#ffffff', c1: lighten(c, 0.7),
        }));
      });
    }
    this.after(16, () => {
      this.flash = 0.26; this.flashColor = pale;
      this.shakeAmp = 2.8 * k;
      this.ring({ x: to.x, y: to.y, r0: 32 * k, r1: 3, frames: 14, color: pale, width: 2 });
    });
  }

  /* ------------------------------------------------------ support moves */

  /** A build-up with no impact, for two-turn moves. */
  private charge(at: FxPoint, c: string): void {
    // Motes spiral in tighter and faster as the charge fills.
    for (let f = 0; f < 22; f++) {
      this.after(f, () => {
        const tight = 1 - (f / 22) * 0.6;
        this.emit(3, () => {
          const a = rand(0, Math.PI * 2);
          const r = rand(20, 46) * tight;
          const life = Math.round(rand(10, 16));
          return {
            x: at.x + Math.cos(a) * r, y: at.y + Math.sin(a) * r * 0.85,
            vx: -Math.cos(a) * r / life, vy: -Math.sin(a) * r * 0.85 / life,
            curl: 0.16, life, max: life,
            size: rand(1.4, 3), kind: 'star',
            c0: '#ffffff', c1: c,
          };
        });
      });
    }
    // The core pulses three times, each pulse tighter than the last.
    for (let i = 0; i < 3; i++) {
      this.after(4 + i * 6, () => {
        this.ring({ x: at.x, y: at.y, r0: (34 - i * 8), r1: 3, frames: 10, color: lighten(c, 0.6), width: 2 });
        this.emit(1, () => ({
          x: at.x, y: at.y, life: 8, max: 8,
          size: 3 + i, kind: 'flame', grow: 1.05,
          c0: '#ffffff', c1: c, add: false,
        }));
      });
    }
    this.after(22, () => {
      this.flash = 0.26; this.flashColor = lighten(c, 0.6);
      this.ring({ x: at.x, y: at.y, r0: 4, r1: 40, frames: 14, color: '#ffffff', width: 3 });
    });
  }

  /** Healing: sparkles rising off the user through a soft bloom. */
  private heal(at: FxPoint, c: string): void {
    for (let f = 0; f < 22; f++) {
      this.after(f, () => {
        this.emit(2, () => ({
          x: at.x + rand(-22, 22), y: at.y + rand(10, 20),
          vx: rand(-0.25, 0.25), vy: -rand(0.9, 2.1),
          curl: rand(-0.03, 0.03),
          life: Math.round(rand(18, 30)), max: 30,
          size: rand(1.5, 3.2), kind: 'star',
          c0: '#ffffff', c1: c,
        }));
      });
    }
    // Three rings climbing the body, so the effect travels rather than sits.
    for (let i = 0; i < 3; i++) {
      this.after(i * 6, () => {
        this.ring({ x: at.x, y: at.y + 12 - i * 10, r0: 26, r1: 8, squash: 0.35, frames: 16, color: lighten(c, 0.4), width: 2 });
      });
    }
    this.after(4, () => {
      this.ring({ x: at.x, y: at.y, r0: 6, r1: 30, frames: 20, color: c, width: 2, fill: 0.12, hold: 0.3, add: false });
    });
    this.after(14, () => { this.flash = 0.2; this.flashColor = lighten(c, 0.6); });
  }

  /** A hex barrier snapping into place around the user, then flickering. */
  private shield(at: FxPoint, c: string): void {
    this.barriers.push({
      x: at.x, y: at.y, r: 32, squash: 1.15,
      t: 0, frames: 34, color: lighten(c, 0.5), sides: 6,
    });
    this.after(6, () => {
      this.flash = 0.22; this.flashColor = lighten(c, 0.7);
      this.ring({ x: at.x, y: at.y, r0: 44, r1: 30, squash: 1.15, frames: 10, color: '#ffffff', width: 2 });
      this.emit(18, () => {
        const a = rand(0, Math.PI * 2);
        return {
          x: at.x + Math.cos(a) * 30, y: at.y + Math.sin(a) * 34,
          vx: Math.cos(a) * 0.5, vy: Math.sin(a) * 0.5,
          curl: 0.05,
          life: Math.round(rand(14, 26)), max: 26,
          size: rand(1.4, 3), kind: 'star',
          c0: '#ffffff', c1: c,
        };
      });
    });
  }

  /** Stat changes: chunky arrows climbing or sinking around the target. */
  private statField(at: FxPoint, c: string, dir: 'up' | 'down'): void {
    const sign = dir === 'up' ? -1 : 1;
    for (let i = 0; i < 7; i++) {
      this.after(i * 2.5, () => {
        this.emit(1, () => ({
          x: at.x + rand(-22, 22),
          y: at.y + (dir === 'up' ? rand(10, 18) : rand(-26, -16)),
          vy: sign * rand(1.1, 1.9),
          life: Math.round(rand(16, 24)), max: 24,
          size: rand(3.4, 4.6), kind: 'arrow',
          // The mask bakes the arrow pointing up; a debuff just flips it.
          rot: dir === 'up' ? 0 : Math.PI,
          c0: '#ffffff', c1: c, add: false,
        }));
      });
    }
    for (let f = 0; f < 16; f++) {
      this.after(f, () => {
        this.emit(2, () => ({
          x: at.x + rand(-24, 24),
          y: at.y + (dir === 'up' ? rand(8, 18) : rand(-30, -16)),
          vx: rand(-0.3, 0.3), vy: sign * rand(0.8, 2),
          life: Math.round(rand(14, 24)), max: 24,
          size: rand(1.4, 2.8), kind: 'star',
          c0: '#ffffff', c1: c,
        }));
      });
    }
    this.ring({ x: at.x, y: at.y + 10, r0: 4, r1: 30, squash: 0.35, frames: 18, color: c, width: 2 });
    this.after(6, () => {
      this.ring({ x: at.x, y: at.y + 10, r0: 4, r1: 24, squash: 0.35, frames: 18, color: lighten(c, 0.4), width: 2 });
      // A stat change had no field tint at all, which left it the only thing in
      // a battle that happens without the screen acknowledging it.
      this.flash = 0.16;
      this.flashColor = dir === 'up' ? lighten(c, 0.6) : darken(c, 0.3);
    });
  }

  /** Weather: something arrives across the whole field, not at one target. */
  private weather(c: string): void {
    for (let f = 0; f < 26; f++) {
      this.after(f, () => {
        this.emit(4, () => ({
          x: rand(0, SCREEN_W + 20), y: rand(-18, 8),
          vx: rand(-1.4, -0.3), vy: rand(2.6, 5.2),
          life: Math.round(rand(22, 40)), max: 40,
          size: rand(1.4, 3), kind: 'streak',
          c0: lighten(c, 0.5), c1: c,
        }));
      });
    }
    // A sweep of light crossing the field once, so the change has a moment.
    for (let i = 0; i < 5; i++) {
      this.after(2 + i * 2, () => {
        this.cut({
          x: 40 + i * 40, y: rand(20, 90),
          angle: 1.25, len: 70, bow: 10,
          frames: 12, color: lighten(c, 0.55), width: 1.6,
        });
      });
    }
    this.after(4, () => { this.flash = 0.24; this.flashColor = lighten(c, 0.5); });
  }

  /* ------------------------------------------------------------- update */

  update(): void {
    if (this.hitStop > 0) { this.hitStop--; return; }
    this.t++;

    if (this.timers.length) {
      const due = this.timers.filter((x) => x.at <= this.t);
      this.timers = this.timers.filter((x) => x.at > this.t);
      for (const d of due) d.fn();
    }

    // Trail spawns are collected rather than pushed inline: pushing into the
    // array being iterated would let a puff immediately spawn its own puff.
    const born: Particle[] = [];
    for (const p of this.particles) {
      p.age++;
      if (p.curl !== 0) {
        const ca = Math.cos(p.curl), sa = Math.sin(p.curl);
        const vx = p.vx * ca - p.vy * sa;
        p.vy = p.vx * sa + p.vy * ca;
        p.vx = vx;
      }
      p.vx = (p.vx + p.ax) * p.drag;
      p.vy = (p.vy + p.ay) * p.drag;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.spin;
      // The ceiling is a frame-time guard, not a look: a puff drawn at radius
      // twelve is thirty scanlines, and a stream of them will drop frames.
      if (p.grow !== 1) p.size = Math.max(0.5, Math.min(9, p.size * p.grow));
      p.life--;

      const tr = p.trail;
      if (tr && p.life > 1 && p.age % tr.every === 0
        && this.particles.length + born.length < MAX_PARTICLES) {
        born.push(particle({
          x: p.x + rand(-1, 1), y: p.y + rand(-1, 1),
          vx: p.vx * 0.12, vy: p.vy * 0.12 + tr.rise,
          drag: 0.94, grow: 1.035, phase: rand(0, 6.3),
          rot: rand(0, 6.3), spin: rand(-0.15, 0.15),
          life: tr.life, max: tr.life,
          size: tr.size * rand(0.75, 1.2),
          kind: tr.kind, c0: tr.c0, c1: tr.c1, add: tr.add,
        }));
      }
    }
    if (born.length) this.particles.push(...born);
    if (this.particles.length) this.particles = this.particles.filter((p) => p.life > 0);

    for (const x of this.rings) x.t++;
    if (this.rings.length) this.rings = this.rings.filter((x) => x.t < x.frames);
    for (const x of this.beams) x.t++;
    if (this.beams.length) this.beams = this.beams.filter((x) => x.t < x.frames);
    for (const x of this.bolts) x.t++;
    if (this.bolts.length) this.bolts = this.bolts.filter((x) => x.t < x.frames);
    for (const x of this.slashes) x.t++;
    if (this.slashes.length) this.slashes = this.slashes.filter((x) => x.t < x.frames);
    for (const x of this.cracks) x.t++;
    if (this.cracks.length) this.cracks = this.cracks.filter((x) => x.t < x.frames);
    for (const x of this.barriers) x.t++;
    if (this.barriers.length) this.barriers = this.barriers.filter((x) => x.t < x.frames);

    this.shakeAmp *= this.shakeDecay;
    if (this.shakeAmp < 0.2) this.shakeAmp = 0;
    this.flash *= 0.8;
    if (Math.abs(this.flash) < 0.02) this.flash = 0;
    this.lunge *= 0.82;
    if (Math.abs(this.lunge) < 0.4) this.lunge = 0;
  }

  /* ------------------------------------------------------------- render */

  render(r: Renderer): void {
    const c = r.bctx;
    const D = DETAIL;
    c.save();
    c.lineCap = 'round';
    // Nothing leaves the arena. The message box is drawn over the top of this
    // layer anyway, but an ember sliding under it looks like a bug.
    c.beginPath();
    c.rect(0, 0, SCREEN_W * D, FIELD_BOTTOM * D);
    c.clip();

    /* the ground splits sit under everything, they are in the floor */
    for (const k of this.cracks) this.drawCrack(c, k, D);

    /* beams next, they sit behind the sprites' worth of particles */
    for (const b of this.beams) {
      const p = b.t / b.frames;
      // Snap open fast, hold, then collapse.
      const open = p < 0.18 ? p / 0.18 : p > 0.7 ? Math.max(0, 1 - (p - 0.7) / 0.3) : 1;
      const w = b.width * open;
      if (w <= 0.2) continue;
      c.globalCompositeOperation = 'lighter';
      for (const [mul, col] of [[2.6, rgba(b.color, 0.2)], [1.5, rgba(b.color, 0.5)], [0.4, '#ffffff']] as const) {
        c.strokeStyle = col;
        c.lineWidth = Math.max(1, w * mul * D);
        c.beginPath();
        c.moveTo(b.from.x * D, b.from.y * D);
        c.lineTo(b.to.x * D, b.to.y * D);
        c.stroke();
      }
    }

    /* lightning */
    for (const b of this.bolts) {
      const fade = 1 - b.t / b.frames;
      c.globalCompositeOperation = 'lighter';
      // The afterimage is the previous frame's path at a fraction of the
      // brightness. It is what makes a re-forking bolt read as one strike
      // moving rather than as a new bolt every frame.
      if (b.ghost && b.t > 0) {
        c.strokeStyle = rgba('#ffffff', 0.22 * fade);
        c.lineWidth = Math.max(1, b.width * 1.4 * D);
        this.strokeBolt(c, b, b.t - 1, D);
      }
      for (const [mul, col] of [
        [3.4, rgba(b.color, 0.22 * fade)],
        [1.7, rgba(b.color, 0.72 * fade)],
        [0.7, rgba('#ffffff', fade)],
      ] as const) {
        c.strokeStyle = col;
        c.lineWidth = Math.max(1, b.width * mul * D);
        this.strokeBolt(c, b, b.t, D);
      }
    }

    /* rings */
    for (const g of this.rings) {
      const p = g.t / g.frames;
      const rad = g.r0 + (g.r1 - g.r0) * easeOut(p);
      const a = p < g.hold ? 1 : 1 - (p - g.hold) / Math.max(0.001, 1 - g.hold);
      const rx = Math.max(0.5, rad * D);
      const ry = Math.max(0.5, rad * g.squash * D);
      const rot = g.rot + g.spin * g.t;
      c.globalCompositeOperation = g.add ? 'lighter' : 'source-over';
      if (g.fill > 0) {
        c.fillStyle = rgba(g.color, g.fill * a);
        c.beginPath();
        c.ellipse(g.x * D, g.y * D, rx, ry, rot, 0, Math.PI * 2);
        c.fill();
      }
      c.strokeStyle = rgba(g.color, a);
      c.lineWidth = Math.max(1, g.width * a * D);
      c.beginPath();
      c.ellipse(g.x * D, g.y * D, rx, ry, rot, 0, Math.PI * 2);
      c.stroke();
    }

    /* slash arcs */
    for (const s of this.slashes) {
      const p = s.t / s.frames;
      // Sweep in, then fade: the leading edge is what the eye tracks.
      //
      // The sweep starts a third of the way open rather than at nothing. The
      // context has lineCap 'round', so an arc of length zero is not invisible
      // -- it is a filled circle the diameter of the widest glow pass, about
      // seven logical pixels. A burst fires eight spokes at once and the
      // hit-stop then holds that first frame on screen for six ticks, so every
      // impact in the game opened on a cluster of fat white dots parked on the
      // defender. That cluster was the "white flower" that made fire, ice and
      // thunder all land identically.
      const grow = Math.min(1, 0.32 + p * 2.5);
      const a = p < 0.4 ? 1 : 1 - (p - 0.4) / 0.6;
      const len = s.len * grow;
      const dx = Math.cos(s.angle) * len / 2;
      const dy = Math.sin(s.angle) * len / 2;
      const bow = s.bow * grow;
      const mx = (s.x - Math.sin(s.angle) * bow) * D;
      const my = (s.y + Math.cos(s.angle) * bow) * D;
      c.globalCompositeOperation = 'lighter';
      for (const [mul, col] of [[2.6, rgba(s.color, 0.22 * a)], [1, rgba(s.color, 0.8 * a)], [0.4, rgba('#ffffff', a)]] as const) {
        c.strokeStyle = col;
        c.lineWidth = Math.max(1, s.width * mul * a * D);
        c.beginPath();
        c.moveTo((s.x - dx) * D, (s.y - dy) * D);
        if (s.bow !== 0) c.quadraticCurveTo(mx, my, (s.x + dx) * D, (s.y + dy) * D);
        else c.lineTo((s.x + dx) * D, (s.y + dy) * D);
        c.stroke();
      }
    }

    /* particles */
    for (const p of this.particles) this.drawParticle(c, p, D);

    /* barriers last: they are meant to sit in front of what they protect */
    for (const b of this.barriers) this.drawBarrier(c, b, D);

    c.restore();
  }

  private drawParticle(c: CanvasRenderingContext2D, p: Particle, D: number): void {
    const life = clamp01(p.life / p.max);
    // Squared, not linear. Almost every emitter in here opens on white so the
    // spark has a hot core, and a linear ramp left a particle more than half
    // white for more than half its life -- which is why a screen full of fire,
    // ice and thunder all came out the same shade of white. Squaring keeps the
    // hot frame at the head of the particle and hands the rest of its life to
    // the move's own colour.
    const col = mix(p.c1, p.c0, life * life);
    const soft = p.kind === 'wisp' || p.kind === 'smoke';
    const alpha = soft ? Math.min(1, life * 1.4) : Math.min(1, life * 2.2);
    c.globalCompositeOperation = p.add ? 'lighter' : 'source-over';
    const X = p.x * D, Y = p.y * D;

    if (MASKED.has(p.kind)) {
      drawMask(c, p.kind, p.x, p.y, p.size, p.rot, col, alpha);
      return;
    }

    switch (p.kind) {
      case 'streak': {
        const sp = Math.hypot(p.vx, p.vy);
        const len = Math.min(9, 1.5 + sp * 1.6);
        c.strokeStyle = rgba(col, alpha);
        c.lineWidth = Math.max(1, p.size * D * 0.7);
        c.beginPath();
        c.moveTo(X, Y);
        c.lineTo(X - (p.vx / (sp || 1)) * len * D, Y - (p.vy / (sp || 1)) * len * D);
        c.stroke();
        break;
      }
      case 'star': {
        // A four-point sparkle: two crossed tapers, brightest at the centre.
        const s = p.size * (0.4 + life) * D;
        c.strokeStyle = rgba(col, alpha);
        c.lineWidth = Math.max(1, D * 0.8);
        c.beginPath();
        c.moveTo(X - s, Y); c.lineTo(X + s, Y);
        c.moveTo(X, Y - s); c.lineTo(X, Y + s);
        c.stroke();
        c.fillStyle = rgba('#ffffff', alpha);
        c.fillRect(Math.round(X - D / 2), Math.round(Y - D / 2), D, D);
        break;
      }
      case 'flame': {
        // Three flat bands with visible steps between them, plus a per-particle
        // flicker on the radius. Fire that fades smoothly from white to red
        // reads as a modern particle system; fire that steps reads as the era.
        c.globalCompositeOperation = 'source-over';
        const r = p.size * (1 + Math.sin(p.phase + p.age * 0.85) * 0.16);
        // Three bands, and the outermost of them is DARKER than the type
        // colour, not lighter. The old ramp ran cream -> pale orange -> pale
        // orange, so every band was above the type colour and a stream of fire
        // came out the colour of peach. A flame is dark at its edge, its own
        // colour through the body and cream only in the middle, and it is that
        // dark rim that separates one fireball from the next in a stream.
        const rim = mix(darken(p.c1, 0.34), p.c1, 0.25 + life * 0.6);
        const body = mix(p.c1, p.c0, 0.12 + life * 0.3);
        oval(c, p.x, p.y, r, r * 0.94, rgba(rim, alpha));
        oval(c, p.x, p.y - r * 0.12, r * 0.68, r * 0.64, rgba(body, alpha));
        if (r >= 2.6) {
          const core = mix(p.c1, p.c0, 0.6 + life * 0.4);
          oval(c, p.x - r * 0.1, p.y - r * 0.24, r * 0.34, r * 0.3, rgba(core, alpha));
        }
        break;
      }
      case 'smoke': {
        // Opaque, unlit and expanding. Additive smoke turns into fog and
        // swallows the sprite behind it.
        c.globalCompositeOperation = 'source-over';
        const r = p.size * (1.25 - life * 0.35);
        oval(c, p.x, p.y, r, r * 0.82, rgba(col, alpha * 0.62));
        // The second band is skipped on small puffs: at radius three it is one
        // block wide and costs a scanline for nothing.
        if (r >= 4.6) {
          oval(c, p.x - r * 0.28, p.y - r * 0.28, r * 0.45, r * 0.38, rgba(lighten(col, 0.18), alpha * 0.5));
        }
        break;
      }
      case 'drop':
      case 'glob': {
        // Stretched along the direction of travel by stacking shrinking blobs
        // back down the velocity, which works at any angle without rotating
        // anything off the grid.
        c.globalCompositeOperation = 'source-over';
        const sp = Math.hypot(p.vx, p.vy);
        const ux = sp > 0.01 ? p.vx / sp : 0;
        const uy = sp > 0.01 ? p.vy / sp : 0;
        const stretch = Math.min(2.2, p.kind === 'glob' ? sp * 0.16 : sp * 0.24);
        const dark = darken(col, p.kind === 'glob' ? 0.4 : 0.3);
        for (let i = 2; i >= 0; i--) {
          const f = 1 - i * 0.3;
          oval(
            c,
            p.x - ux * stretch * i, p.y - uy * stretch * i,
            p.size * f, p.size * f * (p.kind === 'glob' ? 0.95 : 0.85),
            rgba(i === 0 ? col : dark, alpha),
          );
        }
        // The specular pip. One design pixel, upper left, exactly like the
        // water tiles.
        if (p.size >= 2) {
          c.fillStyle = rgba('#ffffff', alpha * 0.9);
          c.fillRect(Math.round(p.x - p.size * 0.4) * D, Math.round(p.y - p.size * 0.45) * D, D, D);
        }
        break;
      }
      case 'bug': {
        // Wings flick between two positions on their own phase, so a swarm of
        // thirty never beats in unison.
        //
        // The body is forced dark and the wings forced bright regardless of
        // what colour came in. Chitin's type colour is an olive green and the
        // whole battle field is grass: drawn in its own colour a swarm of
        // thirty insects over that background was completely invisible, and an
        // effect nobody can see is not an effect. A dark body with a pale wing
        // reads on grass, on stone and on sand alike.
        c.globalCompositeOperation = 'source-over';
        const ix = Math.round(p.x), iy = Math.round(p.y);
        const wide = p.size >= 2.2 ? 1 : 0;
        const up = ((p.age + Math.floor(p.phase * 5)) % 4) < 2;
        const wing = rgba(lighten(col, 0.62), alpha * 0.95);
        const body = rgba(darken(col, 0.55), alpha);
        c.fillStyle = wing;
        c.fillRect((ix - 2 - wide) * D, (iy + (up ? -1 : 0)) * D, (1 + wide) * D, D);
        c.fillRect((ix + 1) * D, (iy + (up ? -1 : 0)) * D, (1 + wide) * D, D);
        c.fillStyle = body;
        c.fillRect((ix - 1) * D, iy * D, 2 * D, D);
        c.fillRect(ix * D, (iy + 1) * D, D, D);
        if (wide) c.fillRect((ix - 1) * D, (iy - 1) * D, D, D);
        break;
      }
      case 'wisp': {
        // Always composited normally: a dozen overlapping additive puffs
        // saturate to white and the element becomes unreadable.
        c.globalCompositeOperation = 'source-over';
        // Puffs expand as they die, the way smoke and flame actually behave.
        const r = p.size * (1.35 - life * 0.45);
        // Translucent, and with a tail. A wisp used to be an opaque circle
        // with a lit shoulder, which is a soap bubble -- a dozen of them over
        // a defender hid it completely and none of them read as a spirit. At
        // two thirds alpha the creature shows through, and two shrinking
        // ovals dragged back down the velocity give the thing a direction it
        // is drifting in instead of a place it is sitting.
        const sp = Math.hypot(p.vx, p.vy);
        if (sp > 0.05) {
          const ux = p.vx / sp, uy = p.vy / sp;
          const tail = Math.min(2.4, sp * 0.5);
          for (let i = 2; i >= 1; i--) {
            const f = 1 - i * 0.3;
            oval(c, p.x - ux * tail * i, p.y - uy * tail * i,
              r * f, r * f * 0.8, rgba(darken(col, 0.2), alpha * 0.3));
          }
        }
        oval(c, p.x, p.y, r, r * 0.85, rgba(col, alpha * 0.55));
        // Lit shoulder towards the light, which is what makes a blob a puff.
        oval(c, p.x - r * 0.3, p.y - r * 0.3, r * 0.48, r * 0.4, rgba(lighten(col, 0.35), alpha * 0.75));
        break;
      }
      default: {
        const s = Math.max(1, Math.round(p.size)) * D;
        c.fillStyle = rgba(col, alpha);
        c.fillRect(Math.round(p.x) * D - s / 2, Math.round(p.y) * D - s / 2, s, s);
        if (p.size > 2) {
          c.fillStyle = rgba(lighten(col, 0.5), alpha);
          c.fillRect(Math.round(p.x) * D - s / 2, Math.round(p.y) * D - s / 2, Math.max(D, s / 2), Math.max(D, s / 2));
        }
      }
    }
  }

  /**
   * A widening split running along the ground.
   *
   * Drawn as stacked blocks rather than a stroked path so the dark interior and
   * the lit lip above it both land on the design grid, and so the crack can be
   * revealed progressively from the attacker's end.
   */
  private drawCrack(c: CanvasRenderingContext2D, k: Crack, D: number): void {
    const p = k.t / k.frames;
    const shown = Math.min(1, p / 0.45);
    const a = p < 0.6 ? 1 : 1 - (p - 0.6) / 0.4;
    const dx = k.to.x - k.from.x, dy = k.to.y - k.from.y;
    const steps = 30;
    c.globalCompositeOperation = 'source-over';
    const core = rgba('#120e16', a);
    const lip = rgba(k.color, a * 0.9);
    for (let i = 0; i <= steps * shown; i++) {
      const t = i / steps;
      const x = Math.round(k.from.x + dx * t);
      const y = Math.round(k.from.y + dy * t + (noise(k.seed + i * 7) - 0.5) * 4);
      // Widening toward the target is what makes the split read as travelling
      // rather than as a line that was always there.
      const w = Math.max(1, Math.round(1 + t * k.width));
      c.fillStyle = core;
      c.fillRect(x * D, (y - (w >> 1)) * D, 2 * D, w * D);
      c.fillStyle = lip;
      c.fillRect(x * D, (y - (w >> 1) - 1) * D, 2 * D, D);
    }
  }

  /** A polygonal shield: snaps out, holds, and flickers as it fades. */
  private drawBarrier(c: CanvasRenderingContext2D, b: Barrier, D: number): void {
    const p = b.t / b.frames;
    const grow = Math.min(1, p / 0.18);
    const r = b.r * (0.4 + easeOut(grow) * 0.6);
    const a = (p < 0.5 ? 1 : 1 - (p - 0.5) / 0.5)
      // The flicker is the whole tell: a barrier that just sits there looks
      // like scenery, one that stutters looks like it is under load.
      * (0.7 + 0.3 * Math.abs(Math.sin(b.t * 0.55)));
    c.globalCompositeOperation = 'lighter';
    c.beginPath();
    for (let i = 0; i <= b.sides; i++) {
      const ang = (i / b.sides) * Math.PI * 2 - Math.PI / 2;
      const x = (b.x + Math.cos(ang) * r) * D;
      const y = (b.y + Math.sin(ang) * r * b.squash) * D;
      if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
    }
    c.closePath();
    c.fillStyle = rgba(b.color, 0.14 * a);
    c.fill();
    c.strokeStyle = rgba(b.color, 0.85 * a);
    c.lineWidth = Math.max(1, 2 * D);
    c.stroke();
    // Bright nodes at the corners, so the hex reads as constructed.
    c.fillStyle = rgba('#ffffff', a);
    for (let i = 0; i < b.sides; i++) {
      const ang = (i / b.sides) * Math.PI * 2 - Math.PI / 2;
      const x = Math.round(b.x + Math.cos(ang) * r);
      const y = Math.round(b.y + Math.sin(ang) * r * b.squash);
      c.fillRect((x - 1) * D, (y - 1) * D, 2 * D, 2 * D);
    }
  }

  private strokeBolt(c: CanvasRenderingContext2D, b: Bolt, tick: number, D: number): void {
    const segs = 10;
    const dx = b.to.x - b.from.x;
    const dy = b.to.y - b.from.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;

    const path = (spread: number, from: FxPoint, to: FxPoint, n: number, salt: number) => {
      c.beginPath();
      c.moveTo(from.x * D, from.y * D);
      for (let i = 1; i <= n; i++) {
        const t = i / n;
        const off = i === n ? 0 : (noise(b.seed + i * 31 + tick * 17 + salt) - 0.5) * spread;
        c.lineTo((from.x + (to.x - from.x) * t + nx * off) * D,
                 (from.y + (to.y - from.y) * t + ny * off) * D);
      }
      c.stroke();
    };

    path(18, b.from, b.to, segs, 0);
    // Forks peel off the main channel part-way down, and re-pick their angle
    // every frame along with the trunk -- a static fork on a crackling trunk
    // reads as a mistake.
    for (let k = 0; k < b.branches; k++) {
      const t = 0.22 + k * 0.14;
      if (t >= 0.95) break;
      const ox = b.from.x + dx * t;
      const oy = b.from.y + dy * t;
      const ang = Math.atan2(dy, dx) + (noise(b.seed + k * 97 + tick * 5) - 0.5) * 2.1;
      const l = 10 + noise(b.seed + k * 13 + tick * 3) * 20;
      path(8, { x: ox, y: oy }, { x: ox + Math.cos(ang) * l, y: oy + Math.sin(ang) * l }, 4, k * 211);
    }
  }
}

function easeOut(t: number): number { return 1 - (1 - t) ** 2.2; }

/** Deterministic 0..1 noise, so a bolt's shape is stable between draw passes. */
function noise(n: number): number {
  const s = Math.sin(n * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}

/* --------------------------------------------------------- archetypes */

type Archetype =
  | 'impact' | 'slash' | 'flame' | 'water' | 'leaf' | 'bolt' | 'frost' | 'venom'
  | 'quake' | 'wind' | 'psy' | 'swarm' | 'iron' | 'umbral' | 'radiant' | 'spirit'
  | 'charge' | 'heal' | 'shield' | 'buff' | 'debuff' | 'weather';

/**
 * Map a move's animation id to a performance. Keeping this a lookup rather than
 * a field on every move means a new move gets a real effect for free by picking
 * an existing id, and an id nobody has styled yet still lands on something
 * sensible instead of nothing.
 */
const ARCHETYPES: Record<string, Archetype> = {
  hit: 'impact', dash: 'impact', push: 'impact', punch: 'impact',
  punch_heavy: 'impact', kick_big: 'impact', grapple: 'impact',
  water_hit: 'water', venom_bite: 'venom',

  slash_green: 'slash', wing: 'slash', bug_mid: 'slash',

  flame_small: 'flame', flame_whip: 'flame', flame_big: 'flame', flame_dive: 'flame',
  water_small: 'water', water_pull: 'water', water_big: 'water',
  leaf_small: 'leaf', leaf_big: 'leaf', vine: 'leaf', drain: 'leaf', powder: 'leaf',
  spark_small: 'bolt', spark_mid: 'bolt', spark_big: 'bolt',
  frost_small: 'frost', frost_mid: 'frost', frost_big: 'frost',
  venom_small: 'venom', venom_cloud: 'venom',
  earth_small: 'quake', earth_mid: 'quake', earth_big: 'quake',
  rock_small: 'quake', rock_mid: 'quake', rock_big: 'quake', hazard: 'quake',
  wind_small: 'wind', dive: 'wind', sky: 'wind',
  psy_small: 'psy', psy_mid: 'psy', psy_big: 'psy',
  bug_small: 'swarm', bug_swarm: 'swarm',
  iron_small: 'iron', iron_mid: 'iron', iron_big: 'iron',
  dark_small: 'umbral', dark_mid: 'umbral', dark_big: 'umbral',
  light_small: 'radiant', light_mid: 'radiant', light_big: 'radiant',
  spirit_small: 'spirit', spirit_mid: 'spirit', spirit_big: 'spirit',

  charge: 'charge', heal: 'heal', shield: 'shield',
  buff: 'buff', debuff: 'debuff', status: 'debuff', weather: 'weather',
};

/**
 * The archetypes whose payload is the user's own body.
 *
 * A physical move lands ON the target -- the user closes the distance, the
 * blow is delivered at the end of a lunge, and the user is thrown back out of
 * its own hit. A special move travels TO the target and the user never leaves
 * its pad. The shared finisher reads this to decide whether to shake harder,
 * and whether to give the attacker a rebound.
 */
const PHYSICAL: ReadonlySet<Archetype> = new Set<Archetype>(['impact', 'slash']);

/**
 * The frame at which each archetype's payload arrives.
 *
 * These are tuned against the battle scene's 46-frame budget for a move: the
 * contact beat has to land with room for the burst to breathe before the
 * damage number goes up, so nothing here is allowed past the mid twenties even
 * though the tails of the effects run on well after.
 *
 * Support archetypes are absent on purpose: a heal or a stat buff has no
 * moment of contact, and putting an impact burst on one would read as the
 * move having hurt somebody.
 */
const IMPACT_AT: Partial<Record<Archetype, number>> = {
  impact: 14, slash: 13, flame: 22, water: 21, leaf: 20, bolt: 12,
  frost: 22, venom: 22, quake: 22, wind: 18, psy: 22, swarm: 25,
  iron: 19, umbral: 24, radiant: 18, spirit: 17,
};

function archetypeOf(anim: string): Archetype {
  return ARCHETYPES[anim] ?? 'impact';
}

/** Whether an effect plays on the user rather than the target. */
export function fxTargetsSelf(anim: string): boolean {
  const a = archetypeOf(anim);
  return a === 'heal' || a === 'shield' || a === 'buff' || a === 'charge' || a === 'weather';
}
