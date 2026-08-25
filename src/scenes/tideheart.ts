/**
 * The Tideheart, held up and looked at.
 *
 * The single most important object in the game, so it gets a screen of its own
 * rather than a line of description text in a bag row. Three things had to be
 * true of it:
 *
 *   IT IS A DRAWING, NOT A PARAGRAPH. Canon describes a deep blue-turquoise
 *   core in an ancient metal frame, circles and spirals cut into it, and
 *   something moving inside like liquid or light. All of that is drawn here,
 *   in buffer pixels on a 2-pixel block grid so it sits on the same grid as
 *   every other piece of art in the game, and all of it MOVES -- the spiral
 *   turns, motes drift on their own orbits, the frame catches a highlight.
 *   Half machine, half not: the frame is struck metal with tool marks and the
 *   inside obeys nothing.
 *
 *   IT IS AN INSTRUMENT. The right-hand panel is a reading, not a caption. It
 *   says what the object is doing, and when it can feel an Aurelian site it
 *   says which way and how strongly -- a needle marches out of the frame
 *   toward the source and the core races. Nothing in the game tells the player
 *   that this is happening; the object simply behaves differently, and the
 *   same difference is visible in the bag row, in the item description, and in
 *   the cue that plays when they walk into the place. See systems/tideheart.ts.
 *
 *   IT IS A RECORD. Every Aurelian site it has woken leaves an echo, and the
 *   echoes are re-readable here forever. That is where the Aurelians, the
 *   Deluge and eventually Elias' own last message accumulate, which is what
 *   makes coming back to this screen worth doing rather than a one-time look.
 *
 * The object never moves between pages. Whatever the panel is doing, the thing
 * itself sits in the same place at the same size, because it is the subject and
 * the panel is the annotation.
 */

import type { Game } from '../core/game.js';
import type { Scene } from '../core/scene.js';
import { DETAIL, Renderer, SCREEN_H, SCREEN_W } from '../engine/renderer.js';
import { ListMenu, type MenuItem } from '../ui/menu.js';
import { inside, para, LINE_TIGHT } from '../ui/layout.js';
import { audio } from '../audio/audio.js';
import {
  readTideheart, siteById, TIDEHEART_DETAIL,
  type AurelianSite, type TideheartReading,
} from '../systems/tideheart.js';
import type { GameState } from '../systems/state.js';

type Page = 'reading' | 'echoes';

/**
 * The object's own column, and the budget everything drawn in it lives inside.
 *
 * Anchored left so a wider session view gives the panel the extra width rather
 * than pushing the object off centre. The radius is 36 rather than as large as
 * it will go, and that is measured: the needle has to leave the frame and
 * still be inside the column, the halo goes out to 1.27 radii and the travelling
 * ring to 1.40, and the far end of the needle at 50 units from the centre lands
 * at 105 with the panel starting at 110. Grow the object and the arrow that
 * says where to walk is the thing that gets painted over.
 */
const ART = { cx: 55, cy: 76, r: 36 };
const PANEL_X = 110;

export class TideheartScene implements Scene {
  readonly name = 'tideheart';
  readonly transparent = false;

  private t = 0;
  private page: Page = 'reading';
  private menu = new ListMenu<string>([], 6);
  /** Non-null while an echo is being played back. */
  private playing: { site: AurelianSite; line: number } | null = null;
  private reading!: TideheartReading;

  constructor(private state: GameState) {}

  enter(): void {
    this.reading = readTideheart(this.state);
    this.rebuild();
    audio.playSfx('menu_open');
  }

  private rebuild(): void {
    const items: MenuItem<string>[] = this.reading.echoes.map((s) => ({
      label: s.echo.title,
      value: s.id,
    }));
    if (items.length === 0) {
      items.push({ label: 'Nothing yet.', value: '', enabled: false });
    }
    this.menu.setItems(items, true);
    this.menu.fitTo(SCREEN_H - 28 - 6 - 22, { rowHeight: 12 });
  }

