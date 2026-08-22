/**
 * Region map.
 *
 * The whole of Veldras at once, including the parts the player has not reached.
 * Unvisited places show as unlabelled marks rather than being hidden: the map
 * is supposed to look bigger than the road you have walked, because that gap is
 * what makes the next route worth starting.
 *
 * The landmass is generated rather than drawn -- a ring of land around the
 * Hollow Sea with a strait cut into the south-east -- so it stays consistent
 * with the geography described in the design bible.
 */

import type { Game } from '../core/game.js';
import type { Scene } from '../core/scene.js';
import { Renderer, SCREEN_H, SCREEN_W } from '../engine/renderer.js';
import type { GameState } from '../systems/state.js';

const GRID_W = 40;
const GRID_H = 30;

/** Screen rectangle the grid is drawn into. */
const VIEW = { x: 6, y: 14, w: 228, h: 116 };

interface Place {
  id: string;
  name: string;
  x: number;
  y: number;
  kind: 'town' | 'route' | 'bastion' | 'spire';
  blurb?: string;
}

interface PlacesFile {
  seaName: string;
  places: Place[];
}

type Cell = 'ocean' | 'sea' | 'land' | 'coast';

export class RegionMapScene implements Scene {
  readonly name = 'regionmap';
  readonly transparent = true;

  private places: Place[] = [];
  private seaName = 'THE HOLLOW SEA';
  private cells: Cell[] = [];
  private index = 0;
  private t = 0;

  constructor(private state: GameState) {}

  async enter(game: Game): Promise<void> {
    this.buildLandmass();
    const file = await game.assets
      .loadJson<PlacesFile>('data/region/places.json')
      .catch(() => null);
    if (file) {
      this.places = file.places;
      this.seaName = file.seaName ?? this.seaName;
    }
    // Open on wherever the player is standing, if it is on the map at all.
    const here = this.places.findIndex((p) => p.id === this.state.currentMap);
    if (here >= 0) this.index = here;
  }

