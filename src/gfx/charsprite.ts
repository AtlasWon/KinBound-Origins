/**
 * Overworld character sprites.
 *
 * 32x48 walkers covering 16x24 logical units: four facings, three frames each
 * (contact, passing, contact), played as a 4-step cycle so the walk reads as
 * left-right-left-right rather than a two-frame shuffle.
 *
 * Sprites are generated from a small palette description, which means an NPC
 * "sprite" is a handful of colours in JSON and a hundred townspeople never
 * become a hundred PNGs. Each frame is drawn into a scratch buffer and then run
 * through a silhouette outline pass, which is what gives every character the
 * same hard read against grass, stone or water without hand-drawing the border.
 *
 * The player is the same machinery with the knobs exposed: an appearance is a
 * dozen indices into the tables at the bottom of this file, and it turns into a
 * palette like any other. That is what makes character creation possible at all
 * -- there is no sprite sheet to redraw, only numbers to change.
 */

import { DETAIL } from '../engine/renderer.js';

/** Frame size in buffer pixels. */
export const CHAR_W = 16 * DETAIL;
export const CHAR_H = 24 * DETAIL;
/** Frame size in logical units, for anything positioning in world space. */
export const CHAR_LW = CHAR_W / DETAIL;
export const CHAR_LH = CHAR_H / DETAIL;

export const DIRS = ['down', 'up', 'left', 'right'] as const;
export type CharDir = (typeof DIRS)[number];

/** Hair silhouettes. The head is nine pixels across, so these are shapes, not
 *  hairdressing: what matters is the outline you can recognise from a tile
 *  away. */
export type HairStyle = 'short' | 'swept' | 'spiky' | 'bob' | 'long' | 'ponytail' | 'bun' | 'curls';
export type HatStyle = 'cap' | 'beanie' | 'bandana' | 'sunhat' | 'band';
/** `coat` is the only one that changes the silhouette below the waist: it is
 *  fastened at the front and falls past the hip. On a 16-wide character that
 *  outline is the whole vocabulary available for "expensive" and for "uniform",
 *  which is why it exists at all. */
export type JacketStyle = 'open' | 'hoodie' | 'vest' | 'coat';
export type GlassesStyle = 'round' | 'square' | 'shades';

export interface CharPalette {
  skin: string;
  skinShade: string;
  hair: string;
  hairShade: string;
  top: string;
  topShade: string;
  legs: string;
  legsShade: string;
  shoes: string;
  outline: string;
  /** Optional hat/hood drawn over the hair. */
  hat?: string;
  hatShade?: string;
  /** Shape of that headwear. A hat colour with no style is a cap, as before. */
  hatStyle?: HatStyle;
  /** Optional pack on the back, visible facing up. */
  pack?: string;
  /** Iris colour. */
  eye?: string;
  /** Hair silhouette; short if unset, which is what every NPC had. */
  hairStyle?: HairStyle;
  /** Optional jacket worn over the top. */
  jacket?: string;
  jacketShade?: string;
  jacketStyle?: JacketStyle;
  /** Piping down the front of a coat. Defaults to a lit edge of the coat
   *  colour, so a coat is never a flat slab; set it to say something -- gold on
   *  a rich man, pale blue on an issued uniform, brass on a harbourmaster. */
  trim?: string;
  /** Organisation insignia: two authoring pixels on the chest, one on the back.
   *  Small, but it is the only thing that separates "people in the same coat"
   *  from "a staff". */
  badge?: string;
  /** Shoulder width and waist. `heavy` is NPC-only -- the creator offers the
   *  other two -- and exists so a dock crowd is not a village crowd repainted. */
  build?: 'broad' | 'slim' | 'heavy';
  /** Eyewear, drawn over the face. */
  glasses?: GlassesStyle;
}

