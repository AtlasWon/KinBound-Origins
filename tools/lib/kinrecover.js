/**
 * Recovering pixel art from a lossy-encoded export.
 *
 * The player's drawings arrived as 1254x1254 PNGs that had already been through
 * a lossy encoder: ~120,000 distinct colours per file where real pixel art has
 * twenty, and a fringe of 20-30k part-transparent pixels round every edge. The
 * drawing underneath is fine -- it was made on a coarse block grid, roughly
 * 12-15 source pixels per art pixel -- so the job is to throw the encoder's
 * noise away and keep the blocks.
 *
 * Three things do almost all of the work, in this order.
 *
 *   1. A global palette, fitted to the whole image. Weighted k-means over every
 *      opaque pixel finds the ~20 colours the artist actually used, because the
 *      encoder's noise is scattered symmetrically around each of them and a
 *      mean is exactly the estimator that ignores that. This is also why the
 *      palette is fitted at FULL resolution and before any resizing: a million
 *      noisy samples of twenty colours is an easy problem, and the same twenty
 *      colours measured after a resize would be twenty blurred averages.
 *
 *   2. A per-output-block vote, not an average. Each output pixel covers a
 *      square of source pixels; every source pixel votes for its nearest
 *      palette entry and the block takes the winner. A block wholly inside a
 *      flat area returns that exact colour; a block straddling an edge picks
 *      the side it mostly covers instead of inventing a blend. That keeps flat
 *      areas flat and edges hard, which averaging cannot do.
 *
 *   3. Coverage, kept separate from colour. Alpha is hardened at the source
 *      first (so the encoder's fringe cannot vote), then the fraction of the
 *      block that was opaque decides the output pixel's alpha against one
 *      threshold. Colour is only ever averaged or voted over opaque source
 *      pixels, so no transparent black is mixed into an edge.
 *
 * `boxDownsample` is the alternative kept for comparison: the same coverage
 * rule with a plain mean instead of a vote. It is measurably softer -- see
 * `kin-import.js --compare` -- and it is here so that claim stays checkable
 * rather than becoming folklore.
 */

/* ------------------------------------------------------------- distance */

/** Squared distance in a cheap perceptual weighting. Green dominates
 *  luminance, so an error there is worth more than the same error in blue. */
export function colourDist2(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2, dg = g1 - g2, db = b1 - b2;
  return 2 * dr * dr + 4 * dg * dg + 3 * db * db;
}

/* -------------------------------------------------------------- palette */

/**
 * Fit `k` colours to the opaque pixels of an RGBA buffer.
 *
 * Median cut picks the starting centres -- k-means from random seeds on an
 * image with one dominant colour reliably wastes half its clusters on it --
 * and then Lloyd's algorithm runs to convergence on a histogram rather than on
 * the pixels, so the cost is set by the number of distinct 5-bit colours (a few
 * thousand) and not by the 1.5 million pixels.
 *
 * `minShare` drops a cluster that ended up owning less of the image than that
 * fraction, which is how a palette asked for 24 colours comes back with 19 for
 * a drawing that only ever used 19.
 */
