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

    if (input.repeated('down')) { if (this.move(1)) result = 'move'; }
    else if (input.repeated('up')) { if (this.move(-1)) result = 'move'; }

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

  render(r: Renderer, x: number, y: number, w: number, style: MenuStyle = {}): void {
    const rowH = style.rowHeight ?? 12;
    const padX = style.padX ?? 10;
    const padY = style.padY ?? 4;
    const h = this.height(style);

    if (style.frame !== false) r.window(x, y, w, h);

    this.box = { x: x + 2, y: y + padY, w: w - 4, h: h - padY * 2, rowH };

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

      r.text(item.label, x + padX, ry, { color });

      if (item.detail) {
        r.text(item.detail, x + w - 6, ry, {
          color: disabled ? (style.disabledColor ?? '#9098a8') : (style.detailColor ?? '#485068'),
          align: 'right',
        });
      }
    }

    // Scroll affordances: without these a long list looks like a short one.
    if (this.scroll > 0) r.text('^^', x + w - 10, y + 1, { color: '#485068' });
    if (this.scroll + this.visible < this.items.length) {
      r.text('vv', x + w - 10, y + h - 9, { color: '#485068' });
    }
  }
}
