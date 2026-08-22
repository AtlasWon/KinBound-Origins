/**
 * Move effects.
 *
 * Every move carries an `animation` id in its JSON. This module turns that id
 * into a short scripted performance: emitters scheduled over time, particles
 * with their own physics, and a handful of dedicated drawables (beams, bolts,
 * slash arcs, shock rings) that particles alone cannot fake.
 *
 * The design rule is that a player should be able to tell what happened with
 * the sound off and the text skipped. So each archetype owns a distinct
 * *motion*, not just a distinct colour: a punch compresses and snaps back, a
 * beam charges then releases, ice converges inward, earth erupts from below,
 * wind sweeps sideways. Colour comes from the move's type on top of that.
 *
 * Coordinates are logical units, matching the battle scene's layout; the
 * conversion to buffer pixels happens once at draw time.
 */

import { DETAIL, type Renderer } from '../engine/renderer.js';

export interface FxPoint { x: number; y: number }

type Kind = 'dot' | 'shard' | 'streak' | 'wisp' | 'star' | 'crescent' | 'rock';

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
}

interface Ring {
  x: number; y: number;
  r0: number; r1: number;
  squash: number;
  t: number; frames: number;
  color: string; width: number;
  add: boolean;
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
}

interface Slash {
  x: number; y: number;
  angle: number; len: number;
  t: number; frames: number;
  color: string; width: number;
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

/* ----------------------------------------------------------- the system */

export class MoveFx {
  private particles: Particle[] = [];
  private rings: Ring[] = [];
  private beams: Beam[] = [];
  private bolts: Bolt[] = [];
  private slashes: Slash[] = [];
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
      || this.bolts.length > 0 || this.slashes.length > 0 || this.timers.length > 0;
  }

