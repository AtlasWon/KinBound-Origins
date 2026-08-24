// Checks the measured anchor of every species, drawn and generated.
//
// The battle scene stopped assuming "the creature is the frame" and now asks
// gfx/kinanchor where each one actually is. This walks the whole roster and
// reports anything the rules could get wrong: a hit point outside the ink, a
// breathing seam that is not below the creature's middle, or a species with no
// seams at all. Nothing here draws; it is a measurement pass and it is quick.
//
// Usage: npx electron tools/capture.cjs tools/shots/anchors.js

const d = window.dev;
await d.loadWait(900);
const anchorMod = await import('/build/js/gfx/kinanchor.js');
const artMod = await import('/build/js/gfx/kinart.js');
const species = await (await fetch('/data/creatures/species.json')).json();

const drawn = new Set(artMod.kinArtSpecies());
const bad = [];
const rows = [];

for (const s of species) {
  for (const back of [false, true]) {
    const a = anchorMod.kinAnchor(s.id, back);
    const route = drawn.has(s.id) ? 'drawn' : 'gen';
    const inside = a.hitY > a.y0 && a.hitY < a.y1 && a.hitX > a.x0 && a.hitX < a.x1;
    const midY = a.y0 + a.h / 2;
    const seamsLow = a.seams.every((v) => v > midY && v < a.y1);
    if (!inside) bad.push(`${s.id}/${back ? 'back' : 'front'} (${route}): hit point outside the ink`);
    if (!a.seams.length) bad.push(`${s.id}/${back ? 'back' : 'front'} (${route}): no breathing seam`);
    else if (!seamsLow) bad.push(`${s.id}/${back ? 'back' : 'front'} (${route}): seam not in the lower body`);
    if (!back) {
      rows.push({
        id: s.id, route, ink: [a.y0, a.y1], h: a.h,
        hit: +a.hitY.toFixed(1),
        // Where the hit lands as a fraction down the ink. Around a half is a
        // body shot; near zero or one would mean the rule had gone wrong.
        hitFrac: +((a.hitY - a.y0) / a.h).toFixed(2),
        seams: a.seams,
      });
    }
  }
}

const fracs = rows.map((r) => r.hitFrac).sort((x, y) => x - y);
return {
  species: rows.length,
  drawn: [...drawn].length,
  problems: bad,
  hitFrac: { min: fracs[0], med: fracs[fracs.length >> 1], max: fracs[fracs.length - 1] },
  sample: rows.filter((r) => ['cinderpaw', 'pipwing', 'pebblet', 'menhir', 'brookmaw', 'thornmarch']
    .includes(r.id)),
};
