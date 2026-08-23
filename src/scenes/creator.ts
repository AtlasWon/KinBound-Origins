/**
 * Character creation.
 *
 * The player builds the trainer they will look at for the rest of the game, so
 * the preview is the screen and the options are a list beside it. Every change
 * is visible on a walking figure immediately -- picking a hair colour from a
 * name in a list and finding out what it looks like an hour later is how you
 * end up with a character nobody likes.
 *
 * Sprites are generated, not drawn (see gfx/charsprite.ts), which is the only
 * reason a creator this wide is possible at all: an appearance is twelve
 * numbers, and the sheet for any combination is built on demand.
 *
 * LAYOUT IS MEASURED, NEVER GUESSED. Every column in here comes out of
 * `layout()`, which asks the renderer how wide the longest string it can ever
 * be handed actually is. The first version used round numbers instead, and
 * "Porcelain" ran into the right arrow, "Jacket hue" ran into the left one, and
 * a ten-letter name ran out of its plate.
 */

import type { Game } from '../core/game.js';
import type { Scene } from '../core/scene.js';
import { Renderer, SCREEN_H, SCREEN_W, DETAIL } from '../engine/renderer.js';
import { audio } from '../audio/audio.js';
import { OverworldScene } from './overworld.js';
import { TitleScene } from './title.js';
import type { GameState } from '../systems/state.js';
import {
  BUILDS, SKIN_TONES, HAIR_STYLES, HAIR_COLOURS, EYE_COLOURS,
  HAT_STYLES, JACKET_STYLES, CLOTH_COLOURS, TROUSER_COLOURS, SHOE_COLOURS,
  GLASSES_STYLES, PACK_COLOURS,
  getAppearanceSheet, CHAR_W, CHAR_H, DIRS,
  type CharAppearance, type CharDir,
} from '../gfx/charsprite.js';

/** A row of the option list: a label, a list of values, and where it lives. */
interface Row {
  label: string;
  key?: keyof CharAppearance;
  list?: readonly { name: string; c?: string }[];
  action?: 'name' | 'begin';
  /** Dye rows fold away when the garment they tint is set to None. */
  needs?: 'hat' | 'jacket';
}

/**
 * Every row the screen can show, in order.
 *
 * Held as one static table rather than built per frame so the label column can
 * be measured against all of them at once: the dye rows appear and disappear as
 * the player tries hats on, and a column that resized under them would make the
 * whole list twitch sideways.
 *
 * The outer layer is "Coat" and not "Jacket" purely for width -- "Jacket hue"
 * is the one label wide enough to cost the preview panel the space its name
 * plate needs.
 */
const ALL_ROWS: readonly Row[] = [
  { label: 'Body', key: 'build', list: BUILDS },
  { label: 'Skin', key: 'skin', list: SKIN_TONES },
  { label: 'Hair', key: 'hairStyle', list: HAIR_STYLES },
  { label: 'Hair hue', key: 'hairColour', list: HAIR_COLOURS },
  { label: 'Eyes', key: 'eyes', list: EYE_COLOURS },
  { label: 'Hat', key: 'hat', list: HAT_STYLES },
  { label: 'Hat hue', key: 'hatColour', list: CLOTH_COLOURS, needs: 'hat' },
  { label: 'Coat', key: 'jacket', list: JACKET_STYLES },
  { label: 'Coat hue', key: 'jacketColour', list: CLOTH_COLOURS, needs: 'jacket' },
  { label: 'Shirt', key: 'shirt', list: CLOTH_COLOURS },
  { label: 'Trousers', key: 'trousers', list: TROUSER_COLOURS },
  { label: 'Shoes', key: 'shoes', list: SHOE_COLOURS },
  { label: 'Glasses', key: 'glasses', list: GLASSES_STYLES },
  { label: 'Pack', key: 'pack', list: PACK_COLOURS },
  { label: 'Name', action: 'name' },
  { label: 'Begin', action: 'begin' },
];

const NAME_MAX = 10;
const NAME_PROMPT = 'PRESS ENTER';
const NO_NAME = 'UNNAMED';
const BEGIN_LABEL = 'BEGIN YOUR JOURNEY';
const TITLE = 'CREATE YOUR TRAINER';

/* ------------------------------------------------------------- measurements */

/**
 * The only fixed distances on the screen, and every one of them is a gap or a
 * frame thickness -- never the width of something that holds text.
 */
