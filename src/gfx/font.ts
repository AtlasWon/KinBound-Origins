/**
 * Bitmap font.
 *
 * A hand-authored 5x7 pixel face. Glyphs are written as literal pixel rows so
 * they can be edited by eye during art passes. The parser is strict: a
 * malformed glyph throws at boot rather than rendering as garbage.
 *
 * Text is drawn 1 bit per pixel and tinted at draw time, which is how the
 * era's hardware handled fonts and why it stays crisp at any integer scale.
 */

export const GLYPH_W = 5;
export const GLYPH_H = 7;

/** Each glyph: 7 rows of 5 characters, '#' on, '.' off. */
const GLYPHS: Record<string, string> = {
  ' ': '..... ..... ..... ..... ..... ..... .....',
  '!': '..#.. ..#.. ..#.. ..#.. ..#.. ..... ..#..',
  '"': '.#.#. .#.#. ..... ..... ..... ..... .....',
  '#': '.#.#. .#.#. ##### .#.#. ##### .#.#. .#.#.',
  '$': '..#.. .#### #.#.. .###. ..#.# ####. ..#..',
  '%': '##..# ##..# ...#. ..#.. .#... #..## #..##',
  '&': '.##.. #..#. #.#.. .#... #.#.# #..#. .##.#',
  "'": '..#.. ..#.. ..... ..... ..... ..... .....',
  '(': '...#. ..#.. .#... .#... .#... ..#.. ...#.',
  ')': '.#... ..#.. ...#. ...#. ...#. ..#.. .#...',
  '*': '..... #.#.# .###. ##### .###. #.#.# .....',
  '+': '..... ..#.. ..#.. ##### ..#.. ..#.. .....',
  ',': '..... ..... ..... ..... ..##. ..#.. .#...',
  '-': '..... ..... ..... ##### ..... ..... .....',
  '.': '..... ..... ..... ..... ..... ..##. ..##.',
  '/': '....# ...#. ...#. ..#.. .#... .#... #....',
  '0': '.###. #...# #..## #.#.# ##..# #...# .###.',
  '1': '..#.. .##.. ..#.. ..#.. ..#.. ..#.. .###.',
  '2': '.###. #...# ....# ...#. ..#.. .#... #####',
  '3': '##### ...#. ..##. ....# ....# #...# .###.',
  '4': '...#. ..##. .#.#. #..#. ##### ...#. ...#.',
  '5': '##### #.... ####. ....# ....# #...# .###.',
  '6': '..##. .#... #.... ####. #...# #...# .###.',
  '7': '##### ....# ...#. ..#.. .#... .#... .#...',
  '8': '.###. #...# #...# .###. #...# #...# .###.',
  '9': '.###. #...# #...# .#### ....# ...#. .##..',
  ':': '..... ..##. ..##. ..... ..##. ..##. .....',
  ';': '..... ..##. ..##. ..... ..##. ..#.. .#...',
  '<': '...#. ..#.. .#... #.... .#... ..#.. ...#.',
  '=': '..... ..... ##### ..... ##### ..... .....',
  '>': '.#... ..#.. ...#. ....# ...#. ..#.. .#...',
  '?': '.###. #...# ....# ...#. ..#.. ..... ..#..',
  '@': '.###. #...# #.### #.#.# #.### #.... .###.',
  'A': '.###. #...# #...# ##### #...# #...# #...#',
  'B': '####. #...# #...# ####. #...# #...# ####.',
  'C': '.###. #...# #.... #.... #.... #...# .###.',
  'D': '###.. #..#. #...# #...# #...# #..#. ###..',
  'E': '##### #.... #.... ####. #.... #.... #####',
  'F': '##### #.... #.... ####. #.... #.... #....',
  'G': '.###. #...# #.... #.### #...# #...# .###.',
  'H': '#...# #...# #...# ##### #...# #...# #...#',
  'I': '.###. ..#.. ..#.. ..#.. ..#.. ..#.. .###.',
  'J': '....# ....# ....# ....# #...# #...# .###.',
  'K': '#...# #..#. #.#.. ##... #.#.. #..#. #...#',
  'L': '#.... #.... #.... #.... #.... #.... #####',
  'M': '#...# ##.## #.#.# #.#.# #...# #...# #...#',
  'N': '#...# #...# ##..# #.#.# #..## #...# #...#',
  'O': '.###. #...# #...# #...# #...# #...# .###.',
  'P': '####. #...# #...# ####. #.... #.... #....',
  'Q': '.###. #...# #...# #...# #.#.# #..#. .##.#',
  'R': '####. #...# #...# ####. #.#.. #..#. #...#',
  'S': '.###. #...# #.... .###. ....# #...# .###.',
  'T': '##### ..#.. ..#.. ..#.. ..#.. ..#.. ..#..',
  'U': '#...# #...# #...# #...# #...# #...# .###.',
  'V': '#...# #...# #...# #...# #...# .#.#. ..#..',
  'W': '#...# #...# #...# #.#.# #.#.# ##.## #...#',
  'X': '#...# #...# .#.#. ..#.. .#.#. #...# #...#',
  'Y': '#...# #...# .#.#. ..#.. ..#.. ..#.. ..#..',
  'Z': '##### ....# ...#. ..#.. .#... #.... #####',
  '[': '..### ..#.. ..#.. ..#.. ..#.. ..#.. ..###',
  '\\': '#.... .#... .#... ..#.. ...#. ...#. ....#',
  ']': '###.. ..#.. ..#.. ..#.. ..#.. ..#.. ###..',
  '^': '..#.. .#.#. #...# ..... ..... ..... .....',
  '_': '..... ..... ..... ..... ..... ..... #####',
  '`': '.#... ..#.. ..... ..... ..... ..... .....',
  'a': '..... ..... .###. ....# .#### #...# .####',
  'b': '#.... #.... ####. #...# #...# #...# ####.',
  'c': '..... ..... .###. #.... #.... #...# .###.',
  'd': '....# ....# .#### #...# #...# #...# .####',
  'e': '..... ..... .###. #...# ##### #.... .###.',
  'f': '..##. .#..# .#... ###.. .#... .#... .#...',
  'g': '..... ..... .###. #...# .#### ....# .###.',
  'h': '#.... #.... ####. #...# #...# #...# #...#',
  'i': '..#.. ..... .##.. ..#.. ..#.. ..#.. .###.',
  'j': '...#. ..... ..##. ...#. ...#. #..#. .##..',
  'k': '#.... #.... #..#. #.#.. ##... #.#.. #..#.',
  'l': '.##.. ..#.. ..#.. ..#.. ..#.. ..#.. .###.',
  'm': '..... ..... ##.#. #.#.# #.#.# #.#.# #.#.#',
  'n': '..... ..... ####. #...# #...# #...# #...#',
  'o': '..... ..... .###. #...# #...# #...# .###.',
  'p': '..... ..... ####. #...# ####. #.... #....',
  'q': '..... ..... .#### #...# .#### ....# ....#',
  'r': '..... ..... #.##. ##..# #.... #.... #....',
  's': '..... ..... .#### #.... .###. ....# ####.',
  't': '.#... .#... ###.. .#... .#... .#..# ..##.',
  'u': '..... ..... #...# #...# #...# #..## .##.#',
  'v': '..... ..... #...# #...# #...# .#.#. ..#..',
  'w': '..... ..... #...# #.#.# #.#.# #.#.# .#.#.',
  'x': '..... ..... #...# .#.#. ..#.. .#.#. #...#',
  'y': '..... ..... #...# #...# .#### ....# .###.',
  'z': '..... ..... ##### ...#. ..#.. .#... #####',
  '{': '...## ..#.. ..#.. .##.. ..#.. ..#.. ...##',
  '|': '..#.. ..#.. ..#.. ..#.. ..#.. ..#.. ..#..',
  '}': '##... ..#.. ..#.. ..##. ..#.. ..#.. ##...',
  '~': '..... ..... .#..# #.#.# #..#. ..... .....',

  // Game-specific glyphs.
  'M~': '#...# ##.## #.#.# ##### #.#.# #...# #...#', // currency mark
  '>>': '.#... .##.. .###. .####  .###. .##.. .#...', // dialogue advance arrow
  '^^': '..#.. .###. ##### ..#.. ..#.. ..#.. ..#..', // list scroll up
  'vv': '..#.. ..#.. ..#.. ..#.. ##### .###. ..#..', // list scroll down
  '..': '..... ..... ..... ..... ..... ..... #.#.#', // ellipsis
  'oM': '..### ....# ..#.# .###. #...# #...# .###.', // male mark
  'oF': '.###. #...# #...# .###. ..#.. .###. ..#..', // female mark
};

