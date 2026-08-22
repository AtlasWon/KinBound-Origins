/**
 * Audio manager.
 *
 * Owns the synth, the music scheduler and the sound-effect table. Music is
 * data: a track is a tempo plus four channel patterns, so writing a new town
 * theme means editing JSON, exactly like every other kind of content here.
 *
 * The scheduler uses the standard lookahead pattern -- a coarse timer that
 * queues notes a short way into the future against the audio clock -- because
 * scheduling from the render loop produces audible jitter.
 */

import { SFX } from './sfx.js';
import { Synth, noteToHz, type VoiceKind } from './synth.js';
import { Rng } from '../core/rng.js';

export interface TrackChannel {
  voice: VoiceKind;
  duty?: number;
  volume?: number;
  /** Space-separated `NOTE:DURATION` tokens; `-` is a rest. Duration is in steps. */
  pattern: string;
  /** Semitone transposition applied to the whole channel. */
  transpose?: number;
  /** Cents of detune for a doubled voice. Thickens a lead; leave off a bass. */
  detune?: number;
}

export interface TrackData {
  id: string;
  /** Steps per minute; one step is a sixteenth note at 4 steps per beat. */
  tempo: number;
  loop?: boolean;
  channels: TrackChannel[];
}

export interface ParsedNote {
  hz: number;
  steps: number;
}

interface LiveChannel {
  cfg: TrackChannel;
  notes: ParsedNote[];
  index: number;
  /** Step index at which the next note begins. */
  nextStep: number;
}

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD = 0.15;

export class AudioManager {
  private synth: Synth | null = null;
  private tracks = new Map<string, TrackData>();

  private current?: TrackData;
  private channels: LiveChannel[] = [];
  private stepDuration = 0.125;
  private nextNoteTime = 0;
  private currentStep = 0;
  private timer: number | null = null;
  private started = false;
  private pendingTrack: string | null = null;
  private previousTrack: string | null = null;

  musicVolume = 0.7;
  sfxVolume = 0.8;

  /** Set once the page is going away; nothing may start sounding after this. */
  private shutDown = false;
  /**
   * Silence for the whole session.
   *
   * Distinct from turning the volume down: this stops the AudioContext being
   * created at all, so nothing is scheduled and no hardware is touched. It
   * exists for automated runs -- a test harness that opens the game every few
   * minutes and starts playing music over whatever you are listening to is a
   * genuinely hostile thing to have on your machine.
   */
  private disabled = false;
  /** Remembers what was playing across a tab-hidden pause. */
  private pausedTrack: string | null = null;
  private lifecycleBound = false;

  /** Created lazily: constructing an AudioContext before a gesture is refused. */
  private ensure(): Synth | null {
    if (this.shutDown || this.disabled) return null;
    if (this.synth) return this.synth;
    try {
      this.bindLifecycle();
      this.synth = new Synth();
      this.synth.setMusicVolume(this.musicVolume);
      this.synth.setSfxVolume(this.sfxVolume);
      return this.synth;
    } catch (e) {
      console.warn('audio unavailable', e);
      return null;
    }
  }