  update(game: Game, _dt: number): void {
    this.t++;
    // The reading is live: the player can open this from the bag while
    // standing in front of a ruin, and walking two tiles closer between one
    // look and the next has to show.
    this.reading = readTideheart(this.state);

    if (this.playing) {
      if (game.input.pressed('cancel')) { this.playing = null; return; }
      if (game.input.pressed('confirm')) {
        this.playing.line++;
        if (this.playing.line >= this.playing.site.echo.lines.length) this.playing = null;
        else audio.playSfx('page_turn', { pitch: 0.7, volume: 0.7 });
      }
      return;
    }

    if (game.input.pressed('cancel') || game.input.pressed('bag')) { game.scenes.pop(); return; }

    if (game.input.pressed('nextTab') || game.input.pressed('prevTab')) {
      this.page = this.page === 'reading' ? 'echoes' : 'reading';
      this.rebuild();
      audio.playSfx('tab');
      return;
    }

    if (this.page !== 'echoes') return;

    const res = this.menu.update(game);
    if (res !== 'select') return;
    const id = this.menu.selectedValue;
    const site = id ? siteById(id) : null;
    if (!site) return;
    this.playing = { site, line: 0 };
    audio.playSfx('heal_cycle', { pitch: 0.6, volume: 0.5 });
  }

  /* ---------------------------------------------------------------- draw */

  render(_game: Game, r: Renderer): void {
    this.drawBackground(r);

    // Playback drives the object as hard as a stirring does -- it is doing
    // something, and it should look like it. A site already answered keeps the
    // reduced intensity the reading gives it, so standing in the Arch after
    // opening it is not the same picture as standing in a field.
    const glow = this.playing
      ? 1
      : this.reading.stirring ? 0.45 + this.reading.intensity * 0.55
        : this.reading.intensity;
    drawTideheart(r, ART.cx, ART.cy, ART.r, this.t, glow, this.reading.held);

    if (this.reading.needle && !this.playing) {
      drawNeedle(r, ART.cx, ART.cy, ART.r, this.reading.needle, this.t, this.reading.intensity);
    }

    const panelW = SCREEN_W - 6 - PANEL_X;
    const panelH = SCREEN_H - 28 - 6;
    r.window(PANEL_X, 6, panelW, panelH);
    const box = inside(PANEL_X, 6, panelW, panelH, 3);

    if (this.playing) this.renderPlayback(r, box);
    else if (this.page === 'echoes') this.renderEchoes(r, box);
    else this.renderReading(r, box);

    this.renderFooter(r);
  }

  private drawBackground(r: Renderer): void {
    r.clear('#08161f');
    for (let y = 0; y < SCREEN_H; y += 4) r.rect(0, y, SCREEN_W, 1, '#0b1c28');
    // Three slow bands, like light on the underside of water. They drift at
    // different speeds so the background never repeats on a short loop, and
    // they are barely there on purpose -- the object is what is lit.
    for (let i = 0; i < 3; i++) {
      const y = ((this.t * (0.09 + i * 0.05) + i * 57) % (SCREEN_H + 40)) - 20;
      r.rect(0, Math.floor(y), SCREEN_W, 2, 'rgba(70,170,190,0.05)');
      r.rect(0, Math.floor(y) + 3, SCREEN_W, 1, 'rgba(70,170,190,0.035)');
    }
  }

  private renderReading(r: Renderer, box: { x: number; y: number; w: number; h: number }): void {
    let y = box.y;
    r.text(this.reading.label, box.x, y, { color: '#1b2a3a' });
    y += 10;
    r.rect(box.x, y, box.w, 1, '#b8c6d8');
    y += 5;

    // Everything above the dial, and not one line into it.
    const floor = box.y + box.h - 36;

    y += para(r, this.reading.reading, { x: box.x, y, w: box.w, h: floor - y },
      { color: '#2a3a4e', lineHeight: LINE_TIGHT });
    y += 5;

    const pull = this.reading.bearing === 'here'
      ? 'It is straining. Whatever it wants is right here.'
      : this.reading.bearing ? `It pulls to the ${this.reading.bearing}.`
        : null;
    if (pull) {
      y += para(r, pull, { x: box.x, y, w: box.w, h: floor - y },
        { color: '#1b6d80', lineHeight: LINE_TIGHT });
      y += 3;
    }
    if (this.reading.stirring) y += this.renderStrength(r, box.x, Math.min(y, floor - 6), box.w);

    // What it is, under what it is doing, and only when the panel has the room
    // -- which is when it is calm, and calm is when somebody is reading this
    // out of curiosity rather than for directions.
    if (this.reading.held && floor - y > 30) {
      para(r, TIDEHEART_DETAIL, { x: box.x, y: y + 3, w: box.w, h: floor - y - 3 },
        { color: '#7a8698', lineHeight: LINE_TIGHT });
    }

    this.renderDial(r, box);
  }