export const DEFAULT_PALETTES: Record<string, CharPalette> = {
  player: {
    skin: '#e8b48c', skinShade: '#c08a63',
    hair: '#4a3320', hairShade: '#31210f',
    top: '#c8543f', topShade: '#8f3a2b',
    legs: '#3f5478', legsShade: '#2b3c58',
    shoes: '#2a2a30', outline: '#1a1a22',
    hat: '#e8e0d0', hatShade: '#b8b0a0',
    pack: '#6a5a3a',
  },
  rival: {
    skin: '#f0c49c', skinShade: '#c89a70',
    hair: '#c8a04a', hairShade: '#9a7830',
    top: '#3f7a5c', topShade: '#2b5640',
    legs: '#4a4a58', legsShade: '#33333f',
    shoes: '#2a2a30', outline: '#1a1a22',
    hairStyle: 'swept', eye: '#6aa87c',
  },
  professor: {
    skin: '#e0aa84', skinShade: '#b8825e',
    hair: '#9a9aa8', hairShade: '#70707e',
    top: '#e8e8ee', topShade: '#b8b8c4',
    legs: '#5a5a68', legsShade: '#40404c',
    shoes: '#3a3038', outline: '#1a1a22',
  },
  villager_m: {
    skin: '#d8a078', skinShade: '#b07850',
    hair: '#5a3a24', hairShade: '#3d2614',
    top: '#5a7ab0', topShade: '#3f5880',
    legs: '#6a5a48', legsShade: '#4a3e30',
    shoes: '#3a3038', outline: '#1a1a22',
  },
  villager_f: {
    skin: '#eabb95', skinShade: '#c0916b',
    hair: '#7a3a30', hairShade: '#552620',
    top: '#c88ab0', topShade: '#9a6484',
    legs: '#8a6a90', legsShade: '#654c6a',
    shoes: '#3a3038', outline: '#1a1a22',
    hairStyle: 'bob', build: 'slim',
  },
  /** Kin Clinic keeper. Red and white, and visible across a room. */
  healer: {
    skin: '#f0c9a4', skinShade: '#c99a72',
    hair: '#d07a96', hairShade: '#a1546e',
    top: '#eceef4', topShade: '#b9bcc8',
    legs: '#c8543f', legsShade: '#8f3a2b',
    shoes: '#eceef4', outline: '#1a1a22',
    hat: '#f6f7fa', hatShade: '#c6c9d4', hatStyle: 'band',
    hairStyle: 'bun', eye: '#5aa85e', build: 'slim',
  },
  /** Provisioner. Blue, with the apron every shop counter in the region wears. */
  clerk: {
    skin: '#e8b48c', skinShade: '#c08a63',
    hair: '#3d2a1c', hairShade: '#241710',
    top: '#3a6ea8', topShade: '#284d78',
    legs: '#2c3a5c', legsShade: '#1d2740',
    shoes: '#2a2a30', outline: '#1a1a22',
    hat: '#3a6ea8', hatShade: '#284d78', hatStyle: 'cap',
    jacket: '#eceef4', jacketShade: '#b9bcc8', jacketStyle: 'vest',
    eye: '#6a4428',
  },
  kid: {
    skin: '#f0c9a4', skinShade: '#c99a72',
    hair: '#c06030', hairShade: '#8c401e',
    top: '#d8a03c', topShade: '#a3742a',
    legs: '#5a6440', legsShade: '#3e462b',
    shoes: '#9a3a34', outline: '#1a1a22',
    hairStyle: 'spiky', eye: '#a07a3c',
  },
  elder: {
    skin: '#e0c0a0', skinShade: '#b89578',
    hair: '#e6e2d6', hairShade: '#b4b0a4',
    top: '#7a4a86', topShade: '#54305e',
    legs: '#4a4a58', legsShade: '#33333f',
    shoes: '#4d3627', outline: '#1a1a22',
    hairStyle: 'bun', eye: '#6f7f96', build: 'slim',
  },
  fisher: {
    skin: '#c08658', skinShade: '#94603a',
    hair: '#26222c', hairShade: '#141119',
    top: '#3f8a90', topShade: '#2a6066',
    legs: '#9a8a5e', legsShade: '#6f6342',
    shoes: '#4d3627', outline: '#1a1a22',
    hat: '#e0cf9c', hatShade: '#b0a074', hatStyle: 'sunhat',
    eye: '#5f9fd8',
  },
  sailor: {
    skin: '#d8a078', skinShade: '#b07850',
    hair: '#5a3a24', hairShade: '#3d2614',
    top: '#eceef4', topShade: '#b9bcc8',
    legs: '#2c3a5c', legsShade: '#1d2740',
    shoes: '#2a2a30', outline: '#1a1a22',
    hat: '#eceef4', hatShade: '#b9bcc8', hatStyle: 'beanie',
    pack: '#6a5040', eye: '#6f7f96',
  },
  hiker: {
    skin: '#d09068', skinShade: '#a86c48',
    hair: '#3a2a1a', hairShade: '#241a10',
    top: '#c08a3a', topShade: '#8f6528',
    legs: '#4a5a3a', legsShade: '#344028',
    shoes: '#3a3038', outline: '#1a1a22',
    pack: '#8a4a30',
  },
  concord: {
    skin: '#e0b48c', skinShade: '#b88a64',
    hair: '#2a2a34', hairShade: '#1a1a22',
    top: '#3a5a7a', topShade: '#284058',
    legs: '#2f3f52', legsShade: '#1f2b38',
    shoes: '#20242c', outline: '#12141a',
    hat: '#d8dde4', hatShade: '#a8b0ba',
  },

  /* ------------------------------------------------------- the Meridian look
   *
   * One family, four jobs. Slate-blue over navy, a pale cap, a brass badge and
   * a harder outline than the rest of the cast (#12141a, inherited from the
   * office staff above) -- so that when three of them come out of the dark at
   * the harbour the player recognises the coat before anyone says a word. That
   * recognition is the entire point of the night attempt; if agents were a new
   * look it would land as a random mugging.
   */

  /** Field agent. The default Meridian body. */
  meridian: {
    skin: '#e0b48c', skinShade: '#b88a64',
    hair: '#2a2a34', hairShade: '#1a1a22',
    top: '#3a5a7a', topShade: '#284058',
    legs: '#2f3f52', legsShade: '#1f2b38',
    shoes: '#20242c', outline: '#12141a',
    // Steel blue rather than the office's near-white: at 1x a pale cap on a
    // pale face is read as grey hair, and an agent who looks sixty is not the
    // person you want walking out of the dark at the end of the act.
    hat: '#7d97ad', hatShade: '#4c6478', hatStyle: 'cap',
    jacket: '#2f4a66', jacketShade: '#1e3245', jacketStyle: 'coat',
    trim: '#8fb4cc', badge: '#d8c47a', eye: '#6f7f96',
  },
  /** The one who does the talking, and the one at the front on the night. Same
   *  cut, darker cloth, a cap that does not catch a lamp. */
  meridian_lead: {
    skin: '#d8a078', skinShade: '#b07850',
    hair: '#3a3644', hairShade: '#221f2a',
    top: '#2c4258', topShade: '#1d2c3b',
    legs: '#262f3c', legsShade: '#181e27',
    shoes: '#1b1e24', outline: '#12141a',
    hat: '#3a4a5c', hatShade: '#26313d', hatStyle: 'cap',
    jacket: '#1f3040', jacketShade: '#131e29', jacketStyle: 'coat',
    trim: '#6f93ab', badge: '#c8a44a', eye: '#8aa0b4', build: 'heavy',
  },
  /** Researcher. The white coat over the blue shirt is the Foundation's public
   *  face: most of these people really are doing weather science. */
  meridian_sci: {
    skin: '#f0c9a4', skinShade: '#c99a72',
    hair: '#5a3a24', hairShade: '#3d2614',
    top: '#3a5a7a', topShade: '#284058',
    legs: '#2f3f52', legsShade: '#1f2b38',
    shoes: '#2a2a30', outline: '#12141a',
    jacket: '#e6e9f0', jacketShade: '#b6bac6', jacketStyle: 'coat',
    trim: '#7fa6c0', badge: '#d8c47a', eye: '#6a4428', glasses: 'square',
  },
  meridian_sci_f: {
    skin: '#c08658', skinShade: '#94603a',
    hair: '#26222c', hairShade: '#141119',
    top: '#3a5a7a', topShade: '#284058',
    legs: '#2f3f52', legsShade: '#1f2b38',
    shoes: '#2a2a30', outline: '#12141a',
    jacket: '#e6e9f0', jacketShade: '#b6bac6', jacketStyle: 'coat',
    trim: '#7fa6c0', badge: '#d8c47a',
    hairStyle: 'bun', eye: '#5aa85e', build: 'slim',
  },
  /** Hired hand hauling crates up the ridge. Work clothes, a Meridian jacket
   *  and no badge: the recruiting card in Stonewake promised board, lodging and
   *  a coat, and six of the nine names on it were quarry names. This is what
   *  that sign looks like from the road. */
  porter: {
    skin: '#c08658', skinShade: '#94603a',
    hair: '#5a3a24', hairShade: '#3d2614',
    top: '#9a8a5e', topShade: '#6f6342',
    legs: '#6a5040', legsShade: '#48362a',
    shoes: '#4d3627', outline: '#12141a',
    hat: '#9a3a34', hatShade: '#6d2925', hatStyle: 'bandana',
    jacket: '#2f4a66', jacketShade: '#1e3245', jacketStyle: 'open',
    pack: '#8a4a30', eye: '#a07a3c',
  },

  /* ------------------------------------------------------------- Tideglass */

  /** Dockhand. The only heavy build in the game, and the reason it exists: a
   *  harbour crowd has to be built differently from a village crowd or the
   *  city is just Briarbell with more roofs. */
  dockhand: {
    skin: '#9a6440', skinShade: '#71462a',
    hair: '#26222c', hairShade: '#141119',
    top: '#b8563c', topShade: '#83382a',
    legs: '#4a4a58', legsShade: '#33333f',
    shoes: '#4d3627', outline: '#1a1a22',
    hat: '#8a7f62', hatShade: '#5f5744', hatStyle: 'cap',
    pack: '#8a7a58', eye: '#6a4428', build: 'heavy',
  },
  /** Net-mender on the quay. Oilskin over sand, and a scarf against the wind
   *  off the water. */
  netmender: {
    skin: '#d8a274', skinShade: '#a97a50',
    hair: '#3d2a1c', hairShade: '#241710',
    top: '#e0cf9c', topShade: '#b0a074',
    legs: '#6a5040', legsShade: '#48362a',
    shoes: '#4d3627', outline: '#1a1a22',
    hat: '#3f8a90', hatShade: '#2a6066', hatStyle: 'bandana',
    jacket: '#2f5a62', jacketShade: '#1f3e44', jacketStyle: 'vest',
    hairStyle: 'bun', eye: '#5aa85e', build: 'slim',
  },
  /** Harbourmaster. Brass and navy: the coat says authority without saying
   *  Meridian, which matters in a city where both are on the same quay. */
  harbourmaster: {
    skin: '#e0c0a0', skinShade: '#b89578',
    hair: '#e6e2d6', hairShade: '#b4b0a4',
    top: '#eceef4', topShade: '#b9bcc8',
    // Duck trousers under the navy: the first version was navy coat over navy
    // legs over black shoes and at 1x it was a navy blob with a face.
    legs: '#d3ccb8', legsShade: '#a29c8c',
    shoes: '#3a2f28', outline: '#1a1a22',
    hat: '#22304a', hatShade: '#151f30', hatStyle: 'cap',
    jacket: '#22304a', jacketShade: '#151f30', jacketStyle: 'coat',
    trim: '#d8b05a', eye: '#6f7f96',
  },

  /* Two more bodies for the crowd, using the two hair silhouettes no NPC has
   * ever used -- curls and long -- because in a city of thirty thousand the
   * thing that betrays a small cast is not colour, it is everybody having the
   * same outline. Deeper skin tones than the shipped roster, for the same
   * reason. */
  townsfolk_m: {
    // Deep skin under black curls was one dark mass with eyes in it; the curl
    // silhouette is bulky and needs the hair to be the lighter of the two.
    skin: '#9a6440', skinShade: '#71462a',
    hair: '#8e8e9c', hairShade: '#65656f',
    top: '#7ab0dc', topShade: '#5482a8',
    legs: '#9a8a5e', legsShade: '#6f6342',
    shoes: '#4d3627', outline: '#1a1a22',
    hairStyle: 'curls', eye: '#6a4428',
  },
  townsfolk_f: {
    skin: '#f6d9c0', skinShade: '#d0a888',
    hair: '#c8a04a', hairShade: '#9a7830',
    top: '#e08060', topShade: '#a85840',
    legs: '#4a4a58', legsShade: '#33333f',
    shoes: '#3a3038', outline: '#1a1a22',
    hairStyle: 'long', eye: '#5aa85e', build: 'slim',
  },
  /** Harbour trade. The only gold-rimmed glasses in the game, and an apron
   *  vest: comfortable, but nowhere near Veyl. */
  merchant: {
    skin: '#d8a274', skinShade: '#a97a50',
    hair: '#7a3a26', hairShade: '#542517',
    top: '#e8e8ee', topShade: '#b4b4c0',
    legs: '#48362a', legsShade: '#31241c',
    shoes: '#4d3627', outline: '#1a1a22',
    jacket: '#d8a03c', jacketShade: '#a3742a', jacketStyle: 'vest',
    glasses: 'round', eye: '#a07a3c',
  },

  /* ------------------------------------------------------------ the Veyls */

  /**
   * Dr. Cassian Veyl.
   *
   * The brief is a constraint before it is a design: the player must not be
   * able to tell he is the villain by looking at him. So nothing here is a
   * villain cue. No black, no shades, no cap shadowing the face, no hard
   * outline -- he takes the soft #1a1a22 the villagers wear, not the Meridian
   * #12141a, and his face is left completely unobstructed.
   *
   * He is also deliberately NOT in Meridian blue. The first pass put him in a
   * deep navy greatcoat and at 1x he was an agent who had lost his cap, which
   * gives the whole game away in the wrong direction: the player is supposed
   * to meet a public figure, not spot the boss. Wine and gold instead -- warm,
   * unique in the cast, and expensive without being sinister. He is the only
   * person in the region in a fastened greatcoat with gold piping over an
   * ivory shirt, and the collar is open at the throat.
   */
  veyl: {
    skin: '#e8b48c', skinShade: '#c08a63',
    hair: '#6e6a76', hairShade: '#474450',
    top: '#efe7d4', topShade: '#c0b8a2',
    legs: '#48414a', legsShade: '#312c33',
    shoes: '#4d3627', outline: '#1a1a22',
    jacket: '#5e3742', jacketShade: '#3b2028', jacketStyle: 'coat',
    trim: '#d8b768', hairStyle: 'swept', eye: '#6f7f96',
  },
  /**
   * Lyra Veyl.
   *
   * Deliberately not an agent: no cap, no badge, no coat, the soft outline.
   * The first pass gave her a teal field jacket and at 1x she was a small
   * agent, which is the one thing she must never be -- the night attempt only
   * works if the player never suspected her.
   *
   * So she is the pale one. An oat jacket over a teal blouse reads light and
   * warm at a tile's distance where every Meridian body reads dark, the
   * ponytail and slim build keep her silhouette her own, and the satchel is a
   * student's rather than a Foundation case. The one thing she shares with her
   * father is the slate eye colour, for the player who works it out early.
   */
  lyra: {
    skin: '#f0c9a4', skinShade: '#c99a72',
    hair: '#3a3644', hairShade: '#221f2a',
    top: '#3f8a90', topShade: '#2a6066',
    legs: '#3f5478', legsShade: '#2b3c58',
    shoes: '#4d3627', outline: '#1a1a22',
    jacket: '#cbb388', jacketShade: '#9a8560', jacketStyle: 'open',
    pack: '#6a5a3a', hairStyle: 'ponytail', eye: '#6f7f96', build: 'slim',
  },
};

