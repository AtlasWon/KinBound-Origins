/**
 * Input.
 *
 * Keyboard, mouse and gamepad all feed one action layer, so every scene reads
 * `input.pressed('confirm')` and never cares which device produced it.
 * All bindings are remappable and persisted with the player's settings.
 */

export const ACTIONS = [
  'up', 'down', 'left', 'right',
  'confirm', 'cancel', 'menu', 'run',
  'map', 'bag', 'party', 'vellum',
  'nextTab', 'prevTab',
  'debug', 'speedUp',
] as const;
export type Action = (typeof ACTIONS)[number];

export type Bindings = Record<Action, string[]>;

export const DEFAULT_BINDINGS: Bindings = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  confirm: ['KeyE', 'Enter', 'Space'],
  cancel: ['Escape', 'Backspace', 'KeyQ'],
  menu: ['Tab'],
  run: ['ShiftLeft', 'ShiftRight'],
  map: ['KeyM'],
  bag: ['KeyI'],
  party: ['KeyP'],
  vellum: ['KeyC'],
  nextTab: ['KeyX', 'BracketRight'],
  prevTab: ['KeyZ', 'BracketLeft'],
  debug: ['F1'],
  speedUp: ['ControlLeft', 'ControlRight'],
};

/** Standard-layout gamepad buttons mapped to actions. */
const GAMEPAD_MAP: Record<number, Action> = {
  0: 'confirm',     // A / cross
  1: 'cancel',      // B / circle
  2: 'bag',         // X / square
  3: 'party',       // Y / triangle
  4: 'prevTab',     // L
  5: 'nextTab',     // R
  6: 'run',         // LT
  7: 'speedUp',     // RT
  8: 'map',         // select
  9: 'menu',        // start
  12: 'up',
  13: 'down',
  14: 'left',
  15: 'right',
};

const AXIS_DEADZONE = 0.45;

export interface MouseState {
  /** Position in game-space pixels (already unscaled from the canvas). */
  x: number;
  y: number;
  /** True while the cursor is inside the canvas. */
  inside: boolean;
  left: boolean;
  right: boolean;
  leftPressed: boolean;
  leftReleased: boolean;
  rightPressed: boolean;
  wheel: number;
  /** Frames since the mouse last actually moved; used to hide the cursor. */
  idleFrames: number;
  moved: boolean;
}

interface ActionState {
  down: boolean;
  pressedFrame: number;
  releasedFrame: number;
  heldFrames: number;
}

export class InputManager {
  bindings: Bindings;

  private keyDown = new Set<string>();
  private state: Record<Action, ActionState>;
  private frame = 0;
  private textBuffer: string[] = [];
  private captureNext: ((code: string) => void) | null = null;

  readonly mouse: MouseState = {
    x: 0, y: 0, inside: false,
    left: false, right: false,
    leftPressed: false, leftReleased: false, rightPressed: false,
    wheel: 0, idleFrames: 999, moved: false,
  };

  /** Set by the renderer each frame so mouse coords land in game space. */
  viewport = { x: 0, y: 0, scale: 1 };

  private gamepadIndex: number | null = null;
  /** True when the last input came from a gamepad, so the UI can swap prompts. */
  lastDevice: 'keyboard' | 'mouse' | 'gamepad' = 'keyboard';

  constructor(private target: HTMLCanvasElement, bindings?: Partial<Bindings>) {
    this.bindings = { ...DEFAULT_BINDINGS, ...(bindings ?? {}) } as Bindings;
    this.state = {} as Record<Action, ActionState>;
    for (const a of ACTIONS) {
      this.state[a] = { down: false, pressedFrame: -1, releasedFrame: -1, heldFrames: 0 };
    }
    this.attach();
  }