  /**
   * The instrument's own three numbers, pinned to the foot of the panel.
   *
   * Here because the sentence above them changes length and they must not
   * move: a reading you have to hunt for is not a reading. They also stop the
   * panel being a white rectangle with two lines at the top of it, which is
   * what it was before -- the object is doing something and the annotation
   * beside it should look like it is measuring that.
   */
  private renderDial(r: Renderer, box: { x: number; y: number; w: number; h: number }): void {
    const rows: [string, string, string][] = [
      ['STATE', this.reading.stirring ? 'responding'
        : this.reading.site ? 'settled'
          : this.reading.echoes.length ? 'carried' : 'quiet',
      this.reading.stirring ? '#1b6d80' : '#2a3a4e'],
      ['SOURCE', this.reading.bearing ?? '--',
        this.reading.bearing ? '#1b6d80' : '#2a3a4e'],
      ['ECHOES', String(this.reading.echoes.length), '#2a3a4e'],
    ];
    const bottom = box.y + box.h;
    r.rect(box.x, bottom - 32, box.w, 1, '#d4dce8');
    rows.forEach(([label, value, color], i) => {
      const y = bottom - 25 + i * 9;
      r.text(label, box.x, y, { color: '#8894a6' });
      r.text(value, box.x + box.w, y, { color, align: 'right' });
    });
  }

  /** A short bar. The number is meaningless; the movement is the point. */
  private renderStrength(r: Renderer, x: number, y: number, w: number): number {
    const bw = Math.min(w, 72);
    r.rect(x, y, bw, 5, '#c4d0dc');
    const lit = Math.max(1, Math.round(bw * this.reading.intensity));
    // Breathing, so a held reading is never a dead rectangle.
    const pulse = 1 + Math.sin(this.t * 0.11) * 0.03;
    r.rect(x, y, Math.min(bw, Math.round(lit * pulse)), 5, '#2fa8bd');
    r.rect(x, y, bw, 1, '#96a6b8');
    return 9;
  }

  private renderEchoes(r: Renderer, box: { x: number; y: number; w: number; h: number }): void {
    r.text('ECHOES', box.x, box.y, { color: '#1b2a3a' });
    r.rect(box.x, box.y + 10, box.w, 1, '#b8c6d8');
    this.menu.render(r, box.x - 2, box.y + 15, box.w + 4,
      { rowHeight: 12, frame: false, color: '#2a3a4e', highlightBar: true, barColor: '#cfe0e6' });
    if (this.reading.echoes.length === 0) {
      para(r, 'It has not answered anything yet.',
        { x: box.x, y: box.y + box.h - 20, w: box.w, h: 20 },
        { color: '#6a7a8e', lineHeight: LINE_TIGHT });
    }
  }

  private renderPlayback(r: Renderer, box: { x: number; y: number; w: number; h: number }): void {
    const p = this.playing!;
    r.text(p.site.echo.title, box.x, box.y, { color: '#1b2a3a' });
    r.rect(box.x, box.y + 10, box.w, 1, '#b8c6d8');
    para(r, p.site.echo.lines[p.line] ?? '',
      { x: box.x, y: box.y + 15, w: box.w, h: box.h - 24 },
      { color: '#2a3a4e', lineHeight: LINE_TIGHT });
    // The advance mark blinks rather than sitting there, which is how every
    // other paged text in the game says "there is more".
    if (Math.floor(this.t / 20) % 2 === 0) {
      r.text('>>', box.x + box.w, box.y + box.h - 7, { color: '#2fa8bd', align: 'right' });
    }
  }

  private renderFooter(r: Renderer): void {
    const y = SCREEN_H - 20;
    r.window(6, y, SCREEN_W - 12, 16);
    const hint = this.playing
      ? 'Enter more   Esc stop'
      : this.page === 'reading'
        ? 'X echoes   Esc back'
        : 'Enter play   X reading   Esc back';
    r.text(hint, 12, y + 5, { color: '#6a7490' });
    const right = this.reading.site && !this.reading.answered ? 'RESPONDING' : '';
    if (right) {
      r.text(right, SCREEN_W - 12, y + 5,
        { color: Math.floor(this.t / 24) % 2 === 0 ? '#1b6d80' : '#5aa8b8', align: 'right' });
    }
  }
}

/* ------------------------------------------------------------- the object */