  /**
   * A ring of land around a central sea, with the south-east quadrant cut away
   * to leave the strait. Everything is derived from one distance field, which
   * keeps the coastline smooth without hand-plotting thirty rows of tiles.
   */
  private buildLandmass(): void {
    const cx = 19.5;
    const cy = 15;
    const rx = 16.5;
    const ry = 13.5;

    this.cells = new Array(GRID_W * GRID_H).fill('ocean');
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        const d = Math.sqrt(dx * dx + dy * dy);

        // The strait: a wedge opening to the south-east.
        const angle = Math.atan2(y - cy, x - cx);
        const inStrait = angle > 0.18 && angle < 1.25;

        let cell: Cell = 'ocean';
        if (d < 0.60) cell = 'sea';
        else if (d < 0.72) cell = inStrait ? 'sea' : 'coast';
        // Outside the coast the strait carries open water all the way out, so
        // the Hollow Sea reads as connected to the ocean rather than landlocked.
        else if (d < 1.02) cell = inStrait ? 'sea' : 'land';
        else if (d < 1.14 && inStrait) cell = 'coast';
        this.cells[y * GRID_W + x] = cell;
      }
    }

    // Solmere sits alone in the middle of the Hollow Sea.
    for (let y = 13; y <= 15; y++) {
      for (let x = 17; x <= 19; x++) this.cells[y * GRID_W + x] = 'land';
    }
  }

  private cellAt(x: number, y: number): Cell {
    if (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H) return 'ocean';
    return this.cells[y * GRID_W + x]!;
  }

  private screenOf(gx: number, gy: number): { x: number; y: number; w: number; h: number } {
    const w = Math.floor(VIEW.w / GRID_W);
    const h = Math.floor(VIEW.h / GRID_H);
    return { x: VIEW.x + gx * w, y: VIEW.y + gy * h, w, h };
  }

  private known(p: Place): boolean {
    return this.state.hasVisited(p.id);
  }

  update(game: Game, dt: number): void {
    this.t += dt;
    if (game.input.pressed('cancel') || game.input.pressed('map')) { game.scenes.pop(); return; }
    if (this.places.length === 0) return;

    // Cursor moves to whichever place lies furthest in the pressed direction,
    // which reads far better on a scattered map than a flat list order.
    const step = (dx: number, dy: number) => {
      const cur = this.places[this.index]!;
      let best = -1;
      let bestScore = Infinity;
      this.places.forEach((p, i) => {
        if (i === this.index) return;
        const ox = p.x - cur.x;
        const oy = p.y - cur.y;
        const along = ox * dx + oy * dy;
        if (along <= 0) return;
        const across = Math.abs(ox * dy - oy * dx);
        const score = along + across * 2.5;
        if (score < bestScore) { bestScore = score; best = i; }
      });
      if (best >= 0) this.index = best;
    };

    if (game.input.repeated('up')) step(0, -1);
    if (game.input.repeated('down')) step(0, 1);
    if (game.input.repeated('left')) step(-1, 0);
    if (game.input.repeated('right')) step(1, 0);

    if (game.input.mouse.inside) {
      this.places.forEach((p, i) => {
        const s = this.screenOf(p.x, p.y);
        if (game.input.mouseOver(s.x - 3, s.y - 3, 9, 9) && game.input.mouse.idleFrames < 2) {
          this.index = i;
        }
      });
    }
  }

  render(_game: Game, r: Renderer): void {
    r.clear('#101a2c');

    r.window(2, 2, SCREEN_W - 4, 12, { fill: '#e8eefa' });
    r.text('VELDRAS', SCREEN_W / 2, 5, { color: '#282838', align: 'center' });

    this.renderLandmass(r);
    this.renderPlaces(r);
    this.renderPanel(r);
  }

  private renderLandmass(r: Renderer): void {
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        const c = this.cellAt(x, y);
        const s = this.screenOf(x, y);
        let color: string | null = null;
        if (c === 'sea') color = '#26456e';
        else if (c === 'coast') color = '#2f5a86';
        else if (c === 'land') color = '#4a6b44';
        else color = '#16273f';
        r.rect(s.x, s.y, s.w, s.h, color);

        // A lighter rim wherever land meets water reads as a coastline.
        if (c === 'land') {
          const nearWater =
            this.cellAt(x - 1, y) !== 'land' || this.cellAt(x + 1, y) !== 'land' ||
            this.cellAt(x, y - 1) !== 'land' || this.cellAt(x, y + 1) !== 'land';
          if (nearWater) r.rect(s.x, s.y, s.w, s.h, '#5f8354');
        }
      }
    }

    const mid = this.screenOf(19, 15);
    r.text(this.seaName, mid.x, mid.y, { color: '#6f9ac4', align: 'center' });
  }

  private renderPlaces(r: Renderer): void {
    this.places.forEach((p, i) => {
      const s = this.screenOf(p.x, p.y);
      const known = this.known(p);
      const selected = i === this.index;
      const here = p.id === this.state.currentMap;

      const color = !known ? '#7a8496'
        : p.kind === 'bastion' ? '#e0b048'
        : p.kind === 'spire' ? '#d06a90'
        : p.kind === 'route' ? '#c8d0e0'
        : '#f0f4fc';

      if (p.kind === 'route') {
        r.rect(s.x + 1, s.y + 1, 2, 2, color);
      } else {
        r.rect(s.x, s.y, 4, 4, color);
        r.outline(s.x - 1, s.y - 1, 6, 6, '#141c2c');
      }

      // The player's own position pulses so it is findable at a glance.
      if (here && Math.floor(this.t * 3) % 2 === 0) {
        r.outline(s.x - 3, s.y - 3, 10, 10, '#ffe066');
      }
      if (selected) {
        r.outline(s.x - 2, s.y - 2, 8, 8, '#ffffff');
      }
    });
  }

  private renderPanel(r: Renderer): void {
    const p = this.places[this.index];
    r.window(2, SCREEN_H - 26, SCREEN_W - 4, 24);
    if (!p) return;

    if (this.known(p)) {
      r.text(p.name, 8, SCREEN_H - 21, { color: '#282838' });
      r.text(p.blurb ?? '', 8, SCREEN_H - 11, { color: '#485068', maxWidth: 150 });
    } else {
      r.text('Unmapped', 8, SCREEN_H - 21, { color: '#7a8398' });
      r.text('You have not been here yet.', 8, SCREEN_H - 11, { color: '#9aa4bc' });
    }

    const seen = this.places.filter((q) => this.known(q)).length;
    r.text(`${seen}/${this.places.length}`, SCREEN_W - 8, SCREEN_H - 21, {
      color: '#485068', align: 'right',
    });
    r.text('Esc close', SCREEN_W - 8, SCREEN_H - 11, { color: '#6a7490', align: 'right' });
  }
}