  /**
   * Ties the audio graph to the page's lifecycle.
   *
   * Two separate problems are handled here. A *hidden* tab (switched away,
   * minimised) should go quiet and come back where it left off -- browsers keep
   * timers running, so without this the music plays on to an empty room. A
   * *closing* tab must tear the context down outright: notes are scheduled up
   * to a moment ahead on the audio thread, and stopping only the scheduler can
   * leave those last notes sounding after the page is gone.
   */
  private bindLifecycle(): void {
    if (this.lifecycleBound || typeof window === 'undefined') return;
    this.lifecycleBound = true;

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.pauseForHidden();
      else this.resumeFromHidden();
    });

    // pagehide covers closing, navigating away and going into the back/forward
    // cache; unload alone is unreliable and does not fire on mobile at all.
    const kill = () => this.shutdown();
    window.addEventListener('pagehide', kill);
    window.addEventListener('beforeunload', kill);
  }

  /** Silence while the tab is in the background, remembering the track. */
  pauseForHidden(): void {
    if (!this.synth || this.shutDown) return;
    this.pausedTrack = this.current?.id ?? null;
    this.stopMusic();
    void this.synth.suspend();
  }

  resumeFromHidden(): void {
    if (!this.synth || this.shutDown) return;
    void this.synth.resume().then(() => {
      if (this.pausedTrack) {
        const id = this.pausedTrack;
        this.pausedTrack = null;
        this.playMusic(id);
      }
    });
  }

  /** Permanent teardown. Called when the page is going away. */
  shutdown(): void {
    if (this.shutDown) return;
    this.shutDown = true;
    this.stopMusic();
    this.synth?.close();
    this.synth = null;
  }

  /** Silence everything for this session. Cannot be undone; that is the point. */
  disable(): void {
    this.disabled = true;
    this.stopMusic();
    this.synth?.close();
    this.synth = null;
  }

  /** True when audio has been switched off for the session. */
  get isDisabled(): boolean {
    return this.disabled;
  }

  /** Call from any real input event; browsers unlock audio only after one. */
  unlock(): void {
    const s = this.ensure();
    if (!s) return;
    void s.resume().then(() => {
      if (this.pendingTrack) {
        const id = this.pendingTrack;
        this.pendingTrack = null;
        this.playMusic(id);
      }
    });
  }

  loadTracks(tracks: TrackData[]): void {
    for (const t of tracks) this.tracks.set(t.id, t);
  }

  setVolumes(music: number, sfx: number): void {
    this.musicVolume = music;
    this.sfxVolume = sfx;
    this.synth?.setMusicVolume(music);
    this.synth?.setSfxVolume(sfx);
  }

  /* --------------------------------------------------------------- music */

  playMusic(id: string): void {
    if (this.shutDown) return;
    if (this.current?.id === id && this.started) return;
    const track = this.tracks.get(id);
    if (!track) return;

    const s = this.ensure();
    if (!s || s.ctx.state === 'suspended') {
      // Remember what should be playing and start it once audio unlocks.
      this.pendingTrack = id;
      this.current = track;
      return;
    }

    this.previousTrack = this.current?.id ?? null;
    this.current = track;
    this.stepDuration = 60 / Math.max(20, track.tempo) / 4;
    this.channels = track.channels.map((cfg) => ({
      cfg,
      notes: parsePattern(cfg.pattern, cfg.transpose ?? 0),
      index: 0,
      nextStep: 0,
    }));
    this.nextNoteTime = s.currentTime + 0.05;
    this.currentStep = 0;
    this.started = true;
    this.startTimer();
  }

  /** Return to whatever was playing before the current track. */
  resumePrevious(): void {
    if (this.previousTrack) this.playMusic(this.previousTrack);
  }

  stopMusic(): void {
    this.started = false;
    this.current = undefined;
    this.channels = [];
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private startTimer(): void {
    if (this.timer !== null) return;
    this.timer = window.setInterval(() => this.schedule(), LOOKAHEAD_MS);
  }

  /**
   * Walks the song one step at a time. Each channel keeps its own `nextStep`,
   * so channels with different note lengths stay in sync instead of drifting --
   * a bass line of whole notes and a lead of sixteenths share one clock.
   */
  private schedule(): void {
    const s = this.synth;
    if (!s || !this.started || !this.current) return;

    const horizon = s.currentTime + SCHEDULE_AHEAD;
    let guard = 0;

    while (this.nextNoteTime < horizon && guard++ < 512) {
      let anyLive = false;

      for (const ch of this.channels) {
        if (ch.notes.length === 0) continue;
        if (ch.nextStep > this.currentStep) { anyLive = true; continue; }

        if (ch.index >= ch.notes.length) {
          if (this.current.loop === false) continue;
          ch.index = 0;
        }
        anyLive = true;

        const note = ch.notes[ch.index]!;
        if (note.hz > 0 || ch.cfg.voice === 'noise') {
          s.play({
            at: this.nextNoteTime,
            duration: note.steps * this.stepDuration * 0.9,
            frequency: note.hz,
            volume: ch.cfg.volume ?? 0.2,
            kind: ch.cfg.voice,
            duty: ch.cfg.duty,
            detune: ch.cfg.detune,
          }, 'music');
        }
        ch.index++;
        ch.nextStep = this.currentStep + note.steps;
      }

      if (!anyLive) { this.stopMusic(); return; }

      this.currentStep++;
      this.nextNoteTime += this.stepDuration;
    }
  }

  /* ----------------------------------------------------------------- sfx */

  /**
   * Play a named effect from the library.
   *
   * `pitch` multiplies every layer's frequency, which is what lets one talk
   * blip cover a whole cast, and `volume` scales the whole stack so a sound
   * the player hears constantly can be ducked without editing the recipe.
   */
  playSfx(id: string, opts: { pitch?: number; volume?: number } = {}): void {
    if (this.shutDown) return;
    const s = this.ensure();
    if (!s || s.ctx.state === 'suspended') return;

    const recipe = SFX[id];
    if (!recipe) return;

    const pitch = opts.pitch ?? 1;
    const gain = opts.volume ?? 1;
    const t = s.currentTime;
    for (const l of recipe) {
      s.play({
        at: t + (l.at ?? 0),
        duration: l.dur,
        frequency: l.freq * pitch,
        glideTo: l.to === undefined ? undefined : l.to * pitch,
        volume: l.vol * gain,
        kind: l.kind,
        duty: l.duty,
        vibrato: l.vibrato,
      }, 'sfx');
    }
  }

  /**
   * A speaker's voice blip, used once every few characters while text reveals.
   *
   * Deriving the pitch from the speaker's name means every character has a
   * consistent voice across the whole game for free, and it is the cheapest
   * thing that makes dialogue feel spoken rather than printed.
   */
  playVoice(speaker: string | undefined, shouting = false): void {
    if (this.shutDown) return;
    if (shouting) { this.playSfx('talk_shout'); return; }

    const name = speaker ?? '';
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
    h = Math.abs(h);

    // Three timbres, and a pitch offset inside each, gives a wide enough cast
    // that two people in the same room rarely sound the same.
    const base = ['talk_low', 'talk', 'talk_high'][h % 3]!;
    const semitones = ((h >> 3) % 7) - 3;
    this.playSfx(base, { pitch: Math.pow(2, semitones / 12) });
  }

  /* --------------------------------------------------------------- cries */

  /**
   * Every species gets a short, recognisable cry generated from its id, so a
   * roster of two hundred creatures needs no recordings and each one still
   * sounds like itself every time.
   */
  playCry(speciesId: string, pitchScale = 1): void {
    if (this.shutDown) return;
    const s = this.ensure();
    if (!s || s.ctx.state === 'suspended') return;
    const rng = new Rng(`cry:${speciesId}`);
    const t = s.currentTime;

    const base = (140 + rng.below(360)) * pitchScale;
    const segments = 2 + rng.below(3);
    const kind: VoiceKind = rng.chance(70) ? 'pulse' : 'triangle';
    const duty = [0.125, 0.25, 0.5][rng.below(3)]!;

    let at = t;
    for (let i = 0; i < segments; i++) {
      const dur = 0.07 + rng.next() * 0.1;
      const from = base * Math.pow(2, (rng.int(-5, 7)) / 12);
      const to = from * Math.pow(2, (rng.int(-7, 7)) / 12);
      s.play({
        at, duration: dur, frequency: from, glideTo: to,
        volume: 0.2, kind, duty, vibrato: rng.chance(40) ? 40 : 0,
        attack: 0.05,
      }, 'sfx');
      at += dur * 0.9;
    }
    // A touch of noise gives the cry some body without muddying it.
    if (rng.chance(45)) {
      s.play({ at: t, duration: 0.06, frequency: base * 4, volume: 0.06, kind: 'noise' }, 'sfx');
    }
  }
}

/* -------------------------------------------------------------- parsing */

export function parsePattern(pattern: string, transpose: number): ParsedNote[] {
  const out: ParsedNote[] = [];
  for (const token of pattern.trim().split(/\s+/)) {
    if (!token) continue;
    const [noteRaw, durRaw] = token.split(':');
    const steps = Math.max(1, Number(durRaw ?? 1) || 1);
    const note = noteRaw ?? '-';
    let hz = noteToHz(note);
    if (hz > 0 && transpose) hz *= Math.pow(2, transpose / 12);
    out.push({ hz, steps });
  }
  return out;
}

export const audio = new AudioManager();
