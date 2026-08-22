/**
 * The Roost (storage).
 *
 * A 6x5 grid of boxes beside the live party, driven by a single "held kin"
 * cursor: pick one up, put it down somewhere else. That one interaction covers
 * deposit, withdraw, reorder and swap without a mode menu, which is the thing
 * that made the original storage systems so tedious.
 *
 * The rule the screen enforces: you may never leave with an empty party.
 */

import type { Game } from '../core/game.js';
import type { Scene } from '../core/scene.js';
import { Renderer, SCREEN_H, SCREEN_W } from '../engine/renderer.js';
import { iconSprite } from '../gfx/kinsprite.js';
import { registry } from '../data/registry.js';
import { say } from '../ui/dialogue.js';
import { audio } from '../audio/audio.js';
import type { GameState } from '../systems/state.js';
import type { Kin } from '../systems/kin.js';

const COLS = 6;
const ROWS = 5;
const BOX_SLOTS = COLS * ROWS;

// Laid out for 240x160: party column on the left, 6x5 grid on the right, a
// one-line detail strip under the grid and a status bar along the bottom.
const GRID = { x: 74, y: 22, cellW: 27, cellH: 21 };
const PARTY_X = 4;
const PARTY_Y = 22;
const PARTY_CELL = 20;
const DETAIL_Y = 129;
const STATUS_Y = 143;

type Region = 'box' | 'party';

export class RoostScene implements Scene {
  readonly name = 'roost';
  readonly transparent = true;

  private box = 0;
  private region: Region = 'box';
  private cursor = 0;
  private held: Kin | null = null;
  private message = 'Enter to pick up or place. Esc to leave.';

  constructor(private state: GameState) {}

  private get slots(): (Kin | null)[] {
    return this.state.boxes[this.box]!;
  }

  /* --------------------------------------------------------------- input */

  update(game: Game, _dt: number): void {
    const i = game.input;

    if (i.pressed('nextTab')) { this.box = (this.box + 1) % this.state.boxes.length; return; }
    if (i.pressed('prevTab')) {
      this.box = (this.box + this.state.boxes.length - 1) % this.state.boxes.length;
      return;
    }

    this.updatePointer(game);

    if (this.region === 'box') this.moveInBox(i);
    else this.moveInParty(i);

    if (i.pressed('confirm')) this.act(game);
    if (i.pressed('cancel')) this.leave(game);
  }

  private moveInBox(i: Game['input']): void {
    const col = this.cursor % COLS;
    const row = Math.floor(this.cursor / COLS);
    if (i.repeated('right')) this.cursor = row * COLS + Math.min(COLS - 1, col + 1);
    if (i.repeated('left')) {
      if (col === 0) { this.region = 'party'; this.cursor = Math.min(row, 5); }
      else this.cursor = row * COLS + col - 1;
    }
    if (i.repeated('down')) this.cursor = (Math.min(ROWS - 1, row + 1)) * COLS + col;
    if (i.repeated('up')) this.cursor = (Math.max(0, row - 1)) * COLS + col;
  }

  private moveInParty(i: Game['input']): void {
    if (i.repeated('down')) this.cursor = Math.min(5, this.cursor + 1);
    if (i.repeated('up')) this.cursor = Math.max(0, this.cursor - 1);
    if (i.repeated('right')) { this.region = 'box'; this.cursor = Math.min(BOX_SLOTS - 1, this.cursor * COLS); }
  }

  private updatePointer(game: Game): void {
    const m = game.input.mouse;
    if (!m.inside) return;

    for (let s = 0; s < BOX_SLOTS; s++) {
      const { x, y } = this.slotPos(s);
      if (game.input.mouseOver(x, y, GRID.cellW - 2, GRID.cellH - 2)) {
        if (m.idleFrames < 2) { this.region = 'box'; this.cursor = s; }
        if (m.leftPressed) { this.region = 'box'; this.cursor = s; this.act(game); }
        return;
      }
    }
    for (let s = 0; s < 6; s++) {
      const y = PARTY_Y + s * PARTY_CELL;
      if (game.input.mouseOver(PARTY_X, y, 66, PARTY_CELL - 2)) {
        if (m.idleFrames < 2) { this.region = 'party'; this.cursor = s; }
        if (m.leftPressed) { this.region = 'party'; this.cursor = s; this.act(game); }
        return;
      }
    }
  }

  /* -------------------------------------------------------------- action */

  /** One button does everything: pick up if empty-handed, otherwise put down. */
  private act(game: Game): void {
    if (this.region === 'box') this.actBox(game);
    else this.actParty(game);
  }

  private actBox(_game: Game): void {
    const slots = this.slots;
    const at = slots[this.cursor] ?? null;

    if (this.held) {
      slots[this.cursor] = this.held;
      this.held = at;
      audio.playSfx('confirm');
      this.message = at ? `Swapped for ${at.name}.` : 'Stored.';
    } else if (at) {
      slots[this.cursor] = null;
      this.held = at;
      audio.playSfx('select');
      this.message = `Holding ${at.name}.`;
    } else {
      this.message = 'Nothing there.';
    }
  }

