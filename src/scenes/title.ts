/**
 * The start screen.
 *
 * THE ORDER. The film comes first now. A cold launch does not open on a menu
 * with a picture behind it and offer to play a cinematic; it opens on the
 * cinematic, and the cinematic hands over to the menu. That is the order every
 * game of this era used and it is the right one: the player is told what the
 * place is before being asked what they want to do in it.
 *
 * This scene is still the entry point -- `main.ts` starts it, and it is what
 * character creation backs out to -- so it is also the thing that decides
 * whether the film needs to run. On the first launch of a session it hands
 * straight to OpeningScene and gets handed back. After that it just opens.
 *
 * THE JOIN. There is no black between the two. The film's last shot is the
 * wordmark rising over the sea; this screen's first frame is the wordmark, the
 * same sprite at the same size, over the same sea at the same point in the same
 * camera move, at the same brightness -- the film dips 55% down and this screen
 * comes up out of exactly 55%. Then the picture keeps running and the wordmark
 * cranes up the frame while the menu arrives under it. Nothing cuts. Everything
 * that makes that true is in HANDOFF, in opening.ts, and is read from there
 * rather than copied.
 *
 * WHAT IS BEHIND THE MENU. The film's own shots, live -- the Hollow Sea at
 * dawn, the long grass with the herds crossing it, the shelf below the water,
 * the Turning, drowned Old Tidefall, the north shore. One at a time, ten
 * seconds each, dissolving into one another underneath a wordmark and a menu
 * that never blink. They are not new drawings of those places, they are the
 * same functions the cinematic runs, so the region behind the menu is provably
 * the region in the picture and there is no second set of art to rot.
 *
 * AND THE RULE THAT DECIDES HOW BUSY THEY MAY BE. The menu and the game's name
 * have to be perfectly readable over every frame of all six. So the top and the
 * bottom of the screen carry graded scrims that the picture is never allowed
 * through, the whole backdrop sits under a flat dim, and the two shots that
 * flash -- the Turning's lightning, the sea's sun -- are run over slices of
 * their camera moves that do not reach the flash. The middle band of the frame
 * carries no type at all, which is where the picture is allowed to be alive.
 */

import type { Game } from '../core/game.js';
import type { Scene } from '../core/scene.js';
import { Renderer, SCREEN_H, SCREEN_W } from '../engine/renderer.js';
import { ListMenu, type MenuStyle } from '../ui/menu.js';
import { audio } from '../audio/audio.js';
import { OverworldScene } from './overworld.js';
import { CreatorScene } from './creator.js';
import {
  BACKDROPS, HANDOFF, OpeningScene, cineVignette, releaseOpeningArt,
  warmOpeningArt, wordmark, wordmarkScrim,
} from './opening.js';
import { formatPlayTime, GameState } from '../systems/state.js';
import { OptionsScene } from './options.js';
import { load, saveExists } from '../systems/save.js';

/**
 * Has the cinematic played yet in this session?
 *
 * Module scope rather than a field, because the whole point is that it outlives
 * this scene: backing out of character creation rebuilds the start screen, and
 * the returning player must not be shown the film a second time in the same
 * sitting for having changed their mind about a haircut.
 */
let filmRun = false;

/** For captures: force the next launch back to a cold, film-first boot. */
export function resetTitleSession(): void {
  filmRun = false;
}

/** How the screen was reached. */
export type TitleEntry =
  /** From `main.ts`, or from anywhere that has no picture to hand over. */
  | 'boot'
  /** Straight out of the cinematic, mid-frame. */
  | 'handed';

/* ------------------------------------------------------------------ layout */

/** Where the wordmark comes to rest, in game units. */
const LOGO_REST = 14;
/** How long the crane from the film's position up to that one takes. */
const LIFT = 78;

const MENU_W = 112;
const MENU_X = Math.floor((SCREEN_W - MENU_W) / 2);
const MENU_Y = 98;
const ROW_H = 13;

/** How long each backdrop holds, and how long the dissolve between two takes. */
const DWELL = 620;
const DISSOLVE = 42;
/**
 * The first one is shorter. It is the shot the film just finished on, its
 * camera has already landed, and holding a parked camera for the full ten
 * seconds is the one way this cycle could feel slow at the very moment the
 * player has arrived.
 */
