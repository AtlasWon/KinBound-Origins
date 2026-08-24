/**
 * Renderer.
 *
 * Two coordinate systems, deliberately:
 *
 *  - **Logical units** are what every scene lays out in. 240x160 is the native
 *    field of the hardware the game is modelled on, and it is still the floor:
 *    the view never gets *smaller* than that, so composition, camera framing
 *    and text size stay era-correct.
 *  - **Buffer pixels** are `DETAIL` times denser. Art -- tiles, characters,
 *    creatures, the font -- is authored at that density, so the picture carries
 *    roughly four times the detail of the reference hardware while framing the
 *    same amount of world.
 *
 * Everything a scene passes in is logical; the renderer multiplies. The buffer
 * is then blitted to the canvas at an integer scale with smoothing off, so the
 * pixel grid survives all the way to the screen.
 *
 * ## The shape problem
 *
 * 240x160 is 3:2. Almost every screen sold this decade is 16:9. A 3:2 picture
 * on a 16:9 display has a margin down both sides however it is scaled, and the
 * ways out are all trades:
 *
 *  - a whole-number scale is perfectly sharp and leaves the most margin
 *    (240 pixels a side on a 1920x1080 screen);
 *  - an exact scale reaches the top and bottom and cuts the side margin to 150,
 *    at the price of a scale factor that is not a whole number;
 *  - cropping to fill would cut a third of the height off and take the dialogue
 *    box with it, so it is not on the table;
 *  - stretching to fill would make every creature 18% wider than it was drawn,
 *    so neither is that;
 *  - framing *more world* -- a view as wide as the display's own shape -- is the
 *    only thing that clears the margin outright.
 *
 * `ScreenFit` below offers the first, the second and the last of those. The
 * default is the second. The reasoning for each is on the type.
 *
 * ## Why the view size is decided once, at module load
 *
 * Scenes capture layout constants at import time (`battle.ts` has
 * `w: SCREEN_W` in a module-level object; `arena.ts` bakes its backdrops into
 * canvases sized `BUFFER_W` x `BUFFER_H` and caches them). A view size that
 * changed underneath them would leave half the game laid out for the old one.
 * So the size is worked out here, before anything imports it, and is then
 * constant for the life of the page. Resizing the window afterwards changes the
 * blit scale and nothing else.
 */

import { getGlyph, GLYPH_H, GLYPH_W, advanceOf, measureText, tokenize } from '../gfx/font.js';

/** Buffer pixels per logical unit. */
export const DETAIL = 2;

/**
 * The authored view: the reference hardware's field, and the smallest the view
 * is ever allowed to be. Every layout in the game is known to fit in this.
 */
export const AUTHORED_W = 240;
export const AUTHORED_H = 160;

/**
 * The widest and tallest the view may grow to.
 *
 * Not a technical limit -- a ceiling on how much extra world an unusually shaped
 * display is allowed to reveal. 432x240 covers 16:9 and 16:10 outright and
 * leaves only a sliver on a 21:9 ultrawide, while stopping a very wide monitor
 * from turning every interior into a small room in a large void.
 */
const MAX_VIEW_W = 432;
const MAX_VIEW_H = 240;

/**
 * The default, and the reasoning.
 *
 * 240x160 is 3:2 and the screen this was asked for is 16:9, so a picture that
 * keeps the authored shape cannot reach both pairs of edges however it is
 * scaled -- `sharp` leaves 240 pixels of margin a side on a 1080p display and
 * `fit` still leaves 150. Only `wide` clears them, and `wide` is not finished
 * until the fixed-coordinate layouts follow the view.
 *
 * So the default is `fit`: the largest the authored picture can be drawn, top
 * and bottom margins gone, side margins cut by well over a third, and a scaling
 * path good enough that the result still reads as pixel art rather than as a
 * blurred upscale.
 */
const DEFAULT_SCREEN_FIT: ScreenFit = 'fit';