  clear(): void {
    this.particles.length = 0;
    this.rings.length = 0;
    this.beams.length = 0;
    this.bolts.length = 0;
    this.slashes.length = 0;
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
      const p = make(i);
      this.particles.push({
        vx: 0, vy: 0, ax: 0, ay: 0,
        life: 20, max: 20, size: 2,
        c0: '#ffffff', c1: '#ffffff',
        kind: 'dot', rot: 0, spin: 0, drag: 1, add: true,
        ...p,
      } as Particle);
    }
  }

  private ring(r: Partial<Ring> & { x: number; y: number }): void {
    this.rings.push({
      r0: 2, r1: 26, squash: 1, t: 0, frames: 14,
      color: '#ffffff', width: 2, add: true, ...r,
    });
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
   * Five things fire at once, and they are doing different jobs: the white core
   * ring says *contact*, the coloured ring says *what kind*, the spokes say
   * *force*, the sparks say *debris*, and the hit-stop says *that hurt*.
   */
  private impactBurst(to: FxPoint, c: string, k: number): void {
    this.hitStop = Math.round(4 + 3 * k);
    this.shakeAmp = Math.max(this.shakeAmp, 6 * k);
    // The field flash carries the move's colour rather than washing white. A
    // white flash on every hit makes fire, water and thunder land identically,
    // which is most of why the effects did not read as different moves.
    this.flash = Math.max(this.flash, 0.42);
    this.flashColor = lighten(c, 0.35);

    this.ring({ x: to.x, y: to.y, r0: 2, r1: 22 * k, squash: 0.9, frames: 8, color: '#ffffff', width: 3 });
    this.ring({ x: to.x, y: to.y, r0: 4, r1: 38 * k, squash: 0.8, frames: 15, color: lighten(c, 0.4), width: 3 });
    this.ring({ x: to.x, y: to.y, r0: 6, r1: 52 * k, squash: 0.7, frames: 20, color: c, width: 2 });

    // Radial spokes. Long and short alternating, so the burst has a star shape
    // rather than reading as a uniform circle.
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + 0.19;
      const long = i % 2 === 0;
      const len = (long ? 36 : 20) * k;
      this.slashes.push({
        x: to.x + Math.cos(a) * len * 0.45,
        y: to.y + Math.sin(a) * len * 0.35,
        angle: a, len, t: 0, frames: long ? 11 : 8,
        color: long ? '#ffffff' : lighten(c, 0.45),
        width: long ? 2.6 : 1.6,
      });
    }

    this.emit(Math.round(22 * k), () => {
      const a = rand(0, Math.PI * 2);
      const sp = rand(2.4, 7.6) * k;
      return {
        x: to.x, y: to.y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7 - 1.1,
        ay: 0.2, drag: 0.9,
        life: Math.round(rand(11, 26)), max: 26,
        size: rand(1, 3), kind: 'star',
        c0: '#ffffff', c1: c,
      };
    });
    // A second, slower shower in the move's own colour, so the burst has a
    // colour to it once the white core has gone.
    this.emit(Math.round(10 * k), () => {
      const a = rand(0, Math.PI * 2);
      const sp = rand(1.0, 3.4) * k;
      return {
        x: to.x, y: to.y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6 - 0.4,
        ay: 0.12, drag: 0.93,
        life: Math.round(rand(16, 32)), max: 32,
        size: rand(1, 2), kind: 'wisp',
        c0: lighten(c, 0.4), c1: c,
      };
    });
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
      case 'slash': this.slash(to, c, scale); break;
      case 'flame': this.flame(from, to, c, scale, anim); break;
      case 'water': this.water(from, to, c, scale, anim); break;
      case 'leaf': this.leaf(from, to, c, scale, anim); break;
      case 'bolt': this.bolt(from, to, c, scale); break;
      case 'frost': this.frost(from, to, c, scale); break;
      case 'venom': this.venom(from, to, c, scale, anim); break;
      case 'quake': this.quake(from, to, c, scale, anim); break;
      case 'wind': this.wind(from, to, c, scale, anim); break;
      case 'psy': this.psy(to, c, scale); break;
      case 'swarm': this.swarm(from, to, c, scale); break;
      case 'iron': this.iron(from, to, c, scale); break;
      case 'umbral': this.umbral(to, c, scale); break;
      case 'radiant': this.radiant(from, to, c, scale); break;
      case 'spirit': this.spirit(to, c, scale); break;
      case 'charge': this.charge(from, c); break;
      case 'heal': this.field(from, '#7fe08a', 'up'); break;
      case 'shield': this.shield(from, c); break;
      case 'buff': this.field(from, lighten(c, 0.3), 'up'); break;
      case 'debuff': this.field(to, darken(c, 0.25), 'down'); break;
      case 'weather': this.weather(c); break;
      default: this.impact(from, to, c, scale, anim); break;
    }

    // Layer the shared finisher on anything that is actually hitting someone,
    // timed to each archetype's own moment of contact.
    const land = IMPACT_AT[archetypeOf(anim)];
    if (land !== undefined) this.after(land, () => this.impactBurst(to, c, scale));
  }

  /* ---------------------------------------------------------- archetypes */

  /** Blunt force: lunge, compress, snap, radial debris, real shake. */
  private impact(from: FxPoint, to: FxPoint, c: string, k: number, anim: string): void {
    const heavy = k > 1.2 || anim === 'grapple';
    this.lunge = 0;
    // Wind up away from the target, then drive through it.
    this.after(0, () => { this.lunge = -3; });
    this.after(5, () => { this.lunge = 9 * k; });
    this.after(12, () => {
      this.lunge = 0;
      this.shakeAmp = (heavy ? 6 : 3.5) * k;
      this.flash = heavy ? 0.35 : 0.2;
      this.flashColor = lighten(c, 0.7);

      // Compression ring, flattened so it reads as a blow rather than a bloom.
      this.ring({ x: to.x, y: to.y, r0: 3, r1: 26 * k, squash: 0.6, frames: 11, color: lighten(c, 0.55), width: 3 });
      this.ring({ x: to.x, y: to.y, r0: 1, r1: 15 * k, squash: 0.75, frames: 8, color: '#ffffff', width: 2 });

      // Debris thrown out along the blow, plus a few slow embers.
      this.emit(Math.round(16 * k), () => {
        const a = rand(0, Math.PI * 2);
        const sp = rand(1.6, 5.2) * k;
        return {
          x: to.x, y: to.y,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.75 - 0.6,
          ay: 0.16, drag: 0.93,
          life: Math.round(rand(10, 20)), max: 20,
          size: rand(1, 2.6), kind: 'streak',
          c0: '#ffffff', c1: c,
        };
      });
      this.emit(Math.round(7 * k), () => ({
        x: to.x + rand(-8, 8), y: to.y + rand(-8, 8),
        vx: rand(-1, 1), vy: rand(-1.4, -0.3),
        life: Math.round(rand(16, 28)), max: 28,
        size: rand(1, 2), kind: 'dot',
        c0: lighten(c, 0.4), c1: darken(c, 0.4),
      }));
      // Three impact spikes, the classic "landed" tell.
      for (let i = 0; i < 3; i++) {
        this.slashes.push({
          x: to.x + rand(-6, 6), y: to.y + rand(-6, 6),
          angle: rand(-0.6, 0.6) + (i - 1) * 1.1,
          len: rand(16, 26) * k, t: 0, frames: 9,
          color: '#ffffff', width: 2.5,
        });
      }
    });
  }

  /** Three arcing cuts, offset in time so the eye follows them. */
  private slash(to: FxPoint, c: string, k: number): void {
    for (let i = 0; i < 3; i++) {
      this.after(i * 4, () => {
        this.slashes.push({
          x: to.x + rand(-7, 7), y: to.y + rand(-9, 9),
          angle: -0.75 + i * 0.28, len: 40 * k,
          t: 0, frames: 12, color: lighten(c, 0.65), width: 3.2,
        });
        this.shakeAmp = 2.4 * k;
        this.emit(6, () => ({
          x: to.x + rand(-10, 10), y: to.y + rand(-12, 12),
          vx: rand(1, 4), vy: rand(-2, 2),
          life: Math.round(rand(8, 15)), max: 15,
          size: rand(1, 2), kind: 'streak', c0: '#ffffff', c1: c,
        }));
      });
    }
    this.after(9, () => { this.flash = 0.22; this.flashColor = lighten(c, 0.8); });
  }

  /** Fire: a stream that billows on the way and blooms on arrival. */
  private flame(from: FxPoint, to: FxPoint, c: string, k: number, anim: string): void {
    const hot = lighten(c, 0.4);
    const cool = darken(c, 0.55);
    const frames = anim === 'flame_whip' ? 20 : 14;
    for (let f = 0; f < frames; f++) {
      this.after(f, () => {
        const t = f / frames;
        const px = from.x + (to.x - from.x) * t;
        const py = from.y + (to.y - from.y) * t;
        this.emit(Math.round(4 * k), () => ({
          x: px + rand(-5, 5), y: py + rand(-5, 5),
          vx: (to.x - from.x) / 26 + rand(-0.8, 0.8),
          vy: (to.y - from.y) / 26 + rand(-1.4, -0.2),
          ay: -0.05, drag: 0.95,
          life: Math.round(rand(12, 24)), max: 24,
          size: rand(2, 4.5) * k, kind: 'wisp',
          c0: hot, c1: cool, add: false,
        }));
        // A couple of bright cores per burst, additive, for the hot centre.
        this.emit(1, () => ({
          x: px + rand(-3, 3), y: py + rand(-3, 3),
          vx: (to.x - from.x) / 26, vy: (to.y - from.y) / 26 - 0.6,
          life: 8, max: 8, size: rand(1.5, 3) * k, kind: 'dot',
          c0: '#fff4c8', c1: hot,
        }));
      });
    }
    this.after(frames, () => {
      this.flash = 0.3; this.flashColor = hot;
      this.shakeAmp = 3 * k;
      this.ring({ x: to.x, y: to.y, r0: 4, r1: 30 * k, frames: 13, color: hot, width: 3 });
      this.emit(Math.round(20 * k), () => {
        const a = rand(0, Math.PI * 2);
        const sp = rand(1, 3.4) * k;
        return {
          x: to.x, y: to.y,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.9,
          ay: -0.04, drag: 0.94,
          life: Math.round(rand(14, 30)), max: 30,
          size: rand(2, 5) * k, kind: 'wisp',
          c0: hot, c1: cool, add: false,
        };
      });
      // Embers thrown clear of the bloom.
      this.emit(Math.round(10 * k), () => {
        const a = rand(-Math.PI, 0.3);
        const sp = rand(2, 5.5) * k;
        return {
          x: to.x, y: to.y,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          ay: 0.18, drag: 0.96,
          life: Math.round(rand(14, 26)), max: 26,
          size: rand(1, 2), kind: 'streak',
          c0: '#fff2b0', c1: c,
        };
      });
    });
  }

  /** Water: an arcing volley that breaks into a splash. */
  private water(from: FxPoint, to: FxPoint, c: string, k: number, anim: string): void {
    const foam = lighten(c, 0.7);
    const pull = anim === 'water_pull';
    for (let f = 0; f < 12; f++) {
      this.after(f, () => {
        this.emit(3, () => {
          const t = rand(0, 0.25);
          const sx = pull ? to.x : from.x;
          const sy = pull ? to.y : from.y;
          const ex = pull ? from.x : to.x;
          const ey = pull ? from.y : to.y;
          return {
            x: sx + (ex - sx) * t + rand(-4, 4),
            y: sy + (ey - sy) * t + rand(-4, 4),
            vx: (ex - sx) / 20 + rand(-0.5, 0.5),
            vy: (ey - sy) / 20 + rand(-2.2, -0.8),
            ay: 0.19, drag: 0.99,
            life: Math.round(rand(14, 22)), max: 22,
            size: rand(1.5, 3.4) * k, kind: 'dot',
            c0: foam, c1: c,
          };
        });
      });
    }
    this.after(13, () => {
      this.shakeAmp = 2.6 * k;
      this.flash = 0.18; this.flashColor = foam;
      // Splash: a flat ring plus droplets thrown upward.
      this.ring({ x: to.x, y: to.y + 6, r0: 3, r1: 30 * k, squash: 0.4, frames: 14, color: foam, width: 2.5 });
      this.emit(Math.round(22 * k), () => ({
        x: to.x + rand(-9, 9), y: to.y + rand(-2, 8),
        vx: rand(-3, 3) * k, vy: rand(-4.4, -1.4) * k,
        ay: 0.24, drag: 0.99,
        life: Math.round(rand(16, 30)), max: 30,
        size: rand(1, 3), kind: 'dot',
        c0: '#eaf6ff', c1: c,
      }));
    });
  }

  /** Leaves: spinning shards that spiral in and scatter. */
  private leaf(from: FxPoint, to: FxPoint, c: string, k: number, anim: string): void {
    const drain = anim === 'drain';
    const n = Math.round(18 * k);
    for (let i = 0; i < n; i++) {
      this.after(i * 0.6, () => {
        const a = rand(0, Math.PI * 2);
        const r = rand(22, 42);
        const sx = drain ? to.x : from.x + Math.cos(a) * r * 0.4;
        const sy = drain ? to.y : from.y + Math.sin(a) * r * 0.4;
        const ex = drain ? from.x : to.x;
        const ey = drain ? from.y : to.y;
        this.emit(1, () => ({
          x: sx + Math.cos(a) * r * 0.5, y: sy + Math.sin(a) * r * 0.5,
          vx: (ex - sx) / 16 + Math.cos(a + 1.6) * 1.6,
          vy: (ey - sy) / 16 + Math.sin(a + 1.6) * 1.6,
          drag: 0.97,
          life: Math.round(rand(16, 26)), max: 26,
          size: rand(2, 3.6) * k, kind: 'shard',
          rot: a, spin: rand(-0.34, 0.34),
          c0: lighten(c, 0.4), c1: darken(c, 0.3), add: false,
        }));
      });
    }
    this.after(16, () => {
      this.shakeAmp = 1.8 * k;
      this.ring({ x: drain ? from.x : to.x, y: drain ? from.y : to.y, r0: 4, r1: 22 * k, frames: 12, color: lighten(c, 0.5), width: 2 });
    });
  }

  /** Lightning: a jagged strike, a hard flash, then loose sparks. */
  private bolt(from: FxPoint, to: FxPoint, c: string, k: number): void {
    // Charge first so the strike has a beat before it.
    this.emit(Math.round(10 * k), () => {
      const a = rand(0, Math.PI * 2);
      return {
        x: from.x + Math.cos(a) * 22, y: from.y + Math.sin(a) * 18,
        vx: -Math.cos(a) * 1.5, vy: -Math.sin(a) * 1.3,
        life: 12, max: 12, size: rand(1, 2.4), kind: 'star',
        c0: '#ffffff', c1: c,
      };
    });
    this.after(9, () => {
      this.bolts.push({
        from: { x: from.x, y: from.y - 6 }, to,
        t: 0, frames: 13, color: lighten(c, 0.45),
        seed: Math.floor(rand(0, 9999)), branches: Math.round(2 + k * 2),
      });
      this.flash = 0.45; this.flashColor = lighten(c, 0.85);
      this.shakeAmp = 4.2 * k;
      this.ring({ x: to.x, y: to.y, r0: 2, r1: 26 * k, frames: 9, color: '#ffffff', width: 2 });
      this.emit(Math.round(18 * k), () => {
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
    this.after(15, () => { this.flash = 0.2; });
  }

  /** Ice: crystals converge from outside and shatter inward. */
  private frost(from: FxPoint, to: FxPoint, c: string, k: number): void {
    const n = Math.round(14 * k);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rand(-0.2, 0.2);
      const r = rand(38, 58);
      this.after(i * 0.5, () => {
        this.emit(1, () => ({
          x: to.x + Math.cos(a) * r, y: to.y + Math.sin(a) * r * 0.8,
          vx: -Math.cos(a) * r / 12, vy: -Math.sin(a) * r * 0.8 / 12,
          life: 13, max: 13,
          size: rand(2.4, 4.4) * k, kind: 'shard',
          rot: a, spin: 0.1,
          c0: '#ffffff', c1: c, add: false,
        }));
      });
    }
    this.after(13, () => {
      this.flash = 0.34; this.flashColor = lighten(c, 0.75);
      this.shakeAmp = 3 * k;
      // Shatter: a bright star burst plus outward splinters.
      this.ring({ x: to.x, y: to.y, r0: 2, r1: 30 * k, frames: 12, color: '#ffffff', width: 2 });
      this.emit(Math.round(22 * k), () => {
        const a = rand(0, Math.PI * 2);
        const sp = rand(1.6, 5) * k;
        return {
          x: to.x, y: to.y,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          ay: 0.1, drag: 0.95,
          life: Math.round(rand(12, 24)), max: 24,
          size: rand(1.4, 3.2), kind: 'shard',
          rot: a, spin: rand(-0.2, 0.2),
          c0: '#eafaff', c1: c, add: false,
        };
      });
    });
    void from;
  }

  /** Poison: heavy blobs that fall, pool and bubble. */
  private venom(from: FxPoint, to: FxPoint, c: string, k: number, anim: string): void {
    const cloud = anim === 'venom_cloud';
    for (let f = 0; f < 12; f++) {
      this.after(f, () => {
        this.emit(cloud ? 4 : 2, () => {
          const t = cloud ? 1 : rand(0, 0.3);
          return {
            x: from.x + (to.x - from.x) * t + rand(-12, 12),
            y: from.y + (to.y - from.y) * t + rand(-12, 12),
            vx: cloud ? rand(-0.5, 0.5) : (to.x - from.x) / 22 + rand(-0.6, 0.6),
            vy: cloud ? rand(-0.7, -0.1) : (to.y - from.y) / 22 + rand(-0.8, 0.4),
            ay: cloud ? -0.01 : 0.06, drag: 0.97,
            life: Math.round(rand(18, 34)), max: 34,
            size: rand(2.4, 5) * k, kind: 'wisp',
            c0: lighten(c, 0.35), c1: darken(c, 0.45),
          };
        });
      });
    }
    this.after(13, () => {
      this.shakeAmp = 1.6 * k;
      this.flash = 0.14; this.flashColor = c;
      this.ring({ x: to.x, y: to.y + 4, r0: 3, r1: 24 * k, squash: 0.45, frames: 16, color: lighten(c, 0.4), width: 2 });
      // Bubbles rising off the pool.
      for (let i = 0; i < 8; i++) {
        this.after(i * 2, () => {
          this.emit(1, () => ({
            x: to.x + rand(-14, 14), y: to.y + rand(0, 8),
            vx: rand(-0.3, 0.3), vy: rand(-1.1, -0.4),
            life: Math.round(rand(16, 26)), max: 26,
            size: rand(1.5, 3), kind: 'dot',
            c0: lighten(c, 0.5), c1: c,
          }));
        });
      }
    });
  }

  /** Earth and stone: erupts from below, the heaviest shake in the game. */
  private quake(from: FxPoint, to: FxPoint, c: string, k: number, anim: string): void {
    const rocky = anim.startsWith('rock');
    this.after(0, () => { this.shakeAmp = 2 * k; });
    for (let f = 0; f < 10; f++) {
      this.after(f, () => {
        // Dust kicked up along the ground before anything lands.
        this.emit(2, () => ({
          x: to.x + rand(-26, 26), y: to.y + rand(6, 14),
          vx: rand(-0.8, 0.8), vy: rand(-0.9, -0.2),
          drag: 0.96,
          life: Math.round(rand(16, 30)), max: 30,
          size: rand(2, 4.5) * k, kind: 'wisp',
          c0: lighten(c, 0.35), c1: darken(c, 0.4),
        }));
      });
    }
    this.after(10, () => {
      this.shakeAmp = 7 * k;
      this.flash = 0.22; this.flashColor = lighten(c, 0.4);
      this.ring({ x: to.x, y: to.y + 8, r0: 4, r1: 40 * k, squash: 0.32, frames: 16, color: lighten(c, 0.45), width: 3 });
      // Slabs thrown upward out of the ground.
      this.emit(Math.round(14 * k), () => ({
        x: to.x + rand(-20, 20), y: to.y + rand(4, 12),
        vx: rand(-2.4, 2.4), vy: rand(-6, -2.6) * k,
        ay: 0.32, drag: 1,
        life: Math.round(rand(20, 34)), max: 34,
        size: rand(2.5, 6) * k, kind: rocky ? 'rock' : 'shard',
        rot: rand(0, 3), spin: rand(-0.18, 0.18),
        c0: lighten(c, 0.3), c1: darken(c, 0.45), add: false,
      }));
    });
    void from;
  }

  /** Wind: crescents that sweep across rather than converge. */
  private wind(from: FxPoint, to: FxPoint, c: string, k: number, anim: string): void {
    const dive = anim === 'dive' || anim === 'sky';
    if (dive) {
      // The user leaves the field and comes back down on top of the target.
      this.after(0, () => { this.lunge = -14; });
      this.after(10, () => { this.lunge = 12 * k; });
      this.after(16, () => { this.lunge = 0; this.shakeAmp = 5 * k; });
    }
    for (let i = 0; i < 7; i++) {
      this.after(i * 2, () => {
        const t = rand(0, 1);
        this.slashes.push({
          x: from.x + (to.x - from.x) * t + rand(-10, 10),
          y: from.y + (to.y - from.y) * t + rand(-16, 16),
          angle: Math.atan2(to.y - from.y, to.x - from.x) + rand(-0.25, 0.25),
          len: rand(26, 46) * k, t: 0, frames: 11,
          color: lighten(c, 0.6), width: 2,
        });
        this.emit(4, () => ({
          x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t + rand(-14, 14),
          vx: (to.x - from.x) / 12, vy: rand(-0.6, 0.6),
          drag: 0.98,
          life: Math.round(rand(10, 18)), max: 18,
          size: rand(1, 2.4), kind: 'streak',
          c0: '#ffffff', c1: c,
        }));
      });
    }
    this.after(15, () => {
      this.shakeAmp = Math.max(this.shakeAmp, 2.2 * k);
      this.ring({ x: to.x, y: to.y, r0: 4, r1: 28 * k, squash: 0.8, frames: 12, color: lighten(c, 0.55), width: 2 });
    });
  }

  /** Psychic: rings contract onto the target and the space warps. */
  private psy(to: FxPoint, c: string, k: number): void {
    for (let i = 0; i < 4; i++) {
      this.after(i * 3, () => {
        // Contracting rings: r0 larger than r1 makes them close in.
        this.ring({ x: to.x, y: to.y, r0: 44 * k, r1: 4, frames: 15, color: lighten(c, 0.5), width: 2 });
      });
    }
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      this.after(i * 0.5, () => {
        this.emit(1, () => ({
          x: to.x + Math.cos(a) * 40, y: to.y + Math.sin(a) * 32,
          vx: -Math.cos(a) * 2.6, vy: -Math.sin(a) * 2.1,
          drag: 0.99,
          life: 18, max: 18, size: rand(1.4, 3), kind: 'star',
          c0: '#ffffff', c1: c,
        }));
      });
    }
    this.after(16, () => {
      this.flash = 0.3; this.flashColor = lighten(c, 0.6);
      this.shakeAmp = 3.4 * k;
      this.emit(Math.round(18 * k), () => {
        const a = rand(0, Math.PI * 2);
        const sp = rand(1.4, 4.6) * k;
        return {
          x: to.x, y: to.y,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.8,
          drag: 0.93,
          life: Math.round(rand(14, 26)), max: 26,
          size: rand(1.4, 3.2), kind: 'star',
          c0: '#ffffff', c1: c,
        };
      });
    });
  }

  /** Bugs: many small bodies on erratic paths, never a clean line. */
  private swarm(from: FxPoint, to: FxPoint, c: string, k: number): void {
    const n = Math.round(30 * k);
    for (let i = 0; i < n; i++) {
      this.after(i * 0.4, () => {
        const wob = rand(0, Math.PI * 2);
        this.emit(1, () => ({
          x: from.x + rand(-10, 10), y: from.y + rand(-10, 10),
          vx: (to.x - from.x) / 18 + Math.cos(wob) * 1.8,
          vy: (to.y - from.y) / 18 + Math.sin(wob) * 1.8,
          ax: Math.cos(wob + 2) * 0.09, ay: Math.sin(wob + 2) * 0.09,
          drag: 0.99,
          life: Math.round(rand(18, 26)), max: 26,
          size: rand(1.2, 2.4), kind: 'dot',
          c0: lighten(c, 0.4), c1: darken(c, 0.3), add: false,
        }));
      });
    }
    this.after(18, () => {
      this.shakeAmp = 2 * k;
      this.ring({ x: to.x, y: to.y, r0: 4, r1: 24 * k, frames: 12, color: lighten(c, 0.5), width: 2 });
    });
  }

  /** Steel: a hard gleam, then a heavy strike with real sparks. */
  private iron(from: FxPoint, to: FxPoint, c: string, k: number): void {
    this.after(0, () => {
      this.slashes.push({
        x: from.x, y: from.y - 8, angle: -0.5, len: 30, t: 0, frames: 8,
        color: '#ffffff', width: 2,
      });
    });
    this.after(6, () => { this.lunge = 8 * k; });
    this.after(12, () => {
      this.lunge = 0;
      this.flash = 0.4; this.flashColor = '#ffffff';
      this.shakeAmp = 6 * k;
      this.ring({ x: to.x, y: to.y, r0: 2, r1: 24 * k, squash: 0.7, frames: 9, color: '#ffffff', width: 3 });
      for (let i = 0; i < 2; i++) {
        this.slashes.push({
          x: to.x, y: to.y, angle: -0.9 + i * 1.8, len: 36 * k,
          t: 0, frames: 10, color: lighten(c, 0.75), width: 3,
        });
      }
      // Sparks behave like metal on metal: fast, then gravity takes them.
      this.emit(Math.round(26 * k), () => {
        const a = rand(-Math.PI, 0);
        const sp = rand(2.4, 7) * k;
        return {
          x: to.x, y: to.y,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          ay: 0.34, drag: 0.97,
          life: Math.round(rand(12, 26)), max: 26,
          size: rand(1, 2), kind: 'streak',
          c0: '#ffffff', c1: '#ffb23a',
        };
      });
    });
  }

  /** Dark: the field dims and something closes over the target. */
  private umbral(to: FxPoint, c: string, k: number): void {
    this.after(0, () => { this.flash = -0.35; this.flashColor = '#000000'; });
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      this.after(i * 0.8, () => {
        this.emit(1, () => ({
          x: to.x + Math.cos(a) * 46, y: to.y + Math.sin(a) * 38,
          vx: -Math.cos(a) * 3, vy: -Math.sin(a) * 2.5,
          life: 16, max: 16,
          size: rand(3, 6) * k, kind: 'wisp',
          c0: darken(c, 0.2), c1: '#100c18', add: false,
        }));
      });
    }
    this.after(15, () => {
      this.shakeAmp = 3.6 * k;
      this.flash = 0.28; this.flashColor = lighten(c, 0.5);
      this.ring({ x: to.x, y: to.y, r0: 26 * k, r1: 2, frames: 10, color: lighten(c, 0.55), width: 3 });
      this.emit(Math.round(16 * k), () => {
        const a = rand(0, Math.PI * 2);
        const sp = rand(1.2, 4) * k;
        return {
          x: to.x, y: to.y,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          drag: 0.92,
          life: Math.round(rand(12, 24)), max: 24,
          size: rand(2, 4), kind: 'wisp',
          c0: lighten(c, 0.4), c1: '#140f1e', add: false,
        };
      });
    });
  }

  /** Light: charge, then a beam with a bloom and radiating spokes. */
  private radiant(from: FxPoint, to: FxPoint, c: string, k: number): void {
    const hot = lighten(c, 0.4);
    for (let f = 0; f < 10; f++) {
      this.after(f, () => {
        this.emit(3, () => {
          const a = rand(0, Math.PI * 2);
          const r = rand(16, 34);
          return {
            x: from.x + Math.cos(a) * r, y: from.y + Math.sin(a) * r,
            vx: -Math.cos(a) * r / 9, vy: -Math.sin(a) * r / 9,
            life: 10, max: 10, size: rand(1.4, 3), kind: 'star',
            c0: '#ffffff', c1: hot,
          };
        });
      });
    }
    this.after(10, () => {
      this.beams.push({ from: { x: from.x, y: from.y }, to, t: 0, frames: 16, color: hot, width: 7 * k });
      this.flash = 0.5; this.flashColor = '#fffbe8';
      this.shakeAmp = 4 * k;
    });
    this.after(14, () => {
      this.ring({ x: to.x, y: to.y, r0: 2, r1: 36 * k, frames: 14, color: '#ffffff', width: 3 });
      for (let i = 0; i < 8; i++) {
        this.slashes.push({
          x: to.x, y: to.y, angle: (i / 8) * Math.PI * 2,
          len: 34 * k, t: 0, frames: 12, color: hot, width: 2,
        });
      }
      this.emit(Math.round(20 * k), () => {
        const a = rand(0, Math.PI * 2);
        const sp = rand(1.6, 5) * k;
        return {
          x: to.x, y: to.y,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          drag: 0.93,
          life: Math.round(rand(14, 28)), max: 28,
          size: rand(1.4, 3), kind: 'star',
          c0: '#ffffff', c1: hot,
        };
      });
    });
  }

  /** Spirit: wisps that drift up through the target and flicker out. */
  private spirit(to: FxPoint, c: string, k: number): void {
    for (let f = 0; f < 16; f++) {
      this.after(f, () => {
        this.emit(2, () => ({
          x: to.x + rand(-20, 20), y: to.y + rand(6, 16),
          vx: rand(-0.6, 0.6), vy: rand(-1.6, -0.6),
          ax: rand(-0.04, 0.04),
          life: Math.round(rand(20, 34)), max: 34,
          size: rand(2.5, 5) * k, kind: 'wisp',
          c0: lighten(c, 0.55), c1: darken(c, 0.5),
        }));
      });
    }
    this.after(14, () => {
      this.flash = 0.24; this.flashColor = lighten(c, 0.6);
      this.shakeAmp = 2.6 * k;
      this.ring({ x: to.x, y: to.y, r0: 30 * k, r1: 3, frames: 14, color: lighten(c, 0.5), width: 2 });
    });
  }

  /** A build-up with no impact, for two-turn moves. */
  private charge(at: FxPoint, c: string): void {
    for (let f = 0; f < 20; f++) {
      this.after(f, () => {
        this.emit(3, () => {
          const a = rand(0, Math.PI * 2);
          const r = rand(20, 44);
          return {
            x: at.x + Math.cos(a) * r, y: at.y + Math.sin(a) * r,
            vx: -Math.cos(a) * r / 14, vy: -Math.sin(a) * r / 14,
            life: 14, max: 14, size: rand(1.4, 3), kind: 'star',
            c0: '#ffffff', c1: c,
          };
        });
      });
    }
    this.after(20, () => { this.flash = 0.2; this.flashColor = lighten(c, 0.6); });
  }

  /** Stat changes and healing: motes rising from or falling onto the user. */
  private field(at: FxPoint, c: string, dir: 'up' | 'down'): void {
    const sign = dir === 'up' ? -1 : 1;
    for (let f = 0; f < 18; f++) {
      this.after(f, () => {
        this.emit(3, () => ({
          x: at.x + rand(-24, 24),
          y: at.y + (dir === 'up' ? rand(8, 18) : rand(-30, -16)),
          vx: rand(-0.3, 0.3), vy: sign * rand(0.8, 2),
          life: Math.round(rand(16, 28)), max: 28,
          size: rand(1.5, 3.2), kind: 'star',
          c0: '#ffffff', c1: c,
        }));
      });
    }
    this.ring({ x: at.x, y: at.y + 10, r0: 4, r1: 30, squash: 0.35, frames: 18, color: c, width: 2 });
    this.after(6, () => {
      this.ring({ x: at.x, y: at.y + 10, r0: 4, r1: 24, squash: 0.35, frames: 18, color: lighten(c, 0.4), width: 2 });
    });
  }

  /** A barrier snapping into place around the user. */
  private shield(at: FxPoint, c: string): void {
    this.ring({ x: at.x, y: at.y, r0: 46, r1: 30, squash: 1.15, frames: 12, color: lighten(c, 0.6), width: 3 });
    this.after(8, () => {
      this.ring({ x: at.x, y: at.y, r0: 30, r1: 32, squash: 1.15, frames: 20, color: lighten(c, 0.3), width: 2 });
      this.flash = 0.2; this.flashColor = lighten(c, 0.7);
      this.emit(18, () => {
        const a = rand(0, Math.PI * 2);
        return {
          x: at.x + Math.cos(a) * 30, y: at.y + Math.sin(a) * 34,
          vx: Math.cos(a) * 0.5, vy: Math.sin(a) * 0.5,
          life: Math.round(rand(14, 26)), max: 26,
          size: rand(1.4, 3), kind: 'star',
          c0: '#ffffff', c1: c,
        };
      });
    });
  }

  /** Weather: something arrives across the whole field, not at one target. */
  private weather(c: string): void {
    for (let f = 0; f < 22; f++) {
      this.after(f, () => {
        this.emit(4, () => ({
          x: rand(-10, 250), y: rand(-16, 20),
          vx: rand(-1.2, -0.2), vy: rand(2.4, 5),
          life: Math.round(rand(24, 44)), max: 44,
          size: rand(1.4, 3), kind: 'streak',
          c0: lighten(c, 0.5), c1: c,
        }));
      });
    }
    this.after(4, () => { this.flash = 0.22; this.flashColor = lighten(c, 0.5); });
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

    for (const p of this.particles) {
      p.vx = (p.vx + p.ax) * p.drag;
      p.vy = (p.vy + p.ay) * p.drag;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.spin;
      p.life--;
    }
    if (this.particles.length) this.particles = this.particles.filter((p) => p.life > 0);

    for (const x of this.rings) x.t++;
    if (this.rings.length) this.rings = this.rings.filter((x) => x.t < x.frames);
    for (const x of this.beams) x.t++;
    if (this.beams.length) this.beams = this.beams.filter((x) => x.t < x.frames);
    for (const x of this.bolts) x.t++;
    if (this.bolts.length) this.bolts = this.bolts.filter((x) => x.t < x.frames);
    for (const x of this.slashes) x.t++;
    if (this.slashes.length) this.slashes = this.slashes.filter((x) => x.t < x.frames);

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

    /* beams first, they sit behind everything */
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
      // Re-jitter every other frame so the strike crackles.
      const jitter = Math.floor(b.t / 2);
      c.globalCompositeOperation = 'lighter';
      for (const [mul, col] of [[3.2, rgba(b.color, 0.22 * fade)], [1.6, rgba(b.color, 0.7 * fade)], [0.7, rgba('#ffffff', fade)]] as const) {
        c.strokeStyle = col;
        c.lineWidth = Math.max(1, mul * D);
        this.strokeBolt(c, b, jitter, D);
      }
    }

    /* rings */
    for (const g of this.rings) {
      const p = g.t / g.frames;
      const rad = g.r0 + (g.r1 - g.r0) * easeOut(p);
      const a = 1 - p;
      c.globalCompositeOperation = g.add ? 'lighter' : 'source-over';
      c.strokeStyle = rgba(g.color, a);
      c.lineWidth = Math.max(1, g.width * a * D);
      c.beginPath();
      c.ellipse(g.x * D, g.y * D, Math.max(0.5, rad * D), Math.max(0.5, rad * g.squash * D), 0, 0, Math.PI * 2);
      c.stroke();
    }

    /* slash arcs */
    for (const s of this.slashes) {
      const p = s.t / s.frames;
      // Sweep in, then fade: the leading edge is what the eye tracks.
      const grow = Math.min(1, p / 0.4);
      const a = p < 0.4 ? 1 : 1 - (p - 0.4) / 0.6;
      const len = s.len * grow;
      const dx = Math.cos(s.angle) * len / 2;
      const dy = Math.sin(s.angle) * len / 2;
      c.globalCompositeOperation = 'lighter';
      for (const [mul, col] of [[2.6, rgba(s.color, 0.22 * a)], [1, rgba(s.color, 0.8 * a)], [0.4, rgba('#ffffff', a)]] as const) {
        c.strokeStyle = col;
        c.lineWidth = Math.max(1, s.width * mul * a * D);
        c.beginPath();
        c.moveTo((s.x - dx) * D, (s.y - dy) * D);
        c.lineTo((s.x + dx) * D, (s.y + dy) * D);
        c.stroke();
      }
    }

    /* particles */
    for (const p of this.particles) {
      const life = p.life / p.max;
      const col = mix(p.c1, p.c0, Math.max(0, Math.min(1, life)));
      const alpha = p.kind === 'wisp' ? Math.min(1, life * 1.4) : Math.min(1, life * 2.2);
      c.globalCompositeOperation = p.add ? 'lighter' : 'source-over';
      const X = p.x * D, Y = p.y * D;

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
        case 'wisp': {
          // Always composited normally: a dozen overlapping additive puffs
          // saturate to white and the element becomes unreadable.
          c.globalCompositeOperation = 'source-over';
          // Puffs expand as they die, the way smoke and flame actually behave.
          const grow = (1.35 - life * 0.45);
          const rx = p.size * D * grow;
          c.fillStyle = rgba(col, alpha * 0.85);
          c.beginPath();
          c.ellipse(X, Y, rx, rx * 0.85, 0, 0, Math.PI * 2);
          c.fill();
          // Lit shoulder towards the light, which is what makes a blob a puff.
          c.fillStyle = rgba(lighten(col, 0.3), alpha * 0.9);
          c.beginPath();
          c.ellipse(X - rx * 0.3, Y - rx * 0.3, rx * 0.5, rx * 0.42, 0, 0, Math.PI * 2);
          c.fill();
          break;
        }
        case 'shard':
        case 'rock': {
          c.save();
          c.translate(X, Y);
          c.rotate(p.rot);
          const w = p.size * D, h = p.size * D * (p.kind === 'rock' ? 0.85 : 0.55);
          c.fillStyle = rgba(col, alpha);
          c.beginPath();
          if (p.kind === 'rock') {
            c.moveTo(-w, 0); c.lineTo(-w * 0.4, -h); c.lineTo(w * 0.6, -h * 0.8);
            c.lineTo(w, h * 0.4); c.lineTo(0, h);
          } else {
            c.moveTo(-w, 0); c.lineTo(0, -h); c.lineTo(w, 0); c.lineTo(0, h);
          }
          c.closePath();
          c.fill();
          // Lit facet, so shards do not read as flat confetti.
          c.fillStyle = rgba(lighten(col, 0.45), alpha);
          c.fillRect(-w * 0.5, -h * 0.5, w * 0.5, Math.max(1, h * 0.4));
          c.restore();
          break;
        }
        default: {
          const s = Math.max(1, Math.round(p.size * D));
          c.fillStyle = rgba(col, alpha);
          c.fillRect(Math.round(X - s / 2), Math.round(Y - s / 2), s, s);
          if (p.size > 2) {
            c.fillStyle = rgba(lighten(col, 0.5), alpha);
            c.fillRect(Math.round(X - s / 2), Math.round(Y - s / 2), Math.max(1, s / 2), Math.max(1, s / 2));
          }
        }
      }
    }

    c.restore();
  }

  private strokeBolt(c: CanvasRenderingContext2D, b: Bolt, jitter: number, D: number): void {
    const segs = 9;
    const dx = b.to.x - b.from.x;
    const dy = b.to.y - b.from.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;

    const path = (spread: number, from: FxPoint, to: FxPoint, n: number) => {
      c.beginPath();
      c.moveTo(from.x * D, from.y * D);
      for (let i = 1; i <= n; i++) {
        const t = i / n;
        const off = i === n ? 0 : (noise(b.seed + i * 31 + jitter * 7) - 0.5) * spread;
        c.lineTo((from.x + (to.x - from.x) * t + nx * off) * D,
                 (from.y + (to.y - from.y) * t + ny * off) * D);
      }
      c.stroke();
    };

    path(18, b.from, b.to, segs);
    // Forks peel off the main channel part-way down.
    for (let k = 0; k < b.branches; k++) {
      const t = 0.3 + k * 0.18;
      const ox = b.from.x + dx * t;
      const oy = b.from.y + dy * t;
      const ang = Math.atan2(dy, dx) + (noise(b.seed + k * 97) - 0.5) * 1.8;
      const l = 12 + noise(b.seed + k * 13) * 18;
      path(8, { x: ox, y: oy }, { x: ox + Math.cos(ang) * l, y: oy + Math.sin(ang) * l }, 4);
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
 * The frame at which each archetype's payload arrives.
 *
 * Support archetypes are absent on purpose: a heal or a stat buff has no
 * moment of contact, and putting an impact burst on one would read as the
 * move having hurt somebody.
 */
const IMPACT_AT: Partial<Record<Archetype, number>> = {
  impact: 12, slash: 9, flame: 16, water: 16, leaf: 15, bolt: 8,
  frost: 16, venom: 15, quake: 14, wind: 13, psy: 11, swarm: 15,
  iron: 12, umbral: 11, radiant: 13, spirit: 11,
};

function archetypeOf(anim: string): Archetype {
  return ARCHETYPES[anim] ?? 'impact';
}

/** Whether an effect plays on the user rather than the target. */
export function fxTargetsSelf(anim: string): boolean {
  const a = archetypeOf(anim);
  return a === 'heal' || a === 'shield' || a === 'buff' || a === 'charge' || a === 'weather';
}
