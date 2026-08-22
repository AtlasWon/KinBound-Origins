/**
 * Party screen.
 *
 * Six cards rather than a list: at a glance the player needs species, level, HP
 * and status for all six at once, and a list of names cannot give them that.
 * Doubles as a picker (for items and forced switches) via `pickMode`.
 */

import type { Game } from '../core/game.js';
import type { Scene } from '../core/scene.js';
import { Renderer, SCREEN_H, SCREEN_W } from '../engine/renderer.js';
import { iconSprite, frontSprite } from '../gfx/kinsprite.js';
import { registry } from '../data/registry.js';
import { ListMenu } from '../ui/menu.js';
import { say } from '../ui/dialogue.js';
import type { GameState } from '../systems/state.js';
import type { Kin } from '../systems/kin.js';
import { expForLevel } from '../battle/formulas.js';
import type { StatusId } from '../data/schema.js';

const CARD = { w: 108, h: 25 };

export class PartyScene implements Scene {
  readonly name = 'party';
  readonly transparent = true;

  private index = 0;
  private swapFrom = -1;
  private action: ListMenu<string> | null = null;
  private message = '';

  constructor(
    private state: GameState,
    private pickMode: { prompt: string; onPick: (index: number) => void } | null = null,
  ) {}

  enter(): void {
    this.message = this.pickMode?.prompt ?? 'Choose a kin.';
  }

  resume(): void {
    this.action = null;
  }

  private get party(): Kin[] {
    return this.state.party;
  }

  private cardRect(i: number): { x: number; y: number; w: number; h: number } {
    // The lead sits alone on the left with a full portrait; the other five
    // stack on the right, which makes "who is out front" unmissable.
    if (i === 0) return { x: 4, y: 4, w: CARD.w, h: 86 };
    const row = i - 1;
    return { x: SCREEN_W - CARD.w - 4, y: 4 + row * 26, w: CARD.w, h: 25 };
  }

  update(game: Game, _dt: number): void {
    if (this.action) {
      const res = this.action.update(game);
      if (res === 'cancel') { this.action = null; return; }
      if (res === 'select') {
        const choice = this.action.selectedValue;
        this.action = null;
        this.runAction(game, choice ?? '');
      }
      return;
    }

    const n = this.party.length;
    if (n === 0) { if (game.input.pressed('cancel')) game.scenes.pop(); return; }

    // Pointer selection over the cards.
    for (let i = 0; i < n; i++) {
      const c = this.cardRect(i);
      if (game.input.mouseOver(c.x, c.y, c.w, c.h)) {
        if (game.input.mouse.idleFrames < 2) this.index = i;
        if (game.input.mouse.leftPressed) { this.index = i; this.confirm(game); return; }
      }
    }

    if (game.input.repeated('down')) this.index = (this.index + 1) % n;
    if (game.input.repeated('up')) this.index = (this.index - 1 + n) % n;
    // Left/right hop between the lead column and the bench column.
    if (game.input.pressed('left')) this.index = 0;
    if (game.input.pressed('right') && n > 1 && this.index === 0) this.index = 1;

    if (game.input.pressed('confirm')) { this.confirm(game); return; }
    if (game.input.pressed('cancel') || game.input.pressed('party')) {
      if (this.swapFrom >= 0) { this.swapFrom = -1; this.message = 'Choose a kin.'; return; }
      game.scenes.pop();
    }
  }

  private confirm(game: Game): void {
    if (this.pickMode) {
      this.pickMode.onPick(this.index);
      game.scenes.pop();
      return;
    }
    if (this.swapFrom >= 0) {
      if (this.swapFrom !== this.index) {
        const a = this.party[this.swapFrom]!;
        this.party[this.swapFrom] = this.party[this.index]!;
        this.party[this.index] = a;
      }
      this.swapFrom = -1;
      this.message = 'Choose a kin.';
      return;
    }
    this.action = new ListMenu<string>([
      { label: 'SUMMARY', value: 'summary' },
      { label: 'SWITCH', value: 'switch', enabled: this.party.length > 1 },
      { label: 'MOVES', value: 'moves' },
      { label: 'CANCEL', value: 'cancel' },
    ], 4);
  }

  private runAction(game: Game, choice: string): void {
    const kin = this.party[this.index];
    if (!kin) return;
    switch (choice) {
      case 'summary':
        game.scenes.push(new SummaryScene(kin));
        break;
      case 'switch':
        this.swapFrom = this.index;
        this.message = 'Move it where?';
        break;
      case 'moves': {
        const lines = kin.moves.map((m) => {
          const md = registry.moves.get(m.id);
          return `${md?.name ?? m.id}  ${m.pp}/${m.maxPp}`;
        });
        say(game, [`${kin.name} knows:`, ...lines], { who: kin.name });
        break;
      }
    }
  }

