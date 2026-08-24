/**
 * Sound-effect oscilloscope.
 *
 * Nobody can listen to a sound in a code review, and every audio bug this
 * project has had was plainly visible the moment the waveform was drawn: a hit
 * whose envelope is a rectangle, two elements that render the same picture, a
 * stack that pins the limiter flat. So this driver renders each cue offline --
 * through the real Synth code and the real master chain, into an
 * OfflineAudioContext, which produces samples and no sound at all -- and plots
 * the result to build/shots/ as a PNG.
 *
 *   node tools/serve.js
 *   npx electron tools/capture.cjs tools/shots/sfxscope.js
 *
 * Pass a group name in window.SFXSCOPE_GROUP to plot a subset.
 */

const { sfxNotes } = await import('/build/js/audio/audio.js');
const { renderNote, makeNoiseBuffer, makePulseWave } = await import('/build/js/audio/synth.js');

const RATE = 44100;

/** Renders one cue through the same bus chain the game plays it on. */
async function renderCue(id, opts = {}) {
  const notes = Array.isArray(id) ? id : sfxNotes(id, opts);
  if (!notes) throw new Error('no recipe: ' + id);
  const span = Math.max(...notes.map((n) => n.at + n.duration)) + 0.20;
  const ctx = new OfflineAudioContext(1, Math.ceil(RATE * Math.max(0.25, span)), RATE);

  const master = ctx.createGain();
  master.gain.value = 0.85;
  const glue = ctx.createDynamicsCompressor();
  glue.threshold.value = -12; glue.knee.value = 12; glue.ratio.value = 6;
  glue.attack.value = 0.004; glue.release.value = 0.12;
  master.connect(glue); glue.connect(ctx.destination);
  const sfxBus = ctx.createGain();
  sfxBus.gain.value = 0.8;
  sfxBus.connect(master);

  const noise = makeNoiseBuffer(ctx, 2);
  const waves = new Map();
  const env = {
    noise,
    wave: (duty) => {
      const key = Math.round(duty * 100);
      let w = waves.get(key);
      if (!w) { w = makePulseWave(ctx, duty); waves.set(key, w); }
      return w;
    },
    autoVibrato: false,
  };

  for (const note of notes) renderNote(ctx, sfxBus, { ...note, at: note.at + 0.005 }, env);
  const buf = await ctx.startRendering();
  return buf.getChannelData(0);
}

/** The numbers worth asserting on, since the ear is not available. */
function measure(data) {
  let peak = 0, sum = 0, clipped = 0;
  for (let i = 0; i < data.length; i++) {
    const a = Math.abs(data[i]);
    if (a > peak) peak = a;
    if (a > 0.995) clipped++;
    sum += data[i] * data[i];
  }
  const rms = Math.sqrt(sum / data.length);

  // Loudest 20ms anywhere in the cue. The single-sample peak of a noise burst
  // is mostly luck -- a short transient simply gets fewer chances to throw a
  // big excursion -- so this is the number to compare two cues by.
  const win = Math.round(RATE * 0.02);
  let run = 0, punch = 0;
  for (let i = 0; i < data.length; i++) {
    run += data[i] * data[i];
    if (i >= win) run -= data[i - win] * data[i - win];
    if (i >= win && run > punch) punch = run;
  }
  punch = Math.sqrt(punch / win);

  // Where the sound really starts and stops, at -40dB of its own peak.
  const gate = peak * 0.01;
  let first = 0, last = 0, peakAt = 0;
  for (let i = 0; i < data.length; i++) {
    const a = Math.abs(data[i]);
    if (a > gate) { if (!first) first = i; last = i; }
    if (a === peak) peakAt = peakAt || i;
  }

  // Envelope in 64 bins, for the picture and for comparing two cues.
  const bins = 64;
  const envl = new Array(bins).fill(0);
  const span = Math.max(1, last - first);
  for (let i = first; i <= last; i++) {
    const b = Math.min(bins - 1, Math.floor(((i - first) / span) * bins));
    const a = Math.abs(data[i]);
    if (a > envl[b]) envl[b] = a;
  }

  // Spectral centroid: bright or dark, in one number. Windowed frames at the
  // full sample rate -- decimating first aliases everything above 2.7kHz down
  // into the bass, which had every cue reading as a hundred-hertz rumble.
  const N = 512;
  const hop = 512;
  let num = 0, den = 0;
  for (let f = first; f + N < last && f < first + hop * 20; f += hop) {
    for (let k = 1; k < N / 2; k++) {
      let re = 0, im = 0;
      for (let i = 0; i < N; i++) {
        const win = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1));
        const s = data[f + i] * win;
        const ang = (-2 * Math.PI * k * i) / N;
        re += s * Math.cos(ang); im += s * Math.sin(ang);
      }
      const mag = Math.sqrt(re * re + im * im);
      num += mag * ((k * RATE) / N);
      den += mag;
    }
  }

  return {
    peak, rms, punch, clipped,
    start: first / RATE,
    len: (last - first) / RATE,
    attack: Math.max(0, (peakAt - first) / RATE),
    centroid: den > 0 ? num / den : 0,
    env: envl,
  };
}

