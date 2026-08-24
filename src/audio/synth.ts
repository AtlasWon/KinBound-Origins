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

/**
 * Amplitude shapes.
 *
 * `flat` is the music envelope: rise, hold, drop at the end. It is the wrong
 * shape for anything that is supposed to have been *struck* -- a rectangle of
 * gain is the difference between a beep and a hit, and no amount of choosing
 * clever frequencies rescues it.
 *
 * `perc` is the struck shape: the peak arrives in a couple of milliseconds and
 * then falls away exponentially, which is what every real impact does and what
 * the ear reads as force. `curve` sets how fast, as a fraction of the note --
 * small for a crack that stops dead, large for a ring that hangs on.
 *
 * `swell` is the opposite: no transient at all, an arrival. Wind, a wash of
 * water, a rising hiss -- things that were already happening when you noticed.
 */
export type EnvShape = 'flat' | 'perc' | 'swell';

export interface NoteOptions {
  /** Seconds from now (in AudioContext time) at which to start. */
  at: number;
  duration: number;
  frequency: number;
  volume: number;
  kind: VoiceKind;
  duty?: number;
  /**
   * Slide to this frequency over the note, for cries and effects. On a noise
   * voice this sweeps the filter instead of a pitch, which is how a swoosh
   * opens up and a crash darkens as it falls away.
   */
  glideTo?: number;
  /** Fraction of the note spent in attack, 0..0.5. */
  attack?: number;
  /** Amplitude shape; defaults to `flat`. */
  env?: EnvShape;
  /** Decay rate for `perc`/`swell`, as a fraction of the note. Default 0.25. */
  curve?: number;
  /** Resonance of the noise filter. High values ring; low ones just colour. */
  noiseQ?: number;
  /** Lowpass cutoff in Hz applied to a pitched voice, to take the edge off. */
  tone?: number;
  /** Vibrato depth in cents. */
  vibrato?: number;
  /** Detune in cents for a doubled voice; 0 disables the second oscillator. */
  detune?: number;
  /** Opt a music note out of the automatic late vibrato. */
  noAutoVibrato?: boolean;
}

/** Everything a voice needs beyond the note itself. */
export interface VoiceEnv {
  noise: AudioBuffer;
  wave(duty: number): PeriodicWave;
  /** Long held notes pick up a wobble; only music wants that. */
  autoVibrato: boolean;
}

const FLOOR = 0.0001;

/**
 * Writes one note's amplitude envelope onto a gain node.
 *
 * Kept separate because this is the single most consequential function in the
 * audio code: the same layers with a struck envelope instead of a held one are
 * a different sound effect, and it is far easier to reason about the shapes
 * when they sit next to each other.
 */
export function applyEnvelope(gain: GainNode, opts: NoteOptions, start: number, end: number): void {
  const g = gain.gain;
  const dur = Math.max(0.001, end - start);
  const peak = Math.max(0.0002, opts.volume);
  const env = opts.env ?? 'flat';

  if (env === 'flat') {
    const attack = Math.max(0.004, dur * (opts.attack ?? 0.06));
    g.setValueAtTime(FLOOR, start);
    g.exponentialRampToValueAtTime(peak, start + attack);
    g.setValueAtTime(peak, Math.max(start + attack, end - 0.03));
    g.exponentialRampToValueAtTime(FLOOR, end);
    return;
  }

  // Attack: a couple of milliseconds for a strike, a good part of the note for
  // a swell. Linear, not exponential -- an exponential rise to a peak two
  // milliseconds away is a click, and a click is not a transient.
  const atkFrac = opts.attack ?? (env === 'swell' ? 0.34 : 0);
  const attack = env === 'swell'
    ? Math.max(0.01, dur * atkFrac)
    : Math.max(0.0015, Math.min(dur * 0.35, atkFrac > 0 ? dur * atkFrac : 0.0025));
  const rise = start + attack;

  g.setValueAtTime(FLOOR, start);
  g.linearRampToValueAtTime(peak, rise);

  // A few milliseconds at the top before the fall begins. Still far too short
  // to hear as a note, but a two-millisecond spike and nothing else measures --
  // and sounds -- ten decibels quieter than the same layers held flat, which is
  // how the first pass at this made every impact in the game recede.
  const hold = env === 'swell' ? 0 : Math.min(0.007, dur * 0.09);
  const peakAt = rise + hold;
  if (hold > 0) g.setValueAtTime(peak, peakAt);

  // The decay. setTargetAtTime is a true exponential fall, so the loud part is
  // short and the tail is long -- which is what a struck thing sounds like.
  const tau = Math.max(0.006, dur * (opts.curve ?? (env === 'swell' ? 0.3 : 0.25)));
  g.setTargetAtTime(0, peakAt, tau);

  // Land on exact silence. The exponential never reaches zero, and a note that
  // is cut off while still audible ticks; pinning the curve's own value a few
  // milliseconds out and ramping from there is silent either way.
  const tail = Math.max(peakAt + 0.001, end - 0.006);
  g.setValueAtTime(peak * Math.exp(-(tail - peakAt) / tau), tail);
  g.linearRampToValueAtTime(0, end);
}

