/**
 * PNG in and PNG out, for the creature-art tools.
 *
 * `tools/kinart.js` carries a minimal reader of its own, deliberately: it runs
 * inside `npm run build` and should stay small and boring. This one is the
 * opposite -- it is the reader for `npm run kin:check`, and it exists to be
 * told the truth by files that were exported wrong. So it takes everything a
 * paint program can plausibly emit:
 *
 *   - colour types 0/2/3/4/6, bit depths 1/2/4/8/16
 *   - Adam7 interlacing (the offline check keeps working on an interlaced file
 *     instead of giving up on it, which is the whole point of a checker)
 *   - tRNS in all three of its forms, so a palette image with one transparent
 *     entry reads as transparent and not as black
 *
 * It also reports which chunks were present, because half of what goes wrong
 * with hand-exported art is a chunk that should not be there: a colour profile
 * the browser will honour and the tools will not, a 16-bit depth from a
 * photo-editing default, an interlace flag from a "save for web" preset.
 *
 * The writer is the narrow case only: 8-bit RGBA, no interlace, one filter.
 * Contact sheets do not need to be clever, they need to be correct.
 */

import { inflateSync, deflateSync } from 'node:zlib';

const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (~c) >>> 0;
}

const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

const ADAM7 = [
  { x0: 0, y0: 0, dx: 8, dy: 8 },
  { x0: 4, y0: 0, dx: 8, dy: 8 },
  { x0: 0, y0: 4, dx: 4, dy: 8 },
  { x0: 2, y0: 0, dx: 4, dy: 4 },
  { x0: 0, y0: 2, dx: 2, dy: 4 },
  { x0: 1, y0: 0, dx: 2, dy: 2 },
  { x0: 0, y0: 1, dx: 1, dy: 2 },
];

/** Undo the per-row filters of one (sub)image. Returns h*stride bytes. */
function unfilter(raw, offset, w, h, bpp, stride) {
  const out = Buffer.alloc(h * stride);
  let off = offset;
  for (let y = 0; y < h; y++) {
    if (off >= raw.length) throw new Error('image data ends early');
    const filter = raw[off++];
    const row = raw.subarray(off, off + stride);
    if (row.length < stride) throw new Error('image data ends early');
    off += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let i = 0; i < stride; i++) {
      const x = row[i];
      const a = i >= bpp ? cur[i - bpp] : 0;
      const b = prev ? prev[i] : 0;
      const c = prev && i >= bpp ? prev[i - bpp] : 0;
      let v;
      switch (filter) {
        case 0: v = x; break;
        case 1: v = x + a; break;
        case 2: v = x + b; break;
        case 3: v = x + ((a + b) >> 1); break;
        case 4: {
          const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
          v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
          break;
        }
        default: throw new Error(`unknown row filter ${filter}`);
      }
      cur[i] = v & 0xff;
    }
  }
  return { pixels: out, end: off };
}

/** One sample, as an 8-bit value, whatever the file's bit depth is. */
function sampleAt(line, lineOffset, index, depth) {
  if (depth === 16) return line[lineOffset + index * 2];
  if (depth === 8) return line[lineOffset + index];
  const per = 8 / depth;
  const byte = line[lineOffset + ((index / per) | 0)];
  const shift = 8 - depth - (index % per) * depth;
  return (byte >> shift) & ((1 << depth) - 1);
}

/** Raw sample -> 0..255, for grey channels stored below 8 bits. */
function scaleUp(v, depth) {
  if (depth === 8 || depth === 16) return v;
  return Math.round((v * 255) / ((1 << depth) - 1));
}

/**
 * Decode a PNG to straight (non-premultiplied) 8-bit RGBA.
 *
 * Returns { w, h, rgba, depth, colour, interlace, chunks, palette }. Throws with
 * a message a person can act on -- the caller prints it verbatim.
 */
