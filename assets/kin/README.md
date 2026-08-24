# Creature art

## If your drawing is not already a 128x128 sprite

Drop it in this folder under any name and run:

```
npm run kin:import
```

It moves your file into `assets/kin/source/` -- which it never writes to or
deletes from again, so that folder is the permanent copy of what you drew -- and
writes a finished `<species-id>-front.png` next to this file. It recovers the
palette, hardens the alpha, scales the creature to the size its height in
`data/creatures/species.json` says it should be, and seats it on the ground
line. Run it as often as you like; it always starts from `source/` and never
from its own output.

Everything below describes what a finished sprite has to look like -- which is
what the importer produces, and what to aim for if you would rather draw
straight to 128x128 and skip it.

## The files

Hand-drawn sprites go in this folder. Anything not drawn yet is generated in
code as before, and the two live side by side permanently -- you can deliver one
creature, or one view of one creature, and the game stays playable.

```
assets/kin/<species-id>-front.png
assets/kin/<species-id>-back.png
```

- **128 x 128** canvas.
- **PNG with hard alpha.** Every pixel fully opaque or fully clear. No
  anti-aliasing, no soft edges, no semi-transparent shading. (The loader will
  flatten anything in between, but then *it* is choosing where your edge lands,
  not you.)
- **front** is the creature as an opponent, seen from the front, facing **left**
  toward the viewer.
- **back** is the same creature from behind, facing **away to the right**.
- The species id is the exact id from `data/creatures/species.json`, and the
  whole filename is lowercase -- `cinderpaw-front.png`, not `Cinderpaw-Front.png`
  and not `cinderpaw_front.png`. (Windows will not notice the capitals. A web
  host will.)
- **Nothing on the canvas but the creature.** No background fill, no frame, no
  ground plane, no signature, no leftover colour swatch in a corner. Every
  opaque pixel counts as part of the creature: one stray dot in the top-left
  throws the framing off, and an opaque background makes the whole 128x128
  square "the creature".

## Framing

Draw the creature roughly centred and standing near the bottom. You do not have
to be exact: the loader finds the real ink of the drawing and seats it on the
same ground line and centre line the generated sprites use, so a creature drawn
eight pixels high or off to one side still stands correctly beside its
neighbours. Nothing floats and nothing sinks.

Do **not** draw a shadow under the creature. The game lays one down itself, the
same one every generated sprite gets, so that an image creature and a generated
one cast the same shadow in the same battle.

Keep the creature within 128 wide and 124 tall. Anything bigger has to be shrunk
to fit, which costs crispness.

Draw the back view at roughly the height of the front view. Both are seated on
the same ground line, so a back drawn noticeably smaller reads as a different
creature when the battle switches between them.

The **front faces left** and the **back faces away to the right**. This is not
only convention: the title-screen flock mirrors a creature to turn it around and
assumes left-facing art, so a front drawn facing right will walk backwards
across the title screen.

## Draw in 2x2 blocks

This is the one rule that is not obvious and matters most.

The 64px party icon is the front sprite halved. If the art is built from 2x2
pixel blocks -- effectively a 64x64 drawing at double size -- the halving is
*exact*: every icon pixel is a colour that was really in the drawing, nothing is
blended, nothing is invented. If it is not, the icon is a best-effort majority
vote per block and comes out visibly soft.

You do not have to line the blocks up with the corner of the canvas; the loader
will nudge the whole drawing by up to one pixel to find the grid. You do have to
work in blocks.

`npm run kinart` prints an `on-grid` percentage for every file. 100% is the
target. Below 60% and it will tell you the icon is going to look soft.

## Checking your work

```
npm run kinart
```

Writes `assets/kin/index.json` (the list the game reads instead of hunting for
files) and reports anything wrong: bad names, wrong canvas size, anti-aliased
edges, a creature too big for the cell, a front and back that are the same file,
a view missing its partner, and the on-grid percentage.

Nothing it reports can break the game. A file the game cannot use falls back to
the generated sprite for that species, and says so in the console.

For a test with no real art at all: `node tools/kinart-placeholders.js` writes
four obviously-fake PNGs, `node tools/kinart-placeholders.js --clean` removes
them again.

`index.json` is generated. Do not edit it by hand.
