/**
 * Event VM.
 *
 * Story content is authored as JSON command lists (see data/events/*.json) and
 * executed here. The rule this enforces is the important one: **no story beat
 * ever requires touching engine code**. A new cutscene, a new gift NPC, a whole
 * new town's worth of plot is a data file.
 *
 * The runner is a small cooperative interpreter. Each tick it executes commands
 * until one of them blocks (dialogue waiting on input, an actor walking, a
 * battle running, a fade). Blocking commands resolve through a callback which
 * clears the wait and lets the program continue on a later tick.
 */

import type { Game } from '../core/game.js';
import type { GameState } from './state.js';
import type {
  Direction, EventAction, EventCondition, EventScript, MapNpc, WeatherId,
} from '../data/schema.js';

/** What the VM needs from whatever scene is hosting it. */
export interface EventHost {
  state: GameState;
  /** 'player' or an NPC id. */
  moveActor(who: string, steps: Direction[], speed: 'walk' | 'run', done: () => void): void;
  faceActor(who: string, dir: Direction): void;
  spawnNpc(npc: MapNpc): void;
  removeNpc(id: string): void;
  warp(map: string, x: number, y: number, facing: Direction | undefined, done: () => void): void;
  fade(to: 'black' | 'white' | 'clear', frames: number, done: () => void): void;
  shake(frames: number, power: number): void;
  setWeather(weather: WeatherId): void;
  camera(to: { x: number; y: number } | 'player', frames: number, done: () => void): void;
  /** Pause for a number of simulation frames. */
  wait(frames: number, done: () => void): void;
  playMusic(track: string): void;
  playSfx(sound: string): void;
  battleTrainer(trainerId: string, onLoss: 'whiteout' | 'continue', done: (won: boolean) => void): void;
  battleWild(species: string, level: number, catchable: boolean, done: () => void): void;
  healParty(): void;
  openShop(shopId: string): void;
  openStorage(): void;
  giveKin(species: string, level: number, nickname: string | undefined, done: () => void): void;
  starterChoice(options: string[], done: (chosen: string | null) => void): void;
  /** Run a bespoke set-piece scene by name and call back when it is over. */
  setPiece(id: string, done: () => void): void;
  say(lines: string[], who: string | undefined, done: () => void): void;
  ask(lines: string[], done: (yes: boolean) => void): void;
  choice(lines: string[], labels: string[], done: (index: number) => void): void;
  /** Look up another script by id, for `call`. */
  script(id: string): EventScript | undefined;
}

interface Frame {
  actions: EventAction[];
  pc: number;
}

export class EventRunner {
  private stack: Frame[] = [];
  private waiting = false;
  private finished = false;
  private onComplete?: () => void;
  /** Guards against a script accidentally recursing forever. */
  private steps = 0;

  constructor(private host: EventHost) {}

  get running(): boolean {
    return !this.finished && this.stack.length > 0;
  }

  start(script: EventScript, onComplete?: () => void): boolean {
    if (script.when && !this.test(script.when)) return false;
    if (script.onceFlag && this.host.state.hasFlag(script.onceFlag)) return false;

    this.stack = [{ actions: script.actions, pc: 0 }];
    this.waiting = false;
    this.finished = false;
    this.onComplete = onComplete;
    if (script.onceFlag) this.host.state.setFlag(script.onceFlag);
    return true;
  }

  /** Runs commands until one blocks or the program ends. */
  update(): void {
    if (this.finished || this.waiting) return;
    this.steps = 0;
    while (!this.waiting && !this.finished) {
      if (this.steps++ > 512) {
        console.warn('event: script ran 512 commands without yielding; stopping');
        this.stop();
        return;
      }
      const frame = this.stack[this.stack.length - 1];
      if (!frame) { this.stop(); return; }
      if (frame.pc >= frame.actions.length) {
        this.stack.pop();
        if (this.stack.length === 0) { this.stop(); return; }
        continue;
      }
      const action = frame.actions[frame.pc++]!;
      this.exec(action);
    }
  }

  stop(): void {
    if (this.finished) return;
    this.finished = true;
    this.stack = [];
    this.waiting = false;
    const cb = this.onComplete;
    this.onComplete = undefined;
    cb?.();
  }

  /** Push a nested block (used by if/ask/choice). */
  private push(actions: EventAction[]): void {
    if (actions.length > 0) this.stack.push({ actions, pc: 0 });
  }

  private block(): () => void {
    this.waiting = true;
    let released = false;
    return () => {
      // Guard against a host calling back twice.
      if (released) return;
      released = true;
      this.waiting = false;
    };
  }

  /* ------------------------------------------------------------ commands */

