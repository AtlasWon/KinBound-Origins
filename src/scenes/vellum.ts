/**
 * The Vellum.
 *
 * Dr. Vess's field record. Unseen entries are shown as blanks rather than
 * hidden, because the gaps are the point: a list with holes in it is an
 * invitation, and a list that grows as you walk is the quiet second objective
 * running underneath the whole game.
 */

import type { Game } from '../core/game.js';
import type { Scene } from '../core/scene.js';
import { Renderer, SCREEN_H, SCREEN_W } from '../engine/renderer.js';
import { ListMenu, type MenuItem } from '../ui/menu.js';
import { registry } from '../data/registry.js';
import { frontSprite } from '../gfx/kinsprite.js';
import type { GameState } from '../systems/state.js';
import type { SpeciesData } from '../data/schema.js';

type SortMode = 'number' | 'name' | 'type';

export class VellumScene implements Scene {
  readonly name = 'vellum';
  readonly transparent = true;

  private menu = new ListMenu<string>([], 9);
  private sort: SortMode = 'number';
  private caughtOnly = false;

  constructor(private state: GameState) {}

  enter(): void { this.rebuild(); }

  private rebuild(): void {
    let list = [...registry.species.values()];
    if (this.caughtOnly) list = list.filter((s) => this.state.caught.has(s.id));

    switch (this.sort) {
      case 'name': list.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'type': list.sort((a, b) => a.types[0].localeCompare(b.types[0]) || a.num - b.num); break;
      default: list.sort((a, b) => a.num - b.num);
    }

    const items: MenuItem<string>[] = list.map((sp) => {
      const caught = this.state.caught.has(sp.id);
      const seen = this.state.seen.has(sp.id);
      return {
        label: `${String(sp.num).padStart(3, '0')}  ${seen ? sp.name : '-----'}`,
        value: sp.id,
        detail: caught ? '*' : '',
        color: seen ? '#282838' : '#9098a8',
      };
    });
    if (items.length === 0) items.push({ label: 'Nothing recorded yet.', value: '', enabled: false });
    this.menu.setItems(items, true);
  }

  update(game: Game, _dt: number): void {
    if (game.input.pressed('cancel') || game.input.pressed('vellum')) { game.scenes.pop(); return; }
    if (game.input.pressed('nextTab')) {
      this.sort = this.sort === 'number' ? 'name' : this.sort === 'name' ? 'type' : 'number';
      this.rebuild();
      return;
    }
    if (game.input.pressed('prevTab')) {
      this.caughtOnly = !this.caughtOnly;
      this.rebuild();
      return;
    }
    this.menu.update(game);
  }

  render(_game: Game, r: Renderer): void {
    r.clear('#3a4a3e');
    for (let y = 0; y < SCREEN_H; y += 4) r.rect(0, y, SCREEN_W, 1, '#405244');

    this.menu.render(r, 4, 4, 112, { rowHeight: 12 });

    const id = this.menu.selectedValue;
    const sp = id ? registry.species.get(id) : undefined;
    const seen = sp ? this.state.seen.has(sp.id) : false;

    r.window(120, 4, SCREEN_W - 124, SCREEN_H - 32);
    if (sp && seen) this.renderEntry(r, sp);
    else if (sp) {
      r.text('Not yet recorded.', 128, 40, { color: '#7a8398' });
      r.text('Find one in the field', 128, 52, { color: '#9aa4bc' });
      r.text('to fill this in.', 128, 62, { color: '#9aa4bc' });
    }

    r.window(4, SCREEN_H - 24, SCREEN_W - 8, 20);
    r.text(
      `Caught ${this.state.caught.size} / Seen ${this.state.seen.size}`,
      10, SCREEN_H - 18, { color: '#282838' },
    );
    r.text(`X sort:${this.sort}${this.caughtOnly ? '  Z caught' : ''}`, SCREEN_W - 12, SCREEN_H - 18, {
      color: '#6a7490', align: 'right',
    });
  }

  private renderEntry(r: Renderer, sp: SpeciesData): void {
    const caught = this.state.caught.has(sp.id);
    r.image(frontSprite(sp.id), 124, 6);

    r.text(sp.name, 124, 72, { color: '#282838' });
    r.text(sp.category, 124, 82, { color: '#485068' });

    let tx = 124;
    for (const t of sp.types) {
      const meta = registry.typeChart?.meta?.[t];
      r.rect(tx, 92, 40, 9, meta?.color ?? '#888');
      r.outline(tx, 92, 40, 9, '#282838');
      r.text((meta?.name ?? t).toUpperCase(), tx + 3, 93, { color: '#ffffff' });
      tx += 44;
    }

    if (caught) {
      r.text(`${sp.height}m  ${sp.weight}kg`, 124, 104, { color: '#485068' });
      r.text(sp.vellumEntry, 124, 114, {
        color: '#282838', maxWidth: SCREEN_W - 132, lineHeight: 9,
      });
    } else {
      r.text('Seen, not yet caught.', 124, 104, { color: '#7a8398' });
      r.text(`Habitat: ${sp.habitat}`, 124, 116, {
        color: '#485068', maxWidth: SCREEN_W - 132, lineHeight: 9,
      });
    }
  }
}
