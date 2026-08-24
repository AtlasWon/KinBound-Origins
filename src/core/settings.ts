/**
 * Player settings.
 *
 * These are the modern conveniences the original hardware could not offer.
 * Defaults are chosen to feel like the classic experience; every one of the
 * "make it faster" options is opt-in so a first-time player gets the intended
 * pacing, and a veteran can strip out the dead time immediately.
 */

import { ACTIONS, DEFAULT_BINDINGS, type Bindings } from './input.js';

export type TextSpeed = 'slow' | 'normal' | 'fast' | 'instant';
export type BattleSpeed = 'classic' | 'brisk' | 'fast';
export type BattleStyle = 'switch' | 'set';

/**
 * How the 240x160 picture is fitted to the display.
 *
 * The screen is 3:2 and most displays are 16:9, so there is no fit that is
 * both pixel-perfect and edge-to-edge -- the bars are an aspect problem, not
 * only an integer-scale one. Hence three honest choices rather than one
 * compromise.
 *
 *   sharp  whole-number scale. Crispest, and the largest border.
 *   fit    scaled to touch top and bottom exactly. No bars above or below,
 *          narrower ones at the sides. The default.
 *   wide   fills the display completely by showing more of the world. Menus
 *          and the battle HUD are not laid out for it yet.
 */
export type ScreenFit = 'sharp' | 'fit' | 'wide';

export type DisplayMode = 'borderless' | 'windowed';

export interface Settings {
  textSpeed: TextSpeed;
  battleSpeed: BattleSpeed;
  battleAnimations: boolean;
  battleStyle: BattleStyle;
  musicVolume: number;   // 0..1
  sfxVolume: number;     // 0..1
  autosave: boolean;
  /** Show the type-effectiveness hint on moves already used against a species. */
  moveHints: boolean;
  /** Use the system clock for time of day. */
  useSystemClock: boolean;
  /** Fixed time of day when the clock is disabled. */
  fixedTime: 'morning' | 'day' | 'evening' | 'night';
  showFps: boolean;
  /** How the picture is fitted to the display. */
  screenFit: ScreenFit;
  /** Borderless fullscreen, or a resizable window. */
  displayMode: DisplayMode;
  bindings: Bindings;
}

export const DEFAULT_SETTINGS: Settings = {
  textSpeed: 'normal',
  battleSpeed: 'classic',
  battleAnimations: true,
  battleStyle: 'switch',
  musicVolume: 0.7,
  sfxVolume: 0.8,
  autosave: true,
  moveHints: true,
  useSystemClock: true,
  fixedTime: 'day',
  showFps: false,
  screenFit: 'fit',
  displayMode: 'borderless',
  bindings: DEFAULT_BINDINGS,
};

const KEY = 'kinbound.settings.v1';
/**
 * The key these settings lived under before the game was renamed.
 *
 * Only reachable in the browser build, where the origin has not changed. The
 * desktop build is served from kinbound://game where it used to be
 * tideward://game, and storage is keyed by origin -- so there is nothing on
 * the other side of that rename to migrate, and nothing to be done about it.
 */
const LEGACY_KEY = 'tideward.settings.v1';

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY);
    if (!raw) return structuredClone(DEFAULT_SETTINGS);
    const parsed = JSON.parse(raw) as Partial<Settings>;
    const known: Partial<Bindings> = {};
    // Only actions the game still has. A save written before the run key was
    // taken out carries a binding for it, and letting that back in would put a
    // dead row on the controls screen for as long as the file survives.
    for (const a of ACTIONS) {
      const codes = (parsed.bindings as Partial<Bindings> | undefined)?.[a];
      if (codes) known[a] = codes;
    }
    return {
      ...structuredClone(DEFAULT_SETTINGS),
      ...parsed,
      bindings: { ...DEFAULT_BINDINGS, ...known },
    };
  } catch {
    return structuredClone(DEFAULT_SETTINGS);
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Private browsing or a full quota: settings simply do not persist.
  }
}

/** Frames between revealed characters in dialogue. */
export function textDelayFrames(speed: TextSpeed): number {
  switch (speed) {
    case 'slow': return 4;
    case 'normal': return 2;
    case 'fast': return 1;
    case 'instant': return 0;
  }
}

/** Multiplier applied to every scripted battle pause. */
/**
 * How long a battle beat lasts, as a multiple of its authored length.
 *
 * 'classic' is the authored timing and the default. The game shipped on
 * 'brisk', which ran every beat at 60% -- the move, the damage and the menu
 * all landed on top of each other and a turn was over before you had read what
 * happened.
 */
export function battleSpeedScale(speed: BattleSpeed): number {
  switch (speed) {
    case 'classic': return 1;
    case 'brisk': return 0.7;
    case 'fast': return 0.45;
  }
}