/**
 * How the picture is fitted to the display.
 *
 *  - `sharp`  -- whole-number scale of the authored 240x160 view. Every pixel is
 *    exactly square and exactly the same size as its neighbours. On a 1920x1080
 *    screen that is a scale of 3, so the picture is 1440x960 and there is a
 *    margin all the way round.
 *  - `fit`    -- the same 240x160 view, scaled to touch the top and bottom of the
 *    display exactly. 1620x1080 on that same screen: the horizontal margin drops
 *    from 240 pixels a side to 150 and the vertical margin disappears, at the
 *    cost of a scale factor that is no longer a whole number. See `present()`
 *    for what is done about that, which is more than nearest-neighbour.
 *  - `wide`   -- whole-number scale of a view grown to the display's own shape,
 *    which is the only setting that removes the margin entirely. Every scene
 *    that lays out against `SCREEN_W`/`SCREEN_H` follows it correctly; the ones
 *    that pin panels at fixed coordinates authored for 240x160 do not, so the
 *    battle HUD and the full-screen menus sit in the top-left of a larger field
 *    rather than filling it. Offered, and honestly labelled, until those are
 *    anchored.
 */
export type ScreenFit = 'sharp' | 'fit' | 'wide';

const SCREEN_FITS: readonly ScreenFit[] = ['sharp', 'fit', 'wide'];

function asScreenFit(value: unknown): ScreenFit | null {
  // 'classic' was the name this setting had while it only had two values.
  if (value === 'classic') return 'sharp';
  return SCREEN_FITS.includes(value as ScreenFit) ? value as ScreenFit : null;
}

/** Where the game's window sits, when the host has a say in it. */
export type DisplayMode = 'borderless' | 'windowed';

/** The key `src/core/settings.ts` stores under, read here without importing it. */
const SETTINGS_KEY = 'kinbound.settings.v1';
const LEGACY_SETTINGS_KEY = 'tideward.settings.v1';

interface StoredDisplaySettings {
  screenFit?: unknown;
  displayMode?: unknown;
}

/**
 * Read the two display settings straight out of storage.
 *
 * Deliberately not `loadSettings()`: this runs at module-evaluation time, and
 * importing the settings module here would put the renderer downstream of a
 * module that is itself downstream of half the game. A malformed or missing
 * value simply falls back to the default.
 */
function storedDisplaySettings(): StoredDisplaySettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY) ?? localStorage.getItem(LEGACY_SETTINGS_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return (parsed && typeof parsed === 'object') ? parsed as StoredDisplaySettings : {};
  } catch {
    return {};
  }
}

function queryOverride(name: string): string | null {
  try {
    return new URLSearchParams(location.search).get(name);
  } catch {
    return null;
  }
}

export function currentScreenFit(): ScreenFit {
  // The query string wins so a capture run is reproducible whatever the machine
  // it runs on happens to have stored.
  const q = asScreenFit(queryOverride('view'));
  if (q) return q;
  // The screenshot harness gets the authored view at a whole-number scale unless
  // it asks otherwise. Every driver in tools/shots frames its shot in 240x160
  // units and every reference image in build/shots is 480x320; a view that
  // quietly followed the size of whatever window the harness happened to open
  // would make the whole set of them incomparable from one run to the next.
  if (queryOverride('dev') !== null) return 'sharp';
  return asScreenFit(storedDisplaySettings().screenFit) ?? DEFAULT_SCREEN_FIT;
}

export function currentDisplayMode(): DisplayMode {
  const q = queryOverride('window');
  if (q === 'windowed' || q === 'borderless') return q;
  const stored = storedDisplaySettings().displayMode;
  return stored === 'windowed' ? 'windowed' : 'borderless';
}

/**
 * Work out the logical view for this session.
 *
 * Pick the largest whole-number blit scale at which the authored 240x160 still
 * fits, then hand back however many logical units that scale divides the
 * viewport into. Widths and heights are rounded down to even numbers so that
 * `SCREEN_W / 2` -- which a great many layouts use to centre things -- stays a
 * whole unit.
 */
function chooseView(): { w: number; h: number } {
  // Node runs the test suite against the compiled modules; there is no window
  // there, and the authored size is the only sensible answer.
  if (typeof window === 'undefined') return { w: AUTHORED_W, h: AUTHORED_H };
  if (currentScreenFit() !== 'wide') return { w: AUTHORED_W, h: AUTHORED_H };

  const availW = Math.max(1, Math.floor(window.innerWidth));
  const availH = Math.max(1, Math.floor(window.innerHeight));

  let scale = 1;
  for (let s = 1; s <= 16; s++) {
    const fitsW = Math.floor(availW / (s * DETAIL)) >= AUTHORED_W;
    const fitsH = Math.floor(availH / (s * DETAIL)) >= AUTHORED_H;
    if (fitsW && fitsH) scale = s; else break;
  }

  const even = (n: number): number => n - (n % 2);
  const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n));
  return {
    w: clamp(even(Math.floor(availW / (scale * DETAIL))), AUTHORED_W, MAX_VIEW_W),
    h: clamp(even(Math.floor(availH / (scale * DETAIL))), AUTHORED_H, MAX_VIEW_H),
  };
}

