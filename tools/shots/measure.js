// Measures every creature from the rendered pixels, independently of whatever
// the design code thinks it drew.
//
// The design authors report their own ink and base percentages from the mask.
// This reads the finished sprite instead, so the two can be compared and a
// mistake in either shows up as a disagreement.

const d = window.dev;
await d.loadWait(1200);
const ks = await import('/build/js/gfx/kinsprite.js');
const species = await (await fetch('/data/creatures/species.json')).json();

const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

const rows = species.map((s) => {
  const src = ks.frontSprite(s.id);
  const W = src.width, H = src.height;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  c.drawImage(src, 0, 0);
  const px = c.getImageData(0, 0, W, H).data;

  const at = (x, y) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return null;
    const i = (y * W + x) * 4;
    return px[i + 3] < 200 ? null : [px[i], px[i + 1], px[i + 2]];
  };

  let x0 = W, y0 = H, x1 = -1, y1 = -1, opaque = 0, dark = 0, busy = 0;
  const colours = new Map();

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = at(x, y);
      if (!p) continue;
      opaque++;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;

      const key = (p[0] << 16) | (p[1] << 8) | p[2];
      colours.set(key, (colours.get(key) || 0) + 1);

      const L = lum(p[0], p[1], p[2]);
      if (L < 70) dark++;

      // A cell is "busy" when its own value differs sharply from two or more
      // of its four neighbours -- that is what a field of small marks looks
      // like numerically, and what a large flat area does not.
      let steps = 0;
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const q = at(x + dx, y + dy);
        if (q && Math.abs(lum(q[0], q[1], q[2]) - L) > 28) steps++;
      }
      if (steps >= 2) busy++;
    }
  }

  const sorted = [...colours.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted[0] ? sorted[0][1] / opaque : 0;
  const topIsDark = sorted[0]
    ? lum((sorted[0][0] >> 16) & 255, (sorted[0][0] >> 8) & 255, sorted[0][0] & 255) < 70
    : false;

  return {
    id: s.id,
    h: s.height ?? null,
    w: x1 - x0 + 1,
    ht: y1 - y0 + 1,
    area: opaque,
    darkPct: +(100 * dark / opaque).toFixed(1),
    busyPct: +(100 * busy / opaque).toFixed(1),
    colours: colours.size,
    topPct: +(100 * top).toFixed(1),
    topIsDark,
    clamped: (x1 - x0 + 1) >= 123 || (y1 - y0 + 1) >= 113,
  };
});

return rows;