  render(game: Game, r: Renderer): void {
    r.clear('#3c4664');
    // Subtle diagonal banding, so the backdrop is not a flat slab.
    for (let y = 0; y < SCREEN_H; y += 4) {
      r.rect(0, y, SCREEN_W, 1, '#424d6e');
    }

    for (let i = 0; i < this.party.length; i++) {
      this.renderCard(game, r, i);
    }

    r.window(4, SCREEN_H - 26, SCREEN_W - 8, 22);
    r.text(this.message, 10, SCREEN_H - 20, { color: '#282838' });

    if (this.action) {
      const w = 70;
      const h = this.action.height({ rowHeight: 12 });
      this.action.render(r, SCREEN_W - w - 6, SCREEN_H - 26 - h - 2, w, { rowHeight: 12 });
    }
  }

  private renderCard(game: Game, r: Renderer, i: number): void {
    const kin = this.party[i]!;
    const c = this.cardRect(i);
    const selected = i === this.index;
    const swapping = i === this.swapFrom;

    const fill = swapping ? '#f0e0b0' : selected ? '#e8eefa' : '#d6dcea';
    r.window(c.x, c.y, c.w, c.h, { fill, highlight: selected ? '#8fa8d8' : '#a8b4c8' });

    const frac = kin.hpFraction;
    const hpColor = frac > 0.5 ? '#48c058' : frac > 0.2 ? '#e0c040' : '#d84848';
    const chip = kin.status !== 'none' ? STATUS_CHIP[kin.status] : undefined;

    if (i === 0) {
      // Portrait centred in the card, text stacked underneath it.
      r.image(frontSprite(kin.species), c.x + Math.floor((c.w - 64) / 2), c.y + 2);
      const ty = c.y + 66;
      r.text(kin.name, c.x + 6, ty, { color: '#282838' });
      r.text(`Lv${kin.level}`, c.x + c.w - 6, ty, { color: '#282838', align: 'right' });
      r.text(`${kin.currentHp}/${kin.maxHp}`, c.x + c.w - 6, ty + 10, {
        color: '#282838', align: 'right',
      });
      r.meter(c.x + 6, ty + 12, c.w - 52, 5, frac, hpColor, '#586078', '#282838');
      if (chip) {
        r.rect(c.x + 6, c.y + 54, 20, 9, chip.color);
        r.outline(c.x + 6, c.y + 54, 20, 9, '#282838');
        r.text(chip.label, c.x + 9, c.y + 55, { color: '#ffffff' });
      }
      return;
    }

    // Bench row: the icon is cropped to the card height rather than scaled, so
    // it stays on the pixel grid.
    r.image(iconSprite(kin.species), c.x + 3, c.y + 1, 0, 10, 64, 46);
    const tx = c.x + 38;
    r.text(kin.name, tx, c.y + 3, { color: '#282838' });
    r.text(`Lv${kin.level}`, c.x + c.w - 6, c.y + 3, { color: '#282838', align: 'right' });
    r.meter(tx, c.y + 14, c.w - 40 - 36, 5, frac, hpColor, '#586078', '#282838');
    r.text(`${kin.currentHp}/${kin.maxHp}`, c.x + c.w - 6, c.y + 13, {
      color: '#282838', align: 'right',
    });
    if (chip) {
      r.rect(c.x + 3, c.y + 15, 20, 9, chip.color);
      r.outline(c.x + 3, c.y + 15, 20, 9, '#282838');
      r.text(chip.label, c.x + 6, c.y + 16, { color: '#ffffff' });
    }
    void game;
  }
}

const STATUS_CHIP: Partial<Record<StatusId, { label: string; color: string }>> = {
  burn: { label: 'BRN', color: '#e06a3a' },
  freeze: { label: 'FRZ', color: '#6ac0e0' },
  paralysis: { label: 'PAR', color: '#d8c040' },
  poison: { label: 'PSN', color: '#a05ab0' },
  toxic: { label: 'TOX', color: '#8040a0' },
  sleep: { label: 'SLP', color: '#8890a8' },
};

/* ------------------------------------------------------------ summary */

export class SummaryScene implements Scene {
  readonly name = 'summary';
  private page = 0;

  constructor(private kin: Kin) {}

