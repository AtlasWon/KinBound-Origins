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
 *    anything they hear once a session can be longer and louder.
 *
 * "Quiet" means restrained, not inaudible, and that is a distinction this file
 * once got wrong: the blips and ticks were set so low they vanished under the
 * music. A sound the player hears constantly still has to be *heard*, so the
 * ones under a volume ceiling buy their presence with layers -- a transient in
 * front and a little body underneath -- rather than with gain.
 */

import type { VoiceKind } from './synth.js';

export interface SfxLayer {
  /** Offset from the trigger, in seconds. */
  at?: number;
  dur: number;
  freq: number;
  /** Glide target; a fall reads as failure, a rise as success. */
  to?: number;
  vol: number;
  kind: VoiceKind;
  duty?: number;
  vibrato?: number;
}

/** Shorthand so the table below stays readable. */
const p = (dur: number, freq: number, vol: number, extra: Partial<SfxLayer> = {}): SfxLayer =>
  ({ dur, freq, vol, kind: 'pulse', duty: 0.5, ...extra });
const t = (dur: number, freq: number, vol: number, extra: Partial<SfxLayer> = {}): SfxLayer =>
  ({ dur, freq, vol, kind: 'triangle', ...extra });
const n = (dur: number, freq: number, vol: number, extra: Partial<SfxLayer> = {}): SfxLayer =>
  ({ dur, freq, vol, kind: 'noise', ...extra });

/** An arpeggio, the workhorse of every jingle on this hardware. */
const arp = (freqs: number[], step: number, dur: number, vol: number, extra: Partial<SfxLayer> = {}): SfxLayer[] =>
  freqs.map((f, i) => p(dur, f, vol, { at: i * step, duty: 0.25, ...extra }));

