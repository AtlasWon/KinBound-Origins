/**
 * Starter choice.
 *
 * The single most-remembered screen in the genre, so it gets its own scene
 * rather than a dialogue list -- and it is staged as a *place*, not a menu:
 * three kin sitting along the counter at the back of Professor Sorrell's field station,
 * with Sorrell himself stood in front of it. That is the picture the player is
 * meant to keep, so the picture is what the scene draws.
 *
 * Choosing then plays out in the room rather than cutting away. The one that
 * was picked hops down off the counter and comes to you; the other two are
 * still sitting exactly where they were, and the scene holds on them long
 * enough for that to register before it hands back to the script.
 *
 * The room is drawn in code from the same wood and plaster the tileset uses,
 * so it matches the counter that is actually on the map behind Sorrell. The only
 * imported art is the creature sprites, and they arrive through iconSprite()
 * -- a full 128px battle sprite is nearly the height of the screen; the 64px
 * icon is about two tiles, which is the size a kin sitting on a counter is.
 */

import type { Game } from '../core/game.js';
import type { Scene } from '../core/scene.js';
import { Renderer, SCREEN_H, SCREEN_W } from '../engine/renderer.js';
import { iconSprite } from '../gfx/kinsprite.js';
import { CHAR_H, CHAR_W, getCharSheet } from '../gfx/charsprite.js';
import { para } from '../ui/layout.js';
import { registry } from '../data/registry.js';
import { createKin } from '../systems/kin.js';
import { ask } from '../ui/dialogue.js';
import type { GameState } from '../systems/state.js';
import type { SpeciesData } from '../data/schema.js';

const ROLE_BLURB: Record<string, string> = {
  wall: 'Slow and very hard to move. Wins by outlasting.',
  sweeper: 'Fast and hits hard. Wins before it is hit back.',
  pivot: 'Controls the shape of a fight. Wins by out-thinking.',
  trapper: 'Locks a fight down and squeezes.',
  support: 'Keeps the rest of the team standing.',
  bruiser: 'Heavy, direct, and difficult to argue with.',
  glass: 'Dangerous while it lasts.',
};

/* ---------------------------------------------------------------- staging */

/*
 * The view is not always 240x160 -- see renderer.ts -- so the room is stacked
 * up from the bottom of whatever screen it gets. Everything below is measured
 * off the panel, because the one thing that must not move is the reading line.
 */

const PANEL_H = 56;
const PANEL_Y = SCREEN_H - PANEL_H - 2;
/** Professor Sorrell stands on the floor in front of the counter. */
const VESS_X = Math.floor(SCREEN_W / 2);
const VESS_FOOT = PANEL_Y - 3;
/** Counter: the panelled face, the front lip, then the top surface. */
const CTR_X0 = 0;
const CTR_X1 = SCREEN_W;
/** Its foot clears the top of Sorrell's head, so he is plainly in front of it. */
const FLOOR_Y = VESS_FOOT - 25;
const FACE_H = 22;
const FACE_Y = FLOOR_Y - FACE_H;
const SURF_H = 9;
const SURF_Y = FACE_Y - SURF_H;
/** The line a kin's feet rest on: the front edge of the top surface. */
const SEAT_Y = FACE_Y - 1;
/** Where the back wall stops. The counter stands against it. */
const WALL_H = SURF_Y + 1;
/** Horizontal pitch between kin along the counter. */
const SLOT_PITCH = Math.min(84, Math.floor(SCREEN_W / 3.2));

const WOOD_PALE = '#dcbc8c';
const WOOD_LIGHT = '#c09864';
const WOOD_MID = '#a07548';
const WOOD_DARK = '#7c5533';
const WOOD_DEEP = '#5c3d24';
const FLOOR_A = '#eef1f6';
const FLOOR_B = '#e2e7ef';
const GROUT = '#cfd3dc';
const WALL_A = '#c8ccd6';
const WALL_B = '#bcc1cd';
const WALL_TRIM = '#9aa0b0';
const GLASS = '#8fb6c2';
const GLASS_LIT = '#b6d6de';

