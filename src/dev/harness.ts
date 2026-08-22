/**
 * Development harness.
 *
 * Loaded only when the page is opened with ?dev=1. It exposes a scripted
 * playtest API so a session can be driven deterministically -- press keys, run
 * N simulation ticks, capture the low-resolution back buffer -- without needing
 * a human at the keyboard. This is how the game gets regression-checked
 * visually after every change.
 *
 * None of this ships in a release build; nothing in src/ imports it except the
 * guarded dynamic import in main.ts.
 */

import type { Game } from '../core/game.js';

interface Harness {
  game: Game;
  /** Advance the simulation by n ticks and render once. */
  tick(n?: number): void;
  /** Tap a key: down, one tick, up, then n settle ticks. */
  key(code: string, settle?: number): void;
  /** Hold a key down for n ticks, then release. */
  hold(code: string, ticks: number): void;
  /** Type literal characters, for name entry and anything else that reads text. */
  type(text: string, settle?: number): void;
  /** Press and hold without releasing. */
  down(code: string): void;
  up(code: string): void;
  /** Move the mouse to game-space x,y. */
  mouse(x: number, y: number): void;
  click(x: number, y: number): void;
  /** Capture the back buffer to build/shots/<name>.png. */
  shoot(name: string, ticks?: number, scale?: number): Promise<string>;
  /** Compact snapshot of what is happening right now. */
  probe(): Record<string, unknown>;
  /** Walk a direction for n tiles, waiting for each step to land. */
  walk(dir: 'up' | 'down' | 'left' | 'right', tiles?: number): void;
  sleep(ms?: number): Promise<void>;
  loadWait(ms?: number): Promise<void>;
}

const KEY_FOR: Record<string, string> = {
  up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD',
};

export function installHarness(game: Game): void {
  const canvas = game.renderer.canvas;

  const fire = (type: 'keydown' | 'keyup', code: string) => {
    window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));
  };

  const tick = (n = 1) => {
    for (let i = 0; i < n; i++) (game as unknown as { tick(): void }).tick();
    (game as unknown as { render(): void }).render();
  };

  const h: Harness = {
    game,

    tick,

    key(code, settle = 2) {
      fire('keydown', code);
      tick(1);
      fire('keyup', code);
      if (settle > 0) tick(settle);
    },

    hold(code, ticks) {
      fire('keydown', code);
      tick(ticks);
      fire('keyup', code);
      tick(1);
    },

    // Typing needs the event's `key`, not just its `code`: that is the field
    // the text buffer reads, and a synthetic event without it produces
    // keystrokes that move the player but never spell anything.
    type(text, settle = 2) {
      for (const ch of text) {
        const code = /[a-z]/i.test(ch) ? 'Key' + ch.toUpperCase()
          : /[0-9]/.test(ch) ? 'Digit' + ch
          : ch === ' ' ? 'Space' : 'Unidentified';
        window.dispatchEvent(new KeyboardEvent('keydown', { key: ch, code, bubbles: true }));
        tick(1);
        window.dispatchEvent(new KeyboardEvent('keyup', { key: ch, code, bubbles: true }));
      }
      tick(settle);
    },

    down(code) { fire('keydown', code); },
    up(code) { fire('keyup', code); },

    mouse(x, y) {
      const vp = game.renderer.viewport();
      const rect = canvas.getBoundingClientRect();
      const clientX = rect.left + (x * vp.scale + vp.x) * (rect.width / canvas.width);
      const clientY = rect.top + (y * vp.scale + vp.y) * (rect.height / canvas.height);
      canvas.dispatchEvent(new MouseEvent('mousemove', { clientX, clientY, bubbles: true }));
    },

    click(x, y) {
      h.mouse(x, y);
      tick(1);
      canvas.dispatchEvent(new MouseEvent('mousedown', { button: 0, bubbles: true }));
      tick(1);
      window.dispatchEvent(new MouseEvent('mouseup', { button: 0, bubbles: true }));
      tick(1);
    },

    async shoot(name, ticks = 0, scale = 1) {
      if (ticks > 0) tick(ticks);
      else (game as unknown as { render(): void }).render();

      let source: HTMLCanvasElement = game.renderer.buffer;
      if (scale > 1) {
        const up = document.createElement('canvas');
        up.width = source.width * scale;
        up.height = source.height * scale;
        const cx = up.getContext('2d')!;
        cx.imageSmoothingEnabled = false;
        cx.drawImage(source, 0, 0, up.width, up.height);
        source = up;
      }
      const url = source.toDataURL('image/png');
      const res = await fetch('/__shot/' + encodeURIComponent(name), { method: 'POST', body: url });
      return res.text();
    },

    probe() {
      const top = game.scenes.top as unknown as Record<string, any>;
      const out: Record<string, unknown> = {
        scene: game.scenes.top?.name,
        depth: game.scenes.depth,
        ticks: game.ticks,
      };
      if (top?.player) {
        out.map = top.map?.id;
        out.pos = `${top.player.tileX},${top.player.tileY}`;
        out.facing = top.player.facing;
        out.moving = top.player.moving;
        out.busy = top.busy;
      }
      if (top?.pages) {
        out.dialoguePage = `${top.page + 1}/${top.pages.length}`;
        out.text = (top.pages[top.page] ?? []).join(' / ');
      }
      return out;
    },

    walk(dir, tiles = 1) {
      // Movement is continuous now, so walking is just holding the key for the
      // time it takes to cover that many tiles.
      const code = KEY_FOR[dir]!;
      const pos = () => {
        const top = game.scenes.top as unknown as Record<string, any>;
        const p2 = top?.player;
        return p2 ? { x: p2.tileX, y: p2.tileY } : null;
      };
      const before = pos();
      fire('keydown', code);
      // 16px per tile at the walk speed, plus a little slack for corner assist.
      tick(Math.ceil(tiles * 15) + 2);
      fire('keyup', code);
      tick(2);
      const after = pos();
      void before; void after;
    },

    async sleep(ms = 60) {
      await new Promise((r) => setTimeout(r, ms));
    },

    async loadWait(ms = 350) {
      // Yield so pending map/asset fetches can resolve, then settle the fade.
      await new Promise((r) => setTimeout(r, ms));
      tick(40);
      await new Promise((r) => setTimeout(r, 60));
      tick(20);
    },
  };

  // `dev` is the name now; `tw` stays because scripts written before the game
  // was renamed still reach for it and there is no reason to break them.
  const g = globalThis as unknown as { dev: Harness; tw: Harness };
  g.dev = h;
  g.tw = h;
  console.log('[dev] harness installed as window.dev');
}