export function fitPalette(rgba, w, h, { k = 24, minShare = 0.0006, alphaCut = 128 } = {}) {
  // 5 bits per channel: fine enough that two real palette entries never share a
  // bin, coarse enough that the encoder's noise collapses into one.
  const hist = new Map();
  for (let i = 0; i < w * h; i++) {
    if (rgba[i * 4 + 3] < alphaCut) continue;
    const r = rgba[i * 4], g = rgba[i * 4 + 1], b = rgba[i * 4 + 2];
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    const e = hist.get(key);
    if (e) { e.n++; e.r += r; e.g += g; e.b += b; }
    else hist.set(key, { n: 1, r, g, b });
  }
  if (!hist.size) return [];
  const bins = [...hist.values()].map((e) => ({
    n: e.n, r: e.r / e.n, g: e.g / e.n, b: e.b / e.n,
  }));
  const total = bins.reduce((a, e) => a + e.n, 0);

  let centres = medianCut(bins, k);
  for (let pass = 0; pass < 40; pass++) {
    const acc = centres.map(() => ({ n: 0, r: 0, g: 0, b: 0 }));
    for (const e of bins) {
      let best = 0, bd = Infinity;
      for (let c = 0; c < centres.length; c++) {
        const d = colourDist2(e.r, e.g, e.b, centres[c].r, centres[c].g, centres[c].b);
        if (d < bd) { bd = d; best = c; }
      }
      const a = acc[best];
      a.n += e.n; a.r += e.r * e.n; a.g += e.g * e.n; a.b += e.b * e.n;
    }
    let moved = 0;
    const next = [];
    for (let c = 0; c < centres.length; c++) {
      const a = acc[c];
      if (!a.n) continue;
      const nc = { r: a.r / a.n, g: a.g / a.n, b: a.b / a.n, n: a.n };
      moved += colourDist2(nc.r, nc.g, nc.b, centres[c].r, centres[c].g, centres[c].b);
      next.push(nc);
    }
    centres = next;
    if (moved < 0.5) break;
  }

  // Drop clusters nobody lives in, then merge any two that landed on top of
  // each other (median cut can split one flat colour when k is generous).
  centres = centres.filter((c) => c.n / total >= minShare);
  centres.sort((a, b) => b.n - a.n);
  const kept = [];
  for (const c of centres) {
    if (kept.some((q) => colourDist2(c.r, c.g, c.b, q.r, q.g, q.b) < 40)) continue;
    kept.push(c);
  }
  return kept.map((c) => ({
    r: Math.round(c.r), g: Math.round(c.g), b: Math.round(c.b), n: c.n,
  }));
}

function medianCut(bins, k) {
  let boxes = [bins];
  while (boxes.length < k) {
    let pick = -1, pickSpread = -1, pickAxis = 'r';
    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];
      if (box.length < 2) continue;
      for (const axis of ['r', 'g', 'b']) {
        let lo = Infinity, hi = -Infinity;
        for (const e of box) { if (e[axis] < lo) lo = e[axis]; if (e[axis] > hi) hi = e[axis]; }
        const spread = (hi - lo) * (axis === 'g' ? 1.3 : 1);
        if (spread > pickSpread) { pickSpread = spread; pick = i; pickAxis = axis; }
      }
    }
    if (pick < 0 || pickSpread <= 0) break;
    const box = boxes[pick].slice().sort((a, b) => a[pickAxis] - b[pickAxis]);
    const half = box.reduce((a, e) => a + e.n, 0) / 2;
    let acc = 0, cut = 1;
    for (let i = 0; i < box.length - 1; i++) { acc += box[i].n; if (acc >= half) { cut = i + 1; break; } }
    boxes.splice(pick, 1, box.slice(0, cut), box.slice(cut));
  }
  return boxes.map((box) => {
    let n = 0, r = 0, g = 0, b = 0;
    for (const e of box) { n += e.n; r += e.r * e.n; g += e.g * e.n; b += e.b * e.n; }
    return n ? { r: r / n, g: g / n, b: b / n, n } : { r: 0, g: 0, b: 0, n: 0 };
  }).filter((c) => c.n > 0);
}