const VIEW = chooseView();

/** Logical layout units for this session. Never below 240x160. */
export const SCREEN_W = VIEW.w;
export const SCREEN_H = VIEW.h;

export const BUFFER_W = SCREEN_W * DETAIL;
export const BUFFER_H = SCREEN_H * DETAIL;

/* ------------------------------------------------------- the host window */

/**
 * Borderless-fullscreen versus windowed, in two very different hosts.
 *
 * In the desktop build the launcher's main process owns the BrowserWindow and
 * is the only thing that can resize it, so the page asks over the small bridge
 * `launcher/preload.cjs` exposes. In a browser there is no window to own: the
 * closest honest equivalent is the Fullscreen API, which needs a user gesture,
 * so a page that wants to start borderless arms itself and goes fullscreen on
 * the first key or click instead of failing silently at load.
 */

interface GameBridge {
  setDisplayMode?(mode: DisplayMode): Promise<unknown>;
}

function bridge(): GameBridge | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { kinbound?: GameBridge };
  return (w.kinbound && typeof w.kinbound.setDisplayMode === 'function') ? w.kinbound : null;
}

function documentFullscreen(): boolean {
  return typeof document !== 'undefined' && document.fullscreenElement !== null;
}

/**
 * Put the host window into `mode`.
 *
 * Safe to call when the window is already in that state, and safe to call in a
 * host that cannot honour it -- a browser that refuses the fullscreen request
 * leaves the game running in the tab, which is the right way to degrade.
 */
export function applyDisplayMode(mode: DisplayMode): void {
  const desktop = bridge();
  if (desktop) {
    void desktop.setDisplayMode!(mode);
    return;
  }
  if (typeof document === 'undefined') return;
  if (mode === 'borderless') {
    if (!documentFullscreen()) void document.documentElement.requestFullscreen?.().catch(() => {});
  } else if (documentFullscreen()) {
    void document.exitFullscreen?.().catch(() => {});
  }
}

let armed = false;

/**
 * A browser cannot be sent fullscreen at load; it can be sent fullscreen the
 * moment the player touches anything. One shot, and only when the setting asks
 * for it -- nothing here ever surprises a player who chose windowed.
 */
function armBorderlessOnFirstGesture(): void {
  if (armed || typeof window === 'undefined' || typeof document === 'undefined') return;
  armed = true;
  const go = (): void => {
    window.removeEventListener('keydown', go, true);
    window.removeEventListener('pointerdown', go, true);
    if (currentDisplayMode() === 'borderless' && !documentFullscreen()) {
      void document.documentElement.requestFullscreen?.().catch(() => {});
    }
  };
  window.addEventListener('keydown', go, true);
  window.addEventListener('pointerdown', go, true);
}

export type Align = 'left' | 'center' | 'right';

export interface TextOptions {
  color?: string;
  /** Drop shadow offset colour; a hard 1-unit shadow, never a blur. */
  shadow?: string | null;
  align?: Align;
  /** Maximum width before wrapping, in logical units. */
  maxWidth?: number;
  lineHeight?: number;
  /** Render only the first N characters, for typewriter dialogue. */
  reveal?: number;
}

export class Renderer {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;

  /** Back buffer everything draws into, at DETAIL density. */
  readonly buffer: HTMLCanvasElement;
  readonly bctx: CanvasRenderingContext2D;

  scale = 1;
  offsetX = 0;
  offsetY = 0;

  /** Camera translation in logical units. */
  camX = 0;
  camY = 0;

  private shakeFrames = 0;
  private shakePower = 0;
  private shakeX = 0;
  private shakeY = 0;

  private atlases = new Map<string, HTMLCanvasElement>();
  private atlasIndex = new Map<string, number>();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('2D canvas context unavailable');
    this.ctx = ctx;

    this.buffer = document.createElement('canvas');
    this.buffer.width = BUFFER_W;
    this.buffer.height = BUFFER_H;
    const bctx = this.buffer.getContext('2d', { alpha: false });
    if (!bctx) throw new Error('2D buffer context unavailable');
    this.bctx = bctx;