type Ctx = CanvasRenderingContext2D;

/** Vertical landmarks, chosen once so every facing lines up exactly. */
const CX = 16;
const HEAD_TOP = 4;
const HEAD_BOT = 22;
const SHOULDER = 23;
const HIP = 36;
const FOOT = 46;

/**
 * The sheet is laid out as 4 rows (facings) x 3 columns (walk cycle), so a
 * caller just needs frame = cycle[step] and row = dirIndex.
 */
export class CharSheet {
  readonly canvas: HTMLCanvasElement;
  static readonly FRAMES = 4;
  /** Walk cycle order: stand, step A, stand, step B. */
  static readonly CYCLE = [0, 1, 0, 2];

  constructor(private pal: CharPalette) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = CHAR_W * 3;
    this.canvas.height = CHAR_H * 4;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('charsprite: no 2d context');
    ctx.imageSmoothingEnabled = false;

    // Frames are composed in a scratch buffer so the outline pass has a clean
    // silhouette to work from rather than the whole sheet.
    const tmp = document.createElement('canvas');
    tmp.width = CHAR_W;
    tmp.height = CHAR_H;
    const tctx = tmp.getContext('2d');
    if (!tctx) throw new Error('charsprite: no scratch context');
    tctx.imageSmoothingEnabled = false;