/** Nearest palette index for a colour, by the weighted distance above. */
export function nearest(pal, r, g, b) {
  let best = 0, bd = Infinity;
  for (let i = 0; i < pal.length; i++) {
    const d = colourDist2(r, g, b, pal[i].r, pal[i].g, pal[i].b);
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}

/** Every source pixel's palette index, once, so the vote does not redo it for
 *  each of the ~200 output pixels that share a source pixel's neighbourhood. */
export function indexImage(rgba, w, h, pal, alphaCut = 128) {
  const idx = new Int16Array(w * h).fill(-1);
  const cache = new Map();
  for (let i = 0; i < w * h; i++) {
    if (rgba[i * 4 + 3] < alphaCut) continue;
    const r = rgba[i * 4], g = rgba[i * 4 + 1], b = rgba[i * 4 + 2];
    const key = ((r >> 2) << 12) | ((g >> 2) << 6) | (b >> 2);
    let p = cache.get(key);
    if (p === undefined) { p = nearest(pal, r, g, b); cache.set(key, p); }
    idx[i] = p;
  }
  return idx;
}

/* ----------------------------------------------------------- the grid */

/**
 * Try to find the size of the artist's own pixel block, in source pixels.
 *
 * Measured on the ALPHA silhouette, not on colour. The silhouette is the one
 * signal the encoder did not shred: it is a step from nothing to something, so
 * it survives quantisation, where a colour edge inside the drawing is buried in
 * ringing that puts a plausible edge on every second pixel. (Autocorrelating
 * colour edge energy on these files returns a period of about 4 with a quarter
 * of the energy on grid, which is what a noise floor looks like.)
 *
 * The score is a concentration ratio, not a share: what fraction of silhouette
 * transitions land on the candidate grid, divided by the fraction that would
 * land there by chance. Without that, a short period always wins by sampling
 * more lines.
 *
 * `confident` is the honest part. On four of the twelve species the answer is
 * unambiguous -- 75% of the silhouette on a 14.69 px grid, which is a real
 * measurement of a real thing. On the rest there is no period worth the name,
 * because those drawings were made at a finer block size and the encoder had
 * more to destroy. Nothing downstream depends on this: it is reported because
 * it is the truth about the input, and because the one path that WOULD need it
 * was tried and lost (see kin-import.js).
 */
export function detectGrid(rgba, w, h, alphaCut = 128) {
  const acc = (n, get) => {
    const d = new Float64Array(n);
    for (let i = 1; i < n; i++) d[i] = get(i);
    return d;
  };
  const ex = acc(w, (x) => {
    let c = 0;
    for (let y = 0; y < h; y++) {
      const a = rgba[(y * w + x) * 4 + 3] >= alphaCut;
      const b = rgba[(y * w + x - 1) * 4 + 3] >= alphaCut;
      if (a !== b) c++;
    }
    return c;
  });
  const ey = acc(h, (y) => {
    let c = 0;
    for (let x = 0; x < w; x++) {
      const a = rgba[(y * w + x) * 4 + 3] >= alphaCut;
      const b = rgba[((y - 1) * w + x) * 4 + 3] >= alphaCut;
      if (a !== b) c++;
    }
    return c;
  });

  function best(d, n) {
    const total = d.reduce((a, b) => a + b, 0) || 1;
    let out = { period: 0, phase: 0, share: 0, ratio: 0 };
    for (let p = 6; p <= 26; p += 0.004) {
      const expect = Math.floor(n / p) / n;
      for (let ph = 0; ph < p; ph += 0.25) {
        let s = 0;
        for (let k = 0; ; k++) {
          const t = ph + k * p;
          if (t >= n - 1) break;
          const i = Math.round(t);
          if (i >= 1) s += d[i];
        }
        const share = s / total;
        const ratio = share / expect;
        if (ratio > out.ratio) out = { period: p, phase: ph, share, ratio };
      }
    }
    return out;
  }
  const bx = best(ex, w), by = best(ey, h);
  // Agreement between the two axes is most of the evidence: real block art is
  // square, so a period found on one axis and not the other is a coincidence.
  const agree = Math.abs(bx.period - by.period) < 0.4;
  const share = (bx.share + by.share) / 2;
  return {
    period: (bx.period + by.period) / 2,
    phaseX: bx.phase, phaseY: by.phase,
    share, ratio: (bx.ratio + by.ratio) / 2,
    confident: agree && share > 0.3 && (bx.ratio + by.ratio) / 2 > 4,
    x: bx, y: by,
  };
}

/**
 * The second opinion on block size, and the more useful of the two: how long a
 * run of one colour is, along a row or a column, once the image has been
 * reduced to its palette.
 *
 * Real block art cannot produce a flat run shorter than one block, so the
 * histogram of run lengths has a wall at the block size and a peak just past
 * it. Encoder noise cannot fake that -- noise makes runs SHORTER, so a damaged
 * drawing decays monotonically from the shortest bin with no peak anywhere.
 * Which of those two shapes a file has is the whole answer, and it survives
 * damage that destroys the periodicity a Fourier or autocorrelation method
 * needs, because it never asks where the block boundaries are, only how far
 * apart they tend to be.
 *
 * Returns the peak (the estimated block, in source pixels) and `found`, which
 * is false when the histogram is still falling at the first bin -- meaning
 * this drawing has no block size this measurement can see.
 */
export function runScale(idx, w, h, { min = 5, max = 48 } = {}) {
  const hist = new Float64Array(max + 4);
  const push = (n) => { if (n >= 1 && n <= max) hist[n]++; };
  for (let y = 0; y < h; y++) {
    let run = 0, prev = -2;
    for (let x = 0; x < w; x++) {
      const v = idx[y * w + x];
      if (v === prev) run++; else { push(run); run = 1; prev = v; }
    }
    push(run);
  }
  for (let x = 0; x < w; x++) {
    let run = 0, prev = -2;
    for (let y = 0; y < h; y++) {
      const v = idx[y * w + x];
      if (v === prev) run++; else { push(run); run = 1; prev = v; }
    }
    push(run);
  }
  // Smooth by three: the block is fractional (1254 is not a whole multiple of
  // anything), so a real block's runs straddle two neighbouring bins.
  const sm = new Float64Array(max + 4);
  for (let i = 1; i <= max; i++) sm[i] = hist[i - 1] + hist[i] + hist[i + 1];

  // Length 1 always dominates -- an edge is a run of one, and every drawing is
  // mostly edges at this magnification. What a block size looks like is a
  // SECOND hump further out: the histogram stops falling and rises again. A
  // drawing with no recoverable block size just decays, and no threshold on the
  // maximum can tell those apart, so look for the rise itself.
  // The FIRST such hump, not the biggest: a block of 14 also puts a hump at 28,
  // and taking the strongest one reports the harmonic instead of the note.
  let best = null;
  for (let i = min; i <= 30 && !best; i++) {
    if (sm[i] < sm[i - 1] || sm[i] < sm[i + 1]) continue;      // local maximum
    const foot = Math.min(sm[i - 1], sm[i - 2], sm[i - 3]);
    if (!foot || sm[i] < foot * 1.08) continue;                 // that rose into
    best = { peak: i, prominence: sm[i] / foot };
  }
  if (!best) return { block: 0, peak: 0, found: false, prominence: 0, floor: min };
  // If the hump we found has a fainter twin at half its distance, the twin is
  // the note and this one is its octave. (A block of 12 makes a bump at 24
  // whenever two neighbouring blocks share a colour, which they often do.)
  for (let half = Math.round(best.peak / 2) - 1; half <= Math.round(best.peak / 2) + 1; half++) {
    if (half < min) continue;
    if (sm[half] < sm[half - 1] || sm[half] < sm[half + 1]) continue;
    const foot = Math.min(sm[half - 1], sm[half - 2], sm[half - 3]);
    if (!foot || sm[half] < foot * 1.02) continue;
    best = { peak: half, prominence: sm[half] / foot };
    break;
  }
  // A weighted centroid over the hump is a better number than the bin index,
  // and it lands within half a pixel of the alpha-silhouette period.
  let num = 0, den = 0;
  for (let i = best.peak - 2; i <= best.peak + 2; i++) { num += i * sm[i]; den += sm[i]; }
  return { block: den ? num / den : best.peak, peak: best.peak, found: true, prominence: best.prominence, floor: min };
}

/* ------------------------------------------------------------ resampling */

/** Source alpha, flattened. Everything downstream counts coverage in whole
 *  pixels, and a fringe of half-alpha would make every edge one block fatter. */
export function hardenSource(rgba, w, h, cut = 128) {
  let soft = 0;
  for (let i = 0; i < w * h; i++) {
    const a = rgba[i * 4 + 3];
    if (a === 0 || a === 255) continue;
    soft++;
    rgba[i * 4 + 3] = a >= cut ? 255 : 0;
  }
  return soft;
}

export function inkBounds(rgba, w, h, cut = 128) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (rgba[(y * w + x) * 4 + 3] < cut) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return x1 < 0 ? null : { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/**
 * The vote. Reduce `box` (a region of the source) to dw x dh, taking each
 * output pixel's colour from the palette entry that the most source pixels
 * under it belong to, and its alpha from how much of it was covered.
 */
export function voteDownsample(src, idx, w, box, dw, dh, pal, { coverage = 0.5, alphaCut = 128 } = {}) {
  const out = new Uint8ClampedArray(dw * dh * 4);
  const sx = box.w / dw, sy = box.h / dh;
  const votes = new Float64Array(pal.length);
  for (let j = 0; j < dh; j++) {
    const y0 = box.y0 + j * sy, y1 = box.y0 + (j + 1) * sy;
    const ya = Math.floor(y0), yb = Math.max(ya + 1, Math.ceil(y1));
    for (let i = 0; i < dw; i++) {
      const x0 = box.x0 + i * sx, x1 = box.x0 + (i + 1) * sx;
      const xa = Math.floor(x0), xb = Math.max(xa + 1, Math.ceil(x1));
      votes.fill(0);
      let opaque = 0, cells = 0, best = -1, bestV = 0;
      for (let y = ya; y < yb; y++) {
        // Partial coverage at the block's own edges, so a fractional scale does
        // not jitter by a whole source pixel from block to block.
        const wy = Math.max(0, Math.min(y + 1, y1) - Math.max(y, y0));
        if (wy <= 0) continue;
        for (let x = xa; x < xb; x++) {
          const wx = Math.max(0, Math.min(x + 1, x1) - Math.max(x, x0));
          if (wx <= 0) continue;
          const wgt = wx * wy;
          cells += wgt;
          const p = idx[y * w + x];
          if (p < 0) continue;
          opaque += wgt;
          votes[p] += wgt;
          if (votes[p] > bestV) { bestV = votes[p]; best = p; }
        }
      }
      if (best < 0 || !cells || opaque / cells < coverage) continue;
      const d = (j * dw + i) * 4;
      out[d] = pal[best].r; out[d + 1] = pal[best].g; out[d + 2] = pal[best].b; out[d + 3] = 255;
    }
  }
  return out;
}

/** The comparison: identical coverage rule, plain mean instead of a vote.
 *  `pal` is applied afterwards so the two runs differ in one step only. */
export function boxDownsample(src, w, box, dw, dh, pal, { coverage = 0.5, alphaCut = 128 } = {}) {
  const out = new Uint8ClampedArray(dw * dh * 4);
  const sx = box.w / dw, sy = box.h / dh;
  for (let j = 0; j < dh; j++) {
    const y0 = box.y0 + j * sy, y1 = box.y0 + (j + 1) * sy;
    const ya = Math.floor(y0), yb = Math.max(ya + 1, Math.ceil(y1));
    for (let i = 0; i < dw; i++) {
      const x0 = box.x0 + i * sx, x1 = box.x0 + (i + 1) * sx;
      const xa = Math.floor(x0), xb = Math.max(xa + 1, Math.ceil(x1));
      let opaque = 0, cells = 0, r = 0, g = 0, b = 0;
      for (let y = ya; y < yb; y++) {
        const wy = Math.max(0, Math.min(y + 1, y1) - Math.max(y, y0));
        if (wy <= 0) continue;
        for (let x = xa; x < xb; x++) {
          const wx = Math.max(0, Math.min(x + 1, x1) - Math.max(x, x0));
          if (wx <= 0) continue;
          const wgt = wx * wy;
          cells += wgt;
          const s = (y * w + x) * 4;
          if (src[s + 3] < alphaCut) continue;
          opaque += wgt;
          r += src[s] * wgt; g += src[s + 1] * wgt; b += src[s + 2] * wgt;
        }
      }
      if (!opaque || !cells || opaque / cells < coverage) continue;
      const cr = r / opaque, cg = g / opaque, cb = b / opaque;
      const p = pal.length ? pal[nearest(pal, cr, cg, cb)] : { r: cr, g: cg, b: cb };
      const d = (j * dw + i) * 4;
      out[d] = p.r; out[d + 1] = p.g; out[d + 2] = p.b; out[d + 3] = 255;
    }
  }
  return out;
}

/* --------------------------------------------------------------- tidying */

/**
 * Remove the specks a vote leaves behind.
 *
 * Two shapes, both of them encoder fringe rather than drawing. An island of one
 * or two pixels touching nothing is a corner of fringe that happened to win its
 * block -- and it costs more than it looks, because the loader seats a drawing
 * by the bounding box of ALL its ink, so one speck three pixels clear of the
 * creature shoves the whole creature off centre. A single transparent hole
 * inside a solid body is the same mistake inverted.
 *
 * `minIsland` stays at two on purpose. Three pixels is where deliberate detail
 * starts: a floating ember off a flame tail, the dot of an eye highlight. Those
 * survive, and so they should.
 */
export function despeckle(px, w, h, { minIsland = 2 } = {}) {
  const a = px.slice();
  let removed = 0, filled = 0;
  const on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && a[(y * w + x) * 4 + 3] > 0;
  const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  // An island of one or two pixels hanging off nothing. Judged on 4-connection
  // rather than 8, because a pixel joined only at a corner reads as detached and
  // is treated as detached by every measurement the game and the checker make.
  const seen = new Uint8Array(w * h);
  for (let start = 0; start < w * h; start++) {
    if (seen[start] || a[start * 4 + 3] === 0) continue;
    // Flood the whole component -- stopping early would leave half of it marked
    // seen, and the next start inside it would look like an island of its own.
    const stack = [start], cells = [];
    seen[start] = 1;
    while (stack.length) {
      const p = stack.pop();
      cells.push(p);
      const x = p % w, y = (p / w) | 0;
      for (const [dx, dy] of N4) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const q = ny * w + nx;
        if (seen[q] || a[q * 4 + 3] === 0) continue;
        seen[q] = 1;
        stack.push(q);
      }
    }
    if (cells.length > minIsland) continue;                   // part of the creature
    for (const p of cells) { px[p * 4 + 3] = 0; removed++; }
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let n = 0;
      for (const [dx, dy] of N4) if (on(x + dx, y + dy)) n++;
      const i = (y * w + x) * 4;
      if (a[i + 3] === 0 && n === 4) {
        const counts = new Map();
        for (const [dx, dy] of N4) {
          const s = ((y + dy) * w + x + dx) * 4;
          const key = (a[s] << 16) | (a[s + 1] << 8) | a[s + 2];
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
        let key = 0, best = 0;
        for (const [q, n2] of counts) if (n2 > best) { best = n2; key = q; }
        px[i] = (key >> 16) & 0xff; px[i + 1] = (key >> 8) & 0xff; px[i + 2] = key & 0xff;
        px[i + 3] = 255;
        filled++;
      }
    }
  }
  return { removed, filled };
}

/** Nearest-neighbour magnify by a whole number. This is what puts the art on
 *  the 2-pixel grid the 64px party icon halves back down. */
export function magnify(px, w, h, f) {
  const dw = w * f, dh = h * f;
  const out = new Uint8ClampedArray(dw * dh * 4);
  for (let y = 0; y < dh; y++) {
    for (let x = 0; x < dw; x++) {
      const s = (((y / f) | 0) * w + ((x / f) | 0)) * 4;
      const d = (y * dw + x) * 4;
      out[d] = px[s]; out[d + 1] = px[s + 1]; out[d + 2] = px[s + 2]; out[d + 3] = px[s + 3];
    }
  }
  return { data: out, w: dw, h: dh };
}

/** Distinct opaque colours, and how many pixels are neither in nor out. */
export function measure(px, w, h) {
  const set = new Set();
  let soft = 0, ink = 0;
  for (let i = 0; i < w * h; i++) {
    const a = px[i * 4 + 3];
    if (a !== 0 && a !== 255) soft++;
    if (a < 128) continue;
    ink++;
    set.add((px[i * 4] << 16) | (px[i * 4 + 1] << 8) | px[i * 4 + 2]);
  }
  return { colours: set.size, soft, ink };
}