/**
 * The Tideheart itself.
 *
 * Drawn in buffer pixels in 2x2 blocks, which is the same grid the item icons
 * and the creature sprites are authored on -- a smooth circle here would be
 * the one round thing in the game and would read as a mistake. Everything is
 * computed from the radius, so the same routine draws it at any size a later
 * screen wants.
 *
 * `glow` is 0 for an object at rest and 1 for one that is answering something.
 * It moves the palette, the speed of the spiral, the size of the halo and
 * whether there is a pulse at all, so the two states are not the same picture
 * with a brighter tint -- the quiet one is genuinely slow.
 */
/** Rim to centre. The awake ramp is not the calm one brightened -- it is a
 *  different, greener water, so the two states read apart at a glance. */
const CORE_CALM = ['#07222e', '#0d3a4e', '#166a86', '#2596ac', '#43bcc8'] as const;
const CORE_HOT = ['#0a3040', '#12556a', '#1f8ea0', '#3dbcc4', '#7ae4dc'] as const;
const ARM_CALM = ['#1f7f9a', '#4fc4d2', '#8fe8ec'] as const;
const ARM_HOT = ['#3ba8b8', '#86e4e8', '#d8ffff'] as const;

export function drawTideheart(
  r: Renderer, cx: number, cy: number, radius: number,
  t: number, glow: number, held = true,
): void {
  const CXP = cx * DETAIL;
  const CYP = cy * DETAIL;
  const R = radius * DETAIL;
  const g = Math.max(0, Math.min(1, glow));

  // Speeds. The core turns three times as fast when it is answering, and the
  // frame does not turn at all -- the machine half is still and the other half
  // is not, which is most of the "half machine" reading.
  const spin = t * (0.010 + g * 0.030);
  const mote = t * (0.013 + g * 0.026);

  // Ranges, as a fraction of R.
  const CORE = 0.72;
  const BEZEL = 0.79;
  const FRAME = 0.97;

  const metalDark = '#2b2a20';
  const metalMid = held ? '#7d7454' : '#5d5745';
  const metalLit = held ? '#c8b98a' : '#8c8672';
  const bezel = '#141d22';

  // Halo. Sparse, additive-looking rings that only exist while it is awake.
  if (g > 0.01) {
    const outer = R * (1.05 + g * 0.22);
    for (let py = CYP - outer; py <= CYP + outer; py += 2) {
      for (let px = CXP - outer; px <= CXP + outer; px += 2) {
        const dx = px + 1 - CXP, dy = py + 1 - CYP;
        const rr = Math.hypot(dx, dy);
        if (rr <= R * FRAME || rr > outer) continue;
        const falloff = 1 - (rr - R * FRAME) / (outer - R * FRAME);
        const a = falloff * falloff * 0.30 * g;
        if (a < 0.02) continue;
        r.pixel(px, py, 2, 2, `rgba(70,200,215,${a.toFixed(3)})`);
      }
    }
    // One ring travelling outward, restarting every couple of seconds. This is
    // the part a player catches out of the corner of their eye.
    const phase = ((t * 0.016) % 1);
    const ringR = R * (0.95 + phase * 0.45);
    const ringA = (1 - phase) * 0.34 * g;
    if (ringA > 0.02) ringPixels(r, CXP, CYP, ringR, `rgba(150,240,245,${ringA.toFixed(3)})`);
  }

  for (let py = CYP - R * 1.02; py <= CYP + R * 1.02; py += 2) {
    for (let px = CXP - R * 1.02; px <= CXP + R * 1.02; px += 2) {
      const dx = px + 1 - CXP, dy = py + 1 - CYP;
      const rr = Math.hypot(dx, dy);
      const n = rr / R;
      const a = Math.atan2(dy, dx);

      // Eight lugs, so the frame is a made thing and not a washer.
      const lug = Math.cos(a * 4) > 0.86 ? 0.055 : 0;
      if (n > FRAME + lug) continue;

      if (n > BEZEL) {
        // Struck metal, lit from the upper left. The two grooves cut across
        // the shading rather than following it, which is what makes them read
        // as cut into the surface.
        const light = Math.cos(a + 2.36);
        let c = light > 0.35 ? metalLit : light > -0.35 ? metalMid : metalDark;
        const groove = Math.cos(a * 12);
        if (groove > 0.90 && n > BEZEL + 0.04 && n < FRAME - 0.03) c = metalDark;
        if (n > FRAME - 0.035) c = metalDark;
        if (n < BEZEL + 0.035) c = metalDark;
        r.pixel(px, py, 2, 2, c);
        continue;
      }

      if (n > CORE) { r.pixel(px, py, 2, 2, bezel); continue; }

      // --- the core ---------------------------------------------------
      const depth = n / CORE;
      // Base: dark at the rim, hot in the middle. Five steps, no blending --
      // and a second, hotter ramp for when it is answering something, so the
      // difference between the two states survives a still frame instead of
      // living entirely in the speed of the spin.
      const base = g > 0.5 ? CORE_HOT : CORE_CALM;
      let c: string = depth > 0.86 ? base[0]
        : depth > 0.66 ? base[1]
          : depth > 0.44 ? base[2]
            : depth > 0.22 ? base[3]
              : base[4];

      // The spiral: three arms, turning. Cut as a brighter line rather than a
      // gradient so it survives being 2 pixels wide.
      const arm = wrap(a * 3 - depth * 7.2 + spin * 6);
      if (arm < 0.85) {
        const lit = g > 0.5 ? ARM_HOT : ARM_CALM;
        c = depth > 0.7 ? lit[0] : depth > 0.35 ? lit[1] : lit[2];
      }
      // Two engraved circles, the Aurelians' own marks, which do not turn.
      if (Math.abs(depth - 0.34) < 0.030 || Math.abs(depth - 0.62) < 0.030) {
        c = arm < 0.85 ? '#b6f2f4' : '#0a2f3e';
      }
      r.pixel(px, py, 2, 2, c);
    }
  }

  // Motes: whatever is in there, moving on its own business. Three of them on
  // different radii and periods so they never line up.
  const motes = [
    { rad: 0.30, sp: 1.00, ph: 0.0, col: '#d8fbff' },
    { rad: 0.48, sp: -0.62, ph: 2.1, col: '#9fe8f0' },
    { rad: 0.18, sp: 1.70, ph: 4.4, col: '#ffffff' },
  ];
  for (const m of motes) {
    const ang = m.ph + mote * m.sp * 4;
    // A slight ellipse, because a perfect circle of travel looks mechanical
    // and this is the half that is not a machine.
    const mx = CXP + Math.cos(ang) * R * CORE * m.rad;
    const my = CYP + Math.sin(ang) * R * CORE * m.rad * 0.82;
    r.pixel(Math.round(mx / 2) * 2, Math.round(my / 2) * 2, 2, 2, m.col);
    if (g > 0.3) {
      r.pixel(Math.round(mx / 2) * 2 - 2, Math.round(my / 2) * 2, 2, 2,
        `rgba(200,245,255,${(0.35 * g).toFixed(2)})`);
    }
  }

  // The specular on the frame's upper left: one hard block, the oldest trick
  // there is for saying "this is metal and it is round".
  const sx = CXP + Math.cos(-2.36) * R * 0.88;
  const sy = CYP + Math.sin(-2.36) * R * 0.88;
  r.pixel(Math.round(sx / 2) * 2, Math.round(sy / 2) * 2, 4, 2, '#f2e8c4');
}