/** Similarity of two cues, so an accidental clone shows up as a number. */
function similarity(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.env.length; i++) {
    dot += a.env[i] * b.env[i]; na += a.env[i] * a.env[i]; nb += b.env[i] * b.env[i];
  }
  const shape = dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
  const tone = 1 - Math.min(1, Math.abs(a.centroid - b.centroid) / 2500);
  const dur = 1 - Math.min(1, Math.abs(a.len - b.len) / 0.5);
  return shape * 0.5 + tone * 0.3 + dur * 0.2;
}

/* ---------------------------------------------------------------- drawing */

const ROW = 58;
const LABEL = 118;
const PLOT = 760;
const SCALE_S = 1.3;   // seconds across the full plot width, same for every row

function drawPage(title, rows) {
  const cv = document.createElement('canvas');
  cv.width = LABEL + PLOT + 210;
  cv.height = 34 + rows.length * ROW + 10;
  const g = cv.getContext('2d');
  g.fillStyle = '#101418';
  g.fillRect(0, 0, cv.width, cv.height);
  g.font = '13px monospace';
  g.fillStyle = '#e8eef4';
  g.fillText(title, 8, 20);

  rows.forEach((row, i) => {
    const y = 34 + i * ROW;
    const mid = y + ROW / 2 - 4;

    // Alternating banding, so a long list stays readable.
    if (i % 2) { g.fillStyle = '#161c22'; g.fillRect(0, y, cv.width, ROW); }

    // Time gridlines every 100ms; the whole point is judging attack and decay
    // against a clock, and an unlabelled plot cannot do that.
    for (let s = 0; s <= SCALE_S; s += 0.1) {
      const x = LABEL + (s / SCALE_S) * PLOT;
      g.fillStyle = Math.abs(s % 0.5) < 1e-6 ? '#3a4652' : '#222c34';
      g.fillRect(x, y + 4, 1, ROW - 10);
    }

    g.fillStyle = '#8fb7d9';
    g.font = '11px monospace';
    g.fillText(row.id, 6, mid + 4);

    const d = row.data;
    const total = Math.ceil(SCALE_S * RATE);
    g.fillStyle = row.color || '#7fe3a0';
    for (let x = 0; x < PLOT; x++) {
      const a = Math.floor((x / PLOT) * total);
      const b = Math.floor(((x + 1) / PLOT) * total);
      let lo = 0, hi = 0;
      for (let i = a; i < b && i < d.length; i++) {
        if (d[i] < lo) lo = d[i];
        if (d[i] > hi) hi = d[i];
      }
      const h = (ROW / 2 - 6) * 2.2;  // the library lives well under full scale
      g.fillRect(LABEL + x, mid - hi * h, 1, Math.max(1, (hi - lo) * h));
    }

    // The plot is drawn at 2.2x because nothing in the library is meant to go
    // near full scale, so these rails mark +/-0.45, not +/-1. Clipping is
    // caught by the numbers, not by the picture.
    g.fillStyle = '#5a2530';
    g.fillRect(LABEL, mid - (ROW / 2 - 6), PLOT, 1);
    g.fillRect(LABEL, mid + (ROW / 2 - 6), PLOT, 1);

    const m = row.m;
    g.fillStyle = m.clipped > 0 ? '#ff8484' : '#9aa7b4';
    g.font = '10px monospace';
    g.fillText(
      `pk ${m.peak.toFixed(2)} pun ${m.punch.toFixed(3)} ${(m.len * 1000).toFixed(0)}ms`,
      LABEL + PLOT + 8, mid - 2);
    g.fillText(
      `atk ${(m.attack * 1000).toFixed(1)}ms cen ${Math.round(m.centroid)}Hz${m.clipped ? ' CLIP' : ''}`,
      LABEL + PLOT + 8, mid + 11);
  });

  return cv;
}

