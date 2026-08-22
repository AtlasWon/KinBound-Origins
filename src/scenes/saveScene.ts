/**
 * Save screen.
 *
 * Three manual slots plus the autosave, each showing enough for the player to
 * tell their playthroughs apart at a glance: name, badges, Vellum count, time
 * and where they stopped. Overwriting always asks first.
 */

import type { Game } from '../core/game.js';
import type { Scene } from '../core/scene.js';
import { Renderer, SCREEN_H, SCREEN_W } from '../engine/renderer.js';
import { ListMenu, type MenuItem } from '../ui/menu.js';
import { ask, say } from '../ui/dialogue.js';
import { formatPlayTime, type GameState } from '../systems/state.js';
import { listHeaders, save, MANUAL_SLOTS } from '../systems/save.js';

export class SaveScene implements Scene {
  readonly name = 'save';
  readonly transparent = true;

  private menu = new ListMenu<number>([], 4);

  constructor(private state: GameState, private mapName: string) {}

  enter(): void { this.rebuild(); }
  resume(): void { this.rebuild(); }

  private rebuild(): void {
    const headers = listHeaders();
    const items: MenuItem<number>[] = headers.map(({ slot, header }) => ({
      label: slot === 0 ? 'AUTOSAVE' : `SLOT ${slot}`,
      value: slot,
      detail: header ? formatPlayTime(header.playTime) : 'empty',
      enabled: slot !== 0,
    }));
    this.menu.setItems(items, true);
    if (this.menu.index === 0) this.menu.index = 1;
  }

  update(game: Game, _dt: number): void {
    const res = this.menu.update(game);
    if (res === 'cancel') { game.scenes.pop(); return; }
    if (res !== 'select') return;

    const slot = this.menu.selectedValue;
    if (slot === undefined || !MANUAL_SLOTS.includes(slot)) return;

    const existing = listHeaders().find((h) => h.slot === slot)?.header;
    const commit = () => {
      const result = save(slot, this.state, this.mapName, game.playTime);
      this.rebuild();
      say(game, result.ok
        ? ['Saved.', `${this.state.playerName}'s journey is recorded in slot ${slot}.`]
        : ['The save did not go through.', result.error ?? 'Unknown problem.']);
    };

    if (existing) {
      ask(game, [
        `Slot ${slot} already holds ${existing.name}, ${formatPlayTime(existing.playTime)} played.`,
        'Overwrite it?',
      ], (yes) => { if (yes) commit(); });
    } else {
      commit();
    }
  }

  render(game: Game, r: Renderer): void {
    r.clear('#2c3450');
    for (let y = 0; y < SCREEN_H; y += 4) r.rect(0, y, SCREEN_W, 1, '#323a58');

    r.window(4, 4, 96, this.menu.height({ rowHeight: 13 }));
    this.menu.render(r, 4, 4, 96, { rowHeight: 13, frame: false });

    // Detail panel for the highlighted slot.
    const slot = this.menu.selectedValue ?? 1;
    const header = listHeaders().find((h) => h.slot === slot)?.header;
    r.window(104, 4, SCREEN_W - 108, 92);
    if (header) {
      r.text(header.name, 110, 10, { color: '#282838' });
      r.text(header.mapName, 110, 22, { color: '#485068', maxWidth: 116 });
      r.text(`Seals   ${header.seals}/8`, 110, 38, { color: '#282838' });
      r.text(`Vellum  ${header.vellumCaught}`, 110, 50, { color: '#282838' });
      r.text(`Time    ${formatPlayTime(header.playTime)}`, 110, 62, { color: '#282838' });
      r.text(new Date(header.savedAt).toLocaleDateString(), 110, 78, { color: '#6a7490' });
    } else {
      r.text('Empty slot.', 110, 40, { color: '#7a8398' });
    }

    r.window(4, SCREEN_H - 40, SCREEN_W - 8, 36);
    r.text(`Now: ${this.state.playerName} at ${this.mapName}`, 10, SCREEN_H - 34, {
      color: '#282838', maxWidth: SCREEN_W - 24,
    });
    r.text(`${formatPlayTime(game.playTime)} played`, 10, SCREEN_H - 16, { color: '#485068' });
  }
}
