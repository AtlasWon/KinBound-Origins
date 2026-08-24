// Every species, front and back: where the breath seam landed and how far it
// is off the floor. A seam within a few rows of the ground line is in a foot;
// a species with no seam at all has stopped breathing. Both are regressions
// that no single screenshot would show, so they are counted here.
//
// Usage: npx electron tools/capture.cjs tools/shots/breathaudit.js

const reg = (await import('/build/js/data/registry.js')).registry;
const { kinBreath } = await import('/build/js/gfx/kinbreath.js');

const ids = [...reg.species.keys()];
const rows = [];
let mute = 0, low = 0;
for (const id of ids) {
  for (const back of [false, true]) {
    const b = kinBreath(id, back);
    const seam = b.seams[0];
    if (b.seams.length === 0) { mute++; rows.push(`MUTE  ${id} ${back ? 'back ' : 'front'} ink ${b.y0}..${b.y1}`); continue; }
    const off = b.y1 - seam;
    if (off < 10) { low++; rows.push(`LOW   ${id} ${back ? 'back ' : 'front'} seam ${seam} is ${off} above the floor (ink ${b.y0}..${b.y1})`); }
  }
}
return { species: ids.length, mute, low, rows: rows.slice(0, 40) };
