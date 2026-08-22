/**
 * Chiptune synthesis.
 *
 * Four voices modelled on the sound hardware of the era: two pulse channels
 * with selectable duty, one triangle for bass, and one noise channel for
 * percussion. Everything is generated at runtime, so the whole soundtrack and
 * every sound effect costs zero bytes of assets and stays perfectly in the
 * original idiom.
 */

export type VoiceKind = 'pulse' | 'triangle' | 'noise';

/** Semitone offsets within an octave. */
const NOTE_OFFSETS: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5,
  'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
};

/** "A4" -> 440. Returns 0 for a rest. */
export function noteToHz(note: string): number {
  if (!note || note === '-' || note === 'r') return 0;
  const m = /^([A-G][#b]?)(-?\d)$/.exec(note);
  if (!m) return 0;
  const semitone = NOTE_OFFSETS[m[1]!];
  if (semitone === undefined) return 0;
  const octave = Number(m[2]);
  const midi = (octave + 1) * 12 + semitone;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * A pulse wave at a given duty cycle, built as a PeriodicWave. Duty is what
 * separates a thin lead from a fat one, and it is the single most recognisable
 * knob on this kind of hardware.
 */
export function makePulseWave(ctx: BaseAudioContext, duty: number, harmonics = 32): PeriodicWave {
  const real = new Float32Array(harmonics);
  const imag = new Float32Array(harmonics);
  for (let n = 1; n < harmonics; n++) {
    // Fourier series for a rectangular wave of the given duty cycle.
    imag[n] = (2 / (n * Math.PI)) * Math.sin(Math.PI * n * duty);
  }
  return ctx.createPeriodicWave(real, imag, { disableNormalization: false });
}

/** White noise buffer, reused by every percussive hit. */
export function makeNoiseBuffer(ctx: BaseAudioContext, seconds = 1): AudioBuffer {
  const rate = ctx.sampleRate;
  const buffer = ctx.createBuffer(1, Math.max(1, Math.floor(rate * seconds)), rate);
  const data = buffer.getChannelData(0);
  // A simple LFSR keeps it closer to chip noise than Math.random alone.
  let reg = 0x7fff;
  for (let i = 0; i < data.length; i++) {
    const bit = ((reg ^ (reg >> 1)) & 1);
    reg = (reg >> 1) | (bit << 14);
    data[i] = (reg & 1) ? 0.6 : -0.6;
  }
  return buffer;
}

export interface NoteOptions {
  /** Seconds from now (in AudioContext time) at which to start. */
  at: number;
  duration: number;
  frequency: number;
  volume: number;
  kind: VoiceKind;
  duty?: number;
  /** Slide to this frequency over the note, for cries and effects. */
  glideTo?: number;
  /** Fraction of the note spent in attack, 0..0.5. */
  attack?: number;
  /** Vibrato depth in cents. */
  vibrato?: number;
  /** Detune in cents for a doubled voice; 0 disables the second oscillator. */
  detune?: number;
  /** Opt a music note out of the automatic late vibrato. */
  noAutoVibrato?: boolean;
}

export class Synth {
  readonly ctx: AudioContext;
  readonly master: GainNode;
  private musicBus: GainNode;
  private sfxBus: GainNode;
  private pulseWaves = new Map<number, PeriodicWave>();
  private noise: AudioBuffer;
  private closed = false;
  /** Echo send, fed from the music bus only. */
  private delaySend: GainNode | null = null;

  constructor() {
    const Ctor = (window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.85;

    // A soft limiter across the whole output. Four chip voices stacking on a
    // strong beat will clip an unprotected master, and clipping on square waves
    // is unpleasant in a way it is not on richer material. This also lets the
    // overall level sit higher without ever going harsh.
    const glue = this.ctx.createDynamicsCompressor();
    glue.threshold.value = -12;
    glue.knee.value = 12;
    glue.ratio.value = 6;
    glue.attack.value = 0.004;
    glue.release.value = 0.12;
    this.master.connect(glue);
    glue.connect(this.ctx.destination);

    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = 0.7;
    this.musicBus.connect(this.master);

    this.sfxBus = this.ctx.createGain();
    this.sfxBus.gain.value = 0.8;
    this.sfxBus.connect(this.master);

    // Dotted-eighth echo on the music only. This is the single biggest step
    // from "beeping" to "produced": the original hardware faked it by writing
    // the repeats into the pattern by hand, which cost a whole channel.
    // The feedback path is filtered so repeats fall away into the background
    // instead of piling brightness on top of the melody.
    const send = this.ctx.createGain();
    send.gain.value = 0.20;
    const delay = this.ctx.createDelay(1.0);
    delay.delayTime.value = 0.26;
    const feedback = this.ctx.createGain();
    feedback.gain.value = 0.30;
    const damp = this.ctx.createBiquadFilter();
    damp.type = 'lowpass';
    damp.frequency.value = 2400;

    this.musicBus.connect(send);
    send.connect(delay);
    delay.connect(damp);
    damp.connect(feedback);
    feedback.connect(delay);
    damp.connect(this.master);
    this.delaySend = send;

    this.noise = makeNoiseBuffer(this.ctx, 2);
  }

  get currentTime(): number {
    return this.ctx.currentTime;
  }

  /** Browsers require a gesture before audio starts. */
  async resume(): Promise<void> {
    if (this.closed) return;
    if (this.ctx.state === 'suspended') {
      try { await this.ctx.resume(); } catch { /* user has not interacted yet */ }
    }
  }

  /** Silence everything immediately, keeping the context alive. */
  async suspend(): Promise<void> {
    if (this.closed) return;
    if (this.ctx.state === 'running') {
      try { await this.ctx.suspend(); } catch { /* already gone */ }
    }
  }

  /**
   * Tear the audio graph down for good. Scheduled notes live in the audio
   * thread, so simply stopping the scheduler is not enough -- the context
   * itself has to be closed or a torn-down tab can keep sounding.
   */
  close(): void {
    if (this.closed) return;
    this.closed = true;
    try {
      this.master.disconnect();
      void this.ctx.close();
    } catch { /* nothing useful to do while the page is going away */ }
  }

  setMusicVolume(v: number): void {
    this.musicBus.gain.setTargetAtTime(Math.max(0, Math.min(1, v)), this.ctx.currentTime, 0.05);
  }

  setSfxVolume(v: number): void {
    this.sfxBus.gain.setTargetAtTime(Math.max(0, Math.min(1, v)), this.ctx.currentTime, 0.05);
  }

  private pulseWave(duty: number): PeriodicWave {
    const key = Math.round(duty * 100);
    let w = this.pulseWaves.get(key);
    if (!w) { w = makePulseWave(this.ctx, duty); this.pulseWaves.set(key, w); }
    return w;
  }

  /** Schedules one note. Returns the node so a caller can stop it early. */
  play(opts: NoteOptions, bus: 'music' | 'sfx' = 'music'): void {
    if (this.closed || this.ctx.state === 'closed') return;
    if (opts.frequency <= 0 && opts.kind !== 'noise') return;
    if (opts.volume <= 0 || opts.duration <= 0) return;

    const ctx = this.ctx;
    const dest = bus === 'music' ? this.musicBus : this.sfxBus;
    const gain = ctx.createGain();
    gain.connect(dest);

    const start = opts.at;
    const end = start + opts.duration;
    // A short attack and a hard-ish decay: chip envelopes are not gentle.
    const attack = Math.max(0.004, opts.duration * (opts.attack ?? 0.06));
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, opts.volume), start + attack);
    gain.gain.setValueAtTime(Math.max(0.0002, opts.volume), Math.max(start + attack, end - 0.03));
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    if (opts.kind === 'noise') {
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      // Percussion character comes from where the noise is filtered. Low
      // requests become a body-heavy thump, high ones a tight hat.
      const f = Math.max(120, opts.frequency || 2000);
      const filter = ctx.createBiquadFilter();
      if (f < 400) { filter.type = 'lowpass'; filter.Q.value = 1.1; }
      else if (f > 3000) { filter.type = 'highpass'; filter.Q.value = 0.7; }
      else { filter.type = 'bandpass'; filter.Q.value = 0.9; }
      filter.frequency.value = f;
      src.connect(filter);
      filter.connect(gain);
      src.start(start);
      src.stop(end + 0.02);
      return;
    }

    // The triangle carries the bass, and a raw triangle at low frequency is
    // all edge and no weight. Rolling the top off gives it a body that sits
    // under the pulses instead of fighting them.
    let sink: AudioNode = gain;
    if (opts.kind === 'triangle') {
      const warm = ctx.createBiquadFilter();
      warm.type = 'lowpass';
      warm.frequency.value = 1400;
      warm.Q.value = 0.4;
      warm.connect(gain);
      sink = warm;
    }

    const makeOsc = (detuneCents: number): OscillatorNode => {
      const osc = ctx.createOscillator();
      if (opts.kind === 'triangle') osc.type = 'triangle';
      else osc.setPeriodicWave(this.pulseWave(opts.duty ?? 0.5));
      osc.frequency.setValueAtTime(opts.frequency, start);
      if (detuneCents) osc.detune.setValueAtTime(detuneCents, start);
      if (opts.glideTo && opts.glideTo > 0) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.glideTo), end);
      }
      osc.connect(sink);
      osc.start(start);
      osc.stop(end + 0.02);
      return osc;
    };

    const osc = makeOsc(0);
    // A second voice a few cents off thickens a lead without muddying it.
    if (opts.detune && opts.detune > 0) makeOsc(opts.detune);

    // Vibrato. An explicit request applies from the first sample; otherwise a
    // held music note picks up a slow wobble once it has been sounding for a
    // while, which is what stops long notes sounding like a test tone.
    const auto = bus === 'music' && !opts.noAutoVibrato && !opts.vibrato
      && opts.duration > 0.30 && !opts.glideTo;
    const depth = opts.vibrato && opts.vibrato > 0 ? opts.vibrato : (auto ? 22 : 0);
    if (depth > 0) {
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = auto ? 5.2 : 6;
      const cents = opts.frequency * (depth / 1200);
      if (auto) {
        lfoGain.gain.setValueAtTime(0.0001, start);
        lfoGain.gain.setValueAtTime(0.0001, start + opts.duration * 0.4);
        lfoGain.gain.linearRampToValueAtTime(cents, Math.min(end, start + opts.duration * 0.75));
      } else {
        lfoGain.gain.value = cents;
      }
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start(start);
      lfo.stop(end + 0.02);
    }
  }

  /** How much of the music bus is fed to the echo, 0..1. */
  setEcho(amount: number): void {
    this.delaySend?.gain.setTargetAtTime(
      Math.max(0, Math.min(0.6, amount)), this.ctx.currentTime, 0.05);
  }
}
