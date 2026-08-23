/**
 * Party screen.
 *
 * Six cards rather than a list: at a glance the player needs species, level, HP
 * and status for all six at once, and a list of names cannot give them that.
 * Doubles as a picker (for items and forced switches) via `pickMode`.
 *
 * Layout is a lead column plus a bench column, and every number below is a
 * measured position rather than an eyeballed one -- 240x160 has no slack, and
 * the previous pass lost the bottom of the lead card by two units because the
 * blocks were only ever added up approximately.
 *
 *   header   0..9
 *   lead     12..129   (x 3..90)
 *   bench    12..129   (x 95..236, five 22-tall cards on a 24 pitch)
 *   footer   132..155
 *
 * The two-unit gap above and below the card block is not spare room: the
 * selection ring is drawn outside a card's own outline and needs it.
 */

import type { Game } from '../core/game.js';
import type { Scene } from '../core/scene.js';
import { DETAIL, Renderer, SCREEN_H, SCREEN_W } from '../engine/renderer.js';
import { iconSprite, frontSprite } from '../gfx/kinsprite.js';
import { registry } from '../data/registry.js';
import { ListMenu } from '../ui/menu.js';
import { say } from '../ui/dialogue.js';
import { audio } from '../audio/audio.js';
import type { GameState } from '../systems/state.js';
import type { Kin } from '../systems/kin.js';
import { expForLevel } from '../battle/formulas.js';
import type { StatusId, TypeId } from '../data/schema.js';

/** The party can never hold more than this, so the screen never has to scroll. */
const SLOTS = 6;

const LEAD = { x: 3, y: 12, w: 88, h: 118 };
const BENCH = { x: 95, y: 12, w: 142, h: 22, pitch: 24 };
const FOOTER = { x: 3, y: 132, w: 234, h: 24 };

/** The bench icon well, in card-relative units. Source pixels are twice these. */
const WELL = { dx: 2, dy: 2, w: 30, h: 18 };

export class PartyScene implements Scene {
  readonly name = 'party';
  readonly transparent = true;

  private index = 0;
  private swapFrom = -1;
  private action: ListMenu<string> | null = null;
  private message = '';
  /** Seconds since entering, driving the selection pulse only. */
  private t = 0;

  constructor(
    private state: GameState,
    private pickMode: { prompt: string; onPick: (index: number) => void } | null = null,
  ) {}

  enter(): void {
    this.message = this.pickMode?.prompt ?? 'Choose a kin.';
    this.t = 0;
  }

  resume(): void {
    this.action = null;
  }

  private get party(): Kin[] {
    return this.state.party;
  }

  private cardRect(i: number): { x: number; y: number; w: number; h: number } {
    // The lead sits alone on the left with a full portrait; the other five
    // stack on the right, which makes "who is out front" unmissable.
    if (i === 0) return { ...LEAD };
    const row = Math.min(SLOTS - 2, i - 1);
    return { x: BENCH.x, y: BENCH.y + row * BENCH.pitch, w: BENCH.w, h: BENCH.h };
  }

  update(game: Game, dt: number): void {
    this.t += dt;

    if (this.action) {
      const res = this.action.update(game);
      if (res === 'cancel') { this.action = null; return; }
      if (res === 'select') {
        const choice = this.action.selectedValue;
        this.action = null;
        this.runAction(game, choice ?? '');
      }
      return;
    }

    const n = this.party.length;
    if (n === 0) { if (game.input.pressed('cancel')) game.scenes.pop(); return; }

    const before = this.index;

    // Pointer selection over the cards.
    for (let i = 0; i < n; i++) {
      const c = this.cardRect(i);
      if (game.input.mouseOver(c.x, c.y, c.w, c.h)) {
        if (game.input.mouse.idleFrames < 2) this.index = i;
        if (game.input.mouse.leftPressed) { this.index = i; this.confirm(game); return; }
      }
    }

    if (game.input.repeated('down')) this.index = (this.index + 1) % n;
    if (game.input.repeated('up')) this.index = (this.index - 1 + n) % n;
    // Left/right hop between the lead column and the bench column.
    if (game.input.pressed('left')) this.index = 0;
    if (game.input.pressed('right') && n > 1 && this.index === 0) this.index = 1;

    if (this.index !== before) audio.playSfx('select');

    if (game.input.pressed('confirm')) { this.confirm(game); return; }
    if (game.input.pressed('cancel') || game.input.pressed('party')) {
      audio.playSfx('cancel');
      if (this.swapFrom >= 0) { this.swapFrom = -1; this.message = 'Choose a kin.'; return; }
      game.scenes.pop();
    }
  }