export type Glyph = { bits: Uint8Array; w: number; h: number };

function parseGlyph(ch: string, spec: string): Glyph {
  const rows = spec.split(' ').filter((r) => r.length > 0);
  if (rows.length !== GLYPH_H) {
    throw new Error(`font: glyph "${ch}" has ${rows.length} rows, expected ${GLYPH_H}`);
  }
  const bits = new Uint8Array(GLYPH_W * GLYPH_H);
  for (let y = 0; y < GLYPH_H; y++) {
    const row = rows[y]!;
    if (row.length !== GLYPH_W) {
      throw new Error(`font: glyph "${ch}" row ${y} is "${row}" (${row.length} wide, expected ${GLYPH_W})`);
    }
    for (let x = 0; x < GLYPH_W; x++) {
      bits[y * GLYPH_W + x] = row[x] === '#' ? 1 : 0;
    }
  }
  return { bits, w: GLYPH_W, h: GLYPH_H };
}

const CACHE = new Map<string, Glyph>();

export function getGlyph(ch: string): Glyph | null {
  const cached = CACHE.get(ch);
  if (cached) return cached;
  const spec = GLYPHS[ch];
  if (!spec) return null;
  const g = parseGlyph(ch, spec);
  CACHE.set(ch, g);
  return g;
}

