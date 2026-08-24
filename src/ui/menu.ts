/**
 * List menu.
 *
 * The workhorse widget: every list in the game (title, bag, party, moves, shop,
 * storage, settings) is built on it, so keyboard and mouse behave identically
 * everywhere. Hovering moves the cursor, clicking confirms, the wheel scrolls,
 * and holding a direction auto-repeats.
 */

import type { Game } from '../core/game.js';
import type { Renderer } from '../engine/renderer.js';
import { audio } from '../audio/audio.js';
import { fit, GAP } from './layout.js';

export interface MenuItem<T = unknown> {
  label: string;
  value?: T;
  /** Right-aligned secondary text, e.g. a price or a count. */
  detail?: string;
  /** Longer description shown by the owning screen. */
  hint?: string;
  enabled?: boolean;
  color?: string;
}

export type MenuResult = 'none' | 'select' | 'cancel' | 'move';

/**
 * Arrow keys and WASD always walk a list, whatever the bindings say.
 *
 * Both sets ship bound to `up`/`down`, so normally the action layer already
 * covers this. The reason it is also wired to the raw keys is the controls
 * screen: rebinding "Move up" replaces the binding outright, so a player who
 * assigns it to the Up arrow loses W -- and one who assigns W to something else
 * can be left with no way to move the cursor at all, including the cursor they
 * would need to reach "Reset to defaults". Reading the physical keys as well
 * means these four can never be taken away from the menus.
 *
 * The action is checked first and the raw key is only consulted when that
 * direction is not currently held, so a key that *is* bound moves the cursor
 * once rather than twice.
 */
const RAW_UP = ['ArrowUp', 'KeyW'];
const RAW_DOWN = ['ArrowDown', 'KeyS'];
const RAW_LEFT = ['ArrowLeft', 'KeyA'];
const RAW_RIGHT = ['ArrowRight', 'KeyD'];

function raw(game: Game, action: 'up' | 'down' | 'left' | 'right', codes: string[]): boolean {
  if (game.input.down(action)) return false;
  return codes.some((c) => game.input.keyPressed(c));
}

/** Repeat-aware "the player asked to go up", arrows and WASD included. */
export function navUp(game: Game): boolean {
  return game.input.repeated('up') || raw(game, 'up', RAW_UP);
}

export function navDown(game: Game): boolean {
  return game.input.repeated('down') || raw(game, 'down', RAW_DOWN);
}

export function navLeft(game: Game): boolean {
  return game.input.repeated('left') || raw(game, 'left', RAW_LEFT);
}

export function navRight(game: Game): boolean {
  return game.input.repeated('right') || raw(game, 'right', RAW_RIGHT);
}

export interface MenuStyle {
  rowHeight?: number;
  padX?: number;
  padY?: number;
  color?: string;
  disabledColor?: string;
  detailColor?: string;
  selectedColor?: string;
  /** Draw the window frame behind the list. */
  frame?: boolean;
  /** Highlight bar behind the selected row instead of an arrow cursor. */
  highlightBar?: boolean;
  barColor?: string;
}

export class ListMenu<T = unknown> {
  index = 0;
  scroll = 0;
  items: MenuItem<T>[];
  /** How many rows are visible; set by the owner or derived from height. */
  visible: number;
  /** Wrap from the bottom back to the top. */
  wrap = true;
  /** Last-hovered row, for pointer feedback. */
  hovered = -1;

  /** Layout captured on the last render, so update() can hit-test. */
  private box = { x: 0, y: 0, w: 0, h: 0, rowH: 12 };

  constructor(items: MenuItem<T>[] = [], visible = 6) {
    this.items = items;
    this.visible = visible;
    // Snap off any disabled first row straight away, so a menu built already
    // in that state behaves the same as one rebuilt into it.
    this.clampIndex();
  }

  setItems(items: MenuItem<T>[], keepIndex = false): void {
    this.items = items;
    if (!keepIndex) { this.index = 0; this.scroll = 0; }
    this.clampIndex();
  }

  get selected(): MenuItem<T> | undefined {
    return this.items[this.index];
  }

  get selectedValue(): T | undefined {
    return this.items[this.index]?.value;
  }

  private clampIndex(): void {
    if (this.items.length === 0) { this.index = 0; this.scroll = 0; return; }
    this.index = Math.max(0, Math.min(this.items.length - 1, this.index));

    // Never leave the cursor parked on a row that cannot be chosen. A forced
    // party switch rebuilds this list with the fainted lead disabled, and a
    // cursor stuck there would leave the player pressing Confirm at nothing.
    if (this.items[this.index]!.enabled === false) {
      const usable = this.items.findIndex((it) => it.enabled !== false);
      if (usable >= 0) {
        let best = usable;
        let bestDist = Math.abs(usable - this.index);
        this.items.forEach((it, i) => {
          if (it.enabled === false) return;
          const dist = Math.abs(i - this.index);
          if (dist < bestDist) { bestDist = dist; best = i; }
        });
        this.index = best;
      }
    }

    if (this.index < this.scroll) this.scroll = this.index;
    if (this.index >= this.scroll + this.visible) this.scroll = this.index - this.visible + 1;
    this.scroll = Math.max(0, Math.min(Math.max(0, this.items.length - this.visible), this.scroll));
  }

  /** Move by delta, skipping disabled rows. */
  move(delta: number): boolean {
    if (this.items.length === 0) return false;
    const start = this.index;
    let i = this.index;
    for (let guard = 0; guard < this.items.length; guard++) {
      i += delta;
      if (i < 0) {
        if (!this.wrap) { i = 0; break; }
        i = this.items.length - 1;
      }
      if (i >= this.items.length) {
        if (!this.wrap) { i = this.items.length - 1; break; }
        i = 0;
      }
      if (this.items[i]!.enabled !== false) break;
    }
    this.index = i;
    this.clampIndex();
    return this.index !== start;
  }