  private confirm(game: Game): void {
    audio.playSfx('confirm');
    if (this.pickMode) {
      this.pickMode.onPick(this.index);
      game.scenes.pop();
      return;
    }
    if (this.swapFrom >= 0) {
      if (this.swapFrom !== this.index) {
        const a = this.party[this.swapFrom]!;
        this.party[this.swapFrom] = this.party[this.index]!;
        this.party[this.index] = a;
      }
      this.swapFrom = -1;
      this.message = 'Choose a kin.';
      return;
    }
    this.action = new ListMenu<string>([
      { label: 'SUMMARY', value: 'summary' },
      { label: 'SWITCH', value: 'switch', enabled: this.party.length > 1 },
      { label: 'MOVES', value: 'moves' },
      { label: 'CANCEL', value: 'cancel' },
    ], 4);
  }

  private runAction(game: Game, choice: string): void {
    const kin = this.party[this.index];
    if (!kin) return;
    switch (choice) {
      case 'summary':
        game.scenes.push(new SummaryScene(kin));
        break;
      case 'switch':
        this.swapFrom = this.index;
        this.message = 'Move it where?';
        break;
      case 'moves': {
        const lines = kin.moves.map((m) => {
          const md = registry.moves.get(m.id);
          return `${md?.name ?? m.id}  ${m.pp}/${m.maxPp}`;
        });
        say(game, [`${kin.name} knows:`, ...lines], { who: kin.name });
        break;
      }
    }
  }

  /* -------------------------------------------------------------- render */

  render(_game: Game, r: Renderer): void {
    r.image(backdrop(), 0, 0);
    this.renderHeader(r);

    for (let i = 0; i < SLOTS; i++) {
      const kin = this.party[i];
      if (kin) this.renderCard(r, i, kin);
      else this.renderEmpty(r, i);
    }

    this.renderFooter(r);

    if (this.action) {
      // A scrim under the popup: without it the menu floats over six busy cards
      // and the eye has nowhere to land.
      r.tint('#0a0e18', 0.42);
      const w = 74;
      const h = this.action.height({ rowHeight: 12 });
      this.action.render(r, SCREEN_W - w - 6, FOOTER.y - h - 3, w, { rowHeight: 12 });
    }
  }

  private renderHeader(r: Renderer): void {
    r.rect(0, 0, SCREEN_W, 10, '#212a43');
    r.pixel(0, 0, SCREEN_W * DETAIL, 1, '#414f76');
    r.rect(0, 9, SCREEN_W, 1, '#0e1322');
    r.text(this.pickMode ? 'CHOOSE' : 'PARTY', 5, 1, { color: '#f2f6ff', shadow: '#111726' });

    const total = this.party.length;
    const standing = this.party.filter((k) => !k.fainted).length;
    r.text(`${standing}/${total} STANDING`, SCREEN_W - 5, 1, {
      color: standing === 0 ? '#e07070' : '#9fb0d8', align: 'right',
    });
  }

  private renderFooter(r: Renderer): void {
    r.window(FOOTER.x, FOOTER.y, FOOTER.w, FOOTER.h);
    r.text(this.message, FOOTER.x + 7, FOOTER.y + 4, { color: '#282838' });

    const kin = this.party[this.index];
    let detail = '';
    if (kin) {
      if (kin.heldItem) detail = `Holding ${registry.itemName(kin.heldItem)}`;
      else if (kin.fainted) detail = 'Out cold -- it needs reviving.';
      else if (kin.nickname) detail = kin.speciesName;
      else detail = registry.abilities.get(kin.ability)?.name ?? '';
    }
    r.text(fit(r, detail, 150), FOOTER.x + 7, FOOTER.y + 13, { color: '#6a7490' });
    r.text(this.pickMode ? 'Enter pick   Esc cancel' : 'Enter options   Esc back',
      FOOTER.x + FOOTER.w - 7, FOOTER.y + 13, { color: '#8a93ab', align: 'right' });
  }

