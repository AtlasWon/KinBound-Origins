/**
 * Game state.
 *
 * The single serialisable object that *is* a save file: story flags, variables,
 * inventory, money, party, storage, the Vellum, and where the player is
 * standing. Everything the save system needs lives here and nowhere else.
 */

import { registry } from '../data/registry.js';
import { Kin } from './kin.js';
import { worldRng } from '../core/rng.js';
import { setToken } from '../core/tokens.js';
import { DEFAULT_APPEARANCE, normaliseAppearance, type CharAppearance } from '../gfx/charsprite.js';
import { refreshTideheart, tideheartEnteredMap, TIDEHEART } from './tideheart.js';
import { tarinBeat, tarinFlagsFor, type TarinBeat } from './tarin.js';
import type { Direction, TimeOfDay } from '../data/schema.js';

export interface InventoryEntry {
  item: string;
  count: number;
}

export interface SaveHeader {
  slot: number;
  name: string;
  playTime: number;
  crests: number;
  vellumCaught: number;
  savedAt: number;
  mapName: string;
}

export class GameState {
  private name = 'AVEN';

  /** Publishes {name} for dialogue on every write, including load. */
  get playerName(): string { return this.name; }
  set playerName(value: string) {
    this.name = value;
    setToken('name', value);
  }

  /** How the player built themselves. Drives every sprite they appear in. */
  appearance: CharAppearance = { ...DEFAULT_APPEARANCE };

  money = 3000;

  // A new game opens in the player's own bedroom rather than in the middle of
  // the street. The walk down the stairs and past their mother is what gives
  // the first five minutes a reason to be happening.
  private mapId = 'hearthmere_house_up';

  /**
   * Where the player is.
   *
   * A property rather than a field because arriving somewhere is an event, not
   * just a number changing: the Tideheart reacts to the ground it is standing
   * on, and it has to do that whether or not the map's author wrote a scene
   * for it. `fromJSON` writes `mapId` directly, so loading a save into a place
   * the object can feel does not fire the arrival cue over the load screen.
   */
  get currentMap(): string { return this.mapId; }
  set currentMap(id: string) {
    const from = this.mapId;
    this.mapId = id;
    if (from !== id) tideheartEnteredMap(this, from, id);
  }

  currentX = 2;
  currentY = 2;
  currentFacing: Direction = 'down';

  /** Where the player returns to after a blackout. */
  respawnMap = 'hearthmere_house_player';
  respawnX = 6;
  respawnY = 5;

  private flags = new Set<string>();
  private vars = new Map<string, number>();
  private visited = new Set<string>();
  private defeatedTrainers = new Set<string>();

  /** Field arts (traversal abilities) the player has earned. */
  arts = new Set<string>();
  /** Earned Bond Crests, 1..8. */
  crests = new Set<number>();

  inventory: InventoryEntry[] = [];

  /** Up to six active kin. Anything caught beyond that goes to the Roost. */
  party: Kin[] = [];
  /** Storage boxes, 30 slots each. */
  boxes: (Kin | null)[][] = Array.from({ length: 12 }, () => new Array(30).fill(null));
  boxNames: string[] = Array.from({ length: 12 }, (_, i) => `BOX ${i + 1}`);

  /** Vellum progress. */
  seen = new Set<string>();
  caught = new Set<string>();

  playTime = 0;

  constructor() {
    // A fresh state has a default name, and dialogue has to know it before the
    // player has picked one -- a {name} that resolves to nothing looks like a
    // bug in the writing rather than in the code.
    setToken('name', this.name);
    // Same reason for {tarin_where}: it is on screen before any script has run.
    this.syncTarin();
  }

  /* ---------------------------------------------------------- the party */

  get partyIsAlive(): boolean {
    return this.party.some((k) => !k.fainted);
  }

  firstHealthyIndex(): number {
    return this.party.findIndex((k) => !k.fainted);
  }

  healParty(): void {
    for (const k of this.party) k.healFull();
  }

  /** Adds to the party if there is room, otherwise to the first free box slot. */
  addKin(kin: Kin): 'party' | 'storage' | 'full' {
    this.markCaught(kin.species);
    if (this.party.length < 6) {
      this.party.push(kin);
      return 'party';
    }
    for (let b = 0; b < this.boxes.length; b++) {
      const box = this.boxes[b]!;
      for (let i = 0; i < box.length; i++) {
        if (box[i] === null) { box[i] = kin; return 'storage'; }
      }
    }
    return 'full';
  }