    DIRS.forEach((dir, row) => {
      for (let frame = 0; frame < 3; frame++) {
        tctx.clearRect(0, 0, CHAR_W, CHAR_H);
        this.draw(tctx, dir, frame);
        this.outline(tctx);
        ctx.drawImage(tmp, frame * CHAR_W, row * CHAR_H);
      }
    });
  }

  /** Source rect for a facing and animation step. */
  src(dir: CharDir, step: number): { x: number; y: number; w: number; h: number; flip: boolean } {
    // Right is the left sheet mirrored: half the pixels, and it guarantees the
    // two profiles stay identical.
    const flip = dir === 'right';
    const row = DIRS.indexOf(flip ? 'left' : dir);
    const frame = CharSheet.CYCLE[step % CharSheet.CYCLE.length]!;
    return { x: frame * CHAR_W, y: row * CHAR_H, w: CHAR_W, h: CHAR_H, flip };
  }

  /** Expand the silhouette by one pixel in the outline colour. */
  private outline(ctx: Ctx): void {
    const img = ctx.getImageData(0, 0, CHAR_W, CHAR_H);
    const d = img.data;
    const solid = (x: number, y: number): boolean =>
      x >= 0 && y >= 0 && x < CHAR_W && y < CHAR_H && d[(y * CHAR_W + x) * 4 + 3]! > 0;

    const [r, g, b] = hexRgb(this.pal.outline);
    // Walked a block at a time, so the border is one authoring pixel thick
    // rather than a hairline round a chunky silhouette.
    const edges: number[] = [];
    for (let y = 0; y < CHAR_H; y += DETAIL) {
      for (let x = 0; x < CHAR_W; x += DETAIL) {
        if (solid(x, y)) continue;
        const near = solid(x - DETAIL, y) || solid(x + DETAIL, y)
          || solid(x, y - DETAIL) || solid(x, y + DETAIL)
          || solid(x - DETAIL, y - DETAIL) || solid(x + DETAIL, y - DETAIL)
          || solid(x - DETAIL, y + DETAIL) || solid(x + DETAIL, y + DETAIL);
        if (!near) continue;
        for (let dy = 0; dy < DETAIL; dy++) {
          for (let dx = 0; dx < DETAIL; dx++) edges.push(((y + dy) * CHAR_W + (x + dx)) * 4);
        }
      }
    }
    for (const i of edges) {
      d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }

  /**
   * One frame, drawn on the 16x24 authoring grid.
   *
   * Every coordinate here is an authoring pixel, not a buffer pixel: `set`
   * paints a 2x2 block. That is the whole reason this reads as pixel art --
   * the proportions are the era's too, with a head nearly half the height of
   * the character, two-pixel eyes and a four-frame walk that actually swaps
   * the legs over rather than jiggling them.
   *
   * Vertical layout, in units:
   *   1..4   hair crown        11..16  torso
   *   5..10  face              17..20  legs
   *                            21..22  feet   (23 is left for the outline)
   */
  private draw(ctx: Ctx, dir: CharDir, frame: number): void {
    const p = this.pal;
    const U = DETAIL;

    const set = (x: number, y: number, c: string) => {
      if (x < 0 || y < 0 || x >= CHAR_LW || y >= CHAR_LH) return;
      ctx.fillStyle = c;
      ctx.fillRect(x * U, y * U, U, U);
    };
    const box = (x0: number, y0: number, x1: number, y1: number, c: string) => {
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c);
    };
    const wipe = (x0: number, y0: number, x1: number, y1: number) => {
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) ctx.clearRect(x * U, y * U, U, U);
      }
    };

    const profile = dir === 'left' || dir === 'right';
    const slim = p.build === 'slim';
    const heavy = p.build === 'heavy';
    const style: HairStyle = p.hairStyle ?? 'short';
    const eye = p.eye ?? '#5f9fd8';
    const jacket = p.jacket;
    const jacketShade = p.jacketShade ?? (jacket ? darken(jacket, 0.28) : undefined);
    const jacketStyle: JacketStyle = p.jacketStyle ?? 'open';
    const sleeve = jacket && jacketStyle !== 'vest' ? jacket : p.top;
    const sleeveShade = jacket && jacketStyle !== 'vest' ? jacketShade! : p.topShade;

    /* Walk cycle. Frame 0 stands; 1 and 2 are the two contact poses, and the
       whole upper body lifts a pixel on both -- which is most of what makes a
       four-frame walk read as walking. */
    const stepDir = frame === 0 ? 0 : frame === 1 ? 1 : -1;
    const bob = frame === 0 ? 0 : -1;

    const HEAD_L = 4, HEAD_R = 11;
    // The legs stay where they are for every build; only the shoulders move.
    // A dockhand is a wide chest on ordinary legs, which is what bulk looks
    // like at this size -- widening the legs too just makes a rectangle.
    const bodyL = slim ? 5 : heavy ? 3 : 4;
    const bodyR = slim ? 10 : heavy ? 12 : 11;
    const TORSO_Y = 11 + bob;
    const HIP_Y = 16 + bob;

    /* ------------------------------------------------------------- legs */
    const legColour = (back: boolean) => (back ? p.legsShade : p.legs);

    if (profile) {
      // Scissoring: one leg forward, one trailing, both planted at the ankle.
      const lead = stepDir * 2;
      const trail = -stepDir * 2;
      box(6 + trail, 17, 8 + trail, 20, p.legsShade);
      box(5 + trail, 21, 8 + trail, 22, darken(p.shoes, 0.2));
      box(6 + lead, 17, 8 + lead, 20, p.legs);
      box(6 + lead, 20, 8 + lead, 20, p.legsShade);
      box(5 + lead, 21, 8 + lead, 22, p.shoes);
      box(5 + lead, 21, 8 + lead, 21, lighten(p.shoes, 0.28));
    } else {
      // Front and back read the stride as one foot lifted clear of the ground.
      const liftL = stepDir > 0 ? 1 : 0;
      const liftR = stepDir < 0 ? 1 : 0;
      box(5, 17, 7, 20 - liftL, legColour(dir === 'up'));
      box(8, 17, 10, 20 - liftR, legColour(dir !== 'up'));
      box(5, 20 - liftL, 7, 20 - liftL, p.legsShade);
      box(8, 20 - liftR, 10, 20 - liftR, p.legsShade);
      box(4, 21 - liftL, 7, 22 - liftL, p.shoes);
      box(8, 21 - liftR, 11, 22 - liftR, darken(p.shoes, 0.18));
      // A lit top edge on each shoe, or the feet merge into the trousers.
      box(4, 21 - liftL, 7, 21 - liftL, lighten(p.shoes, 0.28));
      box(8, 21 - liftR, 11, 21 - liftR, lighten(p.shoes, 0.16));
      // A seam between the legs, so they are two rather than one slab.
      box(7, 17, 7, 20 - Math.max(liftL, liftR), darken(p.legsShade, 0.25));
    }

    /* ------------------------------------------------------------ torso */
    box(bodyL, TORSO_Y, bodyR, HIP_Y, p.top);
    box(bodyL, TORSO_Y, bodyL + 1, HIP_Y, lighten(p.top, 0.14));
    box(bodyR - 1, TORSO_Y, bodyR, HIP_Y, p.topShade);
    box(bodyL, HIP_Y, bodyR, HIP_Y, p.topShade);
    // Rounded shoulders: a square torso reads as a box with a head on it.
    wipe(bodyL, TORSO_Y, bodyL, TORSO_Y);
    wipe(bodyR, TORSO_Y, bodyR, TORSO_Y);

    if (dir === 'down') {
      box(6, TORSO_Y, 9, TORSO_Y, lighten(p.top, 0.28));      // collar
      box(7, TORSO_Y + 1, 8, HIP_Y - 1, p.topShade);          // centre seam
      box(bodyL, HIP_Y - 1, bodyR, HIP_Y - 1, darken(p.legsShade, 0.1));
      box(7, HIP_Y - 1, 8, HIP_Y - 1, '#d8b05a');             // belt buckle
    } else if (dir === 'up') {
      box(bodyL, HIP_Y - 1, bodyR, HIP_Y - 1, darken(p.legsShade, 0.1));
    } else {
      box(bodyL, TORSO_Y, bodyL, TORSO_Y + 2, lighten(p.top, 0.22));
    }

    /* ----------------------------------------------------------- jacket */
    if (jacket) {
      const js = jacketShade!;
      const coat = jacketStyle === 'coat';
      if (dir === 'up') {
        box(bodyL, TORSO_Y, bodyR, HIP_Y, jacket);
        box(bodyR - 1, TORSO_Y, bodyR, HIP_Y, js);
        box(bodyL, HIP_Y, bodyR, HIP_Y, js);
        wipe(bodyL, TORSO_Y, bodyL, TORSO_Y);
        wipe(bodyR, TORSO_Y, bodyR, TORSO_Y);
      } else if (profile) {
        box(bodyL, TORSO_Y, bodyR - 1, HIP_Y, jacket);
        box(bodyL, TORSO_Y, bodyL, HIP_Y, lighten(jacket, 0.16));
        box(bodyR - 1, TORSO_Y, bodyR - 1, HIP_Y, js);
        wipe(bodyL, TORSO_Y, bodyL, TORSO_Y);
      } else if (coat) {
        // Fastened, with lapels and a closure down the middle. A closed front
        // is most of the difference between a coat somebody owns and a coat
        // somebody was issued.
        box(bodyL, TORSO_Y, bodyR, HIP_Y, jacket);
        box(bodyL, TORSO_Y + 1, bodyL, HIP_Y, lighten(jacket, 0.16));
        box(bodyR, TORSO_Y + 1, bodyR, HIP_Y, js);
        box(bodyL + 2, TORSO_Y, bodyL + 2, TORSO_Y + 2, js);
        box(bodyR - 2, TORSO_Y, bodyR - 2, TORSO_Y + 2, js);
        box(7, TORSO_Y + 1, 7, HIP_Y, darken(js, 0.3));
        wipe(bodyL, TORSO_Y, bodyL, TORSO_Y);
        wipe(bodyR, TORSO_Y, bodyR, TORSO_Y);
        // The shirt still shows at the throat -- an open collar is what keeps
        // a dark coat from reading as a closed man.
        box(7, TORSO_Y, 8, TORSO_Y, lighten(p.top, 0.3));
        set(8, TORSO_Y + 1, p.top);
      } else {
        // Open at the front, with the shirt showing between the panels.
        box(bodyL, TORSO_Y, bodyL + 1, HIP_Y, jacket);
        box(bodyR - 1, TORSO_Y, bodyR, HIP_Y, jacket);
        box(bodyL, TORSO_Y + 1, bodyL, HIP_Y, lighten(jacket, 0.16));
        box(bodyR, TORSO_Y + 1, bodyR, HIP_Y, js);
        box(bodyL + 2, TORSO_Y, bodyL + 2, TORSO_Y + 1, js);
        box(bodyR - 2, TORSO_Y, bodyR - 2, TORSO_Y + 1, js);
        wipe(bodyL, TORSO_Y, bodyL, TORSO_Y);
        wipe(bodyR, TORSO_Y, bodyR, TORSO_Y);
      }
      if (jacketStyle === 'hoodie') {
        box(bodyL + 1, TORSO_Y - 1, bodyR - 1, TORSO_Y - 1, js);
        if (dir === 'up') box(bodyL + 1, TORSO_Y, bodyR - 1, TORSO_Y + 1, js);
      }

      /* ------------------------------------------------------------ skirt */
      // Two rows below the hip, flaring on the last one. It lifts with the
      // walk bob, which reads as the coat swinging, and it stops short of the
      // shins so the legs still visibly scissor -- a coat to the ankle would
      // have cost the whole walk cycle.
      if (coat) {
        const hem0 = HIP_Y + 1;
        const hem1 = HIP_Y + 2;
        const tr = p.trim ?? lighten(jacket, 0.24);
        if (profile) {
          box(bodyL - 1, hem0, bodyR, hem1, jacket);
          box(bodyL - 1, hem0, bodyL - 1, hem1, lighten(jacket, 0.14));
          box(bodyR - 1, hem0, bodyR, hem1, js);
          box(bodyL - 1, hem1, bodyR, hem1, js);
          box(bodyL - 1, TORSO_Y + 1, bodyL - 1, HIP_Y - 1, tr);
        } else {
          box(bodyL, hem0, bodyR, hem0, jacket);
          box(bodyL - 1, hem1, bodyR + 1, hem1, dir === 'up' ? js : jacket);
          box(bodyL, hem0, bodyL, hem0, lighten(jacket, 0.14));
          box(bodyL - 1, hem1, bodyL - 1, hem1, lighten(jacket, 0.14));
          box(bodyR, hem0, bodyR, hem0, js);
          box(bodyR, hem1, bodyR + 1, hem1, js);
          box(7, hem0, 7, hem1, darken(js, 0.35));      // the vent
          if (dir === 'down') {
            box(8, TORSO_Y + 1, 8, HIP_Y, tr);
            set(bodyL + 2, TORSO_Y, tr);
            set(bodyR - 2, TORSO_Y, tr);
          } else {
            box(bodyL + 1, TORSO_Y + 1, bodyR - 1, TORSO_Y + 1, tr);
          }
        }
      }
    }

    /* ------------------------------------------------------------- badge */
    if (p.badge) {
      const pin = darken(p.badge, 0.45);
      const by = TORSO_Y + 1;
      if (dir === 'down') {
        box(bodyR - 2, by, bodyR - 1, by, p.badge);
        set(bodyR - 1, by + 1, pin);
      } else if (profile) {
        box(bodyL + 1, by, bodyL + 2, by, p.badge);
        set(bodyL + 2, by + 1, pin);
      } else {
        box(bodyL + 1, TORSO_Y, bodyL + 2, TORSO_Y, p.badge);
      }
    }

    /* ------------------------------------------------------------- arms */
    const swing = -stepDir;
    if (profile) {
      const ay = TORSO_Y + 1 + Math.max(0, swing);
      // Sits just outside the torso, so a heavy build does not swallow its own
      // arm. For the two shipped builds this is the 3 it always was.
      const ax = Math.min(3, bodyL - 1);
      box(ax, ay, ax + 1, ay + 3, sleeveShade);
      box(ax, ay + 4, ax + 1, ay + 4, p.skin);
    } else {
      const lY = TORSO_Y + 1 - Math.max(0, swing);
      const rY = TORSO_Y + 1 + Math.max(0, -swing);
      box(bodyL - 2, lY, bodyL - 1, lY + 3, lighten(sleeve, 0.08));
      box(bodyR + 1, rY, bodyR + 2, rY + 3, sleeveShade);
      box(bodyL - 2, lY + 4, bodyL - 1, lY + 4, p.skin);
      box(bodyR + 1, rY + 4, bodyR + 2, rY + 4, p.skinShade);
    }

    /* ------------------------------------------------------------- head */
    const FACE_Y0 = 5 + bob;
    const FACE_Y1 = 10 + bob;
    box(HEAD_L, FACE_Y0, HEAD_R, FACE_Y1, p.skin);
    box(HEAD_L, FACE_Y1, HEAD_R, FACE_Y1, p.skinShade);
    // Corners knocked off, top and bottom, so the head is a head.
    wipe(HEAD_L, FACE_Y0, HEAD_L, FACE_Y0);
    wipe(HEAD_R, FACE_Y0, HEAD_R, FACE_Y0);
    wipe(HEAD_L, FACE_Y1, HEAD_L, FACE_Y1);
    wipe(HEAD_R, FACE_Y1, HEAD_R, FACE_Y1);
    // Neck.
    box(6, FACE_Y1, 9, TORSO_Y - 1, p.skinShade);

    /* ------------------------------------------------------------- hair */
    const HAIR_Y0 = 1 + bob;
    /** @param sideTo how far down the side of the face the hair reaches. */
    const crown = (sideTo = FACE_Y0, top = HAIR_Y0) => {
      box(HEAD_L, top + 1, HEAD_R, FACE_Y0 + 1, p.hair);
      box(HEAD_L + 1, top, HEAD_R - 1, top, p.hair);
      box(HEAD_L - 1, top + 2, HEAD_L - 1, sideTo, p.hair);
      box(HEAD_R + 1, top + 2, HEAD_R + 1, sideTo, p.hair);
      // A lit patch up on the left, which is where the light is in every other
      // sprite in the game.
      box(HEAD_L + 1, top + 1, HEAD_L + 2, top + 2, lighten(p.hair, 0.22));
    };
    const fringe = () => {
      box(HEAD_L, FACE_Y0 + 1, HEAD_R, FACE_Y0 + 1, p.hairShade);
      set(HEAD_L + 2, FACE_Y0 + 2, p.hairShade);
    };
    /** Hair hanging past the jaw; in profile only down the back of the head. */
    const sides = (to: number) => {
      if (!profile) {
        box(HEAD_L - 1, FACE_Y0 + 1, HEAD_L, to, p.hairShade);
        box(HEAD_R, FACE_Y0 + 1, HEAD_R + 1, to, p.hairShade);
      } else {
        box(HEAD_R, FACE_Y0 + 1, HEAD_R + 1, to, p.hairShade);
      }
    };

    if (dir === 'up') {
      box(HEAD_L, HAIR_Y0 + 1, HEAD_R, FACE_Y1, p.hair);
      box(HEAD_L + 1, HAIR_Y0, HEAD_R - 1, HAIR_Y0, p.hair);
      box(HEAD_L - 1, HAIR_Y0 + 2, HEAD_L - 1, FACE_Y1 - 1, p.hair);
      box(HEAD_R + 1, HAIR_Y0 + 2, HEAD_R + 1, FACE_Y1 - 1, p.hair);
      box(HEAD_L, FACE_Y1 - 1, HEAD_R, FACE_Y1, p.hairShade);
      box(HEAD_L + 1, HAIR_Y0 + 1, HEAD_L + 2, HAIR_Y0 + 2, lighten(p.hair, 0.2));
    } else {
      // Long styles keep their length; the short ones stop at the ear.
      const longish = style === 'bob' || style === 'long' || style === 'curls'
        || style === 'ponytail';
      crown(longish ? FACE_Y0 + 2 : FACE_Y0);
      fringe();
      if (profile) box(HEAD_R + 1, FACE_Y0 + 1, HEAD_R + 1, FACE_Y0 + 3, p.hairShade);
    }

    switch (style) {
      case 'swept':
        if (dir !== 'up') {
          box(HEAD_L, FACE_Y0 + 1, HEAD_L + 4, FACE_Y0 + 1, p.hair);
          box(HEAD_L, FACE_Y0 + 2, HEAD_L + 1, FACE_Y0 + 2, p.hair);
          set(HEAD_L + 2, FACE_Y0 + 2, lighten(p.hair, 0.2));
        }
        break;

      case 'spiky':
        for (let i = 0; i < 4; i++) {
          const sx = HEAD_L + 1 + i * 2;
          set(sx, HAIR_Y0 - 1, p.hair);
          set(sx, HAIR_Y0, p.hair);
        }
        set(HEAD_L, HAIR_Y0, p.hairShade);
        set(HEAD_R, HAIR_Y0, p.hairShade);
        break;

      case 'bob':
        sides(FACE_Y1);
        if (dir === 'up') box(HEAD_L - 1, FACE_Y1, HEAD_R + 1, FACE_Y1, p.hairShade);
        break;

      case 'long':
        sides(HIP_Y - 2);
        if (dir === 'up') {
          box(HEAD_L, FACE_Y1, HEAD_R, HIP_Y - 2, p.hair);
          box(HEAD_R - 1, FACE_Y1, HEAD_R, HIP_Y - 2, p.hairShade);
          box(HEAD_L, HIP_Y - 2, HEAD_R, HIP_Y - 2, p.hairShade);
        }
        break;

      case 'ponytail':
        if (dir === 'up') {
          box(7, FACE_Y1, 8, HIP_Y - 3, p.hair);
          set(8, FACE_Y1, p.hairShade);
          box(6, FACE_Y1 - 1, 9, FACE_Y1 - 1, darken(p.hair, 0.3));
        } else if (profile) {
          box(HEAD_R + 1, FACE_Y0, HEAD_R + 2, FACE_Y0 + 3, p.hair);
          box(HEAD_R + 2, FACE_Y0 + 3, HEAD_R + 2, FACE_Y0 + 5, p.hairShade);
          box(HEAD_R, FACE_Y0 - 1, HEAD_R + 1, FACE_Y0 - 1, darken(p.hair, 0.3));
        } else {
          box(HEAD_L - 1, FACE_Y0, HEAD_L - 1, FACE_Y0 + 2, p.hairShade);
          box(HEAD_R + 1, FACE_Y0, HEAD_R + 1, FACE_Y0 + 2, p.hairShade);
        }
        break;

      case 'bun':
        if (dir === 'up') {
          box(6, HAIR_Y0 + 1, 9, HAIR_Y0 + 3, p.hair);
          box(6, HAIR_Y0 + 1, 7, HAIR_Y0 + 1, lighten(p.hair, 0.22));
        } else {
          box(6, HAIR_Y0 - 1, 9, HAIR_Y0 + 1, p.hair);
          box(6, HAIR_Y0 - 1, 7, HAIR_Y0 - 1, lighten(p.hair, 0.22));
          box(6, HAIR_Y0 + 1, 9, HAIR_Y0 + 1, p.hairShade);
        }
        break;

      case 'curls':
        box(HEAD_L - 1, HAIR_Y0, HEAD_R + 1, HAIR_Y0 + 1, p.hair);
        for (let x = HEAD_L - 1; x <= HEAD_R + 1; x += 2) set(x, HAIR_Y0 - 1, p.hair);
        for (let x = HEAD_L; x <= HEAD_R; x += 2) set(x, HAIR_Y0, p.hairShade);
        sides(FACE_Y0 + 4);
        break;

      default:
        break;
    }

    /* -------------------------------------------------------------- hat */
    if (p.hat) {
      const hatShade = p.hatShade ?? darken(p.hat, 0.24);
      const shape: HatStyle = p.hatStyle ?? 'cap';
      const brow = FACE_Y0 + 1;

      if (shape === 'band' || shape === 'bandana') {
        const y = shape === 'band' ? FACE_Y0 : FACE_Y0 + 1;
        box(HEAD_L - 1, y, HEAD_R + 1, y, p.hat);
        if (shape === 'bandana') {
          box(HEAD_L - 1, y - 1, HEAD_R + 1, y - 1, p.hat);
          box(HEAD_L - 1, y, HEAD_R + 1, y, hatShade);
          box(HEAD_L - 2, y, HEAD_L - 1, y + 1, hatShade);
        }
      } else {
        const top = shape === 'beanie' ? HAIR_Y0 - 1 : HAIR_Y0;
        box(HEAD_L, top + 1, HEAD_R, brow - 1, p.hat);
        box(HEAD_L + 1, top, HEAD_R - 1, top, p.hat);
        box(HEAD_L - 1, top + 2, HEAD_L - 1, brow - 1, p.hat);
        box(HEAD_R + 1, top + 2, HEAD_R + 1, brow - 1, hatShade);
        box(HEAD_L + 1, top + 1, HEAD_L + 2, top + 1, lighten(p.hat, 0.22));

        if (shape === 'beanie') {
          box(HEAD_L - 1, brow - 1, HEAD_R + 1, brow - 1, lighten(p.hat, 0.12));
          box(HEAD_L - 1, brow, HEAD_R + 1, brow, hatShade);
          box(7, top - 1, 8, top - 1, lighten(p.hat, 0.3));
        } else if (shape === 'sunhat') {
          box(HEAD_L - 3, brow - 1, HEAD_R + 3, brow - 1, p.hat);
          box(HEAD_L - 3, brow, HEAD_R + 3, brow, hatShade);
        } else {
          box(HEAD_L - 1, brow - 1, HEAD_R + 1, brow - 1, darken(hatShade, 0.2));
          if (dir === 'down') {
            box(HEAD_L - 1, brow, HEAD_R + 1, brow, hatShade);
          } else if (profile) {
            box(HEAD_L - 3, brow - 1, HEAD_L + 2, brow - 1, hatShade);
            box(HEAD_L - 3, brow, HEAD_L + 2, brow, darken(hatShade, 0.25));
          } else {
            box(HEAD_L, brow, HEAD_R, brow, hatShade);
          }
        }
      }
    }

    /* ------------------------------------------------------------- face */
    if (dir === 'down') {
      const eyeY = FACE_Y0 + 2;
      box(5, eyeY - 1, 6, eyeY - 1, p.hairShade);      // brows
      box(9, eyeY - 1, 10, eyeY - 1, p.hairShade);
      box(5, eyeY, 6, eyeY + 1, '#f8f4ec');            // whites
      box(9, eyeY, 10, eyeY + 1, '#f8f4ec');
      box(5, eyeY + 1, 6, eyeY + 1, eye);              // iris
      box(9, eyeY + 1, 10, eyeY + 1, eye);
      set(6, eyeY + 1, darken(eye, 0.5));              // pupil
      set(9, eyeY + 1, darken(eye, 0.5));
      set(7, eyeY + 2, p.skinShade);                   // nose
      box(7, FACE_Y1 - 1, 8, FACE_Y1 - 1, darken(p.skinShade, 0.25));
    } else if (profile) {
      const eyeY = FACE_Y0 + 2;
      box(5, eyeY - 1, 6, eyeY - 1, p.hairShade);
      box(5, eyeY, 6, eyeY + 1, '#f8f4ec');
      box(5, eyeY + 1, 6, eyeY + 1, eye);
      set(5, eyeY + 1, darken(eye, 0.5));
      set(HEAD_L - 1, eyeY + 1, p.skin);               // nose on the leading edge
      set(HEAD_L - 1, eyeY + 2, p.skinShade);
      box(5, FACE_Y1 - 1, 6, FACE_Y1 - 1, darken(p.skinShade, 0.25));
    }

    /* ---------------------------------------------------------- glasses */
    if (p.glasses && dir !== 'up') {
      const frameC = p.glasses === 'shades' ? '#22242c'
        : p.glasses === 'round' ? '#c8a44a' : '#3a3f4c';
      const lens = p.glasses === 'shades' ? '#161820' : null;
      const eyeY = FACE_Y0 + 2;
      if (dir === 'down') {
        for (const x0 of [4, 9]) {
          if (lens) box(x0 + 1, eyeY, x0 + 2, eyeY + 1, lens);
          box(x0, eyeY - 1, x0 + 3, eyeY - 1, frameC);
          box(x0, eyeY + 2, x0 + 3, eyeY + 2, frameC);
          box(x0, eyeY, x0, eyeY + 1, frameC);
          box(x0 + 3, eyeY, x0 + 3, eyeY + 1, frameC);
        }
        box(7, eyeY, 8, eyeY, frameC);
      } else {
        if (lens) box(5, eyeY, 6, eyeY + 1, lens);
        box(4, eyeY - 1, 7, eyeY - 1, frameC);
        box(4, eyeY + 2, 7, eyeY + 2, frameC);
        box(4, eyeY, 4, eyeY + 1, frameC);
        box(7, eyeY, 9, eyeY, frameC);
      }
    }

    /* ------------------------------------------------------------- pack */
    // Drawn last, over the jacket: a bag goes on top of the coat.
    if (p.pack) {
      const strap = darken(p.pack, 0.2);
      if (dir === 'up') {
        box(bodyL + 1, TORSO_Y + 1, bodyR - 1, HIP_Y - 1, p.pack);
        box(bodyL + 1, TORSO_Y + 1, bodyL + 1, HIP_Y - 1, lighten(p.pack, 0.18));
        box(bodyR - 1, TORSO_Y + 1, bodyR - 1, HIP_Y - 1, darken(p.pack, 0.18));
        box(bodyL + 1, HIP_Y - 1, bodyR - 1, HIP_Y - 1, darken(p.pack, 0.3));
        box(bodyL, TORSO_Y, bodyL, TORSO_Y + 1, strap);
        box(bodyR, TORSO_Y, bodyR, TORSO_Y + 1, strap);
      } else if (dir === 'down') {
        for (let i = 0; i < 4; i++) set(bodyL + 1 + i, TORSO_Y + 1 + i, strap);
      } else {
        box(bodyR - 1, TORSO_Y + 1, bodyR + 1, HIP_Y - 1, p.pack);
        box(bodyR + 1, TORSO_Y + 1, bodyR + 1, HIP_Y - 1, darken(p.pack, 0.2));
        box(bodyL, TORSO_Y + 1, bodyL, HIP_Y - 2, strap);
      }
    }
  }
}