const FIRST_DWELL = 400;

/** The flat dim every backdrop sits under, so type has a floor to stand on. */
const REST_DIM = 0.30;

/** The departure, in ticks. */
const LEAVE = 64;

function smooth(p: number): number {
  const c = Math.max(0, Math.min(1, p));
  return c * c * (3 - 2 * c);
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * A text colour at a given opacity -- snapped to sixths, and that is the whole
 * point of the function.
 *
 * The renderer draws type from a glyph atlas baked per colour STRING and keeps
 * every atlas it has ever built. Handing it a colour whose alpha changes every
 * frame -- which is what fading a menu in over a second and a half does --
 * bakes a hundred full glyph sheets in ninety ticks and never frees one of
 * them. Nothing about that is visible in the code; it shows up as a title
 * screen that gets slower the longer you look at it. Seven steps per colour is
 * a smooth enough fade at this size and it is seven canvases, once, ever.
 */
function fade(rgb: string, a: number): string {
  return `rgba(${rgb},${(Math.round(clamp01(a) * 6) / 6).toFixed(2)})`;
}

const TYPE_ON = '255,233,176';
const TYPE_OFF = '184,199,222';
const TYPE_DEAD = '120,132,152';
const TYPE_PLACE = '166,182,206';
const TYPE_SHADOW = '4,8,18';
const TYPE_DETAIL = '146,164,190';

/**
 * A graded band of dark, drawn in two-unit steps.
 *
 * This is the entire readability budget of the screen. Every backdrop is a
 * different picture with a different distribution of light in it -- the sea is
 * amber where the amber wordmark goes, the drowned town is nearly black
 * everywhere -- and the only thing that makes one set of type work over all six
 * is that the top and the bottom of the frame are never the picture's to light.
 */
function grade(
  r: Renderer, y0: number, y1: number, a0: number, a1: number, color = '4,8,18',
): void {
  const span = Math.max(1, y1 - y0);
  for (let y = y0; y < y1; y += 2) {
    const k = (y - y0) / span;
    const a = a0 + (a1 - a0) * k;
    if (a <= 0.004) continue;
    r.rect(0, y, SCREEN_W, 2, `rgba(${color},${a.toFixed(3)})`);
  }
}

export class TitleScene implements Scene {
  readonly name = 'title';

  private menu = new ListMenu<string>([], 3);

  /** Ticks since the screen arrived. Drives the whole entrance. */
  private settle = 0;
  /** True when the film handed the live picture over rather than fading out. */
  private carried: boolean;

  /** Which backdrop is up, how long it has been up, and how long it gets. */
  private bd = 0;
  private bdT = 0;
  private bdLen = DWELL;
  /**
   * Added to the running tick count to get the clock a shot is drawn with. Set
   * once, at the join, so the sea is picked up on the frame it was put down.
   */
  private clockBase: number;
  /** Total ticks this scene has drawn. The backdrops' clock never restarts. */
  private life = 0;

  /** 0 while the player is still here; counts ticks once they are not. */
  private leaving = 0;
  private goTo: 'new' | 'continue' = 'new';

  /** Set when the film is running instead of this screen. */
  private handedOff = false;

  constructor(private entry: TitleEntry = 'boot', handedT = 0) {
    this.carried = entry === 'handed';
    this.clockBase = this.carried ? HANDOFF.seaOffset + handedT : 0;
    this.bdLen = this.carried ? FIRST_DWELL : DWELL;
  }

  enter(game: Game): void {
    /*
     * The reorder, in one branch.
     *
     * A cold launch does not draw this screen at all: it hands the whole thing
     * to the cinematic and asks to be given back afterwards. `replaceAll` is
     * queued and applied between frames, so doing it from inside enter() is
     * safe -- the stack is not being walked at the time.
     *
     * Which cut depends on whether anybody has played before. Somebody with a
     * save gets the overture: one of the film's shots at its authored speed
     * with its own line under it, then the title card. Six seconds with a
     * beginning and an end, and a different shot every launch -- rather than
     * the half-minute film with a SKIP prompt over it, which is a way past it
     * that makes the player press a button to say "I don't want this".
     */
    if (this.entry === 'boot' && !filmRun) {
      filmRun = true;
      const played = saveExists(0) || saveExists(1) || saveExists(2) || saveExists(3);
      this.handedOff = true;
      game.scenes.replaceAll(new OpeningScene(new GameState(), {
        cut: played ? 'overture' : 'full',
        handOff: (g, cardT) => g.scenes.replaceAll(new TitleScene('handed', cardT)),
      }));
      return;
    }

    // Already playing if the film handed over -- it started this track under
    // its own last seconds, because in a handover sound moves before picture.
    audio.playMusic('title_theme');

    // The backdrops are the film's shots and want the film's sprites. Coming
    // back from character creation the cache has been dropped, and building two
    // hundred canvases on the first frame of a fade-up is a visible hitch.
    warmOpeningArt();

    // What CONTINUE would actually continue. A row that says how far in the
    // save is turns a menu item into a fact about the player, and it is the one
    // number the era always put on this screen.
    const best = this.newestSave();
    this.menu.setItems([
      { label: 'NEW JOURNEY', value: 'new' },
      {
        label: 'CONTINUE',
        value: 'continue',
        detail: best ? formatPlayTime(best.playTime) : undefined,
        enabled: !!best,
      },
      { label: 'OPTIONS', value: 'options' },
    ]);
    // Somebody with a save almost certainly came here to continue, and the
    // cursor is the cheapest way to say the game remembers them.
    if (best) this.menu.index = 1;
  }

  exit(): void {
    // Dropped here rather than at the end of the film, because the film hands
    // its picture to this screen and this screen keeps drawing it. This is the
    // last moment anything wants a cinematic frame.
    if (!this.handedOff) releaseOpeningArt();
  }

  update(game: Game, _dt: number): void {
    if (this.handedOff) return;

    this.life++;
    this.settle++;
    this.advanceBackdrop();

    // Once the departure has started the screen stops listening. It is a shot
    // now, not a menu, and a shot that can be interrupted halfway is a glitch.
    if (this.leaving > 0) {
      this.leaving++;
      if (this.leaving >= LEAVE) this.depart(game);
      return;
    }

    const res = this.menu.update(game);
    if (res !== 'select') return;

    const choice = this.menu.selectedValue;
    if (choice === 'options') { game.scenes.push(new OptionsScene()); return; }
    if (choice === 'continue' && !this.newestSave()) return;
    this.goTo = choice === 'continue' ? 'continue' : 'new';
    this.leaving = 1;
  }

  resume(): void {
    // Back from Options. A suspended scene does not tick, so `settle` is
    // wherever it was when the player opened the settings -- which, if they
    // were quick, is mid-entrance. Park it past the end so the wordmark does
    // not crane up the frame a second time.
    //
    // `carried` is deliberately left alone. It is what pins the sea's camera to
    // where the film parked it, and clearing it here handed the first backdrop
    // back its own camera move from the top -- so closing the settings during
    // the first ten seconds of a session jumped the horizon half a frame.
    this.settle = Math.max(this.settle, LIFT + 60);
  }

  /**
   * The cycle.
   *
   * Each backdrop runs a slice of its shot's camera move over its whole dwell,
   * which is two to three times slower than the film runs it. That is not a
   * compromise: a camera behind a menu wants to be slower than a camera in a
   * cut, because the player is reading.
   */
  private advanceBackdrop(): void {
    if (this.leaving > 0) return;
    this.bdT++;
    if (this.bdT >= this.bdLen) {
      this.bdT = 0;
      this.bdLen = DWELL;
      this.bd = (this.bd + 1) % BACKDROPS.length;
      this.carried = false;
    }
  }

  /** How dark the backdrop is right now: the dissolve, and the entrance. */
  private backdropVeil(): number {
    // Out at the end of a dwell, in at the start of the next.
    let v = 0;
    if (this.bdT > this.bdLen - DISSOLVE) {
      v = (this.bdT - (this.bdLen - DISSOLVE)) / DISSOLVE;
    } else if (this.bdT < DISSOLVE && this.life > DISSOLVE) {
      v = 1 - this.bdT / DISSOLVE;
    }
    // Never all the way. A trace of the outgoing picture through the darkest
    // frame is what separates a dissolve from the screen having switched off
    // for a third of a second.
    return smooth(v) * 0.92;
  }

  /** Newest save across every slot, so CONTINUE means what the player expects. */
  private newestSave(): GameState | null {
    const found = [0, 1, 2, 3]
      .map((s) => load(s))
      .filter((e) => e)
      .sort((a, b) => b!.header.savedAt - a!.header.savedAt);
    return found[0]?.state ?? null;
  }

  private depart(game: Game): void {
    if (this.goTo === 'continue') {
      const st = this.newestSave();
      if (st) {
        game.playTime = st.playTime;
        game.scenes.replaceAll(
          new OverworldScene(st, st.currentMap, st.currentX, st.currentY, st.currentFacing),
        );
        return;
      }
    }
    // A new journey no longer starts the film -- the player has just watched
    // it. It starts where the film was pointing: at the person it said was
    // asleep under that one light on the north shore.
    game.scenes.replaceAll(new CreatorScene(new GameState()));
  }

  /* ---------------------------------------------------------------- render */

  render(_game: Game, r: Renderer): void {
    if (this.handedOff) { r.clear('#05070d'); return; }

    const going = this.leaving > 0 ? smooth(clamp01((this.leaving - 8) / 34)) : 0;

    /* the picture */
    const b = BACKDROPS[this.bd]!;
    const p = this.carried
      ? HANDOFF.seaP
      : b.from + (b.to - b.from) * clamp01(this.bdT / this.bdLen);
    r.clear('#05070d');
    b.draw(r, this.life + this.clockBase, p);
    cineVignette(r);

    const veil = this.backdropVeil();
    if (veil > 0.004) r.tint('#060b18', veil);

    /*
     * The dim, and the arrival out of the film's dip.
     *
     * The film's last frame is this picture under 55% dark. This screen's first
     * frame has to be the same 55%, relaxing to its own resting 30% over the
     * next three quarters of a second. Getting this number wrong by a little is
     * a flash on the join, which is the one thing the join must not have.
     */
    const arrive = this.carried ? 1 - smooth(this.settle / HANDOFF.dipOut) : 0;
    const black = this.entry === 'boot' && !this.carried
      ? 1 - smooth(this.settle / 26)
      : 0;
    r.tint('#060b18', REST_DIM + (HANDOFF.dip - REST_DIM) * arrive);

    /*
     * The two bands the picture is not allowed into.
     *
     * Top: 0 to 52, which is the wordmark and the subtitle with two units to
     * spare. Bottom: 84 down, ramping quickly to the depth the menu needs and
     * then deepening slowly to the floor, because a scrim that reaches its
     * final value and holds it draws a horizontal line across the sea.
     *
     * What is left is the band from 52 to 84 -- a fifth of the frame, carrying
     * no type at all, where the picture is allowed to be as alive as it likes.
     * That band is the answer to how busy these backdrops may be.
     */
    const bands = this.carried ? smooth(this.settle / LIFT) : 1;
    grade(r, 0, 52, 0.60 * bands, 0);
    grade(r, 84, 108, 0, 0.42 * bands);
    grade(r, 108, SCREEN_H, 0.42 * bands, 0.56 * bands);

    // The scrims do NOT leave with the menu. Letting them go on the way out
    // handed the last half second of this screen to a picture with half-faded
    // type lying across it, which is the least readable frame the screen has;
    // holding them means the type goes and the picture stays framed until the
    // black takes it.
    const ui = (1 - going) * bands;

    /* the wordmark, craning up out of the film's frame into its own */
    const lift = this.carried ? smooth(this.settle / LIFT) : 1;
    const ly = Math.round(HANDOFF.logoY + (LOGO_REST - HANDOFF.logoY) * lift);
    const logoA = (1 - going);
    // The film's own scrim under the letters, handed over at full strength and
    // let go as the graded band takes the job off it.
    wordmarkScrim(r, ly, logoA * (1 - lift * 0.85));
    wordmark(r, ly, logoA, logoA);

    /* the menu */
    const menuA = this.carried
      ? clamp01((this.settle - 52) / 40) * (1 - going)
      : clamp01((this.settle - 4) / 20) * (1 - going);
    if (menuA > 0.02) this.renderMenu(r, menuA);

    /* the lower-third: what you are looking at */
    if (ui > 0.2) this.renderPlace(r, b.place, ui);

    if (black > 0.004) r.tint('#05070d', black);
    if (going > 0) r.tint('#000000', smooth(clamp01((this.leaving - 26) / (LEAVE - 26))));
  }

  /**
   * The menu.
   *
   * No window frame. A GBA text box over a live camera move reads as a dialogue
   * box that has wandered onto the wrong screen; the graded plate under it does
   * the same job and lets the picture through. The selected row is carried by
   * an amber wash, an amber rule down its left edge and amber type -- three
   * signals, because one of them has to survive whichever of the six pictures
   * happens to be behind it.
   */
  private renderMenu(r: Renderer, a: number): void {
    // The blink on the way out: the confirmation the era always gave you.
    // Six ticks a state, not two -- a blink fast enough to alias against the
    // refresh is a flicker, and a flicker looks like a fault.
    if (this.leaving > 0 && this.leaving < 26 && Math.floor(this.leaving / 6) % 2 === 1) return;

    const idx = this.menu.index;
    const shade = fade(TYPE_SHADOW, a * 0.75);
    const style: MenuStyle = {
      rowHeight: ROW_H,
      padX: 14,
      frame: false,
      highlightBar: true,
      barColor: `rgba(255,204,132,${(0.16 * a).toFixed(3)})`,
      detailColor: fade(TYPE_DETAIL, a * 0.85),
      // A disabled row takes this colour INSTEAD of its own, so a CONTINUE with
      // nothing behind it has to be dimmed from here rather than per item.
      disabledColor: fade(TYPE_DEAD, a * 0.9),
    };

    /*
     * Drawn twice: a dark copy one unit down and right, then the real one.
     *
     * The list widget has no shadow option -- everywhere else in the game it
     * draws inside a window, where type never meets a picture. Here it does,
     * and a shadow is worth more than another ten per cent of scrim, because
     * the scrim costs the backdrop and the shadow costs nothing but a pass.
     * The real pass has to be the LAST one: the widget records its own box on
     * each render for hit-testing, and the offset copy would leave the mouse
     * picking rows a unit away from where they are drawn.
     */
    this.menu.items.forEach((it) => { it.color = shade; });
    this.menu.render(r, MENU_X + 1, MENU_Y + 1, MENU_W, {
      ...style, barColor: 'rgba(0,0,0,0)', detailColor: shade, disabledColor: shade,
    });

    this.menu.items.forEach((it, i) => {
      it.color = i === idx ? fade(TYPE_ON, a) : fade(TYPE_OFF, a * 0.95);
    });
    this.menu.render(r, MENU_X, MENU_Y, MENU_W, style);

    // The rule down the left edge of the chosen row, over the wash rather than
    // under it. Three signals carry the selection -- wash, rule, amber type --
    // because any one of them can be swallowed by one of the six pictures.
    const ry = MENU_Y + 4 + idx * ROW_H;
    r.rect(MENU_X + 2, ry - 1, 2, ROW_H, `rgba(255,206,138,${(0.8 * a).toFixed(3)})`);
  }

  /**
   * The name of the place behind the menu, bottom left, in the corner the menu
   * column does not reach.
   *
   * It costs eight units of type and it turns six pretty loops into a tour of a
   * region -- the difference between "there is something moving back there" and
   * "that is the shelf below the Hollow Sea, and I am going to go and look at
   * it". It fades with its own picture, so it is never naming the wrong one.
   */
  private renderPlace(r: Renderer, place: string, ui: number): void {
    const inFade = clamp01(this.bdT / DISSOLVE);
    const outFade = clamp01((this.bdLen - this.bdT) / DISSOLVE);
    const a = ui * Math.min(inFade, outFade) * 0.85;
    if (a <= 0.08) return;
    r.rect(6, SCREEN_H - 12, 1, 7, `rgba(255,206,138,${(a * 0.8).toFixed(3)})`);
    r.text(place, 10, SCREEN_H - 11, { color: fade(TYPE_PLACE, a), shadow: '#050a14' });
  }
}
