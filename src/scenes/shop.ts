/**
 * Provisioner (shop).
 *
 * Buy and sell with a live quantity spinner. Stock is data-driven and can be
 * gated on seals or story flags, which is how the item economy keeps pace with
 * progression instead of handing out full restores in the first town.
 */

import type { Game } from '../core/game.js';
import type { Scene } from '../core/scene.js';
import { Renderer, SCREEN_H, SCREEN_W } from '../engine/renderer.js';
import { ListMenu, type MenuItem } from '../ui/menu.js';
import { registry } from '../data/registry.js';
import { say } from '../ui/dialogue.js';
import type { GameState } from '../systems/state.js';
import type { ShopData } from '../data/schema.js';

type Mode = 'root' | 'buy' | 'sell' | 'quantity';

export class ShopScene implements Scene {
  readonly name = 'shop';
  readonly transparent = true;

  private mode: Mode = 'root';
  private root = new ListMenu<Mode>([], 3);
  private list = new ListMenu<string>([], 6);
  private quantity = 1;
  private pendingBuy = true;
  private shop?: ShopData;
  private greeting = 'What can I get you?';

  constructor(private state: GameState, private shopId: string) {}

  enter(_game: Game): void {
    this.root.setItems([
      { label: 'BUY', value: 'buy' },
      { label: 'SELL', value: 'sell' },
      { label: 'LEAVE', value: 'root' },
    ]);
    this.shop = registry.shops.get(this.shopId);
    if (!this.shop) console.warn(`shop: unknown shop "${this.shopId}"`);
    if (this.shop?.greeting.length) this.greeting = this.shop.greeting[0]!;
  }

  private buildBuy(): void {
    const stock = (this.shop?.stock ?? []).filter((entry) => {
      if (entry.requiresSeal && this.state.sealCount < entry.requiresSeal) return false;
      if (entry.requiresFlag && !this.state.hasFlag(entry.requiresFlag)) return false;
      return true;
    });
    const items: MenuItem<string>[] = stock.map((entry) => {
      const item = registry.getItem(entry.item);
      const price = item?.price ?? 0;
      return {
        label: item?.name ?? entry.item,
        value: entry.item,
        detail: `M~${price}`,
        enabled: price <= this.state.money,
      };
    });
    if (items.length === 0) items.push({ label: 'Nothing in stock.', value: '', enabled: false });
    this.list.setItems(items, true);
  }

  private buildSell(): void {
    const items: MenuItem<string>[] = this.state.inventory
      .filter((e) => {
        const item = registry.getItem(e.item);
        return item && item.category !== 'key' && (item.sellPrice ?? 0) > 0;
      })
      .map((e) => {
        const item = registry.getItem(e.item)!;
        return {
          label: item.name,
          value: e.item,
          detail: `x${e.count}  M~${item.sellPrice}`,
        };
      });
    if (items.length === 0) items.push({ label: 'Nothing worth selling.', value: '', enabled: false });
    this.list.setItems(items, true);
  }

  update(game: Game, _dt: number): void {
    switch (this.mode) {
      case 'root': {
        const res = this.root.update(game);
        if (res === 'cancel') { game.scenes.pop(); return; }
        if (res !== 'select') return;
        const v = this.root.selectedValue;
        if (v === 'buy') { this.mode = 'buy'; this.buildBuy(); }
        else if (v === 'sell') { this.mode = 'sell'; this.buildSell(); }
        else game.scenes.pop();
        return;
      }
      case 'buy':
      case 'sell': {
        const res = this.list.update(game);
        if (res === 'cancel') { this.mode = 'root'; return; }
        if (res !== 'select') return;
        if (!this.list.selectedValue) return;
        this.pendingBuy = this.mode === 'buy';
        this.quantity = 1;
        this.mode = 'quantity';
        return;
      }
      case 'quantity': {
        const id = this.list.selectedValue!;
        const max = this.maxQuantity(id);
        if (game.input.repeated('up')) this.quantity = Math.min(max, this.quantity + 1);
        if (game.input.repeated('down')) this.quantity = Math.max(1, this.quantity - 1);
        if (game.input.repeated('right')) this.quantity = Math.min(max, this.quantity + 10);
        if (game.input.repeated('left')) this.quantity = Math.max(1, this.quantity - 10);
        if (game.input.mouse.wheel !== 0) {
          this.quantity = Math.max(1, Math.min(max, this.quantity - game.input.mouse.wheel));
        }
        if (game.input.pressed('cancel')) { this.mode = this.pendingBuy ? 'buy' : 'sell'; return; }
        if (game.input.pressed('confirm') || game.input.mouse.leftPressed) {
          this.commit(game, id);
        }
        return;
      }
    }
  }