  private actParty(game: Game): void {
    const party = this.state.party;
    const at = party[this.cursor] ?? null;

    if (this.held) {
      if (at) {
        party[this.cursor] = this.held;
        this.held = at;
        this.message = `Swapped for ${at.name}.`;
      } else {
        if (party.length >= 6) { this.message = 'The party is full.'; return; }
        party.push(this.held);
        this.message = `${this.held.name} joined the party.`;
        this.held = null;
      }
      audio.playSfx('confirm');
      return;
    }

    if (!at) { this.message = 'Nothing there.'; return; }
    // Refuse to strip the party down to nothing.
    if (party.filter((k) => k).length <= 1) {
      say(game, ['You cannot walk out of here with nothing.']);
      return;
    }
    party.splice(this.cursor, 1);
    this.held = at;
    audio.playSfx('select');
    this.message = `Holding ${at.name}.`;
  }

  private leave(game: Game): void {
    if (this.held) {
      // Never silently drop the kin in hand: put it back somewhere real.
      const free = this.slots.findIndex((s) => s === null);
      if (free >= 0) this.slots[free] = this.held;
      else if (this.state.party.length < 6) this.state.party.push(this.held);
      else {
        say(game, ['Put that one down first.']);
        return;
      }
      this.held = null;
    }
    if (this.state.party.length === 0) {
      say(game, ['You need at least one kin with you.']);
      return;
    }
    audio.playSfx('cancel');
    game.scenes.pop();
  }

  private slotPos(s: number): { x: number; y: number } {
    return {
      x: GRID.x + (s % COLS) * GRID.cellW,
      y: GRID.y + Math.floor(s / COLS) * GRID.cellH,
    };
  }

  /* -------------------------------------------------------------- render */

  render(game: Game, r: Renderer): void {
    r.clear('#2b3242');
    for (let y = 0; y < SCREEN_H; y += 4) r.rect(0, y, SCREEN_W, 1, '#313a4c');

    // Box header, with paging arrows the mouse can also use.
    r.window(GRID.x - 2, 2, SCREEN_W - GRID.x - 2, 16, { fill: '#e8eefa' });
    r.text('<', GRID.x + 3, 7, { color: '#485068' });
    r.text(this.state.boxNames[this.box] ?? `BOX ${this.box + 1}`,
      GRID.x + (SCREEN_W - GRID.x) / 2 - 2, 7, { color: '#282838', align: 'center' });
    r.text('>', SCREEN_W - 7, 7, { color: '#485068', align: 'right' });

    for (let s = 0; s < BOX_SLOTS; s++) {
      const { x, y } = this.slotPos(s);
      const kin = this.slots[s];
      const selected = this.region === 'box' && s === this.cursor;
      r.rect(x, y, GRID.cellW - 2, GRID.cellH - 2, selected ? '#4e5c7c' : '#3a4358');
      r.outline(x, y, GRID.cellW - 2, GRID.cellH - 2, selected ? '#c8d8f0' : '#2a3040');
      // Icons are cropped rather than scaled so they stay on the pixel grid.
      if (kin) r.image(iconSprite(kin.species), x - 3, y - 1, 0, 16, 64, 38);
    }

    r.window(PARTY_X - 2, 2, 68, 16, { fill: '#e8eefa' });
    r.text('PARTY', PARTY_X + 4, 7, { color: '#282838' });
    for (let s = 0; s < 6; s++) {
      const y = PARTY_Y + s * PARTY_CELL;
      const kin = this.state.party[s];
      const selected = this.region === 'party' && s === this.cursor;
      r.rect(PARTY_X, y, 66, PARTY_CELL - 2, selected ? '#4e5c7c' : '#3a4358');
      r.outline(PARTY_X, y, 66, PARTY_CELL - 2, selected ? '#c8d8f0' : '#2a3040');
      if (kin) {
        r.image(iconSprite(kin.species), PARTY_X - 2, y - 1, 0, 18, 48, 36);
        r.text(kin.name.slice(0, 7), PARTY_X + 25, y + 1, { color: '#e0e6f4' });
        r.text(`Lv${kin.level}`, PARTY_X + 25, y + 9, { color: '#9aa8c4' });
      }
    }

    this.renderDetail(r);

    r.window(2, STATUS_Y, SCREEN_W - 4, SCREEN_H - STATUS_Y - 2);
    r.text(this.message, 8, STATUS_Y + 5, { color: '#282838', maxWidth: 190 });
    if (this.held) r.image(iconSprite(this.held.species), SCREEN_W - 30, STATUS_Y - 6, 0, 8, 56, 48);
    void game;
  }

  /** One-line summary strip beneath the grid. */
  private renderDetail(r: Renderer): void {
    const kin = this.region === 'box'
      ? this.slots[this.cursor]
      : this.state.party[this.cursor];

    r.window(GRID.x - 2, DETAIL_Y, SCREEN_W - GRID.x - 2, 12, { fill: '#e8eefa' });
    if (!kin) {
      r.text('empty', GRID.x + 4, DETAIL_Y + 3, { color: '#9098a8' });
      return;
    }
    r.text(`${kin.name}  Lv${kin.level}`, GRID.x + 4, DETAIL_Y + 3, { color: '#282838' });

    let tx = SCREEN_W - 6;
    for (const t of [...kin.types].reverse()) {
      const meta = registry.typeChart?.meta?.[t];
      const w = 30;
      r.rect(tx - w, DETAIL_Y + 2, w, 8, meta?.color ?? '#888');
      r.outline(tx - w, DETAIL_Y + 2, w, 8, '#282838');
      r.text((meta?.name ?? t).toUpperCase().slice(0, 4), tx - w + 2, DETAIL_Y + 2, { color: '#ffffff' });
      tx -= w + 2;
    }
  }
}
