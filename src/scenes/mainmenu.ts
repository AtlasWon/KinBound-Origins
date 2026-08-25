/**
 * Main menu.
 *
 * Opened with Tab (or Start). Deliberately opens in one frame with no
 * animation: the original hardware made you wait for this screen, and there is
 * no reason to reproduce that particular piece of history.
 */

import type { Game } from '../core/game.js';
import type { Scene } from '../core/scene.js';
import { Renderer, SCREEN_H, SCREEN_W } from '../engine/renderer.js';
import { ListMenu } from '../ui/menu.js';
import { fit } from '../ui/layout.js';
import { formatPlayTime, type GameState } from '../systems/state.js';
import { PartyScene } from './party.js';
import { BagScene } from './bag.js';
import { VellumScene } from './vellum.js';
import { RegionMapScene } from './regionmap.js';
import { SaveScene } from './saveScene.js';
import { OptionsScene } from './options.js';
import { say } from '../ui/dialogue.js';

/**
 * The right-hand column's budget, added up rather than eyeballed.
 *
 * Eight rows at a 13-unit pitch plus a 40-unit status strip came to 164 units
 * on a 160-unit screen, so the clock at the bottom of the strip was drawn off
 * the end of the display. Naming the band the column has to live in means the
 * next entry added to this menu tightens the pitch instead of falling off.
 */
const MENU = { w: 88, top: 4, strip: 40, bottom: SCREEN_H - 8 };

export class MainMenuScene implements Scene {
  readonly name = 'mainmenu';
  readonly transparent = true;

  private menu = new ListMenu<string>([], 8);
  private rowH = 12;
  private listH = 104;

  constructor(private state: GameState, private mapName: string) {}

  enter(_game: Game): void {
    this.rebuild();
  }

  resume(_game: Game): void {
    this.rebuild();
  }

  private rebuild(): void {
    const idx = this.menu.index;
    this.menu.setItems([
      { label: 'VELLUM', value: 'vellum', enabled: this.state.hasItem('vellum') },
      { label: 'KIN', value: 'party', enabled: this.state.party.length > 0 },
      { label: 'BAG', value: 'bag' },
      { label: 'MAP', value: 'map' },
      { label: this.state.playerName, value: 'trainer' },
      { label: 'SAVE', value: 'save' },
      { label: 'OPTIONS', value: 'options' },
      { label: 'CLOSE', value: 'close' },
    ], true);
    this.menu.index = Math.min(idx, this.menu.items.length - 1);
    // Sized here rather than at render time, so the row count the cursor moves
    // through is settled before the first update rather than after it.
    this.rowH = Math.max(11, Math.min(13,
      Math.floor((MENU.bottom - MENU.top - MENU.strip - 4 - 8) / this.menu.items.length)));
    this.listH = this.menu.fitTo(MENU.bottom - MENU.top - MENU.strip - 4, { rowHeight: this.rowH });
  }

  update(game: Game, _dt: number): void {
    if (game.input.pressed('menu')) { game.scenes.pop(); return; }

    // The dedicated hotkeys work from inside the menu too.
    if (game.input.pressed('party') && this.state.party.length > 0) {
      game.scenes.push(new PartyScene(this.state)); return;
    }
    if (game.input.pressed('bag')) { game.scenes.push(new BagScene(this.state)); return; }
    if (game.input.pressed('vellum')) { game.scenes.push(new VellumScene(this.state)); return; }
    if (game.input.pressed('map')) { game.scenes.push(new RegionMapScene(this.state)); return; }

    const res = this.menu.update(game);
    if (res === 'cancel') { game.scenes.pop(); return; }
    if (res !== 'select') return;

    switch (this.menu.selectedValue) {
      case 'vellum': game.scenes.push(new VellumScene(this.state)); break;
      case 'party': game.scenes.push(new PartyScene(this.state)); break;
      case 'bag': game.scenes.push(new BagScene(this.state)); break;
      case 'map': game.scenes.push(new RegionMapScene(this.state)); break;
      case 'trainer': this.showTrainerCard(game); break;
      case 'save': game.scenes.push(new SaveScene(this.state, this.mapName)); break;
      case 'options': game.scenes.push(new OptionsScene()); break;
      case 'close': game.scenes.pop(); break;
    }
  }

  private showTrainerCard(game: Game): void {
    say(game, [
      `${this.state.playerName}`,
      `Bond Crests: ${this.state.crestCount} of 8`,
      `Vellum: ${this.state.caught.size} caught, ${this.state.seen.size} seen`,
      `Marks: ${this.state.money}`,
      `Time: ${formatPlayTime(this.state.playTime)}`,
    ], { who: 'RECORD' });
  }

  render(game: Game, r: Renderer): void {
    // Dim the world behind so the menu reads as an overlay, not a scene swap.
    r.tint('#101828', 0.35);

    const w = MENU.w;
    const x = SCREEN_W - w - 4;
    const stripH = MENU.strip;

    this.menu.render(r, x, MENU.top, w, { rowHeight: this.rowH });

    // Status strip: the three numbers a player checks constantly.
    const sy = MENU.top + this.listH + 4;
    r.window(x, sy, w, stripH);
    const sx = x + 6;
    const sw = w - 12;
    r.text(fit(r, `M~${this.state.money}`, sw), sx, sy + 6, { color: '#282838' });
    r.text(`CRESTS ${this.state.crestCount}/8`, sx, sy + 17, { color: '#282838' });
    r.text(formatPlayTime(game.playTime), sx, sy + 28, { color: '#485068' });

    // Location plate on the left, mirroring where the world banner appears.
    // Sized to the name: "Emberfall Works Approach" is half again as wide as
    // the 96 units this used to be nailed to.
    const plateMax = x - 12;
    const plateW = Math.min(plateMax, r.textWidth(this.mapName) + 14);
    r.window(4, SCREEN_H - 22, plateW, 18);
    r.text(fit(r, this.mapName, plateW - 14), 11, SCREEN_H - 16, { color: '#282838' });
  }
}