  private renderEmpty(r: Renderer, i: number): void {
    const c = this.cardRect(i);
    r.rect(c.x, c.y, c.w, c.h, 'rgba(16,21,36,0.30)');
    r.outline(c.x, c.y, c.w, c.h, '#4c5878');
    r.text('EMPTY', c.x + c.w / 2, c.y + (c.h - 7) / 2, { color: '#5d6a8c', align: 'center' });
  }

  private renderCard(r: Renderer, i: number, kin: Kin): void {
    const c = this.cardRect(i);
    const selected = i === this.index;
    const skin = skinFor(kin.types[0] ?? 'beast', selected, kin.fainted);

    // Shadow first, so neighbouring cards never paint over each other's lift.
    r.rect(c.x + 2, c.y + c.h, c.w - 2, 2, 'rgba(8,11,20,0.38)');
    r.rect(c.x + c.w, c.y + 2, 2, c.h - 2, 'rgba(8,11,20,0.38)');

    r.rect(c.x, c.y, c.w, c.h, skin.edge);
    r.rect(c.x + 1, c.y + 1, c.w - 2, c.h - 2, skin.bevel);
    r.rect(c.x + 2, c.y + 2, c.w - 4, c.h - 4, skin.fill);
    r.pixel((c.x + 2) * DETAIL, (c.y + 2) * DETAIL, (c.w - 4) * DETAIL, 1, 'rgba(255,255,255,0.55)');

    if (i === 0) this.renderLead(r, c, kin, skin);
    else this.renderBench(r, c, kin, skin);

    if (kin.fainted) r.rect(c.x + 2, c.y + 2, c.w - 4, c.h - 4, 'rgba(22,27,44,0.28)');

    if (i === this.swapFrom) this.ring(r, c, '#f0b040', '#ffe0a0');
    if (selected) {
      const pulse = 0.5 + 0.5 * Math.sin(this.t * 7);
      this.ring(r, c, mix('#ffcf5a', '#fff6d8', pulse), '#ffffff');
      // A solid tab down the inside edge: the ring alone reads as a hover, the
      // tab reads as "this is the one the buttons act on".
      r.rect(c.x + 2, c.y + 2, 2, c.h - 4, mix('#ffcf5a', '#fff6d8', pulse));
    }
  }

  /** Two-unit selection ring drawn outside the card's own outline. */
  private ring(r: Renderer, c: { x: number; y: number; w: number; h: number },
    outer: string, inner: string): void {
    r.outline(c.x - 2, c.y - 2, c.w + 4, c.h + 4, outer);
    r.outline(c.x - 1, c.y - 1, c.w + 2, c.h + 2, inner);
  }

  private renderLead(r: Renderer, c: { x: number; y: number; w: number; h: number },
    kin: Kin, skin: Skin): void {
    // Name band. Text on a saturated strip rather than floating on the card
    // face -- the reference never sets a name straight onto the body colour.
    r.rect(c.x + 2, c.y + 2, c.w - 4, 13, skin.band);
    r.pixel((c.x + 2) * DETAIL, (c.y + 2) * DETAIL, (c.w - 4) * DETAIL, 1, skin.bandLip);
    r.rect(c.x + 2, c.y + 14, c.w - 4, 1, skin.edge);
    r.text(fit(r, kin.name, 66), c.x + 5, c.y + 4, { color: '#ffffff', shadow: 'rgba(10,14,24,0.55)' });
    genderMark(r, kin, c.x + c.w - 3, c.y + 4);

    // Contact shadow under the portrait, so the creature stands on the card.
    r.ellipsePixel((c.x + c.w / 2) * DETAIL, (c.y + 76) * DETAIL, 26 * DETAIL, 3 * DETAIL,
      'rgba(20,26,42,0.22)');
    r.image(frontSprite(kin.species), c.x + (c.w - 64) / 2, c.y + 16,
      0, 0, undefined, undefined, false, false, kin.fainted ? 0.45 : 1);

    // Level row.
    r.text(`Lv${kin.level}`, c.x + 5, c.y + 81, { color: skin.ink });
    const chip = chipFor(kin);
    if (chip) this.chip(r, c.x + c.w - 24, c.y + 80, chip);

    // A recessed panel for the vitals: dark ground, light numbers, hard frame.
    const py = c.y + 90;
    r.rect(c.x + 3, py, c.w - 6, 17, skin.panel);
    r.outline(c.x + 3, py, c.w - 6, 17, skin.edge);
    r.pixel((c.x + 4) * DETAIL, (py + 1) * DETAIL, (c.w - 8) * DETAIL, 1, 'rgba(8,11,20,0.45)');
    r.text('HP', c.x + 6, py + 2, { color: '#a9b6d4' });
    r.text(`${kin.currentHp}/${kin.maxHp}`, c.x + c.w - 6, py + 2, {
      color: kin.fainted ? '#e08080' : '#f2f6ff', align: 'right',
    });
    hpBar(r, c.x + 6, py + 10, c.w - 12, 6, kin);

    // Bottom row: whatever it carries, or how far it is from the next level.
    const by = c.y + 108;
    if (kin.heldItem) {
      itemBadge(r, c.x + 3, by);
      r.text(fit(r, registry.itemName(kin.heldItem), 66), c.x + 14, by + 1, { color: skin.ink });
    } else {
      r.text('EXP', c.x + 5, by + 1, { color: skin.inkSoft });
      r.rect(c.x + 23, by + 3, c.w - 28, 4, '#2b3348');
      // r.rect floors up to one buffer pixel, so an empty bar has to be skipped
      // rather than drawn at width zero.
      const filled = Math.round((c.w - 30) * expFraction(kin));
      if (filled > 0) r.rect(c.x + 24, by + 4, filled, 2, '#68b8e8');
      r.outline(c.x + 23, by + 3, c.w - 28, 4, skin.edge);
    }
  }

