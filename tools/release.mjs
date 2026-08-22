/**
 * Cut a release.
 *
 * Builds the installer and publishes it to GitHub Releases, which is where the
 * launcher looks for updates. The repository comes from launcher/config.json --
 * the same file the launcher reads at runtime -- so there is exactly one place
 * to set it and the two can never disagree about where updates live.
 *
 *   node tools/release.mjs            build and publish
 *   node tools/release.mjs --dry-run  build only, publish nothing
 *
 * Needs GH_TOKEN in the environment: a GitHub personal access token with
 * `repo` scope (or `public_repo` for a public repository).
 */

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dryRun = process.argv.includes('--dry-run');

/**
 * In CI the release is published outright rather than left as a draft.
 *
 * Pushing a version tag is already the deliberate act; a second confirmation
 * step is the one people forget. Run by hand, it still produces a draft, so
 * a local build cannot accidentally ship to everyone.
 */
const ci = process.argv.includes('--ci');

const die = (msg) => { console.error(`\nrelease: ${msg}\n`); process.exit(1); };

const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));
const cfg = JSON.parse(readFileSync(resolve(ROOT, 'launcher', 'config.json'), 'utf8'));
const { owner, repo } = cfg.github ?? {};

if (!owner || !repo) {
  die('launcher/config.json has no GitHub owner/repo yet.\n'
    + '        Set them to the repository that will hold the releases, e.g.\n'
    + '          "github": { "owner": "your-name", "repo": "kinbound" }');
}

if (!dryRun && !process.env.GH_TOKEN) {
  die('GH_TOKEN is not set.\n'
    + '        Create a token at https://github.com/settings/tokens (scope: repo)\n'
    + '        then:  $env:GH_TOKEN = "ghp_..."   (PowerShell)');
}

console.log(`\nKinBound release`);
console.log(`  version    v${pkg.version}`);
console.log(`  repository ${owner}/${repo}`);
console.log(`  mode       ${dryRun ? 'dry run (no publish)'
  : ci ? 'publish, live' : 'publish, as a draft'}\n`);

// Compile first: the packaged app ships build/js, not src.
const compile = spawnSync('npx', ['tsc'], { cwd: ROOT, stdio: 'inherit', shell: true });
if (compile.status !== 0) die('TypeScript build failed; nothing was published.');

// Every field of the publish block has to be supplied together. Passing a
// single `-c.publish.x=y` *replaces* the whole block rather than merging into
// it, so setting only releaseType leaves a config with no provider and
// electron-builder refuses it before building anything.
const args = [
  'electron-builder',
  '--win',
  '--publish', dryRun ? 'never' : 'always',
  '-c.publish.provider=github',
  `-c.publish.owner=${owner}`,
  `-c.publish.repo=${repo}`,
  `-c.publish.releaseType=${ci ? 'release' : 'draft'}`,
];

const build = spawnSync('npx', args, { cwd: ROOT, stdio: 'inherit', shell: true });
if (build.status !== 0) die('electron-builder failed.');

console.log('\nDone.');
if (dryRun) {
  console.log(`  Installer written to dist/KinBound-Setup-${pkg.version}.exe`);
} else if (ci) {
  console.log(`  Published v${pkg.version} on ${owner}/${repo}.`);
  console.log('  Every installed launcher will offer it on its next start.');
} else {
  console.log(`  Published as a draft release on ${owner}/${repo}.`);
  console.log('  Open the repo\'s Releases page and press Publish release.');
  console.log('  Until it is published, launchers will not see the update.');
}
console.log('');
