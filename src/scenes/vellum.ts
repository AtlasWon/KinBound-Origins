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
import { DETAIL, Renderer, SCREEN_H, SCREEN_W } from '../engine/renderer.js';
import { ListMenu, type MenuItem } from '../ui/menu.js';
import { fit, inside, para, typeChips, GAP, LINE_TIGHT } from '../ui/layout.js';
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
        // The caught mark rides in front of the number rather than in a
        // right-hand column of its own. The column plus its gap plus the scroll
        // gutter came to twenty units, and "Bladderwrack" needs every one of
        // them: the list used to read "001 Brambleh.".
        label: `${caught ? '*' : ' '}${String(sp.num).padStart(3, '0')} ${seen ? sp.name : '-----'}`,
        value: sp.id,
        color: seen ? '#282838' : '#9098a8',
      };
    });
    if (items.length === 0) items.push({ label: 'Nothing recorded yet.', value: '', enabled: false });
    this.menu.setItems(items, true);
    this.menu.fitTo(SCREEN_H - 32, { rowHeight: 12 });
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

    const footerY = SCREEN_H - 24;
    const listW = 118;
    this.menu.render(r, 4, 4, listW, { rowHeight: 12 });

    const id = this.menu.selectedValue;
    const sp = id ? registry.species.get(id) : undefined;
    const seen = sp ? this.state.seen.has(sp.id) : false;

    // The entry panel now runs to the footer instead of stopping four units
    // short of it: the description used to be wrapped with no height limit and
    // its last two lines were written on the world behind the panel and then
    // under the footer window.
    const panelX = 4 + listW + 4;
    const panel = { x: panelX, y: 4, w: SCREEN_W - 4 - panelX, h: footerY - 8 };
    r.window(panel.x, panel.y, panel.w, panel.h);
    const box = inside(panel.x, panel.y, panel.w, panel.h);
    if (sp && seen) this.renderEntry(r, sp, box);
    else if (sp) {
      para(r, 'Not yet recorded. Find one in the field to fill this in.',
        { x: box.x, y: box.y + 34, w: box.w, h: 40 }, { color: '#7a8398', lineHeight: 10 });
    }

    r.window(4, footerY, SCREEN_W - 8, 20);
    const fx = 10;
    const fw = SCREEN_W - 8 - 6 - 6;
    const right = `X sort:${this.sort}${this.caughtOnly ? '  Z caught' : ''}`;
    const rightW = r.textWidth(right);
    r.text(
      fit(r, `Caught ${this.state.caught.size} / Seen ${this.state.seen.size}`, fw - rightW - GAP),
      fx, footerY + 7, { color: '#282838' },
    );
    r.text(right, fx + fw, footerY + 7, { color: '#6a7490', align: 'right' });
  }

  private renderEntry(r: Renderer, sp: SpeciesData, box: { x: number; y: number; w: number; h: number }): void {
    const caught = this.state.caught.has(sp.id);
    // A sprite is 64 units square and most of that is empty air. Drawn whole it
    // ate two thirds of the panel and left the entry text a single line at the
    // bottom, which is how the last sentence ended up written under the footer.
    // Framing the creature's actual ink buys back twenty units of page.
    const portraitH = drawPortrait(r, sp.id, box.x + Math.floor(box.w / 2), box.y, 46);

    let y = box.y + portraitH + 4;
    r.text(fit(r, sp.name, box.w), box.x, y, { color: '#282838' });
    y += 10;
    r.text(fit(r, sp.category, box.w), box.x, y, { color: '#485068' });
    y += 11;

    // Chips are measured from their own captions. Fixed 40-unit badges are why
    // this panel used to say VERDAN.
    const meta = registry.typeChart?.meta;
    typeChips(r, box.x, y, sp.types.map((t) => meta?.[t]?.name ?? t),
      sp.types.map((t) => meta?.[t]?.color ?? '#888'));
    y += 12;

    const head = caught ? `${sp.height}m  ${sp.weight}kg` : 'Seen, not yet caught.';
    r.text(fit(r, head, box.w), box.x, y, { color: caught ? '#485068' : '#7a8398' });
    y += 10;

    // Whatever height is left, and not one line more.
    para(r, caught ? sp.vellumEntry : `Habitat: ${sp.habitat}`,
      { x: box.x, y, w: box.w, h: box.y + box.h - y },
      { color: caught ? '#282838' : '#485068', lineHeight: LINE_TIGHT });
  }
}

/* ------------------------------------------------------------- portrait */

/** Ink bounds of a front sprite, in buffer pixels. Measured once per species. */
const INK = new Map<string, { x: number; y: number; w: number; h: number }>();

function inkBounds(id: string): { x: number; y: number; w: number; h: number } {
  const hit = INK.get(id);
  if (hit) return hit;
  const cv = frontSprite(id);
  const d = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data;
  let minX = cv.width, minY = cv.height, maxX = -1, maxY = -1;
  for (let y = 0; y < cv.height; y++) {
    for (let x = 0; x < cv.width; x++) {
      if (d[(y * cv.width + x) * 4 + 3]! < 24) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  const b = maxX < 0
    ? { x: 0, y: 0, w: cv.width, h: cv.height }
    : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
  INK.set(id, b);
  return b;
}

/**
 * Draw a front sprite framed on the creature rather than on its 64-unit canvas,
 * centred on `cx` and capped at `maxH` units tall. Returns the height used, so
 * the caller can stack the entry under it instead of assuming a fixed drop.
 *
 * When the animal is taller than the window the top is kept: a face is worth
 * more than a pair of feet, which is the same call the party icons make.
 */
function drawPortrait(r: Renderer, id: string, cx: number, y: number, maxH: number): number {
  const b = inkBounds(id);
  const capH = Math.min(b.h, maxH * DETAIL);
  const w = Math.floor(b.w / DETAIL);
  const h = Math.floor(capH / DETAIL);
  r.image(frontSprite(id), cx - Math.floor(w / 2), y, b.x, b.y, b.w, capH);
  return h;
}
