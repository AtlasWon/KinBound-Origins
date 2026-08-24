# Changelog

The top section of this file becomes the release notes on GitHub, and those are
what the launcher shows in its Patch Notes tab. Write it for a player, not for
a maintainer: what changed that they will notice, grouped, shortest first.

Add a new `## vX.Y.Z` heading above the others before running `npm run ship`.

---

## v0.11.0

### You can't get stuck any more

Losing to your friend on the road below the lab left you frozen in place,
permanently. The script that was meant to carry on after that loss and the
blackout that normally follows one were both driving the field at the same
time, and the world only has room for one of them -- so whichever started
second quietly deleted the other, and nothing was left to give you back control.

### Breathing no longer touches the artwork

Four different rules for where to compress a creature have now been tried, and
every one of them landed on somebody's face -- the eye, the beak, the muzzle.
There is no row that is safe on all forty-eight drawings, so the technique is
gone. A kin now bobs on the spot as a whole, exactly as people in the world
already do. Nothing inside the drawing can move relative to anything else, so
nothing can be squashed or stretched, on any creature, ever.

### Letters have room

Names were running their letters together -- the double L in Rilltail, the
double L in Wallshield. This was the font itself rather than the layout, which
is why two previous passes did not fix it.

### Items do something now

- **Using a potion had no effect at all** -- no animation, no sound, nothing.
  Now light falls onto the creature and settles at its feet while its health
  climbs.
- **The vessel has weight.** It used to glide down and stop, like something
  being placed. It now accelerates in, bites the ground, jolts the field on
  every wobble and locks with a snap.
- Your drawn Potion and Vessel are in the game, and the open vessel is used for
  the throw.

### The world

- Every route re-tuned so difficulty climbs gently rather than in a step. Route
  2 no longer out-levels a player who has just finished Route 1.
- The player walks a little slower.
- Transitions no longer stutter at the end.
- More detail and more colour everywhere -- grass, trees, water, paths, houses,
  fences, furniture.
- Some buildings have an upstairs.
- Nothing blocks a doorway any more.
- The starters sit on their own table in the lab rather than on the equipment.
- NPCs have something to say worth reading.
- Beat your friend and you are taken home, where your mother patches your kin
  up -- so you know where to do that when you need it.

## v0.10.0

### Three battle bugs, and two of them were not what they looked like

- **A kin you switch to no longer arrives already hurt.** The whole turn is
  worked out before any of it is drawn, and the send-out was reading the kin's
  health at the end of the turn instead of at the moment it walked on. So it
  arrived showing damage from an attack you had not watched yet.
- **Experience was always being awarded correctly** -- the bar was lying about
  it. It was drawn from the wrong starting number, so it overshot by one
  award, and the next fight then animated from the wrong place to the same
  place, which is a bar that does not move at all. That is why a kin you
  switched away from looked like it got nothing.
- **Breathing no longer damages faces.** The rule picked the widest solid line
  across a creature, which on anything drawn side-on is the line through its
  nose, back and tail at once -- in other words, the line through its eyes. It
  now picks the row where a creature least notices losing one, and every one of
  the 48 was checked by eye.

### The world

- **Routes are routes now.** All four were the same map: a straight dirt spine
  from gate to gate with grass rectangles either side and trainers standing in
  the open. Each is rebuilt around one idea -- a fork you choose between, a
  shore, a terrace, a wood -- with ledges, pockets and things worth going out
  of your way for.
- **Tall grass is one clump per square** again, the way it should be, with
  ground showing between.
- Map edges are woodland unless the place is a mountain or a cave.
- Interior doorways sit **in** the wall, and stairs fall away into the dark.
- Transitions last about twice as long and ease in and out.
- The lab door lines up with the actual door, and Dr. Vess is no longer
  standing inside the kin behind him.
- Your friend now heads **for the lab** after greeting you, rather than walking
  the wrong way and vanishing in the open.

### Battle effects

Every attack was erasing the creature it hit -- the impact flared from the
contact point outward, so for several frames the defender was a white flower at
the exact moment you were meant to see what happened. Impacts now clear the
creature's silhouette and read as force rather than as a flash.

### Opening

The cinematic and the main menu are one continuous piece now, and the flying kin
read as flying rather than as standing in the air, which is what they had
started doing once real artwork replaced the drawn-in-code sprites.

## v0.9.0

### Twenty-seven kin drawn

Nine more species arrived, so 27 of the 48 are now hand-drawn art and the rest
still render as before.

### The world

- **Trees are trees.** They had no trunks -- a treeline was one unbroken sheet
  of green cladding. Each tree now has a crown, a trunk, roots and ground you
  can see between them.
- **Tall grass** is a real mass of individual blades instead of a flat green
  band with a sawtooth on top, and **walking into it hides your legs** the way
  it should.
- **The rock at the edge of the map** has strata, a lit top and shadowed
  undercuts, instead of being grey noise stood on end.
