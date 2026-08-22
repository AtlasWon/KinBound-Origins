/**
 * Diagnose the update chain, end to end.
 *
 *   npm run check-updates
 *
 * "The Update button isn't showing" has about six possible causes and they all
 * look identical from the launcher. This walks the whole chain in order and
 * says which link is broken:
 *
 *   config -> remote -> reachable -> pushed -> releases -> latest.yml -> version
 *
 * Everything here is a read-only, anonymous request. No token needed, and it
 * never touches the repository.
 */

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const H = { 'User-Agent': 'kinbound-update-check' };

const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m) => console.log(`  ✗ ${m}`);
const info = (m) => console.log(`    ${m}`);

let blocked = false;
const stop = (m, fix) => {
  bad(m);
  if (fix) info(`fix: ${fix}`);
  blocked = true;
};

console.log('\nKinBound update chain\n');

/* ------------------------------------------------------------- 1. config */

const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));
const cfg = JSON.parse(readFileSync(resolve(ROOT, 'launcher', 'config.json'), 'utf8'));
const owner = cfg.github?.owner ?? '';
const repo = cfg.github?.repo ?? '';

if (!owner || !repo) {
  stop('launcher/config.json has no repository set',
    'add "github": { "owner": "...", "repo": "..." }');
} else {
  ok(`config points at ${owner}/${repo}`);
  info(`local version is v${pkg.version}`);
}

/* --------------------------------------------------------- 2. git remote */

if (!blocked) {
  try {
    const remote = execFileSync('git', ['remote', 'get-url', 'origin'], { cwd: ROOT })
      .toString().trim();
    const matches = remote.toLowerCase().includes(`${owner}/${repo}`.toLowerCase());
    if (matches) ok(`git remote matches (${remote})`);
    else stop(`git remote is ${remote}, which is not ${owner}/${repo}`,
      `git remote set-url origin https://github.com/${owner}/${repo}.git`);
  } catch {
    stop('no git remote called "origin"',
      `git remote add origin https://github.com/${owner}/${repo}.git`);
  }
}

/* ------------------------------------------------------- 3. reachability */

let publicRepo = false;
if (!blocked) {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers: H });
  if (res.ok) {
    const j = await res.json();
    publicRepo = !j.private;
    if (publicRepo) ok('repository is public, so the launcher can read it with no token');
    else stop('repository is private',
      'make it public, or the shipped launcher cannot download updates without a token');
  } else if (res.status === 404) {
    stop('repository is not readable anonymously (private, or the name is wrong)',
      'make it public in Settings > General > Danger Zone > Change visibility');
  } else {
    stop(`GitHub returned ${res.status} for the repository`);
  }
}

/* --------------------------------------------------------------- 4. push */

// Not strictly required for updates to work -- a release is built locally and
// uploaded -- but an empty repository almost always means the whole setup was
// never finished, and it is the first thing to check when nothing works.
if (!blocked && publicRepo) {
  try {
    const refs = execFileSync('git', ['ls-remote', '--heads', 'origin'], {
      cwd: ROOT,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    }).toString().trim();

    if (!refs) {
      stop('the repository is empty — nothing has been pushed',
        'git push -u origin main');
    } else {
      const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT }).toString().trim();
      if (refs.includes(head)) ok('local commits are pushed');
      else {
        ok('repository has commits');
        info('note: your newest local commit is not on the remote yet (git push)');
      }
    }
  } catch {
    info('could not read remote refs; skipping the push check');
  }
}

/* ----------------------------------------------------------- 5. releases */

let latest = null;
if (!blocked) {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases`, { headers: H });
  const list = res.ok ? await res.json() : [];
  const published = list.filter((r) => !r.draft);
  if (published.length === 0) {
    const drafts = list.length - published.length;
    stop(drafts > 0
      ? `${drafts} draft release(s) but nothing published`
      : 'no releases yet',
      drafts > 0
        ? 'open the Releases page and press "Publish release" — drafts are invisible to launchers'
        : 'npm run release');
  } else {
    latest = published[0];
    ok(`latest published release is ${latest.tag_name}`);
  }
}

/* --------------------------------------------------------- 6. the manifest */

if (!blocked && latest) {
  const names = (latest.assets ?? []).map((a) => a.name);
  if (!names.includes('latest.yml')) {
    stop('the release has no latest.yml',
      'this is the file the updater actually reads. Publish with "npm run release" '
      + 'rather than uploading the .exe by hand');
  } else {
    ok('latest.yml is attached');
  }
  const installer = names.find((n) => /\.exe$/i.test(n));
  if (installer) ok(`installer asset: ${installer}`);
  else stop('the release has no .exe asset');
}

/* ----------------------------------------------------------- 7. versions */

if (!blocked && latest) {
  const released = latest.tag_name.replace(/^v/, '');
  const installed = installedVersion();
  info(`released v${released}  |  source v${pkg.version}  |  installed ${installed ?? 'not found'}`);

  if (installed && cmp(released, installed) > 0) {
    ok(`the installed launcher should be offering v${released}`);
  } else if (installed && cmp(released, installed) === 0) {
    ok('the installed launcher is on the latest release, so it will say "Up to date"');
  } else if (installed) {
    bad(`installed (${installed}) is newer than the latest release (${released})`);
    info('the launcher will not offer an update. Bump "version" in package.json and re-release');
  }
}

/* -------------------------------------------------------------- verdict */

console.log('');
if (blocked) {
  console.log('Not ready yet — fix the first ✗ above and run this again.\n');
  process.exitCode = 1;
} else {
  console.log('Update chain is healthy.\n');
}

/* ------------------------------------------------------------- helpers */

/** Semver-ish compare, enough for the x.y.z tags electron-builder produces. */
function cmp(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) > (pb[i] ?? 0) ? 1 : -1;
  }
  return 0;
}

/**
 * What the installer registered, if this machine has KinBound installed.
 *
 * The whole Uninstall tree is dumped and split into per-key blocks rather than
 * letting `reg` filter it. `reg query /f KinBound /d` returns only the *lines*
 * whose data matched -- so DisplayName came back and DisplayVersion, whose data
 * is just a number, never did. The version was always missing, and the report
 * said "not installed" for a machine that plainly had it.
 */
function installedVersion() {
  if (process.platform !== 'win32') return null;
  try {
    const out = execFileSync('reg', [
      'query', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall', '/s',
    ], { maxBuffer: 16 * 1024 * 1024 }).toString();

    // Blocks are separated by the blank line before each key path.
    for (const block of out.split(/\r?\n\r?\n/)) {
      if (!/DisplayName\s+REG_SZ\s+.*KinBound/i.test(block)) continue;
      const m = /DisplayVersion\s+REG_SZ\s+([\d.]+)/.exec(block);
      if (m) return m[1];
    }
    return null;
  } catch {
    return null;
  }
}
