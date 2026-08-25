/**
 * Region map.
 *
 * A drawn chart of Caelora rather than a satellite view. The coastline, the
 * shelf, the woods and the hill country are generated from one angular field
 * and baked into a single parchment sheet when the scene opens; the towns, the
 * roads, the cursor and the panels are then drawn live on top of it. Baking is
 * what makes the terrain affordable: per-pixel work at DETAIL density costs one
 * frame at open instead of sixty a second.
 *
 * Two things drive every decision here.
 *
 *  - The geography has to agree with data/region/places.json, which lays the
 *    settlements out on a 40x30 grid. The ring, the strait and the southern
 *    reach are fitted to those coordinates, and any place the ring does not
 *    cover is given its own islet, so a town can never end up floating in open
 *    water when the data moves. That is how the Temple of the Deep becomes
 *    an island off the east coast rather than a drowned dot.
 *  - The sheet is 240x160 logical units. Ornament only earns its place if it
 *    never makes a town harder to find, which is why the cartouche, the rose
 *    and the scale sit out in open ocean, and why only the selected place is
 *    labelled on the map itself -- fourteen names at this size is a blur.
 */

import type { Game } from '../core/game.js';
import type { Scene } from '../core/scene.js';
import { DETAIL, Renderer, SCREEN_H, SCREEN_W, type Align } from '../engine/renderer.js';
import { makeTextSprite } from '../gfx/textart.js';
import type { GameState } from '../systems/state.js';

/* ------------------------------------------------------------- geography */

/** Centre and radii of the ring, in the grid units places.json is authored in. */
const CX = 19.5;
const CY = 15.5;
const RX = 13;
const RY = 11;

/**
 * Projection. Logical units per grid cell, and where grid (0,0) lands. Cells
 * are square: an anisotropic scale made the crescent read as an oval, and the
 * ocean margins the square fit leaves over are exactly where the chart's
 * furniture goes.
 */
const SCALE = 4.6;
const ORIGIN_X = 29.3;
const ORIGIN_Y = -9.3;

/** Angular lookup resolution for the two coastlines. */
const LUT = 1024;

/** The strait, as an angle and a half-width in radians. */
const STRAIT_A = 1.80;
const STRAIT_CORE = 0.24;
const STRAIT_EDGE = 0.40;

/** How far from a visited place the chart is still considered surveyed. */
const FOG_NEAR = 30;
const FOG_FAR = 66;
const FOG_MAX = 0.60;

const MAP_MID_X = ORIGIN_X + CX * SCALE;
const MAP_MID_Y = ORIGIN_Y + CY * SCALE;

/* ------------------------------------------------------------------ ink */

type RGB = readonly [number, number, number];

const PAPER: RGB = [231, 216, 181];
const FOG_PAPER: RGB = [223, 209, 176];

const SAND: RGB = [224, 205, 154];
const FLATS: RGB = [194, 201, 140];
const PLAIN: RGB = [174, 189, 124];
const DOWNS: RGB = [152, 171, 108];
const HILLS: RGB = [192, 167, 113];
const UPLAND: RGB = [171, 141, 94];
const PEAK: RGB = [211, 194, 162];
const FOREST: RGB = [111, 143, 87];
const FOREST_DARK: RGB = [91, 122, 72];

const WATER: RGB[] = [
  [143, 182, 200],
  [121, 163, 186],
  [102, 144, 171],
  [85, 127, 156],
  [72, 112, 140],
];
const SEA_TINT: RGB = [95, 154, 149];
const COAST_INK: RGB = [60, 48, 34];

const INK = '#3b2f21';
const INK_SOFT = '#6d5a3f';
const GOLD = '#9a6a12';
const PANEL = { fill: '#eddfbc', border: '#3b2f21', highlight: '#c9b68c' };

/* ---------------------------------------------------------------- icons */

/** `#` ink, `o` fill, `.` clear. Authored at logical resolution. */
const ICON_TOWN = [
  '...#...',
  '..###..',
  '.#####.',
  '#######',
  '.#ooo#.',
  '.#o#o#.',
  '.#####.',
];

const ICON_HALL = [
  '#.#.#.#',
  '#######',
  '#ooooo#',
  '#oo#oo#',
  '#ooooo#',
  '#ooooo#',
  '#######',
];

const ICON_SPIRE = [
  '..#..',
  '.###.',
  '.#o#.',
  '.#o#.',
  '#####',
  '#ooo#',
  '#o#o#',
  '#####',
];

const ICON_ROUTE = [
  '..#..',
  '.#o#.',
  '#ooo#',
  '.#o#.',
  '..#..',
];

const ICON_UNKNOWN = [
  '..#..',
  '.#.#.',
  '#.o.#',
  '.#.#.',
  '..#..',
];

const ICONS: Record<string, string[]> = {
  town: ICON_TOWN,
  hall: ICON_HALL,
  spire: ICON_SPIRE,
  route: ICON_ROUTE,
  unknown: ICON_UNKNOWN,
};

const ICON_INK: Record<string, string> = {
  town: '#3a2c1c', hall: '#3a2c1c', spire: '#33223a',
  route: '#3a2c1c', unknown: '#7d6c52',
};

const ICON_FILL: Record<string, string> = {
  town: '#f6efd8', hall: '#e9b449', spire: '#c07aa8',
  route: '#f0e2bd', unknown: '#dccfae',
};

const KIND_LABEL: Record<string, string> = {
  town: 'TOWN', hall: 'KIN HALL', spire: 'SPIRE', route: 'ROUTE',
};

