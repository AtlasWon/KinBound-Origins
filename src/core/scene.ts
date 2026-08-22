/**
 * Scene stack.
 *
 * Scenes stack rather than replace, because this genre constantly layers UI over
 * live state: the overworld keeps running underneath a menu, a battle sits over
 * the map it started from, and a dialogue box sits over all of it. A scene
 * declares whether the scenes beneath it should still draw and still update.
 */

import type { Game } from './game.js';
import type { Renderer } from '../engine/renderer.js';

export interface Scene {
  readonly name: string;
  /** Scenes below still render (e.g. a menu over the map). */
  readonly transparent?: boolean;
  /** Scenes below still tick (rare: mostly for ambient animation). */
  readonly passthrough?: boolean;

  enter?(game: Game): void;
  exit?(game: Game): void;
  /** Called when a scene above this one is popped. */
  resume?(game: Game, result?: unknown): void;
  /** Called when a scene is pushed on top of this one. */
  suspend?(game: Game): void;

  update(game: Game, dt: number): void;
  render(game: Game, r: Renderer): void;
}

export class SceneStack {
  private stack: Scene[] = [];
  private pending: (() => void)[] = [];

  constructor(private game: Game) {}

  get top(): Scene | undefined {
    return this.stack[this.stack.length - 1];
  }

  get depth(): number {
    return this.stack.length;
  }

  /** Find the topmost scene with a given name. */
  find(name: string): Scene | undefined {
    for (let i = this.stack.length - 1; i >= 0; i--) {
      if (this.stack[i]!.name === name) return this.stack[i];
    }
    return undefined;
  }

  push(scene: Scene): void {
    this.pending.push(() => {
      this.top?.suspend?.(this.game);
      this.stack.push(scene);
      scene.enter?.(this.game);
    });
  }

  pop(result?: unknown): void {
    this.pending.push(() => {
      const s = this.stack.pop();
      s?.exit?.(this.game);
      this.top?.resume?.(this.game, result);
    });
  }

  /** Replace the whole stack; used for hard transitions like title -> world. */
  replaceAll(scene: Scene): void {
    this.pending.push(() => {
      while (this.stack.length) this.stack.pop()?.exit?.(this.game);
      this.stack.push(scene);
      scene.enter?.(this.game);
    });
  }

  /** Pop until the named scene is on top. */
  popTo(name: string): void {
    this.pending.push(() => {
      while (this.stack.length > 1 && this.top!.name !== name) {
        this.stack.pop()?.exit?.(this.game);
      }
      this.top?.resume?.(this.game);
    });
  }

  /** Apply queued mutations. Called between frames so a scene can safely
   *  push/pop from inside its own update without corrupting iteration. */
  flush(): void {
    while (this.pending.length) {
      const op = this.pending.shift()!;
      op();
    }
  }

  update(dt: number): void {
    // Walk down from the top until a scene blocks updates.
    let start = this.stack.length - 1;
    while (start > 0 && this.stack[start]!.passthrough) start--;
    for (let i = start; i < this.stack.length; i++) {
      this.stack[i]!.update(this.game, dt);
    }
  }

  render(r: Renderer): void {
    // Walk down to the deepest scene that must be drawn, then paint upward.
    let start = this.stack.length - 1;
    while (start > 0 && this.stack[start]!.transparent) start--;
    for (let i = start; i < this.stack.length; i++) {
      this.stack[i]!.render(this.game, r);
    }
  }
}
