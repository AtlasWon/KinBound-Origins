# KinBound — Amber Version

An original GBA-era monster-catching RPG. Original region, creatures, story, art and music;
built in TypeScript on an HTML5 canvas with **no runtime dependencies**.

Reference games of the era were studied for *systems and pacing only* — see
[docs/RESEARCH_NOTES.md](docs/RESEARCH_NOTES.md). No third-party assets, sprites, audio, maps,
text or code are used anywhere in this project.

---

## Playing it

The game ships as a desktop launcher: a Play button, the installed version, and
a single Update button that updates the launcher and the game together.

```bash
npm run dist
```

That writes `dist/KinBound-Setup-<version>.exe`. Run it once and KinBound lands
on the desktop and in the Start menu. Update checking stays off until you point
it at a repository — see [launcher/README.md](launcher/README.md).

To run the launcher straight from source instead:

```bash
npm run launcher
```

---

## Running it (from source, in a browser)

```bash
npm install
```

```bash
npm run compile && npm run dev
```

Then open **http://localhost:5173/**.

Add `?dev=1` to the URL to load the scripted playtest harness (see *Development* below).

| Script | What it does |
|---|---|
| `npm run compile` | Type-check and emit to `build/js` |
| `npm run watch` | Same, in watch mode |
| `npm run dev` | Zero-dependency static server on :5173 |
| `npm test` | Compile, then run the unit suite |
| `npm run build` | Minified single-file release bundle |
| `node tools/validate-maps.js` | Check every map for ragged rows, bad tiles, broken warps |
| `node tools/build-manifest.js` | Regenerate `data/manifest.json` after adding content |

---

## Controls

Everything is playable on keyboard alone, on mouse alone, or on a gamepad. All bindings are
remappable in **Options → Controls**.

| Action | Keys | Mouse | Pad |
|---|---|---|---|
| Move | `W A S D` / arrows | — | D-pad / stick |
| Confirm | `E` / `Enter` / `Space` | Left click | A |
| Cancel | `Esc` / `Backspace` / `Q` | Right click | B |
| Menu | `Tab` | — | Start |
| Run | hold `Shift` | — | LT |
| Party | `P` | — | Y |
| Bag | `I` | — | X |
| Vellum | `C` | — | — |
| Region map | `M` | Hover | Select |
| Switch tab / page | `Z` `X` | Wheel | L / R |
| Debug overlay | `F1` | — | — |

Hovering the mouse over any list row moves the keyboard cursor to it, so the two input methods
never disagree about what is selected.

---

## What is implemented

**Engine** — fixed 60 Hz simulation decoupled from rendering; 240x160 logical field rendered into a 480x320 back buffer,
integer-scaled to the window; scene stack with transparent/pass-through layers; seeded RNG used
for every roll so any battle is reproducible from a seed.

**Overworld** — ASCII-authored tile maps in a pastel handheld-era palette, grid movement with a turn window, running, ledge hops,
NPC movement patterns, warps with fades, line-of-sight trainers, hidden items, time-of-day
tinting, per-map encounter tables.

**Battle** — full turn-based engine: priority and speed ordering, the damage/accuracy/critical
pipeline, STAB, a 17-type chart, status and volatile conditions, stat stages, weather, multi-hit,
drain, recoil, screens, hazards, trapping, forced switches, capture, fleeing, EXP and EV
distribution, level-ups, move learning and evolution triggers. Simulation emits an event list that
the scene plays back, so battle speed and animation settings never change the rules.

**Trainer AI** — five tiers from `novice` to `elite`. None of them cheat: the AI sees only what an
attentive player could see. Higher tiers understand type matchups, KO range, setup timing,
switching out of bad matchups and healing.

**Field arts** — traversal gating. Bastion Keepers grant arts that retroactively open places the
player has already walked past: **Shoulder** pushes heavy stones, **Wade** crosses shallow water.
Each gym teaches its art inside the Bastion (where the puzzle is set up for it) before awarding it
for use in the world.

**Systems** — party, the Roost (storage), bag with pockets, the Vellum (encyclopedia), the region
map, shops, Waystations, save/load with three manual slots plus autosave at every Waystation, full
options with key rebinding, and a JSON event VM that drives all story content.

**Art & audio** — everything is generated at runtime from code and data: the 5x7 bitmap font, the
16x16 tileset, 16x24 character walk cycles, 64x64 creature sprites built from 14 body plans, and a
four-channel chiptune synth playing tracks authored as JSON, with procedural per-species cries.

---

## Project layout