/* ----------------------------------------------------------- colour bits */

function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function mix(hex: string, target: number, amount: number): string {
  const [r, g, b] = hexRgb(hex);
  const f = (v: number) => Math.round(v + (target - v) * amount).toString(16).padStart(2, '0');
  return `#${f(r)}${f(g)}${f(b)}`;
}

function lighten(hex: string, amount: number): string { return mix(hex, 255, amount); }
function darken(hex: string, amount: number): string { return mix(hex, 0, amount); }

/* ------------------------------------------------------------ appearance */

export interface Swatch { name: string; c: string; shade?: string }

/** Skin is two tones: everything else is derived from them. */
export const SKIN_TONES: Swatch[] = [
  { name: 'Porcelain', c: '#f6d9c0', shade: '#d0a888' },
  { name: 'Fair', c: '#f0c9a4', shade: '#c99a72' },
  { name: 'Warm', c: '#e8b48c', shade: '#c08a63' },
  { name: 'Olive', c: '#d8a274', shade: '#a97a50' },
  { name: 'Tan', c: '#c08658', shade: '#94603a' },
  { name: 'Umber', c: '#9a6440', shade: '#71462a' },
  { name: 'Deep', c: '#70452c', shade: '#4d2d1b' },
];

export const HAIR_COLOURS: Swatch[] = [
  { name: 'Black', c: '#26222c', shade: '#141119' },
  { name: 'Cocoa', c: '#3d2a1c', shade: '#241710' },
  { name: 'Brown', c: '#5a3a24', shade: '#3d2614' },
  { name: 'Auburn', c: '#7a3a26', shade: '#542517' },
  { name: 'Ginger', c: '#c06030', shade: '#8c401e' },
  { name: 'Honey', c: '#c8a04a', shade: '#9a7830' },
  { name: 'Blond', c: '#e8cc84', shade: '#b89a58' },
  { name: 'Silver', c: '#e6e2d6', shade: '#b4b0a4' },
  { name: 'Ash', c: '#8e8e9c', shade: '#65656f' },
  { name: 'Sea', c: '#3f8a90', shade: '#2a6066' },
  { name: 'Plum', c: '#7a4a86', shade: '#54305e' },
  { name: 'Rose', c: '#d07a96', shade: '#a1546e' },
];

