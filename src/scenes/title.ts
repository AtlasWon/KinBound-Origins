/**
 * Title screen.
 *
 * Establishes the region's central image before a word of story is told: a
 * crescent coast wrapped around the Hollow Sea, with something very large
 * moving under it.
 */

import type { Game } from '../core/game.js';
import type { Scene } from '../core/scene.js';
import { Renderer, SCREEN_H, SCREEN_W } from '../engine/renderer.js';
import { makeTextSprite } from '../gfx/textart.js';
import { ListMenu } from '../ui/menu.js';
import { audio } from '../audio/audio.js';
import { OverworldScene } from './overworld.js';
import { OpeningScene } from './opening.js';
import { GameState } from '../systems/state.js';
import { OptionsScene } from './options.js';
import { load, saveExists } from '../systems/save.js';

const SKY_BANDS = [
  '#1b2340', '#243056', '#2f3d68', '#3d4c78', '#4f5d88',
  '#66708f', '#7f7f93', '#9a8a93', '#b8968f', '#d0a289',
];

const SEA_BANDS = ['#16233e', '#1a2b4a', '#1f3355', '#243b60', '#2a446c'];

export class TitleScene implements Scene {
  readonly name = 'title';

  private logo?: HTMLCanvasElement;
  private subtitle?: HTMLCanvasElement;
  private t = 0;
  private phase: 'attract' | 'menu' = 'attract';
  private menu = new ListMenu<string>([], 3);
  private stars: { x: number; y: number; b: number }[] = [];

  enter(game: Game): void {
    audio.playMusic('title_theme');
    this.logo = makeTextSprite('KINBOUND', {
      scale: 3,
      fill: ['#ffe9b0', '#ffd27a', '#f0a94e', '#d4813a'],
      outline: '#241c28',
      shadow: 'rgba(10,10,20,0.5)',
      shadowOffset: 2,
      letterSpacing: 1,
    });
    this.subtitle = makeTextSprite('AMBER VERSION', {
      scale: 1,
      fill: ['#cfe0f0'],
      outline: '#1a2030',
      shadow: null,
      letterSpacing: 2,
    });

    const rng = game.rng;
    this.stars = Array.from({ length: 40 }, () => ({
      x: rng.below(SCREEN_W),
      y: rng.below(60),
      b: rng.next(),
    }));

    this.menu.setItems([
      { label: 'NEW JOURNEY', value: 'new' },
      { label: 'CONTINUE', value: 'continue', enabled: saveExists(1) || saveExists(2) || saveExists(3) || saveExists(0) },
      { label: 'OPTIONS', value: 'options' },
    ]);
  }

  update(game: Game, dt: number): void {
    this.t += dt;

    if (this.phase === 'attract') {
      if (game.input.pressed('confirm') || game.input.pressed('menu') ||
          game.input.mouse.leftPressed) {
        this.phase = 'menu';
      }
      return;
    }

    const res = this.menu.update(game);
    if (res === 'select') {
      const choice = this.menu.selectedValue;
      if (choice === 'new') {
        // A new journey starts with the cinematic and character creation; the
        // creator is what finally hands the state to the overworld.
        game.scenes.replaceAll(new OpeningScene(new GameState()));
      } else if (choice === 'continue') {
        // Newest save wins, so "continue" means what the player expects.
        const slots = [0, 1, 2, 3]
          .map((s) => ({ s, loaded: load(s) }))
          .filter((e) => e.loaded)
          .sort((a, b) => (b.loaded!.header.savedAt) - (a.loaded!.header.savedAt));
        const best = slots[0];
        if (best?.loaded) {
          const st = best.loaded.state;
          game.playTime = st.playTime;
          game.scenes.replaceAll(
            new OverworldScene(st, st.currentMap, st.currentX, st.currentY, st.currentFacing),
          );
        }
      } else if (choice === 'options') {
        game.scenes.push(new OptionsScene());
      }
    } else if (res === 'cancel') {
      this.phase = 'attract';
    }
  }