  /** Where a newly caught kin would land, without actually storing it. */
  nextDestination(): 'party' | 'storage' | 'full' {
    if (this.party.length < 6) return 'party';
    for (const box of this.boxes) {
      if (box.some((s) => s === null)) return 'storage';
    }
    return 'full';
  }

  /* --------------------------------------------------------------- flags */

  hasFlag(flag: string): boolean {
    return this.flags.has(flag) || this.tarinFlags.has(flag);
  }

  setFlag(flag: string, value = true): void {
    if (value) this.flags.add(flag);
    else this.flags.delete(flag);
    // The Tideheart's name, description and icon are story state, so the
    // interface has to follow the flag that changed it in the same tick the
    // script set it. Narrowed to its own flags: this is the hottest setter in
    // the game and most of what goes through it is nothing to do with the
    // object.
    if (flag.startsWith('tideheart')) refreshTideheart(this);
    this.syncTarin();
  }

  getVar(name: string): number {
    return this.vars.get(name) ?? 0;
  }

  setVar(name: string, value: number): void {
    this.vars.set(name, value);
  }

  addVar(name: string, delta: number): void {
    this.vars.set(name, this.getVar(name) + delta);
  }

  visitMap(id: string): void {
    this.visited.add(id);
    // Some of Tarin's beats have to land the moment the player walks into a
    // town -- "he beat the Hallkeeper this morning" is only news if the town is
    // already saying it when you arrive, not after you have taken the Crest.
    this.syncTarin();
  }

  hasVisited(id: string): boolean {
    return this.visited.has(id);
  }

  markDefeated(trainerId: string): void {
    this.defeatedTrainers.add(trainerId);
  }

  hasDefeated(trainerId: string): boolean {
    return this.defeatedTrainers.has(trainerId);
  }

  /* ---------------------------------------------------------------- arts */

  hasArt(art: string): boolean {
    return this.arts.has(art);
  }

  giveArt(art: string): void {
    this.arts.add(art);
  }

  giveCrest(n: number): void {
    this.crests.add(n);
    this.syncTarin();
  }

  get crestCount(): number {
    return this.crests.size;
  }

  /* ---------------------------------------------------------------- Tarin */

  /**
   * Where Tarin is and what he has done, derived from the ledger in tarin.ts.
   *
   * Held apart from `flags` and never serialised. The rival's off-screen
   * journey is a *function* of the player's progress, so storing it would only
   * create a second copy that could disagree with the first -- and a save
   * written before a later stage extended the ledger would carry a beat that no
   * longer exists. Recomputing costs a walk over seven rows.
   */
  private tarinFlags = new Set<string>();
  /** The beat he is living in, for debugging and for the dev harness. */
  tarin?: TarinBeat;

  /** Re-derives Tarin's beat. Safe to call as often as anything changes. */
  syncTarin(): void {
    const beat = tarinBeat({
      hasFlag: (f) => this.flags.has(f),
      hasVisited: (m) => this.visited.has(m),
      hasCrest: (n) => this.crests.has(n),
      crestCount: this.crests.size,
    });
    // Recomputed whole rather than patched: a beat that closes has to take its
    // flags with it. TARIN_FLAGS in tarin.ts is the complete list of what the
    // ledger can ever publish, which is what the tests check against.
    this.tarinFlags.clear();
    for (const f of tarinFlagsFor(beat, this.crests.size)) this.tarinFlags.add(f);
    this.tarin = beat;
    setToken('tarin_where', beat?.where ?? 'the road');
  }

  /* ----------------------------------------------------------- inventory */

  giveItem(item: string, count = 1): void {
    const existing = this.inventory.find((e) => e.item === item);
    if (existing) existing.count = Math.min(99, existing.count + count);
    else this.inventory.push({ item, count: Math.min(99, count) });
    if (item === TIDEHEART) refreshTideheart(this);
  }

  takeItem(item: string, count = 1): boolean {
    const idx = this.inventory.findIndex((e) => e.item === item);
    if (idx < 0) return false;
    const entry = this.inventory[idx]!;
    if (entry.count < count) return false;
    entry.count -= count;
    if (entry.count <= 0) this.inventory.splice(idx, 1);
    if (item === TIDEHEART) refreshTideheart(this);
    return true;
  }

  itemCount(item: string): number {
    return this.inventory.find((e) => e.item === item)?.count ?? 0;
  }

  hasItem(item: string, count = 1): boolean {
    return this.itemCount(item) >= count;
  }

  itemName(item: string): string {
    return registry.itemName(item);
  }

