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
export const SAVE_VERSION = 4;

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
    if (!parsed.header) return null;
    // The select screen reads headers without ever loading the state, so the
    // migration has to run here too or a pre-rename slot shows a blank Crest
    // count next to the name of a town that no longer exists.
    return migrate(parsed).header;
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
    const migrated = migrate(file);
    const state = GameState.fromJSON(migrated.state as Record<string, any>);
    return { state, header: migrated.header };
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

/* --------------------------------------------------------- migration v1→v2 */

/**
 * The Caelora rename moved every id a save can hold.
 *
 * A version 1 save names `marrow_hollow`, `vess_station`, `ashgate_waystation`
 * and so on -- maps that no longer exist on disk. Loading one untouched drops
 * the player into a 404, which is the exact failure this table exists to
 * prevent. So every id-shaped string in the file goes through `renameId`:
 * where the player stood, where they respawn, everywhere they have been, every
 * story flag and variable, every trainer they have beaten, and the map each kin
 * in the party and the boxes was met on.
 *
 * The rules are ordered and are the same ones the content was renamed with.
 * Longest first, because `marrow_house_up` must not be eaten by `marrow_`.
 *
 * Each later rename gets its OWN table below rather than rows added here, and
 * `migrate` runs them in order, so a version 1 save walks the whole history:
 * `kellowmere_bastion` -> `kellowmere_hall` (v2) -> `stonewake_hall` (v4), and
 * no table has to know what any other table did.
 */
const ID_RENAMES: [RegExp, string][] = [
  [/^marrow_house_neighbour$/, 'hearthmere_house_neighbour'],
  [/^marrow_house_player$/, 'hearthmere_house_player'],
  [/^marrow_house_up$/, 'hearthmere_house_up'],
  [/^marrow_hollow$/, 'hearthmere'],
  [/^vess_station$/, 'sorrell_lab'],
  [/^(.*)_waystation_up$/, '$1_clinic_up'],
  [/^(.*)_waystation$/, '$1_clinic'],
  [/^(.*)_bastion$/, '$1_hall'],
  [/^bastion([12])_/, 'hall$1_'],
  [/^mh_/, 'hm_'],
  [/^item_mh_/, 'item_hm_'],
  [/^seal_(\d)_taken$/, 'crest_$1_taken'],
  [/^ways_met$/, 'clinic_met'],
  [/^item_bw_ways_up_rouse$/, 'item_bw_clinic_up_rouse'],
  [/^met_perrin$/, 'met_tarin'],
  [/^perrin/, 'tarin'],
  [/^hollow_(villager|kid|hiker)$/, 'hearth_$1'],
  [/^kellowmere_bastion_plates$/, 'kellowmere_hall_plates'],
];

function renameId(id: string): string {
  for (const [pat, rep] of ID_RENAMES) {
    if (pat.test(id)) return id.replace(pat, rep);
  }
  return id;
}

/** `item_mh_potion` is a flag, not a map, so it needs the inner prefix too. */
function renameFlag(flag: string): string {
  if (flag.startsWith('item_mh_')) return `item_hm_${flag.slice(8)}`;
  return renameId(flag);
}

/**
 * Rewrite every id-shaped string in a save with one rename function.
 *
 * Shared by every migration, because "which strings in a save file are ids" is
 * a fact about the save format and not about any particular rename: where the
 * player stood, where they respawn, everywhere they have been, every story flag
 * and variable, every trainer they have beaten, and the map each kin in the
 * party and the boxes was met on. A migration that forgets one of these drops
 * the player into a failed fetch and a black screen, which is the exact failure
 * this whole section exists to prevent.
 */
function sweepIds(file: SaveFile, id: (s: string) => string, flag: (s: string) => string): void {
  const s = file.state as Record<string, any>;
  if (typeof s.currentMap === 'string') s.currentMap = id(s.currentMap);
  if (typeof s.respawnMap === 'string') s.respawnMap = id(s.respawnMap);
  if (Array.isArray(s.visited)) s.visited = s.visited.map((v: string) => id(v));
  if (Array.isArray(s.flags)) s.flags = s.flags.map((f: string) => flag(f));
  if (Array.isArray(s.defeatedTrainers)) s.defeatedTrainers = s.defeatedTrainers.map((t: string) => id(t));
  if (Array.isArray(s.vars)) {
    s.vars = s.vars.map((e: [string, number]) => [id(e[0]), e[1]] as [string, number]);
  }
  const fixKin = (k: any): any => {
    if (k && typeof k.metAt === 'string') k.metAt = id(k.metAt);
    return k;
  };
  if (Array.isArray(s.party)) s.party.forEach(fixKin);
  if (Array.isArray(s.boxes)) for (const box of s.boxes) if (Array.isArray(box)) box.forEach(fixKin);
}

