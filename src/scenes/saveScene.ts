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
import { fit, inside, pair, para, LINE } from '../ui/layout.js';
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

    // Four units taller than it was. The "Now:" line wraps to two when the map
    // name is long, and at 36 the play time under it was written on the frame.
    const footerH = 40;
    const footerY = SCREEN_H - footerH - 4;
    const panelH = footerY - 8;
    r.window(4, 4, 96, this.menu.height({ rowHeight: 13 }));
    this.menu.render(r, 4, 4, 96, { rowHeight: 13, frame: false });

    // Detail panel for the highlighted slot.
    const slot = this.menu.selectedValue ?? 1;
    const header = listHeaders().find((h) => h.slot === slot)?.header;
    r.window(104, 4, SCREEN_W - 108, panelH);
    const box = inside(104, 4, SCREEN_W - 108, panelH);
    if (header) {
      let y = box.y;
      r.text(fit(r, header.name, box.w), box.x, y, { color: '#282838' });
      y += 10;
      // The place name is the one line here that can wrap, so the block under
      // it starts where the wrap actually ended rather than 16 units down.
      // "Emberfall Works Approach" took two lines and the Crests row was
      // written across the second one.
      y += para(r, header.mapName, { x: box.x, y, w: box.w, h: 30 },
        { color: '#485068', lineHeight: LINE }) + 6;
      for (const [label, value] of [
        ['Crests', `${header.crests}/8`],
        ['Vellum', String(header.vellumCaught)],
        ['Time', formatPlayTime(header.playTime)],
      ] as [string, string][]) {
        pair(r, box.x, y, box.w, label, value, { color: '#282838', detailColor: '#282838' });
        y += 12;
      }
      r.text(new Date(header.savedAt).toLocaleDateString(), box.x, box.y + box.h - 7,
        { color: '#6a7490' });
    } else {
      r.text('Empty slot.', box.x, box.y + 34, { color: '#7a8398' });
    }

    r.window(4, footerY, SCREEN_W - 8, footerH);
    const foot = inside(4, footerY, SCREEN_W - 8, footerH);
    const used = para(r, `Now: ${this.state.playerName} at ${this.mapName}`,
      { x: foot.x, y: foot.y, w: foot.w, h: 20 },
      { color: '#282838', lineHeight: LINE, maxLines: 2 });
    r.text(`${formatPlayTime(game.playTime)} played`, foot.x, foot.y + Math.max(used, 10) + 5,
      { color: '#485068' });
  }
}