  update(game: Game): MenuResult {
    const input = game.input;
    let result: MenuResult = 'none';

    if (this.items.length === 0) {
      if (input.pressed('cancel')) return 'cancel';
      return 'none';
    }

    if (navDown(game)) { if (this.move(1)) result = 'move'; }
    else if (navUp(game)) { if (this.move(-1)) result = 'move'; }

    // Page jumps: the wheel and the shoulder buttons move a screenful.
    if (input.mouse.wheel !== 0) {
      const before = this.index;
      this.index = Math.max(0, Math.min(this.items.length - 1, this.index + input.mouse.wheel));
      this.clampIndex();
      if (this.index !== before) result = 'move';
    }

    // Pointer: hovering a row selects it, so clicking never picks the wrong one.
    this.hovered = -1;
    if (input.mouse.inside && this.box.w > 0) {
      for (let row = 0; row < this.visible; row++) {
        const i = this.scroll + row;
        if (i >= this.items.length) break;
        const ry = this.box.y + row * this.box.rowH;
        if (input.mouseOver(this.box.x, ry, this.box.w, this.box.rowH)) {
          this.hovered = i;
          if (input.mouse.idleFrames < 2 && this.items[i]!.enabled !== false && this.index !== i) {
            this.index = i;
            result = 'move';
          }
          if (input.mouse.leftPressed) {
            if (this.items[i]!.enabled !== false) {
              this.index = i;
              return 'select';
            }
          }
          break;
        }
      }
      if (input.mouse.rightPressed) return 'cancel';
    }

    if (input.pressed('confirm')) {
      if (this.selected?.enabled !== false) { audio.playSfx('confirm'); return 'select'; }
      audio.playSfx('denied');
    }
    if (input.pressed('cancel')) { audio.playSfx('cancel'); return 'cancel'; }

    if (result === 'move') audio.playSfx('select');
    return result;
  }

  /** Height needed to show `visible` rows including the frame. */
  height(style: MenuStyle = {}): number {
    const rowH = style.rowHeight ?? 12;
    const padY = style.padY ?? 4;
    return this.visible * rowH + padY * 2;
  }

  /**
   * Set `visible` to the most rows that fit in `availH`, and report the height
   * the list will then draw at.
   *
   * Every list in the game used to be told how many rows to show by a number
   * someone typed, and the options screen's number was wrong: ten rows of 12
   * came to 128 units in a slot 116 tall, so the last row was sliced by its own
   * frame and the one under it. Asking the box how much room there is cannot
   * get that wrong.
   */
  fitTo(availH: number, style: MenuStyle = {}): number {
    const rowH = style.rowHeight ?? 12;
    const padY = style.padY ?? 4;
    this.visible = Math.max(1, Math.floor((availH - padY * 2) / rowH));
    this.clampIndex();
    return this.height(style);
  }

  /** True when the list is longer than the window, so arrows will be drawn. */
  get scrollable(): boolean {
    return this.items.length > this.visible;
  }

  render(r: Renderer, x: number, y: number, w: number, style: MenuStyle = {}): void {
    const rowH = style.rowHeight ?? 12;
    const padX = style.padX ?? 10;
    const padY = style.padY ?? 4;
    const h = this.height(style);

    if (style.frame !== false) r.window(x, y, w, h);

    this.box = { x: x + 2, y: y + padY, w: w - 4, h: h - padY * 2, rowH };

    // The right-hand column. A scrolling list draws arrows over on the right,
    // and they used to land on top of the first and last rows' detail -- the
    // bag showed "x9v" where it meant "x99". Reserving the gutter for the whole
    // list keeps the value column in one place as the player scrolls, which
    // matters more than the eight units it costs.
    const gutter = this.scrollable ? 10 : 0;
    const rightEdge = x + w - 5 - gutter;
    const labelX = x + padX;

    const count = Math.min(this.visible, this.items.length);
    for (let row = 0; row < count; row++) {
      const i = this.scroll + row;
      const item = this.items[i];
      if (!item) break;
      const ry = y + padY + row * rowH;
      const isSel = i === this.index;

      if (isSel && style.highlightBar) {
        r.rect(x + 2, ry - 1, w - 4, rowH, style.barColor ?? '#c8d8f0');
      }
      if (isSel && !style.highlightBar) {
        r.cursor(x + 3, ry, style.selectedColor ?? '#282838');
      }

      const disabled = item.enabled === false;
      const color = disabled
        ? (style.disabledColor ?? '#9098a8')
        : (item.color ?? style.color ?? '#282838');

      // The value keeps its space and the label gives way. A shortened name is
      // still recognisable; a shortened price is wrong.
      const detail = item.detail ?? '';
      const detailW = detail ? r.textWidth(detail) : 0;
      const labelMax = rightEdge - labelX - (detailW ? detailW + GAP : 0);
      r.text(fit(r, item.label, labelMax), labelX, ry, { color });

      if (detail) {
        r.text(detail, rightEdge, ry, {
          color: disabled ? (style.disabledColor ?? '#9098a8') : (style.detailColor ?? '#485068'),
          align: 'right',
        });
      }
    }

    // Scroll affordances: without these a long list looks like a short one.
    // They live in the gutter reserved above, so they never sit on a value.
    if (gutter > 0) {
      const ax = x + w - 9;
      if (this.scroll > 0) r.text('^^', ax, y + 2, { color: '#485068' });
      if (this.scroll + this.visible < this.items.length) {
        r.text('vv', ax, y + h - 9, { color: '#485068' });
      }
    }
  }
}