export function decodePng(buf) {
  if (buf.length < 8 || !buf.subarray(0, 8).equals(SIG)) {
    throw new Error('not a PNG file (the first eight bytes are not a PNG signature)');
  }
  let p = 8;
  let ihdr = null, plte = null, trns = null;
  const idat = [];
  const chunks = [];
  while (p + 8 <= buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.toString('latin1', p + 4, p + 8);
    if (p + 12 + len > buf.length) throw new Error(`truncated: the ${type} chunk runs past the end of the file`);
    const data = buf.subarray(p + 8, p + 8 + len);
    chunks.push(type);
    if (type === 'IHDR') {
      ihdr = {
        w: data.readUInt32BE(0), h: data.readUInt32BE(4),
        depth: data[8], colour: data[9], compression: data[10],
        filter: data[11], interlace: data[12],
      };
    } else if (type === 'PLTE') plte = Buffer.from(data);
    else if (type === 'tRNS') trns = Buffer.from(data);
    else if (type === 'IDAT') idat.push(Buffer.from(data));
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  if (!ihdr) throw new Error('has no IHDR chunk, so it is not a usable PNG');
  if (!idat.length) throw new Error('has no image data (no IDAT chunk)');

  const { w, h, depth, colour, interlace } = ihdr;
  if (!w || !h) throw new Error(`declares a ${w}x${h} image`);
  const channels = CHANNELS[colour];
  if (channels === undefined) throw new Error(`uses colour type ${colour}, which is not a PNG colour type`);
  const allowed = colour === 3 ? [1, 2, 4, 8] : colour === 0 ? [1, 2, 4, 8, 16] : [8, 16];
  if (!allowed.includes(depth)) throw new Error(`is ${depth} bits per channel, which colour type ${colour} does not allow`);
  if (colour === 3 && !plte) throw new Error('is a palette image with no palette (no PLTE chunk)');

  let raw;
  try {
    raw = inflateSync(Buffer.concat(idat));
  } catch (e) {
    throw new Error(`the compressed image data is damaged (${e.message})`);
  }

  const bpp = Math.max(1, Math.ceil((channels * depth) / 8));
  const rgba = Buffer.alloc(w * h * 4);

  if (!interlace) {
    const stride = Math.ceil((w * channels * depth) / 8);
    const { pixels } = unfilter(raw, 0, w, h, bpp, stride);
    for (let y = 0; y < h; y++) {
      const off = y * stride;
      for (let x = 0; x < w; x++) {
        const base = x * channels;
        const s = (i) => sampleAt(pixels, off, base + i, depth);
        writePixel(rgba, (y * w + x) * 4, colour, depth, plte, trns, s);
      }
    }
  } else {
    let offset = 0;
    for (const pass of ADAM7) {
      const pw = Math.ceil(Math.max(0, w - pass.x0) / pass.dx);
      const ph = Math.ceil(Math.max(0, h - pass.y0) / pass.dy);
      if (!pw || !ph) continue;
      const stride = Math.ceil((pw * channels * depth) / 8);
      const { pixels, end } = unfilter(raw, offset, pw, ph, bpp, stride);
      offset = end;
      for (let y = 0; y < ph; y++) {
        const off = y * stride;
        for (let x = 0; x < pw; x++) {
          const sx = pass.x0 + x * pass.dx;
          const sy = pass.y0 + y * pass.dy;
          const base = x * channels;
          const s = (i) => sampleAt(pixels, off, base + i, depth);
          writePixel(rgba, (sy * w + sx) * 4, colour, depth, plte, trns, s);
        }
      }
    }
  }

  return {
    w, h, rgba,
    depth, colour, interlace: Boolean(interlace),
    chunks: [...new Set(chunks)],
    paletteSize: plte ? Math.floor(plte.length / 3) : 0,
  };
}

/** Shared pixel writer, so interlaced and non-interlaced agree exactly. */
function writePixel(rgba, d, colour, depth, plte, trns, s) {
  if (colour === 3) {
    const idx = s(0);
    const q = idx * 3;
    rgba[d] = q + 2 < plte.length ? plte[q] : 0;
    rgba[d + 1] = q + 2 < plte.length ? plte[q + 1] : 0;
    rgba[d + 2] = q + 2 < plte.length ? plte[q + 2] : 0;
    rgba[d + 3] = trns && idx < trns.length ? trns[idx] : 255;
    return;
  }
  if (colour === 0 || colour === 4) {
    const raw0 = s(0);
    rgba[d] = rgba[d + 1] = rgba[d + 2] = scaleUp(raw0, depth);
    if (colour === 4) rgba[d + 3] = s(1);
    else if (trns && trns.length >= 2) {
      // tRNS on greyscale names one grey, at the image's own bit depth, that is
      // fully transparent. sampleAt already returns the high byte at depth 16.
      const key = trns.readUInt16BE(0);
      rgba[d + 3] = raw0 === (depth === 16 ? key >> 8 : key) ? 0 : 255;
    } else rgba[d + 3] = 255;
    return;
  }
  const r = s(0), g = s(1), b = s(2);
  rgba[d] = r; rgba[d + 1] = g; rgba[d + 2] = b;
  if (colour === 6) rgba[d + 3] = s(3);
  else if (trns && trns.length >= 6) {
    const key = (i) => {
      const v = trns.readUInt16BE(i * 2);
      return depth === 16 ? v >> 8 : v & 0xff;
    };
    rgba[d + 3] = (r === key(0) && g === key(1) && b === key(2)) ? 0 : 255;
  } else rgba[d + 3] = 255;
}

/* ----------------------------------------------------------------- write */

function chunk(type, data) {
  const out = Buffer.alloc(data.length + 12);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'latin1');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

/** 8-bit RGBA, no interlace. `rgba` is w*h*4 straight alpha. */
export function encodePng(w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;   // depth
  ihdr[9] = 6;   // RGBA
  ihdr[10] = 0;  // deflate
  ihdr[11] = 0;  // adaptive filtering
  ihdr[12] = 0;  // no interlace

  const stride = w * 4;
  const raw = Buffer.alloc(h * (stride + 1));
  for (let y = 0; y < h; y++) {
    const o = y * (stride + 1);
    // Filter 2 (Up) costs nothing to compute and collapses the flat bands a
    // contact sheet is mostly made of.
    raw[o] = y ? 2 : 0;
    for (let i = 0; i < stride; i++) {
      const cur = rgba[y * stride + i];
      const up = y ? rgba[(y - 1) * stride + i] : 0;
      raw[o + 1 + i] = (cur - up) & 0xff;
    }
  }

  return Buffer.concat([
    SIG,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