  private renderBench(r: Renderer, c: { x: number; y: number; w: number; h: number },
    kin: Kin, skin: Skin): void {
    // Icon well. Recessing the portrait is what stops the row reading as a
    // line of text with a picture loosely stuck to the front of it.
    const wx = c.x + WELL.dx, wy = c.y + WELL.dy;
    r.rect(wx, wy, WELL.w, WELL.h, skin.well);
    r.pixel(wx * DETAIL, wy * DETAIL, WELL.w * DETAIL, 1, 'rgba(8,11,20,0.40)');

    const crop = iconCrop(kin.species, WELL.w * DETAIL, WELL.h * DETAIL);
    r.image(iconSprite(kin.species), wx, wy, crop.sx, crop.sy, WELL.w * DETAIL, WELL.h * DETAIL,
      false, false, kin.fainted ? 0.45 : 1);
    r.outline(wx, wy, WELL.w, WELL.h, skin.edge);
    r.rect(wx + WELL.w + 1, wy, 1, WELL.h, skin.rule);

    if (kin.heldItem) itemBadge(r, wx + WELL.w - 9, wy + 1);
    const chip = chipFor(kin);
    if (chip) this.chip(r, wx, wy + WELL.h - 9, chip);

    const tx = wx + WELL.w + 4;
    const right = c.x + c.w - 4;
    const name = fit(r, kin.name, 56);
    r.text(name, tx, c.y + 3, { color: skin.ink });
    genderMark(r, kin, tx + r.textWidth(name) + 8, c.y + 3);
    r.text(`Lv${kin.level}`, right, c.y + 3, { color: skin.ink, align: 'right' });

    hpBar(r, tx, c.y + 12, 56, 7, kin);
    r.text(`${kin.currentHp}/${kin.maxHp}`, right, c.y + 12, {
      color: kin.fainted ? '#a8506a' : skin.ink, align: 'right',
    });
  }

  private chip(r: Renderer, x: number, y: number, chip: { label: string; color: string }): void {
    r.rect(x, y, 21, 9, chip.color);
    r.pixel(x * DETAIL, y * DETAIL, 21 * DETAIL, 1, 'rgba(255,255,255,0.45)');
    r.outline(x, y, 21, 9, '#161b2b');
    r.text(chip.label, x + 10, y + 1, { color: '#ffffff', align: 'center' });
  }
}

/* ------------------------------------------------------------ card parts */

function hpBar(r: Renderer, x: number, y: number, w: number, h: number, kin: Kin): void {
  const frac = kin.hpFraction;
  const fill = frac > 0.5 ? '#48c860' : frac > 0.2 ? '#efc63c' : '#e05050';
  r.meter(x, y, w, h, frac, fill, '#2b3348', '#161b2b');
}

