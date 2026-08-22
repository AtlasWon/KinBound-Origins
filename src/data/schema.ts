/**
 * KinBound data schema.
 *
 * Every piece of game content is described here and authored as JSON under /data.
 * Engine modules must never hardcode content; they consume these shapes.
 */

/* ------------------------------------------------------------------ types */

export const TYPE_IDS = [
  'beast', 'flame', 'tide', 'verdant', 'spark', 'frost', 'brawl', 'venom', 'terra',
  'gale', 'psyche', 'chitin', 'stone', 'spirit', 'iron', 'umbral', 'radiant',
] as const;
export type TypeId = (typeof TYPE_IDS)[number];

export interface TypeMeta {
  name: string;
  color: string;
  blurb: string;
}

export interface TypeChartFile {
  order: TypeId[];
  meta: Record<TypeId, TypeMeta>;
  /** attacker -> defender -> multiplier. Missing entries are 1. */
  chart: Record<TypeId, Partial<Record<TypeId, number>>>;
}

/* ------------------------------------------------------------------ stats */

export const STAT_KEYS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const;
export type StatKey = (typeof STAT_KEYS)[number];

/** Stats that can be raised or lowered in battle (no hp). */
export const BATTLE_STAT_KEYS = ['atk', 'def', 'spa', 'spd', 'spe', 'acc', 'eva'] as const;
export type BattleStatKey = (typeof BATTLE_STAT_KEYS)[number];

export type StatSpread = Record<StatKey, number>;

export type GrowthRate = 'erratic' | 'fast' | 'mediumFast' | 'mediumSlow' | 'slow' | 'fluctuating';

/** Natures nudge one stat +10% and another -10%. Neutral natures repeat the same stat. */
export interface NatureData {
  id: string;
  name: string;
  up: Exclude<StatKey, 'hp'>;
  down: Exclude<StatKey, 'hp'>;
  /** flavour preference, used by berry and bond side content */
  likes?: string;
}

/* ------------------------------------------------------------------ status */

export type StatusId =
  | 'none' | 'burn' | 'freeze' | 'paralysis' | 'poison' | 'toxic' | 'sleep';

export type VolatileId =
  | 'confusion' | 'flinch' | 'trapped' | 'leechseed' | 'protect' | 'substitute'
  | 'focusEnergy' | 'charging' | 'recharging' | 'lockedIn' | 'perishing'
  | 'rooted' | 'identified' | 'curse' | 'nightmare' | 'torment' | 'taunt'
  | 'encore' | 'disable' | 'minimized' | 'defenseCurl' | 'destinyBond' | 'endure';

export type WeatherId =
  | 'clear' | 'rain' | 'heavyRain' | 'sun' | 'harshSun'
  | 'sandstorm' | 'snow' | 'fog' | 'storm';

export type TerrainTag =
  | 'grass' | 'tallGrass' | 'sand' | 'water' | 'deepWater'
  | 'cave' | 'floor' | 'snow' | 'marsh' | 'ash';

export type TimeOfDay = 'morning' | 'day' | 'evening' | 'night';

/* ------------------------------------------------------------------- moves */

export type MoveCategory = 'physical' | 'special' | 'status';

export type MoveTarget =
  | 'foe'            // one chosen opponent
  | 'foeSide'        // all opponents
  | 'allAdjacent'    // everyone else on the field
  | 'self'
  | 'ally'
  | 'selfSide'
  | 'field'
  | 'random';

/**
 * Data-driven move effects. The battle engine has a handler per `kind`;
 * adding a new move normally means composing existing kinds, not writing code.
 */
export type MoveEffect =
  | { kind: 'status'; status: StatusId; chance: number; target?: MoveTarget }
  | { kind: 'volatile'; volatile: VolatileId; chance: number; turns?: number; target?: MoveTarget }
  | { kind: 'statChange'; stat: BattleStatKey; stages: number; chance: number; target: MoveTarget }
  | { kind: 'heal'; fraction: number }
  | { kind: 'drain'; fraction: number }
  | { kind: 'recoil'; fraction: number }
  | { kind: 'crashOnMiss'; fraction: number }
  | { kind: 'multiHit'; min: number; max: number }
  | { kind: 'fixedDamage'; amount: number }
  | { kind: 'levelDamage' }
  | { kind: 'ohko' }
  | { kind: 'weather'; weather: WeatherId; turns: number }
  | { kind: 'highCrit'; stages: number }
  | { kind: 'flinch'; chance: number }
  | { kind: 'protect' }
  | { kind: 'twoTurn'; chargeMessage: string; semiInvulnerable?: 'sky' | 'ground' | 'water' }
  | { kind: 'delayed'; turns: number }
  | { kind: 'forceSwitch'; target: MoveTarget }
  | { kind: 'trap'; minTurns: number; maxTurns: number }
  | { kind: 'screen'; screen: 'physical' | 'special'; turns: number }
  | { kind: 'hazard'; hazard: 'spikes' | 'grit' | 'spores'; layers: number }
  | { kind: 'cureParty'; status: StatusId | 'all' }
  | { kind: 'copyMove' }
  | { kind: 'swapStats'; stats: BattleStatKey[] }
  | { kind: 'custom'; id: string; params?: Record<string, number | string | boolean> };