  private exec(a: EventAction): void {
    const s = this.host.state;
    switch (a.kind) {
      case 'say': {
        const done = this.block();
        this.host.say(a.lines, a.who, done);
        break;
      }
      case 'ask': {
        const done = this.block();
        this.host.ask(a.lines, (yes) => {
          this.push(yes ? a.yes : a.no);
          done();
        });
        break;
      }
      case 'choice': {
        const done = this.block();
        this.host.choice(a.lines, a.options.map((o) => o.label), (i) => {
          this.push(a.options[i]?.then ?? []);
          done();
        });
        break;
      }
      case 'setFlag': s.setFlag(a.flag, a.value ?? true); break;
      case 'setVar': s.setVar(a.var, a.value); break;
      case 'addVar': s.addVar(a.var, a.delta); break;
      case 'giveItem': s.giveItem(a.item, a.count ?? 1); break;
      case 'takeItem': s.takeItem(a.item, a.count ?? 1); break;
      case 'giveMoney': s.earn(a.amount); break;
      case 'takeMoney': s.spend(a.amount); break;
      case 'healParty': this.host.healParty(); break;

      case 'giveKin': {
        const done = this.block();
        this.host.giveKin(a.species, a.level, a.nickname, done);
        break;
      }
      case 'starterChoice': {
        const done = this.block();
        this.host.starterChoice(a.options, () => done());
        break;
      }
      case 'setPiece': {
        const done = this.block();
        this.host.setPiece(a.id, done);
        break;
      }

      case 'battleTrainer': {
        const done = this.block();
        const onLoss = a.onLoss ?? 'whiteout';
        this.host.battleTrainer(a.trainer, onLoss, (won) => {
          // Scripts can branch on the result; a whiteout ends the scene
          // outright, because the player is no longer standing where the rest
          // of the script expects them to be.
          s.setVar('last_battle_won', won ? 1 : 0);
          done();
          if (!won && onLoss === 'whiteout') this.stop();
        });
        break;
      }
      case 'battleWild': {
        const done = this.block();
        this.host.battleWild(a.species, a.level, a.catchable ?? true, done);
        break;
      }

      case 'move': {
        const done = this.block();
        this.host.moveActor(a.who, a.steps, a.speed ?? 'walk', done);
        break;
      }
      case 'face': this.host.faceActor(a.who, a.dir); break;
      case 'spawnNpc': this.host.spawnNpc(a.npc); break;
      case 'removeNpc': this.host.removeNpc(a.who); break;

      case 'warp': {
        const done = this.block();
        this.host.warp(a.map, a.x, a.y, a.facing, done);
        break;
      }
      case 'fade': {
        const done = this.block();
        this.host.fade(a.to, a.frames ?? 20, done);
        break;
      }
      case 'wait': {
        const done = this.block();
        this.host.wait(a.frames, done);
        break;
      }
      case 'camera': {
        const done = this.block();
        this.host.camera(a.to, a.frames ?? 20, done);
        break;
      }
      case 'shake': this.host.shake(a.frames, a.power); break;
      case 'music': this.host.playMusic(a.track); break;
      case 'sfx': this.host.playSfx(a.sound); break;
      case 'weather': this.host.setWeather(a.weather); break;

      case 'giveArt': s.giveArt(a.art); break;
      case 'giveCrest': s.giveCrest(a.crest); break;
      case 'openShop': this.host.openShop(a.shop); break;
      case 'openStorage': this.host.openStorage(); break;
      case 'setRespawn': {
        // Defaults to wherever the player is standing, which is what a
        // A Kin Clinic wants: rest here, wake up here.
        s.respawnMap = a.map ?? s.currentMap;
        s.respawnX = a.x ?? s.currentX;
        s.respawnY = a.y ?? s.currentY;
        break;
      }

      case 'if': {
        if (this.test(a.cond)) this.push(a.then);
        else if (a.else) this.push(a.else);
        break;
      }
      case 'call': {
        const script = this.host.script(a.script);
        if (script && (!script.when || this.test(script.when))) this.push(script.actions);
        break;
      }
      case 'end': this.stop(); break;
    }
  }

  /* ---------------------------------------------------------- conditions */

  test(cond: EventCondition): boolean {
    const s = this.host.state;
    switch (cond.kind) {
      case 'flag': return s.hasFlag(cond.flag) === (cond.value ?? true);
      case 'var': {
        const v = s.getVar(cond.var);
        switch (cond.op) {
          case '==': return v === cond.value;
          case '!=': return v !== cond.value;
          case '>': return v > cond.value;
          case '<': return v < cond.value;
          case '>=': return v >= cond.value;
          case '<=': return v <= cond.value;
        }
        return false;
      }
      case 'hasItem': return s.hasItem(cond.item, cond.count ?? 1);
      case 'hasCrest': return s.crests.has(cond.crest);
      case 'defeated': return s.hasDefeated(cond.trainer);
      case 'partyHas': return s.party.some((k) => k.species === cond.species);
      case 'partyCount': {
        const n = s.party.length;
        if (cond.op === '>') return n > cond.value;
        if (cond.op === '<') return n < cond.value;
        return n === cond.value;
      }
      case 'hasArt': return s.hasArt(cond.art);
      case 'timeOfDay': return true; // resolved by the host when it matters
      case 'vellumCaught': return s.caught.size >= cond.count;
      case 'not': return !this.test(cond.of);
      case 'all': return cond.of.every((c) => this.test(c));
      case 'any': return cond.of.some((c) => this.test(c));
    }
  }
}

/** Convenience for hosts that need the time-of-day condition resolved. */
export function testWithTime(
  runner: EventRunner, cond: EventCondition, game: Game,
): boolean {
  if (cond.kind === 'timeOfDay') return cond.time.includes(game.timeOfDay());
  return runner.test(cond);
}