/** Ink bounds of a 64px icon, measured once so both art routes seat alike. */
interface Bounds { cx: number; bottom: number; top: number }

type Phase = 'choose' | 'take' | 'settle';

const TAKE_SECS = 0.62;
const SETTLE_SECS = 1.35;

export class StarterScene implements Scene {
  readonly name = 'starter';

  private index = 0;
  private options: SpeciesData[] = [];
  private t = 0;
  private confirming = false;

  private phase: Phase = 'choose';
  private phaseT = 0;
  private takenIndex = -1;
  private chosen: SpeciesData | null = null;
  private finished = false;

  private bounds: Bounds[] = [];

  constructor(
    private state: GameState,
    private ids: string[],
    private onDone: (chosen: string | null) => void,
  ) {}

  enter(): void {
    this.options = this.ids
      .map((id) => registry.species.get(id))
      .filter((s): s is SpeciesData => Boolean(s));
    if (this.options.length === 0) {
      // Never strand the player: fall back to whatever the registry has.
      this.options = [...registry.species.values()].slice(0, 3);
    }
    this.bounds = this.options.map((sp) => measureIcon(sp.id));
  }

  resume(): void {
    // Only the confirmation prompt returns here. Once the choice is made the
    // scene is running its own beat and must not be reset back to picking.
    if (this.phase === 'choose') this.confirming = false;
  }

  /* -------------------------------------------------------------- layout */

  /** Centre of slot i along the counter. */
  private slotX(i: number): number {
    const n = Math.max(1, this.options.length);
    return VESS_X + (i - (n - 1) / 2) * SLOT_PITCH;
  }

  /** Clickable box around a kin on the counter. */
  private slotRect(i: number): { x: number; y: number; w: number; h: number } {
    const cx = this.slotX(i);
    return { x: cx - 26, y: SEAT_Y - 34, w: 52, h: 40 };
  }

  /* -------------------------------------------------------------- update */

  update(game: Game, dt: number): void {
    this.t += dt;

    if (this.phase !== 'choose') {
      this.phaseT += dt;
      if (this.phase === 'take' && this.phaseT >= TAKE_SECS) {
        this.phase = 'settle';
        this.phaseT = 0;
      } else if (this.phase === 'settle') {
        // The beat can be skipped, but not before it has been seen.
        const impatient = this.phaseT > 0.35
          && (game.input.pressed('confirm') || game.input.pressed('cancel'));
        if (this.phaseT >= SETTLE_SECS || impatient) this.finish(game);
      }
      return;
    }

    if (this.confirming) return;

    const n = this.options.length;
    if (n === 0) return;

    for (let i = 0; i < n; i++) {
      const r = this.slotRect(i);
      if (game.input.mouseOver(r.x, r.y, r.w, r.h)) {
        if (game.input.mouse.idleFrames < 2) this.index = i;
        if (game.input.mouse.leftPressed) { this.index = i; this.confirm(game); return; }
      }
    }

    if (game.input.repeated('right')) this.index = (this.index + 1) % n;
    if (game.input.repeated('left')) this.index = (this.index - 1 + n) % n;
    if (game.input.pressed('confirm')) this.confirm(game);
    // Deliberately no cancel: this choice has to be made before moving on.
  }

  private confirm(game: Game): void {
    const sp = this.options[this.index];
    if (!sp) return;
    this.confirming = true;
    ask(game, [
      `${sp.name}, then.`,
      `${sp.category}.`,
      'Are you sure?',
    ], (yes) => {
      if (!yes) { this.confirming = false; return; }
      // Level six, not five. The first fights were measured at a few percent
      // with a level-five starter and no second kin to fall back on.
      const kin = createKin(sp.id, 6, game.rng, { originalTrainer: 'player' });
      kin.metAt = 'sorrell_lab';
      this.state.addKin(kin);
      this.state.setFlag('got_starter');
      // The rival picks the type that beats this one, so record the choice.
      this.state.setFlag(`starter_${sp.id}`);
      // Do not leave yet: the whole point of staging this in the room is that
      // the player watches their pick come down off the counter and sees the
      // other two still sitting there afterwards.
      this.chosen = sp;
      this.takenIndex = this.index;
      this.phase = 'take';
      this.phaseT = 0;
      this.confirming = false;
    }, 'PROF. SORRELL');
  }