export type MoveFlag =
  | 'sound' | 'punch' | 'bite' | 'blade' | 'bullet' | 'powder' | 'wind'
  | 'defrost' | 'ignoresProtect' | 'snatchable' | 'mirrorable';

export interface MoveData {
  id: string;
  name: string;
  type: TypeId;
  category: MoveCategory;
  /** 0 for status moves. */
  power: number;
  /** 0..100, or -1 for moves that never miss. */
  accuracy: number;
  pp: number;
  priority: number;
  target: MoveTarget;
  effects: MoveEffect[];
  /** Contact moves interact with hold items and abilities. */
  contact: boolean;
  flags?: MoveFlag[];
  animation: string;
  description: string;
}

/* --------------------------------------------------------------- abilities */

export interface AbilityData {
  id: string;
  name: string;
  description: string;
  /** Hook names the battle engine dispatches on. */
  hooks?: string[];
  params?: Record<string, number | string | boolean>;
}

/* ----------------------------------------------------------------- species */

export type EvolutionMethod =
  | { kind: 'level'; level: number }
  | { kind: 'levelWithStat'; level: number; compare: 'atkGtDef' | 'defGtAtk' | 'atkEqDef' }
  | { kind: 'item'; item: string }
  | { kind: 'friendship'; threshold: number; time?: 'day' | 'night' }
  | { kind: 'levelAtTime'; level: number; time: TimeOfDay }
  | { kind: 'location'; mapId: string; level?: number }
  | { kind: 'knowsMove'; move: string; level?: number }
  | { kind: 'holdingItem'; item: string; time?: 'day' | 'night' }
  /** Trade substitute: evolves after levelling while designated as a bonded pair. */
  | { kind: 'bond'; level: number; note: string }
  | { kind: 'weatherLevel'; level: number; weather: WeatherId };

export interface Evolution {
  to: string;
  method: EvolutionMethod;
}

export interface LearnsetEntry {
  level: number;
  move: string;
}

export interface SpeciesData {
  /** Vellum number, 1-based, stable forever once assigned. */
  num: number;
  id: string;
  name: string;
  types: [TypeId] | [TypeId, TypeId];
  base: StatSpread;
  abilities: string[];
  hiddenAbility?: string;
  growthRate: GrowthRate;
  catchRate: number;
  baseExp: number;
  /** EVs awarded when defeated. */
  evYield: Partial<StatSpread>;
  /** 0..1 chance female; -1 means genderless. */
  genderRatio: number;
  eggGroups: string[];
  hatchCycles: number;
  baseFriendship: number;
  height: number;           // metres
  weight: number;           // kilograms
  category: string;         // short tagline, e.g. "the Ember Cub"
  vellumEntry: string;
  habitat: string;
  learnset: LearnsetEntry[];
  /** Moves teachable from discs and tutors. */
  teachable?: string[];
  evolutions?: Evolution[];
  /** Design-time notes that drive sprite generation and later art passes. */
  design: {
    silhouette: string;
    palette: string[];
    role: 'wall' | 'sweeper' | 'pivot' | 'trapper' | 'support' | 'bruiser' | 'glass';
    /** Body archetype the sprite generator builds from. */
    plan?: string;
    /** 0..1 visual size within the 64x64 cell. */
    scale?: number;
    notes?: string;
  };
  legendary?: boolean;
  mythical?: boolean;
}

/* ------------------------------------------------------------------- items */

export type ItemCategory =
  | 'vessel' | 'healing' | 'statusHeal' | 'revive' | 'battle' | 'evolution'
  | 'held' | 'key' | 'disc' | 'berry' | 'treasure' | 'fossil' | 'exploration';

