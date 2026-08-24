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
import { fit, inside, para, GAP, LINE_TIGHT } from '../ui/layout.js';
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
    this.menu.fitTo(SCREEN_H - 24 - 22 - 4, { rowHeight: 12 });
  }

  update(game: Game, _dt: number): void {
    if (game.input.pressed('nextTab') || game.input.pressed('right')) {
      this.pocket = (this.pocket + 1) % POCKETS.length; this.rebuild(); return;
    }
    if (game.input.pressed('prevTab') || game.input.pressed('left')) {
      this.pocket = (this.pocket + POCKETS.length - 1) % POCKETS.length; this.rebuild(); return;
    }

    // Clicking a pocket tab switches to it, through the same measured
    // rectangles the tabs are drawn from.
    POCKETS.forEach((_p, i) => {
      const t = this.tabRect(game.renderer, i);
      if (game.input.clicked(t.x, 2, t.w, 16)) { this.pocket = i; this.rebuild(); }
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
        // Short enough to sit beside the party screen's button hints without
        // either of them having to give way.
        prompt: `Use the ${item.name}?`,
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
      const t = this.tabRect(r, i);
      const active = i === this.pocket;
      r.window(t.x, t.y, t.w, t.h, { fill: active ? '#f0f2f8' : '#c8cede' });
      r.text(p.label, t.x + Math.floor(t.w / 2), t.y + Math.floor((t.h - 7) / 2), {
        color: active ? '#282838' : '#5a6274', align: 'center',
      });
    });

    // The list was 140 wide for names that top out around 80, while the panel
    // it starved had to break "clay-and-copper" across a line. Split the width
    // where the content actually needs it.
    const footerY = SCREEN_H - 24;
    // 124 is the narrowest the list can be and still spell "Warden Vessel"
    // beside an "x99"; every unit past that goes to the description, which
    // needs 89 of them to keep "clay-and-copper" on one line.
    const listW = 124;
    const panelX = 6 + listW + 6;
    this.menu.render(r, 6, 22, listW, { rowHeight: 12 });

    const id = this.menu.selectedValue;
    const item = id ? registry.getItem(id) : undefined;
    const panelW = SCREEN_W - 6 - panelX;
    const panelH = footerY - 22 - 4;
    r.window(panelX, 22, panelW, panelH);
    if (item) {
      const box = inside(panelX, 22, panelW, panelH, 1);
      r.text(fit(r, item.name, box.w), box.x, box.y, { color: '#282838' });
      // A rule under the name, so the two blocks read as heading and body
      // rather than as one paragraph that starts with a noun.
      r.rect(box.x, box.y + 10, box.w, 1, '#c2cadd');
      para(r, item.description,
        { x: box.x, y: box.y + 15, w: box.w, h: box.h - 15 },
        { color: '#3a4258', lineHeight: LINE_TIGHT });
    }

    r.window(6, footerY, SCREEN_W - 12, 20);
    const fw = SCREEN_W - 12 - 12;
    const hint = 'Z/X pocket   Esc back';
    r.text(fit(r, `M~${this.state.money}`, fw - r.textWidth(hint) - GAP), 12, footerY + 7,
      { color: '#282838' });
    r.text(hint, 12 + fw, footerY + 7, { color: '#6a7490', align: 'right' });
  }

  /**
   * Tab rectangles, sized to their own captions and measured in one place so
   * the click targets and the drawing can never drift apart. VESSELS filled its
   * fixed 52 units edge to edge with the frame.
   */
  private tabRect(r: Renderer, i: number): { x: number; y: number; w: number; h: number } {
    let x = 6;
    for (let k = 0; k < i; k++) x += r.textWidth(POCKETS[k]!.label) + 18 + 6;
    const w = r.textWidth(POCKETS[i]!.label) + 18;
    const active = i === this.pocket;
    return { x, y: active ? 2 : 4, w, h: active ? 16 : 14 };
  }
}
