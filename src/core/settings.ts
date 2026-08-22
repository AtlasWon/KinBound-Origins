/**
 * Player settings.
 *
 * These are the modern conveniences the original hardware could not offer.
 * Defaults are chosen to feel like the classic experience; every one of the
 * "make it faster" options is opt-in so a first-time player gets the intended
 * pacing, and a veteran can strip out the dead time immediately.
 */

import { DEFAULT_BINDINGS, type Bindings } from './input.js';

export type TextSpeed = 'slow' | 'normal' | 'fast' | 'instant';
export type BattleSpeed = 'classic' | 'brisk' | 'fast';
export type BattleStyle = 'switch' | 'set';

export interface Settings {
  textSpeed: TextSpeed;
  battleSpeed: BattleSpeed;
  battleAnimations: boolean;
  battleStyle: BattleStyle;
  /** Run without holding the run key. */
  autoRun: boolean;
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
  bindings: Bindings;
}

export const DEFAULT_SETTINGS: Settings = {
  textSpeed: 'normal',
  battleSpeed: 'brisk',
  battleAnimations: true,
  battleStyle: 'switch',
  autoRun: false,
  musicVolume: 0.7,
  sfxVolume: 0.8,
  autosave: true,
  moveHints: true,
  useSystemClock: true,
  fixedTime: 'day',
  showFps: false,
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
    return {
      ...structuredClone(DEFAULT_SETTINGS),
      ...parsed,
      bindings: { ...DEFAULT_BINDINGS, ...(parsed.bindings ?? {}) },
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
export function battleSpeedScale(speed: BattleSpeed): number {
  switch (speed) {
    case 'classic': return 1;
    case 'brisk': return 0.6;
    case 'fast': return 0.3;
  }
}