function toV2(file: SaveFile): SaveFile {
  const s = file.state as Record<string, any>;

  sweepIds(file, renameId, renameFlag);

  // seals -> crests. The field moved; the numbers in it did not.
  if (s.crests === undefined && Array.isArray(s.seals)) s.crests = s.seals;
  delete s.seals;

  const h = file.header as unknown as Record<string, any>;
  if (h && h.crests === undefined && typeof h.seals === 'number') {
    h.crests = h.seals;
    delete h.seals;
  }
  // The header's map name is the display name, shown on the save-select row.
  // It is cosmetic, but a slot reading "Marrow Hollow" after the rename is a
  // lie about a place that no longer exists.
  if (h && typeof h.mapName === 'string') {
    h.mapName = h.mapName
      .replace(/Marrow Hollow/g, 'Hearthmere')
      .replace(/\bWaystation\b/g, 'Kin Clinic')
      .replace(/\bBastion\b/g, 'Hall')
      .replace(/\bVess\b/g, 'Sorrell');
  }

  file.version = 2;
  return file;
}

/* --------------------------------------------------------- migration v2→v3 */

/**
 * Ashgate became Briarbell.
 *
 * Not a rename: Ashgate was a waypoint with no Kin Hall in it, and Briarbell
 * holds the FIRST Bond Crest, so the town was rebuilt rather than relettered.
 * The old maps are gone from disk, which means a version 2 save standing in
 * `ashgate_clinic` names a map that no longer exists -- the same failure the
 * v1 table exists to prevent, one town along.
 *
 * Kept as its own ordered table rather than folded into the v1 one, because
 * each table describes exactly one change: a v1 save goes `ashgate_waystation`
 * -> `ashgate_clinic` -> `briarbell_clinic` by running both in order, and
 * neither table has to know about the other.
 */
const V3_RENAMES: [RegExp, string][] = [
  [/^ashgate_house_b_up$/, 'briarbell_house_b_up'],
  [/^ashgate_(clinic|provisioner|house_a|house_b)$/, 'briarbell_$1'],
  [/^ashgate$/, 'briarbell'],
];

function renameV3(id: string): string {
  for (const [pat, rep] of V3_RENAMES) {
    if (pat.test(id)) return id.replace(pat, rep);
  }
  return id;
}

function toV3(file: SaveFile): SaveFile {
  sweepIds(file, renameV3, renameV3);

  const h = file.header as unknown as Record<string, any>;
  if (h && typeof h.mapName === 'string') h.mapName = h.mapName.replace(/\bAshgate\b/g, 'Briarbell');

  file.version = 3;
  return file;
}

/* --------------------------------------------------------- migration v3→v4 */

/**
 * Kellowmere became Stonewake.
 *
 * Same shape of change as Ashgate: not a relettering but a rebuild. Kellowmere
 * was a quarry village holding the FIRST Bond Crest; Stonewake is a city of
 * nine thousand holding the SECOND, and its Hall is no longer a room with
 * pressure plates in it -- the challenge moved down into the old workings, so
 * even the plate counter belongs to a different map than the door it opens.
 *
 * Ordered, and specific before general: `kellowmere_hall_plates` has to be read
 * before `kellowmere_hall`, or a save two builds old ends up counting stones on
 * a map with no stones on it.
 */
const V4_RENAMES: [RegExp, string][] = [
  [/^kellowmere_hall_plates$/, 'stonewake_mine_plates'],
  [/^kellowmere_house_b_up$/, 'stonewake_house_b_up'],
  [/^kellowmere_provisioner$/, 'stonewake_market'],
  [/^kellowmere_(hall|clinic|house_a|house_b)$/, 'stonewake_$1'],
  [/^kellowmere$/, 'stonewake'],
  // Tarin's Kellowmere beat is his Stonewake beat; the trainer ids moved with it.
  [/^tarin_km_done$/, 'tarin_stonewake_done'],
  [/^tarin_km_/, 'tarin_stonewake_'],
];

function renameV4(id: string): string {
  for (const [pat, rep] of V4_RENAMES) {
    if (pat.test(id)) return id.replace(pat, rep);
  }
  return id;
}

function toV4(file: SaveFile): SaveFile {
  sweepIds(file, renameV4, renameV4);

  const h = file.header as unknown as Record<string, any>;
  if (h && typeof h.mapName === 'string') {
    h.mapName = h.mapName.replace(/\bKellowmere\b/g, 'Stonewake');
  }

  file.version = 4;
  return file;
}

/** Forward-migrations for older save versions, applied in order. */
function migrate(file: SaveFile): SaveFile {
  if (file.version < 2) toV2(file);
  if (file.version < 3) toV3(file);
  if (file.version < 4) toV4(file);
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