const MARGIN = 4;
const GAP = 4;
/** r.window casts a two-unit drop shadow down and to the right of every panel. */
const SHADOW = 2;
const TOP = 15;
const BOTTOM = SCREEN_H - 15;

const PAD = 4;
const ROW_H = 12;
const LABEL_GAP = 5;
const ARROW_W = 8;
const ARROW_H = 10;
const ARROW_GAP = 2;
const WELL_PAD = 2;
const CHIP_W = 6;
const CHIP_H = 8;
const CHIP_GAP = 3;
const TRACK_W = 4;
const TRACK_GAP = 2;
const PLATE_H = 14;
const COMPASS_W = 23;
const COMPASS_H = 11;

interface Box { x: number; y: number; w: number; h: number }

interface Layout {
  panel: Box;
  /** The framed scene the trainer stands in. */
  dio: Box;
  compass: Box;
  plate: Box;
  list: Box;
  /** Top of the first row band. */
  rowsY: number;
  visible: number;
  /** Full-row hit and highlight band, inside the frame and left of the track. */
  bandX: number;
  bandW: number;
  labelX: number;
  /** Label through right arrow, the span a full-width row may use. */
  rowW: number;
  leftX: number;
  wellX: number;
  wellW: number;
  rightX: number;
  trackX: number;
}

/* ------------------------------------------------------------------ palette */

const FRAME = '#232a3d';
const INK = '#1c2233';
const INK_SOFT = '#3d465e';
const GOLD = '#ffd88c';
const SEL_FILL = '#2f3d68';
const SEL_EDGE = '#141a2c';
const SEL_TOP = '#56689c';
const HOVER_FILL = '#dde4f2';

export class CreatorScene implements Scene {
  readonly name = 'creator';

  private app: CharAppearance;
  private playerName: string;
  private sel = 0;
  private top = 0;
  private typing = false;
  private t = 0;
  private facing = 0;
  private step = 0;
  private walk = 0;
  private fade = 1;
  private leaving = false;

  /** Lit arrow after a change, so a keyboard press reads on the same widget a
   *  mouse press does. */
  private flash: { dir: -1 | 1; frames: number } | null = null;

  private geo: Layout | null = null;

  /** Preview frame, blown up 2x so the character reads at creator scale. */
  private zoom: HTMLCanvasElement;

  constructor(private state: GameState) {
    this.app = { ...state.appearance };
    this.playerName = state.playerName === 'AVEN' ? '' : state.playerName;
    this.zoom = document.createElement('canvas');
    this.zoom.width = CHAR_W * 2;
    this.zoom.height = CHAR_H * 2;
  }

  enter(): void {
    audio.playMusic('creator_theme');
  }

  /* ------------------------------------------------------------- geometry */

  /**
   * Column geometry, measured once from the widest strings the screen owns.
   *
   * The list is sized by its contents and the preview takes the rest, except
   * that the preview claims the width of a full-length name first: the plate
   * under the portrait is the one thing here that cannot be allowed to clip.
   */
  private layout(r: Renderer): Layout {
    if (this.geo) return this.geo;

    let labelW = 0;
    for (const row of ALL_ROWS) labelW = Math.max(labelW, r.textWidth(row.label));

    let valueW = 0;
    for (const list of ALL_LISTS) {
      for (const value of list) valueW = Math.max(valueW, r.textWidth(value.name));
    }

    // 'W' is the widest glyph in the face, so this is the worst name possible.
    const nameW = Math.max(
      r.textWidth(NAME_PROMPT),
      r.textWidth('W'.repeat(NAME_MAX)) + r.textWidth('_'),
    );
    // The name field has no arrows to leave room for and spreads over both
    // arrow columns, so it only pushes on the well by what it needs past them.
    const fieldGain = ARROW_W * 2 + ARROW_GAP * 2;

    const wellWant = Math.max(
      WELL_PAD * 2 + valueW + CHIP_GAP + CHIP_W,
      WELL_PAD * 2 + nameW - fieldGain,
    );
    const rowWant = labelW + LABEL_GAP + ARROW_W + ARROW_GAP + wellWant + ARROW_GAP + ARROW_W;

    const budget = SCREEN_W - MARGIN * 2 - GAP - SHADOW * 2;
    const plateWant = r.textWidth('W'.repeat(NAME_MAX)) + 12;

    let listW = rowWant + TRACK_GAP + TRACK_W + PAD * 2;
    let panelW = budget - listW;
    if (panelW < plateWant) {
      panelW = plateWant;
      listW = budget - panelW;
    }

    const panel: Box = { x: MARGIN, y: TOP, w: panelW, h: BOTTOM - TOP };
    const plate: Box = { x: panel.x + 4, y: BOTTOM - 4 - PLATE_H, w: panel.w - 8, h: PLATE_H };
    const compass: Box = {
      x: panel.x + Math.round((panel.w - COMPASS_W) / 2),
      y: plate.y - 3 - COMPASS_H, w: COMPASS_W, h: COMPASS_H,
    };
    const dio: Box = {
      x: panel.x + 4, y: panel.y + 5,
      w: panel.w - 8, h: compass.y - 3 - (panel.y + 5),
    };

    const list: Box = {
      x: panel.x + panel.w + SHADOW + GAP, y: TOP, w: listW, h: BOTTOM - TOP,
    };
    const labelX = list.x + PAD;
    const leftX = labelX + labelW + LABEL_GAP;
    const wellX = leftX + ARROW_W + ARROW_GAP;
    const trackX = list.x + list.w - PAD - TRACK_W;
    const rightX = trackX - TRACK_GAP - ARROW_W;
    // Whatever slack or squeeze the budget produced lands in the well, the one
    // column with padding to give.
    const wellW = rightX - ARROW_GAP - wellX;

    this.geo = {
      panel, dio, compass, plate, list,
      rowsY: list.y + 5,
      visible: Math.max(1, Math.floor((list.h - 10) / ROW_H)),
      bandX: list.x + 3,
      bandW: trackX - TRACK_GAP - (list.x + 3),
      labelX,
      rowW: rightX + ARROW_W - labelX,
      leftX, wellX, wellW, rightX, trackX,
    };
    return this.geo;
  }