/** A one-block-thick circle, stepped finely enough to have no gaps. */
function ringPixels(r: Renderer, cxp: number, cyp: number, rad: number, color: string): void {
  const steps = Math.max(24, Math.round(rad * 2));
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const x = Math.round((cxp + Math.cos(a) * rad) / 2) * 2;
    const y = Math.round((cyp + Math.sin(a) * rad) / 2) * 2;
    r.pixel(x, y, 2, 2, color);
  }
}

/**
 * The needle: a run of blocks leaving the frame in the direction of the site,
 * with a brighter one travelling along them.
 *
 * It sits outside the object rather than inside it, because the object is not
 * a compass -- it is being pulled, and the line is the pull.
 */
function drawNeedle(
  r: Renderer, cx: number, cy: number, radius: number,
  dir: { x: number; y: number }, t: number, intensity: number,
): void {
  const CXP = cx * DETAIL, CYP = cy * DETAIL, R = radius * DETAIL;

  // It hunts, by three degrees or so, on two periods that do not divide into
  // each other. A needle nailed to an exact bearing looks like a diagram; one
  // that keeps overshooting and coming back looks like something being pulled.
  const hunt = Math.sin(t * 0.09) * 0.05 + Math.sin(t * 0.031) * 0.03;
  const ca = Math.cos(hunt), sa = Math.sin(hunt);
  const nx = dir.x * ca - dir.y * sa;
  const ny = dir.x * sa + dir.y * ca;
  const px = -ny, py = nx;

  // The needle lives INSIDE the core, not outside the object.
  //
  // It was an arrow floating beyond the frame first, and there is not room for
  // one: about twenty pixels between the frame and the panel, which makes any
  // arrow either a smudge or a pennant stuck to the rim. The core is fifty
  // pixels of radius doing nothing but turning, it is exactly where the dial
  // of an instrument belongs, and a needle over a moving spiral is the single
  // clearest way this screen can say "that way" -- half machine, half not, and
  // the machine half is the half with the needle in it.
  const core = R * 0.72;
  const reach = core * 0.90;
  const bright = 0.75 + intensity * 0.25;
  const hot = `rgba(230,254,255,${bright.toFixed(2)})`;
  const cool = `rgba(120,214,228,${(bright * 0.7).toFixed(2)})`;

  // Drawn twice: a fat dark shape first, then the bright needle inside it.
  //
  // The single-pass version was invisible -- a pale line laid over a pale
  // turning spiral, which is the one background on this screen it cannot win
  // against. The dark pass is what a needle has that a scratch does not: an
  // edge. It also closes the gaps a diagonal run of snapped blocks leaves.
  const dark = 'rgba(4,22,32,0.88)';
  const tail = -core * 0.36;

  const shaft = (width: number, color: string, tipW: number): void => {
    for (let d = tail; d <= reach; d += 1.5) {
      const w = d < 0 ? Math.max(2, width - 2) : d > reach * 0.82 ? tipW : width;
      const x = Math.round((CXP + nx * d) / 2) * 2 - Math.floor((w - 2) / 2);
      const y = Math.round((CYP + ny * d) / 2) * 2 - Math.floor((w - 2) / 2);
      r.pixel(x, y, w, w, color);
    }
    for (const s of [-1, 1]) {
      for (let k = 1; k <= 3; k++) {
        const bx = CXP + nx * (reach - k * 4) + px * s * k * 3;
        const by = CYP + ny * (reach - k * 4) + py * s * k * 3;
        r.pixel(
          Math.round(bx / 2) * 2 - Math.floor((width - 2) / 2),
          Math.round(by / 2) * 2 - Math.floor((width - 2) / 2),
          width, width, color,
        );
      }
    }
  };

  shaft(8, dark, 6);
  shaft(4, hot, 2);

  // The counterweight end, cooler than the point so the needle has a front.
  for (let d = tail; d < -2; d += 1.5) {
    r.pixel(
      Math.round((CXP + nx * d) / 2) * 2, Math.round((CYP + ny * d) / 2) * 2,
      2, 2, cool,
    );
  }
  // The pin it turns on.
  r.pixel(Math.round(CXP / 2) * 2 - 4, Math.round(CYP / 2) * 2 - 4, 10, 10, dark);
  r.pixel(Math.round(CXP / 2) * 2 - 2, Math.round(CYP / 2) * 2 - 2, 6, 6, cool);
  r.pixel(Math.round(CXP / 2) * 2, Math.round(CYP / 2) * 2, 2, 2, hot);

  // ...and the frame lights on the side it is pulling toward, which is what
  // carries the reading out past the bezel and makes the whole object look
  // like it is leaning that way.
  const heading = Math.atan2(ny, nx);
  const glowA = 0.34 + intensity * 0.40;
  for (let oy = -R * 1.04; oy <= R * 1.04; oy += 2) {
    for (let ox = -R * 1.04; ox <= R * 1.04; ox += 2) {
      const rr = Math.hypot(ox, oy);
      if (rr < R * 0.76 || rr > R * 1.02) continue;
      let da = Math.abs(Math.atan2(oy, ox) - heading);
      if (da > Math.PI) da = Math.PI * 2 - da;
      if (da > 0.40) continue;
      const a = glowA * (1 - da / 0.40);
      if (a < 0.04) continue;
      r.pixel(
        Math.round((CXP + ox) / 2) * 2, Math.round((CYP + oy) / 2) * 2, 2, 2,
        `rgba(150,240,250,${a.toFixed(2)})`,
      );
    }
  }
}

function wrap(v: number): number {
  const tau = Math.PI * 2;
  return ((v % tau) + tau) % tau;
}
