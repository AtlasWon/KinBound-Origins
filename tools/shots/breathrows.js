// Every species, front and back: what the breath measurement decided, and what
// the silhouette actually looks like at the rows it decided on.
//
// For each seam this reports the widest unbroken run at that row as a fraction
// of the creature's widest row, how many separate runs the row is broken into
// (one = solid body, two or more = between the legs or either side of a gap),
// and where the seam sits in the ink as a percentage. A seam in a barrel is one
// run, near full width, somewhere in the lower middle. Anything else is a
// suspect worth looking at.
//
// Usage: npx electron tools/capture.cjs tools/shots/breathrows.js

const reg = (await import('/build/js/data/registry.js')).registry;
const { kinBreath } = await import('/build/js/gfx/kinbreath.js');
const { frontSprite, backSprite } = await import('/build/js/gfx/kinsprite.js');

const INK = 128;
const GAP = 2;

function profile(cv) {
  const cx = cv.getContext('2d', { willReadFrequently: true });
  const W = cv.width, H = cv.height;
  const d = cx.getImageData(0, 0, W, H).data;
  const cover = new Int32Array(H);
  const runs = new Int32Array(H);
  const ink = new Int32Array(H);
  for (let y = 0; y < H; y++) {
    let best = 0, run = 0, hole = 0, any = 0, nRuns = 0;
    for (let x = 0; x < W; x++) {
      if (d[(y * W + x) * 4 + 3] >= INK) {
        any++;
        if (run === 0) nRuns++;
        run += hole + 1;
        hole = 0;
        if (run > best) best = run;
      } else if (run > 0 && hole < GAP) {
        hole++;
      } else { run = 0; hole = 0; }
    }
    cover[y] = best; runs[y] = nRuns; ink[y] = any;
  }
  return { cover, runs, ink, W, H };
}

const ids = [...reg.species.keys()];
const rows = [];
const flags = [];

for (const id of ids) {
  for (const back of [false, true]) {
    const b = kinBreath(id, back);
    const p = profile(back ? backSprite(id) : frontSprite(id));
    let widest = 0;
    for (let y = b.y0; y <= b.y1; y++) if (p.cover[y] > widest) widest = p.cover[y];
    const h = b.y1 - b.y0 + 1;
    const tag = `${id}/${back ? 'back' : 'front'}`;
    if (b.seams.length === 0) { flags.push(`MUTE   ${tag} ink ${h}`); continue; }
    const parts = b.seams.map((s) => {
      // A compressing seam deletes the two design rows ABOVE it, so those are
      // the rows that have to be barrel, not the seam row itself.
      const cut = s - 2;
      const frac = (p.cover[cut] / widest);
      const pct = Math.round(((cut - b.y0) / h) * 100);
      return `${cut}(${Math.round(frac * 100)}%w,${p.runs[cut]}run,${pct}%down)`;
    });
    rows.push(`${tag.padEnd(22)} ink ${b.y0}..${b.y1} h${h} barrel ${b.barrelTop}..${b.barrelBottom} seams ${parts.join(' ')}`);
    for (const s of b.seams) {
      const cut = s - 2;
      if (p.runs[cut] > 1) flags.push(`SPLIT  ${tag} seam cuts row ${cut} which is ${p.runs[cut]} separate runs`);
      else if (p.cover[cut] / widest < 0.55) flags.push(`THIN   ${tag} seam cuts row ${cut} at ${Math.round(p.cover[cut] / widest * 100)}% of the widest row`);
    }
  }
}

for (const line of rows) console.warn(line);
console.warn('FLAGS ' + flags.length);
for (const line of flags) console.warn(line);
return { species: ids.length, flags: flags.length };
