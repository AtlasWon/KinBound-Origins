// Bake a spot list into the mapwalk-eyes driver.
//   node tools/eyes.js "name,map,x,y,facing" "name,map,x,y,facing" ...
// then: npx electron tools/capture.cjs tools/shots/mapwalk-eyes.js
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const file = join(ROOT, 'tools', 'shots', 'mapwalk-eyes.js');
const spots = process.argv.slice(2).map((s) => {
  const [name, map, x, y, facing] = s.split(',');
  return [name, map, Number(x), Number(y), facing || 'down'];
});
const src = readFileSync(file, 'utf8').replace(
  /const SPOTS = .*;/, 'const SPOTS = ' + JSON.stringify(spots) + ';');
writeFileSync(file, src);
console.log(spots.length + ' spot(s) armed.');
