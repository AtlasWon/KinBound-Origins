// Release bundle: single minified ES module via esbuild.
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

await build({
  entryPoints: [resolve(ROOT, 'src/main.ts')],
  outfile: resolve(ROOT, 'build/kinbound.min.js'),
  bundle: true,
  minify: true,
  format: 'esm',
  target: ['es2022'],
  sourcemap: true,
  logLevel: 'info',
});
console.log('Release bundle written to build/kinbound.min.js');