export type ItemEffect =
  | { kind: 'healHp'; amount: number | 'full'; fraction?: number }
  | { kind: 'healStatus'; status: StatusId | 'all' }
  | { kind: 'revive'; fraction: number }
  | { kind: 'restorePp'; amount: number | 'full'; allMoves?: boolean }
  | { kind: 'catch'; modifier: number; special?: string }
  | { kind: 'battleStat'; stat: BattleStatKey; stages: number }
  | { kind: 'evolve'; species?: string }
  | { kind: 'teachMove'; move: string }
  | { kind: 'repel'; steps: number }
  | { kind: 'escape' }
  | { kind: 'fieldArt'; art: string }
  | { kind: 'custom'; id: string; params?: Record<string, number | string | boolean> };

export interface ItemData {
  id: string;
  name: string;
  category: ItemCategory;
  price: number;
  /** Most items sell for half price; 0 means unsellable. */
  sellPrice?: number;
  description: string;
  icon: string;
  effects: ItemEffect[];
  usableInBattle: boolean;
  usableInField: boolean;
  consumable: boolean;
  /** Sort order inside its bag pocket. */
  sort?: number;
}

/* ---------------------------------------------------------------- trainers */

export type AiTier = 'novice' | 'trained' | 'veteran' | 'keeper' | 'elite';

export interface TrainerMon {
  species: string;
  level: number;
  moves?: string[];
  ability?: string;
  item?: string;
  nature?: string;
  ivs?: Partial<StatSpread>;
  evs?: Partial<StatSpread>;
  nickname?: string;
}

export interface TrainerData {
  id: string;
  name: string;
  className: string;
  sprite: string;
  ai: AiTier;
  /** Multiplied by the level of the last kin to compute prize money. */
  payout: number;
  party: TrainerMon[];
  intro: string[];
  defeat: string[];
  victory: string[];
  /** Optional line shown when spoken to after being beaten. */
  afterward?: string[];
  double?: boolean;
  rematchParties?: TrainerMon[][];
  items?: string[];
}

/* -------------------------------------------------------------- encounters */

export type EncounterMethod =
  | 'tallGrass' | 'cave' | 'water' | 'fishOld' | 'fishGood' | 'fishSuper'
  | 'rockSmash' | 'ash';

export interface EncounterSlot {
  species: string;
  minLevel: number;
  maxLevel: number;
  weight: number;
  time?: TimeOfDay[];
  weather?: WeatherId[];
  /** Only appears once a story flag is set. */
  requiresFlag?: string;
}

export interface EncounterMethodTable {
  /** Chance in 1000 per step that an encounter triggers, for walking methods. */
  rate?: number;
  slots: EncounterSlot[];
}

export interface EncounterTable {
  mapId: string;
  methods: Partial<Record<EncounterMethod, EncounterMethodTable>>;
}

/* -------------------------------------------------------------------- maps */

export interface TileLayer {
  name: string;
  /** width*height indices into the tileset; 0 means empty. */
  data: number[];
}

/**
 * 0 walkable, 1 solid, 2 shallow water, 3 ledge-down, 4 ledge-left,
 * 5 ledge-right, 6 tall grass, 7 marsh (needs Wade), 8 deep water (needs Swim)
 */
export type CollisionCode = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface MapWarp {
  x: number; y: number;
  toMap: string; toX: number; toY: number;
  facing?: Direction;
  /** 'door' plays the door animation, 'edge' is a seamless route seam. */
  style: 'door' | 'stairs' | 'cave' | 'edge' | 'warp';
}

export type NpcMovement =
  | { kind: 'static' }
  | { kind: 'lookAround' }
  | { kind: 'pace'; axis: 'x' | 'y'; distance: number }
  | { kind: 'wander'; radius: number }
  | { kind: 'path'; steps: Direction[]; loop: boolean };

export interface MapNpc {
  id: string;
  sprite: string;
  x: number; y: number;
  facing: Direction;
  movement: NpcMovement;
  /** Event script id run on interaction. */
  script?: string;
  /** Trainer that challenges on line of sight. */
  trainer?: string;
  sightRange?: number;
  /** Only spawns while these flag conditions hold. */
  requiresFlag?: string;
  hiddenIfFlag?: string;
}

export interface MapObject {
  kind: 'item' | 'hiddenItem' | 'sign' | 'script' | 'cuttable' | 'pushable' | 'switch' | 'ledgeHint';
  x: number; y: number;
  item?: string;
  quantity?: number;
  flag?: string;
  script?: string;
  text?: string[];
}

