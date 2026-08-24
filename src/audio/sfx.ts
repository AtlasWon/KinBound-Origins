/**
 * Sound effect library.
 *
 * Every effect is a short stack of synth layers rather than a sample, for the
 * same reason the art is generated: no binary assets, one consistent voice, and
 * a new sound costs a line of data instead of a recording session.
 *
 * The rules that keep a chiptune set coherent:
 *  - noise carries impact and texture, pulse carries pitch and identity,
 *    triangle carries weight and warmth;
 *  - a downward glide reads as failure, an upward glide as success;
 *  - anything the player hears hundreds of times stays under ~0.1s and quiet,
 *    anything they hear once a session can be longer and louder;
 *  - and, above all of it, the envelope. Anything struck uses `pk`/`tk`/`nk`
 *    and anything that arrives uses `ns` or an explicit `env: 'swell'`. A
 *    sound effect on the held music envelope is a beep no matter how carefully
 *    its frequencies are chosen, which is what every impact in this file used
 *    to be. See tools/shots/sfxscope.js -- it plots each cue's waveform, and
 *    the difference is not subtle in the picture.
 *
 * Levels are written for the shape they are used with. An exponential decay
 * carries roughly a third of the energy that a rectangle of the same height
 * does, so a number moved from `n` to `nk` unchanged is a cue that got quieter
 * for no reason; the scope's `pun` column (loudest 20ms) is the one to compare
 * two cues by, not the peak.
 *
 * "Quiet" means restrained, not inaudible, and that is a distinction this file
 * once got wrong: the blips and ticks were set so low they vanished under the
 * music. A sound the player hears constantly still has to be *heard*, so the
 * ones under a volume ceiling buy their presence with layers -- a transient in
 * front and a little body underneath -- rather than with gain.
 */

import type { EnvShape, VoiceKind } from './synth.js';

export interface SfxLayer {
  /** Offset from the trigger, in seconds. */
  at?: number;
  dur: number;
  freq: number;
  /** Glide target; a fall reads as failure, a rise as success. On a noise
   * layer this sweeps the filter, which is how a swoosh opens and a crash
   * darkens. */
  to?: number;
  vol: number;
  kind: VoiceKind;
  duty?: number;
  vibrato?: number;
  /** Amplitude shape: `perc` is struck, `swell` is arriving, `flat` is held. */
  env?: EnvShape;
  /** Decay rate for `perc`/`swell`, as a fraction of the layer's length. */
  curve?: number;
  /** Attack, as a fraction of the layer's length. */
  attack?: number;
  /** Noise filter resonance. Above ~6 the filter starts to ring in pitch. */
  q?: number;
  /** Lowpass cutoff for a pitched layer, in Hz. */
  tone?: number;
}

/** Shorthand so the table below stays readable. */
const p = (dur: number, freq: number, vol: number, extra: Partial<SfxLayer> = {}): SfxLayer =>
  ({ dur, freq, vol, kind: 'pulse', duty: 0.5, ...extra });
const t = (dur: number, freq: number, vol: number, extra: Partial<SfxLayer> = {}): SfxLayer =>
  ({ dur, freq, vol, kind: 'triangle', ...extra });
const n = (dur: number, freq: number, vol: number, extra: Partial<SfxLayer> = {}): SfxLayer =>
  ({ dur, freq, vol, kind: 'noise', ...extra });

/**
 * Struck versions of the same three. Everything percussive goes through these,
 * so a hit cannot be written with a held envelope by accident -- which is the
 * mistake the whole impact half of this library used to be built on.
 */
const pk = (dur: number, freq: number, vol: number, extra: Partial<SfxLayer> = {}): SfxLayer =>
  ({ dur, freq, vol, kind: 'pulse', duty: 0.5, env: 'perc', ...extra });
const tk = (dur: number, freq: number, vol: number, extra: Partial<SfxLayer> = {}): SfxLayer =>
  ({ dur, freq, vol, kind: 'triangle', env: 'perc', ...extra });
const nk = (dur: number, freq: number, vol: number, extra: Partial<SfxLayer> = {}): SfxLayer =>
  ({ dur, freq, vol, kind: 'noise', env: 'perc', ...extra });
/** A noise layer that arrives rather than strikes: wash, hiss, wind. */
const ns = (dur: number, freq: number, vol: number, extra: Partial<SfxLayer> = {}): SfxLayer =>
  ({ dur, freq, vol, kind: 'noise', env: 'swell', ...extra });

/** An arpeggio, the workhorse of every jingle on this hardware. */
const arp = (freqs: number[], step: number, dur: number, vol: number, extra: Partial<SfxLayer> = {}): SfxLayer[] =>
  freqs.map((f, i) => p(dur, f, vol, { at: i * step, duty: 0.25, ...extra }));