export const EYE_COLOURS: Swatch[] = [
  { name: 'Slate', c: '#6f7f96' },
  { name: 'Blue', c: '#5f9fd8' },
  { name: 'Ice', c: '#9ad4e4' },
  { name: 'Green', c: '#5aa85e' },
  { name: 'Hazel', c: '#a07a3c' },
  { name: 'Amber', c: '#d08c30' },
  { name: 'Brown', c: '#6a4428' },
  { name: 'Violet', c: '#8a6ac0' },
];

/** Shirts, jackets and hats all pull from one set, so nothing clashes by
 *  accident and the creator only has to teach the player one row of swatches. */
export const CLOTH_COLOURS: Swatch[] = [
  { name: 'Ember', c: '#c8543f', shade: '#8f3a2b' },
  { name: 'Coral', c: '#e08060', shade: '#a85840' },
  { name: 'Amber', c: '#d8a03c', shade: '#a3742a' },
  { name: 'Sand', c: '#e0cf9c', shade: '#b0a074' },
  { name: 'Moss', c: '#6a8c46', shade: '#4a6430' },
  { name: 'Fern', c: '#3f7a5c', shade: '#2b5640' },
  { name: 'Teal', c: '#3f8a90', shade: '#2a6066' },
  { name: 'Sea', c: '#3a6ea8', shade: '#284d78' },
  { name: 'Sky', c: '#7ab0dc', shade: '#5482a8' },
  { name: 'Indigo', c: '#4a4a86', shade: '#33335e' },
  { name: 'Plum', c: '#7a4a86', shade: '#54305e' },
  { name: 'Rose', c: '#d07a96', shade: '#a1546e' },
  { name: 'Snow', c: '#e8e8ee', shade: '#b4b4c0' },
  { name: 'Coal', c: '#3a3a44', shade: '#26262e' },
];