- **Water moves.** A slow swell and a glitter that twinkles rather than slides.
- **Doorways inside buildings are dark openings** now, not a door drawn on the
  wall.
- Interior walls are one quiet colour with a pattern. Houses, fences, signs,
  shelves and the rest of the furniture were all redrawn.

### The lab

The three starters sit on the counter behind Dr. Vess. Take one and it hops
down and comes with you -- and the other two are still sitting exactly where
they were, in the room and afterwards.

### Battle

- **The breathing bug is fixed, and it was the opposite of what it looked
  like.** The compression was landing in the legs, so every breath dropped the
  whole creature onto its own stumps -- the top was not being squashed, it was
  being driven down. It now compresses the widest part of the body.
- **Every attack used to open on the same white flower.** A zero-length arc
  drawn with a round cap is a filled circle, so all eight impact spokes fired
  as fat white dots and froze there. Fire, ice, thunder and steel all landed
  identically. They are now distinct.
- **Attack sounds have a shape.** Every impact was written on the music
  envelope -- a flat rectangle of noise that stopped. They now hit and decay,
  and heavier damage sounds heavier.
- **Levelling up is a moment**, with an effect and a sound.
- The kin currently fighting sits in the large slot on the swap screen.
- Sending a kin out and calling it back were both rebuilt again.

### Everything else

- **The game fills more of the screen.** Three fits to choose from; the new
  default gains 26% more picture with no bars top or bottom.
- **Borderless fullscreen by default**, with a windowed option.
- **Text no longer collides.** Names, moves, descriptions and menus all measure
  themselves now, and a description that has to be cut says so.
- Arrow keys and WASD both move up and down in menus.
- Talking to someone no longer needs you to be perfectly lined up with them.
- Sprint is gone. Walking is faster instead.
- Doors, caves, stairs and route edges each get their own transition.

## v0.8.0

### The battlefield

The grass arena was three flat bands of colour and one flat hill. It is now
built in layers -- sky, cloud, a broken horizon, distant trees, mid ground,
foreground clumps -- with a real platform under each creature so they stand on
something instead of floating on a stripe. Every arena got the same treatment,
not just the grass one.

One thing that had been wrong for a long time: the far creature's platform was
drawn above the horizon. It was in the sky.

### Moves and idles land where they should

- **Attack effects hit the creature.** They were anchored to the middle of the
  sprite's frame rather than to the creature, so on anything that does not fill
  its frame the effect played above its head. It is now aimed at the animal's
  own mass, and where a creature is tall the shot lifts toward the chest rather
  than the legs.
- **Breathing moves the body, not the head.** The idle compressed the sprite at
  a fixed height that happened to fall through the chest, so heads squashed and
  legs stayed still. The compression now sits low on each creature, so the
  haunches and legs work and the head rides on top.
- **Sending a kin out no longer cuts it in half.** The creature used to be
  revealed by a hard edge travelling up its body. Now the vessel splits, light
  falls on the pad, and the kin forms inside it as white light before its colour
  comes back. Recalling, fainting and capturing all follow the same rule.

### An easier start

Measured over 2,000 simulated battles per matchup rather than guessed at.

- The first trainer went from a **67% win rate to 97%** for the starter that was
  struggling, and he is no longer better trained than you are.
- The first unavoidable trainer on Route 1 went from **7% to 89%**.
- Route 1's grass is calmer: the creatures that counter your starter are rarer
  and a level lower, and the neutral ones are commoner.

Nothing past Route 2 was touched.

## v0.7.0

### Hand-drawn kin

The creature sprites used to be generated by code. Fifteen species are now
hand-drawn artwork, and the rest will follow.

- **Sprigling, Cinderpaw and Rilltail, and their full evolution lines**, are all
  drawn, front and back -- so whichever starter you pick is hand-drawn from the
  lab through both of its evolutions.
- Also drawn: Nibbet, Burrowen, Pipwing, Kestrelle, Galecrest and Nettlebug.
- The species still to come look exactly as they did before, so nothing is
  missing and nothing looks half-finished while the rest of the art arrives.

### Underneath the art

- Creatures are sized against each other honestly now. A grub is small and a
  standing stone is tall. They used to be drawn at roughly the same size
  whatever they were, which quietly flattened the whole roster.
- Drawn and generated creatures stand on the same ground line, so the two kinds
  share a battle without one of them floating.
- The party screen and the in-battle switch list take their small pictures from
  the artwork directly rather than shrinking it blindly, so faces survive at
  icon size.

### The last of the generated-art work

Before the hand-drawn sprites arrived, three faults were fixed that affected
every generated creature -- and the 33 species still waiting for art benefit
from all of them.

- **The dots are gone.** A texture pass was stamping roughly four hundred
  one-cell flecks of "scales" or "grain" or "hide" across the whole body of
  every creature. Nothing in a GBA-era sprite is textured that way -- what looks
  like scales there is four scales drawn where a scale would catch the light.
  The pass is deleted. Where a creature genuinely needs a material, it is now
  drawn deliberately, in the few places it belongs.