  render(_game: Game, r: Renderer): void {
    this.renderSky(r);
    this.renderSea(r);
    this.renderCoast(r);
    this.renderWarden(r);

    if (this.logo) {
      r.image(this.logo, Math.floor((SCREEN_W - this.logo.width) / 2), 22);
    }
    if (this.subtitle) {
      r.image(this.subtitle, Math.floor((SCREEN_W - this.subtitle.width) / 2), 52);
    }

    if (this.phase === 'attract') {
      // A slow blink, not a fast one: the era's title screens breathed.
      if (Math.floor(this.t * 1.6) % 2 === 0) {
        r.text('PRESS ENTER', SCREEN_W / 2, 128, {
          color: '#f4f4f8', shadow: '#1a2030', align: 'center',
        });
      }
      r.text('An original monster-catching adventure', SCREEN_W / 2, SCREEN_H - 12, {
        color: '#8fa4c0', shadow: '#12161f', align: 'center',
      });
    } else {
      const w = 96;
      const x = Math.floor((SCREEN_W - w) / 2);
      this.menu.render(r, x, 104, w, { rowHeight: 12, highlightBar: false });
    }
  }

  private renderSky(r: Renderer): void {
    const bandH = Math.ceil(96 / SKY_BANDS.length);
    SKY_BANDS.forEach((c, i) => r.rect(0, i * bandH, SCREEN_W, bandH, c));

    for (const s of this.stars) {
      const twinkle = 0.5 + 0.5 * Math.sin(this.t * 1.5 + s.b * 10);
      if (twinkle > 0.55) {
        const shade = twinkle > 0.85 ? '#ffffff' : '#c8d0e8';
        r.rect(s.x, s.y, 1, 1, shade);
      }
    }
  }

  private renderSea(r: Renderer): void {
    const top = 96;
    const bandH = Math.ceil((SCREEN_H - top) / SEA_BANDS.length);
    SEA_BANDS.forEach((c, i) => r.rect(0, top + i * bandH, SCREEN_W, bandH, c));

    // Horizontal shimmer lines that drift; cheap, and it sells "water" instantly.
    for (let i = 0; i < 14; i++) {
      const y = top + 4 + i * 4;
      const phase = this.t * (10 + i * 1.5) + i * 30;
      const w = 6 + ((i * 7) % 11);
      const x = Math.floor((phase % (SCREEN_W + 40)) - 20);
      const alpha = i < 8 ? '#3f5a80' : '#365070';
      r.rect(x, y, w, 1, alpha);
      r.rect((x + 90) % SCREEN_W, y, Math.floor(w / 2), 1, alpha);
    }
  }

  private renderCoast(r: Renderer): void {
    // A dark crescent headland framing the left and right of the sea.
    for (let x = 0; x < SCREEN_W; x++) {
      const edge = Math.abs(x - SCREEN_W / 2) / (SCREEN_W / 2);
      const height = Math.floor(Math.pow(edge, 3) * 46);
      if (height > 0) {
        r.rect(x, 96 - height, 1, height + 2, '#141a2a');
        r.rect(x, 96 - height, 1, 1, '#232c42');
      }
    }
  }

  private renderWarden(r: Renderer): void {
    // A vast silhouette rolling just under the surface.
    const cx = SCREEN_W / 2 + Math.sin(this.t * 0.25) * 40;
    const cy = 132 + Math.sin(this.t * 0.5) * 2;
    const color = '#101a30';
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI;
      const w = Math.floor(Math.sin(a) * 54);
      if (w <= 0) continue;
      const y = Math.floor(cy - 8 + i * 0.55);
      r.rect(Math.floor(cx - w / 2), y, w, 1, color);
    }
    // Two dim eye-lights, the only warm colour below the waterline.
    const glow = 0.5 + 0.5 * Math.sin(this.t * 1.1);
    if (glow > 0.4) {
      r.rect(Math.floor(cx - 9), Math.floor(cy - 2), 2, 1, '#c98b4a');
      r.rect(Math.floor(cx + 7), Math.floor(cy - 2), 2, 1, '#c98b4a');
    }
  }
}
