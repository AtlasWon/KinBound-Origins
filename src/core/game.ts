/**
 * Game host.
 *
 * Owns the services every scene needs and runs a fixed-step simulation clock
 * decoupled from rendering. Simulation always advances in whole 1/60s ticks so
 * that movement, battle timing and animation frames are frame-rate independent
 * and reproducible; rendering happens once per animation frame regardless.
 */

import { Renderer } from '../engine/renderer.js';
import { InputManager } from './input.js';
import { AssetManager } from './assets.js';
import { SceneStack, type Scene } from './scene.js';
import { Rng } from './rng.js';
import { loadSettings, saveSettings, type Settings } from './settings.js';
import { audio } from '../audio/audio.js';
import type { TimeOfDay } from '../data/schema.js';

export const TICK_HZ = 60;
export const TICK_MS = 1000 / TICK_HZ;
/** Never simulate more than this many ticks in one frame after a stall. */
const MAX_CATCHUP_TICKS = 5;

export class Game {
  readonly renderer: Renderer;
  readonly input: InputManager;
  readonly assets: AssetManager;
  readonly scenes: SceneStack;
  readonly rng: Rng;

  settings: Settings;

  /** Total simulation ticks since boot; the canonical clock for animation. */
  ticks = 0;
  /** Seconds of play time, persisted in the save. */
  playTime = 0;

  debug = false;
  fps = 0;
  private fpsSamples: number[] = [];
  private accumulator = 0;
  private lastTime = 0;
  private running = false;
  private tickCost = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.settings = loadSettings();
    this.renderer = new Renderer(canvas);
    this.input = new InputManager(canvas, this.settings.bindings);
    this.assets = new AssetManager('');
    this.rng = new Rng();
    this.scenes = new SceneStack(this);
  }

  /** True while the tab is in the background. */
  private hidden = false;

  start(initial: Scene): void {
    // A backgrounded tab should not keep simulating; the accumulator is reset
    // on the way back so the world does not lurch forward on return.
    document.addEventListener('visibilitychange', () => {
      this.hidden = document.hidden;
      if (!this.hidden) {
        this.lastTime = performance.now();
        this.accumulator = 0;
      }
    });
    this.scenes.replaceAll(initial);
    this.scenes.flush();
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
  }

  persistSettings(): void {
    this.settings.bindings = this.input.bindings;
    saveSettings(this.settings);
  }

  /** Current in-world time band. */
  timeOfDay(): TimeOfDay {
    if (!this.settings.useSystemClock) return this.settings.fixedTime;
    const h = new Date().getHours();
    if (h >= 5 && h < 10) return 'morning';
    if (h >= 10 && h < 17) return 'day';
    if (h >= 17 && h < 20) return 'evening';
    return 'night';
  }

  /** 0..1 darkness applied to outdoor maps for the time of day. */
  /**
   * Ambient darkness for the time of day.
   *
   * Kept light on purpose. The ground palette is pale and low-contrast by
   * design, and a heavy night tint does not make it look like night -- it
   * makes it look like the wrong game. These values are enough to read the
   * hour off the screen while leaving the art recognisably itself.
   */
  ambientDarkness(): number {
    switch (this.timeOfDay()) {
      case 'morning': return 0.06;
      case 'day': return 0;
      case 'evening': return 0.15;
      case 'night': return 0.30;
    }
  }

  private frame = (now: number): void => {
    if (!this.running) return;
    requestAnimationFrame(this.frame);

    let elapsed = now - this.lastTime;
    this.lastTime = now;
    if (this.hidden) return;
    // A tab that was backgrounded must not try to simulate thousands of ticks.
    if (elapsed > 250) elapsed = TICK_MS;

    this.accumulator += elapsed;

    const tickStart = performance.now();
    let ticked = 0;
    while (this.accumulator >= TICK_MS && ticked < MAX_CATCHUP_TICKS) {
      this.accumulator -= TICK_MS;
      this.tick();
      ticked++;
    }
    // Drop the backlog rather than spiralling if we cannot keep up.
    if (this.accumulator > TICK_MS * MAX_CATCHUP_TICKS) this.accumulator = 0;
    this.tickCost = performance.now() - tickStart;

    this.render();
    this.sampleFps(elapsed);
  };

  private audioUnlocked = false;

  private tick(): void {
    this.ticks++;

    // Browsers only allow audio to start inside a user gesture.
    if (!this.audioUnlocked && this.input.anyPressed()) {
      this.audioUnlocked = true;
      audio.unlock();
    }
    this.playTime += 1 / TICK_HZ;

    this.input.viewport = this.renderer.viewport();
    this.input.update();

    if (this.input.pressed('debug')) this.debug = !this.debug;

    this.scenes.flush();
    this.scenes.update(1 / TICK_HZ);
    this.scenes.flush();

    this.input.postUpdate();
  }

  private render(): void {
    this.renderer.beginFrame();
    this.renderer.clear('#101018');
    this.scenes.render(this.renderer);
    if (this.debug || this.settings.showFps) this.renderDebug();
    this.renderer.present();
  }

  private renderDebug(): void {
    const r = this.renderer;
    const lines = [
      `FPS ${this.fps.toFixed(0)}  tick ${this.tickCost.toFixed(1)}ms`,
      `scene ${this.scenes.top?.name ?? '-'} (${this.scenes.depth})`,
    ];
    if (this.debug) {
      const a = this.assets.stats();
      lines.push(`assets j${a.json} i${a.images} x${a.failed}`);
      lines.push(`t ${this.ticks}  ${this.timeOfDay()}`);
      lines.push(`mouse ${this.input.mouse.x},${this.input.mouse.y} [${this.input.lastDevice}]`);
    }
    let y = 2;
    for (const line of lines) {
      r.text(line, 2, y, { color: '#9ce8a0', shadow: '#000000' });
      y += 9;
    }
  }

  private sampleFps(elapsed: number): void {
    if (elapsed <= 0) return;
    this.fpsSamples.push(1000 / elapsed);
    if (this.fpsSamples.length > 30) this.fpsSamples.shift();
    let sum = 0;
    for (const s of this.fpsSamples) sum += s;
    this.fps = sum / this.fpsSamples.length;
  }
}