```
src/
  core/      loop, input, scenes, assets, settings, RNG
  engine/    pixel renderer
  gfx/       font, text art, tileset, character sprites, creature sprites
  world/     tilemap, terrain vocabulary, actors
  battle/    formulas (pure), battle engine, trainer AI
  systems/   kin instances, game state, save, event VM
  ui/        menu widget, dialogue
  scenes/    title, overworld, battle, and every menu screen
  audio/     synth, music scheduler, SFX, cries
  dev/       playtest harness (only loaded with ?dev=1)
data/
  region/    type chart
  creatures/ species, abilities, natures
  moves/     move definitions
  items/     items, shop stock
  trainers/  trainer definitions
  maps/      ASCII maps
  encounters/ per-map encounter tables
  dialogue/  flag-aware NPC dialogue
  events/    story scripts for the event VM
  audio/     music tracks
tests/       unit tests (node:test)
tools/       dev server, release build, validators, manifest generator
docs/        research notes and the design bible
```

---

## Adding content

Nothing below requires touching engine code.

**A new map** — drop a JSON file in `data/maps/`. The `rows` array is ASCII art; one character is
one 16x16 tile. The vocabulary lives in `src/world/terrain.ts`:

```
.  grass      "  tall grass (encounters)   -  path      =  stone
T  tree       t  small tree                o  rock      O  boulder
~  shallow water   W  deep water           s  sand      B  bridge
#  wall       w  window                    D  door      [ ^ ]  roof
|  _  fence   !  sign      C  c  cliff     L  ledge
f  floor      r  rug       I  interior wall   K  counter   S  stairs
```

Then run `node tools/validate-maps.js` and `node tools/build-manifest.js`.

**A new creature** — append to `data/creatures/species.json`. `design.plan` picks one of the body
archetypes (`quadruped`, `biped`, `brute`, `critter`, `bird`, `grub`, `arachnid`, `mineral`,
`monolith`, `orb`, `fish`, `moth`, `aquatic`, `serpentine`) and `design.palette` gives it five
colours; sprites, icons and its cry are generated from those. The test suite checks that every
move, ability and evolution target it references actually exists.

**A new story beat** — add an `EventScript` to `data/events/<mapId>.json` and point an NPC's
`script` field at its id. Scripts have conditions (`flag`, `hasItem`, `hasSeal`, `defeated`,
`partyHas`, …) and actions (`say`, `ask`, `choice`, `giveItem`, `giveKin`, `battleTrainer`,
`move`, `warp`, `fade`, `setFlag`, `openShop`, `starterChoice`, …). NPCs with no script fall back
to the flag-aware dialogue table in `data/dialogue/`.

**A new track** — add to `data/audio/tracks.json`. A channel is a `voice` (`pulse` / `triangle` /
`noise`) and a pattern of `NOTE:STEPS` tokens, four steps to the beat. The test suite fails the
build if a track's channels do not divide evenly into the same bar length.

---

## Development

With `?dev=1`, `window.tw` exposes a scripted playtest API used to regression-check the game
visually:

```js
tw.key('Enter')             // tap a key for one tick
tw.walk('up', 3)            // walk exactly three tiles
await tw.loadWait()         // let an async map load settle
await tw.shoot('name', 8, 2)// render, then save build/shots/name.png at 2x
tw.probe()                  // scene, map, position, dialogue page
```

`F1` toggles the debug overlay: FPS, tick cost, scene stack, collision boxes and encounter zones.

### Tests

`npm test` runs the suite headlessly (109 tests). It covers:

- the damage/capture/experience maths against hand-computed values;
- a 20,000-trial Monte Carlo checking observed capture rates match the stated probability;
- 60 randomised full battles that must terminate with exactly one side standing;
- AI quality — an elite trainer must beat a novice with identical teams;
- save/load round-tripping every field of a populated game state;
- **content integrity** — every warp lands on a walkable tile, the whole world is reachable from
  the starting town, every door has a way back, and every event action, NPC script, encounter slot,
  shop entry and dialogue key resolves to something that exists;
- structural validation of every species, move, map and music track.

The content tests are the ones that matter most as the world grows: they are what caught a gym
door walled in behind its own roof, a warp landing inside a tree, and a menu cursor that could
strand the player mid-battle.

---

## Current content scale

Act 1 is playable end to end: Marrow Hollow through Route 1, Ashgate, Route 2, Kellowmere and the
Stone Bastion, then Route 3, Tanners Rest, Route 4 and Brackwater with the Tide Bastion — two Seals,
two field arts, and the antagonist's first appearance. The systems are finished; the world is
half-built.

| | Now | Design target |
|---|---|---|
| Creatures | 48 | 194 |
| Moves | 83 | 300+ |
| Maps | 29 | 40+ |
| Trainers | 29 (24 placed) | hundreds |
| Settlements | 5 of 14 | 14 |
| Bastions (gyms) | 2 of 8 | 8 |
| Field arts | 2 of 8 | 8 |

The design for the full region, story and roster is in
[docs/DESIGN_BIBLE.md](docs/DESIGN_BIBLE.md).