  private finish(game: Game): void {
    if (this.finished) return;
    this.finished = true;
    game.scenes.pop();
    this.onDone(this.chosen?.id ?? null);
  }

  /* -------------------------------------------------------------- render */

  render(_game: Game, r: Renderer): void {
    this.renderRoom(r);
    this.renderCounter(r);

    // The kin still on the counter. The one that was taken is skipped here and
    // drawn again on its way down, so "gone from the counter" is literally
    // what the draw does.
    this.options.forEach((sp, i) => {
      if (i === this.takenIndex) return;
      const selected = this.phase === 'choose' && i === this.index;
      const bob = selected ? Math.round(Math.sin(this.t * 3.4)) : 0;
      const lift = selected ? 3 : 0;
      // A warm pool on the wood: the lift alone is three pixels, which is not
      // enough on its own to say which one you are about to walk out with.
      if (selected) {
        r.ellipsePixel(this.slotX(i) * 2, (SEAT_Y - 2) * 2, 30, 7, 'rgba(255,226,150,0.30)');
        r.ellipsePixel(this.slotX(i) * 2, (SEAT_Y - 2) * 2, 18, 4, 'rgba(255,236,186,0.34)');
      }
      this.drawKin(r, i, this.slotX(i), SEAT_Y - lift + bob);
      if (selected) this.drawCaret(r, this.slotX(i), i, lift - bob);
    });

    this.drawSorrell(r);
    if (this.phase === 'take') this.drawTaken(r);

    this.renderPanel(r);
  }

  /** Back wall, glazing band and tiled floor. */
  private renderRoom(r: Renderer): void {
    // Floor first, everywhere: the wall is then painted over the top of it, so
    // a taller view only ever grows the wall and never leaves a seam.
    r.rect(0, 0, SCREEN_W, SCREEN_H, FLOOR_A);
    for (let y = WALL_H; y < SCREEN_H; y += 16) {
      for (let x = 0; x < SCREEN_W; x += 16) {
        if (((x >> 4) + (y >> 4)) % 2 === 0) r.rect(x, y, 16, 16, FLOOR_B);
      }
      r.rect(0, y, SCREEN_W, 1, GROUT);
    }
    for (let x = 0; x < SCREEN_W; x += 16) r.rect(x, WALL_H, 1, SCREEN_H - WALL_H, GROUT);

    r.rect(0, 0, SCREEN_W, WALL_H, WALL_A);
    // Panel joins, so the wall is a built surface rather than a flat fill.
    for (let x = 0; x < SCREEN_W; x += 24) r.rect(x, 0, 1, WALL_H, WALL_B);

    // A long glazing strip: the field station is all windows on the sea side,
    // and what is out there is the thing the whole story is about, so the
    // glass gets a horizon rather than a flat fill.
    const gy = Math.max(6, WALL_H - 58);
    const gh = Math.max(14, WALL_H - 14 - gy);
    const gw = SCREEN_W - 16;
    const horizon = gy + Math.max(4, Math.round(gh * 0.42));
    r.rect(8, gy, gw, gh, GLASS_LIT);
    r.rect(8, gy, gw, horizon - gy, '#cfe0e6');
    r.rect(8, horizon, gw, gy + gh - horizon, GLASS);
    r.rect(8, horizon - 1, gw, 1, '#7f9ea8');
    for (let y = horizon + 2; y < gy + gh; y += 4) {
      for (let x = 10 + ((y * 5) % 9); x < SCREEN_W - 10; x += 17) {
        r.rect(x, y, 5, 1, '#a3c8d0');
      }
    }
    for (let x = 8 + 30; x < SCREEN_W - 8; x += 30) r.rect(x, gy, 2, gh, WALL_TRIM);
    r.outline(8, gy, gw, gh, WALL_TRIM);

    // Pinned charts, but only when there is bare wall above the glass to pin
    // them to -- which there is on a tall view and is not on the small one.
    if (gy >= 18) {
      let n = 0;
      for (let x = 24; x < SCREEN_W - 40; x += 58) {
        const h = 11 + (n % 3) * 3;
        r.rect(x, gy - 5 - h, 34, h, '#e6e2d2');
        r.outline(x, gy - 5 - h, 34, h, '#8d8878');
        // Each chart is a different set of marks, so a wide wall does not
        // read as one poster stamped out eight times.
        for (let k = 0; k < 3 + (n % 2); k++) {
          const w2 = 8 + ((n * 7 + k * 11) % 20);
          r.rect(x + 3, gy - h + k * 3, w2, 1, k % 2 === 0 ? '#9a5a4a' : '#5a6a90');
        }
        n++;
      }
    }

    // Skirting where the wall meets the counter behind it.
    r.rect(0, WALL_H - 3, SCREEN_W, 2, WALL_TRIM);
    r.rect(0, WALL_H - 1, SCREEN_W, 1, '#7f8595');
  }

