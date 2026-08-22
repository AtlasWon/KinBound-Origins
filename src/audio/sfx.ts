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

  select: [p(0.05, 880, 0.16, { duty: 0.25 })],
  confirm: [
    p(0.045, 660, 0.18),
    p(0.07, 990, 0.18, { at: 0.045 }),
  ],
  cancel: [p(0.08, 440, 0.17, { to: 260 })],
  menu_open: [
    p(0.04, 520, 0.13, { duty: 0.25 }),
    p(0.06, 780, 0.13, { at: 0.035, duty: 0.25 }),
    n(0.05, 3200, 0.04),
  ],
  menu_close: [
    p(0.05, 700, 0.13, { duty: 0.25 }),
    p(0.07, 430, 0.13, { at: 0.04, duty: 0.25 }),
  ],
  page_turn: [n(0.06, 2200, 0.05), p(0.05, 1300, 0.07, { at: 0.02, duty: 0.125 })],
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

  hit: [
    n(0.07, 1100, 0.15),
    t(0.11, 180, 0.12, { to: 120 }),
    p(0.05, 520, 0.07, { to: 380, duty: 0.25 }),
  ],
  hit_super: [
    n(0.05, 6000, 0.13),
    n(0.16, 1400, 0.2),
    t(0.20, 150, 0.16, { to: 70 }),
    p(0.13, 700, 0.12, { at: 0.02, to: 1500, duty: 0.125 }),
  ],
  hit_weak: [
    n(0.06, 380, 0.09),
    t(0.10, 130, 0.08, { to: 100 }),
    p(0.09, 320, 0.06, { to: 190, duty: 0.5 }),
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

  fx_hit: [n(0.08, 1100, 0.16), t(0.09, 160, 0.09, { to: 110 })],
  fx_heavy: [
    n(0.16, 500, 0.2),
    t(0.22, 110, 0.17, { to: 55 }),
    p(0.1, 260, 0.1, { to: 120, duty: 0.125 }),
  ],
  fx_fire: [
    n(0.34, 3000, 0.13),
    p(0.3, 340, 0.11, { to: 180, duty: 0.125 }),
    n(0.14, 900, 0.1, { at: 0.24 }),
  ],
  fx_water: [
    n(0.3, 2200, 0.11),
    p(0.24, 700, 0.11, { to: 380, duty: 0.25 }),
    n(0.16, 4200, 0.09, { at: 0.24 }),
  ],
  fx_spark: [
    n(0.06, 7000, 0.14),
    p(0.22, 1800, 0.15, { to: 320, duty: 0.125, vibrato: 90 }),
    n(0.16, 2400, 0.1, { at: 0.1 }),
  ],
  fx_frost: [
    p(0.3, 2400, 0.11, { to: 1500, duty: 0.125 }),
    n(0.14, 6000, 0.09, { at: 0.24 }),
    t(0.2, 300, 0.08, { at: 0.24, to: 220 }),
  ],
  fx_leaf: [
    n(0.28, 4600, 0.08),
    p(0.2, 900, 0.09, { to: 620, duty: 0.25 }),
  ],
  fx_quake: [
    t(0.5, 70, 0.2, { to: 40 }),
    n(0.5, 240, 0.14),
    n(0.18, 700, 0.11, { at: 0.34 }),
  ],
  fx_psy: [
    p(0.36, 500, 0.12, { to: 1400, duty: 0.125, vibrato: 60 }),
    p(0.36, 760, 0.09, { at: 0.05, to: 1800, duty: 0.125 }),
    n(0.14, 5200, 0.05, { at: 0.3 }),
  ],
  fx_iron: [
    n(0.06, 8000, 0.15),
    p(0.24, 2200, 0.13, { to: 700, duty: 0.125 }),
    t(0.24, 150, 0.13, { to: 90 }),
  ],
  fx_dark: [
    t(0.4, 160, 0.15, { to: 60 }),
    n(0.34, 420, 0.1),
    p(0.2, 300, 0.09, { at: 0.22, to: 140, duty: 0.5 }),
  ],
  fx_light: [
    p(0.42, 700, 0.13, { to: 2100, duty: 0.25 }),
    p(0.42, 1050, 0.1, { at: 0.04, to: 2600, duty: 0.25 }),
    n(0.2, 6000, 0.07, { at: 0.28 }),
  ],
  fx_spirit: [
    p(0.44, 420, 0.1, { to: 240, duty: 0.125, vibrato: 120 }),
    n(0.3, 1600, 0.05),
  ],
  fx_venom: [
    p(0.3, 260, 0.11, { to: 420, duty: 0.5, vibrato: 70 }),
    n(0.26, 1200, 0.07),
  ],
  fx_swarm: [
    n(0.4, 3400, 0.08),
    p(0.36, 1300, 0.07, { to: 1100, duty: 0.125, vibrato: 160 }),
  ],
  fx_wind: [n(0.36, 2600, 0.1), p(0.3, 800, 0.07, { to: 1500, duty: 0.125 })],
  fx_charge: [
    p(0.6, 200, 0.1, { to: 1200, duty: 0.125 }),
    n(0.6, 1400, 0.05),
  ],
  fx_heal: [
    ...[659, 831, 988].map((f, i) => t(0.12, f, 0.13, { at: i * 0.08 })),
  ],
  fx_buff: [...arp([523, 698, 880], 0.07, 0.09, 0.13)],
  fx_debuff: [...arp([740, 587, 466], 0.07, 0.1, 0.13)],
  fx_weather: [n(0.6, 1800, 0.09), t(0.6, 120, 0.08, { to: 90 })],

  /* -------------------------------------------------------------- talk */

  // Voice blips. Pitch is varied per speaker at call time; these are the base.
  talk: [p(0.028, 620, 0.075, { duty: 0.25 })],
  talk_low: [p(0.032, 380, 0.08, { duty: 0.5 })],
  talk_high: [p(0.026, 900, 0.065, { duty: 0.125 })],
  talk_soft: [t(0.03, 520, 0.07)],
  talk_shout: [p(0.05, 700, 0.13, { duty: 0.5, to: 820 })],
};

/** Every id the library knows, for tests and for the debug sound browser. */
export const SFX_IDS = Object.keys(SFX);