  update(game: Game, _dt: number): void {
    if (game.input.pressed('cancel')) { game.scenes.pop(); return; }
    if (game.input.pressed('right') || game.input.pressed('nextTab')) this.page = (this.page + 1) % 3;
    if (game.input.pressed('left') || game.input.pressed('prevTab')) this.page = (this.page + 2) % 3;
    if (game.input.mouse.wheel !== 0) this.page = (this.page + (game.input.mouse.wheel > 0 ? 1 : 2)) % 3;
  }

  render(_game: Game, r: Renderer): void {
    const k = this.kin;
    const sp = k.data;
    r.clear('#2f3a58');

    r.window(2, 2, 84, 92, { fill: '#e8eefa' });
    r.image(frontSprite(k.species), 10, 8);
    r.text(k.name, 6, 74, { color: '#282838' });
    r.text(`Lv${k.level}`, 6, 84, { color: '#282838' });
    if (k.gender !== 'none') {
      r.text(k.gender === 'female' ? 'oF' : 'oM', 78, 84, {
        color: k.gender === 'female' ? '#c05a80' : '#5a80c0', align: 'right',
      });
    }

    // Type chips.
    let tx = 90;
    for (const t of k.types) {
      const meta = registry.typeChart?.meta?.[t];
      r.rect(tx, 6, 44, 10, meta?.color ?? '#888');
      r.outline(tx, 6, 44, 10, '#282838');
      r.text((meta?.name ?? t).toUpperCase(), tx + 4, 7, { color: '#ffffff' });
      tx += 48;
    }

    r.window(88, 20, SCREEN_W - 92, 74, { fill: '#e8eefa' });

    if (this.page === 0) this.renderStats(r);
    else if (this.page === 1) this.renderMoves(r);
    else this.renderVellum(r, sp?.vellumEntry ?? '');

    r.window(2, SCREEN_H - 24, SCREEN_W - 4, 20);
    const tabs = ['STATS', 'MOVES', 'RECORD'];
    tabs.forEach((t, i) => {
      r.text(t, 12 + i * 52, SCREEN_H - 18, { color: i === this.page ? '#282838' : '#9aa4bc' });
    });
    r.text('Esc back', SCREEN_W - 10, SCREEN_H - 18, { color: '#6a7490', align: 'right' });
  }

  private renderStats(r: Renderer): void {
    const k = this.kin;
    const rows: [string, number][] = [
      ['HP', k.maxHp], ['ATTACK', k.atk], ['DEFENCE', k.def],
      ['SP.ATK', k.spa], ['SP.DEF', k.spd], ['SPEED', k.spe],
    ];
    rows.forEach(([label, value], i) => {
      const y = 26 + i * 10;
      r.text(label, 94, y, { color: '#3a4258' });
      r.text(String(value), SCREEN_W - 10, y, { color: '#282838', align: 'right' });
      // A bar behind the number turns six numbers into a readable shape.
      const frac = Math.min(1, value / 200);
      r.rect(140, y + 2, Math.round(frac * 52), 3, '#7f9ad0');
    });
    const nature = registry.natures.find((n) => n.id === k.nature);
    r.text(`${nature?.name ?? k.nature} nature`, 94, 86, { color: '#6a7490' });
  }

  private renderMoves(r: Renderer): void {
    const k = this.kin;
    k.moves.forEach((slot, i) => {
      const md = registry.moves.get(slot.id);
      const y = 26 + i * 16;
      const meta = md ? registry.typeChart?.meta?.[md.type] : undefined;
      r.rect(94, y, 8, 8, meta?.color ?? '#888');
      r.outline(94, y, 8, 8, '#282838');
      r.text(md?.name ?? slot.id, 106, y, { color: '#282838' });
      r.text(`${slot.pp}/${slot.maxPp}`, SCREEN_W - 10, y, { color: '#485068', align: 'right' });
      if (md) r.text(md.description, 106, y + 8, { color: '#7a8398', maxWidth: 122 });
    });
  }

  private renderVellum(r: Renderer, entry: string): void {
    const k = this.kin;
    const sp = k.data;
    r.text(`No. ${String(sp?.num ?? 0).padStart(3, '0')}`, 94, 26, { color: '#485068' });
    r.text(sp?.category ?? '', 94, 36, { color: '#3a4258' });
    r.text(`${sp?.height ?? 0}m   ${sp?.weight ?? 0}kg`, 94, 46, { color: '#485068' });
    r.text(entry, 94, 58, { color: '#282838', maxWidth: SCREEN_W - 104, lineHeight: 9 });
    const next = expForLevel(k.growthRate, Math.min(100, k.level + 1)) - k.exp;
    r.text(k.level >= 100 ? 'At its peak.' : `${next} EXP to next level`, 94, 86, { color: '#6a7490' });
  }
}