  /** The counter itself, plus the two props that tell you it is a work top. */
  private renderCounter(r: Renderer): void {
    const w = CTR_X1 - CTR_X0;

    // Floor shadow under the toe kick, drawn first so nothing sits on it.
    r.rect(CTR_X0, FLOOR_Y, w, 3, '#c6cad4');
    r.rect(CTR_X0, FLOOR_Y, w, 1, '#adb2bf');

    // Top surface, receding: darkest where it meets the wall, brightest along
    // the front lip. That gradient is the whole reason it reads as a surface
    // things can be *on* rather than as a band of colour.
    r.rect(CTR_X0, SURF_Y, w, SURF_H, WOOD_LIGHT);
    r.rect(CTR_X0, SURF_Y, w, 2, WOOD_DARK);
    r.rect(CTR_X0, SURF_Y + 2, w, 2, WOOD_MID);
    r.rect(CTR_X0, SURF_Y + SURF_H - 3, w, 3, WOOD_PALE);
    r.rect(CTR_X0, SURF_Y + SURF_H - 1, w, 1, '#f4e0bc');
    // Grain, sparse, so the top is not a flat wash at 1x.
    for (let x = CTR_X0; x < CTR_X1; x++) {
      if (x % 7 === 0) r.rect(x, SURF_Y + 4, 3, 1, WOOD_MID);
      if ((x + 3) % 11 === 0) r.rect(x, SURF_Y + 6, 4, 1, WOOD_MID);
    }

    // Front face, with the speckle the tileset's counter uses so the two read
    // as the same piece of furniture.
    r.rect(CTR_X0, FACE_Y, w, FACE_H, WOOD_MID);
    for (let y = FACE_Y + 2; y < FACE_Y + FACE_H - 2; y++) {
      for (let x = CTR_X0; x < CTR_X1; x++) {
        if ((x + y) % 6 === 0) r.rect(x, y, 1, 1, WOOD_DARK);
      }
    }
    r.rect(CTR_X0, FACE_Y, w, 1, WOOD_DEEP);
    r.rect(CTR_X0, FACE_Y + FACE_H - 2, w, 2, WOOD_DEEP);

    // Cupboard doors, recessed, one per bay.
    const bay = Math.floor(w / Math.max(3, Math.round(w / 40)));
    for (let x = CTR_X0 + 3; x + bay - 6 < CTR_X1; x += bay) {
      const dw = bay - 6;
      r.outline(x, FACE_Y + 4, dw, FACE_H - 10, WOOD_DEEP);
      r.rect(x + 1, FACE_Y + 5, dw - 2, 1, WOOD_LIGHT);
      r.rect(x + 1, FACE_Y + 5, 1, FACE_H - 12, WOOD_LIGHT);
      r.rect(x + Math.floor(dw / 2) - 2, FACE_Y + 7, 4, 1, '#e8d2a8');
    }

    // Props: a stack of field notes at one end, a flask at the other.
    for (let i = 0; i < 3; i++) {
      r.rect(10, SURF_Y + 2 - i * 2, 18, 2, i % 2 === 0 ? '#f2efe2' : '#e0dcc8');
      r.outline(10, SURF_Y + 2 - i * 2, 18, 2, '#a8a290');
    }
    r.rect(SCREEN_W - 26, SURF_Y - 1, 8, 6, '#a8d0cc');
    r.rect(SCREEN_W - 24, SURF_Y - 6, 4, 5, '#c2e2de');
    r.rect(SCREEN_W - 25, SURF_Y - 7, 6, 1, '#8fb0ac');
    r.outline(SCREEN_W - 26, SURF_Y - 1, 8, 6, '#5f7a78');
  }

