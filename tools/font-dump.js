import { validateFont, getGlyph, glyphKeys, GLYPH_W, GLYPH_H, measureText } from '../build/js/gfx/font.js';
const errs = validateFont();
if (errs.length) { console.log('FONT ERRORS:'); errs.forEach(e => console.log(' - ' + e)); process.exit(1); }
console.log('font OK:', glyphKeys().length, 'glyphs');
const sample = process.argv[2] ?? 'KinBound 42';
const rows = Array.from({length: GLYPH_H}, () => '');
for (const ch of sample) {
  const g = getGlyph(ch);
  if (!g) { console.log('MISSING GLYPH:', JSON.stringify(ch)); continue; }
  for (let y = 0; y < GLYPH_H; y++) {
    let s = '';
    for (let x = 0; x < GLYPH_W; x++) s += g.bits[y*GLYPH_W+x] ? '#' : ' ';
    rows[y] += s + ' ';
  }
}
console.log(rows.join('\n'));
console.log('width px:', measureText(sample));
