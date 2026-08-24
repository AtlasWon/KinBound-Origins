// Zero-dependency static dev server for KinBound.
// Serves the project root so /build/js, /data and /assets are all reachable.
import { createServer } from 'node:http';
import { readFile, stat, mkdir, writeFile, readdir } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PORT = Number(process.env.PORT ?? 5173);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
};

async function resolvePath(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  let rel = normalize(clean);
  while (rel.startsWith('/') || rel.startsWith(sep)) rel = rel.slice(1);
  const abs = resolve(ROOT, rel);
  // Prevent path traversal outside the project root.
  if (abs !== ROOT && !abs.startsWith(ROOT + sep)) return null;
  try {
    const s = await stat(abs);
    if (s.isDirectory()) return resolvePath(join(clean, 'index.html'));
    return abs;
  } catch {
    return null;
  }
}

/**
 * Dev-only screenshot sink. The page POSTs a base64 PNG of the low-resolution
 * back buffer to /__shot/<name> and it lands in build/shots/, which is how the
 * game gets visually reviewed during development.
 */
async function handleShot(req, res, name) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = Buffer.concat(chunks).toString('utf8');
  const b64 = body.replace(/^data:image\/png;base64,/, '');
  const safe = (name || 'shot').replace(/[^a-zA-Z0-9_.-]/g, '_');
  const dir = resolve(ROOT, 'build', 'shots');
  await mkdir(dir, { recursive: true });
  const out = join(dir, safe.endsWith('.png') ? safe : safe + '.png');
  await writeFile(out, Buffer.from(b64, 'base64'));
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end(out);
  console.log('shot ->', out);
}

/**
 * The creature-art listing, read off the disk on every request.
 *
 * The game will not hunt for 96 image files that mostly do not exist, so it
 * asks for this index instead. Answering it live means a PNG dropped into
 * assets/kin is picked up on the next reload with no build step in between,
 * which is the whole point during an art pass. `tools/kinart.js` writes the
 * same file for hosts that cannot do this. The Electron scheme handler in
 * launcher/main.cjs answers it the same way.
 */
const KIN_ART_INDEX = '/assets/kin/index.json';

async function handleKinIndex(res) {
  let files = [];
  try {
    const all = await readdir(resolve(ROOT, 'assets', 'kin'));
    files = all.filter((f) => f.toLowerCase().endsWith('.png')).sort();
  } catch {
    // No folder yet: an empty listing is the correct answer, not an error.
  }
  const body = JSON.stringify({ note: 'served live from assets/kin', files });
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}

const server = createServer(async (req, res) => {
  if (req.url && req.url.split('?')[0] === KIN_ART_INDEX) {
    await handleKinIndex(res);
    return;
  }
  if (req.url && req.url.startsWith('/__shot')) {
    if (req.method === 'POST') {
      await handleShot(req, res, decodeURIComponent(req.url.slice('/__shot/'.length)));
      return;
    }
    res.writeHead(405); res.end('POST only'); return;
  }
  const file = await resolvePath(req.url ?? '/');
  if (!file) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found: ' + req.url);
    return;
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, {
      'Content-Type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
      'Content-Length': body.length,
    });
    res.end(body);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('500 ' + String(err));
  }
});

server.listen(PORT, () => {
  console.log(`KinBound dev server -> http://localhost:${PORT}/`);
});