export const SFX: Record<string, SfxLayer[]> = {

  /* ------------------------------------------------------------- menus */

  // A cursor tick has a hard ceiling on volume -- it fires many times a minute
  // -- so its crispness has to come from the transient instead: a needle of
  // high noise in front of the pulse reads as "sharp" at any level.
  select: [
    nk(0.012, 5600, 0.10),
    pk(0.042, 988, 0.16, { duty: 0.25, to: 1046, curve: 0.34 }),
    tk(0.055, 494, 0.10, { curve: 0.4 }),
  ],
  /**
   * Confirm, and every dialogue box the player advances -- so this is arguably
   * the single most-heard sound in the game.
   *
   * It used to measure louder than a battle hit and twice as long, which is the
   * wrong way round for a sound the player triggers several times a minute
   * against one they hear a handful of times a battle. It is now two struck
   * blips instead of two held tones: the same interval, half the energy, and it
   * gets out of the way of the line of dialogue it introduced.
   */
  confirm: [
    nk(0.014, 6000, 0.10),
    pk(0.05, 784, 0.16, { duty: 0.25, curve: 0.34 }),
    pk(0.08, 1175, 0.16, { at: 0.045, duty: 0.25, curve: 0.34 }),
    tk(0.13, 392, 0.10, { at: 0.045, curve: 0.42 }),
  ],
  cancel: [
    nk(0.02, 1400, 0.07),
    pk(0.09, 494, 0.16, { to: 262, duty: 0.5, curve: 0.34 }),
    tk(0.11, 165, 0.10, { to: 110, curve: 0.4 }),
  ],
  menu_open: [
    nk(0.05, 3400, 0.08, { to: 5200, curve: 0.3 }),
    pk(0.035, 587, 0.17, { duty: 0.25, curve: 0.34 }),
    pk(0.07, 880, 0.17, { at: 0.032, duty: 0.25, curve: 0.34 }),
    tk(0.10, 220, 0.11, { at: 0.032, curve: 0.4 }),
  ],
  menu_close: [
    nk(0.04, 2600, 0.07, { to: 1400, curve: 0.3 }),
    pk(0.04, 784, 0.17, { duty: 0.25, curve: 0.34 }),
    pk(0.08, 466, 0.17, { at: 0.036, duty: 0.25, curve: 0.34 }),
    tk(0.10, 175, 0.10, { at: 0.036, curve: 0.4 }),
  ],
  // Two noise bursts, bright then dull: the flick of the page and the settle
  // after it. One burst alone is a hiss, two are a sheet of paper -- and both
  // are struck, because paper is.
  page_turn: [
    nk(0.035, 4200, 0.14, { to: 2200, curve: 0.26 }),
    nk(0.06, 1600, 0.09, { at: 0.02, to: 900, curve: 0.3 }),
    pk(0.05, 1245, 0.14, { at: 0.015, duty: 0.125, to: 1568, curve: 0.3 }),
    tk(0.09, 330, 0.09, { at: 0.015, curve: 0.4 }),
  ],
  tab: [
    pk(0.04, 1046, 0.14, { duty: 0.125, curve: 0.3 }),
    pk(0.04, 1318, 0.12, { at: 0.03, duty: 0.125, curve: 0.3 }),
  ],
  denied: [
    pk(0.07, 300, 0.17, { duty: 0.5, curve: 0.4, tone: 1200 }),
    pk(0.11, 200, 0.17, { at: 0.07, duty: 0.5, to: 140, curve: 0.4, tone: 900 }),
  ],

  /* ------------------------------------------------------------- world */

  bump: [nk(0.06, 160, 0.24, { curve: 0.36 }), tk(0.08, 90, 0.16, { curve: 0.38 })],
  /**
   * Footsteps.
   *
   * Struck, like everything else percussive here, but with a slow curve: a
   * footfall on grass is a "shff" rather than a click, and a fast decay throws
   * away most of the sound's energy along with its length.
   *
   * The levels are higher than they look next to the old flat versions and end
   * up in the same place. An exponential decay holds roughly a third of the
   * energy a rectangle of the same height does, so keeping the written number
   * the same would have quietly halved every footstep in the game -- which is
   * the sort of change that is impossible to notice and impossible to miss.
   */
  step_grass: [nk(0.05, 2600, 0.13, { to: 1500, curve: 0.5 })],
  step_stone: [nk(0.04, 1400, 0.12, { curve: 0.44 }), tk(0.045, 150, 0.10, { curve: 0.5 })],
  step_dirt: [nk(0.05, 1900, 0.12, { to: 1100, curve: 0.5 }), tk(0.05, 130, 0.10, { curve: 0.5 })],
  step_wood: [nk(0.045, 900, 0.12, { curve: 0.44 }), tk(0.05, 190, 0.12, { curve: 0.5 })],
  step_sand: [nk(0.07, 3600, 0.12, { to: 2200, curve: 0.55 })],
  step_water: [
    nk(0.08, 1800, 0.15, { to: 3600, curve: 0.55 }),
    pk(0.07, 620, 0.10, { to: 900, duty: 0.125, curve: 0.5 }),
  ],
  ledge_hop: [
    p(0.09, 420, 0.14, { to: 760, duty: 0.25 }),
    n(0.05, 1200, 0.06, { at: 0.2 }),
  ],
  push_stone: [
    n(0.26, 240, 0.1),
    t(0.28, 62, 0.13, { to: 48 }),
  ],
  door: [n(0.12, 220, 0.13), t(0.14, 110, 0.09, { to: 80 })],
  door_close: [n(0.09, 180, 0.13), t(0.12, 90, 0.1, { to: 64 })],
  stairs: [
    n(0.04, 1500, 0.05),
    n(0.04, 1500, 0.05, { at: 0.06 }),
    n(0.04, 1500, 0.05, { at: 0.12 }),
  ],
  sign: [p(0.05, 700, 0.12, { duty: 0.125 }), p(0.06, 880, 0.12, { at: 0.05, duty: 0.125 })],
  warp: [
    p(0.34, 300, 0.16, { to: 1500, duty: 0.125 }),
    n(0.34, 900, 0.06),
  ],
  save: [...arp([523, 784, 1047], 0.08, 0.1, 0.16), t(0.4, 262, 0.1, { at: 0.16 })],
  /**
   * Picking something up.
   *
   * Struck rather than held: this was a pair of rectangles, which is the
   * flat-envelope mistake the header of this file is about, and it fires on
   * every ball of berries in a route.
   *
   * The three scraps of noise behind the notes are the pouch. They are here
   * because without them this was a rising run of struck blips landing on a
   * held note -- which is exactly what `confirm` is, and the two measured 0.95
   * alike. A dialogue box does not rattle; a bag does, and that is the whole
   * difference the ear needs when both fire within a second of each other.
   */
  item: [
    nk(0.016, 4200, 0.08, { curve: 0.18 }),
    pk(0.055, 698, 0.13, { duty: 0.25, curve: 0.30 }),
    pk(0.055, 1047, 0.13, { at: 0.052, duty: 0.25, curve: 0.30 }),
    pk(0.26, 1397, 0.14, { at: 0.104, duty: 0.25, curve: 0.38 }),
    tk(0.28, 349, 0.09, { at: 0.104, curve: 0.40 }),
    nk(0.030, 3400, 0.07, { at: 0.13, to: 1800, curve: 0.20 }),
    nk(0.025, 4600, 0.055, { at: 0.19, to: 2400, curve: 0.20 }),
    nk(0.020, 2600, 0.04, { at: 0.25, to: 1400, curve: 0.20 }),
  ],

  /**
   * A potion, and every other item that gives health back.
   *
   * Three things were asked of it and each one is a measurable property rather
   * than a taste:
   *
   *   restorative  bright and open, not the 769Hz thud the old `heal` was. A
   *                wash of high noise over the notes is the difference between
   *                medicine and a doorbell.
   *   lands quickly  the first sound is at zero and the melody has arrived by
   *                100ms. Nothing here waits for the player.
   *   resolves      C - G - C. The figure climbs to the octave and stops on
   *                it, over its own triad, and the decay is fast enough that
   *                under a fifth of the cue's energy is in its last third. The
   *                old one hung on for half a second after the last note, which
   *                is what "trails off" sounds like.
   *
   * Ending on the root, not the third, is the whole difference between this
   * and `levelup`: a level is a promise of more, a potion is a thing finished.
   */
  item_heal: [
    nk(0.018, 5200, 0.075, { curve: 0.16 }),
    ns(0.13, 2600, 0.055, { at: 0.008, to: 6400, attack: 0.40, curve: 0.24 }),
    pk(0.085, 523, 0.14, { duty: 0.25, curve: 0.30 }),
    pk(0.085, 784, 0.14, { at: 0.048, duty: 0.25, curve: 0.30 }),
    // The landing, on the octave above where it started.
    pk(0.30, 1047, 0.145, { at: 0.096, duty: 0.25, curve: 0.26 }),
    pk(0.28, 659, 0.075, { at: 0.100, duty: 0.5, curve: 0.26 }),
    tk(0.30, 262, 0.105, { at: 0.096, curve: 0.28 }),
    ns(0.17, 5600, 0.042, { at: 0.10, to: 9000, attack: 0.40, curve: 0.22 }),
  ],
  /**
   * Curing a status, or giving PP back: something lifted off rather than
   * something poured in. The figure dips before it rises, which is the only
   * reliable way to say "that has been taken away" in half a second.
   */
  item_cure: [
    nk(0.022, 3400, 0.07, { to: 6400, curve: 0.20 }),
    pk(0.10, 880, 0.13, { to: 622, duty: 0.25, curve: 0.32 }),
    pk(0.24, 1319, 0.135, { at: 0.088, duty: 0.25, curve: 0.32 }),
    tk(0.24, 440, 0.09, { at: 0.088, curve: 0.34 }),
    ns(0.18, 4200, 0.042, { at: 0.06, to: 8000, attack: 0.40, curve: 0.26 }),
  ],
  key_item: [...arp([659, 880, 1047, 1319], 0.07, 0.11, 0.17), t(0.35, 330, 0.09, { at: 0.2 })],
  badge: [
    ...arp([523, 659, 784, 1047, 1319, 1568], 0.07, 0.1, 0.18),
    t(0.5, 262, 0.12, { at: 0.35 }),
    n(0.3, 5000, 0.04, { at: 0.35 }),
  ],
  obtain_art: [
    p(0.5, 220, 0.14, { to: 880, duty: 0.125 }),
    ...arp([880, 1108, 1318], 0.09, 0.12, 0.15, { at: 0.3 }),
  ],
  shop_buy: [
    p(0.05, 988, 0.15, { duty: 0.25 }),
    p(0.05, 1319, 0.15, { at: 0.05, duty: 0.25 }),
    n(0.06, 4200, 0.05, { at: 0.1 }),
  ],
  shop_sell: [
    p(0.05, 1319, 0.15, { duty: 0.25 }),
    p(0.07, 880, 0.15, { at: 0.05, duty: 0.25 }),
  ],
  no_money: [p(0.1, 260, 0.16, { to: 150, duty: 0.5 }), n(0.08, 300, 0.06)],
  /**
   * The Waystation, and the player's mother: the two places the whole party is
   * put right at once.
   *
   * It is two cues rather than one because the event is two things. The screen
   * fades out, the work happens behind it, and the screen comes back -- so the
   * player spends the better part of a second looking at black, and a single
   * chime fired into the middle of that says nothing about what is going on.
   *
   *   heal_cycle  while it happens. Quiet enough to sit under the fade, warm,
   *               and -- the important part -- unresolved: three soft bells
   *               climbing to the *fifth* over a held hum, which is the sound
   *               of a thing still in progress. Play it once as the screen
   *               goes dark, or loop it; it starts and ends at silence.
   *   heal_done   when it completes. The payoff, and the one the player is
   *               actually waiting for.
   *
   * `heal_done` is deliberately the warmer of the two big jingles: it leads on
   * a triangle where `vessel_caught` leads on a pulse, and it lands most of a
   * kilohertz darker. A catch is a trophy and should ring; this is relief, and
   * relief is round. Both land on the root, because both are finished.
   */
  /*
   * The levels here look low next to the pulse-led jingles and are not. A
   * triangle is very nearly a sine: almost all of its energy sits in the
   * fundamental, where a 25% pulse spreads the same written amplitude across a
   * dozen harmonics the limiter and the ear both discount. Written at the
   * numbers `levelup` uses, this pair measured half again as loud as the catch
   * -- the most-repeated errand in the game drowning out its biggest moment.
   */
  heal_cycle: [
    t(0.62, 131, 0.045, { env: 'swell', attack: 0.30, curve: 0.34 }),
    t(0.58, 196, 0.030, { at: 0.03, env: 'swell', attack: 0.32, curve: 0.32 }),
    tk(0.20, 523, 0.10, { at: 0.04, curve: 0.40 }),
    tk(0.20, 659, 0.10, { at: 0.20, curve: 0.40 }),
    // Stops on G, not C. Nothing has been concluded yet.
    tk(0.26, 784, 0.10, { at: 0.36, curve: 0.42 }),
    // A needle on each bell. Three soft triangles inside a held hum smear into
    // one rising tone; the consonants are what make them read as three steps
    // of a job being done rather than as a drone that wanders upward.
    nk(0.010, 5600, 0.05, { at: 0.04 }),
    nk(0.010, 6000, 0.05, { at: 0.20 }),
    nk(0.010, 6400, 0.05, { at: 0.36 }),
    ns(0.24, 4200, 0.035, { at: 0.30, to: 7600, attack: 0.44, curve: 0.28 }),
  ],
  heal_done: [
    nk(0.014, 5000, 0.05, { curve: 0.18 }),
    tk(0.11, 392, 0.115, { curve: 0.36 }),
    tk(0.11, 523, 0.115, { at: 0.075, curve: 0.36 }),
    tk(0.14, 659, 0.12, { at: 0.150, curve: 0.38 }),
    // A cymbal swelling in from before the landing, so the arrival is prepared.
    ns(0.16, 2800, 0.045, { at: 0.160, to: 7000, attack: 0.72, curve: 0.22 }),
    // The landing. Staggered by a few milliseconds each, or six attacks on one
    // sample sum in phase into a spike the limiter then ducks the chord to
    // catch -- see the note on `vessel_caught`.
    tk(0.70, 1047, 0.12, { at: 0.300, curve: 0.46 }),
    pk(0.62, 784, 0.06, { at: 0.306, duty: 0.5, curve: 0.44 }),
    tk(0.66, 523, 0.075, { at: 0.311, curve: 0.46 }),
    pk(0.54, 1568, 0.038, { at: 0.304, duty: 0.125, curve: 0.36 }),
    tk(0.74, 131, 0.105, { at: 0.294, curve: 0.48 }),
    nk(0.44, 6000, 0.035, { at: 0.298, to: 2800, curve: 0.34 }),
  ],
  rain: [n(0.7, 5200, 0.035)],
  thunder: [n(0.6, 200, 0.14, { to: 60 }), t(0.7, 55, 0.12, { to: 35 })],

  /* ------------------------------------------------------------ battle */

  encounter: [
    p(0.3, 180, 0.2, { to: 1400, duty: 0.125 }),
    n(0.3, 400, 0.07),
  ],
  encounter_trainer: [
    n(0.05, 4800, 0.09),
    p(0.09, 988, 0.19, { duty: 0.25 }),
    t(0.12, 247, 0.12),
    p(0.09, 988, 0.19, { at: 0.11, duty: 0.25 }),
    t(0.12, 247, 0.12, { at: 0.11 }),
    p(0.34, 1319, 0.2, { at: 0.22, duty: 0.25 }),
    p(0.34, 1568, 0.1, { at: 0.22, duty: 0.125 }),
    t(0.4, 330, 0.13, { at: 0.22 }),
  ],

  /** The exclamation bubble popping up over a trainer's head. */
  spotted: [
    n(0.04, 6400, 0.11),
    p(0.07, 1568, 0.18, { duty: 0.125 }),
    p(0.16, 2093, 0.15, { at: 0.06, duty: 0.125, to: 1760 }),
  ],
  /** The wipe that carries the field into the battle screen. */
  battle_swoosh: [
    ns(0.44, 800, 0.14, { to: 5600, attack: 0.5, curve: 0.20 }),
    p(0.42, 180, 0.12, { to: 1400, duty: 0.125, env: 'swell', attack: 0.5, curve: 0.20 }),
    t(0.34, 90, 0.12, { at: 0.1, to: 300, env: 'swell', attack: 0.45, curve: 0.2 }),
  ],
  /**
   * Sending out and calling back.
   *
   * Between them these fire eight or ten times a battle, and both were a held
   * pulse glide with a rectangle of noise stapled to it -- a slide whistle in
   * each direction. They keep the gesture, which is the only part the player
   * reads: up for out, down for back. What is new is a transient at the front
   * (the seal letting go) and a beam that opens or closes behind it.
   *
   * `withdraw` also doubles as the vessel opening in the recall animation, so
   * it has to stand next to `vessel_open` without being it: this one falls,
   * that one rises.
   */
  send_out: [
    nk(0.016, 5600, 0.10, { curve: 0.16 }),
    p(0.17, 480, 0.15, { to: 1020, duty: 0.25, env: 'swell', attack: 0.26, curve: 0.28 }),
    ns(0.18, 1600, 0.08, { at: 0.02, to: 5600, attack: 0.36, curve: 0.26 }),
    tk(0.14, 200, 0.10, { at: 0.10, curve: 0.30 }),
  ],
  withdraw: [
    nk(0.014, 6400, 0.09, { curve: 0.14 }),
    pk(0.16, 1150, 0.15, { to: 430, duty: 0.25, curve: 0.30 }),
    ns(0.16, 5200, 0.07, { to: 1400, attack: 0.30, curve: 0.26 }),
    tk(0.12, 230, 0.09, { at: 0.08, curve: 0.28 }),
  ],
  // Sinking. The decay is what makes it a collapse: the old one held its level
  // all the way down and then stopped, which reads as a slide whistle rather
  // than as something running out of strength.
  faint: [
    p(0.55, 620, 0.19, { to: 62, duty: 0.25, env: 'perc', curve: 0.42, attack: 0.02 }),
    t(0.55, 280, 0.13, { to: 38, env: 'perc', curve: 0.42, attack: 0.02 }),
    nk(0.12, 240, 0.09, { at: 0.44, curve: 0.3 }),
  ],
  flee: [
    n(0.22, 3000, 0.08),
    p(0.22, 900, 0.13, { to: 1800, duty: 0.125 }),
  ],
  // A critical is `hit` with a shard of something ringing off it. The high-Q
  // noise layer is the shard: a narrow band of noise reads as a struck edge,
  // and it is the one part of the impact set allowed to hang on afterwards.
  crit: [
    nk(0.018, 9200, 0.25, { curve: 0.13 }),
    nk(0.12, 2400, 0.16, { at: 0.012, to: 900, curve: 0.18 }),
    nk(0.26, 210, 0.20, { at: 0.008, curve: 0.30 }),
    tk(0.28, 160, 0.21, { to: 55, curve: 0.26 }),
    nk(0.30, 3100, 0.10, { at: 0.02, q: 14, curve: 0.30 }),
    pk(0.16, 2000, 0.15, { to: 520, duty: 0.125, curve: 0.26 }),
    pk(0.22, 2600, 0.07, { at: 0.04, to: 1300, duty: 0.125, curve: 0.30 }),
  ],
  // A whiff has no transient at all -- it is the one battle sound that never
  // hits anything, and the swell shape is what says so.
  miss: [
    ns(0.16, 1100, 0.11, { to: 5400, attack: 0.42, curve: 0.28 }),
    p(0.14, 700, 0.10, { to: 360, duty: 0.125, env: 'swell', attack: 0.36, curve: 0.3 }),
  ],
  // The opposite: all transient and no tail. A blocked blow stops dead, and the
  // very short decay is the entire message.
  block: [
    nk(0.018, 4600, 0.14, { curve: 0.12 }),
    nk(0.06, 900, 0.15, { to: 480, curve: 0.16 }),
    tk(0.12, 240, 0.15, { to: 205, curve: 0.18 }),
    pk(0.08, 420, 0.09, { duty: 0.5, tone: 1000, curve: 0.18 }),
  ],
  stat_up: [...arp([523, 659, 880], 0.06, 0.08, 0.14)],
  stat_down: [...arp([880, 659, 494], 0.06, 0.09, 0.14)],
  // The exp bar filling. It fires many times a second, so it is a tick rather
  // than a note -- but the old one measured a hundredth of full scale, which is
  // below the music and therefore no sound at all. A struck envelope buys the
  // audibility that raw gain would have paid for in fatigue.
  exp_tick: [
    nk(0.008, 6400, 0.06),
    pk(0.028, 1568, 0.13, { duty: 0.25, curve: 0.30 }),
  ],
  /**
   * The low-health warning, once every 34 ticks for as long as it lasts -- so
   * of everything in this file, this is the cue with the most opportunity to
   * become hateful. It has to be noticed and it cannot grate.
   *
   * A bare square wave at 1200Hz did both jobs badly: piercing enough to
   * annoy, dull enough to ignore. This is a triangle with a pulse on top of
   * it, struck and short: the attack does the alerting and the tone is soft
   * enough to hear a hundred times.
   */
  hp_low: [
    pk(0.05, 1046, 0.09, { duty: 0.5, curve: 0.30, tone: 2600 }),
    tk(0.09, 523, 0.10, { curve: 0.36 }),
  ],
  /**
   * Levelling up.
   *
   * One of the two or three most-repeated rewards in the game, so it gets the
   * most structure of anything in this file. Three parts, and the shape matters
   * more than any individual note:
   *
   *   a flourish   four fast plucked steps up the tonic triad, 48ms apart
   *   a statement  two longer notes, climbing to the octave and past it
   *   a resolve    the whole tonic triad struck together under a held third,
   *                with a bass note and a cymbal, ringing out for half a second
   *
   * The rhythm is what makes it recognisable: everything else in the reward
   * family (badge, victory, caught) is an even run of equal notes, and an even
   * run cannot *arrive* anywhere. Fast-fast-fast-fast, slow, slow, LAND is a
   * cadence, and the ear hears the landing as the thing that was earned.
   *
   * The melody only ever rises -- G, C, E, G, C, D, E -- and the last note is
   * the third of the chord underneath it rather than the root, which is why it
   * sounds pleased rather than merely finished.
   */
  levelup: [
    ...[392, 523, 659, 784].map((f, i) => pk(0.075, f, 0.17, {
      at: i * 0.048, duty: 0.25, curve: 0.34,
    })),
    // A needle of noise on each step of the run, so the flourish has
    // consonants and does not smear into one rising tone.
    ...[6000, 6400, 6800, 7200].map((f, i) => nk(0.010, f, 0.07, { at: i * 0.048 })),

    pk(0.11, 1047, 0.18, { at: 0.196, duty: 0.25, curve: 0.40 }),
    // The lift: one step above the octave, short, unresolved on purpose.
    pk(0.075, 1175, 0.18, { at: 0.306, duty: 0.25, curve: 0.34 }),

    // The landing. A held third over the triad, and a cymbal swelling into it
    // from a beat earlier so the arrival is prepared rather than sudden.
    ns(0.13, 3000, 0.07, { at: 0.25, to: 7000, attack: 0.75, curve: 0.2 }),
    pk(0.52, 1319, 0.17, { at: 0.381, duty: 0.25, curve: 0.42, vibrato: 18 }),
    pk(0.50, 784, 0.085, { at: 0.381, duty: 0.5, curve: 0.42 }),
    pk(0.50, 523, 0.075, { at: 0.385, duty: 0.5, curve: 0.42 }),
    pk(0.44, 2637, 0.06, { at: 0.381, duty: 0.125, curve: 0.34 }),
    tk(0.56, 131, 0.16, { at: 0.375, curve: 0.45 }),
    nk(0.42, 7000, 0.065, { at: 0.381, to: 3200, curve: 0.30 }),
  ],
  learn_move: [...arp([659, 831, 988, 1319], 0.08, 0.11, 0.16)],
  evolve: [
    ...arp([392, 523, 659, 784, 988, 1319], 0.09, 0.13, 0.16),
    p(0.75, 1568, 0.15, { at: 0.5, duty: 0.25, vibrato: 30 }),
    p(0.75, 1175, 0.08, { at: 0.5, duty: 0.5 }),
    t(0.78, 196, 0.13, { at: 0.48 }),
    n(0.5, 6000, 0.03, { at: 0.5 }),
  ],
  victory: [
    ...arp([784, 784, 784, 1047], 0.09, 0.1, 0.18),
    p(0.5, 1319, 0.18, { at: 0.4, duty: 0.25 }),
    t(0.6, 330, 0.11, { at: 0.4 }),
  ],

  /**
   * The three impacts are built from the same four parts -- crack, mid body,
   * low thud, falling weight -- and differ in which part is loudest. That is
   * what makes them read as one punch landing three ways rather than as three
   * unrelated sounds: a super-effective hit is *this* hit with the roof taken
   * off, and a resisted one is the same hit with the crack stripped out.
   * Noise below 400Hz is lowpassed by the synth into a thud, above 3000 into a
   * crack, so the frequency numbers here are choosing a percussion part.
   *
   * All of it is struck (`nk`/`tk`/`pk`): the peak lands in two milliseconds
   * and everything after it is falling away. These were previously written on
   * the held music envelope, which meant a punch was a two-hundred-millisecond
   * rectangle of noise that stopped -- audibly a beep, and visible as a brick
   * in tools/shots/sfxscope.js. Nothing else about them mattered until that
   * was fixed.
   *
   * The falling filter on each body layer (`to`) is the other half: real debris
   * gets duller as it settles, and a hit whose spectrum never moves sounds
   * synthetic no matter how sharp its attack is.
   */
  hit: [
    nk(0.016, 8000, 0.28, { curve: 0.16 }),
    nk(0.10, 1300, 0.28, { to: 640, curve: 0.22 }),
    nk(0.17, 250, 0.24, { at: 0.004, curve: 0.30 }),
    tk(0.21, 200, 0.26, { to: 84, curve: 0.28 }),
    pk(0.07, 580, 0.13, { to: 280, duty: 0.25, curve: 0.22, tone: 2200 }),
  ],
  hit_super: [
    nk(0.02, 9600, 0.30, { curve: 0.14 }),
    nk(0.24, 1700, 0.30, { to: 520, curve: 0.20 }),
    nk(0.34, 210, 0.28, { at: 0.008, curve: 0.30 }),
    tk(0.40, 185, 0.30, { to: 44, curve: 0.26 }),
    // The shriek up and the groan down, together: a big hit is both.
    pk(0.18, 900, 0.18, { at: 0.012, to: 2400, duty: 0.125, curve: 0.34 }),
    pk(0.30, 300, 0.12, { at: 0.05, to: 118, duty: 0.5, curve: 0.32, tone: 1100 }),
    // Debris. Two duller cracks behind the first, arriving late and unevenly
    // -- the thing that stops a big hit sounding like a loud small one.
    nk(0.14, 1800, 0.14, { at: 0.13, to: 700, curve: 0.24 }),
    nk(0.10, 1200, 0.10, { at: 0.24, to: 500, curve: 0.24 }),
  ],
  // No bright crack at all, and the shortest tail of the three. Absence is the
  // clearest way to say "that barely landed" -- a quieter version of `hit`
  // just sounds further away.
  hit_weak: [
    nk(0.05, 350, 0.20, { curve: 0.30 }),
    nk(0.07, 760, 0.13, { at: 0.008, to: 380, curve: 0.26 }),
    tk(0.16, 150, 0.20, { to: 88, curve: 0.30 }),
    pk(0.10, 320, 0.12, { to: 175, duty: 0.5, tone: 850, curve: 0.30 }),
  ],

  /**
   * Capture, in the five parts the animation actually has: the throw, the lid
   * springing, the vessel dropping to the ground, each wobble, and then either
   * the latch or the burst. The sequence is the most dramatic thirty seconds
   * the game has, and it used to be told with three sounds -- the recall cue
   * standing in for the lid, silence where the vessel lands, and a wobble that
   * measured quieter than a cursor tick.
   *
   * The arc across them is deliberate. Bright and rising on the way out, then
   * dark, low and slow through the wobbles where nothing is decided, then
   * bright and sharp again at the click. Tension is the absence of the top end.
   */

  /**
   * Off the hand and through the air.
   *
   * The flick is the front transient; without it this measured as `menu_open`.
   * The two noise stages after it are the arc -- one opening as the vessel
   * comes up, a smaller darker one as it goes away -- and that second stage is
   * what keeps it clear of `send_out`, which is the same length and the same
   * rising gesture and was measuring 0.92 alike. A throw recedes; a send-out
   * arrives, so one of them has to have somewhere to go afterwards.
   *
   * The pitched layer is kept low and quiet on purpose. There is nothing
   * melodic about a thrown object.
   */
  vessel_throw: [
    nk(0.03, 2200, 0.15, { to: 900, curve: 0.16 }),
    ns(0.17, 700, 0.17, { at: 0.015, to: 3600, attack: 0.44, curve: 0.24 }),
    ns(0.11, 3000, 0.09, { at: 0.15, to: 900, attack: 0.30, curve: 0.24 }),
    p(0.16, 300, 0.10, { to: 620, duty: 0.125, env: 'swell', attack: 0.42, curve: 0.24 }),
  ],
  // The lid springing and the light coming out. A hinge, not a beam: the catch
  // releasing is the loudest twelve milliseconds in the whole sequence.
  vessel_open: [
    nk(0.012, 8000, 0.26, { curve: 0.12 }),
    nk(0.055, 2600, 0.17, { at: 0.004, q: 7, curve: 0.18 }),
    pk(0.10, 1100, 0.19, { to: 2600, duty: 0.125, curve: 0.26 }),
    ns(0.22, 1800, 0.11, { at: 0.02, to: 6600, attack: 0.36, curve: 0.26 }),
    tk(0.10, 200, 0.13, { curve: 0.22 }),
  ],
  /**
   * It falls and settles.
   *
   * Dry, and over in eighty milliseconds: this is the only beat in the capture
   * that carries no information at all, so it exists to punctuate rather than
   * to be listened to. It is deliberately a *clack* against the ground where
   * the wobble that follows it is a low creak -- the two used to measure as
   * near-identical low knocks, which turned the pause before the first wobble
   * into a stutter instead of a silence.
   */
  vessel_land: [
    nk(0.022, 2600, 0.21, { to: 1100, curve: 0.14 }),
    nk(0.05, 420, 0.20, { curve: 0.20 }),
    tk(0.075, 150, 0.17, { to: 96, curve: 0.20 }),
  ],
  /**
   * One wobble.
   *
   * The whole point of this cue is that the player does not know yet, so it is
   * the darkest thing in the sequence: a knock, a strained tone bending flat
   * under a lowpass, and the shell rocking underneath. It used to be a 69ms
   * pluck at 520Hz with a centroid brighter than the latch -- which meant the
   * three most suspenseful beats in the game sounded like a menu cursor, and
   * the ear could not tell a wobble from the click that resolves it.
   */
  vessel_shake: [
    nk(0.025, 520, 0.17, { curve: 0.22 }),
    pk(0.13, 300, 0.13, { to: 232, duty: 0.125, vibrato: 60, tone: 2000, curve: 0.34 }),
    nk(0.10, 1500, 0.12, { at: 0.02, to: 700, q: 5, curve: 0.28 }),
    tk(0.15, 110, 0.13, { to: 88, curve: 0.30 }),
  ],
  // The moment the catch lands. All transient: this is a latch closing. The
  // low knock under it is the seal seating -- without it the click is a hat.
  vessel_click: [
    nk(0.014, 7000, 0.22, { curve: 0.14 }),
    nk(0.06, 3000, 0.14, { at: 0.004, q: 8, curve: 0.24 }),
    pk(0.06, 1600, 0.18, { duty: 0.125, curve: 0.3 }),
    tk(0.09, 190, 0.12, { curve: 0.22 }),
  ],
  /**
   * Caught.
   *
   * The largest cue in the game, and the one the whole capture sequence exists
   * to arrive at, so it is built like `levelup` and then given more of
   * everything: longer, later-peaking, and with a proper cadence instead of an
   * even run. The old version was four equal notes 90ms apart followed by a
   * held one -- the shape the levelup note calls out as the thing that cannot
   * arrive anywhere, and it was never wired up in the first place.
   *
   *   pickup     A, D -- a rising fourth, two fast notes, 65ms apart
   *   statement  F#, held twice as long, hanging
   *   breath     a cymbal swelling in from a beat before the landing
   *   landing    D over the full triad, bass, sparkle, ringing three quarters
   *              of a second
   *
   * It is in D where `levelup` is in C, and -- the part that matters -- it
   * lands on the *root* where `levelup` lands on the third. A level is a
   * promise of more; a catch is a thing completed and owned, and the ear reads
   * a tonic as ownership. That difference is why these two can sit forty
   * seconds apart in the same battle without sounding like one another.
   */
  vessel_caught: [
    // Light rushing into the shell as it seals.
    nk(0.014, 9000, 0.16, { curve: 0.12 }),
    ns(0.16, 2600, 0.10, { to: 8200, attack: 0.30, curve: 0.22 }),

    pk(0.07, 440, 0.18, { at: 0.040, duty: 0.25, curve: 0.32 }),
    pk(0.07, 587, 0.18, { at: 0.105, duty: 0.25, curve: 0.32 }),
    // A needle on each step, so the pickup has consonants.
    nk(0.010, 6400, 0.07, { at: 0.040 }),
    nk(0.010, 6800, 0.07, { at: 0.105 }),

    pk(0.16, 740, 0.19, { at: 0.170, duty: 0.25, curve: 0.36 }),
    nk(0.010, 7200, 0.07, { at: 0.170 }),

    // Prepared, not sudden.
    ns(0.14, 3200, 0.08, { at: 0.200, to: 7400, attack: 0.76, curve: 0.20 }),

    // Spread across eleven milliseconds rather than struck together. Six
    // layers whose attacks land on the same sample sum in phase, and the
    // result was a single excursion four times the height of the note that
    // followed it -- inaudible as a note and plainly there as a spike in the
    // plot, with the master limiter ducking the front of the chord to catch it.
    pk(0.72, 1175, 0.18, { at: 0.335, duty: 0.25, curve: 0.42, vibrato: 16 }),
    pk(0.70, 880, 0.09, { at: 0.341, duty: 0.5, curve: 0.42 }),
    pk(0.70, 587, 0.08, { at: 0.346, duty: 0.5, curve: 0.42 }),
    pk(0.60, 2349, 0.05, { at: 0.339, duty: 0.125, curve: 0.34 }),
    tk(0.76, 147, 0.17, { at: 0.328, curve: 0.46 }),
    nk(0.56, 7600, 0.07, { at: 0.333, to: 3000, curve: 0.30 }),
  ],
  /**
   * It got out.
   *
   * This measured a third as loud as a cursor tick, which is a strange thing
   * for a sealed container bursting apart to be. It is now a real pop -- seal,
   * shell, body -- with the light falling *down* out of it and three fragments
   * behind, because a downward glide is the shortest way to say "no".
   *
   * The balance leans bright and the fragments are spread further out than a
   * hit's debris would be. Written with the weight in the low end it measured
   * as `fx_hit`, which is the generic move impact and fires a dozen times in
   * the same battle -- so a failed catch read as the wild kin taking a hit
   * rather than as the wild kin getting away.
   */
  vessel_break: [
    nk(0.014, 7000, 0.26, { curve: 0.11 }),
    nk(0.13, 2600, 0.26, { at: 0.004, to: 900, curve: 0.24 }),
    nk(0.18, 300, 0.17, { at: 0.006, curve: 0.28 }),
    tk(0.22, 180, 0.20, { to: 88, curve: 0.28 }),
    pk(0.20, 1100, 0.17, { to: 260, duty: 0.125, curve: 0.30 }),
    nk(0.05, 3200, 0.13, { at: 0.10, to: 1400, curve: 0.20 }),
    nk(0.045, 2200, 0.10, { at: 0.17, to: 950, curve: 0.20 }),
    nk(0.04, 4000, 0.07, { at: 0.24, to: 1800, curve: 0.20 }),
  ],

  /* ---------------------------------------------------- move archetypes */

  /**
   * Every element gets the same three-part construction -- an attack transient,
   * a middle that carries the element's character, and a tail that says what
   * the move left behind (crackle, spray, rubble, ringing). Skipping the tail
   * is what made these sound like they stopped rather than finished.
   *
   * What separates them is not their pitches, which nobody can hear under a
   * layer of noise, but their *shape*: whether the sound is struck or arrives,
   * how fast it falls away, and which direction its spectrum moves.
   *
   *   struck and dead    stone, iron, a body blow      the tail is debris
   *   struck then hiss   fire, venom                   the tail is a reaction
   *   arriving           gale, spirit, psy, swarm      there is no impact
   *   struck then ring   spark, frost, a critical      the tail is resonance
   *
   * A tail that is a handful of short struck bursts (rubble, crackle, drips)
   * beats one long noise layer every time: separate events read as separate
   * objects, and one sustained hiss reads as tape.
   */
  fx_hit: [
    nk(0.016, 5400, 0.15, { curve: 0.16 }),
    nk(0.08, 1200, 0.17, { to: 620, curve: 0.22 }),
    tk(0.13, 175, 0.14, { to: 100, curve: 0.28 }),
  ],
  fx_heavy: [
    nk(0.03, 3400, 0.16, { to: 1500, curve: 0.18 }),
    nk(0.20, 380, 0.23, { curve: 0.30 }),
    tk(0.30, 100, 0.23, { to: 44, curve: 0.30 }),
    pk(0.12, 240, 0.11, { to: 104, duty: 0.125, tone: 900, curve: 0.28 }),
    nk(0.16, 900, 0.10, { at: 0.10, to: 380, curve: 0.30 }),
  ],
  // Ignition, then a hiss that opens up underneath a low roar, then crackle.
  // The hiss is the only part that swells; everything else was struck.
  fx_fire: [
    nk(0.055, 700, 0.29, { to: 300, curve: 0.22 }),
    ns(0.40, 1300, 0.12, { to: 3600, attack: 0.26, curve: 0.30 }),
    nk(0.30, 260, 0.16, { at: 0.008, curve: 0.30 }),
    pk(0.30, 360, 0.11, { to: 150, duty: 0.125, vibrato: 45, curve: 0.40 }),
    tk(0.32, 130, 0.14, { to: 72, curve: 0.34 }),
    nk(0.05, 2600, 0.09, { at: 0.22, curve: 0.20 }),
    nk(0.045, 3400, 0.08, { at: 0.29, curve: 0.20 }),
    nk(0.05, 2100, 0.07, { at: 0.36, curve: 0.20 }),
  ],
  // Slap, wash, drips. The wash sweeps its filter upward as it opens, which is
  // the difference between spray and static.
  fx_water: [
    nk(0.045, 520, 0.29, { to: 950, curve: 0.24 }),
    ns(0.34, 900, 0.14, { to: 4400, attack: 0.28, curve: 0.30 }),
    pk(0.26, 800, 0.12, { to: 320, duty: 0.25, tone: 2000, curve: 0.40 }),
    tk(0.30, 210, 0.17, { to: 105, curve: 0.32 }),
    ns(0.20, 3400, 0.055, { at: 0.26, to: 7000, attack: 0.34, curve: 0.26 }),
    // Rising droplets in the spray. A pitched voice in a wash of noise is what
    // makes it water rather than weather.
    pk(0.09, 560, 0.055, { at: 0.28, to: 1150, duty: 0.125, curve: 0.22 }),
    pk(0.07, 900, 0.045, { at: 0.37, to: 1600, duty: 0.125, curve: 0.22 }),
  ],
  // Snap and ring: the shortest transient in the library, a resonant zap, and
  // an after-buzz that keeps ringing once the pitch has gone.
  fx_spark: [
    nk(0.014, 9600, 0.30, { curve: 0.10 }),
    nk(0.16, 4200, 0.17, { at: 0.004, to: 2400, q: 9, curve: 0.14 }),
    pk(0.22, 2400, 0.20, { to: 340, duty: 0.125, vibrato: 140, curve: 0.28 }),
    pk(0.20, 3100, 0.13, { at: 0.02, to: 600, duty: 0.125, curve: 0.28 }),
    tk(0.20, 155, 0.17, { to: 70, curve: 0.26 }),
    nk(0.26, 5400, 0.09, { at: 0.05, q: 16, curve: 0.32 }),
    nk(0.03, 7000, 0.11, { at: 0.14, curve: 0.14 }),
    nk(0.03, 6000, 0.08, { at: 0.20, curve: 0.14 }),
  ],
  fx_frost: [
    nk(0.035, 6600, 0.28, { curve: 0.16 }),
    pk(0.30, 2600, 0.13, { to: 1450, duty: 0.125, curve: 0.44 }),
    // The second slide sits a few semitones under the first and lands at the
    // same time; two glides beating against each other is the shiver.
    pk(0.30, 1960, 0.08, { at: 0.03, to: 1090, duty: 0.125, curve: 0.44 }),
    nk(0.26, 3600, 0.085, { at: 0.02, q: 12, curve: 0.28 }),
    tk(0.22, 300, 0.075, { at: 0.16, to: 190, curve: 0.26 }),
    // Splintering, after the freeze rather than during it.
    nk(0.05, 7200, 0.06, { at: 0.24, curve: 0.16 }),
    nk(0.05, 8400, 0.045, { at: 0.31, curve: 0.16 }),
  ],
  fx_leaf: [
    ns(0.30, 3600, 0.11, { to: 7000, attack: 0.36, curve: 0.30 }),
    nk(0.08, 2000, 0.09, { at: 0.008, to: 4200, curve: 0.24 }),
    pk(0.20, 940, 0.10, { to: 620, duty: 0.25, tone: 2600, curve: 0.40 }),
    tk(0.18, 190, 0.08, { at: 0.05, to: 130, curve: 0.30 }),
    nk(0.04, 5200, 0.07, { at: 0.20, curve: 0.20 }),
    nk(0.04, 4200, 0.06, { at: 0.27, curve: 0.20 }),
  ],
  // Stone cracks and stops. The boom is long, but nothing about it rings --
  // and the tail is four separate pieces of rubble landing, not a rumble.
  fx_quake: [
    nk(0.03, 2200, 0.14, { to: 800, curve: 0.15 }),
    tk(0.46, 62, 0.25, { to: 36, curve: 0.30 }),
    nk(0.40, 220, 0.20, { curve: 0.34 }),
    tk(0.30, 112, 0.15, { at: 0.14, to: 54, curve: 0.30 }),
    nk(0.06, 800, 0.15, { at: 0.26, curve: 0.18 }),
    nk(0.05, 1500, 0.13, { at: 0.33, curve: 0.18 }),
    nk(0.05, 560, 0.12, { at: 0.41, curve: 0.18 }),
    nk(0.04, 1100, 0.09, { at: 0.48, curve: 0.18 }),
  ],
  // Three overlapping waves rather than one bloom. A single rising swell is
  // what fx_light is, and the two were measuring as the same sound with
  // different pitches; a psychic move should throb, and the ripple in the
  // envelope is the only thing that says so at this length.
  fx_psy: [
    ns(0.12, 700, 0.08, { to: 1600, attack: 0.5, curve: 0.3 }),
    p(0.20, 480, 0.13, { to: 900, duty: 0.125, vibrato: 90, env: 'swell', attack: 0.30, curve: 0.24 }),
    p(0.20, 640, 0.12, { at: 0.13, to: 1200, duty: 0.125, vibrato: 90, env: 'swell', attack: 0.30, curve: 0.24 }),
    p(0.26, 860, 0.12, { at: 0.26, to: 1700, duty: 0.125, vibrato: 90, env: 'swell', attack: 0.30, curve: 0.28 }),
    t(0.34, 240, 0.10, { at: 0.04, to: 620, env: 'swell', attack: 0.30, curve: 0.30 }),
    nk(0.24, 2600, 0.09, { at: 0.30, q: 10, curve: 0.32 }),
  ],
  // Metal: an almost instantaneous transient and a long inharmonic ring. Two
  // resonances rather than one, because a single one is a bell and two are a
  // struck plate.
  fx_iron: [
    nk(0.012, 10000, 0.22, { curve: 0.10 }),
    nk(0.36, 2400, 0.13, { at: 0.004, q: 18, curve: 0.34 }),
    nk(0.30, 3550, 0.08, { at: 0.006, q: 22, curve: 0.32 }),
    pk(0.30, 2300, 0.13, { to: 900, duty: 0.125, curve: 0.40 }),
    pk(0.30, 1730, 0.08, { at: 0.02, to: 670, duty: 0.125, curve: 0.40 }),
    tk(0.22, 150, 0.16, { to: 88, curve: 0.26 }),
  ],
  fx_dark: [
    nk(0.06, 200, 0.13, { curve: 0.25 }),
    t(0.44, 150, 0.17, { to: 52, env: 'swell', attack: 0.20, curve: 0.36 }),
    t(0.40, 224, 0.10, { at: 0.02, to: 80, env: 'swell', attack: 0.24, curve: 0.34 }),
    ns(0.36, 420, 0.11, { to: 170, attack: 0.34, curve: 0.34 }),
    pk(0.24, 300, 0.10, { at: 0.20, to: 122, duty: 0.5, vibrato: 60, tone: 900, curve: 0.38 }),
  ],
  fx_light: [
    nk(0.03, 7200, 0.10, { curve: 0.18 }),
    p(0.42, 700, 0.14, { to: 2100, duty: 0.25, env: 'swell', attack: 0.22, curve: 0.30 }),
    // A clean octave above, so the rise reads as radiant rather than as a siren.
    p(0.42, 1050, 0.11, { at: 0.04, to: 3150, duty: 0.25, env: 'swell', attack: 0.22, curve: 0.30 }),
    t(0.38, 350, 0.11, { at: 0.02, to: 1050, env: 'swell', attack: 0.26, curve: 0.30 }),
    ns(0.26, 4000, 0.09, { at: 0.24, to: 8600, attack: 0.40, curve: 0.30 }),
  ],
  // No transient anywhere in this one. It was already happening.
  fx_spirit: [
    p(0.46, 420, 0.12, { to: 235, duty: 0.125, vibrato: 130, env: 'swell', attack: 0.32, curve: 0.34 }),
    p(0.46, 628, 0.07, { at: 0.03, to: 350, duty: 0.125, vibrato: 90, env: 'swell', attack: 0.32, curve: 0.34 }),
    t(0.40, 105, 0.11, { to: 70, env: 'swell', attack: 0.30, curve: 0.34 }),
    ns(0.34, 1200, 0.07, { to: 480, attack: 0.40, curve: 0.34 }),
    ns(0.24, 4200, 0.05, { at: 0.16, to: 1900, attack: 0.40, curve: 0.30 }),
  ],
  fx_venom: [
    nk(0.04, 1600, 0.11, { to: 700, curve: 0.20 }),
    p(0.30, 250, 0.12, { to: 430, duty: 0.5, vibrato: 90, tone: 1400, env: 'swell', attack: 0.18, curve: 0.40 }),
    t(0.28, 125, 0.11, { at: 0.02, to: 200, env: 'swell', attack: 0.20, curve: 0.36 }),
    ns(0.24, 1200, 0.07, { at: 0.05, to: 2600, attack: 0.40, curve: 0.30 }),
    // Bubbles: short, pitched, rising, unevenly spaced.
    pk(0.05, 400, 0.08, { at: 0.13, to: 700, duty: 0.125, curve: 0.20 }),
    pk(0.05, 520, 0.07, { at: 0.21, to: 880, duty: 0.125, curve: 0.20 }),
    pk(0.045, 340, 0.06, { at: 0.30, to: 610, duty: 0.125, curve: 0.20 }),
  ],
  fx_swarm: [
    ns(0.40, 3000, 0.10, { to: 1500, attack: 0.34, curve: 0.34 }),
    ns(0.34, 1300, 0.07, { at: 0.03, to: 2800, attack: 0.40, curve: 0.30 }),
    p(0.38, 1300, 0.09, { to: 1080, duty: 0.125, vibrato: 170, env: 'swell', attack: 0.30, curve: 0.32 }),
    p(0.36, 660, 0.07, { at: 0.04, to: 560, duty: 0.125, vibrato: 200, env: 'swell', attack: 0.30, curve: 0.32 }),
    // One bite at the end, so the swarm arrives somewhere.
    nk(0.05, 2400, 0.11, { at: 0.34, to: 1100, curve: 0.20 }),
  ],
  // A gale passes: the filter sweeps up as it comes and falls as it goes, which
  // is the whole sound. It is the one archetype with no impact in it at all.
  fx_wind: [
    ns(0.38, 800, 0.14, { to: 5200, attack: 0.44, curve: 0.32 }),
    ns(0.26, 5400, 0.08, { at: 0.20, to: 1100, attack: 0.30, curve: 0.30 }),
    p(0.34, 800, 0.09, { to: 1700, duty: 0.125, env: 'swell', attack: 0.36, curve: 0.30 }),
    t(0.28, 190, 0.08, { at: 0.04, to: 420, env: 'swell', attack: 0.36, curve: 0.30 }),
  ],
  // A wind-up, so it is all swell and no landing -- and it ends on a tick that
  // says the charge is ready rather than simply stopping.
  fx_charge: [
    p(0.60, 200, 0.12, { to: 1250, duty: 0.125, env: 'swell', attack: 0.55, curve: 0.14 }),
    p(0.56, 300, 0.07, { at: 0.04, to: 1870, duty: 0.125, env: 'swell', attack: 0.55, curve: 0.14 }),
    ns(0.60, 1200, 0.07, { to: 3000, attack: 0.6, curve: 0.14 }),
    t(0.48, 100, 0.09, { at: 0.06, to: 300, env: 'swell', attack: 0.5, curve: 0.16 }),
    nk(0.06, 6000, 0.10, { at: 0.60, curve: 0.18 }),
  ],
  fx_heal: [
    ...[659, 831, 988].map((f, i) => t(0.16, f, 0.12, { at: i * 0.08, env: 'perc', curve: 0.45 })),
    t(0.34, 330, 0.09, { at: 0.02, env: 'perc', curve: 0.5 }),
    ns(0.20, 6200, 0.05, { at: 0.14, to: 9000, attack: 0.4, curve: 0.3 }),
  ],
  fx_buff: [...arp([523, 698, 880], 0.07, 0.10, 0.14), t(0.26, 262, 0.10, { at: 0.12 })],
  fx_debuff: [...arp([740, 587, 466], 0.07, 0.11, 0.14), t(0.28, 233, 0.10, { at: 0.12 })],
  fx_weather: [
    ns(0.62, 1400, 0.12, { to: 2600, attack: 0.40, curve: 0.26 }),
    ns(0.34, 4200, 0.07, { at: 0.24, to: 6000, attack: 0.4, curve: 0.26 }),
    t(0.62, 120, 0.11, { to: 85, env: 'swell', attack: 0.36, curve: 0.26 }),
    p(0.40, 300, 0.06, { at: 0.10, to: 220, duty: 0.125, vibrato: 40, env: 'swell', attack: 0.4, curve: 0.26 }),
  ],

  /* -------------------------------------------------------------- talk */

  /**
   * Voice blips. Pitch is varied per speaker and per letter at call time; these
   * are the base timbres.
   *
   * Each one is three layers because a single pulse is a *tick*, not a voice.
   * The parts map onto how a syllable actually arrives: a scrap of noise for
   * the consonant, a pulse for the vowel, and a triangle an octave under it for
   * the chest behind the sound. Every blip also slides a little -- speech never
   * holds a pitch for 40ms -- and which way it slides is most of what separates
   * these four from each other.
   *
   * They were previously around a third of this volume, which put them under
   * the music on anything but headphones; the loud ones sit at the ceiling the
   * sfx test enforces for sounds the player hears hundreds of times a session.
   */
  talk: [
    n(0.012, 3600, 0.055),
    p(0.042, 660, 0.155, { duty: 0.25, to: 590 }),
    t(0.055, 220, 0.12),
  ],
  talk_low: [
    n(0.014, 1200, 0.06),
    p(0.050, 392, 0.155, { duty: 0.5, to: 350 }),
    t(0.070, 131, 0.13),
  ],
  // The only one that rises, which is what makes it read as young and eager
  // rather than as the normal voice transposed up.
  talk_high: [
    n(0.010, 5200, 0.05),
    p(0.036, 988, 0.15, { duty: 0.125, to: 1046 }),
    t(0.040, 494, 0.09),
  ],
  // No pulse at all: a triangle has no square edge, and the noise is breath
  // rather than a consonant.
  talk_soft: [
    n(0.020, 2400, 0.045),
    t(0.055, 523, 0.14),
    t(0.075, 262, 0.10),
  ],
  // Heard only on an exclamation mark, so it can be as loud as the library
  // allows. Two pulses a fifth apart, both climbing, over a rising bass.
  talk_shout: [
    n(0.020, 2000, 0.12),
    p(0.090, 660, 0.22, { duty: 0.5, to: 880 }),
    p(0.090, 990, 0.11, { at: 0.015, duty: 0.25, to: 1320 }),
    t(0.110, 165, 0.16, { to: 220 }),
  ],
  // A question lifts, it does not shout. Same rising shape as `talk_shout` with
  // the force taken out and the length left in.
  talk_ask: [
    n(0.012, 3000, 0.05),
    p(0.085, 620, 0.17, { duty: 0.25, to: 860 }),
    t(0.100, 247, 0.12, { to: 330 }),
  ],
};

/**
 * `heal` is the older, vaguer name for the completion cue, kept pointing at the
 * same recipe so a caller that reaches for the obvious word gets the right
 * sound rather than silence. New code should say which half it means:
 * `heal_cycle` while the party is being seen to, `heal_done` when it is over.
 */
SFX.heal = SFX.heal_done!;

/** Every id the library knows, for tests and for the debug sound browser. */
export const SFX_IDS = Object.keys(SFX);