  /* ------------------------------------------------------------- rows */

  private rows(): Row[] {
    // A dye row with nothing to dye is worse than no row at all.
    return ALL_ROWS.filter((row) => {
      if (row.needs === 'hat') return !!HAT_STYLES[this.app.hat % HAT_STYLES.length].style;
      if (row.needs === 'jacket') return !!JACKET_STYLES[this.app.jacket % JACKET_STYLES.length].style;
      return true;
    });
  }

  private nudge(row: Row, delta: number): void {
    if (!row.key || !row.list) return;
    const len = row.list.length;
    const next = (((this.app[row.key] + delta) % len) + len) % len;
    this.app[row.key] = next;
    this.flash = { dir: delta > 0 ? 1 : -1, frames: 7 };
    audio.playSfx('select', { volume: 0.5 });
  }

  /* ------------------------------------------------------------ update */

  update(game: Game, _dt: number): void {
    this.t++;
    if (this.flash && --this.flash.frames <= 0) this.flash = null;
    if (this.fade > 0 && !this.leaving) this.fade = Math.max(0, this.fade - 0.04);
    if (this.leaving) {
      this.fade = Math.min(1, this.fade + 0.035);
      if (this.fade >= 1) this.start(game);
      return;
    }

    // The preview walks on the spot and turns every couple of seconds, so every
    // facing gets looked at without the player having to ask for it.
    this.walk += 0.16;
    this.step = Math.floor(this.walk) % 4;
    if (this.t % 96 === 0) this.facing = (this.facing + 1) % DIRS.length;

    const geo = this.layout(game.renderer);
    const rows = this.rows();
    // Turning a hat off takes its dye row with it, which can leave the cursor
    // past the end of the list.
    if (this.sel >= rows.length) this.sel = rows.length - 1;
    const row = rows[this.sel];

    if (this.typing) { this.updateTyping(game); return; }

    if (game.input.repeated('down')) {
      this.sel = (this.sel + 1) % rows.length;
      audio.playSfx('select', { volume: 0.35 });
    } else if (game.input.repeated('up')) {
      this.sel = (this.sel + rows.length - 1) % rows.length;
      audio.playSfx('select', { volume: 0.35 });
    } else if (game.input.repeated('right')) {
      this.nudge(row, 1);
    } else if (game.input.repeated('left')) {
      this.nudge(row, -1);
    } else if (game.input.pressed('confirm')) {
      if (row.action === 'begin') this.leave();
      else if (row.action === 'name') { this.typing = true; audio.playSfx('menu_open', { volume: 0.5 }); }
      else this.nudge(row, 1);
    } else if (game.input.pressed('cancel')) {
      audio.playSfx('cancel');
      game.scenes.replaceAll(new TitleScene());
      return;
    }

    if (game.input.mouse.wheel !== 0) {
      this.sel = Math.max(0, Math.min(rows.length - 1, this.sel + Math.sign(game.input.mouse.wheel)));
      audio.playSfx('select', { volume: 0.3 });
    }

    this.mouse(game, geo, rows);

    // Keep the cursor inside the visible window.
    if (this.sel < this.top) this.top = this.sel;
    if (this.sel >= this.top + geo.visible) this.top = this.sel - geo.visible + 1;
    this.top = Math.max(0, Math.min(this.top, Math.max(0, rows.length - geo.visible)));
  }