  spend(amount: number): boolean {
    if (this.money < amount) return false;
    this.money -= amount;
    return true;
  }

  earn(amount: number): void {
    this.money = Math.min(999999, this.money + amount);
  }

  /* -------------------------------------------------------------- vellum */

  markSeen(species: string): void {
    this.seen.add(species);
  }

  markCaught(species: string): void {
    this.seen.add(species);
    this.caught.add(species);
  }

  /* ------------------------------------------------------------ dialogue */

  dialogueFor(scriptId: string, npcId: string): string[] {
    if (!scriptId) return ['...'];
    const lines = registry.lines(scriptId, (f) => this.hasFlag(f));
    void npcId;
    return lines;
  }

  speakerName(npcId: string): string | undefined {
    return registry.speakerName(npcId);
  }

  /* ---------------------------------------------------------- save/load */

  toJSON(): Record<string, unknown> {
    return {
      version: 1,
      playerName: this.playerName,
      appearance: this.appearance,
      money: this.money,
      currentMap: this.currentMap,
      currentX: this.currentX,
      currentY: this.currentY,
      currentFacing: this.currentFacing,
      respawnMap: this.respawnMap,
      respawnX: this.respawnX,
      respawnY: this.respawnY,
      flags: [...this.flags],
      vars: [...this.vars.entries()],
      visited: [...this.visited],
      defeatedTrainers: [...this.defeatedTrainers],
      arts: [...this.arts],
      crests: [...this.crests],
      inventory: this.inventory,
      party: this.party.map((k) => k.toJSON()),
      boxes: this.boxes.map((b) => b.map((k) => (k ? k.toJSON() : null))),
      boxNames: this.boxNames,
      seen: [...this.seen],
      caught: [...this.caught],
      playTime: this.playTime,
    };
  }

  static fromJSON(data: Record<string, any>): GameState {
    const s = new GameState();
    s.playerName = data.playerName ?? 'AVEN';
    // Saves written before character creation existed have no appearance, and
    // get the default one rather than a crash or an invisible player.
    s.appearance = normaliseAppearance(data.appearance);
    s.money = data.money ?? 3000;
    // Straight to the field, not through the setter: loading a save is not
    // arriving anywhere, and a save made inside an Aurelian site must not
    // sound its arrival cue over the load screen.
    s.mapId = data.currentMap ?? 'hearthmere_house_up';
    s.currentX = data.currentX ?? 2;
    s.currentY = data.currentY ?? 2;
    s.currentFacing = data.currentFacing ?? 'down';
    s.respawnMap = data.respawnMap ?? s.currentMap;
    s.respawnX = data.respawnX ?? s.currentX;
    s.respawnY = data.respawnY ?? s.currentY;
    s.flags = new Set(data.flags ?? []);
    s.vars = new Map(data.vars ?? []);
    s.visited = new Set(data.visited ?? []);
    s.defeatedTrainers = new Set(data.defeatedTrainers ?? []);
    s.arts = new Set(data.arts ?? []);
    s.crests = new Set(data.crests ?? []);
    s.inventory = data.inventory ?? [];
    s.party = (data.party ?? []).map((k: any) => Kin.fromJSON(k, worldRng));
    if (data.boxes) {
      s.boxes = data.boxes.map((b: any[]) => b.map((k: any) => (k ? Kin.fromJSON(k, worldRng) : null)));
    }
    s.boxNames = data.boxNames ?? s.boxNames;
    s.seen = new Set(data.seen ?? []);
    s.caught = new Set(data.caught ?? []);
    s.playTime = data.playTime ?? 0;
    // The object's name and description are derived from flags and from where
    // the player is standing, and a load restores both at once.
    refreshTideheart(s);
    // Tarin's beat is derived, never stored, so a load has to place him again
    // from the flags and Crests the save actually carries. This is also what
    // lets a save made in an earlier stage pick up a later stage's ledger.
    s.syncTarin();
    return s;
  }

  header(slot: number, mapName: string): SaveHeader {
    return {
      slot,
      name: this.playerName,
      playTime: this.playTime,
      crests: this.crestCount,
      vellumCaught: this.caught.size,
      savedAt: Date.now(),
      mapName,
    };
  }
}

/** Formats seconds as H:MM, the way a save-select screen should. */
export function formatPlayTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}

export function timeBandLabel(t: TimeOfDay): string {
  switch (t) {
    case 'morning': return 'Morning';
    case 'day': return 'Day';
    case 'evening': return 'Evening';
    case 'night': return 'Night';
  }
}
