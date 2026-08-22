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
import { formatPlayTime, type GameState } from '../systems/state.js';
import { PartyScene } from './party.js';
import { BagScene } from './bag.js';
import { VellumScene } from './vellum.js';
import { RegionMapScene } from './regionmap.js';
import { SaveScene } from './saveScene.js';
import { OptionsScene } from './options.js';
import { say } from '../ui/dialogue.js';

export class MainMenuScene implements Scene {
  readonly name = 'mainmenu';
  readonly transparent = true;

  private menu = new ListMenu<string>([], 8);

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
      `Seals: ${this.state.sealCount} of 8`,
      `Vellum: ${this.state.caught.size} caught, ${this.state.seen.size} seen`,
      `Marks: ${this.state.money}`,
      `Time: ${formatPlayTime(this.state.playTime)}`,
    ], { who: 'RECORD' });
  }

  render(game: Game, r: Renderer): void {
    // Dim the world behind so the menu reads as an overlay, not a scene swap.
    r.tint('#101828', 0.35);

    const w = 84;
    const x = SCREEN_W - w - 4;
    const h = this.menu.height({ rowHeight: 13 });
    this.menu.render(r, x, 4, w, { rowHeight: 13 });

    // Status strip: the three numbers a player checks constantly.
    const sy = 4 + h + 4;
    r.window(x, sy, w, 40);
    r.text(`M~${this.state.money}`, x + 6, sy + 5, { color: '#282838' });
    r.text(`SEALS ${this.state.sealCount}/8`, x + 6, sy + 15, { color: '#282838' });
    r.text(formatPlayTime(game.playTime), x + 6, sy + 25, { color: '#485068' });

    // Location plate on the left, mirroring where the world banner appears.
    r.window(4, SCREEN_H - 22, 96, 18);
    r.text(this.mapName, 8, SCREEN_H - 17, { color: '#282838' });
  }
}
