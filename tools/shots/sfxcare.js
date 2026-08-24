/**
 * Oscilloscope for the item, capture and healing cues.
 *
 * Same machinery as tools/shots/sfxscope.js -- the real Synth code rendered
 * into an OfflineAudioContext, which produces samples and no sound at all --
 * pointed at the three families this pass is about, plus the neighbours each
 * one has to stay distinct from. Nobody can listen to a sound in a review, and
 * the only honest way to judge one is to look at its envelope next to the cue
 * it might have accidentally become.
 *
 *   node tools/serve.js
 *   npx electron tools/capture.cjs tools/shots/sfxcare.js
 *
 * The `checks` block in the result is the part that fails a build: assertions
 * on peak, punch, length, attack and centroid, so "the potion resolves rather
 * than trailing off" is a number and not an opinion.
 */

const { sfxNotes } = await import('/build/js/audio/audio.js');
const { renderNote, makeNoiseBuffer, makePulseWave } = await import('/build/js/audio/synth.js');

const RATE = 44100;

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

function measure(data) {
  let peak = 0, sum = 0, clipped = 0;
  for (let i = 0; i < data.length; i++) {
    const a = Math.abs(data[i]);
    if (a > peak) peak = a;
    if (a > 0.995) clipped++;
    sum += data[i] * data[i];
  }
  const rms = Math.sqrt(sum / data.length);

  const win = Math.round(RATE * 0.02);
  let run = 0, punch = 0;
  for (let i = 0; i < data.length; i++) {
    run += data[i] * data[i];
    if (i >= win) run -= data[i - win] * data[i - win];
    if (i >= win && run > punch) punch = run;
  }
  punch = Math.sqrt(punch / win);

  const gate = peak * 0.01;
  let first = 0, last = 0, peakAt = 0;
  for (let i = 0; i < data.length; i++) {
    const a = Math.abs(data[i]);
    if (a > gate) { if (!first) first = i; last = i; }
    if (a === peak) peakAt = peakAt || i;
  }

  const bins = 64;
  const envl = new Array(bins).fill(0);
  const span = Math.max(1, last - first);
  for (let i = first; i <= last; i++) {
    const b = Math.min(bins - 1, Math.floor(((i - first) / span) * bins));
    const a = Math.abs(data[i]);
    if (a > envl[b]) envl[b] = a;
  }

  // How much of the cue's energy is in its last third. A sound that resolves
  // has spent itself by then; a sound that trails off is still going. This is
  // the number behind "lands quickly and resolves rather than trailing off".
  let head = 0, tail = 0;
  const cut = first + Math.floor(span * 0.67);
  for (let i = first; i <= last; i++) {
    const e = data[i] * data[i];
    if (i < cut) head += e; else tail += e;
  }
  const trail = head + tail > 0 ? tail / (head + tail) : 0;

  const N = 512;
  const hop = 512;
  let num = 0, den = 0;
  for (let f = first; f + N < last && f < first + hop * 20; f += hop) {
    for (let k = 1; k < N / 2; k++) {
      let re = 0, im = 0;
      for (let i = 0; i < N; i++) {
        const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1));
        const s = data[f + i] * w;
        const ang = (-2 * Math.PI * k * i) / N;
        re += s * Math.cos(ang); im += s * Math.sin(ang);
      }
      const mag = Math.sqrt(re * re + im * im);
      num += mag * ((k * RATE) / N);
      den += mag;
    }
  }

  return {
    peak, rms, punch, clipped, trail,
    start: first / RATE,
    len: (last - first) / RATE,
    attack: Math.max(0, (peakAt - first) / RATE),
    centroid: den > 0 ? num / den : 0,
    env: envl,
  };
}

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
const LABEL = 132;
const PLOT = 760;
const SCALE_S = 1.3;

function drawPage(title, rows) {
  const cv = document.createElement('canvas');
  cv.width = LABEL + PLOT + 230;
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
    if (i % 2) { g.fillStyle = '#161c22'; g.fillRect(0, y, cv.width, ROW); }

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
      const h = (ROW / 2 - 6) * 2.2;
      g.fillRect(LABEL + x, mid - hi * h, 1, Math.max(1, (hi - lo) * h));
    }

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
      `atk ${(m.attack * 1000).toFixed(1)}ms cen ${Math.round(m.centroid)} tail ${(m.trail * 100).toFixed(0)}%`,
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
  // The potion and its neighbours: it must not become `confirm` or `item`.
  item: ['item_heal', 'item_cure', 'item', 'key_item', 'confirm', 'fx_heal'],
  // The whole capture performance in the order the player hears it.
  vessel: ['vessel_throw', 'vessel_open', 'vessel_land', 'vessel_shake',
    'vessel_click', 'vessel_caught', 'vessel_break'],
  // The catch against every other jingle in the game.
  jingle: ['vessel_caught', 'levelup', 'victory', 'badge', 'evolve', 'save', 'heal_done'],
  // Both roost cues, and the potion, so the family reads as three sizes of the
  // same idea rather than as three unrelated sounds.
  care: ['item_heal', 'heal_cycle', 'heal_done', 'fx_heal'],
  // Recall and send-out, which the capture sequence borrows from.
  recall: ['send_out', 'withdraw', 'vessel_open', 'battle_swoosh', 'encounter'],
};