    this.ctx.imageSmoothingEnabled = false;
    this.bctx.imageSmoothingEnabled = false;

    this.resize();
    window.addEventListener('resize', () => this.resize());

    // The renderer owns the surface the game is drawn on, and on the desktop
    // that surface is a window: putting it into the mode the player asked for
    // belongs here rather than in whichever scene happens to boot first.
    const mode = currentDisplayMode();
    // Never in the capture harness: a screenshot run that resizes its own
    // window halfway through is photographing the wrong thing.
    if (queryOverride('dev') === null) {
      if (bridge()) applyDisplayMode(mode);
      else if (mode === 'borderless') armBorderlessOnFirstGesture();
    }
  }

  /**
   * Which of the three fits this session is running.
   *
   * Change it through `applyScreenFit`, which knows which changes can be made
   * on the spot and which need the page reloaded.
   */
  fit: ScreenFit = currentScreenFit();

  /**
   * Switch fit at runtime.
   *
   * Returns false when the change cannot take full effect until the game is
   * restarted -- which is exactly when `wide` is on one side of it and not the
   * other, because `wide` is the only fit that changes `SCREEN_W`/`SCREEN_H`,
   * and those are read once at module load by every scene in the game. Between
   * `sharp` and `fit` nothing but the blit changes, so those swap instantly.
   */
  applyScreenFit(next: ScreenFit): boolean {
    const viewChanges = (next === 'wide') !== (this.fit === 'wide');
    this.fit = next;
    this.resize();
    return !viewChanges;
  }

  /**
   * Fit the buffer to the window.
   *
   * `sharp` and `wide` take the largest whole-number scale that fits. `fit`
   * takes the exact one, so the picture touches whichever pair of edges is
   * tighter -- on any normal display that is the top and bottom.
   */
  resize(): void {
    const availW = Math.floor(window.innerWidth);
    const availH = Math.floor(window.innerHeight);
    const exact = Math.min(availW / BUFFER_W, availH / BUFFER_H);
    this.scale = this.fit === 'fit' ? Math.max(1, exact) : Math.max(1, Math.floor(exact));
    this.canvas.width = availW;
    this.canvas.height = availH;
    this.canvas.style.width = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;
    this.offsetX = Math.round((availW - BUFFER_W * this.scale) / 2);
    this.offsetY = Math.round((availH - BUFFER_H * this.scale) / 2);
    this.ctx.imageSmoothingEnabled = false;
  }

  /** True when the picture does not reach every edge of the canvas. */
  get letterboxed(): boolean {
    return this.offsetX >= 1 || this.offsetY >= 1;
  }

  /** Mapping the input layer needs to turn client pixels into logical units. */
  viewport(): { x: number; y: number; scale: number } {
    return { x: this.offsetX, y: this.offsetY, scale: this.scale * DETAIL };
  }

  /* ------------------------------------------------------------- frame */

  beginFrame(): void {
    if (this.shakeFrames > 0) {
      this.shakeFrames--;
      const p = this.shakePower;
      this.shakeX = Math.round((Math.random() * 2 - 1) * p);
      this.shakeY = Math.round((Math.random() * 2 - 1) * p);
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }
    this.bctx.imageSmoothingEnabled = false;
  }

  /**
   * The surround, for the displays the view cannot divide exactly.
   *
   * On a 16:9 or 16:10 screen the picture reaches every edge and none of this
   * is drawn. On an oddly-shaped one there is a remainder, and a remainder
   * filled with pure black reads as the game having failed to fill the screen.
   * A very dark graded field with a hairline around the picture reads instead
   * as a frame somebody chose. Cached, because it only changes on a resize.
   */
  private surround: CanvasGradient | null = null;
  private surroundFor = -1;

  private paintSurround(): void {
    const c = this.ctx;
    const h = this.canvas.height;
    if (this.surroundFor !== h || !this.surround) {
      const g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#0b0f18');
      g.addColorStop(0.55, '#070a11');
      g.addColorStop(1, '#04050a');
      this.surround = g;
      this.surroundFor = h;
    }
    c.fillStyle = this.surround;
    c.fillRect(0, 0, this.canvas.width, h);

    const w = BUFFER_W * this.scale;
    const ph = BUFFER_H * this.scale;
    c.fillStyle = 'rgba(150,172,208,0.18)';
    c.fillRect(this.offsetX - 1, this.offsetY - 1, w + 2, 1);
    c.fillRect(this.offsetX - 1, this.offsetY + ph, w + 2, 1);
    c.fillRect(this.offsetX - 1, this.offsetY - 1, 1, ph + 2);
    c.fillRect(this.offsetX + w, this.offsetY - 1, 1, ph + 2);
  }

  /**
   * The intermediate canvas that keeps a fractional scale looking like pixel
   * art. Only ever built in `fit`, and only when the scale is not whole.
   */
  private prescale: HTMLCanvasElement | null = null;
  private prescaleAt = 0;

  /**
   * Enlarge the buffer by a whole number, then shrink that to the target.
   *
   * Drawing the buffer straight to a fractional size is the thing this project
   * refuses to do: at 3.375x some buffer pixels land on three screen pixels and
   * their neighbours on four, and a scrolling tilemap turns that into a visible
   * crawl along every edge. Going up to 4x first with smoothing off keeps every
   * pixel square and identical, and the smoothed step down from 4x to 3.375x is
   * a gentle resample of an already-correct picture rather than a staircase.
   * The picture stays crisp and the edges stop shimmering -- which is the whole
   * argument for whole-number scales, honoured by a different route.
   */
  private drawScaled(dx: number, dy: number, w: number, h: number): void {
    const c = this.ctx;
    const up = Math.ceil(this.scale);
    if (this.prescaleAt !== up || !this.prescale) {
      const cv = document.createElement('canvas');
      cv.width = BUFFER_W * up;
      cv.height = BUFFER_H * up;
      this.prescale = cv;
      this.prescaleAt = up;
    }
    const pc = this.prescale.getContext('2d', { alpha: false })!;
    pc.imageSmoothingEnabled = false;
    pc.drawImage(this.buffer, 0, 0, this.prescale.width, this.prescale.height);

    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = 'high';
    c.drawImage(this.prescale, dx, dy, w, h);
    c.imageSmoothingEnabled = false;
  }

  present(): void {
    const c = this.ctx;
    c.imageSmoothingEnabled = false;
    if (this.letterboxed) {
      this.paintSurround();
    } else {
      c.fillStyle = '#000';
      c.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    const dx = this.offsetX + this.shakeX * this.scale * DETAIL;
    const dy = this.offsetY + this.shakeY * this.scale * DETAIL;
    const w = BUFFER_W * this.scale;
    const h = BUFFER_H * this.scale;
    if (Number.isInteger(this.scale)) c.drawImage(this.buffer, dx, dy, w, h);
    else this.drawScaled(dx, dy, w, h);
  }

  shake(frames: number, power = 2): void {
    this.shakeFrames = Math.max(this.shakeFrames, frames);
    this.shakePower = power;
  }

  /* ---------------------------------------------------------- primitives */

  clear(color = '#000000'): void {
    this.bctx.fillStyle = color;
    this.bctx.fillRect(0, 0, BUFFER_W, BUFFER_H);
  }

  /** Filled rectangle in logical units. */
  rect(x: number, y: number, w: number, h: number, color: string): void {
    this.bctx.fillStyle = color;
    this.bctx.fillRect(
      Math.floor(x * DETAIL), Math.floor(y * DETAIL),
      Math.max(1, Math.floor(w * DETAIL)), Math.max(1, Math.floor(h * DETAIL)),
    );
  }

  /** A rectangle given directly in buffer pixels, for fine art detail. */
  pixel(x: number, y: number, w: number, h: number, color: string): void {
    this.bctx.fillStyle = color;
    this.bctx.fillRect(Math.floor(x), Math.floor(y), Math.max(1, Math.floor(w)), Math.max(1, Math.floor(h)));
  }

  /** 1-unit outline. */
  outline(x: number, y: number, w: number, h: number, color: string): void {
    const X = Math.floor(x * DETAIL), Y = Math.floor(y * DETAIL);
    const W = Math.floor(w * DETAIL), H = Math.floor(h * DETAIL);
    const t = DETAIL;
    this.bctx.fillStyle = color;
    this.bctx.fillRect(X, Y, W, t);
    this.bctx.fillRect(X, Y + H - t, W, t);
    this.bctx.fillRect(X, Y, t, H);
    this.bctx.fillRect(X + W - t, Y, t, H);
  }

  worldRect(x: number, y: number, w: number, h: number, color: string): void {
    this.rect(x - this.camX, y - this.camY, w, h, color);
  }

  /**
   * Camera origin in buffer pixels. World art snaps against this rather than
   * against logical units, so tiles and sprites share one pixel grid and the
   * scroll never lands anything on a half pixel.
   */
  get camPX(): number { return Math.round(this.camX * DETAIL); }
  get camPY(): number { return Math.round(this.camY * DETAIL); }

  /** World position (logical) to buffer pixel, camera applied. */
  worldPX(x: number): number { return Math.round(x * DETAIL) - this.camPX; }
  worldPY(y: number): number { return Math.round(y * DETAIL) - this.camPY; }

  line(x0: number, y0: number, x1: number, y1: number, color: string): void {
    let x = Math.floor(x0 * DETAIL), y = Math.floor(y0 * DETAIL);
    const ex = Math.floor(x1 * DETAIL), ey = Math.floor(y1 * DETAIL);
    const dx = Math.abs(ex - x), sx = x < ex ? 1 : -1;
    const dy = -Math.abs(ey - y), sy = y < ey ? 1 : -1;
    let err = dx + dy;
    this.bctx.fillStyle = color;
    for (;;) {
      this.bctx.fillRect(x, y, 1, 1);
      if (x === ex && y === ey) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
    }
  }

  /** Full-screen tint, used by fades and weather. */
  tint(color: string, alpha: number): void {
    if (alpha <= 0) return;
    this.bctx.save();
    this.bctx.globalAlpha = Math.min(1, alpha);
    this.bctx.fillStyle = color;
    this.bctx.fillRect(0, 0, BUFFER_W, BUFFER_H);
    this.bctx.restore();
  }

  /* -------------------------------------------------------------- images */

  /**
   * Draw an image. `dx`/`dy` are logical; the source rectangle is in the
   * image's own pixels and is blitted 1:1 into the buffer, so art authored at
   * DETAIL density lands at the right logical size automatically.
   */
  image(
    img: CanvasImageSource,
    dx: number, dy: number,
    sx = 0, sy = 0, sw?: number, sh?: number,
    flipX = false, flipY = false,
    alpha = 1,
  ): void {
    const W = sw ?? (img as HTMLCanvasElement).width;
    const H = sh ?? (img as HTMLCanvasElement).height;
    const c = this.bctx;
    const X = Math.round(dx * DETAIL), Y = Math.round(dy * DETAIL);
    if (alpha !== 1) { c.save(); c.globalAlpha = alpha; }
    if (flipX || flipY) {
      c.save();
      c.translate(flipX ? X + W : X, flipY ? Y + H : Y);
      c.scale(flipX ? -1 : 1, flipY ? -1 : 1);
      c.drawImage(img, sx, sy, W, H, 0, 0, W, H);
      c.restore();
    } else {
      c.drawImage(img, sx, sy, W, H, X, Y, W, H);
    }
    if (alpha !== 1) c.restore();
  }

  /** Soft-edged ellipse in buffer pixels. Used for contact shadows. */
  ellipsePixel(cx: number, cy: number, rx: number, ry: number, color: string): void {
    const c = this.bctx;
    c.save();
    c.fillStyle = color;
    c.beginPath();
    c.ellipse(Math.round(cx), Math.round(cy), Math.round(rx), Math.round(ry), 0, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  /** Image draw with the destination already in buffer pixels. */
  imagePixel(
    img: CanvasImageSource, dx: number, dy: number,
    sx: number, sy: number, sw: number, sh: number,
  ): void {
    this.bctx.drawImage(img, sx, sy, sw, sh, Math.round(dx), Math.round(dy), sw, sh);
  }

  worldImage(
    img: CanvasImageSource, dx: number, dy: number,
    sx = 0, sy = 0, sw?: number, sh?: number, flipX = false, alpha = 1,
  ): void {
    this.image(img, dx - this.camX, dy - this.camY, sx, sy, sw, sh, flipX, false, alpha);
  }

  /* ---------------------------------------------------------------- text */

  private atlasFor(color: string): HTMLCanvasElement {
    const existing = this.atlases.get(color);
    if (existing) return existing;

    const keys = this.atlasKeys();
    const gw = GLYPH_W * DETAIL;
    const gh = GLYPH_H * DETAIL;
    const cv = document.createElement('canvas');
    cv.width = keys.length * gw;
    cv.height = gh;
    const cx = cv.getContext('2d')!;
    cx.imageSmoothingEnabled = false;
    cx.fillStyle = color;

    keys.forEach((ch, i) => {
      const g = getGlyph(ch);
      if (!g) return;
      // Glyphs are upscaled with an EPX/Scale2x pass rather than blocky
      // nearest-neighbour: it rounds diagonal stems and corners, which is what
      // keeps text legible once the rest of the art gains detail.
      const hi = scale2x(g.bits, GLYPH_W, GLYPH_H);
      for (let y = 0; y < gh; y++) {
        for (let x = 0; x < gw; x++) {
          if (hi[y * gw + x]) cx.fillRect(i * gw + x, y, 1, 1);
        }
      }
    });
    this.atlases.set(color, cv);
    return cv;
  }

  private cachedKeys: string[] | null = null;
  private atlasKeys(): string[] {
    if (this.cachedKeys) return this.cachedKeys;
    const keys: string[] = [];
    for (let c = 32; c < 127; c++) keys.push(String.fromCharCode(c));
    for (const extra of ['M~', '>>', '^^', 'vv', '..', 'oM', 'oF']) keys.push(extra);
    keys.forEach((k, i) => this.atlasIndex.set(k, i));
    this.cachedKeys = keys;
    return keys;
  }

  /**
   * Split text into lines that fit `maxWidth`, breaking on spaces, and
   * hard-breaking any single token wider than the box on its own.
   */
  wrapText(text: string, maxWidth: number): string[] {
    const out: string[] = [];
    for (const paragraph of text.split('\n')) {
      let line = '';
      for (const word of paragraph.split(' ')) {
        for (const piece of this.breakLongWord(word, maxWidth)) {
          const candidate = line.length ? `${line} ${piece}` : piece;
          if (measureText(candidate) <= maxWidth || line.length === 0) {
            line = candidate;
          } else {
            out.push(line);
            line = piece;
          }
        }
      }
      out.push(line);
    }
    return out;
  }

  private breakLongWord(word: string, maxWidth: number): string[] {
    if (measureText(word) <= maxWidth) return [word];
    const pieces: string[] = [];
    let current = '';
    for (const ch of word) {
      if (measureText(current + ch) > maxWidth && current.length > 0) {
        pieces.push(current);
        current = ch;
      } else {
        current += ch;
      }
    }
    if (current) pieces.push(current);
    return pieces;
  }

  textWidth(text: string): number {
    return measureText(text);
  }

  text(text: string, x: number, y: number, opts: TextOptions = {}): number {
    const color = opts.color ?? '#f8f8f8';
    const lineHeight = opts.lineHeight ?? GLYPH_H + 3;
    const lines = opts.maxWidth ? this.wrapText(text, opts.maxWidth) : text.split('\n');

    let revealLeft = opts.reveal ?? Infinity;
    let cy = Math.floor(y);

    for (const line of lines) {
      if (revealLeft <= 0) break;
      const visible = revealLeft === Infinity ? line : line.slice(0, Math.max(0, Math.floor(revealLeft)));
      revealLeft -= line.length;

      let cx = Math.floor(x);
      const fullW = measureText(line);
      if (opts.align === 'center') cx = Math.floor(x - fullW / 2);
      else if (opts.align === 'right') cx = Math.floor(x - fullW);

      if (opts.shadow) this.drawRun(visible, cx + 1, cy + 1, opts.shadow);
      this.drawRun(visible, cx, cy, color);

      cy += lineHeight;
    }
    return cy - Math.floor(y);
  }

  private drawRun(text: string, x: number, y: number, color: string): void {
    const atlas = this.atlasFor(color);
    this.atlasKeys();
    const gw = GLYPH_W * DETAIL;
    const gh = GLYPH_H * DETAIL;
    let cx = x;
    for (const ch of tokenize(text)) {
      const idx = this.atlasIndex.get(ch);
      if (idx !== undefined) {
        this.bctx.drawImage(
          atlas, idx * gw, 0, gw, gh,
          Math.round(cx * DETAIL), Math.round(y * DETAIL), gw, gh,
        );
      }
      cx += advanceOf(ch);
    }
  }

  /* ------------------------------------------------------------- windows */

  /**
   * The standard UI frame: a hard border, an inner highlight and a flat fill,
   * with a soft drop shadow so panels sit above the world rather than in it.
   */
  window(
    x: number, y: number, w: number, h: number,
    style: { fill?: string; border?: string; highlight?: string; shadow?: string } = {},
  ): void {
    const fill = style.fill ?? '#f4f6fb';
    const border = style.border ?? '#232a3d';
    const highlight = style.highlight ?? '#aebbd4';
    const shadow = style.shadow ?? 'rgba(12,16,26,0.32)';

    const X = Math.floor(x), Y = Math.floor(y), W = Math.floor(w), H = Math.floor(h);

    this.rect(X + 2, Y + H, W - 2, 2, shadow);
    this.rect(X + W, Y + 2, 2, H - 2, shadow);

    this.rect(X, Y, W, H, border);
    this.rect(X + 1, Y + 1, W - 2, H - 2, highlight);
    this.rect(X + 2, Y + 2, W - 4, H - 4, fill);

    // A half-unit inner bevel, only possible now that the buffer is denser.
    this.pixel((X + 2) * DETAIL, (Y + 2) * DETAIL, (W - 4) * DETAIL, 1, 'rgba(255,255,255,0.55)');
    this.pixel((X + 2) * DETAIL, (Y + H - 2) * DETAIL - 1, (W - 4) * DETAIL, 1, 'rgba(40,50,70,0.18)');
  }

  /** Selection cursor used by every list in the game. */
  cursor(x: number, y: number, color = '#232a3d'): void {
    const X = Math.floor(x * DETAIL), Y = Math.floor(y * DETAIL);
    const c = this.bctx;
    // Drawn in buffer pixels so the arrow keeps a sharp point at this density.
    for (let i = 0; i < 12; i++) {
      const half = Math.max(0, 6 - Math.abs(i - 6));
      c.fillStyle = color;
      c.fillRect(X, Y + i, 1 + half, 1);
    }
    c.fillStyle = 'rgba(255,255,255,0.5)';
    c.fillRect(X, Y + 1, 1, 10);
  }

  /** Horizontal meter (HP / EXP) with a hard frame. */
  meter(
    x: number, y: number, w: number, h: number,
    fraction: number, fill: string, back = '#404058', frame: string | null = '#232a3d',
  ): void {
    const f = Math.max(0, Math.min(1, fraction));
    if (frame) this.outline(x, y, w, h, frame);
    const inx = frame ? 1 : 0;
    this.rect(x + inx, y + inx, w - inx * 2, h - inx * 2, back);
    const innerW = w - inx * 2;
    const filled = f > 0 ? Math.max(0.5, innerW * f) : 0;
    if (filled > 0) {
      this.rect(x + inx, y + inx, filled, h - inx * 2, fill);
      // A lit top edge turns a flat bar into a moulded one.
      this.pixel((x + inx) * DETAIL, (y + inx) * DETAIL, filled * DETAIL, 1, 'rgba(255,255,255,0.45)');
    }
  }
}

/**
 * EPX / Scale2x. Doubles a 1-bit bitmap while rounding corners, using only the
 * four orthogonal neighbours. Designed for exactly this job: enlarging pixel
 * art without either blurring it or turning every edge into a staircase.
 */
function scale2x(src: Uint8Array, w: number, h: number): Uint8Array {
  const out = new Uint8Array(w * 2 * h * 2);
  const at = (x: number, y: number): number =>
    (x < 0 || y < 0 || x >= w || y >= h) ? 0 : src[y * w + x]!;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = at(x, y);
      const a = at(x, y - 1);
      const b = at(x + 1, y);
      const c = at(x - 1, y);
      const d = at(x, y + 1);

      let e0 = p, e1 = p, e2 = p, e3 = p;
      if (c === a && c !== d && a !== b) e0 = a;
      if (a === b && a !== c && b !== d) e1 = b;
      if (d === c && d !== b && c !== a) e2 = c;
      if (b === d && b !== a && d !== c) e3 = d;

      const ow = w * 2;
      out[(y * 2) * ow + x * 2] = e0;
      out[(y * 2) * ow + x * 2 + 1] = e1;
      out[(y * 2 + 1) * ow + x * 2] = e2;
      out[(y * 2 + 1) * ow + x * 2 + 1] = e3;
    }
  }
  return out;
}