/* ------------------------------------------------------------- networks */

/** The crescent road, in place ids. Presentation only; places.json has no edges. */
const ROADS: [string, string][] = [
  ['hearthmere', 'route_1'],
  ['route_1', 'briarbell'],
  ['briarbell', 'route_2'],
  ['route_2', 'stonewake'],
  ['stonewake', 'route_3'],
  ['route_3', 'tanners_rest'],
  ['tanners_rest', 'route_4'],
  ['route_4', 'tideglass'],
  // From here the crescent is the journey ahead, in the order canon walks it:
  // the coast, the volcanic interior, the wetlands, the capital, the snow, the
  // cliffs, and the old city below the Summit.
  ['tideglass', 'route_5'],
  ['route_5', 'emberfall'],
  ['emberfall', 'mirehaven'],
  ['mirehaven', 'aureline'],
  ['aureline', 'frostmere'],
  ['aureline', 'skyreach'],
  ['skyreach', 'crownspire'],
  ['crownspire', 'the_ascent'],
];

// No lane out to the Temple of the Deep on purpose. It is a long way off the
// east coast, nothing on the chart connects to it by road, and a dotted line
// running off the edge of the surveyed land is the honest way to draw that.

/** Rivers, in grid units, running from the high ground down to a coast. */
const RIVERS: [number, number][][] = [
  [[20.7, 5.4], [20.1, 7.4], [19.2, 9.0], [19.9, 10.7], [19.3, 12.6]],
  [[27.9, 8.2], [29.4, 9.1], [30.7, 10.5], [32.3, 11.5], [34.2, 12.4]],
  [[6.4, 14.8], [8.2, 15.4], [9.9, 15.1], [11.4, 15.7], [12.8, 16.0]],
  [[28.6, 24.4], [27.9, 22.7], [27.2, 21.2], [26.0, 19.6]],
];

/* --------------------------------------------------------------- shapes */

interface Place {
  id: string;
  name: string;
  x: number;
  y: number;
  kind: 'town' | 'route' | 'hall' | 'spire';
  blurb?: string;
}

interface PlacesFile {
  seaName: string;
  places: Place[];
}

interface Islet {
  x: number;
  y: number;
  r: number;
  seed: number;
}

/* -------------------------------------------------------------- helpers */

function wrapAngle(a: number): number {
  let v = a;
  while (v > Math.PI) v -= Math.PI * 2;
  while (v < -Math.PI) v += Math.PI * 2;
  return v;
}