/** Parse every glyph now so typos surface at boot, not mid-dialogue. */
export function validateFont(): string[] {
  const errors: string[] = [];
  for (const ch of Object.keys(GLYPHS)) {
    try {
      parseGlyph(ch, GLYPHS[ch]!);
    } catch (e) {
      errors.push((e as Error).message);
    }
  }
  return errors;
}

export function glyphKeys(): string[] {
  return Object.keys(GLYPHS);
}

/**
 * Per-character advance. Narrow glyphs get a tighter advance so text reads as
 * proportional rather than as a rigid grid, which is what makes long dialogue
 * comfortable at this size.
 */
const NARROW: Record<string, number> = {
  // Sentence punctuation is deliberately NOT as tight as it looks like it
  // should be. The ink in a full stop sits at columns 2-3 of its cell, so a
  // 2-unit advance leaves only three pixels between the dot and the next
  // word -- against five for an ordinary letter gap. The eye reads that as no
  // gap at all, and every sentence in the game ran into the next one.
  ' ': 4, '!': 3, "'": 2, '.': 3, ',': 3, ':': 3, ';': 3, '|': 2,
  'i': 2, 'l': 3, 'j': 3, '1': 4, '(': 3, ')': 3, '[': 4, ']': 4,
};

export function advanceOf(ch: string): number {
  return (NARROW[ch] ?? GLYPH_W) + 1;
}

/**
 * Multi-character glyph keys such as `oF` (female mark) and `M~` (the currency
 * mark) are written inline in ordinary strings, so every consumer of text has
 * to split on glyph boundaries rather than on code points. Two-character keys
 * are matched first, longest-match-wins.
 */
const MULTI: string[] = Object.keys(GLYPHS).filter((k) => k.length > 1);

export function tokenize(text: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < text.length) {
    let matched = false;
    for (const key of MULTI) {
      if (text.startsWith(key, i)) {
        out.push(key);
        i += key.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      out.push(text[i]!);
      i++;
    }
  }
  return out;
}

export function measureText(text: string): number {
  let w = 0;
  for (const t of tokenize(text)) w += advanceOf(t);
  return Math.max(0, w - 1);
}
