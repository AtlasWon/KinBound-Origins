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
}

const PANEL = { x: 6, y: 18, w: 82, h: 112 };
const LIST = { x: 94, y: 18, w: 140, h: 112 };
const ROW_H = 11;
const VISIBLE = Math.floor((LIST.h - 8) / ROW_H);

const NAME_MAX = 10;

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

  /* ------------------------------------------------------------- rows */

  private rows(): Row[] {
    const out: Row[] = [
      { label: 'Body', key: 'build', list: BUILDS },
      { label: 'Skin', key: 'skin', list: SKIN_TONES },
      { label: 'Hair', key: 'hairStyle', list: HAIR_STYLES },
      { label: 'Hair hue', key: 'hairColour', list: HAIR_COLOURS },
      { label: 'Eyes', key: 'eyes', list: EYE_COLOURS },
      { label: 'Hat', key: 'hat', list: HAT_STYLES },
    ];
    // Colour rows only exist while there is something to colour: an option that
    // does nothing is worse than no option.
    if (HAT_STYLES[this.app.hat % HAT_STYLES.length]!.style) {
      out.push({ label: 'Hat hue', key: 'hatColour', list: CLOTH_COLOURS });
    }
    out.push({ label: 'Jacket', key: 'jacket', list: JACKET_STYLES });
    if (JACKET_STYLES[this.app.jacket % JACKET_STYLES.length]!.style) {
      out.push({ label: 'Jacket hue', key: 'jacketColour', list: CLOTH_COLOURS });
    }
    out.push(
      { label: 'Shirt', key: 'shirt', list: CLOTH_COLOURS },
      { label: 'Trousers', key: 'trousers', list: TROUSER_COLOURS },
      { label: 'Shoes', key: 'shoes', list: SHOE_COLOURS },
      { label: 'Glasses', key: 'glasses', list: GLASSES_STYLES },
      { label: 'Pack', key: 'pack', list: PACK_COLOURS },
      { label: 'Name', action: 'name' },
      { label: 'Begin', action: 'begin' },
    );
    return out;
  }

  private nudge(row: Row, delta: number): void {
    if (!row.key || !row.list) return;
    const len = row.list.length;
    const next = (((this.app[row.key] + delta) % len) + len) % len;
    this.app[row.key] = next;
    audio.playSfx('select', { volume: 0.5 });
  }

  /* ------------------------------------------------------------ update */

  update(game: Game, _dt: number): void {
    this.t++;
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

    const rows = this.rows();
    const row = rows[Math.min(this.sel, rows.length - 1)]!;

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

    this.mouse(game, rows);

    // Keep the cursor inside the visible window.
    if (this.sel < this.top) this.top = this.sel;
    if (this.sel >= this.top + VISIBLE) this.top = this.sel - VISIBLE + 1;
    this.top = Math.max(0, Math.min(this.top, Math.max(0, rows.length - VISIBLE)));
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
    if (game.input.keyPressed('Enter') || game.input.keyPressed('NumpadEnter')
      || game.input.keyPressed('Escape') || game.input.keyPressed('Tab')) {
      this.typing = false;
      audio.playSfx('confirm', { volume: 0.5 });
    }
  }

  private mouse(game: Game, rows: Row[]): void {
    const input = game.input;
    for (let i = 0; i < VISIBLE && this.top + i < rows.length; i++) {
      const index = this.top + i;
      const y = LIST.y + 4 + i * ROW_H;
      if (input.clicked(LIST.x + 2, y, LIST.w - 4, ROW_H)) {
        const row = rows[index]!;
        this.sel = index;
        // The arrows are live targets, so a click on one changes the value
        // rather than only moving the cursor to its row.
        if (input.mouse.x >= LIST.x + LIST.w - 14) this.nudge(row, 1);
        else if (input.mouse.x >= LIST.x + LIST.w - 74 && row.list) this.nudge(row, -1);
        else if (row.action === 'begin') this.leave();
        else if (row.action === 'name') this.typing = true;
      }
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
    r.clear('#10162a');
    // A quiet backdrop: this screen is about the character, not the wallpaper.
    for (let i = 0; i < 10; i++) {
      const t = i / 9;
      r.rect(0, Math.round(i * (SCREEN_H / 10)), SCREEN_W, Math.ceil(SCREEN_H / 10) + 1,
        shade('#1b2340', '#39406b', t));
    }
    for (let i = 0; i < 5; i++) {
      const y = 22 + i * 32;
      r.rect(0, y, SCREEN_W, 1, 'rgba(255,255,255,0.03)');
    }

    r.text('CREATE YOUR TRAINER', SCREEN_W / 2, 6, {
      color: '#ffd88c', shadow: '#241c28', align: 'center',
    });

    this.renderPreview(r);
    this.renderList(game, r);

    const hint = this.typing
      ? 'TYPE A NAME   ENTER ACCEPTS'
      : 'A/D CHANGE   ENTER PICKS   ESC BACK';
    r.text(hint, SCREEN_W / 2, SCREEN_H - 10, {
      color: '#9fb4d8', shadow: '#141a2c', align: 'center',
    });

    if (this.fade > 0) r.tint('#000000', this.fade);
  }

  private renderPreview(r: Renderer): void {
    r.window(PANEL.x, PANEL.y, PANEL.w, PANEL.h);

    const ix = PANEL.x + 3, iy = PANEL.y + 3;
    const iw = PANEL.w - 6, ih = PANEL.h - 20;
    // A scrap of world to stand in, so the figure is lit rather than floating.
    for (let i = 0; i < 6; i++) {
      r.rect(ix, iy + i * Math.ceil(ih * 0.5 / 6), iw, Math.ceil(ih * 0.5 / 6) + 1,
        shade('#9fd0ee', '#cfe4f2', i / 5));
    }
    const groundY = iy + Math.round(ih * 0.5);
    r.rect(ix, groundY, iw, ih - Math.round(ih * 0.5), '#8cc47c');
    r.rect(ix, groundY, iw, 2, '#a4d68c');
    r.rect(ix, groundY + 10, iw, 1, 'rgba(60,110,70,0.35)');

    const cx = ix + iw / 2;
    const feet = iy + ih - 6;
    r.ellipsePixel((cx) * DETAIL, (feet + 1) * DETAIL, 11 * DETAIL, 3 * DETAIL, 'rgba(30,60,40,0.30)');

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

    // Name plate.
    const plateY = PANEL.y + PANEL.h - 15;
    r.rect(PANEL.x + 3, plateY, PANEL.w - 6, 12, '#232a3d');
    r.rect(PANEL.x + 4, plateY + 1, PANEL.w - 8, 10, '#39445e');
    const shown = this.playerName || (this.typing ? '' : 'NO NAME YET');
    r.text(shown || ' ', PANEL.x + PANEL.w / 2, plateY + 3, {
      color: this.playerName ? '#ffe9b0' : '#93a2c0',
      shadow: '#161c2c', align: 'center',
    });
  }

  private renderList(game: Game, r: Renderer): void {
    r.window(LIST.x, LIST.y, LIST.w, LIST.h);
    const rows = this.rows();
    if (this.sel >= rows.length) this.sel = rows.length - 1;

    for (let i = 0; i < VISIBLE && this.top + i < rows.length; i++) {
      const index = this.top + i;
      const row = rows[index]!;
      const y = LIST.y + 4 + i * ROW_H;
      const on = index === this.sel;
      const hover = game.input.mouseOver(LIST.x + 2, y, LIST.w - 4, ROW_H);

      if (on) r.rect(LIST.x + 3, y - 1, LIST.w - 6, ROW_H, '#dbe4f4');
      else if (hover) r.rect(LIST.x + 3, y - 1, LIST.w - 6, ROW_H, '#eaeff8');

      if (row.action === 'begin') {
        const bw = LIST.w - 12;
        r.rect(LIST.x + 6, y - 1, bw, ROW_H, on ? '#3f8a52' : '#2f6a40');
        r.rect(LIST.x + 6, y - 1, bw, 1, on ? '#7fd095' : '#4e8f60');
        r.text('BEGIN YOUR JOURNEY', LIST.x + 6 + bw / 2, y + 1, {
          color: '#f2fff4', shadow: '#173023', align: 'center',
        });
        continue;
      }

      r.text(row.label, LIST.x + 7, y + 1, { color: on ? '#1c2233' : '#3d465e' });

      const valueX = LIST.x + LIST.w - 66;
      const valueW = 52;

      if (row.action === 'name') {
        const caret = this.typing && Math.floor(this.t / 16) % 2 === 0 ? '_' : '';
        const text = (this.playerName + caret) || (this.typing ? '_' : 'PRESS ENTER');
        r.text(text, valueX + valueW / 2, y + 1, {
          color: this.typing ? '#a8442f' : '#2c3448', align: 'center',
        });
        continue;
      }

      const list = row.list!;
      const value = list[this.app[row.key!] % list.length]!;

      // Arrows only where there is somewhere to go, which is always here, but
      // dimmed when the row is not the one being edited.
      r.text('<', valueX - 7, y + 1, { color: on ? '#1c2233' : '#8792ab' });
      r.text('>', LIST.x + LIST.w - 12, y + 1, { color: on ? '#1c2233' : '#8792ab' });

      let textX = valueX + valueW / 2;
      if (value.c) {
        // Swatch, framed so a pale colour still has an edge.
        const sx = valueX + 1;
        r.rect(sx, y, 10, 8, '#232a3d');
        r.rect(sx + 1, y + 1, 8, 6, value.c);
        r.rect(sx + 1, y + 1, 8, 1, 'rgba(255,255,255,0.35)');
        textX = sx + 12 + (valueW - 14) / 2;
      }
      r.text(value.name, textX, y + 1, { color: on ? '#1c2233' : '#3d465e', align: 'center' });
    }

    // Scroll hints, drawn only when there is more list than window.
    if (this.top > 0) {
      r.text('^', LIST.x + LIST.w / 2, LIST.y - 1, { color: '#8792ab', align: 'center' });
    }
    if (this.top + VISIBLE < rows.length) {
      r.text('v', LIST.x + LIST.w / 2, LIST.y + LIST.h - 6, { color: '#8792ab', align: 'center' });
    }
  }
}

/** Blend two hex colours; used for the backdrop ramp. */
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