export interface MapData {
  id: string;
  name: string;
  /** Banner shown on entry, when it differs from the previous map's label. */
  displayName?: string;
  width: number;
  height: number;
  tileset: string;
  music: string;
  /** Battle backdrop id. */
  battleBackdrop: string;
  weather?: WeatherId;
  indoor: boolean;
  dark?: boolean;
  layers: TileLayer[];
  collision: CollisionCode[];
  warps: MapWarp[];
  npcs: MapNpc[];
  objects: MapObject[];
  /** Region-map coordinates for the world map screen. */
  regionPos?: { x: number; y: number };
  /** Connections for seamless scrolling between route maps. */
  connections?: { dir: Direction; map: string; offset: number }[];
}

/* ------------------------------------------------------------------ events */

export type EventCondition =
  | { kind: 'flag'; flag: string; value?: boolean }
  | { kind: 'var'; var: string; op: '==' | '!=' | '>' | '<' | '>=' | '<='; value: number }
  | { kind: 'hasItem'; item: string; count?: number }
  | { kind: 'hasSeal'; seal: number }
  | { kind: 'defeated'; trainer: string }
  | { kind: 'partyHas'; species: string }
  | { kind: 'partyCount'; op: '>' | '<' | '=='; value: number }
  | { kind: 'hasArt'; art: string }
  | { kind: 'timeOfDay'; time: TimeOfDay[] }
  | { kind: 'vellumCaught'; count: number }
  | { kind: 'not'; of: EventCondition }
  | { kind: 'all'; of: EventCondition[] }
  | { kind: 'any'; of: EventCondition[] };

export type EventAction =
  | { kind: 'say'; who?: string; lines: string[] }
  | { kind: 'ask'; lines: string[]; yes: EventAction[]; no: EventAction[] }
  | { kind: 'choice'; lines: string[]; options: { label: string; then: EventAction[] }[] }
  | { kind: 'setFlag'; flag: string; value?: boolean }
  | { kind: 'setVar'; var: string; value: number }
  | { kind: 'addVar'; var: string; delta: number }
  | { kind: 'giveItem'; item: string; count?: number }
  | { kind: 'takeItem'; item: string; count?: number }
  | { kind: 'giveMoney'; amount: number }
  | { kind: 'takeMoney'; amount: number }
  | { kind: 'giveKin'; species: string; level: number; nickname?: string }
  | { kind: 'healParty' }
  | { kind: 'battleTrainer'; trainer: string; onLoss?: 'whiteout' | 'continue' }
  | { kind: 'battleWild'; species: string; level: number; catchable?: boolean; music?: string }
  | { kind: 'move'; who: string; steps: Direction[]; speed?: 'walk' | 'run' }
  | { kind: 'face'; who: string; dir: Direction }
  | { kind: 'spawnNpc'; npc: MapNpc }
  | { kind: 'removeNpc'; who: string }
  | { kind: 'warp'; map: string; x: number; y: number; facing?: Direction; style?: MapWarp['style'] }
  | { kind: 'fade'; to: 'black' | 'white' | 'clear'; frames?: number }
  | { kind: 'wait'; frames: number }
  | { kind: 'music'; track: string | 'resume' | 'stop' }
  | { kind: 'sfx'; sound: string }
  | { kind: 'shake'; frames: number; power: number }
  | { kind: 'camera'; to: { x: number; y: number } | 'player'; frames?: number }
  | { kind: 'weather'; weather: WeatherId }
  | { kind: 'giveArt'; art: string }
  | { kind: 'giveSeal'; seal: number; name: string }
  | { kind: 'openShop'; shop: string }
  | { kind: 'openStorage' }
  | { kind: 'setRespawn'; map?: string; x?: number; y?: number }
  | { kind: 'starterChoice'; options: string[] }
  | { kind: 'if'; cond: EventCondition; then: EventAction[]; else?: EventAction[] }
  | { kind: 'call'; script: string }
  | { kind: 'end' };

export interface EventScript {
  id: string;
  /** Optional gate; when it fails the script does nothing. */
  when?: EventCondition;
  /** Runs once, then sets this flag. */
  onceFlag?: string;
  /** 'interact' (talk), 'step' (walk onto tile), 'enter' (map load), 'sight' (trainer). */
  trigger: 'interact' | 'step' | 'enter' | 'sight' | 'call';
  /** Tiles that fire a 'step' script. */
  at?: { x: number; y: number }[];
  /** Map this script belongs to; set for 'step' and 'enter' triggers. */
  map?: string;
  actions: EventAction[];
}

/* ------------------------------------------------------------------- shops */

export interface ShopData {
  id: string;
  name: string;
  greeting: string[];
  stock: { item: string; requiresSeal?: number; requiresFlag?: string }[];
}