  private attach(): void {
    window.addEventListener('keydown', (e) => {
      // Let the browser keep F5, devtools, and clipboard shortcuts.
      if (e.ctrlKey && ['KeyR', 'KeyC', 'KeyV', 'KeyI', 'KeyJ'].includes(e.code)) return;
      if (e.code === 'F5' || e.code === 'F11' || e.code === 'F12') return;

      if (this.captureNext && !e.repeat) {
        const cb = this.captureNext;
        this.captureNext = null;
        e.preventDefault();
        cb(e.code);
        return;
      }

      if (!e.repeat) {
        this.keyDown.add(e.code);
        this.lastDevice = 'keyboard';
      }
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) this.textBuffer.push(e.key);
      if (e.code === 'Backspace') this.textBuffer.push('\b');
      // Stop the page scrolling / tabbing away underneath the game.
      if (this.isBound(e.code) || e.code === 'Space' || e.code.startsWith('Arrow')) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keyDown.delete(e.code);
    });

    // Releasing focus must not leave keys stuck down.
    window.addEventListener('blur', () => {
      this.keyDown.clear();
      this.mouse.left = this.mouse.right = false;
    });

    this.target.addEventListener('mousemove', (e) => {
      const r = this.target.getBoundingClientRect();
      const px = (e.clientX - r.left) * (this.target.width / r.width);
      const py = (e.clientY - r.top) * (this.target.height / r.height);
      const nx = Math.floor((px - this.viewport.x) / this.viewport.scale);
      const ny = Math.floor((py - this.viewport.y) / this.viewport.scale);
      if (nx !== this.mouse.x || ny !== this.mouse.y) {
        this.mouse.moved = true;
        this.mouse.idleFrames = 0;
        this.lastDevice = 'mouse';
      }
      this.mouse.x = nx;
      this.mouse.y = ny;
      this.mouse.inside = true;
    });

    this.target.addEventListener('mouseleave', () => { this.mouse.inside = false; });
    this.target.addEventListener('mouseenter', () => { this.mouse.inside = true; });

