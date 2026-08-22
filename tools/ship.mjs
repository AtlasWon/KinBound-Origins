/**
 * Ship a release.
 *
 *   npm run ship patch     0.1.0 -> 0.1.1   a fix
 *   npm run ship minor     0.1.0 -> 0.2.0   new content
 *   npm run ship major     0.1.0 -> 1.0.0
 *   npm run ship 0.4.2     an exact version
 *   npm run ship patch --dry-run
 *
 * Bumps the version, commits, tags and pushes. GitHub Actions does the rest:
 * it builds the installer on a clean Windows runner, runs the suite, and
 * publishes the release. Every launcher offers the update on its next start.
 *
 * There is deliberately no "release without a version bump" path. The launcher
 * compares against package.json, so a release whose version did not move is
 * invisible -- it looks exactly like a broken updater, and it is the single
 * most common way this goes wrong.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run');
const bump = argv.find((a) => !a.startsWith('--')) ?? 'patch';

const die = (msg, fix) => {
  console.error(`\nship: ${msg}`);
  if (fix) console.error(`      ${fix}`);
  console.error('');
  process.exit(1);
};

const git = (...args) => execFileSync('git', args, { cwd: ROOT }).toString().trim();

/* ---------------------------------------------------------- preflight */

const pkgPath = resolve(ROOT, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const current = pkg.version;

// A dirty tree means the tag would not describe what actually gets built.
const dirty = git('status', '--porcelain');
if (dirty && !dryRun) {
  die('you have uncommitted changes, so the tag would not match what is built.',
    'commit or stash them first:  git add -A && git commit -m "..."');
}

let branch = '';
try { branch = git('rev-parse', '--abbrev-ref', 'HEAD'); } catch { /* no commits yet */ }
if (branch !== 'main') {
  console.log(`ship: warning - you are on "${branch}", not main.`);
}

/* ------------------------------------------------------------ version */

function next(version, how) {
  if (/^\d+\.\d+\.\d+$/.test(how)) return how;
  const [maj, min, pat] = version.split('.').map(Number);
  if (how === 'major') return `${maj + 1}.0.0`;
  if (how === 'minor') return `${maj}.${min + 1}.0`;
  if (how === 'patch') return `${maj}.${min}.${pat + 1}`;
  die(`"${how}" is not a bump type or a version.`, 'use patch, minor, major, or e.g. 0.4.2');
  return version;
}

const version = next(current, bump);
const tag = `v${version}`;

// Re-using a tag would silently ship different bytes under a version somebody
// already downloaded.
let existing = '';
try { existing = git('tag', '--list', tag); } catch { /* no tags yet */ }
if (existing) {
  die(`tag ${tag} already exists.`, 'pick a different version, or delete it:  git tag -d ' + tag);
}

console.log(`\nKinBound ship`);
console.log(`  ${current}  ->  ${version}`);
console.log(`  tag       ${tag}`);
console.log(`  branch    ${branch}`);
if (dryRun) {
  console.log('\n  dry run - nothing was changed.\n');
  process.exit(0);
}

/* -------------------------------------------------------------- do it */

pkg.version = version;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

// Keep the lockfile's version in step so npm ci in CI does not complain.
try {
  const lockPath = resolve(ROOT, 'package-lock.json');
  const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
  lock.version = version;
  if (lock.packages && lock.packages['']) lock.packages[''].version = version;
  writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n');
} catch {
  // No lockfile, or an unfamiliar shape: not worth failing a release over.
}

git('add', 'package.json', 'package-lock.json');
git('commit', '-m', `Release ${tag}`);
git('tag', '-a', tag, '-m', `KinBound ${tag}`);

console.log('\n  pushing...');
try {
  git('push', 'origin', branch);
  git('push', 'origin', tag);
} catch (err) {
  console.error('\nship: the push failed. The commit and tag exist locally.');
  console.error('      Sign in to GitHub and run:');
  console.error(`        git push origin ${branch} && git push origin ${tag}`);
  console.error('');
  process.exit(1);
}

const remote = git('remote', 'get-url', 'origin')
  .replace(/\.git$/, '')
  .replace(/^git@github\.com:/, 'https://github.com/');

console.log(`\nDone. GitHub is building ${tag} now.`);
console.log(`  progress  ${remote}/actions`);
console.log(`  release   ${remote}/releases/tag/${tag}`);
console.log('\nWhen it finishes, every installed launcher offers the update on its next start.');
console.log('Check the whole chain any time with:  npm run check-updates\n');