- **The eyes are a quarter the size.** They were built from nine separate
  elements each -- an almond, an outline ring, a lid shadow, a lit floor, a
  pupil, a white sliver, a boundary line, a glint and a warm bounce cell -- and
  a single eye came to over a hundred pixels, which is why they took up most of
  the face. An eye is now a shape, a pupil and one glint. The largest eye on the
  roster went from 371 pixels to 75, and there is a hard cap so it cannot creep
  back.
- **You can tell a limb from a body.** Only the outer silhouette used to be
  inked, so an arm crossing a chest dissolved into it. Every distinct part is
  now bounded, the way it is in the sprites this game is chasing -- a far leg is
  both darker and outlined, and a near leg crossing the body carries its own
  seam.

### And then all forty-eight redrawn onto it

Flattening the shading to hold large flat areas suited the saturated creatures
and washed out the pale ones, so every near-white species got real contrast put
back deliberately -- a dark underside, dark extremities, a shadowed recess.

- Several creatures had no findable face. A viewer should know where a creature
  is looking within a moment, and now they do.
- The rock kin were five grey blobs and are now five animals. The standing stone
  has a carved face. The plated one reads as a beast with a ridged back.
- The two white wolves have legs you can trace.
- The moth resolved into a moth.
- One creature was rendering with four eyes: its ear hollows were dark discs the
  size of a pupil, sitting forward of the real pair.

## v0.6.0

### Every kin redrawn, one at a time

Forty-eight species used to be drawn by fourteen shared body plans, so any two
species on the same plan were the same animal in different paint. All three
starters sat on the same plan -- which is exactly what it looked like.

Every creature now has its own design, drawn from the description already
written for it. The roster passes a silhouette test: fill each one with a single
flat colour and no two are the same shape.

- **The starters are three different animals.** A squat leaf-bud low to the
  ground, a fox caught mid-step with a raised forepaw and a curling plume, and
  an otter sitting up on its haunches with its hands at its chest.
- A reared serpent over its own coil. A leaning kelp column on a splayed
  holdfast. A hanging lantern with a face and two hooks. An anchor. An
  anglerfish holding its lure out in front of it. A cricket coiled on one raised
  femur. A flounder lying in profile with both eyes on one side of its skull.
  A standing stone. A heron on stilt legs.
- **Evolution families look related** without being the same drawing scaled up:
  a crab and a bigger crab sharing a claw, a cub and the cat it becomes sharing
  ears and a tail flame, a chalk figure and the armoured slab it grows into.
- Every creature is legible at **icon size** as well as in battle, because that
  is what the party and switch screens draw.

Underneath it: a per-species design layer and a library of sixty-nine drawing
tools -- limbs along curved paths, digitigrade legs, paws with separated toes,
gripping hands, jaws with teeth, beaks, feathered and membraned wings, fins with
rays, shells, horns, manes, four kinds of tail, and eyes in six shapes, because
eye shape is most of a creature's character.

---

## v0.5.0

### Fixed
- **Furniture stopped bringing its own floor.** Every chair, plant and table
  carried a baked-in wooden background, so in the laboratory they sat in brown
  squares on a white tiled floor. Furniture is transparent now and picks up
  whatever floor it is standing on, with a shadow where it meets it.
- The move panel's type name ran into its own chip.
- The command pad marked the three options you were **not** choosing. Now it
  marks the one you are.

### Interfaces
- **The switch screen** is a card for the kin that is out and a bench row for
  each of the others, all with portraits, health bars and numbers -- instead of
  a text list spilling out of the message box.
- **The party screen** outside battle was a white sheet with black text. It is
  now a tall lead card and five bench cards, tinted by type, each carrying its
  own portrait, level, health bar and status.
- **The character creator** lays out its columns from measured text, so nothing
  overlaps whatever the labels turn out to be.
- **The region map** is a proper sea chart: depth contours, forest, the crescent
  road, a compass, a scale, and a legend that fills in as you travel.

### Battle
- **Kin come out of their vessels.** The capsule arcs in, splits, opens a cone
  of light and the creature grows out of it before the capsule flies back.
  Recalling reverses it, a faint sinks instead of vanishing, and a capture pulls
  the kin into the beam before the vessel starts to wobble.
- Damage lands three frames after the hit rather than eighteen.
- Route 1 trainers field one kin each.

### Elsewhere
- **Creatures are drawn at twice the resolution** and detailed to match.
- **The cinematic explains itself.** It goes through the drowned town of Old
  Tidefall and Dr. Vess's wall of charts before it reaches the house with the
  light on -- so that house is the reason the game starts, not a picture of a
  window. And the kin face the way they are going.
- NPCs talk like people: contractions, half-finished thoughts, and things they
  only tell you once the story has moved on.

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