const report = {};
const all = {};

for (const page of Object.keys(PAGES)) {
  const rows = [];
  for (const id of PAGES[page]) {
    // Missing ids are skipped rather than fatal, so this can be run while the
    // library is half rewritten instead of only at the end.
    let data;
    try { data = await renderCue(id); } catch { continue; }
    const m = measure(data);
    rows.push({ id, data, m });
    all[id] = m;
  }
  await shoot('sfxcare-' + page, drawPage('sfx care: ' + page, rows));
  report[page] = rows.map((r) => ({
    id: r.id,
    peak: +r.m.peak.toFixed(3),
    pun: +r.m.punch.toFixed(4),
    ms: Math.round(r.m.len * 1000),
    atk: +(r.m.attack * 1000).toFixed(1),
    cen: Math.round(r.m.centroid),
    tail: +(r.m.trail).toFixed(3),
    clip: r.m.clipped,
  }));
}

/* ------------------------------------------------------------------ checks */

const checks = [];
const ok = (name, pass, detail) => checks.push((pass ? 'PASS ' : 'FAIL ') + name + '  ' + detail);
const M = (id) => all[id] ?? null;
/** Skip a block whose cues are not written yet. */
const have = (...ids) => ids.every((id) => all[id]);

// Nothing anywhere may clip; the limiter pumping is audible on square waves.
for (const id of Object.keys(all)) {
  if (M(id).clipped) ok('no-clip:' + id, false, M(id).clipped + ' samples');
}

// The potion. Lands quickly, resolves rather than trailing off, and is bright
// enough to read as relief rather than as the old 769Hz thud.
if (have('item_heal')) {
  const m = M('item_heal');
  ok('potion lands quickly', m.attack <= 0.14, `attack ${(m.attack * 1000).toFixed(0)}ms`);
  ok('potion is short', m.len <= 0.52, `${Math.round(m.len * 1000)}ms`);
  ok('potion resolves', m.trail <= 0.16, `${(m.trail * 100).toFixed(0)}% of energy in last third`);
  ok('potion is bright', m.centroid >= 1800, `${Math.round(m.centroid)}Hz`);
  ok('potion is audible', m.punch >= 0.045, `pun ${m.punch.toFixed(3)}`);
}

// The catch. The biggest cue in the game: it has to be the longest and the
// loudest of the jingles, and it has to arrive rather than run out.
if (have('vessel_caught', 'levelup')) {
  const c = M('vessel_caught');
  ok('catch is the big one', c.punch >= M('levelup').punch * 0.95,
    `caught ${c.punch.toFixed(3)} vs levelup ${M('levelup').punch.toFixed(3)}`);
  ok('catch is long enough', c.len >= 0.95, `${Math.round(c.len * 1000)}ms`);
  ok('catch arrives late', c.attack >= 0.30, `peak at ${Math.round(c.attack * 1000)}ms`);
  ok('catch is not levelup', similarity(c, M('levelup')) < 0.93,
    similarity(c, M('levelup')).toFixed(3));
}

// The wobble is tension: dark, and clearly not the bright latch that ends it.
if (have('vessel_shake', 'vessel_click')) {
  const s = M('vessel_shake'), k = M('vessel_click');
  ok('wobble is dark', s.centroid < 1800, `${Math.round(s.centroid)}Hz`);
  ok('latch is bright', k.centroid > 3500, `${Math.round(k.centroid)}Hz`);
  ok('wobble fills its beat', s.len >= 0.11, `${Math.round(s.len * 1000)}ms`);
}

// A vessel bursting open must not measure quieter than a cursor tick.
if (have('vessel_break')) {
  const b = M('vessel_break');
  ok('break has force', b.punch >= 0.055, `pun ${b.punch.toFixed(3)}`);
}

// The two roost cues: one unresolved and quiet, one the payoff.
if (have('heal_cycle', 'heal_done', 'vessel_caught')) {
  const c = M('heal_cycle'), d = M('heal_done');
  ok('cycle stays under the fade', c.punch <= 0.075, `pun ${c.punch.toFixed(3)}`);
  ok('completion is the louder', d.punch > c.punch * 1.25,
    `done ${d.punch.toFixed(3)} vs cycle ${c.punch.toFixed(3)}`);
  ok('completion rings out', d.len >= 0.85, `${Math.round(d.len * 1000)}ms`);
  ok('completion is warmer than the catch', d.centroid < M('vessel_caught').centroid,
    `${Math.round(d.centroid)}Hz vs ${Math.round(M('vessel_caught').centroid)}Hz`);
  ok('the two roost cues differ', similarity(c, d) < 0.90, similarity(c, d).toFixed(3));
}

// Nothing new may be another cue wearing a hat.
const ids = Object.keys(all);
const pairs = [];
for (let i = 0; i < ids.length; i++) {
  for (let j = i + 1; j < ids.length; j++) {
    pairs.push([similarity(all[ids[i]], all[ids[j]]), ids[i] + '~' + ids[j]]);
  }
}
pairs.sort((a, b) => b[0] - a[0]);

return {
  report,
  checks,
  failed: checks.filter((c) => c.startsWith('FAIL')).length,
  clones: pairs.slice(0, 12).map(([s, n]) => n + ' ' + s.toFixed(3)),
};