export const SFX: Record<string, SfxLayer[]> = {

  /* ------------------------------------------------------------- menus */

  // A cursor tick has a hard ceiling on volume -- it fires many times a minute
  // -- so its crispness has to come from the transient instead: a needle of
  // high noise in front of the pulse reads as "sharp" at any level.
  select: [
    n(0.012, 5600, 0.09),
    p(0.038, 988, 0.15, { duty: 0.25, to: 1046 }),
    t(0.05, 494, 0.08),
  ],
  confirm: [
    n(0.014, 6000, 0.10),
    p(0.05, 784, 0.20, { duty: 0.25 }),
    p(0.09, 1175, 0.20, { at: 0.045, duty: 0.25 }),
    t(0.14, 392, 0.12, { at: 0.045 }),
  ],
  cancel: [
    n(0.02, 1400, 0.07),
    p(0.09, 494, 0.19, { to: 262, duty: 0.5 }),
    t(0.11, 165, 0.11, { to: 110 }),
  ],
  menu_open: [
    n(0.05, 3400, 0.07),
    p(0.035, 587, 0.16, { duty: 0.25 }),
    p(0.07, 880, 0.16, { at: 0.032, duty: 0.25 }),
    t(0.10, 220, 0.10, { at: 0.032 }),
  ],
  menu_close: [
    n(0.04, 2600, 0.06),
    p(0.04, 784, 0.16, { duty: 0.25 }),
    p(0.08, 466, 0.16, { at: 0.036, duty: 0.25 }),
    t(0.10, 175, 0.09, { at: 0.036 }),
  ],
  // Two noise bursts, bright then dull: the flick of the page and the settle
  // after it. One burst alone is a hiss, two are a sheet of paper.
  page_turn: [
    n(0.035, 4200, 0.12),
    n(0.06, 1600, 0.08, { at: 0.02 }),
    p(0.05, 1245, 0.13, { at: 0.015, duty: 0.125, to: 1568 }),
    t(0.09, 330, 0.08, { at: 0.015 }),
  ],
  tab: [p(0.04, 1046, 0.13, { duty: 0.125 }), p(0.04, 1318, 0.11, { at: 0.03, duty: 0.125 })],
  denied: [
    p(0.07, 300, 0.16, { duty: 0.5 }),
    p(0.11, 200, 0.16, { at: 0.07, duty: 0.5, to: 140 }),
  ],

  /* ------------------------------------------------------------- world */

  bump: [n(0.06, 160, 0.15), t(0.07, 90, 0.1)],
  step_grass: [n(0.05, 2600, 0.055)],
  step_stone: [n(0.04, 1400, 0.05), t(0.04, 150, 0.04)],
  step_dirt: [n(0.05, 1900, 0.05), t(0.05, 130, 0.045)],
  step_wood: [n(0.045, 900, 0.05), t(0.05, 190, 0.05)],
  step_sand: [n(0.07, 3600, 0.045)],
  step_water: [n(0.08, 1800, 0.06), p(0.07, 620, 0.04, { to: 900, duty: 0.125 })],
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
  item: [
    p(0.08, 784, 0.17, { duty: 0.25 }),
    p(0.14, 1175, 0.17, { at: 0.09, duty: 0.25 }),
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
  heal: [
    ...[523, 659, 784, 1047].map((f, i) => t(0.1, f, 0.15, { at: i * 0.09 })),
    t(0.4, 1047, 0.09, { at: 0.36 }),
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
    n(0.42, 900, 0.13, { to: 5200 }),
    p(0.42, 180, 0.12, { to: 1400, duty: 0.125 }),
    t(0.34, 90, 0.12, { at: 0.1, to: 300 }),
  ],
  send_out: [p(0.16, 500, 0.16, { to: 950, duty: 0.25 }), n(0.1, 2400, 0.05, { at: 0.12 })],
  withdraw: [p(0.16, 900, 0.15, { to: 420, duty: 0.25 }), n(0.08, 1800, 0.04)],
  faint: [
    p(0.55, 620, 0.18, { to: 62, duty: 0.25 }),
    t(0.55, 280, 0.12, { to: 38 }),
    n(0.10, 260, 0.07, { at: 0.46 }),
  ],
  flee: [
    n(0.22, 3000, 0.08),
    p(0.22, 900, 0.13, { to: 1800, duty: 0.125 }),
  ],
  crit: [
    n(0.04, 7000, 0.16),
    n(0.13, 2200, 0.13, { at: 0.02 }),
    p(0.18, 1900, 0.17, { to: 420, duty: 0.125 }),
    p(0.22, 2600, 0.08, { at: 0.05, to: 1300, duty: 0.125 }),
    t(0.24, 150, 0.16, { to: 60 }),
  ],
  miss: [n(0.14, 4000, 0.07), p(0.14, 700, 0.1, { to: 380, duty: 0.125 })],
  block: [n(0.07, 900, 0.12), t(0.14, 240, 0.12, { to: 200 })],
  stat_up: [...arp([523, 659, 880], 0.06, 0.08, 0.14)],
  stat_down: [...arp([880, 659, 494], 0.06, 0.09, 0.14)],
  exp_tick: [p(0.03, 1600, 0.05, { duty: 0.125 })],
  hp_low: [p(0.07, 1200, 0.1, { duty: 0.5 })],
  levelup: [
    ...arp([523, 659, 784, 1047, 1319], 0.07, 0.11, 0.17),
    p(0.42, 1568, 0.15, { at: 0.34, duty: 0.25 }),
    p(0.42, 1047, 0.09, { at: 0.34, duty: 0.5 }),
    t(0.5, 262, 0.12, { at: 0.32 }),
    n(0.22, 5200, 0.035, { at: 0.34 }),
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
   */
  hit: [
    n(0.02, 7000, 0.20),
    n(0.10, 1100, 0.22),
    n(0.16, 260, 0.16, { at: 0.01 }),
    t(0.22, 200, 0.19, { to: 90 }),
    p(0.07, 620, 0.10, { to: 300, duty: 0.25 }),
  ],
  hit_super: [
    n(0.025, 8600, 0.24),
    n(0.20, 1500, 0.26),
    n(0.30, 220, 0.20, { at: 0.02 }),
    t(0.36, 190, 0.24, { to: 48 }),
    p(0.20, 880, 0.16, { at: 0.02, to: 2100, duty: 0.125 }),
    p(0.30, 320, 0.11, { at: 0.06, to: 130, duty: 0.5 }),
    // A second, duller crack behind the first: debris, and the thing that
    // stops a big hit sounding like a loud small one.
    n(0.12, 3000, 0.14, { at: 0.14 }),
  ],
  // No bright crack at all. Absence is the clearest way to say "that barely
  // landed" -- a quieter version of `hit` just sounds further away.
  hit_weak: [
    n(0.05, 380, 0.14),
    n(0.08, 800, 0.09, { at: 0.015 }),
    t(0.18, 150, 0.14, { to: 85 }),
    p(0.13, 330, 0.09, { to: 180, duty: 0.5 }),
  ],

  vessel_throw: [p(0.16, 300, 0.17, { to: 800, duty: 0.25 }), n(0.06, 2600, 0.04, { at: 0.14 })],
  vessel_shake: [p(0.07, 520, 0.15, { duty: 0.125 }), n(0.04, 700, 0.05)],
  vessel_click: [n(0.05, 5200, 0.1), p(0.06, 1600, 0.12, { duty: 0.125 })],
  vessel_caught: [
    n(0.05, 5600, 0.09),
    ...arp([659, 831, 1109, 1319], 0.09, 0.12, 0.18),
    p(0.55, 1661, 0.14, { at: 0.36, duty: 0.25 }),
    t(0.6, 330, 0.11, { at: 0.34 }),
    n(0.3, 5000, 0.03, { at: 0.36 }),
  ],
  vessel_break: [n(0.12, 1800, 0.14), p(0.14, 700, 0.13, { to: 260, duty: 0.125 })],

  /* ---------------------------------------------------- move archetypes */

  /**
   * Every element gets the same three-part construction -- an attack transient,
   * a sustained middle that carries the element's character, and a tail that
   * says what the move left behind (crackle, spray, rubble, ringing). Skipping
   * the tail is what made these sound like they stopped rather than finished.
   */
  fx_hit: [
    n(0.02, 5000, 0.15),
    n(0.09, 1100, 0.17),
    t(0.14, 170, 0.13, { to: 100 }),
  ],
  fx_heavy: [
    n(0.03, 3000, 0.16),
    n(0.18, 420, 0.22),
    t(0.30, 105, 0.20, { to: 48 }),
    p(0.12, 240, 0.11, { to: 110, duty: 0.125 }),
    n(0.14, 900, 0.10, { at: 0.12 }),
  ],
  fx_fire: [
    n(0.06, 900, 0.16),
    n(0.40, 2600, 0.16),
    n(0.34, 300, 0.14, { at: 0.02 }),
    p(0.34, 380, 0.13, { to: 170, duty: 0.125 }),
    t(0.34, 140, 0.14, { to: 80 }),
    n(0.16, 1400, 0.12, { at: 0.30 }),
  ],
  fx_water: [
    n(0.05, 600, 0.14),
    n(0.34, 2000, 0.14),
    p(0.28, 780, 0.13, { to: 340, duty: 0.25 }),
    t(0.32, 200, 0.13, { to: 110 }),
    n(0.20, 4400, 0.12, { at: 0.28 }),
    // One rising droplet in the spray. A single pitched voice in a wash of
    // noise is what makes it water rather than static.
    p(0.12, 520, 0.08, { at: 0.30, to: 900, duty: 0.125 }),
  ],
  fx_spark: [
    n(0.03, 8000, 0.20),
    p(0.26, 1900, 0.18, { to: 300, duty: 0.125, vibrato: 110 }),
    p(0.22, 2700, 0.12, { at: 0.03, to: 520, duty: 0.125 }),
    n(0.22, 2400, 0.13, { at: 0.08 }),
    t(0.22, 160, 0.12, { at: 0.02, to: 70 }),
  ],
  fx_frost: [
    n(0.04, 5200, 0.12),
    p(0.32, 2500, 0.13, { to: 1400, duty: 0.125 }),
    // The second slide sits a few semitones under the first and lands at the
    // same time; two glides beating against each other is the shiver.
    p(0.32, 1900, 0.08, { at: 0.03, to: 1050, duty: 0.125 }),
    n(0.16, 6400, 0.11, { at: 0.26 }),
    t(0.24, 280, 0.11, { at: 0.24, to: 190 }),
  ],
  fx_leaf: [
    n(0.30, 4600, 0.11),
    n(0.10, 2200, 0.09, { at: 0.02 }),
    p(0.22, 940, 0.11, { to: 620, duty: 0.25 }),
    t(0.20, 190, 0.08, { at: 0.06, to: 130 }),
  ],
  fx_quake: [
    n(0.04, 2400, 0.13),
    t(0.60, 66, 0.24, { to: 36 }),
    n(0.55, 230, 0.17),
    t(0.34, 115, 0.15, { at: 0.18, to: 55 }),
    n(0.22, 700, 0.13, { at: 0.34 }),
    n(0.18, 1600, 0.09, { at: 0.42 }),
  ],
  fx_psy: [
    p(0.40, 480, 0.13, { to: 1500, duty: 0.125, vibrato: 70 }),
    p(0.40, 723, 0.10, { at: 0.05, to: 2260, duty: 0.125, vibrato: 40 }),
    t(0.34, 240, 0.10, { at: 0.04, to: 620 }),
    n(0.18, 5200, 0.07, { at: 0.30 }),
  ],
  fx_iron: [
    n(0.03, 9000, 0.18),
    n(0.10, 2600, 0.13, { at: 0.01 }),
    p(0.26, 2300, 0.14, { to: 720, duty: 0.125 }),
    p(0.26, 1730, 0.09, { at: 0.02, to: 540, duty: 0.125 }),
    t(0.26, 145, 0.15, { to: 85 }),
  ],
  fx_dark: [
    n(0.05, 300, 0.12),
    t(0.44, 150, 0.17, { to: 55 }),
    t(0.40, 224, 0.10, { at: 0.02, to: 82 }),
    n(0.36, 420, 0.11),
    p(0.24, 300, 0.10, { at: 0.22, to: 130, duty: 0.5, vibrato: 50 }),
  ],
  fx_light: [
    n(0.05, 7000, 0.10),
    p(0.44, 700, 0.14, { to: 2100, duty: 0.25 }),
    // A clean octave above, so the rise reads as radiant rather than as a siren.
    p(0.44, 1050, 0.11, { at: 0.04, to: 3150, duty: 0.25 }),
    t(0.40, 350, 0.11, { at: 0.02, to: 1050 }),
    n(0.24, 6000, 0.09, { at: 0.28 }),
  ],
  fx_spirit: [
    p(0.46, 420, 0.12, { to: 235, duty: 0.125, vibrato: 130 }),
    p(0.46, 628, 0.07, { at: 0.03, to: 350, duty: 0.125, vibrato: 90 }),
    t(0.40, 105, 0.11, { to: 70 }),
    n(0.32, 1600, 0.06),
  ],
  fx_venom: [
    n(0.05, 1800, 0.10),
    p(0.32, 260, 0.13, { to: 430, duty: 0.5, vibrato: 80 }),
    t(0.30, 130, 0.11, { at: 0.02, to: 200 }),
    n(0.28, 1200, 0.08, { at: 0.04 }),
  ],
  fx_swarm: [
    n(0.42, 3200, 0.10),
    n(0.36, 1400, 0.07, { at: 0.03 }),
    p(0.38, 1300, 0.09, { to: 1080, duty: 0.125, vibrato: 170 }),
    p(0.36, 660, 0.07, { at: 0.04, to: 560, duty: 0.125, vibrato: 200 }),
  ],
  fx_wind: [
    n(0.40, 2400, 0.13),
    n(0.22, 5000, 0.08, { at: 0.14 }),
    p(0.34, 800, 0.09, { to: 1600, duty: 0.125 }),
    t(0.30, 190, 0.08, { at: 0.04, to: 420 }),
  ],
  fx_charge: [
    p(0.62, 200, 0.12, { to: 1250, duty: 0.125 }),
    p(0.58, 300, 0.07, { at: 0.04, to: 1870, duty: 0.125 }),
    n(0.62, 1400, 0.07),
    t(0.50, 100, 0.09, { at: 0.06, to: 300 }),
  ],
  fx_heal: [
    ...[659, 831, 988].map((f, i) => t(0.14, f, 0.14, { at: i * 0.08 })),
    t(0.34, 330, 0.10, { at: 0.02 }),
    n(0.20, 6200, 0.05, { at: 0.14 }),
  ],
  fx_buff: [...arp([523, 698, 880], 0.07, 0.10, 0.14), t(0.26, 262, 0.10, { at: 0.12 })],
  fx_debuff: [...arp([740, 587, 466], 0.07, 0.11, 0.14), t(0.28, 233, 0.10, { at: 0.12 })],
  fx_weather: [
    n(0.62, 1800, 0.11),
    n(0.34, 4200, 0.06, { at: 0.24 }),
    t(0.62, 120, 0.10, { to: 85 }),
    p(0.40, 300, 0.06, { at: 0.10, to: 220, duty: 0.125, vibrato: 40 }),
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

/** Every id the library knows, for tests and for the debug sound browser. */
export const SFX_IDS = Object.keys(SFX);