async function shoot(name, canvas) {
  const res = await fetch('/__shot/' + encodeURIComponent(name), {
    method: 'POST', body: canvas.toDataURL('image/png'),
  });
  return res.text();
}

/* ------------------------------------------------------------------ pages */

const PAGES = {
  impact: ['hit', 'hit_super', 'hit_weak', 'crit', 'block', 'miss', 'fx_hit', 'fx_heavy'],
  element: ['fx_fire', 'fx_water', 'fx_spark', 'fx_frost', 'fx_quake', 'fx_iron', 'fx_leaf', 'fx_venom'],
  element2: ['fx_psy', 'fx_dark', 'fx_light', 'fx_spirit', 'fx_swarm', 'fx_wind', 'fx_charge', 'fx_weather'],
  reward: ['levelup', 'learn_move', 'evolve', 'victory', 'vessel_caught', 'badge', 'heal', 'fx_heal'],
  common: ['select', 'confirm', 'cancel', 'talk', 'talk_low', 'exp_tick', 'hp_low', 'page_turn'],
  battle: ['faint', 'send_out', 'withdraw', 'encounter', 'battle_swoosh', 'stat_up', 'stat_down', 'vessel_click'],
  world: ['bump', 'step_grass', 'step_stone', 'step_wood', 'step_water', 'menu_open', 'menu_close', 'tab'],
  capture: ['vessel_throw', 'vessel_shake', 'vessel_click', 'vessel_caught', 'vessel_break', 'denied', 'item', 'save'],
  weight: null,
  shapes: null,
};

/**
 * The three envelopes on one bare tone, as a reference.
 *
 * `flat` is what music uses and what every effect in this file used to use.
 * Seeing it next to `perc` is the clearest statement of what changed here: the
 * same layer, the same level, one of them a brick and one of them a hit.
 */
const SHAPES = [
  ['flat  (music)', { env: undefined }],
  ['perc  curve .15', { env: 'perc', curve: 0.15 }],
  ['perc  curve .25', { env: 'perc', curve: 0.25 }],
  ['perc  curve .45', { env: 'perc', curve: 0.45 }],
  ['swell curve .30', { env: 'swell', curve: 0.3 }],
];

const want = window.SFXSCOPE_GROUP ? [window.SFXSCOPE_GROUP] : Object.keys(PAGES);
const report = {};
const all = {};

for (const page of want) {
  const rows = [];
  if (page === 'weight') {
    // The same impact at three forces, to check the weight knob does something
    // visible and does not simply turn the volume up.
    for (const w of [0.05, 0.5, 0.95]) {
      const data = await renderCue('hit', { weight: w });
      const m = measure(data);
      rows.push({ id: 'hit w=' + w, data, m, color: '#e0c070' });
    }
    for (const w of [0.05, 0.5, 0.95]) {
      const data = await renderCue('hit_super', { weight: w });
      const m = measure(data);
      rows.push({ id: 'super w=' + w, data, m, color: '#e0c070' });
    }
  } else if (page === 'shapes') {
    for (const [label, extra] of SHAPES) {
      const data = await renderCue([{
        at: 0, duration: 0.35, frequency: 440, volume: 0.3,
        kind: 'pulse', duty: 0.5, ...extra,
      }]);
      rows.push({ id: label, data, m: measure(data), color: '#9fc8ff' });
    }
  } else {
    for (const id of PAGES[page]) {
      const data = await renderCue(id);
      const m = measure(data);
      rows.push({ id, data, m });
      all[id] = m;
    }
  }
  await shoot('sfx-' + page, drawPage('sfx: ' + page, rows));
  report[page] = rows.map((r) => ({
    id: r.id,
    peak: +r.m.peak.toFixed(3),
    pun: +r.m.punch.toFixed(4),
    rms: +r.m.rms.toFixed(4),
    ms: Math.round(r.m.len * 1000),
    atk: +(r.m.attack * 1000).toFixed(1),
    cen: Math.round(r.m.centroid),
    clip: r.m.clipped,
  }));
}

// Anything that reads as another cue wearing a hat.
const ids = Object.keys(all);
const pairs = [];
for (let i = 0; i < ids.length; i++) {
  for (let j = i + 1; j < ids.length; j++) {
    pairs.push([similarity(all[ids[i]], all[ids[j]]), ids[i] + '~' + ids[j]]);
  }
}
pairs.sort((a, b) => b[0] - a[0]);
const clones = pairs.slice(0, 14).map(([s, name]) => name + ' ' + s.toFixed(3));

return { report, clones };