  /** One kin seated on the counter, centred and rested by measured ink. */
  private drawKin(r: Renderer, i: number, cx: number, footY: number, alpha = 1): void {
    const sp = this.options[i];
    const b = this.bounds[i];
    if (!sp || !b) return;
    r.image(iconSprite(sp.id), cx - b.cx, footY - b.bottom,
      0, 0, undefined, undefined, false, false, alpha);
  }

  /** The pick, mid-hop, on its way down off the counter and over to you. */
  private drawTaken(r: Renderer): void {
    const i = this.takenIndex;
    const b = this.bounds[i];
    if (i < 0 || !b) return;
    const p = Math.min(1, this.phaseT / TAKE_SECS);
    // Ease out, with an arc over the top so it reads as a jump down rather
    // than a slide. It lands behind the panel, which is drawn afterwards.
    const e = 1 - (1 - p) * (1 - p);
    const x = this.slotX(i) + (VESS_X - 22 - this.slotX(i)) * e;
    const y = SEAT_Y + (PANEL_Y + 14 - SEAT_Y) * e - Math.sin(Math.PI * p) * 15;
    this.drawKin(r, i, Math.round(x), Math.round(y));
  }

  /** Professor Sorrell, stood on the floor with the counter behind him. */
  private drawSorrell(r: Renderer): void {
    const sheet = getCharSheet('professor');
    const src = sheet.src('down', 0);
    const x = VESS_X - CHAR_W / 4;
    // The same one-pixel breath the overworld gives a standing actor. Without
    // it he is a cardboard cut-out while three creatures bob behind him.
    const breath = Math.sin(this.t * 1.9) > 0 ? 0 : 1;
    const y = VESS_FOOT - CHAR_H / 2 + breath;
    r.ellipsePixel(VESS_X * 2, (VESS_FOOT - 1) * 2, 11, 4, 'rgba(40,46,60,0.22)');
    r.image(sheet.canvas, x, y, src.x, src.y, src.w, src.h, src.flip);
  }

  /** Pointer over the selected kin: a bouncing chevron, readable at 1x. */
  private drawCaret(r: Renderer, cx: number, i: number, lift: number): void {
    const b = this.bounds[i];
    if (!b) return;
    const top = SEAT_Y - b.bottom + b.top - lift;
    const y = top - 11 + (Math.sin(this.t * 5) > 0 ? 0 : 1);
    for (let k = 0; k < 6; k++) {
      r.rect(cx - 6 + k, y + k, 13 - k * 2, 1, '#2c3244');
    }
    for (let k = 0; k < 4; k++) {
      r.rect(cx - 4 + k, y + 1 + k, 9 - k * 2, 1, k === 0 ? '#fff4c8' : '#ffd45a');
    }
  }

  /* --------------------------------------------------------------- panel */

