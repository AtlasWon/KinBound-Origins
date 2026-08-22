/**
 * Starter choice.
 *
 * The single most-remembered screen in the genre, so it gets its own scene
 * rather than a dialogue list. The three options are presented with what
 * actually matters to the decision -- typing and a plain-language role -- so a
 * first-time player is choosing a playstyle, not a colour.
 */

import type { Game } from '../core/game.js';
import type { Scene } from '../core/scene.js';
import { Renderer, SCREEN_H, SCREEN_W } from '../engine/renderer.js';
import { frontSprite } from '../gfx/kinsprite.js';
import { registry } from '../data/registry.js';
import { createKin } from '../systems/kin.js';
import { ask } from '../ui/dialogue.js';
import type { GameState } from '../systems/state.js';
import type { SpeciesData } from '../data/schema.js';

const ROLE_BLURB: Record<string, string> = {
  wall: 'Slow and very hard to move. Wins by outlasting.',
  sweeper: 'Fast and hits hard. Wins before it is hit back.',
  pivot: 'Controls the shape of a fight. Wins by out-thinking.',
  trapper: 'Locks a fight down and squeezes.',
  support: 'Keeps the rest of the team standing.',
  bruiser: 'Heavy, direct, and difficult to argue with.',
  glass: 'Dangerous while it lasts.',
};

export class StarterScene implements Scene {
  readonly name = 'starter';

  private index = 0;
  private options: SpeciesData[] = [];
  private t = 0;
  private confirming = false;

  constructor(
    private state: GameState,
    private ids: string[],
    private onDone: (chosen: string | null) => void,
  ) {}

  enter(): void {
    this.options = this.ids
      .map((id) => registry.species.get(id))
      .filter((s): s is SpeciesData => Boolean(s));
    if (this.options.length === 0) {
      // Never strand the player: fall back to whatever the registry has.
      this.options = [...registry.species.values()].slice(0, 3);
    }
  }

  resume(): void {
    this.confirming = false;
  }

  private slotRect(i: number): { x: number; y: number; w: number; h: number } {
    const w = 74;
    const gap = 4;
    const total = this.options.length * w + (this.options.length - 1) * gap;
    const x = Math.floor((SCREEN_W - total) / 2) + i * (w + gap);
    return { x, y: 14, w, h: 92 };
  }

  update(game: Game, dt: number): void {
    this.t += dt;
    if (this.confirming) return;

    const n = this.options.length;
    if (n === 0) return;

    for (let i = 0; i < n; i++) {
      const r = this.slotRect(i);
      if (game.input.mouseOver(r.x, r.y, r.w, r.h)) {
        if (game.input.mouse.idleFrames < 2) this.index = i;
        if (game.input.mouse.leftPressed) { this.index = i; this.confirm(game); return; }
      }
    }

    if (game.input.repeated('right')) this.index = (this.index + 1) % n;
    if (game.input.repeated('left')) this.index = (this.index - 1 + n) % n;
    if (game.input.pressed('confirm')) this.confirm(game);
    // Deliberately no cancel: this choice has to be made before moving on.
  }

  private confirm(game: Game): void {
    const sp = this.options[this.index];
    if (!sp) return;
    this.confirming = true;
    ask(game, [
      `${sp.name}, then.`,
      `${sp.category}.`,
      'Are you sure?',
    ], (yes) => {
      if (!yes) { this.confirming = false; return; }
      // Level six, not five. The first fights were measured at a few percent
      // with a level-five starter and no second kin to fall back on.
      const kin = createKin(sp.id, 6, game.rng, { originalTrainer: 'player' });
      kin.metAt = 'vess_station';
      this.state.addKin(kin);
      this.state.setFlag('got_starter');
      // The rival picks the type that beats this one, so record the choice.
      this.state.setFlag(`starter_${sp.id}`);
      game.scenes.pop();
      this.onDone(sp.id);
    }, 'DR. VESS');
  }

  render(_game: Game, r: Renderer): void {
    r.clear('#2a3348');
    for (let y = 0; y < SCREEN_H; y += 4) r.rect(0, y, SCREEN_W, 1, '#303a52');

    r.text('Choose the one that will walk with you.', SCREEN_W / 2, 4, {
      color: '#e8eefa', shadow: '#141a28', align: 'center',
    });

    this.options.forEach((sp, i) => {
      const box = this.slotRect(i);
      const selected = i === this.index;
      // The selected pedestal lifts, which reads instantly even at a glance.
      const lift = selected ? 3 : 0;
      const bob = selected ? Math.round(Math.sin(this.t * 3) * 1) : 0;

      r.window(box.x, box.y - lift, box.w, box.h, {
        fill: selected ? '#eef2fa' : '#c9d0e0',
        highlight: selected ? '#8fa8d8' : '#a8b0c4',
      });

      r.image(frontSprite(sp.id), box.x + Math.floor((box.w - 64) / 2), box.y - lift + 2 + bob);

      r.text(sp.name, box.x + box.w / 2, box.y - lift + 66, {
        color: '#282838', align: 'center',
      });

      let tx = box.x + 4;
      for (const t of sp.types) {
        const meta = registry.typeChart?.meta?.[t];
        const w = sp.types.length > 1 ? 32 : 66;
        r.rect(tx, box.y - lift + 78, w, 9, meta?.color ?? '#888');
        r.outline(tx, box.y - lift + 78, w, 9, '#282838');
        r.text((meta?.name ?? t).toUpperCase().slice(0, sp.types.length > 1 ? 5 : 9),
          tx + 3, box.y - lift + 79, { color: '#ffffff' });
        tx += w + 2;
      }
    });

    const sp = this.options[this.index];
    const panelY = SCREEN_H - 50;
    r.window(6, panelY, SCREEN_W - 12, 46);
    if (sp) {
      const maxW = SCREEN_W - 24;
      // Measure the blurb so the record line below it never collides.
      const blurbLines = r.wrapText(ROLE_BLURB[sp.design.role] ?? '', maxW);
      let ty = panelY + 5;
      for (const line of blurbLines) {
        r.text(line, 12, ty, { color: '#282838' });
        ty += 10;
      }
      const room = Math.max(0, Math.floor((panelY + 42 - ty) / 9));
      for (const line of r.wrapText(sp.vellumEntry, maxW).slice(0, room)) {
        r.text(line, 12, ty, { color: '#485068' });
        ty += 9;
      }
    }
  }
}
