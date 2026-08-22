# Changelog

The top section of this file becomes the release notes on GitHub, and those are
what the launcher shows in its Patch Notes tab. Write it for a player, not for
a maintainer: what changed that they will notice, grouped, shortest first.

Add a new `## vX.Y.Z` heading above the others before running `npm run ship`.

---

## v0.2.0

### Launcher
- Rebuilt around a sidebar: **Library** and **Patch Notes** are separate views
  instead of everything competing for one screen.
- A **library shelf** listing what is installed, with its own key art.
- **Patch Notes** reads straight from GitHub, so the list you are reading now
  appears in the launcher the moment a release goes out. The tab wears a dot
  when there is something in it you have not seen.
- The dock shows **play time**, when you last played and how much space the
  install takes, not just a version number.
- Updates now appear in a bar between the art and the buttons, and never sit in
  front of **Play**.
- New key art: the Hollow Sea at dusk, with the Bastion light and the Warden.

### Game
- A **cinematic opening** now plays the first time you start a new journey: the
  Hollow Sea at dawn, and the kin that live around it.
- **Character creation** — body, skin, hair style and colour, eyes, hat, jacket,
  shirt and trousers, with a live preview of the walk cycle.
- Your character now appears as you built them everywhere in the world and in
  every cutscene.
- NPCs address you by the name you chose.

---

## v0.1.4

### Fixed
- The launcher shipped without its updater, so **Check for updates** failed with
  an unhelpful error. Updates now work.

---

## v0.1.3

### Added
- Releases are built and published automatically by GitHub Actions.
- `npm run check-updates` diagnoses the whole update chain.

---

## v0.1.2

### Fixed
- The test suite could not run on the release machine, which blocked every
  release before it started.

---

## v0.1.1

### Changed
- Renamed from Tideward to **KinBound**.
- Automated runs of the game are silent, so testing never plays music over you.

---

## v0.1.0

First packaged build: the desktop launcher, and Act 1 of the game from Marrow
Hollow through to the Tide Bastion.