  private renderPanel(r: Renderer): void {
    r.window(2, PANEL_Y, SCREEN_W - 4, PANEL_H);
    const maxW = SCREEN_W - 16;

    if (this.phase !== 'choose') {
      const name = this.chosen?.name ?? 'It';
      const lines = this.phase === 'take'
        ? [`${name} hops down off the counter.`]
        : [`${name} comes with you.`,
          'The other two settle back down where they were.'];
      let ty = PANEL_Y + 6;
      for (const line of lines) {
        for (const w of r.wrapText(line, maxW)) {
          r.text(w, 8, ty, { color: '#282838' });
          ty += 10;
        }
      }
      return;
    }

    const sp = this.options[this.index];
    if (!sp) return;

    // Name on the left, typing on the right, so the two never fight for room.
    r.text(sp.name, 8, PANEL_Y + 4, { color: '#282838' });
    let tx = SCREEN_W - 10;
    for (const ty of [...sp.types].reverse()) {
      const meta = registry.typeChart?.meta?.[ty];
      const label = (meta?.name ?? ty).toUpperCase();
      const w = r.textWidth(label) + 6;
      tx -= w;
      r.rect(tx, PANEL_Y + 3, w, 9, meta?.color ?? '#888');
      r.outline(tx, PANEL_Y + 3, w, 9, '#282838');
      r.text(label, tx + 3, PANEL_Y + 4, { color: '#ffffff' });
      tx -= 2;
    }
    r.rect(8, PANEL_Y + 13, SCREEN_W - 20, 1, '#b8bfd0');

    /*
     * Both paragraphs go through `para`, which counts a line as fitting only
     * if all seven rows of its ink are inside the box and marks the text when
     * it has to cut. The old arithmetic measured from the line's ORIGIN, so the
     * last line's descenders hung off the bottom of the panel -- Sprigling's
     * entry is the long one and it was visibly sliced -- and a cut ended
     * mid-sentence with nothing to say it had been cut.
     */
    const bottom = PANEL_Y + PANEL_H - 4;
    let y = PANEL_Y + 16;
    y += para(r, ROLE_BLURB[sp.design.role] ?? '', { x: 8, y, w: maxW, h: bottom - y },
      { color: '#282838', lineHeight: 9 });
    para(r, sp.vellumEntry, { x: 8, y, w: maxW, h: bottom - y },
      { color: '#485068', lineHeight: 9 });
  }
}

/* ------------------------------------------------------------- measuring */

const boundsCache = new Map<string, Bounds>();

/**
 * Where a species' icon actually has ink.
 *
 * Sprites are not all the same size inside their cell -- and half of them are
 * hand-drawn PNGs whose author had no reason to match the generator's framing
 * -- so seating them by cell edges puts some floating and some sunk into the
 * wood. Measuring once, at load, costs three getImageData calls and makes both
 * art routes rest on the same line.
 *
 * The bottom is taken from the faintest pixel (the contact shadow, which
 * should touch the surface) and the centre from solid ink only, so a long
 * trailing tail does not shove the body off-centre.
 */
function measureIcon(speciesId: string): Bounds {
  const hit = boundsCache.get(speciesId);
  if (hit) return hit;

  const cv = iconSprite(speciesId);
  const w = cv.width;
  const h = cv.height;
  let out: Bounds = { cx: w / 4, bottom: h / 2, top: 0 };
  const ctx = cv.getContext('2d');
  if (ctx) {
    const d = ctx.getImageData(0, 0, w, h).data;
    let anyBottom = -1, anyTop = h;
    let inkL = w, inkR = -1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const a = d[(y * w + x) * 4 + 3]!;
        if (a < 16) continue;
        if (y > anyBottom) anyBottom = y;
        if (y < anyTop) anyTop = y;
        if (a < 200) continue;
        if (x < inkL) inkL = x;
        if (x > inkR) inkR = x;
      }
    }
    if (anyBottom >= 0) {
      if (inkR < 0) { inkL = 0; inkR = w - 1; }
      // Canvas pixels are DETAIL-density, so halve into logical units.
      out = {
        cx: (inkL + inkR + 1) / 4,
        bottom: (anyBottom + 1) / 2,
        top: anyTop / 2,
      };
    }
  }
  boundsCache.set(speciesId, out);
  return out;
}
