/**
 * Dialogue.
 *
 * A pushed scene so the world keeps drawing underneath. Text reveals at the
 * player's chosen speed, confirm skips the reveal, confirm again pages on --
 * the classic contract, which matters because players learn to mash through
 * lines they have read before and must never lose a line by doing so.
 *
 * Three things here are doing the work that makes written text feel *spoken*:
 *
 *  - **Punctuation pauses.** A comma costs a few extra frames and a full stop
 *    costs more. Without them every line arrives at one flat rate and reads
 *    like a stock ticker; with them the same words get phrasing for free.
 *  - **Per-speaker voice.** The blip timbre and pitch are derived from the
 *    speaker's name, so every character keeps one voice across the whole game
 *    at no authoring cost -- and within that voice the pitch moves slightly
 *    from letter to letter, because a fixed blip is a metronome.
 *  - **A nameplate that belongs to someone.** The plate takes a colour from the
 *    same hash, so the player learns who is talking before reading the name.
 */

import type { Game } from '../core/game.js';
import type { Scene } from '../core/scene.js';
import { Renderer, SCREEN_H, SCREEN_W } from '../engine/renderer.js';
import { textDelayFrames } from '../core/settings.js';
import { audio } from '../audio/audio.js';
import { resolveTokens } from '../core/tokens.js';
import { fit } from './layout.js';
import { navDown, navUp } from './menu.js';

const BOX_H = 50;
const BOX_MARGIN = 4;
const TEXT_X = 10;
const LINE_H = 11;
const MAX_LINES = 3;

/**
 * Space kept clear on the right of every line for the bobbing advance arrow.
 *
 * The wrap width used to run to within a few units of the arrow, so any line
 * that happened to fill the box was written straight through it. Reserving the
 * column costs one short word on a full line and is invisible on every other.
 */
const ARROW_GUTTER = 18;

/** Extra frames held after a character, so lines get phrasing. */
const PUNCT_HOLD: Record<string, number> = {
  ',': 4, ';': 5, ':': 5, '.': 8, '!': 8, '?': 8, '-': 3,
};

/** Nameplate colours, picked by speaker so a character keeps one identity. */
const PLATE_COLORS = [
  '#c8543f', '#3f7a5c', '#3f6ab0', '#a8683c', '#8a5aa8', '#2f8090', '#b0503c', '#4a6ab8',
];

/** Blip timbres, picked by the same hash that picks the plate colour. */
const VOICES = ['talk', 'talk_low', 'talk_high', 'talk_soft'];

/**
 * Cents added to the blip pitch, stepped once per blip so a run of syllables
 * moves instead of sitting on one note. Deliberately kept under a semitone:
 * any wider and the box stops inflecting and starts playing a tune.
 */
const INFLECT = [0, 26, -18, 40, -8, 14, -30, 32];

/** Cents the pitch falls per blip as a sentence runs on, and how far it falls. */
const DECLINE = 8;
const DECLINE_BLIPS = 7;

/**
 * Frames between voice blips.
 *
 * Spaced in time rather than in letters, because the reveal rate is a setting:
 * a blip every third letter is a pleasant patter at normal speed and a buzz at
 * fast, where the letters arrive four times quicker. Converting to a letter
 * count against the current delay keeps one cadence at every text speed.
 */
const BLIP_FRAMES = 5;

export interface DialogueOptions {
  /** Speaker name shown in a tab above the box. */
  who?: string;
  /** Choice prompt shown after the last page. */
  choices?: string[];
  /** Called with the chosen index, or -1 if there were no choices. */
  onDone?: (choiceIndex: number) => void;
  /** Draw at the top instead, when the speaker is below the player. */
  top?: boolean;
}