/**
 * Builds and schedules a single voice into `dest`.
 *
 * Free-standing rather than a method so the offline scope in tools/shots can
 * render the exact same graph into an OfflineAudioContext and photograph the
 * result. A sound nobody can look at is a sound nobody can fix.
 */
export function renderNote(
  ctx: BaseAudioContext, dest: AudioNode, opts: NoteOptions, env: VoiceEnv,
): void {
  if (opts.frequency <= 0 && opts.kind !== 'noise') return;
  if (opts.volume <= 0 || opts.duration <= 0) return;

  const gain = ctx.createGain();
  gain.connect(dest);

  const start = opts.at;
  const end = start + opts.duration;
  applyEnvelope(gain, opts, start, end);

  if (opts.kind === 'noise') {
    const src = ctx.createBufferSource();
    src.buffer = env.noise;
    src.loop = true;
    // Percussion character comes from where the noise is filtered. Low
    // requests become a body-heavy thump, high ones a tight hat.
    const f = Math.max(120, opts.frequency || 2000);
    const filter = ctx.createBiquadFilter();
    if (opts.noiseQ !== undefined) {
      // An explicit Q means the caller wants the filter heard as a resonance:
      // bandpass whatever the frequency, so metal rings and stone knocks.
      filter.type = 'bandpass';
      filter.Q.value = opts.noiseQ;
    } else if (f < 400) { filter.type = 'lowpass'; filter.Q.value = 1.1; }
    else if (f > 3000) { filter.type = 'highpass'; filter.Q.value = 0.7; }
    else { filter.type = 'bandpass'; filter.Q.value = 0.9; }
    filter.frequency.setValueAtTime(f, start);
    // A moving filter is the whole difference between a hiss and a swoosh.
    if (opts.glideTo && opts.glideTo > 0) {
      filter.frequency.exponentialRampToValueAtTime(
        Math.max(60, Math.min(20000, opts.glideTo)), end);
    }
    src.connect(filter);
    if (opts.noiseQ !== undefined && opts.noiseQ > 1) {
      // A narrow band passes only a sliver of the noise's energy, so a ring
      // written at the same level as a crack is inaudible next to it. Amplitude
      // through a bandpass goes with the square root of its bandwidth, so undo
      // exactly that and the number in the recipe means what it says.
      const comp = ctx.createGain();
      comp.gain.value = Math.min(4.5, Math.sqrt(opts.noiseQ));
      filter.connect(comp);
      comp.connect(gain);
    } else {
      filter.connect(gain);
    }
    src.start(start);
    src.stop(end + 0.02);
    return;
  }

  // The triangle carries the bass, and a raw triangle at low frequency is
  // all edge and no weight. Rolling the top off gives it a body that sits
  // under the pulses instead of fighting them.
  let sink: AudioNode = gain;
  const cutoff = opts.tone ?? (opts.kind === 'triangle' ? 1400 : 0);
  if (cutoff > 0) {
    const warm = ctx.createBiquadFilter();
    warm.type = 'lowpass';
    warm.frequency.value = cutoff;
    warm.Q.value = 0.4;
    warm.connect(gain);
    sink = warm;
  }

  const makeOsc = (detuneCents: number): OscillatorNode => {
    const osc = ctx.createOscillator();
    if (opts.kind === 'triangle') osc.type = 'triangle';
    else osc.setPeriodicWave(env.wave(opts.duty ?? 0.5));
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
  const auto = env.autoVibrato && !opts.noAutoVibrato && !opts.vibrato
    && opts.duration > 0.30 && !opts.glideTo;
  const depth = opts.vibrato && opts.vibrato > 0 ? opts.vibrato : (auto ? 22 : 0);
  if (depth > 0) {
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = auto ? 5.2 : 6;
    const cents = opts.frequency * (depth / 1200);
    if (auto) {
      lfoGain.gain.setValueAtTime(FLOOR, start);
      lfoGain.gain.setValueAtTime(FLOOR, start + opts.duration * 0.4);
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

  /** Schedules one note. */
  play(opts: NoteOptions, bus: 'music' | 'sfx' = 'music'): void {
    if (this.closed || this.ctx.state === 'closed') return;
    renderNote(this.ctx, bus === 'music' ? this.musicBus : this.sfxBus, opts, {
      noise: this.noise,
      wave: (duty) => this.pulseWave(duty),
      autoVibrato: bus === 'music',
    });
  }

  /** How much of the music bus is fed to the echo, 0..1. */
  setEcho(amount: number): void {
    this.delaySend?.gain.setTargetAtTime(
      Math.max(0, Math.min(0.6, amount)), this.ctx.currentTime, 0.05);
  }
}
