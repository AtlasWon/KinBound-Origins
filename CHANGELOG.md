# Changelog

The top section of this file becomes the release notes on GitHub, and those are
what the launcher shows in its Patch Notes tab. Write it for a player, not for
a maintainer: what changed that they will notice, grouped, shortest first.

Add a new `## vX.Y.Z` heading above the others before running `npm run ship`.

---

## v0.4.0

### The world
- **Towns are towns now.** Buildings sit along the roads instead of marooned in
  fields, and no two look alike -- slate, hipped and terracotta roofs over
  timber, brick and plaster walls, with shuttered windows, flower boxes and
  porch awnings. Marrow Hollow finally has the six houses its signpost has
  always claimed, plus a well, a fenced pond, flower beds and lamp posts.
- **The laboratory is a laboratory.** Wide, low, flat-decked, with a roof vent,
  full-height glazing and a double glass door -- and inside, machine banks with
  lit panels, a console, specimen tanks, workbenches and a cable run.
- **Every room was rebuilt.** Nineteen interiors, no two houses laid out the
  same, one of them still half unpacked because the writing says that family
  moved in three months ago. Waystation keepers and shop clerks stand in a gap
  in the counter, so you face the person you are talking to.

### The creatures
- Real modelling: bands with visible steps, core shadows, occlusion where a
  limb meets a body, and a separate ramp per material so a pale belly stays
  pale in shadow.
- Anatomy — feet with toes and claws, muzzles, jaw lines, limb joints, tail
  segments, fin and wing struts.
- Type character: flame kin carry tongues with hot cores, tide kin have fins
  and gills, verdant leaf blades, stone facets, iron rivets.
- Several species were being quietly beheaded by the old sprite bounds. They
  fit now.

### Battles
- The turn reads in order: the move is named and held, the attacker winds up
  and strikes, the hit lands, and only then does the bar drain -- eased, and
  with the number counting down in step with it.
- **Moves are performances.** Every element has a wind-up, a travel and an
  arrival of its own: a flamethrower is a stream of fireballs with smoke coming
  off them, lightning re-forks every frame, frost assembles in the air and
  shatters, the ground splits toward you and throws rubble.
- Sprites breathe between turns and flinch when hit.

### Elsewhere
- The **opening cinematic** was re-cut: six shots with three layers of parallax
  each, camera moves, a storm at sea, and a title card at the end. Its music is
  twice as long and has surf under it.
- **Nobody stands still.** Every character in the world breathes, on their own
  phase, and keeps breathing while you talk to them.
- **Dialogue sounds like speech**: the blips are three times louder, layered,
  pitched per speaker, and inflected from letter to letter.

---

## v0.3.1

### Changed
- Waystations and provisioners have **hard tiled floors** now, where houses have
  boards. You can tell which kind of room you are in before you have read a
  word of it.
- The waystation keeper introduces herself, asks before she takes your kin, and
  uses your name.

---

## v0.3.0

### The world looks like the era it is quoting
- Everything is drawn on the **GBA pixel grid** now. The game was rendering at
  twice the density of the hardware it takes after, which is why it read as
  smooth rather than as pixel art. Tiles, characters and creatures all sit on
  the same grid.
- **Characters are redrawn from scratch**: a head nearly half the height of the
  body, two-pixel eyes, and a walk that swaps the legs over instead of
  jiggling them.
- Grass is a repeating weave rather than noise, paths are sand with grit, and a
  road gets its dithered lip against turf automatically.
- **Houses are furnished** — table, chairs, television, kitchen units, a plant,
  a rug that reads as one rug rather than a grid of doormats.
- **Waystation keepers wear red and white and shop staff wear blue**, so you
  can tell at a glance which counter you are standing at. Kids, elders,
  fishers and sailors got their own looks too.
- The kin have eyes you can read across a battle.

### Fixed
- Walking up to a **signpost** deleted the top half of the player. Tall tiles
  now sort with the people standing in front of them.
- The screen **shook when walking diagonally**.
- Every knockout was announced **twice** and paid experience twice.

### Easier, and better paced
- The first fights were **unwinnable** -- measured at three wins in a hundred.
  Early teams were stacked by type, so whichever starter you picked several of
  the opening fights were hard counters. Teams are spread out, the starter is a
  level higher, and three trainers are gone from the early routes.
- Battles are **paced**: the move, the damage and the next menu no longer land
  on the same frame.
- Impacts hit harder -- rings, spokes, a coloured flash, and sounds with a body
  under the crack.

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
- A **cinematic opening** plays the first time you start a new journey: dawn
  over the Hollow Sea, the herds crossing the plains, the deep with something
  very large moving through it, and one house on the north shore with a light
  on. New music written for it, and skippable from the first frame.
- **Character creation.** Body, skin tone, eight hair styles in twelve colours,
  eye colour, six kinds of headwear, jackets and hoodies, shirt, trousers,
  shoes, glasses and a pack — all previewed on a character who walks and turns
  while you choose.
- Your name goes in the same screen, and **NPCs use it** from your mother's
  first line onwards.
- Your character appears as you built them everywhere: the world, the cutscenes,
  all four directions.

### Fixed
- The side-facing character sprite had its eye and nose drawn on the back of its
  head. It now faces the way it is walking.

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