function gauss(a: number, centre: number, width: number): number {
  const t = wrapAngle(a - centre) / width;
  return Math.exp(-t * t);
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function smoothstep(edge0: number, edge1: number, v: number): number {
  const t = clamp01((v - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function mix(a: RGB, b: RGB, t: number): RGB {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

function shade(c: RGB, k: number): RGB {
  return [c[0] * k, c[1] * k, c[2] * k];
}

function rgbStr(c: RGB): string {
  return `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;
}

/** Cheap integer hash, used for paper grain. Deterministic, so the sheet never shifts. */
function ihash(x: number, y: number): number {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function seedOf(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) / 4294967296) * Math.PI * 2;
}

/** Value noise on a lattice, smoothed. One allocation, sampled per pixel. */
class NoiseField {
  private data: Float32Array;

  constructor(private cols: number, private rows: number, seed: number) {
    this.data = new Float32Array(cols * rows);
    let s = seed >>> 0;
    for (let i = 0; i < this.data.length; i++) {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      this.data[i] = s / 4294967296;
    }
  }

  at(u: number, v: number): number {
    const x = Math.min(this.cols - 1.001, Math.max(0, u));
    const y = Math.min(this.rows - 1.001, Math.max(0, v));
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = x - x0;
    const fy = y - y0;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const i = y0 * this.cols + x0;
    const top = this.data[i] + (this.data[i + 1] - this.data[i]) * sx;
    const j = i + this.cols;
    const bot = this.data[j] + (this.data[j + 1] - this.data[j]) * sx;
    return top + (bot - top) * sy;
  }
}

/** Dots per ring, spaced closely enough that the ring reads as a line. */
function ringSteps(rad: number): number {
  return Math.max(8, Math.round((Math.PI * 2 * rad) / 0.8));
}

/** Walk a polyline at a fixed spacing, reporting distance travelled. */
function walk(pts: [number, number][], step: number, cb: (x: number, y: number, s: number) => void): void {
  let carry = 0;
  let total = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1e-6) continue;
    let s = carry;
    while (s < len) {
      cb(a[0] + dx * (s / len), a[1] + dy * (s / len), total + s);
      s += step;
    }
    carry = s - len;
    total += len;
  }
}

/** Chaikin corner cutting: turns a hand-plotted polyline into a drawn curve. */
function smoothPath(pts: [number, number][], passes: number): [number, number][] {
  let cur = pts;
  for (let p = 0; p < passes; p++) {
    if (cur.length < 3) break;
    const out: [number, number][] = [cur[0]];
    for (let i = 0; i + 1 < cur.length; i++) {
      const a = cur[i];
      const b = cur[i + 1];
      out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
      out.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    out.push(cur[cur.length - 1]);
    cur = out;
  }
  return cur;
}

/* ---------------------------------------------------------------- scene */

export class RegionMapScene implements Scene {
  readonly name = 'regionmap';
  readonly transparent = true;

  private places: Place[] = [];
  private seaName = 'THE CAELORAN SEA';
  private index = 0;
  private t = 0;

  private innerLut = new Float32Array(LUT);
  private outerLut = new Float32Array(LUT);
  private ridgeLut = new Float32Array(LUT);
  private maskLut = new Float32Array(LUT);

  private islets: Islet[] = [];
  private knownPts: number[] = [];
  private hereId: string | null = null;

  private sheet: HTMLCanvasElement | null = null;
  private title: HTMLCanvasElement | null = null;

  constructor(private state: GameState) {}

  async enter(game: Game): Promise<void> {
    const file = await game.assets
      .loadJson<PlacesFile>('data/region/places.json')
      .catch(() => null);
    if (file) {
      this.places = file.places;
      this.seaName = file.seaName ?? this.seaName;
    }

    this.hereId = this.resolveHere();
    const here = this.places.findIndex((p) => p.id === this.hereId);
    if (here >= 0) this.index = here;

    this.knownPts = [];
    for (const p of this.places) {
      if (!this.known(p)) continue;
      this.knownPts.push(ORIGIN_X + p.x * SCALE, ORIGIN_Y + p.y * SCALE);
    }

    this.buildCoast();
    this.buildIslets();
    this.sheet = this.bakeSheet();

    this.title = makeTextSprite('CAELORA', {
      scale: 2,
      fill: ['#6b4f2a', '#513a1e'],
      outline: null,
      shadow: '#c9b68c',
      shadowOffset: 1,
      letterSpacing: 2,
    });
  }

  /**
   * The player's map id is as often an interior as a town -- `briarbell_house_a`
   * rather than `briarbell` -- so the marker falls back to matching on the town's
   * first id segment. Without this the "you are here" ring vanished every time
   * the player stepped through a door. Routes are excluded from the fallback
   * because route_3 exists as a map but not as a place, and it would otherwise
   * claim Route 1's marker.
   */
  private resolveHere(): string | null {
    const map = this.state.currentMap;
    const exact = this.places.find((p) => p.id === map);
    if (exact) return exact.id;

    let best: Place | null = null;
    let bestLen = 0;
    for (const p of this.places) {
      if (p.kind === 'route') continue;
      const stem = p.id.split('_')[0];
      if (!map.startsWith(`${stem}_`)) continue;
      if (stem.length > bestLen) { best = p; bestLen = stem.length; }
    }
    return best ? best.id : null;
  }

  private known(p: Place): boolean {
    return this.state.hasVisited(p.id) || p.id === this.hereId;
  }

  /* ------------------------------------------------------------- coasts */

  /**
   * Both shorelines are one-dimensional: a radius per angle. That keeps the
   * coast smooth and closed by construction, and it means the strait is a
   * pinch in a curve rather than a wedge chopped out of a grid -- the old
   * wedge cut straight through Tideglass, Emberfall and the south coast.
   */
  private buildCoast(): void {
    for (let i = 0; i < LUT; i++) {
      const a = (i / LUT) * Math.PI * 2 - Math.PI;

      const shore = 0.62 + 0.055 * Math.sin(3 * a + 0.9) + 0.03 * Math.sin(7 * a + 2.1);
      let coast = 1.16 + 0.05 * Math.sin(2 * a + 0.5) + 0.03 * Math.sin(5 * a + 3.0);
      // The southern reach: the spit Hearthmere, Briarbell and Stonewake sit
      // on, which hangs well outside the ring the rest of the towns follow.
      coast += 0.26 * gauss(a, 2.35, 0.45);

      const m = this.straitMask(a);
      this.innerLut[i] = shore;
      this.outerLut[i] = coast + (shore - coast) * m;
      this.maskLut[i] = m;
      this.ridgeLut[i] = Math.min(1,
        0.18
        + 0.95 * gauss(a, 5.30, 0.60)
        + 0.80 * gauss(a, 3.10, 0.42)
        + 0.55 * gauss(a, 4.25, 0.38)
        + 0.45 * gauss(a, 0.55, 0.45),
      );
    }
  }

  /** 1 where the ring is cut open, feathered at the edges so the coast curves in. */
  private straitMask(a: number): number {
    const t = Math.abs(wrapAngle(a - STRAIT_A));
    if (t >= STRAIT_EDGE) return 0;
    if (t <= STRAIT_CORE) return 1;
    const u = (STRAIT_EDGE - t) / (STRAIT_EDGE - STRAIT_CORE);
    return u * u * (3 - 2 * u);
  }

  private lutAt(lut: Float32Array, a: number): number {
    const f = ((a + Math.PI) / (Math.PI * 2)) * LUT;
    const i = Math.floor(f);
    const k = f - i;
    const i0 = ((i % LUT) + LUT) % LUT;
    const i1 = (i0 + 1) % LUT;
    return lut[i0] + (lut[i1] - lut[i0]) * k;
  }

  /** Anything the ring does not carry gets an island of its own. */
  private buildIslets(): void {
    this.islets = [];
    for (const p of this.places) {
      const nx = (p.x - CX) / RX;
      const ny = (p.y - CY) / RY;
      const d = Math.sqrt(nx * nx + ny * ny);
      const a = Math.atan2(ny, nx);
      const shore = this.lutAt(this.innerLut, a);
      const coast = this.lutAt(this.outerLut, a);
      if (d > shore + 0.04 && d < coast - 0.04) continue;
      this.islets.push({
        x: p.x,
        y: p.y,
        r: p.kind === 'route' ? 1.5 : 2.1,
        seed: seedOf(p.id),
      });
    }
  }

  /* --------------------------------------------------------------- fog */

  /** 0 where the chart is surveyed, 1 where nothing has been walked near. */
  private fogAt(lx: number, ly: number): number {
    if (this.knownPts.length === 0) return 1;
    let best = Infinity;
    for (let i = 0; i < this.knownPts.length; i += 2) {
      const dx = lx - this.knownPts[i];
      const dy = ly - this.knownPts[i + 1];
      const d2 = dx * dx + dy * dy;
      if (d2 < best) best = d2;
    }
    return smoothstep(FOG_NEAR, FOG_FAR, Math.sqrt(best));
  }

  /* -------------------------------------------------------------- bake */

  private bakeSheet(): HTMLCanvasElement | null {
    const W = SCREEN_W * DETAIL;
    const H = SCREEN_H * DETAIL;
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const ctx = cv.getContext('2d');
    if (!ctx) return null;
    ctx.imageSmoothingEnabled = false;

    const img = ctx.createImageData(W, H);
    const data = img.data;
    const landMask = new Uint8Array(W * H);

    const lumps = new NoiseField(28, 24, 0x51ee5);
    const woodsA = new NoiseField(28, 24, 0x9c31b);
    const woodsB = new NoiseField(64, 56, 0x2d7f4);

    for (let py = 0; py < H; py++) {
      const ly = (py + 0.5) / DETAIL;
      const gy = (ly - ORIGIN_Y) / SCALE;
      const ny = (gy - CY) / RY;

      for (let px = 0; px < W; px++) {
        const lx = (px + 0.5) / DETAIL;
        const gx = (lx - ORIGIN_X) / SCALE;
        const nx = (gx - CX) / RX;

        const d = Math.sqrt(nx * nx + ny * ny);
        const a = Math.atan2(ny, nx);
        const shore = this.lutAt(this.innerLut, a);
        const coast = this.lutAt(this.outerLut, a);

        let islet = 0;
        for (let k = 0; k < this.islets.length; k++) {
          const is = this.islets[k];
          const dx = gx - is.x;
          const dy = gy - is.y;
          const d2 = dx * dx + dy * dy;
          const reach = is.r * 1.35;
          if (d2 > reach * reach) continue;
          const dr = Math.sqrt(d2);
          const ia = Math.atan2(dy, dx);
          const rr = is.r * (1 + 0.16 * Math.sin(3 * ia + is.seed) + 0.08 * Math.sin(5 * ia - is.seed * 1.7));
          const v = 1 - dr / rr;
          if (v > islet) islet = v;
        }

        const inRing = d > shore && d < coast;
        let edge = -1;
        let elev = 0;
        if (inRing) {
          const t = (d - shore) / Math.max(0.02, coast - shore);
          edge = Math.min(t, 1 - t);
          const tent = 1 - Math.abs(t * 2 - 1);
          const ridge = this.lutAt(this.ridgeLut, a);
          const lump = lumps.at(gx / 2.2 + 4, gy / 2.2 + 4);
          elev = clamp01(tent * (0.30 + 0.85 * ridge) + (lump - 0.5) * 0.30);
        }
        if (islet > 0) {
          edge = Math.max(edge, islet * 0.42);
          elev = Math.max(elev, islet * 0.55);
        }

        let col: RGB;
        if (edge >= 0) {
          const wood = 0.6 * woodsA.at(gx / 2.2 + 4, gy / 2.2 + 4)
            + 0.4 * woodsB.at(gx / 0.9 + 9, gy / 0.9 + 9);
          if (edge < 0.055) col = SAND;
          else if (wood > 0.55 && elev < 0.52) {
            // Stippled rather than flat: a single green blocks out too solid at
            // this size and swallows the road running through it.
            col = (px + py * 2) % 5 === 0 ? FOREST_DARK : FOREST;
          } else if (elev < 0.14) col = FLATS;
          else if (elev < 0.32) col = PLAIN;
          else if (elev < 0.48) col = DOWNS;
          else if (elev < 0.63) col = HILLS;
          else if (elev < 0.86) col = UPLAND;
          else col = PEAK;
          // Hachure, the way relief was drawn before contour lines: raked
          // strokes that cross themselves on the summits. A flat brown band
          // read as a stain rather than as high ground.
          if (elev > 0.55 && (px + py) % 6 < 1) col = shade(col, 0.87);
          if (elev > 0.76 && (px - py + 600) % 6 < 1) col = shade(col, 0.85);
          landMask[py * W + px] = 1;
        } else {
          const m = this.lutAt(this.maskLut, a);
          // Distance to the nearest shore, in grid units. Inside the strait
          // there is no shore at all, so the mask stands in for depth and the
          // mouth reads as open water instead of a bar across the channel.
          const sd = (d < shore ? (shore - d) : (d - coast)) * RX + m * 2.6;
          const band = sd < 0.45 ? 0 : sd < 1.2 ? 1 : sd < 2.6 ? 2 : sd < 4.6 ? 3 : 4;
          col = WATER[band];
          const enclosed = (d < shore ? 1 : 0) * (1 - m);
          if (enclosed > 0) col = mix(col, SEA_TINT, 0.25 * enclosed);
          if (sd < 3.0) {
            const f = (sd / 0.9) % 1;
            if (f < 0.16) col = mix(col, PAPER, 0.30);
          }
        }

        const i = (py * W + px) * 4;
        data[i] = col[0];
        data[i + 1] = col[1];
        data[i + 2] = col[2];
        data[i + 3] = 255;
      }
    }

    this.drawCoastline(data, landMask, W, H);
    this.ageThePaper(data, W, H);

    ctx.putImageData(img, 0, 0);
    this.drawRivers(ctx, landMask, W, H);
    this.drawRoads(ctx, landMask, W, H);
    return cv;
  }

  /** A pen line along every shore, and a shadow in the water beside it. */
  private drawCoastline(data: Uint8ClampedArray, landMask: Uint8Array, W: number, H: number): void {
    for (let py = 1; py < H - 1; py++) {
      for (let px = 1; px < W - 1; px++) {
        const i = py * W + px;
        const wet = !landMask[i - 1] || !landMask[i + 1] || !landMask[i - W] || !landMask[i + W];
        const dry = landMask[i - 1] || landMask[i + 1] || landMask[i - W] || landMask[i + W];
        const o = i * 4;
        if (landMask[i]) {
          if (!wet) continue;
          data[o] = COAST_INK[0];
          data[o + 1] = COAST_INK[1];
          data[o + 2] = COAST_INK[2];
        } else if (dry) {
          data[o] *= 0.82;
          data[o + 1] *= 0.82;
          data[o + 2] *= 0.82;
        }
      }
    }
  }

  /** Grain, a worn edge, and the unsurveyed wash. Always the last pass. */
  private ageThePaper(data: Uint8ClampedArray, W: number, H: number): void {
    const edgeUnits = 20 * DETAIL;
    for (let py = 0; py < H; py++) {
      const ly = (py + 0.5) / DETAIL;
      const ey = Math.min(py, H - 1 - py) / edgeUnits;
      for (let px = 0; px < W; px++) {
        const o = (py * W + px) * 4;
        const lx = (px + 0.5) / DETAIL;

        const f = this.fogAt(lx, ly);
        if (f > 0) {
          const k = f * FOG_MAX;
          data[o] += (FOG_PAPER[0] - data[o]) * k;
          data[o + 1] += (FOG_PAPER[1] - data[o + 1]) * k;
          data[o + 2] += (FOG_PAPER[2] - data[o + 2]) * k;
        }

        const grain = (ihash(px, py) - 0.5) * 7 + ((px * 5 + py * 3) % 37 === 0 ? 5 : 0);
        const ex = Math.min(px, W - 1 - px) / edgeUnits;
        const worn = 0.87 + 0.13 * Math.min(1, Math.min(ex, ey));
        data[o] = (data[o] + grain) * worn;
        data[o + 1] = (data[o + 1] + grain) * worn;
        data[o + 2] = (data[o + 2] + grain) * worn;
      }
    }
  }

  private drawRivers(ctx: CanvasRenderingContext2D, landMask: Uint8Array, W: number, H: number): void {
    const river: RGB = [90, 143, 175];
    for (const path of RIVERS) {
      const pts = smoothPath(path, 3).map(
        (p) => [ORIGIN_X + p[0] * SCALE, ORIGIN_Y + p[1] * SCALE] as [number, number],
      );
      walk(pts, 0.5, (lx, ly) => {
        const bx = Math.round(lx * DETAIL);
        const by = Math.round(ly * DETAIL);
        if (bx < 1 || by < 1 || bx >= W - 1 || by >= H - 1) return;
        if (!landMask[by * W + bx]) return;
        ctx.fillStyle = rgbStr(mix(river, FOG_PAPER, this.fogAt(lx, ly) * FOG_MAX));
        ctx.fillRect(bx - 1, by - 1, 2, 2);
      });
    }
  }

  private drawRoads(ctx: CanvasRenderingContext2D, landMask: Uint8Array, W: number, H: number): void {
    const casing: RGB = [227, 211, 168];
    const metal: RGB = [106, 75, 40];
    for (const [from, to] of ROADS) {
      const pts = this.pathBetween(from, to, 0.10);
      if (!pts) continue;
      const on = (lx: number, ly: number): boolean => {
        const bx = Math.round(lx * DETAIL);
        const by = Math.round(ly * DETAIL);
        return bx >= 2 && by >= 2 && bx < W - 2 && by < H - 2 && landMask[by * W + bx] === 1;
      };
      walk(pts, 0.8, (lx, ly) => {
        if (!on(lx, ly)) return;
        ctx.fillStyle = rgbStr(mix(casing, FOG_PAPER, this.fogAt(lx, ly) * FOG_MAX));
        ctx.fillRect(Math.round(lx * DETAIL) - 2, Math.round(ly * DETAIL) - 2, 4, 4);
      });
      walk(pts, 0.8, (lx, ly, s) => {
        if (Math.floor(s / 2.2) % 2 !== 0 || !on(lx, ly)) return;
        ctx.fillStyle = rgbStr(mix(metal, FOG_PAPER, this.fogAt(lx, ly) * FOG_MAX));
        ctx.fillRect(Math.round(lx * DETAIL) - 1, Math.round(ly * DETAIL) - 1, 2, 2);
      });
    }
  }

  /**
   * A bowed, faintly wobbling line between two places. Straight rules between
   * dots look like a wiring diagram; a road wants to look walked.
   */
  private pathBetween(fromId: string, toId: string, bow: number): [number, number][] | null {
    const a = this.places.find((p) => p.id === fromId);
    const b = this.places.find((p) => p.id === toId);
    if (!a || !b) return null;

    const ax = ORIGIN_X + a.x * SCALE;
    const ay = ORIGIN_Y + a.y * SCALE;
    const bx = ORIGIN_X + b.x * SCALE;
    const by = ORIGIN_Y + b.y * SCALE;
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) return [[ax, ay], [bx, by]];

    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2;
    // Bow away from the middle of the sheet, so roads hug the land they cross
    // rather than cutting the corner into the water.
    const sign = ((mx - MAP_MID_X) * (-dy / len) + (my - MAP_MID_Y) * (dx / len)) >= 0 ? 1 : -1;
    const off = len * bow * sign;
    const seed = seedOf(fromId + toId);

    const raw: [number, number][] = [[ax, ay]];
    for (let i = 1; i <= 3; i++) {
      const u = i / 4;
      const k = Math.sin(u * Math.PI);
      const wob = Math.sin(u * 7 + seed) * 1.1;
      raw.push([
        ax + dx * u + (-dy / len) * (off * k + wob),
        ay + dy * u + (dx / len) * (off * k + wob),
      ]);
    }
    raw.push([bx, by]);
    return smoothPath(raw, 3);
  }

  /* ------------------------------------------------------------- update */

  private screenOf(gx: number, gy: number): { x: number; y: number } {
    return { x: ORIGIN_X + gx * SCALE, y: ORIGIN_Y + gy * SCALE };
  }

  update(game: Game, dt: number): void {
    this.t += dt;
    if (game.input.pressed('cancel') || game.input.pressed('map')) { game.scenes.pop(); return; }
    if (this.places.length === 0) return;

    // Cursor moves to whichever place lies furthest in the pressed direction,
    // which reads far better on a scattered map than a flat list order.
    const step = (dx: number, dy: number) => {
      const cur = this.places[this.index];
      let best = -1;
      let bestScore = Infinity;
      this.places.forEach((p, i) => {
        if (i === this.index) return;
        const ox = p.x - cur.x;
        const oy = p.y - cur.y;
        const along = ox * dx + oy * dy;
        if (along <= 0) return;
        const across = Math.abs(ox * dy - oy * dx);
        const score = along + across * 2.5;
        if (score < bestScore) { bestScore = score; best = i; }
      });
      if (best >= 0) this.index = best;
    };

    if (game.input.repeated('up')) step(0, -1);
    if (game.input.repeated('down')) step(0, 1);
    if (game.input.repeated('left')) step(-1, 0);
    if (game.input.repeated('right')) step(1, 0);

    if (game.input.mouse.inside) {
      this.places.forEach((p, i) => {
        const s = this.screenOf(p.x, p.y);
        if (game.input.mouseOver(s.x - 6, s.y - 6, 12, 12) && game.input.mouse.idleFrames < 2) {
          this.index = i;
        }
      });
    }
  }

  /* ------------------------------------------------------------- render */

  render(_game: Game, r: Renderer): void {
    // Parchment rather than a dark field: the scene stack does not wait for an
    // async enter, so the first frame or two run before the sheet is baked and
    // they should read as blank paper, not as a hole in the screen.
    r.clear('#ded0ac');
    if (this.sheet) r.image(this.sheet, 0, 0);

    this.renderSeaName(r);
    this.renderPlaces(r);
    this.renderFrame(r);
    this.renderCartouche(r);
    this.renderScale(r);
    this.renderCompass(r, 216, 27, 12);
    this.renderPanel(r);
  }

  /** Text with a hard halo, so a label survives whatever it is drawn over. */
  private haloText(
    r: Renderer, s: string, x: number, y: number,
    color: string, halo: string, align: Align = 'left',
  ): void {
    r.text(s, x - 1, y, { color: halo, align });
    r.text(s, x + 1, y, { color: halo, align });
    r.text(s, x, y - 1, { color: halo, align });
    r.text(s, x, y + 1, { color: halo, align });
    r.text(s, x, y, { color, align });
  }

  private renderSeaName(r: Renderer): void {
    // Chart names run across whatever is under them; this one is placed to
    // clear both island icons, which is the only part that must stay readable.
    this.haloText(r, this.seaName, MAP_MID_X, 61, '#33607f', '#c3d8e0', 'center');
  }

  private drawIcon(r: Renderer, kind: string, cx: number, cy: number): void {
    const art = ICONS[kind] ?? ICON_TOWN;
    const w = art[0].length;
    const h = art.length;
    const x0 = Math.round(cx - w / 2);
    const y0 = Math.round(cy - h / 2);
    const at = (x: number, y: number): string =>
      (x < 0 || y < 0 || x >= w || y >= h) ? '.' : art[y].charAt(x);

    // A cream halo first: without it a house on forest or hachured upland
    // loses its silhouette, and finding a town is the whole job of the map.
    for (let y = -1; y <= h; y++) {
      for (let x = -1; x <= w; x++) {
        if (at(x, y) !== '.') continue;
        const near = at(x - 1, y) !== '.' || at(x + 1, y) !== '.' ||
          at(x, y - 1) !== '.' || at(x, y + 1) !== '.' ||
          at(x - 1, y - 1) !== '.' || at(x + 1, y - 1) !== '.' ||
          at(x - 1, y + 1) !== '.' || at(x + 1, y + 1) !== '.';
        if (near) r.rect(x0 + x, y0 + y, 1, 1, 'rgba(247,238,212,0.92)');
      }
    }

    const ink = ICON_INK[kind] ?? ICON_INK.town;
    const fill = ICON_FILL[kind] ?? ICON_FILL.town;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const c = at(x, y);
        if (c === '#') r.rect(x0 + x, y0 + y, 1, 1, ink);
        else if (c === 'o') r.rect(x0 + x, y0 + y, 1, 1, fill);
      }
    }
  }

  private ringDots(r: Renderer, cx: number, cy: number, rad: number, color: string, n: number): void {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      r.rect(Math.round(cx + Math.cos(a) * rad), Math.round(cy + Math.sin(a) * rad), 1, 1, color);
    }
  }

  private bracket(r: Renderer, cx: number, cy: number, half: number, color: string): void {
    const x0 = Math.round(cx - half);
    const y0 = Math.round(cy - half);
    const x1 = Math.round(cx + half);
    const y1 = Math.round(cy + half);
    const s = 3;
    r.rect(x0, y0, s, 1, color); r.rect(x0, y0, 1, s, color);
    r.rect(x1 - s + 1, y0, s, 1, color); r.rect(x1, y0, 1, s, color);
    r.rect(x0, y1, s, 1, color); r.rect(x0, y1 - s + 1, 1, s, color);
    r.rect(x1 - s + 1, y1, s, 1, color); r.rect(x1, y1 - s + 1, 1, s, color);
  }

  private renderPlaces(r: Renderer): void {
    const sel = this.places[this.index];

    this.places.forEach((p) => {
      const s = this.screenOf(p.x, p.y);
      const known = this.known(p);
      this.drawIcon(r, known ? p.kind : 'unknown', s.x, s.y);

      // Route shields sit beside the road, on the inland side of the marker.
      if (known && p.kind === 'route') {
        const num = p.name.replace(/[^0-9]/g, '');
        if (num) {
          // Kept small on purpose: a shield the size of a town icon competes
          // with the towns, and the towns have to win.
          const w = r.textWidth(num) + 5;
          const x = Math.round(s.x < MAP_MID_X ? s.x + 4 : s.x - 4 - w);
          const y = Math.round(s.y - 4);
          r.rect(x, y, w, 9, '#f4e9cc');
          r.outline(x, y, w, 9, '#5a4529');
          r.text(num, x + w / 2, y + 1, { color: '#3a2c1c', align: 'center' });
        }
      }
    });

    // Drawn after every icon so nothing can be painted over the marker that
    // answers "where am I".
    const here = this.places.find((p) => p.id === this.hereId);
    if (here) {
      const s = this.screenOf(here.x, here.y);
      // A steady ring plus an expanding one. The old marker blinked out of
      // existence every other half second, which is the one thing a "you are
      // here" mark must never do.
      this.ringDots(r, s.x, s.y, 8, '#4a3210', ringSteps(8));
      this.ringDots(r, s.x, s.y, 7, '#ffcf4a', ringSteps(7));
      const pulse = (this.t * 0.9) % 1;
      if (pulse < 0.8) {
        const rad = 8 + pulse * 6;
        const fade = pulse < 0.5 ? '#ffe08a' : '#dcb96e';
        this.ringDots(r, s.x, s.y, rad, fade, ringSteps(rad));
      }
    }

    if (sel) {
      const s = this.screenOf(sel.x, sel.y);
      this.bracket(r, s.x, s.y, 10, '#2b2114');
      this.bracket(r, s.x, s.y, 9, '#fff6dc');

      const label = this.known(sel) ? sel.name : 'Uncharted';
      const w = r.textWidth(label) + 9;
      const [x, y] = this.placeTag(s.x, s.y, w, 12);
      r.rect(x, y, w, 12, '#f6ead0');
      r.outline(x, y, w, 12, '#3a2c1c');
      r.rect(x + 1, y + 1, w - 2, 1, '#fffbef');
      r.text(label, x + w / 2, y + 3, { color: INK, align: 'center' });
    }
  }

  /**
   * Find somewhere for the selected place's name tag. It is tried above the
   * mark first, then below, then to either side, and the first position that
   * clears the chart's own furniture wins -- a name landing on top of the
   * scale bar or the rose reads as a bug, and both are fixed rectangles.
   */
  private placeTag(cx: number, cy: number, w: number, h: number): [number, number] {
    const blocked: [number, number, number, number][] = [
      [3, 3, 66, 28],                       // cartouche
      [6, 35, 50, 20],                      // scale
      [200, 8, 34, 36],                     // rose
      [0, SCREEN_H - 42, SCREEN_W, 42],     // the bottom bar
    ];
    const options: [number, number][] = [
      [cx - w / 2, cy - 11 - h],
      [cx - w / 2, cy + 11],
      [cx + 10, cy - h / 2],
      [cx - 10 - w, cy - h / 2],
    ];
    let first: [number, number] | null = null;
    for (const [ox, oy] of options) {
      const x = Math.round(Math.max(4, Math.min(SCREEN_W - 4 - w, ox)));
      const y = Math.round(Math.max(4, Math.min(SCREEN_H - 4 - h, oy)));
      if (!first) first = [x, y];
      const hit = blocked.some((b) =>
        x < b[0] + b[2] && x + w > b[0] && y < b[1] + b[3] && y + h > b[1]);
      if (!hit) return [x, y];
    }
    return first ?? [cx, cy];
  }

  /* ---------------------------------------------------------- furniture */

  private renderFrame(r: Renderer): void {
    const ink = '#2f2517';
    r.rect(0, 0, SCREEN_W, 2, ink);
    r.rect(0, SCREEN_H - 2, SCREEN_W, 2, ink);
    r.rect(0, 0, 2, SCREEN_H, ink);
    r.rect(SCREEN_W - 2, 0, 2, SCREEN_H, ink);
    const corners: [number, number][] = [
      [0, 0], [SCREEN_W - 6, 0], [0, SCREEN_H - 6], [SCREEN_W - 6, SCREEN_H - 6],
    ];
    for (const [x, y] of corners) {
      r.rect(x, y, 6, 6, ink);
      r.rect(x + 2, y + 2, 2, 2, '#c9b68c');
    }
  }

  private renderCartouche(r: Renderer): void {
    const x = 3;
    const y = 3;
    const w = 66;
    const h = 28;
    r.window(x, y, w, h, PANEL);
    r.outline(x + 3, y + 3, w - 6, h - 6, 'rgba(59,47,33,0.30)');
    for (const [ox, oy] of [[4, 4], [w - 6, 4], [4, h - 6], [w - 6, h - 6]] as [number, number][]) {
      r.rect(x + ox, y + oy, 2, 2, '#8a7550');
    }
    if (this.title) {
      r.image(this.title, x + (w - this.title.width / DETAIL) / 2, y + 6);
    } else {
      r.text('CAELORA', x + w / 2, y + 7, { color: INK, align: 'center' });
    }
    r.text('SEA CHART', x + w / 2, y + 17, { color: INK_SOFT, align: 'center' });
  }

  private renderScale(r: Renderer): void {
    // Held off the left border by more than the bar needs: the label is wider
    // than the bar and centred on it, and it was clipping the frame.
    const x = 10;
    const y = 37;
    const w = 46;
    // A chequered bar reads as a scale at a glance where a plain rule just
    // reads as a line, and it survives being drawn over open water.
    r.rect(x, y, w, 5, '#f4ead0');
    r.outline(x, y, w, 5, '#33291c');
    for (let i = 1; i < 4; i += 2) {
      r.rect(x + 1 + (i * (w - 2)) / 4, y + 1, (w - 2) / 4, 3, '#33291c');
    }
    this.haloText(r, '10 LEAGUES', x + w / 2, y + 8, '#3d3020', '#e8dcb8', 'center');
  }

  /**
   * The rose is generated rather than plotted: each point is a run of shrinking
   * spans, split light and dark down the middle the way a printed rose is.
   */
  private renderCompass(r: Renderer, cx: number, cy: number, rad: number): void {
    const plate = (rad + 2) * DETAIL;
    r.ellipsePixel(cx * DETAIL, cy * DETAIL, plate + 2, plate + 2, '#4a3b28');
    r.ellipsePixel(cx * DETAIL, cy * DETAIL, plate, plate, 'rgba(240,230,201,0.92)');
    this.ringDots(r, cx, cy, rad, '#8a7550', 24);

    const dark = '#3f3222';
    const light = '#efe4c6';
    const point = (dx: number, dy: number, len: number, wide: number) => {
      for (let k = 0; k <= len; k++) {
        const half = Math.max(0, ((len - k) / len) * wide);
        for (let j = 0; j <= half; j++) {
          const ox = -dy * j;
          const oy = dx * j;
          r.rect(Math.round(cx + dx * k + ox), Math.round(cy + dy * k + oy), 1, 1, dark);
          r.rect(Math.round(cx + dx * k - ox), Math.round(cy + dy * k - oy), 1, 1, light);
        }
        r.rect(Math.round(cx + dx * k), Math.round(cy + dy * k), 1, 1, dark);
      }
    };

    const diag = Math.SQRT1_2;
    point(diag, diag, rad * 0.6, 1.4);
    point(-diag, diag, rad * 0.6, 1.4);
    point(diag, -diag, rad * 0.6, 1.4);
    point(-diag, -diag, rad * 0.6, 1.4);
    point(1, 0, rad - 1, 2.2);
    point(-1, 0, rad - 1, 2.2);
    point(0, 1, rad - 1, 2.2);
    point(0, -1, rad - 1, 2.2);
    r.rect(cx - 1, cy - 1, 2, 2, '#9a6a12');

    this.haloText(r, 'N', cx, cy - rad - 11, '#33291c', '#e6dab6', 'center');
  }

  /* -------------------------------------------------------------- panel */

  private renderPanel(r: Renderer): void {
    const y = SCREEN_H - 40;
    r.window(3, y, 152, 36, PANEL);
    r.window(158, y, 79, 36, PANEL);

    const p = this.places[this.index];
    if (p) {
      const known = this.known(p);
      this.drawIcon(r, known ? p.kind : 'unknown', 13, y + 8);
      r.text(known ? p.name : 'Uncharted', 22, y + 5, { color: known ? INK : INK_SOFT });

      if (known && p.id === this.hereId) {
        r.text('HERE', 151, y + 5, { color: GOLD, align: 'right' });
      } else {
        r.text(KIND_LABEL[p.kind] ?? '', 151, y + 5, { color: INK_SOFT, align: 'right' });
      }

      const line = !known
        ? 'Nothing has been drawn here yet.'
        : p.blurb ?? 'Surveyed. No notes recorded.';
      r.text(line, 9, y + 17, {
        color: known ? '#5b4a33' : '#7d6c52', maxWidth: 132, lineHeight: 9,
      });
    }

    const rows: [string, string][] = [['town', 'TOWN'], ['hall', 'KIN HALL'], ['spire', 'SPIRE']];
    rows.forEach(([kind, label], i) => {
      const ly = y + 4 + i * 10;
      this.drawIcon(r, kind, 166, ly + 3);
      r.text(label, 174, ly, { color: INK_SOFT });
    });

    const seen = this.places.filter((q) => this.known(q)).length;
    r.text(`${seen}/${this.places.length}`, 233, y + 4, { color: INK, align: 'right' });
    r.text('ESC', 233, y + 24, { color: INK_SOFT, align: 'right' });
  }
}