    this.target.addEventListener('mousedown', (e) => {
      this.lastDevice = 'mouse';
      if (e.button === 0) { this.mouse.left = true; this.mouse.leftPressed = true; }
      if (e.button === 2) { this.mouse.right = true; this.mouse.rightPressed = true; }
      e.preventDefault();
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) { this.mouse.left = false; this.mouse.leftReleased = true; }
      if (e.button === 2) this.mouse.right = false;
    });

    this.target.addEventListener('contextmenu', (e) => e.preventDefault());

    this.target.addEventListener('wheel', (e) => {
      this.mouse.wheel += Math.sign(e.deltaY);
      this.lastDevice = 'mouse';
      e.preventDefault();
    }, { passive: false });

    window.addEventListener('gamepadconnected', (e) => {
      this.gamepadIndex = (e as GamepadEvent).gamepad.index;
    });
    window.addEventListener('gamepaddisconnected', () => {
      this.gamepadIndex = null;
    });
  }

  private isBound(code: string): boolean {
    for (const a of ACTIONS) if (this.bindings[a].includes(code)) return true;
    return false;
  }

  /** Poll the gamepad and fold its buttons into the key set. */
  private pollGamepad(active: Set<Action>): void {
    const pads = navigator.getGamepads?.() ?? [];
    const pad = this.gamepadIndex !== null ? pads[this.gamepadIndex] : pads.find((p) => p);
    if (!pad) return;
    let any = false;
    for (const [idxStr, action] of Object.entries(GAMEPAD_MAP)) {
      const b = pad.buttons[Number(idxStr)];
      if (b?.pressed) { active.add(action); any = true; }
    }
    const [ax = 0, ay = 0] = pad.axes;
    if (ax < -AXIS_DEADZONE) { active.add('left'); any = true; }
    if (ax > AXIS_DEADZONE) { active.add('right'); any = true; }
    if (ay < -AXIS_DEADZONE) { active.add('up'); any = true; }
    if (ay > AXIS_DEADZONE) { active.add('down'); any = true; }
    if (any) this.lastDevice = 'gamepad';
  }

  /** Call once per simulation tick, before scenes update. */
  update(): void {
    this.frame++;

    const active = new Set<Action>();
    for (const a of ACTIONS) {
      for (const code of this.bindings[a]) {
        if (this.keyDown.has(code)) { active.add(a); break; }
      }
    }
    this.pollGamepad(active);

    for (const a of ACTIONS) {
      const s = this.state[a];
      const nowDown = active.has(a);
      if (nowDown && !s.down) { s.pressedFrame = this.frame; s.heldFrames = 0; }
      if (!nowDown && s.down) s.releasedFrame = this.frame;
      if (nowDown) s.heldFrames++;
      else s.heldFrames = 0;
      s.down = nowDown;
    }

    if (this.mouse.moved) this.mouse.moved = false;
    else this.mouse.idleFrames++;
  }

  /** Call after scenes update, to clear one-frame edges. */
  postUpdate(): void {
    this.mouse.leftPressed = false;
    this.mouse.leftReleased = false;
    this.mouse.rightPressed = false;
    this.mouse.wheel = 0;
    this.textBuffer.length = 0;
  }

  /** True on any frame where the player pressed or clicked something. */
  anyPressed(): boolean {
    if (this.mouse.leftPressed) return true;
    for (const a of ACTIONS) if (this.state[a].pressedFrame === this.frame) return true;
    return false;
  }

  /** Held right now. */
  down(action: Action): boolean {
    return this.state[action].down;
  }

  /** True only on the frame the action went down. */
  pressed(action: Action): boolean {
    return this.state[action].pressedFrame === this.frame;
  }

  released(action: Action): boolean {
    return this.state[action].releasedFrame === this.frame;
  }

  heldFrames(action: Action): number {
    return this.state[action].heldFrames;
  }

  /**
   * Menu-style auto-repeat: fires on press, then after `delay` frames repeats
   * every `rate` frames. Holding a direction scrolls a list at a usable speed
   * without the player having to mash.
   */
  repeated(action: Action, delay = 16, rate = 5): boolean {
    const held = this.state[action].heldFrames;
    if (held === 1) return true;
    if (held > delay) return (held - delay) % rate === 0;
    return false;
  }

  /** Any of the four directions, as a -1/0/1 pair. */
  axis(): { x: number; y: number } {
    return {
      x: (this.down('right') ? 1 : 0) - (this.down('left') ? 1 : 0),
      y: (this.down('down') ? 1 : 0) - (this.down('up') ? 1 : 0),
    };
  }

  /** Characters typed since the last frame, for the naming screen. */
  takeText(): string[] {
    return this.textBuffer.splice(0, this.textBuffer.length);
  }

  /** Rebinding: the next key pressed is delivered to `cb` instead of the game. */
  captureBinding(cb: (code: string) => void): void {
    this.captureNext = cb;
  }

  setBinding(action: Action, codes: string[]): void {
    this.bindings[action] = codes;
  }

  resetBindings(): void {
    this.bindings = JSON.parse(JSON.stringify(DEFAULT_BINDINGS));
  }

  /** Human-readable key name for the controls screen. */
  static label(code: string): string {
    if (code.startsWith('Key')) return code.slice(3);
    if (code.startsWith('Digit')) return code.slice(5);
    if (code.startsWith('Arrow')) return code.slice(5) + ' Arrow';
    switch (code) {
      case 'ShiftLeft': return 'L Shift';
      case 'ShiftRight': return 'R Shift';
      case 'ControlLeft': return 'L Ctrl';
      case 'ControlRight': return 'R Ctrl';
      case 'BracketLeft': return '[';
      case 'BracketRight': return ']';
      case 'Space': return 'Space';
      case 'Enter': return 'Enter';
      case 'Escape': return 'Esc';
      case 'Backspace': return 'Backspace';
      case 'Tab': return 'Tab';
      default: return code;
    }
  }

  /** Rectangle hit test in game-space coordinates. */
  mouseOver(x: number, y: number, w: number, h: number): boolean {
    return this.mouse.inside &&
      this.mouse.x >= x && this.mouse.x < x + w &&
      this.mouse.y >= y && this.mouse.y < y + h;
  }

  /** Hover + click in one call, the workhorse for every clickable UI element. */
  clicked(x: number, y: number, w: number, h: number): boolean {
    return this.mouse.leftPressed && this.mouseOver(x, y, w, h);
  }
}