  /**
   * Name entry.
   *
   * Bound actions are ignored entirely while this is on: W is a letter here,
   * not "walk up", and Backspace deletes rather than cancels. Enter and Escape
   * are read as physical keys for the same reason.
   */
  private updateTyping(game: Game): void {
    for (const ch of game.input.takeText()) {
      if (ch === '\b') {
        this.playerName = this.playerName.slice(0, -1);
      } else if (/[A-Za-z0-9 '-]/.test(ch) && this.playerName.length < NAME_MAX) {
        this.playerName += ch;
        audio.playSfx('select', { volume: 0.3 });
      }
    }
    // A click means the player has gone to do something else with the pointer,
    // so it accepts rather than leaving them typing into a field they have
    // visibly left.
    if (game.input.keyPressed('Enter') || game.input.keyPressed('NumpadEnter')
      || game.input.keyPressed('Escape') || game.input.keyPressed('Tab')
      || game.input.mouse.leftPressed) {
      this.typing = false;
      audio.playSfx('confirm', { volume: 0.5 });
    }
  }

  private mouse(game: Game, g: Layout, rows: Row[]): void {
    const input = game.input;
    for (let i = 0; i < g.visible && this.top + i < rows.length; i++) {
      const index = this.top + i;
      const y = g.rowsY + i * ROW_H;
      if (!input.clicked(g.bandX, y, g.bandW, ROW_H)) continue;

      const row = rows[index];
      this.sel = index;
      // The arrows are live targets, so a click on one changes the value rather
      // than only moving the cursor to its row. Their hit zones are the full
      // row height, not the drawn button: an 8x10 target is too small to ask
      // anyone to hit.
      if (row.list && input.mouseOver(g.leftX, y, ARROW_W, ROW_H)) this.nudge(row, -1);
      else if (row.list && input.mouseOver(g.rightX, y, ARROW_W, ROW_H)) this.nudge(row, 1);
      else if (row.action === 'begin') this.leave();
      else if (row.action === 'name') { this.typing = true; audio.playSfx('menu_open', { volume: 0.5 }); }
      else if (row.list) this.nudge(row, 1);
    }
  }

  private leave(): void {
    this.leaving = true;
    this.typing = false;
    audio.playSfx('confirm');
    audio.stopMusic();
  }

  private start(game: Game): void {
    const state = this.state;
    state.appearance = { ...this.app };
    const trimmed = this.playerName.trim();
    if (trimmed) state.playerName = trimmed.toUpperCase();
    game.scenes.replaceAll(
      new OverworldScene(state, state.currentMap, state.currentX, state.currentY, state.currentFacing),
    );
  }

  /* ------------------------------------------------------------ render */

  render(game: Game, r: Renderer): void {
    const g = this.layout(r);
    const rows = this.rows();
    const row = rows[Math.min(this.sel, rows.length - 1)];

    this.renderBackdrop(r);
    this.renderTitle(r);
    this.renderPreview(r, g);
    this.renderList(game, r, g, rows);
    this.renderHint(r, row);

    if (this.fade > 0) r.tint('#000000', this.fade);
  }

  private renderBackdrop(r: Renderer): void {
    r.clear('#10162a');
    // A quiet backdrop: this screen is about the character, not the wallpaper.
    for (let i = 0; i < 10; i++) {
      const t = i / 9;
      r.rect(0, Math.round(i * (SCREEN_H / 10)), SCREEN_W, Math.ceil(SCREEN_H / 10) + 1,
        shade('#1b2340', '#39406b', t));
    }
    for (let i = 0; i < 5; i++) {
      r.rect(0, 22 + i * 32, SCREEN_W, 1, 'rgba(255,255,255,0.03)');
    }
    // Corner darkening, so the two bright panels sit in something.
    for (let i = 0; i < 6; i++) {
      const a = `rgba(8,10,20,${(0.06 * (6 - i)).toFixed(3)})`;
      r.rect(i, 0, 1, SCREEN_H, a);
      r.rect(SCREEN_W - 1 - i, 0, 1, SCREEN_H, a);
    }
  }

  private renderTitle(r: Renderer): void {
    const w = r.textWidth(TITLE);
    const cx = SCREEN_W / 2;
    r.text(TITLE, cx, 4, { color: GOLD, shadow: '#241c28', align: 'center' });
    // Rules struck off the measured width, so they never touch the lettering.
    for (const side of [-1, 1]) {
      const x = side < 0 ? cx - w / 2 - 5 - 26 : cx + w / 2 + 5;
      r.rect(x, 7, 26, 1, '#5f6d99');
      r.rect(x, 8, 26, 1, 'rgba(10,14,26,0.5)');
    }
  }

  /* ----------------------------------------------------------- preview */

  private renderPreview(r: Renderer, g: Layout): void {
    r.window(g.panel.x, g.panel.y, g.panel.w, g.panel.h);
    this.renderDiorama(r, g.dio);
    this.renderCompass(r, g.compass);
    this.renderPlate(r, g.plate);
  }

  /**
   * The diorama.
   *
   * A framed scrap of world rather than a cut-out on a flat field: the sprite
   * has to be judged against the greens and skies it will actually be walking
   * around in, and a figure with ground under it reads as lit instead of
   * floating.
   */
  private renderDiorama(r: Renderer, d: Box): void {
    r.rect(d.x, d.y, d.w, d.h, '#e9edf6');
    r.outline(d.x, d.y, d.w, d.h, FRAME);

    const ix = d.x + 1, iy = d.y + 1;
    const iw = d.w - 2, ih = d.h - 2;
    const horizon = iy + Math.round(ih * 0.5);
    // Floor, not round: the compass below rounds the same way, and the figure
    // and the indicator drifting a unit apart is visible on a panel this narrow.
    const cx = d.x + Math.floor(d.w / 2);
    const feet = iy + ih - 16;

    const bands = 6;
    for (let i = 0; i < bands; i++) {
      const y = iy + Math.round((horizon - iy) * i / bands);
      const next = iy + Math.round((horizon - iy) * (i + 1) / bands);
      // Deepest at the top, palest at the horizon, as the sky actually goes.
      r.rect(ix, y, iw, next - y, shade('#8fc2e6', '#dceff9', i / (bands - 1)));
    }

    // Two hills, sized to stay well inside the frame -- nothing here clips, so
    // any shape that overruns would paint straight over the border.
    r.ellipsePixel((cx - 15) * DETAIL, (horizon + 2) * DETAIL, 15 * DETAIL, 9 * DETAIL, '#6f9a72');
    r.ellipsePixel((cx + 14) * DETAIL, (horizon + 3) * DETAIL, 15 * DETAIL, 11 * DETAIL, '#5d8a64');

    r.rect(ix, horizon, iw, ih - (horizon - iy), '#7cb96c');
    r.rect(ix, horizon, iw, 2, '#a4d68c');
    r.rect(ix, horizon + 2, iw, 1, 'rgba(60,110,70,0.25)');

    // Fixed tufts, never random: a scattering that reshuffled every frame would
    // read as static rather than as grass.
    for (const [dx, dy] of TUFTS) {
      const tx = cx + dx, ty = horizon + dy;
      r.rect(tx, ty, 1, 3, '#6aa25e');
      r.rect(tx - 1, ty + 1, 1, 2, '#8ac47a');
      r.rect(tx + 1, ty + 1, 1, 2, '#8ac47a');
    }

    // A worn circle of earth: the trainer turns on the spot, and a plinth
    // explains why.
    r.ellipsePixel(cx * DETAIL, (feet + 1) * DETAIL, 20 * DETAIL, 6 * DETAIL, '#6da35f');
    r.ellipsePixel(cx * DETAIL, (feet + 1) * DETAIL, 18 * DETAIL, 5 * DETAIL, '#c4ab80');
    r.ellipsePixel(cx * DETAIL, (feet + 1) * DETAIL, 17 * DETAIL, 4 * DETAIL, '#d8c299');
    r.ellipsePixel(cx * DETAIL, (feet + 1) * DETAIL, 11 * DETAIL, 3 * DETAIL, 'rgba(60,45,30,0.32)');

    const sheet = getAppearanceSheet(this.app);
    const dir = DIRS[this.facing] as CharDir;
    const src = sheet.src(dir, this.step);
    const zc = this.zoom.getContext('2d')!;
    zc.imageSmoothingEnabled = false;
    zc.clearRect(0, 0, this.zoom.width, this.zoom.height);
    if (src.flip) {
      zc.save();
      zc.translate(this.zoom.width, 0);
      zc.scale(-1, 1);
    }
    zc.drawImage(sheet.canvas, src.x, src.y, src.w, src.h, 0, 0, this.zoom.width, this.zoom.height);
    if (src.flip) zc.restore();
    r.image(this.zoom, cx - CHAR_W / DETAIL, feet - CHAR_H);

    // Glass: a lit top edge and a shaded bottom one, which is what turns the
    // frame from a printed rectangle into a recess.
    r.pixel(ix * DETAIL, iy * DETAIL, iw * DETAIL, 2, 'rgba(20,28,48,0.30)');
    r.pixel(ix * DETAIL, (iy + ih) * DETAIL - 2, iw * DETAIL, 2, 'rgba(255,255,255,0.22)');
  }

  /**
   * Turn indicator.
   *
   * The preview rotates on its own, and without a mark for which way it is
   * facing a back view reads as a broken sprite rather than as a back view.
   */
  private renderCompass(r: Renderer, b: Box): void {
    r.rect(b.x, b.y, b.w, b.h, '#2b3450');
    r.outline(b.x, b.y, b.w, b.h, '#171d2e');
    r.pixel((b.x + 1) * DETAIL, (b.y + 1) * DETAIL, (b.w - 2) * DETAIL, 1, 'rgba(255,255,255,0.14)');

    const dir = DIRS[this.facing];
    const cx = b.x + Math.floor(b.w / 2);
    const cy = b.y + Math.floor(b.h / 2);
    const tint = (d: string): string => (dir === d ? GOLD : '#4f5c7e');

    // Heads sit hard against the four edges. Packed any closer together they
    // merge into one blob at this size -- the first version had them meeting a
    // centre pip and the whole thing read as a smudge.
    for (let i = 0; i < 3; i++) {
      r.rect(cx - i, b.y + 1 + i, 1 + i * 2, 1, tint('up'));
      r.rect(cx - i, b.y + b.h - 2 - i, 1 + i * 2, 1, tint('down'));
      r.rect(b.x + 1 + i, cy - i, 1, 1 + i * 2, tint('left'));
      r.rect(b.x + b.w - 2 - i, cy - i, 1, 1 + i * 2, tint('right'));
    }
    r.rect(cx, cy, 1, 1, '#7987ad');
  }

  private renderPlate(r: Renderer, p: Box): void {
    const live = this.typing;
    r.rect(p.x, p.y, p.w, p.h, live ? '#463522' : '#39445e');
    r.outline(p.x, p.y, p.w, p.h, live ? GOLD : '#171d2e');
    r.pixel((p.x + 1) * DETAIL, (p.y + 1) * DETAIL, (p.w - 2) * DETAIL, 1, 'rgba(255,255,255,0.16)');
    r.pixel((p.x + 1) * DETAIL, (p.y + p.h - 1) * DETAIL - 1, (p.w - 2) * DETAIL, 1, 'rgba(0,0,0,0.28)');

    const caret = live && Math.floor(this.t / 16) % 2 === 0 ? '_' : '';
    const shown = (this.playerName + caret) || (live ? ' ' : NO_NAME);
    r.text(shown, p.x + p.w / 2, p.y + 4, {
      color: this.playerName ? GOLD : (live ? '#c8a878' : '#93a2c0'),
      shadow: '#161c2c', align: 'center',
    });
  }

  /* -------------------------------------------------------------- list */

  private renderList(game: Game, r: Renderer, g: Layout, rows: Row[]): void {
    r.window(g.list.x, g.list.y, g.list.w, g.list.h);
    const input = game.input;

    for (let i = 0; i < g.visible && this.top + i < rows.length; i++) {
      const index = this.top + i;
      const row = rows[index];
      const y = g.rowsY + i * ROW_H;
      const textY = y + 2;
      const on = index === this.sel;
      const hover = input.mouseOver(g.bandX, y, g.bandW, ROW_H);

      if (row.action === 'begin') {
        this.renderBegin(r, g, y, on, hover);
        continue;
      }

      // The selected row is a solid bar rather than a tint, because a tint on a
      // white panel is invisible on half the monitors this will be played on.
      if (on) {
        r.rect(g.bandX, y, g.bandW, ROW_H, SEL_FILL);
        r.outline(g.bandX, y, g.bandW, ROW_H, SEL_EDGE);
        r.rect(g.bandX + 1, y + 1, g.bandW - 2, 1, SEL_TOP);
      } else if (hover) {
        r.rect(g.bandX, y, g.bandW, ROW_H, HOVER_FILL);
      }

      r.text(row.label, g.labelX, textY, {
        color: on ? GOLD : INK_SOFT,
        shadow: on ? SEL_EDGE : null,
      });

      if (row.action === 'name') {
        // No arrows to make room for, so the field takes the whole value span.
        const fx = g.leftX;
        const fw = g.rightX + ARROW_W - g.leftX;
        this.renderWell(r, fx, y + 1, fw, ROW_H - 2, on);
        const caret = this.typing && Math.floor(this.t / 16) % 2 === 0 ? '_' : '';
        const shown = (this.playerName + caret) || (this.typing ? '' : NAME_PROMPT);
        r.text(shown, fx + fw / 2, textY, {
          color: this.playerName || this.typing ? INK : '#7d8aa6',
          align: 'center',
        });
        continue;
      }

      const list = row.list!;
      const value = list[this.app[row.key!] % list.length];

      this.renderWell(r, g.wellX, y + 1, g.wellW, ROW_H - 2, on);
      r.text(value.name, g.wellX + WELL_PAD, textY, { color: on ? INK : '#2c3448' });
      // Only colour rows get a chip. The slot stays empty on the style rows --
      // an empty framed square on "Ponytail" reads as a broken glyph, and the
      // column stays aligned without one because the well was measured for it.
      if (value.c) {
        // 'None' carries a colour in the pack table, and a black square there
        // reads as a colour choice rather than as the absence of one.
        this.renderChip(r, g.wellX + g.wellW - WELL_PAD - CHIP_W, y + 2,
          value.name === 'None' ? null : value.c);
      }

      const held = this.flash && this.flash.frames > 0 ? this.flash.dir : 0;
      this.renderArrow(r, g.leftX, y + 1, -1, on,
        hover && input.mouseOver(g.leftX, y, ARROW_W, ROW_H),
        on && (held === -1 || input.down('left')));
      this.renderArrow(r, g.rightX, y + 1, 1, on,
        hover && input.mouseOver(g.rightX, y, ARROW_W, ROW_H),
        on && (held === 1 || input.down('right')));
    }

    this.renderTrack(r, g, rows.length);
  }

  private renderBegin(r: Renderer, g: Layout, y: number, on: boolean, hover: boolean): void {
    const x = g.labelX, w = g.rowW, h = ROW_H - 2;
    r.rect(x, y + 1, w, h, on ? '#4d9a5f' : (hover ? '#3b7c4c' : '#2f6a40'));
    r.outline(x, y + 1, w, h, on ? GOLD : '#16321f');
    r.rect(x + 1, y + 2, w - 2, 1, on ? '#8fdca4' : '#4e8f60');
    r.text(BEGIN_LABEL, x + w / 2, y + 2, {
      color: '#f2fff4', shadow: '#173023', align: 'center',
    });
  }

  /** A sunk, framed field. Text never sits straight on the panel fill. */
  private renderWell(r: Renderer, x: number, y: number, w: number, h: number, on: boolean): void {
    r.rect(x, y, w, h, on ? '#fbfcff' : '#e4e9f4');
    r.outline(x, y, w, h, on ? GOLD : '#a8b3ca');
    r.pixel((x + 1) * DETAIL, (y + 1) * DETAIL, (w - 2) * DETAIL, 1, 'rgba(40,50,70,0.26)');
    r.pixel((x + 1) * DETAIL, (y + h - 1) * DETAIL - 1, (w - 2) * DETAIL, 1, 'rgba(255,255,255,0.7)');
  }

  private renderChip(r: Renderer, x: number, y: number, colour: string | null): void {
    r.rect(x, y, CHIP_W, CHIP_H, colour ?? '#eef1f8');
    r.outline(x, y, CHIP_W, CHIP_H, FRAME);
    if (colour) {
      r.pixel((x + 1) * DETAIL, (y + 1) * DETAIL, (CHIP_W - 2) * DETAIL, 1, 'rgba(255,255,255,0.4)');
      r.pixel((x + 1) * DETAIL, (y + CHIP_H - 1) * DETAIL - 1, (CHIP_W - 2) * DETAIL, 1, 'rgba(0,0,0,0.25)');
    } else {
      // An empty slot with a slash through it, for the rows where the choice
      // itself is "no colour".
      for (let i = 0; i < 4; i++) r.rect(x + 1 + i, y + CHIP_H - 3 - i, 1, 1, '#aab4c9');
    }
  }

  /** A pressable button, not a character: it lifts, lights and sinks. */
  private renderArrow(
    r: Renderer, x: number, y: number, dir: -1 | 1, on: boolean, hot: boolean, down: boolean,
  ): void {
    const face = !on ? '#dbe1ee' : down ? '#e0a94e' : hot ? '#fff2cc' : '#f6f8fd';
    const edge = on ? FRAME : '#b3bccf';
    r.rect(x, y, ARROW_W, ARROW_H, face);
    r.outline(x, y, ARROW_W, ARROW_H, edge);
    r.pixel((x + 1) * DETAIL, (y + 1) * DETAIL, (ARROW_W - 2) * DETAIL, 1,
      down ? 'rgba(40,50,70,0.35)' : 'rgba(255,255,255,0.8)');

    const ink = on ? (down ? '#3a2a12' : FRAME) : '#8792ab';
    // The head sits one unit down while pressed; the button's inner rows are
    // y+1..y+8, so a 7-row head starts at y+1 and still has room to sink.
    const tx = x + 2;
    const ty = y + (down ? 2 : 1);
    for (let c = 0; c < 4; c++) {
      const col = dir < 0 ? tx + c : tx + 3 - c;
      r.rect(col, ty + 3 - c, 1, 1 + c * 2, ink);
    }
  }

  /**
   * Scroll bar.
   *
   * A track down the far edge, well clear of the value arrows: the marks used
   * to sit beside them, and a caret two units from a button looks like part of
   * the button.
   */
  private renderTrack(r: Renderer, g: Layout, count: number): void {
    const ty = g.rowsY - 2;
    const th = g.visible * ROW_H + 4;
    r.rect(g.trackX, ty, TRACK_W, th, '#d3dae9');
    r.outline(g.trackX, ty, TRACK_W, th, '#aeb8cf');

    const range = Math.max(0, count - g.visible);
    const thumbH = Math.max(10, Math.round(th * Math.min(1, g.visible / Math.max(1, count))));
    const thumbY = ty + (range === 0 ? 0 : Math.round((th - thumbH) * (this.top / range)));
    r.rect(g.trackX, thumbY, TRACK_W, thumbH, '#5a6a94');
    r.outline(g.trackX, thumbY, TRACK_W, thumbH, '#2c3552');
    r.pixel((g.trackX + 1) * DETAIL, (thumbY + 1) * DETAIL, (TRACK_W - 2) * DETAIL, 1,
      'rgba(255,255,255,0.45)');
  }

  private renderHint(r: Renderer, row: Row | undefined): void {
    const text = this.typing ? 'TYPE A NAME   ENTER ACCEPTS'
      : row?.action === 'begin' ? 'ENTER SETS OFF   ESC BACK'
        : row?.action === 'name' ? 'ENTER TO TYPE   ESC BACK'
          : 'A/D CHANGE   ENTER PICKS   ESC BACK';
    const w = r.textWidth(text);
    const cx = SCREEN_W / 2;
    r.rect(cx - w / 2 - 5, 148, w + 10, 11, 'rgba(10,14,26,0.45)');
    r.text(text, cx, 150, {
      color: this.typing ? GOLD : '#a9bcdc', shadow: '#141a2c', align: 'center',
    });
  }
}

/** Every value table, so the value column can be measured against all of them. */
const ALL_LISTS: readonly { name: string }[][] = [
  BUILDS, SKIN_TONES, HAIR_STYLES, HAIR_COLOURS, EYE_COLOURS, HAT_STYLES,
  JACKET_STYLES, CLOTH_COLOURS, TROUSER_COLOURS, SHOE_COLOURS, GLASSES_STYLES,
  PACK_COLOURS,
];

/** Grass, as offsets from the diorama's centre and horizon. Kept off the earth
 *  circle, which is painted over them. */
const TUFTS: readonly [number, number][] = [
  [-24, 6], [16, 3], [-30, 18], [26, 16], [-28, 32], [28, 30], [10, 8],
];

/** Blend two hex colours; used for the backdrop ramp and the diorama sky. */
function shade(from: string, to: string, t: number): string {
  const parse = (h: string): [number, number, number] => [
    parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16),
  ];
  const [r0, g0, b0] = parse(from);
  const [r1, g1, b1] = parse(to);
  const f = (a: number, b: number) =>
    Math.round(a + (b - a) * t).toString(16).padStart(2, '0');
  return `#${f(r0, r1)}${f(g0, g1)}${f(b0, b1)}`;
}
