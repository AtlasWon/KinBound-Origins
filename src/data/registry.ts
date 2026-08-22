/**
 * Content registry.
 *
 * One place that knows how to find every piece of authored content. Systems ask
 * the registry for a species or a move; nothing else reads JSON paths. Lookups
 * that miss log once and return a safe fallback, so a typo in a data file
 * degrades a single NPC rather than crashing a playthrough.
 */

import type { AssetManager } from '../core/assets.js';
import type {
  AbilityData, EncounterTable, ItemData, MoveData, NatureData,
  ShopData, SpeciesData, TrainerData, TypeChartFile, EventScript,
} from './schema.js';

/** A dialogue entry can vary with story state. First match wins. */
export interface DialogueVariant {
  /** Flags that must all be set. */
  ifFlags?: string[];
  /** Flags that must all be unset. */
  unlessFlags?: string[];
  lines: string[];
}

export interface DialogueFile {
  /** Display names for NPC ids. */
  speakers?: Record<string, string>;
  entries: Record<string, DialogueVariant[] | string[]>;
}

const warned = new Set<string>();
function warnOnce(key: string, msg: string): void {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(msg);
}

export class Registry {
  typeChart!: TypeChartFile;
  species = new Map<string, SpeciesData>();
  speciesByNum = new Map<number, SpeciesData>();
  moves = new Map<string, MoveData>();
  items = new Map<string, ItemData>();
  abilities = new Map<string, AbilityData>();
  natures: NatureData[] = [];
  trainers = new Map<string, TrainerData>();
  encounters = new Map<string, EncounterTable>();
  shops = new Map<string, ShopData>();
  scripts = new Map<string, EventScript>();

  dialogue: DialogueFile = { speakers: {}, entries: {} };

  /** What content actually exists on disk, so nothing is probed blindly. */
  private manifest: { maps: string[]; dialogue: string[]; events: string[]; encounters: string[] } = {
    maps: [], dialogue: [], events: [], encounters: [],
  };

  has(kind: 'maps' | 'dialogue' | 'events' | 'encounters', id: string): boolean {
    return this.manifest[kind].includes(id);
  }

  async loadCore(assets: AssetManager): Promise<void> {
    const manifest = await assets
      .loadJson<typeof this.manifest>('data/manifest.json')
      .catch(() => null);
    if (manifest) this.manifest = manifest;

    this.typeChart = await assets.loadJson<TypeChartFile>('data/region/types.json');

    const [speciesFile, movesFile, itemsFile, abilitiesFile, naturesFile] = await Promise.all([
      assets.loadJson<SpeciesData[]>('data/creatures/species.json').catch(() => [] as SpeciesData[]),
      assets.loadJson<MoveData[]>('data/moves/moves.json').catch(() => [] as MoveData[]),
      assets.loadJson<ItemData[]>('data/items/items.json').catch(() => [] as ItemData[]),
      assets.loadJson<AbilityData[]>('data/creatures/abilities.json').catch(() => [] as AbilityData[]),
      assets.loadJson<NatureData[]>('data/creatures/natures.json').catch(() => [] as NatureData[]),
    ]);

    const trainerFile = await assets
      .loadJson<TrainerData[]>('data/trainers/trainers.json')
      .catch(() => [] as TrainerData[]);
    for (const t of trainerFile) this.trainers.set(t.id, t);

    const shopFile = await assets
      .loadJson<ShopData[]>('data/items/shops.json')
      .catch(() => [] as ShopData[]);
    for (const s of shopFile) this.shops.set(s.id, s);

    for (const s of speciesFile) { this.species.set(s.id, s); this.speciesByNum.set(s.num, s); }
    for (const m of movesFile) this.moves.set(m.id, m);
    for (const i of itemsFile) this.items.set(i.id, i);
    for (const a of abilitiesFile) this.abilities.set(a.id, a);
    this.natures = naturesFile;

    const dlg = await assets.loadJson<DialogueFile>('data/dialogue/common.json').catch(() => null);
    if (dlg) this.mergeDialogue(dlg);

    const shared = await assets.loadJson<EventScript[]>('data/events/common.json').catch(() => null);
    if (shared) for (const script of shared) this.scripts.set(script.id, script);
  }

  mergeDialogue(file: DialogueFile): void {
    this.dialogue.speakers = { ...(this.dialogue.speakers ?? {}), ...(file.speakers ?? {}) };
    this.dialogue.entries = { ...this.dialogue.entries, ...file.entries };
  }

  async loadDialogueFor(assets: AssetManager, mapId: string): Promise<void> {
    if (!this.has('dialogue', mapId)) return;
    const file = await assets.loadJson<DialogueFile>(`data/dialogue/${mapId}.json`).catch(() => null);
    if (file) this.mergeDialogue(file);
  }

  /** Event scripts for a map (and any shared ones it pulls in). */
  async loadScriptsFor(assets: AssetManager, mapId: string): Promise<void> {
    if (!this.has('events', mapId)) return;
    const file = await assets
      .loadJson<EventScript[]>(`data/events/${mapId}.json`)
      .catch(() => null);
    if (!file) return;
    for (const script of file) this.scripts.set(script.id, script);
  }

  async loadEncounters(assets: AssetManager, id: string): Promise<EncounterTable | undefined> {
    const cached = this.encounters.get(id);
    if (cached) return cached;
    if (!this.has('encounters', id)) return undefined;
    const file = await assets.loadJson<EncounterTable>(`data/encounters/${id}.json`).catch(() => null);
    if (file) this.encounters.set(id, file);
    return file ?? undefined;
  }

  async loadTrainer(assets: AssetManager, id: string): Promise<TrainerData | undefined> {
    const cached = this.trainers.get(id);
    if (cached) return cached;
    const all = await assets.loadJson<TrainerData[]>('data/trainers/trainers.json').catch(() => null);
    if (all) for (const t of all) this.trainers.set(t.id, t);
    return this.trainers.get(id);
  }

  getSpecies(id: string): SpeciesData | undefined {
    const s = this.species.get(id);
    if (!s) warnOnce(`species:${id}`, `registry: unknown species "${id}"`);
    return s;
  }

  getMove(id: string): MoveData | undefined {
    const m = this.moves.get(id);
    if (!m) warnOnce(`move:${id}`, `registry: unknown move "${id}"`);
    return m;
  }

  getItem(id: string): ItemData | undefined {
    const i = this.items.get(id);
    if (!i) warnOnce(`item:${id}`, `registry: unknown item "${id}"`);
    return i;
  }

  itemName(id: string): string {
    return this.items.get(id)?.name ?? id.replace(/_/g, ' ').toUpperCase();
  }

  speakerName(npcId: string): string | undefined {
    return this.dialogue.speakers?.[npcId];
  }

  /** Resolve a dialogue entry against the current flag state. */
  lines(scriptId: string, hasFlag: (f: string) => boolean): string[] {
    const entry = this.dialogue.entries[scriptId];
    if (!entry) {
      warnOnce(`dlg:${scriptId}`, `registry: no dialogue for "${scriptId}"`);
      return ['...'];
    }
    if (entry.length > 0 && typeof entry[0] === 'string') return entry as string[];

    for (const variant of entry as DialogueVariant[]) {
      const okIf = (variant.ifFlags ?? []).every((f) => hasFlag(f));
      const okUnless = (variant.unlessFlags ?? []).every((f) => !hasFlag(f));
      if (okIf && okUnless) return variant.lines;
    }
    return ['...'];
  }
}

export const registry = new Registry();
