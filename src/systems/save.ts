/**
 * Saving.
 *
 * Three manual slots plus a separate autosave slot. Saves live in localStorage
 * as JSON and can be exported to, or imported from, a file so a playthrough is
 * not trapped in one browser profile.
 *
 * Every write is verified by reading it straight back and re-parsing it. A save
 * system that silently half-writes is worse than one that refuses.
 */

import { GameState, type SaveHeader } from './state.js';

const PREFIX = 'kinbound.save.';
/** Slot prefix from before the rename; see migrateLegacySaves. */
const LEGACY_PREFIX = 'tideward.save.';
const AUTOSAVE_SLOT = 0;
export const MANUAL_SLOTS = [1, 2, 3];
export const SAVE_VERSION = 1;

export interface SaveFile {
  version: number;
  header: SaveHeader;
  state: Record<string, unknown>;
}

function key(slot: number): string {
  return `${PREFIX}${slot}`;
}

/**
 * Carry saves across the rename from Tideward to KinBound.
 *
 * Runs once at boot and only ever copies -- the old keys are left alone, so a
 * half-finished migration cannot destroy anything. Like the settings key, this
 * can only help the browser build: the desktop game moved origin at the same
 * time, and storage does not cross origins.
 */
export function migrateLegacySaves(): void {
  try {
    for (const slot of [AUTOSAVE_SLOT, ...MANUAL_SLOTS]) {
      if (localStorage.getItem(key(slot)) !== null) continue;
      const legacy = localStorage.getItem(`${LEGACY_PREFIX}${slot}`);
      if (legacy !== null) localStorage.setItem(key(slot), legacy);
    }
  } catch {
    // Private browsing or a full quota: the old saves simply stay where they are.
  }
}

export function saveExists(slot: number): boolean {
  try {
    return localStorage.getItem(key(slot)) !== null;
  } catch {
    return false;
  }
}

export function readHeader(slot: number): SaveHeader | null {
  try {
    const raw = localStorage.getItem(key(slot));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SaveFile;
    return parsed.header ?? null;
  } catch {
    return null;
  }
}

export function listHeaders(): { slot: number; header: SaveHeader | null }[] {
  return [AUTOSAVE_SLOT, ...MANUAL_SLOTS].map((slot) => ({ slot, header: readHeader(slot) }));
}

export interface SaveResult {
  ok: boolean;
  error?: string;
}

export function save(slot: number, state: GameState, mapName: string, playTime: number): SaveResult {
  state.playTime = playTime;
  const file: SaveFile = {
    version: SAVE_VERSION,
    header: state.header(slot, mapName),
    state: state.toJSON(),
  };
  try {
    const text = JSON.stringify(file);
    localStorage.setItem(key(slot), text);
    // Read-back check: a quota failure can otherwise pass silently.
    const check = localStorage.getItem(key(slot));
    if (check !== text) return { ok: false, error: 'the save did not write back cleanly' };
    JSON.parse(check);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export function autosave(state: GameState, mapName: string, playTime: number): SaveResult {
  return save(AUTOSAVE_SLOT, state, mapName, playTime);
}

export function load(slot: number): { state: GameState; header: SaveHeader } | null {
  try {
    const raw = localStorage.getItem(key(slot));
    if (!raw) return null;
    const file = JSON.parse(raw) as SaveFile;
    if (typeof file.version !== 'number') return null;
    if (file.version > SAVE_VERSION) {
      console.warn(`save slot ${slot} was written by a newer version`);
      return null;
    }
    const state = GameState.fromJSON(migrate(file).state as Record<string, any>);
    return { state, header: file.header };
  } catch (e) {
    console.error(`save slot ${slot} could not be read`, e);
    return null;
  }
}

export function deleteSave(slot: number): void {
  try {
    localStorage.removeItem(key(slot));
  } catch {
    // Nothing sensible to do; the slot simply stays.
  }
}

/** Forward-migrations for older save versions. */
function migrate(file: SaveFile): SaveFile {
  // Only one version so far. New versions add cases here rather than
  // invalidating existing saves.
  return file;
}

/* ------------------------------------------------------------ transfer */

/** Serialise a slot for download. */
export function exportSlot(slot: number): string | null {
  try {
    return localStorage.getItem(key(slot));
  } catch {
    return null;
  }
}

/** Validate and store an imported save. */
export function importToSlot(slot: number, text: string): SaveResult {
  try {
    const parsed = JSON.parse(text) as SaveFile;
    if (typeof parsed.version !== 'number' || !parsed.state) {
      return { ok: false, error: 'that file is not a KinBound save' };
    }
    localStorage.setItem(key(slot), JSON.stringify(parsed));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