export const TROUSER_COLOURS: Swatch[] = [
  { name: 'Denim', c: '#3f5478', shade: '#2b3c58' },
  { name: 'Navy', c: '#2c3a5c', shade: '#1d2740' },
  { name: 'Slate', c: '#4a4a58', shade: '#33333f' },
  { name: 'Khaki', c: '#9a8a5e', shade: '#6f6342' },
  { name: 'Olive', c: '#5a6440', shade: '#3e462b' },
  { name: 'Brown', c: '#6a5040', shade: '#48362a' },
  { name: 'Coal', c: '#35353e', shade: '#232329' },
  { name: 'Rust', c: '#8a4a34', shade: '#603022' },
];

export const SHOE_COLOURS: Swatch[] = [
  { name: 'Black', c: '#2a2a30' },
  { name: 'Brown', c: '#4d3627' },
  { name: 'Grey', c: '#5c5c66' },
  { name: 'Red', c: '#9a3a34' },
  { name: 'Cream', c: '#ddd6c4' },
  { name: 'Green', c: '#3c5a40' },
];

export const HAIR_STYLES: { name: string; style: HairStyle }[] = [
  { name: 'Short', style: 'short' },
  { name: 'Swept', style: 'swept' },
  { name: 'Spiky', style: 'spiky' },
  { name: 'Bob', style: 'bob' },
  { name: 'Long', style: 'long' },
  { name: 'Ponytail', style: 'ponytail' },
  { name: 'Bun', style: 'bun' },
  { name: 'Curls', style: 'curls' },
];

