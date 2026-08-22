/**
 * Packaging invariants.
 *
 * These do not test the game. They test the things that only break *after* the
 * app is installed, where they are hardest to diagnose and slowest to fix --
 * every one of these was a real failure first.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));

test('electron-updater is a runtime dependency, not a dev one', () => {
  // electron-builder packages production dependencies only. With
  // electron-updater in devDependencies the module is simply absent from the
  // build, and the launcher fails with "Cannot read properties of undefined"
  // the first time somebody presses Check for updates -- on their machine,
  // after a release, with no clue as to why.
  assert.ok(
    pkg.dependencies?.['electron-updater'],
    'electron-updater must be in "dependencies" or it will not be packaged',
  );
  assert.ok(
    !pkg.devDependencies?.['electron-updater'],
    'electron-updater must not also be in "devDependencies"',
  );
});

test('the build tools stay out of the shipped package', () => {
  // The opposite mistake: electron and electron-builder are hundreds of
  // megabytes and have no business inside the installer.
  for (const tool of ['electron', 'electron-builder']) {
    assert.ok(
      !pkg.dependencies?.[tool],
      `${tool} is a build tool and belongs in devDependencies`,
    );
  }
});

test('the launcher entry point exists and is what package.json names', () => {
  assert.equal(pkg.main, 'launcher/main.cjs');
  assert.ok(existsSync(resolve(ROOT, pkg.main)), `${pkg.main} is missing`);
});

test('everything the packaged app loads is listed in build.files', () => {
  // The game is served from inside the asar; anything missing from this list
  // 404s at runtime rather than failing the build.
  const files = pkg.build?.files ?? [];
  // CHANGELOG.md is read at runtime by the Patch Notes tab when GitHub cannot
  // be reached, so it has to be inside the package like any other asset.
  for (const needed of ['index.html', 'launcher/**/*', 'data/**/*', 'CHANGELOG.md']) {
    assert.ok(files.includes(needed), `build.files is missing "${needed}"`);
  }
  assert.ok(
    files.some((f) => f.startsWith('build/js/')),
    'build.files must include the compiled output the game actually runs',
  );
});

test('the launcher update config names a real repository', () => {
  const cfg = JSON.parse(readFileSync(resolve(ROOT, 'launcher', 'config.json'), 'utf8'));
  const { owner, repo } = cfg.github ?? {};
  assert.ok(owner && repo, 'launcher/config.json needs a GitHub owner and repo');
  assert.ok(!/^YOUR[-_]/i.test(owner), 'launcher/config.json still has a placeholder owner');
});
