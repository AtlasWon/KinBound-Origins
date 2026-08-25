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
import { ListMenu, navDown, navLeft, navRight, navUp, type MenuItem } from '../ui/menu.js';
import { fit, inside, pair, para, GAP, LINE, LINE_TIGHT } from '../ui/layout.js';
import {
  drawItemRowIcon, drawItemSprite, ITEM_ROW_PAD_X, ITEM_SPRITE_UNITS,
} from '../gfx/itemart.js';
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
          detail: `M~${item.sellPrice}`,
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
        // Through the nav helpers, so arrows and WASD both drive the spinner
        // whatever the player has rebound.
        if (navUp(game)) this.quantity = Math.min(max, this.quantity + 1);
        if (navDown(game)) this.quantity = Math.max(1, this.quantity - 1);
        if (navRight(game)) this.quantity = Math.min(max, this.quantity + 10);
        if (navLeft(game)) this.quantity = Math.max(1, this.quantity - 10);
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

    // Money plate is always visible: the number the player is reasoning about,
    // and it grows with the number rather than clipping six figures.
    const money = `M~${this.state.money}`;
    const moneyW = Math.max(70, r.textWidth(money) + 16);
    r.window(SCREEN_W - moneyW - 4, 4, moneyW, 18);
    r.text(money, SCREEN_W - 10, 11, { color: '#282838', align: 'right' });

    // Six units taller than it was: the bar carries the shopkeeper's line and a
    // three-line description, and at 40 the third line had nowhere to go. The
    // list above still shows the same six rows, so nothing is paid for it.
    const barH = 46;
    const barY = SCREEN_H - barH - 4;
    const barW = SCREEN_W - 12;
    const inBar = inside(6, barY, barW, barH, 1);

    if (this.mode === 'root') {
      this.root.render(r, 6, 4, 74, { rowHeight: 13 });
      r.window(6, barY, barW, barH);
      para(r, this.greeting, inBar, { color: '#282838', lineHeight: LINE });
      return;
    }

    // The description is a sentence and wants a line long enough to be one.
    // Squeezed into a 72-unit side column it broke "clay-and-copper" across
    // two lines and still ran off the bottom, so it now runs across the bar
    // where it has 220 units, and the side panel carries the numbers instead.
    const listW = 144;
    const panelX = 6 + listW + 6;
    const panelW = SCREEN_W - 6 - panelX;
    const panelH = barY - 26 - 4;
    const rowH = 12, padY = 4;
    // 144 already had the room: the widest row the shop can produce is "Strong
    // Potion" at 74 beside "M~4000" at 28, which leaves 78 units of label space
    // once the icon column is inside the padX. Nothing gives way here, so the
    // side panel keeps every unit it had.
    this.list.render(r, 6, 26, listW, { rowHeight: rowH, padX: ITEM_ROW_PAD_X });

    // Same pass the bag makes, over the gap the padX reserved. Both lists go
    // through it: a buy row and a sell row are the same row.
    const rows = Math.min(this.list.visible, this.list.items.length);
    for (let row = 0; row < rows; row++) {
      const rowId = this.list.items[this.list.scroll + row]?.value;
      drawItemRowIcon(r, rowId ? registry.getItem(rowId) : null, 6, 26 + padY + row * rowH);
    }

    const id = this.list.selectedValue;
    const item = id ? registry.getItem(id) : undefined;
    r.window(panelX, 26, panelW, panelH);
    if (item) {
      const box = inside(panelX, 26, panelW, panelH, 1);
      // Picture, name, rule, numbers -- the same card the bag draws, and for
      // the same reason: these two screens are consecutive for anyone
      // restocking, and an item that changes shape between them is the sort of
      // thing a player reads as two different items.
      //
      // The one difference is that here the name goes UNDER the picture rather
      // than beside it, and that is forced. This panel is 70 units across, so a
      // name column beside a 16-unit icon would be 50 -- and "Steadyroot" is a
      // single 59-unit word, which would hard-break in the middle. The bag's
      // panel has 87 and can afford the wider arrangement.
      //
      // The picture belongs here rather than in the message bar below, which is
      // where this screen's description lives. The bar is far wider and would
      // have taken it easily, but the bar also carries the shopkeeper's line,
      // and a drawing at its head reads as belonging to what she is saying.
      drawItemSprite(r, item, box.x, box.y);
      // The name wraps here rather than truncating: this is the one place on
      // the screen where the player can read it in full.
      para(r, item.name,
        { x: box.x, y: box.y + ITEM_SPRITE_UNITS + 3, w: box.w, h: LINE_TIGHT + 7 },
        { color: '#282838', lineHeight: LINE_TIGHT, maxLines: 2 });
      // Fixed, not stacked under the name: a rule that moves when the selection
      // changes from "Rouse" to "Warden Vessel" makes the whole panel twitch.
      let y = box.y + ITEM_SPRITE_UNITS + 22;
      r.rect(box.x, y, box.w, 1, '#c2cadd');
      y += 6;
      // Label and value on one row apiece. Stacked, they came to 41 units for
      // the two the sell side needs, and the picture above has spent the height
      // that used to pay for it. `pair` measures the value first and fits the
      // label to what is left, so neither can run into the other.
      //
      // Which side of the counter we are on is the mode, not `pendingBuy` --
      // that only means anything once a quantity is being chosen, and reading
      // it here made the sell panel quote the buying price.
      if (this.mode === 'buy' || (this.mode === 'quantity' && this.pendingBuy)) {
        pair(r, box.x, y, box.w, 'Price', `M~${item.price}`, { detailColor: '#282838' });
      } else {
        pair(r, box.x, y, box.w, 'You have', `x${this.state.itemCount(item.id)}`,
          { detailColor: '#282838' });
        pair(r, box.x, y + 12, box.w, 'Each', `M~${item.sellPrice ?? 0}`,
          { detailColor: '#282838' });
      }
    }

    r.window(6, barY, barW, barH);
    if (this.mode === 'quantity' && item) {
      const unit = this.pendingBuy ? item.price : (item.sellPrice ?? 0);
      r.text(fit(r, `${item.name}  x${this.quantity}`, inBar.w), inBar.x, inBar.y,
        { color: '#282838' });
      r.text(`${this.pendingBuy ? 'Cost' : 'Payout'}  M~${unit * this.quantity}`,
        inBar.x, inBar.y + 11, { color: '#282838' });
      // Written to be measured, not to be squeezed in: the old single line came
      // to 250 units on a 240-unit screen and ran off both ends of its own
      // window. Two short lines beat one that does not fit.
      r.text('Up/Down  1', inBar.x + inBar.w, inBar.y, { color: '#6a7490', align: 'right' });
      r.text('Left/Right  10', inBar.x + inBar.w, inBar.y + 11, {
        color: '#6a7490', align: 'right',
      });
      r.text('Enter to confirm, Esc to go back', inBar.x, inBar.y + 23, { color: '#6a7490' });
    } else {
      // `pendingBuy` still held whatever the last transaction was, so the sell
      // list greeted the player with "What would you like?".
      const prompt = this.mode === 'buy' ? 'What would you like?' : 'What are you selling?';
      const back = 'Esc to go back';
      r.text(fit(r, prompt, inBar.w - r.textWidth(back) - GAP), inBar.x, inBar.y,
        { color: '#282838' });
      r.text(back, inBar.x + inBar.w, inBar.y, { color: '#6a7490', align: 'right' });
      if (item) {
        para(r, item.description, { x: inBar.x, y: inBar.y + 11, w: inBar.w, h: inBar.h - 11 },
          { color: '#3a4258', lineHeight: LINE });
      }
    }
  }
}