export const HAT_STYLES: { name: string; style: HatStyle | null }[] = [
  { name: 'None', style: null },
  { name: 'Cap', style: 'cap' },
  { name: 'Beanie', style: 'beanie' },
  { name: 'Sun hat', style: 'sunhat' },
  { name: 'Bandana', style: 'bandana' },
  { name: 'Headband', style: 'band' },
];

export const JACKET_STYLES: { name: string; style: JacketStyle | null }[] = [
  { name: 'None', style: null },
  { name: 'Jacket', style: 'open' },
  { name: 'Hoodie', style: 'hoodie' },
  { name: 'Vest', style: 'vest' },
  // Appended, never inserted: these indices are written into every save.
  { name: 'Coat', style: 'coat' },
];

export const GLASSES_STYLES: { name: string; style: GlassesStyle | null }[] = [
  { name: 'None', style: null },
  { name: 'Round', style: 'round' },
  { name: 'Square', style: 'square' },
  { name: 'Shades', style: 'shades' },
];

/** The pack is worn on the back and shows as a strap from the front. */
export const PACK_COLOURS: Swatch[] = [
  { name: 'None', c: '#000000' },
  { name: 'Leather', c: '#6a5a3a' },
  { name: 'Canvas', c: '#8a7a58' },
  { name: 'Rust', c: '#8a4a30' },
  { name: 'Fern', c: '#3f6a4c' },
  { name: 'Slate', c: '#4a4f60' },
];

export const BUILDS: { name: string; build: 'broad' | 'slim' }[] = [
  { name: 'Boy', build: 'broad' },
  { name: 'Girl', build: 'slim' },
];

/** Every choice the character creator makes, as indices into the tables above.
 *  Indices rather than colours so a save stays small and stays readable, and so
 *  a retuned palette reaches characters that were made before it. */
export interface CharAppearance {
  build: number;
  skin: number;
  hairStyle: number;
  hairColour: number;
  eyes: number;
  hat: number;
  hatColour: number;
  jacket: number;
  jacketColour: number;
  shirt: number;
  trousers: number;
  shoes: number;
  glasses: number;
  pack: number;
}

export const DEFAULT_APPEARANCE: CharAppearance = {
  build: 0,
  skin: 2,
  hairStyle: 0,
  hairColour: 2,
  eyes: 1,
  hat: 1,
  hatColour: 12,
  jacket: 0,
  jacketColour: 9,
  shirt: 0,
  trousers: 0,
  shoes: 0,
  glasses: 0,
  pack: 1,
};

/** Clamped lookup: a save written against an older table never crashes. */
function pick<T>(list: T[], index: number): T {
  return list[((Math.round(index) % list.length) + list.length) % list.length]!;
}

export function normaliseAppearance(a: Partial<CharAppearance> | undefined): CharAppearance {
  return { ...DEFAULT_APPEARANCE, ...(a ?? {}) };
}

export function appearancePalette(raw: Partial<CharAppearance> | undefined): CharPalette {
  const a = normaliseAppearance(raw);
  const skin = pick(SKIN_TONES, a.skin);
  const hair = pick(HAIR_COLOURS, a.hairColour);
  const shirt = pick(CLOTH_COLOURS, a.shirt);
  const legs = pick(TROUSER_COLOURS, a.trousers);
  const hat = pick(HAT_STYLES, a.hat);
  const hatColour = pick(CLOTH_COLOURS, a.hatColour);
  const jacket = pick(JACKET_STYLES, a.jacket);
  const jacketColour = pick(CLOTH_COLOURS, a.jacketColour);

  return {
    skin: skin.c, skinShade: skin.shade ?? darken(skin.c, 0.2),
    hair: hair.c, hairShade: hair.shade ?? darken(hair.c, 0.3),
    top: shirt.c, topShade: shirt.shade ?? darken(shirt.c, 0.28),
    legs: legs.c, legsShade: legs.shade ?? darken(legs.c, 0.28),
    shoes: pick(SHOE_COLOURS, a.shoes).c,
    outline: '#1a1a22',
    ...(pick(GLASSES_STYLES, a.glasses).style
      ? { glasses: pick(GLASSES_STYLES, a.glasses).style! }
      : {}),
    ...(a.pack % PACK_COLOURS.length !== 0
      ? { pack: pick(PACK_COLOURS, a.pack).c }
      : {}),
    eye: pick(EYE_COLOURS, a.eyes).c,
    hairStyle: pick(HAIR_STYLES, a.hairStyle).style,
    build: pick(BUILDS, a.build).build,
    ...(hat.style ? { hat: hatColour.c, hatShade: hatColour.shade, hatStyle: hat.style } : {}),
    ...(jacket.style
      ? { jacket: jacketColour.c, jacketShade: jacketColour.shade, jacketStyle: jacket.style }
      : {}),
  };
}

const sheetCache = new Map<string, CharSheet>();

/** Cached sheet for a named palette, falling back to a villager look. */
export function getCharSheet(spriteId: string): CharSheet {
  const cached = sheetCache.get(spriteId);
  if (cached) return cached;
  const pal = DEFAULT_PALETTES[spriteId] ?? DEFAULT_PALETTES.villager_m!;
  const sheet = new CharSheet(pal);
  sheetCache.set(spriteId, sheet);
  return sheet;
}

/** Cached sheet for a built appearance, keyed on the choices themselves: the
 *  creator can preview a hundred combinations and only pay for the ones it
 *  actually draws. */
export function getAppearanceSheet(raw: Partial<CharAppearance> | undefined): CharSheet {
  const a = normaliseAppearance(raw);
  const key = 'a:' + [
    a.build, a.skin, a.hairStyle, a.hairColour, a.eyes,
    a.hat, a.hatColour, a.jacket, a.jacketColour, a.shirt, a.trousers, a.shoes,
    a.glasses, a.pack,
  ].join(',');
  const cached = sheetCache.get(key);
  if (cached) return cached;
  const sheet = new CharSheet(appearancePalette(a));
  sheetCache.set(key, sheet);
  return sheet;
}
