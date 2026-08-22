/**
 * Bag.
 *
 * Three pockets, because more than that turns "find the potion" into a search.
 * Items sort by their authored sort key, then alphabetically, so the same item
 * is always in the same place once the player has learned where it lives.
 */

import type { Game } from '../core/game.js';
import type { Scene } from '../core/scene.js';
import { Renderer, SCREEN_H, SCREEN_W } from '../engine/renderer.js';
import { ListMenu, type MenuItem } from '../ui/menu.js';
import { registry } from '../data/registry.js';
import { say } from '../ui/dialogue.js';
import { PartyScene } from './party.js';
import type { GameState } from '../systems/state.js';
import type { ItemCategory } from '../data/schema.js';

type Pocket = 'items' | 'vessels' | 'key';

const POCKETS: { id: Pocket; label: string; categories: ItemCategory[] }[] = [
  { id: 'items', label: 'ITEMS', categories: ['healing', 'statusHeal', 'revive', 'battle', 'berry', 'evolution', 'exploration', 'held', 'treasure', 'fossil', 'disc'] },
  { id: 'vessels', label: 'VESSELS', categories: ['vessel'] },
  { id: 'key', label: 'KEY', categories: ['key'] },
];

export class BagScene implements Scene {
  readonly name = 'bag';
  readonly transparent = true;

  private pocket = 0;
  private menu = new ListMenu<string>([], 7);

  constructor(
    private state: GameState,
    private pickMode: { filter?: (id: string) => boolean; onPick: (id: string) => void } | null = null,
  ) {}

  enter(): void { this.rebuild(); }
  resume(): void { this.rebuild(); }

  private rebuild(): void {
    const pocket = POCKETS[this.pocket]!;
    const entries = this.state.inventory
      .filter((e) => {
        const item = registry.getItem(e.item);
        if (!item) return false;
        if (!pocket.categories.includes(item.category)) return false;
        if (this.pickMode?.filter && !this.pickMode.filter(e.item)) return false;
        return true;
      })
      .sort((a, b) => {
        const ia = registry.getItem(a.item), ib = registry.getItem(b.item);
        const sa = ia?.sort ?? 999, sb = ib?.sort ?? 999;
        if (sa !== sb) return sa - sb;
        return (ia?.name ?? '').localeCompare(ib?.name ?? '');
      });

    const items: MenuItem<string>[] = entries.map((e) => ({
      label: registry.itemName(e.item),
      value: e.item,
      detail: pocket.id === 'key' ? '' : `x${e.count}`,
    }));
    if (items.length === 0) items.push({ label: 'Nothing here.', value: '', enabled: false });
    this.menu.setItems(items, true);
  }

  update(game: Game, _dt: number): void {
    if (game.input.pressed('nextTab') || game.input.pressed('right')) {
      this.pocket = (this.pocket + 1) % POCKETS.length; this.rebuild(); return;
    }
    if (game.input.pressed('prevTab') || game.input.pressed('left')) {
      this.pocket = (this.pocket + POCKETS.length - 1) % POCKETS.length; this.rebuild(); return;
    }

    // Clicking a pocket tab switches to it.
    POCKETS.forEach((p, i) => {
      const x = 6 + i * 56;
      if (game.input.clicked(x, 4, 52, 14)) { this.pocket = i; this.rebuild(); }
    });

    const res = this.menu.update(game);
    if (res === 'cancel' || game.input.pressed('bag')) { game.scenes.pop(); return; }
    if (res !== 'select') return;

    const id = this.menu.selectedValue;
    if (!id) return;

    if (this.pickMode) {
      this.pickMode.onPick(id);
      game.scenes.pop();
      return;
    }
    this.useItem(game, id);
  }

  private useItem(game: Game, id: string): void {
    const item = registry.getItem(id);
    if (!item) return;

    if (!item.usableInField) {
      say(game, ['That is not something you can use out here.']);
      return;
    }

    const needsTarget = item.effects.some(
      (e) => e.kind === 'healHp' || e.kind === 'healStatus' || e.kind === 'revive' || e.kind === 'restorePp',
    );

    if (needsTarget) {
      if (this.state.party.length === 0) {
        say(game, ['You have nothing to use it on.']);
        return;
      }
      game.scenes.push(new PartyScene(this.state, {
        prompt: `Use the ${item.name} on which kin?`,
        onPick: (index) => this.applyToKin(game, id, index),
      }));
      return;
    }

    say(game, [`You used the ${item.name}.`]);
  }

  private applyToKin(game: Game, id: string, index: number): void {
    const item = registry.getItem(id);
    const kin = this.state.party[index];
    if (!item || !kin) return;

    let didSomething = false;
    const lines: string[] = [];

    for (const eff of item.effects) {
      switch (eff.kind) {
        case 'healHp': {
          if (kin.fainted) { lines.push(`${kin.name} is in no state for that.`); break; }
          if (kin.currentHp >= kin.maxHp) { lines.push(`${kin.name} is already at full health.`); break; }
          const amount = eff.amount === 'full' ? kin.maxHp : eff.amount;
          const healed = kin.heal(amount);
          lines.push(`${kin.name} recovered ${healed} HP.`);
          didSomething = true;
          break;
        }
        case 'healStatus': {
          if (kin.status === 'none') { lines.push(`${kin.name} is fine as it is.`); break; }
          if (eff.status === 'all' || eff.status === kin.status) {
            kin.status = 'none';
            kin.statusCounter = 0;
            lines.push(`${kin.name} shook it off.`);
            didSomething = true;
          } else {
            lines.push('That will not help with this.');
          }
          break;
        }
        case 'revive': {
          if (!kin.fainted) { lines.push(`${kin.name} is still standing.`); break; }
          kin.currentHp = Math.max(1, Math.floor(kin.maxHp * eff.fraction));
          kin.status = 'none';
          lines.push(`${kin.name} is back on its feet.`);
          didSomething = true;
          break;
        }
        case 'restorePp': {
          kin.restorePp();
          lines.push(`${kin.name} caught its breath.`);
          didSomething = true;
          break;
        }
        default:
          break;
      }
    }

    if (didSomething && item.consumable) this.state.takeItem(id, 1);
    this.rebuild();
    say(game, lines.length ? lines : ['It had no effect.']);
  }

  render(_game: Game, r: Renderer): void {
    r.clear('#4a4257');
    for (let y = 0; y < SCREEN_H; y += 4) r.rect(0, y, SCREEN_W, 1, '#514860');

    POCKETS.forEach((p, i) => {
      const x = 6 + i * 56;
      const active = i === this.pocket;
      r.window(x, active ? 2 : 4, 52, active ? 16 : 14, {
        fill: active ? '#f0f2f8' : '#c8cede',
      });
      r.text(p.label, x + 8, active ? 7 : 8, { color: active ? '#282838' : '#5a6274' });
    });

    this.menu.render(r, 6, 22, 140, { rowHeight: 12 });

    const id = this.menu.selectedValue;
    const item = id ? registry.getItem(id) : undefined;
    r.window(150, 22, SCREEN_W - 156, SCREEN_H - 50);
    if (item) {
      r.text(item.name, 155, 27, { color: '#282838', maxWidth: 76 });
      r.text(item.description, 155, 45, { color: '#3a4258', maxWidth: 76, lineHeight: 9 });
    }

    r.window(6, SCREEN_H - 24, SCREEN_W - 12, 20);
    r.text(`M~${this.state.money}`, 12, SCREEN_H - 18, { color: '#282838' });
    r.text('Z/X pocket   Esc back', SCREEN_W - 14, SCREEN_H - 18, {
      color: '#6a7490', align: 'right',
    });
  }
}