function expFraction(kin: Kin): number {
  const base = expForLevel(kin.growthRate, kin.level);
  const next = expForLevel(kin.growthRate, Math.min(100, kin.level + 1));
  if (next <= base) return 1;
  return Math.max(0, Math.min(1, (kin.exp - base) / (next - base)));
}

function genderMark(r: Renderer, kin: Kin, rightX: number, y: number): void {
  if (kin.gender === 'none') return;
  r.text(kin.gender === 'female' ? 'oF' : 'oM', rightX, y, {
    color: kin.gender === 'female' ? '#e07aa0' : '#6aa8f0', align: 'right',
  });
}

/** A carried-item marker: a satchel, not a coloured dot nobody can name. */
function itemBadge(r: Renderer, x: number, y: number): void {
  r.rect(x, y, 8, 8, '#c08a2e');
  r.rect(x + 1, y + 3, 6, 4, '#f0cc72');
  r.rect(x + 2, y + 1, 4, 2, '#8c6420');
  r.outline(x, y, 8, 8, '#161b2b');
}

function chipFor(kin: Kin): { label: string; color: string } | undefined {
  if (kin.fainted) return { label: 'FNT', color: '#7a8298' };
  if (kin.status === 'none') return undefined;
  return STATUS_CHIP[kin.status];
}

/** Truncate rather than wrap: a card row has one line and no more. */
function fit(r: Renderer, text: string, maxWidth: number): string {
  if (r.textWidth(text) <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && r.textWidth(`${out}.`) > maxWidth) out = out.slice(0, -1);
  return `${out}.`;
}

const STATUS_CHIP: Partial<Record<StatusId, { label: string; color: string }>> = {
  burn: { label: 'BRN', color: '#e06a3a' },
  freeze: { label: 'FRZ', color: '#4aa8d8' },
  paralysis: { label: 'PAR', color: '#c8a828' },
  poison: { label: 'PSN', color: '#a05ab0' },
  toxic: { label: 'TOX', color: '#8040a0' },
  sleep: { label: 'SLP', color: '#7c86a0' },
};

/* ------------------------------------------------------------- card skin */

interface Skin {
  edge: string; bevel: string; fill: string; band: string; bandLip: string;
  well: string; panel: string; rule: string; ink: string; inkSoft: string;
}

const SKINS = new Map<string, Skin>();

/**
 * A card is tinted by its type, not painted in it. The fill is 80% paper, which
 * is enough to tell a Flame card from a Tide one across the screen and still
 * leaves near-black text sitting comfortably on top; the saturated version of
 * the colour is spent on the name band and the well, where nothing has to be
 * read through it.
 */