function speakerHash(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export class DialogueScene implements Scene {
  readonly name = 'dialogue';
  readonly transparent = true;

  private pages: string[][] = [];
  private page = 0;
  private revealed = 0;
  private timer = 0;
  private done = false;
  private choosing = false;
  private choiceIndex = 0;
  /** Reveal index of the last voice blip, so the rhythm stays even. */
  private blipAt = 0;
  /** Blips so far on this page; walks the inflection table. */
  private blips = 0;
  /** Blips since the last full stop; drives the pitch fall across a sentence. */
  private phrase = 0;
  /** The speaker's timbre and base pitch, resolved from the name once. */
  private voice?: { id: string; pitch: number };
  /** Counts the box sliding up on open. */
  private open = 0;
  private ticks = 0;
  /** Hit rectangles for the choice buttons, captured at render. */
  private choiceRects: { x: number; y: number; w: number; h: number }[] = [];

  constructor(private lines: string[], private opts: DialogueOptions = {}) {}

  enter(game: Game): void {
    // Re-wrap the authored lines into pages that fit the box.
    const r = game.renderer;
    // Measured from the box, not from the screen: the box is inset by its
    // margin and its own frame, and the arrow lives inside that.
    const maxW = SCREEN_W - BOX_MARGIN * 2 - TEXT_X - ARROW_GUTTER;
    const wrapped: string[] = [];
    for (const line of this.lines) {
      // Resolved here rather than at the call site: every authored line in the
      // game reaches the box through this loop, and nothing else has to know
      // that {name} is a thing.
      for (const w of r.wrapText(resolveTokens(line), maxW)) wrapped.push(w);
    }
    this.pages = [];
    for (let i = 0; i < wrapped.length; i += MAX_LINES) {
      this.pages.push(wrapped.slice(i, i + MAX_LINES));
    }
    if (this.pages.length === 0) this.pages = [['']];
    audio.playSfx('menu_open', { volume: 0.5 });
    this.resetPage(game);
  }

  private resetPage(game: Game): void {
    this.revealed = textDelayFrames(game.settings.textSpeed) === 0 ? Infinity : 0;
    this.timer = 0;
    this.blipAt = 0;
    // A new page is a new breath: both the inflection walk and the pitch fall
    // start over rather than carrying on down from where the last page ended.
    this.blips = 0;
    this.phrase = 0;
  }

  private get pageText(): string {
    return (this.pages[this.page] ?? []).join('\n');
  }

  private get flat(): string {
    return this.pageText.replace(/\n/g, '');
  }

  private get fullyRevealed(): boolean {
    return this.revealed >= this.flat.length;
  }

  update(game: Game, _dt: number): void {
    this.ticks++;
    if (this.open < 8) this.open++;

    if (this.choosing) {
      this.updateChoice(game);
      return;
    }

    const delay = textDelayFrames(game.settings.textSpeed);
    if (!this.fullyRevealed) {
      this.timer--;
      if (this.timer <= 0) {
        this.revealed += delay === 0 ? 999 : 1;
        this.blip(delay);
        // Hold on punctuation. This is the whole difference between text that
        // arrives and text that is delivered.
        const justShown = this.flat[Math.floor(this.revealed) - 1] ?? '';
        this.timer = delay + (delay === 0 ? 0 : (PUNCT_HOLD[justShown] ?? 0));
      }
    }

    const advance = game.input.pressed('confirm') || game.input.mouse.leftPressed;
    if (advance) {
      if (!this.fullyRevealed) {
        // First press completes the page rather than skipping it.
        this.revealed = Infinity;
        return;
      }
      if (this.page < this.pages.length - 1) {
        this.page++;
        this.resetPage(game);
        audio.playSfx('page_turn', { volume: 0.8 });
        return;
      }
      if (this.opts.choices && this.opts.choices.length > 0) {
        this.choosing = true;
        this.choiceIndex = 0;
        return;
      }
      this.finish(game, -1);
    }

    // Cancel closes an ordinary message, but never an unanswered question.
    if (game.input.pressed('cancel') && !this.opts.choices) {
      if (this.fullyRevealed && this.page === this.pages.length - 1) this.finish(game, -1);
      else this.revealed = Infinity;
    }
  }

  private updateChoice(game: Game): void {
    const n = this.opts.choices!.length;
    if (navDown(game)) {
      this.choiceIndex = (this.choiceIndex + 1) % n;
      audio.playSfx('select');
    }
    if (navUp(game)) {
      this.choiceIndex = (this.choiceIndex - 1 + n) % n;
      audio.playSfx('select');
    }

    this.choiceRects.forEach((rect, i) => {
      if (!game.input.mouseOver(rect.x, rect.y, rect.w, rect.h)) return;
      if (game.input.mouse.idleFrames < 2 && this.choiceIndex !== i) {
        this.choiceIndex = i;
        audio.playSfx('select');
      }
      if (game.input.mouse.leftPressed) {
        this.choiceIndex = i;
        audio.playSfx('confirm');
        this.finish(game, i);
      }
    });

    if (game.input.pressed('confirm')) {
      audio.playSfx('confirm');
      this.finish(game, this.choiceIndex);
    }
  }

  /**
   * The speaker's fixed voice: which of the four timbres, and how far off the
   * written pitch it sits. Taken from the name, so a character sounds the same
   * in every scene they turn up in without anyone authoring it.
   */
  private speakerVoice(): { id: string; pitch: number } {
    if (this.voice) return this.voice;
    const who = this.opts.who;
    // A box with no nameplate is the game narrating rather than a person in the
    // room, so it gets the plain voice at its written pitch instead of being
    // assigned a character's.
    if (!who) return (this.voice = { id: 'talk', pitch: 1 });
    const h = speakerHash(who);
    return (this.voice = {
      id: VOICES[h % VOICES.length]!,
      pitch: Math.pow(2, (((h >> 3) % 7) - 3) / 12),
    });
  }

  /**
   * A voice blip every few characters. Every character is too busy and every
   * word is too sparse; roughly one blip every five frames is what reads as
   * speech.
   *
   * Three things keep that from being a metronome. Blips are pulled onto the
   * first letter of a word and accented there, because that is where a spoken
   * stress lands. The pitch walks a small table so no two in a row match. And
   * it drifts downward as a sentence runs on, resetting at the full stop --
   * speech really does this, and its absence is most of why an untreated text
   * box sounds like a typewriter.
   *
   * Called rather than `audio.playVoice` because the pitch is now two things
   * multiplied together, and only the box knows the second one.
   */
  private blip(delay: number): void {
    if (delay === 0) return;
    const text = this.flat;
    const i = Math.min(this.revealed, text.length) - 1;
    if (i < 0) return;
    const ch = text[i] ?? '';
    if (ch === ' ') return;

    // Delivery. A shout is a shout; a question lifts instead of being yelled,
    // which is the whole difference between "you did WHAT" and someone asking.
    if (ch === '!' || ch === '?') {
      audio.playSfx(ch === '!' ? 'talk_shout' : 'talk_ask', { pitch: this.speakerVoice().pitch });
      this.blipAt = this.revealed;
      this.phrase = 0;
      return;
    }
    // The rest of the punctuation is silent -- it is already being held on, and
    // a blip on the held frame lands on top of the pause it is meant to create.
    if (PUNCT_HOLD[ch] !== undefined) {
      if (ch === '.') this.phrase = 0;
      return;
    }

    // Go quiet on the letter before an exclamation. The mark is one frame away
    // and speaks for it; two attacks that close read as a stumble, and the gap
    // is what makes the shout land.
    const next = text[i + 1];
    if (next === '!' || next === '?') return;

    // A word opening is allowed to come one letter early, so short words each
    // get their own blip instead of being swallowed by an even count. The very
    // first letter of a page always speaks -- waiting out a gap there is a box
    // that opens its mouth late.
    const step = Math.ceil(BLIP_FRAMES / delay);
    const onset = i === 0 || text[i - 1] === ' ';
    const gap = onset ? Math.max(1, step - 1) : step;
    if (this.blipAt > 0 && this.revealed - this.blipAt < gap) return;
    this.blipAt = this.revealed;

    const v = this.speakerVoice();
    const cents = INFLECT[this.blips % INFLECT.length]!
      + (onset ? 22 : 0)
      - Math.min(this.phrase, DECLINE_BLIPS) * DECLINE;
    this.blips++;
    this.phrase++;
    audio.playSfx(v.id, {
      pitch: v.pitch * Math.pow(2, cents / 1200),
      // Word openings carry the stress and the letters after them lean back.
      volume: onset ? 1 : 0.82,
    });
  }

  private finish(game: Game, choice: number): void {
    if (this.done) return;
    this.done = true;
    game.scenes.pop();
    this.opts.onDone?.(choice);
  }

  render(game: Game, r: Renderer): void {
    // Slide up on open. Eight frames is short enough that a player mashing
    // through never feels held up, and long enough to read as a movement.
    const slide = Math.round((1 - this.open / 8) * 10);
    const y = (this.opts.top ? BOX_MARGIN : SCREEN_H - BOX_H - BOX_MARGIN) + slide;
    const x = BOX_MARGIN;
    const w = SCREEN_W - BOX_MARGIN * 2;

    r.window(x, y, w, BOX_H, {
      fill: '#f8fafe', border: '#283048', highlight: '#aab4cc',
    });

    if (this.opts.who) {
      const plate = PLATE_COLORS[speakerHash(this.opts.who) % PLATE_COLORS.length]!;
      // The plate is sized to the name, so a long one has to be shortened to
      // the box rather than allowed to run off the side of the screen.
      const who = fit(r, this.opts.who, w - 22);
      const nameW = r.textWidth(who) + 12;
      r.rect(x + 5, y - 10, nameW, 13, plate);
      r.outline(x + 5, y - 10, nameW, 13, '#283048');
      r.rect(x + 6, y - 9, nameW - 2, 1, 'rgba(255,255,255,0.42)');
      r.text(who, x + 11, y - 6, { color: '#ffffff', shadow: 'rgba(0,0,0,0.35)' });
    }

    const lines = this.pages[this.page] ?? [];
    let left = this.revealed;
    let ty = y + 8;
    for (const line of lines) {
      const visible = left === Infinity ? line : line.slice(0, Math.max(0, Math.floor(left)));
      r.text(visible, x + TEXT_X, ty, { color: '#28304a' });
      left = left === Infinity ? Infinity : left - line.length;
      ty += LINE_H;
      if (left !== Infinity && left <= 0) break;
    }

    if (this.choosing) this.renderChoices(r, y);
    else if (this.fullyRevealed) {
      // Bobbing advance arrow: the universal "there is more" signal.
      const bob = Math.floor(this.ticks / 16) % 2;
      r.text('>>', x + w - 13, y + BOX_H - 13 + bob, { color: '#5a6484' });
      if (this.page < this.pages.length - 1) {
        r.rect(x + w - 15, y + BOX_H - 5, 9, 1, '#aab4cc');
      }
    }
  }

  /**
   * Response buttons.
   *
   * Stacked above the box rather than inside it, so the question stays readable
   * while the player is choosing an answer -- putting the options over the text
   * that prompted them is the most common way this widget goes wrong.
   */
  private renderChoices(r: Renderer, boxY: number): void {
    const choices = this.opts.choices!;
    const rowH = 13;
    // 22 units is the cursor plus both insets; the panel is capped at the
    // screen so a wordy answer shortens rather than hanging off the edge.
    const maxCw = SCREEN_W - BOX_MARGIN * 2 - 2;
    let cw = 54;
    for (const c of choices) cw = Math.max(cw, Math.min(maxCw, r.textWidth(c) + 22));
    const h = choices.length * rowH + 6;
    const cx = SCREEN_W - cw - BOX_MARGIN - 2;
    const cy = boxY - h - 3;

    r.window(cx, cy, cw, h, { fill: '#f8fafe', border: '#283048', highlight: '#aab4cc' });

    this.choiceRects = [];
    choices.forEach((label, i) => {
      const ry = cy + 3 + i * rowH;
      const sel = i === this.choiceIndex;
      this.choiceRects.push({ x: cx + 2, y: ry, w: cw - 4, h: rowH });
      if (sel) {
        r.rect(cx + 3, ry, cw - 6, rowH - 1, '#d4e0f6');
        r.cursor(cx + 4, ry + 1, '#283048');
      }
      r.text(fit(r, label, cw - 20), cx + 14, ry + 2, { color: sel ? '#28304a' : '#4a5474' });
    });
  }
}

/** Convenience: queue a plain message. */
export function say(game: Game, lines: string[], opts: DialogueOptions = {}): void {
  game.scenes.push(new DialogueScene(lines, opts));
}

/** Convenience: yes/no question. `onDone` receives true for yes. */
export function ask(game: Game, lines: string[], onDone: (yes: boolean) => void, who?: string): void {
  game.scenes.push(new DialogueScene(lines, {
    who,
    choices: ['YES', 'NO'],
    onDone: (i) => onDone(i === 0),
  }));
}