  private maxQuantity(id: string): number {
    const item = registry.getItem(id);
    if (!item) return 1;
    if (this.pendingBuy) {
      return Math.max(1, Math.min(99, Math.floor(this.state.money / Math.max(1, item.price))));
    }
    return Math.max(1, this.state.itemCount(id));
  }

  private commit(game: Game, id: string): void {
    const item = registry.getItem(id);
    if (!item) return;
    if (this.pendingBuy) {
      const cost = item.price * this.quantity;
      if (!this.state.spend(cost)) {
        say(game, ['You cannot afford that.']);
        return;
      }
      this.state.giveItem(id, this.quantity);
      this.buildBuy();
      say(game, [`${this.quantity} x ${item.name}. That is M~${cost}.`, 'Anything else?']);
    } else {
      const gain = (item.sellPrice ?? 0) * this.quantity;
      if (!this.state.takeItem(id, this.quantity)) return;
      this.state.earn(gain);
      this.buildSell();
      say(game, [`M~${gain} for the lot. Pleasure doing business.`]);
    }
    this.mode = this.pendingBuy ? 'buy' : 'sell';
  }

  render(_game: Game, r: Renderer): void {
    r.tint('#101828', 0.45);

    // Money plate is always visible: the number the player is reasoning about.
    r.window(SCREEN_W - 86, 4, 82, 18);
    r.text(`M~${this.state.money}`, SCREEN_W - 80, 9, { color: '#282838' });

    if (this.mode === 'root') {
      this.root.render(r, 6, 4, 74, { rowHeight: 13 });
      r.window(6, SCREEN_H - 44, SCREEN_W - 12, 40);
      r.text(this.greeting, 12, SCREEN_H - 38, { color: '#282838', maxWidth: SCREEN_W - 24 });
      return;
    }

    this.list.render(r, 6, 26, 140, { rowHeight: 12 });

    const id = this.list.selectedValue;
    const item = id ? registry.getItem(id) : undefined;
    r.window(150, 26, SCREEN_W - 156, 76);
    if (item) {
      // Clamp to the panel: eight lines is all that fits.
      const lines = r.wrapText(item.description, 72).slice(0, 8);
      lines.forEach((line, i) => r.text(line, 154, 31 + i * 9, { color: '#3a4258' }));
    }

    r.window(6, SCREEN_H - 44, SCREEN_W - 12, 40);
    if (this.mode === 'quantity' && item) {
      const unit = this.pendingBuy ? item.price : (item.sellPrice ?? 0);
      r.text(`${item.name}  x${this.quantity}`, 12, SCREEN_H - 38, { color: '#282838' });
      r.text(`${this.pendingBuy ? 'Cost' : 'Payout'}  M~${unit * this.quantity}`, 12, SCREEN_H - 26, {
        color: '#282838',
      });
      r.text('Up/Down 1   Left/Right 10   Enter to confirm', SCREEN_W - 14, SCREEN_H - 14, {
        color: '#6a7490', align: 'right',
      });
    } else {
      r.text(this.pendingBuy || this.mode === 'buy' ? 'What would you like?' : 'What are you selling?',
        12, SCREEN_H - 38, { color: '#282838' });
      r.text('Esc to go back', SCREEN_W - 14, SCREEN_H - 14, { color: '#6a7490', align: 'right' });
    }
  }
}