function skinFor(type: TypeId, selected: boolean, fainted: boolean): Skin {
  const key = `${type}|${selected ? 1 : 0}|${fainted ? 1 : 0}`;
  const hit = SKINS.get(key);
  if (hit) return hit;

  const typed = registry.typeChart?.meta?.[type]?.color;
  let base = typed ?? '#8892a8';
  if (fainted) base = drain(base, 0.8);

  const skin: Skin = {
    edge: '#161b2b',
    bevel: mix(base, '#ffffff', selected ? 0.72 : 0.58),
    fill: mix(base, '#eef2fa', selected ? 0.88 : 0.80),
    band: mix(base, '#101625', selected ? 0.16 : 0.30),
    bandLip: mix(base, '#ffffff', 0.55),
    well: mix(base, '#39415c', 0.62),
    panel: mix(base, '#252c40', 0.74),
    rule: mix(base, '#7d879f', 0.55),
    ink: fainted ? '#5c6478' : '#22283a',
    inkSoft: fainted ? '#7a8296' : '#5a6178',
  };
  // Only memoise a skin built from a real type colour. The scene can in
  // principle draw one frame before the type chart has landed, and caching the
  // grey fallback would strand every card in it for the rest of the session.
  if (typed) SKINS.set(key, skin);
  return skin;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? `${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}` : h;
  const n = Number.parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex(r: number, g: number, b: number): string {
  const c = (v: number): string => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** `t` is how much of `b` ends up in the result. */
function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return toHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
}

/** Pull a colour toward its own luminance; a fainted card keeps its shape but
 *  loses its identity, which is exactly how it should read. */
function drain(hex: string, t: number): string {
  const [r, g, b] = hexToRgb(hex);
  const l = 0.3 * r + 0.59 * g + 0.11 * b;
  return toHex(r + (l - r) * t, g + (l - g) * t, b + (l - b) * t);
}

/* ------------------------------------------------------------- icon crop */

const CROPS = new Map<string, { sx: number; sy: number }>();

/**
 * The renderer blits source pixels 1:1, so an icon cannot be scaled into the
 * well -- it has to be cropped. Cropping the centre of the 64x64 cell beheaded
 * anything tall and cut the legs off anything short, because the generator does
 * not place every body plan at the same height. Finding the real ink bounds and
 * framing those keeps the animal in the window whatever shape it is.
 */
function iconCrop(speciesId: string, sw: number, sh: number): { sx: number; sy: number } {
  const key = `${speciesId}|${sw}x${sh}`;
  const hit = CROPS.get(key);
  if (hit) return hit;

  const cv = iconSprite(speciesId);
  const d = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data;
  let minX = cv.width, minY = cv.height, maxX = -1, maxY = -1;
  for (let y = 0; y < cv.height; y++) {
    for (let x = 0; x < cv.width; x++) {
      if (d[(y * cv.width + x) * 4 + 3]! < 24) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  let sx = 0, sy = 0;
  if (maxX >= 0) {
    sx = Math.round((minX + maxX + 1 - sw) / 2);
    // When the creature is taller than the window, favour the top of it: a
    // face is worth more than a pair of feet.
    const tall = maxY - minY + 1;
    sy = tall > sh ? Math.round(minY + (tall - sh) * 0.3) : Math.round((minY + maxY + 1 - sh) / 2);
  }
  const crop = {
    sx: Math.max(0, Math.min(cv.width - sw, sx)),
    sy: Math.max(0, Math.min(cv.height - sh, sy)),
  };
  CROPS.set(key, crop);
  return crop;
}

/* -------------------------------------------------------------- backdrop */

let backdropCanvas: HTMLCanvasElement | null = null;

/**
 * Built once and blitted, not redrawn. The diagonal ruling is ~40 lines of
 * 320 pixels; drawing it per frame cost more than everything else on the
 * screen put together and bought nothing, because it never changes.
 */
function backdrop(): HTMLCanvasElement {
  if (backdropCanvas) return backdropCanvas;

  const w = SCREEN_W * DETAIL, h = SCREEN_H * DETAIL;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const cx = cv.getContext('2d')!;
  cx.imageSmoothingEnabled = false;

  for (let y = 0; y < h; y++) {
    cx.fillStyle = mix('#3b4670', '#252c48', y / h);
    cx.fillRect(0, y, w, 1);
  }

  // Diagonal ruling, two buffer pixels wide on a 24-pixel pitch.
  cx.fillStyle = 'rgba(255,255,255,0.045)';
  for (let i = -h; i < w; i += 24) {
    for (let y = 0; y < h; y++) cx.fillRect(i + y, y, 2, 1);
  }

  // Vignette, banded rather than smooth so it stays inside the palette.
  for (let step = 0; step < 5; step++) {
    cx.fillStyle = 'rgba(10,14,26,0.055)';
    cx.fillRect(0, 0, w, 2 + step * 2);
    cx.fillRect(0, h - 2 - step * 2, w, 2 + step * 2);
    cx.fillRect(0, 0, 2 + step * 2, h);
    cx.fillRect(w - 2 - step * 2, 0, 2 + step * 2, h);
  }

  backdropCanvas = cv;
  return cv;
}

/* ------------------------------------------------------------ summary */

export class SummaryScene implements Scene {
  readonly name = 'summary';
  private page = 0;

  constructor(private kin: Kin) {}

  update(game: Game, _dt: number): void {
    if (game.input.pressed('cancel')) { game.scenes.pop(); return; }
    if (game.input.pressed('right') || game.input.pressed('nextTab')) this.page = (this.page + 1) % 3;
    if (game.input.pressed('left') || game.input.pressed('prevTab')) this.page = (this.page + 2) % 3;
    if (game.input.mouse.wheel !== 0) this.page = (this.page + (game.input.mouse.wheel > 0 ? 1 : 2)) % 3;
  }

  render(_game: Game, r: Renderer): void {
    const k = this.kin;
    const sp = k.data;
    r.clear('#2f3a58');

    r.window(2, 2, 84, 92, { fill: '#e8eefa' });
    r.image(frontSprite(k.species), 10, 8);
    r.text(k.name, 6, 74, { color: '#282838' });
    r.text(`Lv${k.level}`, 6, 84, { color: '#282838' });
    if (k.gender !== 'none') {
      r.text(k.gender === 'female' ? 'oF' : 'oM', 78, 84, {
        color: k.gender === 'female' ? '#c05a80' : '#5a80c0', align: 'right',
      });
    }

    // Type chips.
    let tx = 90;
    for (const t of k.types) {
      const meta = registry.typeChart?.meta?.[t];
      r.rect(tx, 6, 44, 10, meta?.color ?? '#888');
      r.outline(tx, 6, 44, 10, '#282838');
      r.text((meta?.name ?? t).toUpperCase(), tx + 4, 7, { color: '#ffffff' });
      tx += 48;
    }

    r.window(88, 20, SCREEN_W - 92, 74, { fill: '#e8eefa' });

    if (this.page === 0) this.renderStats(r);
    else if (this.page === 1) this.renderMoves(r);
    else this.renderVellum(r, sp?.vellumEntry ?? '');

    r.window(2, SCREEN_H - 24, SCREEN_W - 4, 20);
    const tabs = ['STATS', 'MOVES', 'RECORD'];
    tabs.forEach((t, i) => {
      r.text(t, 12 + i * 52, SCREEN_H - 18, { color: i === this.page ? '#282838' : '#9aa4bc' });
    });
    r.text('Esc back', SCREEN_W - 10, SCREEN_H - 18, { color: '#6a7490', align: 'right' });
  }

  private renderStats(r: Renderer): void {
    const k = this.kin;
    const rows: [string, number][] = [
      ['HP', k.maxHp], ['ATTACK', k.atk], ['DEFENCE', k.def],
      ['SP.ATK', k.spa], ['SP.DEF', k.spd], ['SPEED', k.spe],
    ];
    rows.forEach(([label, value], i) => {
      const y = 26 + i * 10;
      r.text(label, 94, y, { color: '#3a4258' });
      r.text(String(value), SCREEN_W - 10, y, { color: '#282838', align: 'right' });
      // A bar behind the number turns six numbers into a readable shape.
      const frac = Math.min(1, value / 200);
      r.rect(140, y + 2, Math.round(frac * 52), 3, '#7f9ad0');
    });
    const nature = registry.natures.find((n) => n.id === k.nature);
    r.text(`${nature?.name ?? k.nature} nature`, 94, 86, { color: '#6a7490' });
  }

  private renderMoves(r: Renderer): void {
    const k = this.kin;
    k.moves.forEach((slot, i) => {
      const md = registry.moves.get(slot.id);
      const y = 26 + i * 16;
      const meta = md ? registry.typeChart?.meta?.[md.type] : undefined;
      r.rect(94, y, 8, 8, meta?.color ?? '#888');
      r.outline(94, y, 8, 8, '#282838');
      r.text(md?.name ?? slot.id, 106, y, { color: '#282838' });
      r.text(`${slot.pp}/${slot.maxPp}`, SCREEN_W - 10, y, { color: '#485068', align: 'right' });
      if (md) r.text(md.description, 106, y + 8, { color: '#7a8398', maxWidth: 122 });
    });
  }

  private renderVellum(r: Renderer, entry: string): void {
    const k = this.kin;
    const sp = k.data;
    r.text(`No. ${String(sp?.num ?? 0).padStart(3, '0')}`, 94, 26, { color: '#485068' });
    r.text(sp?.category ?? '', 94, 36, { color: '#3a4258' });
    r.text(`${sp?.height ?? 0}m   ${sp?.weight ?? 0}kg`, 94, 46, { color: '#485068' });
    r.text(entry, 94, 58, { color: '#282838', maxWidth: SCREEN_W - 104, lineHeight: 9 });
    const next = expForLevel(k.growthRate, Math.min(100, k.level + 1)) - k.exp;
    r.text(k.level >= 100 ? 'At its peak.' : `${next} EXP to next level`, 94, 86, { color: '#6a7490' });
  }
}
