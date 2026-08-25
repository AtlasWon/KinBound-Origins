# Item icon spec

What the game needs from a hand-drawn item icon. Written for whoever is making
the art, not for the engine. It is the same road `docs/SPRITE-SPEC.md` lays out
for creatures, with the three things that genuinely differ called out.

There is a checker that reads a folder of these and tells you what is wrong with
them before you ever launch the game:

```bash
npm run item:check
```

---

## If the art did not come out of a pixel editor, start here

Everything below describes the file the **game** wants: 32 × 32, hard edges,
drawn in 2 × 2 blocks. If you are hand-placing pixels, make that file and skip
this section.

If the art came out of an image generator or a painting tool, it will arrive
large — 1254 × 1254, say — with tens of thousands of colours and a soft fringe
round every edge. **Do not shrink it yourself.** Drop it in `assets/items/` at
whatever size it came out at, under whatever name it came out with, and run:

```bash
npm run item:import
```

which does three things you cannot easily do by hand:

1. **Preserves your originals** in `assets/items/source/`, which is never
   written to again and is excluded from the installer. Everything downstream
   is repeatable from there, so a setting can be changed and the whole import
   re-run against untouched input.
2. **Recovers the drawing.** It fits a colour palette at full resolution — the
   encoder's noise is scattered symmetrically around each true colour, so an
   average finds the original — and then reduces by a per-block **plurality
   vote** rather than an average, so flat areas stay flat and edges stay hard
   instead of blending. Nearest-neighbour shrinking a lossy 1254 px file, which
   is what happens if you just drop it in the folder, gives a completely
   different and much worse answer.
3. **Renames it.** See the next section — this is the part that catches
   everybody, and the importer prints what it decided and why.

`npm run item:import -- --dry` says what it would do without writing anything.

---

## The essentials

| | |
|---|---|
| **Format** | PNG. Not JPEG, not WebP. |
| **Canvas** | 32 × 32 pixels, every time, for every item. |
| **Background** | Fully transparent. |
| **Edges** | Hard. No anti-aliasing, no soft or partly-transparent pixels. |
| **Views** | One per item. Items do not turn round. |
| **Names** | `<icon-key>.png`, e.g. `vessel_field.png` — **not** the item id, see below. |
| **Frames** | `<icon-key>-<state>.png`, e.g. `vessel_field-open.png`, for an object that also has to be drawn doing something. Same canvas, same place. |

Drop the files in `assets/items/`. Nothing has to be delivered in batches and
nothing has to be delivered at once: an item with no file keeps the icon the
game generates in code, and the bag looks finished either way.

---

## The name is the icon key, not the item id

This is the one thing that catches everybody, so it is first.

Every item in `data/items/items.json` has both an `id` and an `icon`. The **icon
key** is the name of the drawing, and it is what the file is called:

| item id | icon key | file to draw |
|---|---|---|
| `field_vessel` | `vessel_field` | `vessel_field.png` |
| `full_restore` | `potion_full` | `potion_full.png` |
| `region_map` | `key_map` | `key_map.png` |

They are deliberately separate so that two items can share one drawing — point
both at the same `icon` and there is one file to make. The full list of keys is
at the bottom of this document, and `npm run item:list` prints it.

**A family name is not a key either.** `Vessel.png` cannot be imported as it
stands, because the game has six vessels and `vessel` is not one of them. The
importer resolves a bare family name to the **basic** member — `vessel` becomes
`vessel_field` — and says so; if you meant a different one, name the file
`vessel_deep.png`.

Both `npm run item:import` and `npm run item:check` resolve names the same way,
in this order, and both print the reason rather than guessing silently:

| what you sent | what it becomes | why |
|---|---|---|
| `Potion.png` | `potion.png` | it is the key, with the capital taken off |
| `field_vessel.png` | `vessel_field.png` | that is an item **id**, not an icon key |
| `Vessel.png` | `vessel_field.png` | a **family**; the basic one is the first of six |
| `Ball.png` | `vessel_field.png` | a known other word for it |
| `pottion.png` | `potion.png` | nearest key — flagged as a guess, check it |
| `Vessel-closed.png` | `vessel_field.png` | "closed" means *the icon itself*, not a state |
| `Vessel-open.png` | `vessel_field-open.png` | "open" is a **frame** — see below |

---

## Frames: the same object doing something

Some of these are not only a row in the bag. A vessel is thrown, splits open,
takes a creature and shuts. When a vessel is drawn it wants to arrive as a
**pair** — shut and open — and the open one is not a second item: no player can
hold, buy or count an open vessel, and it must never appear in the bag.

So an icon key may own extra **frames**, named with a state on the end:

```
assets/items/vessel_field.png          the icon
assets/items/vessel_field-open.png     its open frame
```

The states are a fixed list, not anything you like — a suffix nobody reads is
worse than a missing file, because it looks delivered and never appears. Today
there is one:

| file | what it is | who uses it |
|---|---|---|
| `<icon-key>-open.png` | the vessel split open, lid clear of the body | the send-out and capture throws in battle |

`npm run item:check` prints that table with the frames you have actually
delivered against it, so it is never out of date.

**Draw every frame on the same canvas, with the object in the same place.**
This is the one rule frames add, and it is the whole reason they are not just
"another icon with a longer name". A single icon is *centred* in its cell by its
own outline. Do that to each frame separately and the vessel's base jumps
sideways and down at the instant the lid comes off, because the open drawing is
taller and its centre is somewhere else. So the frames of one key are measured
**together**: the union of all their outlines is what gets centred, and each
frame keeps its place inside it. Draw them registered and they stay registered.

If you are sending originals through `npm run item:import`, it does this for
you: it lines the frames up by their **bottom edge** — a lid opens upward and
the body of the vessel does not go anywhere — and gives every frame of a key one
palette, so the vessel does not change colour when it opens.

The other six vessels want the same treatment: `Vessel-fine-closed.png` and
`Vessel-fine-open.png`, and so on down the family.

---

## Two sizes, one file

Everything on screen is drawn at double density, so a 32 × 32 image occupies
**16 logical units** — exactly one map tile, the square a character stands on.

The game draws your file at two sizes and only two:

| | image px | on screen | where |
|---|---|---|---|
| **full** | 32 × 32 | 16 units | the description panel in the bag and the shop, a "you found it" line, an item lying on the ground, a held item |
| **list** | 16 × 16 | 8 units | a bag row, a shop row, anywhere items are stacked in a list |

**The list size is your file halved.** There is no second drawing and no
hand-tuned small version — see *Draw in 2 × 2 blocks* below, because that is what
decides whether the halving is crisp or mushy.

Every one of those places is live. A drawing dropped in this folder turns up in
the bag's three pockets, the shop's buy and sell lists, and the description
panel on both screens, at the right size for each, with no code change at all —
and if you deliver nothing, all twenty-three keep their generated icons and
those screens look exactly the same. That is the point of the two routes.

---

## Wiring a new screen (for whoever is writing the code)

Everything above is about the file. This is the four-line version of how one
reaches a screen, so that no screen invents its own answer.

```ts
import {
  drawItemRowIcon, drawItemSprite, ITEM_ROW_PAD_X, ITEM_SPRITE_UNITS,
} from '../gfx/itemart.js';

// A list row. `item` is an ItemData; rowX and textY are the row's own left
// edge and the y its label is drawn at. Render the ListMenu with
// `padX: ITEM_ROW_PAD_X` first, and this lands in the gap that reserved.
drawItemRowIcon(r, item, rowX, textY);

// A panel, a message, the ground. Top-left corner; ITEM_SPRITE_UNITS square.
drawItemSprite(r, item, x, y);
```

Three rules that are easy to get wrong and invisible in the code:

- **Never scale at the call site.** The two sizes are two different reductions
  of the file, not one image drawn small; a 32px drawing squeezed into a menu
  row is exactly the blur the halving exists to prevent.
- **`ITEM_ROW_PAD_X` is not negotiable between screens.** The bag, both shop
  lists and the battle bag all indent by the same amount, or consecutive menus
  look like two different games.
- **Pass the item, not its id.** These take anything with an `icon` and a
  `category`, which an `ItemData` from the registry already is. `icon` is not
  the item id — see *The name is the icon key* above.

For an animation that needs a frame rather than an icon:

```ts
const v = itemArtFrames('vessel_field', 'open');
if (v) { const [closed, open] = v; /* draw the drawing */ }
else   { /* keep whatever the scene plotted before */ }
```

`itemArtFrames(key, ...states)` returns the base drawing followed by one canvas
per state asked for, **or null the moment any of them has not shipped**. It
never throws and never returns a short array. All-or-nothing is the point: a
folder can legitimately hold `vessel_field-open.png` and no `vessel_field.png`,
and an animation that plotted its own shut vessel and then cut to a hand-drawn
open one would be showing two different objects in the same beat. Take both or
neither.

Because the frames of a key are seated together, every canvas it returns is
registered against the others — draw them at the same position on successive
frames and nothing moves that the drawing did not move.

`itemArt(key)` and `itemArt(key, state)` are the single-frame version of the
same question, for the rare caller that really does want one. `itemSprite` and
`itemIcon` never say no: they fall back to the generated design, which is right
for a bag row and wrong for a scene choosing between a drawing and its own
plotted shape.

---

## Centre it. There is no ground line

This is the biggest difference from the creature spec, and it is worth
understanding rather than just following.

A creature stands on a floor, so the game seats it on a fixed ground line and
lays its own contact shadow under it. **An item does not.** It sits in a box — a
menu row, a description panel, a message slot — and none of those have a floor.
So the loader finds your drawing's real outline and **centres it in the cell,
both axes**.

That means:

- Where you put the drawing on the canvas does not matter. Centre it roughly and
  the loader will do the rest.
- **Do not draw a shadow, a ground, a shelf or a stand.** There is nothing for
  it to sit on, and it is counted as part of the item when the drawing is
  centred, so it pushes the item upward and off-centre.
- What *does* matter is **how much of the cell you fill** — that is the only
  thing setting one icon's size against its neighbours in a list.

**You may use all 32 × 32.** Unlike a creature, an item has no reserved margin.
Fill the cell as much as the object wants; the checker only complains if the
drawing is much smaller than everything else in the folder, or if it runs into
three edges at once, which usually means it was cropped.

---

## Draw in 2 × 2 blocks

Effectively: draw a 16 × 16 icon at double size, so every block, line and edge is
two pixels wide.

This matters more here than it does for creatures, because the list size is where
an item is *usually* seen. Art drawn in 2 × 2 blocks halves **exactly** — every
pixel in the 16 px version is a colour that was really there. Art drawn on a
1-pixel grid gets a majority vote per block instead, and at 16 px that is the
difference between a potion and a smudge.

You do **not** have to align the blocks to the corner of the canvas — the loader
nudges the whole drawing by up to a pixel to find the grid. You just have to work
in blocks.

`npm run item:check` prints an on-grid percentage per file. **100% is the
target** for a hand-drawn icon, and every icon the game generates already hits
it, so anything less is a step down from what is on screen today.

**This rule does not apply to art that came through `npm run item:import`,** and
those files will score 3–20% here. That is deliberate and was decided by
building it both ways and looking at the result (`item:import -- --compare`
rebuilds the evidence in `build/item-compare/`). The halving takes the
**dominant** colour of each block, not an average, so a 16 px icon reduced from
full-resolution art still contains only colours that were really in the drawing
— it invents nothing. Forced into 2 × 2 blocks the recovered vessel loses its
silver frame and reads as a dark lump, and the potion stops being round; at full
resolution both keep their outline and their 16 px icons are *better*, not
worse. Judge those on the contact sheet at 1×, not by the percentage.

One-pixel detail — a single-pixel highlight, a hairline, a one-pixel outline —
does not survive to 16 px in any form. If a detail matters at list size, it has
to be at least one block.

---

## Two things that will bite

**1. Anti-aliased edges.** Most image tools soften edges by default, which leaves
a halo of half-transparent pixels. Every one of those is forced to fully-on or
fully-off at 50% when the file loads. On a 128 px creature that costs you a
fringe; on a 32 px icon the outline *is* a large fraction of the drawing, so a
soft edge does not lose a fringe, it loses the shape. Draw with a hard pencil,
not a brush, and if you resize anything use nearest-neighbour, never bilinear.

**2. Lossy compression.** If the art passes through anything that saves as JPEG
— including some export and sharing paths — the flat colour areas fill with
hundreds of near-identical shades. It often looks fine at a glance, and it
breaks the 2 × 2 halving completely, because no block is one flat colour any
more. Keep it PNG end to end. The checker flags a suspicious colour count.

---

## Nothing on the canvas but the item

Every opaque pixel is treated as part of the item, because that is what the
loader measures to centre it. So:

- **No background, border, frame, label, signature or colour-swatch strip.**
  Transparent right to the edges.
- **No stray dots.** One speck in a corner drags the bounding box out and shoves
  the whole drawing off-centre — and on a 32 px canvas a two-pixel shove is
  visible in a list of twenty.
- **One item per file.** No before/after pairs, no variants side by side.

---

## Colour

An icon this size has room for about eight to sixteen colours before they stop
being distinguishable. That is also roughly what the era this game draws from
used. Flat blocks, a dark outline, one light and one shade per material, and one
highlight is plenty. Gradients and airbrushed shading will not survive the
halving and will not sit next to the generated icons.

The checker warns past 40 colours and treats a few hundred as evidence the file
has been through a lossy encoder.

---

## Keep a family looking like a family

Several of these come in sets, and the set is how a player reads them under
pressure. The generated icons already do this and it is worth keeping:

- **The four potions** are one flask at four fill levels. You can tell a Potion
  from a Full Restore across the room without reading a word.
- **The six vessels** are one capsule in six colour schemes, because that is how
  the player tells them apart on a shelf too.
- **The five status cures** are five *different objects* on purpose — a leaf, a
  pot, a cloth, a bell, a root. These are the five items reached for in a hurry,
  and colour alone is not enough. Note that Coolsalve is a squat lidded pot and
  Thawcloth is a square of cloth hung on point: the first drafts were both
  rectangles and were very nearly the same picture.

---

## The commands

```bash
npm run item:list          just the icon keys, one per line
npm run item:import        fit, recover and rename delivered originals
npm run item:import -- --dry       say what it would do, write nothing
npm run item:import -- --compare   also write build/item-compare/
npm run item:check         the full report: what is wrong and what to change
npm run item:check -- --json     the same findings as JSON
npm run itemart            rewrite assets/items/index.json after adding files
```

You do not normally have to run `npm run itemart` by hand: both the dev server
and the packaged app read the folder live, so a file dropped in is picked up on
the next launch. It runs as part of `npm run build` for plain static hosts.

To look at the whole set rather than read about it — generated icons and drawn
ones side by side, at 1× and blown up:

```bash
node tools/serve.js
npx electron tools/capture.cjs tools/shots/items.js
```

which writes `build/shots/item-icons.png` and `build/shots/item-icons-zoom.png`.
**Judge at 1×.** The blown-up sheet is for finding out *why* something is wrong,
never for deciding whether it is.

---

## Every icon the game asks for

23 keys for 23 items. `npm run item:list` prints the bare keys, one per line, in
this order.

| file to draw | category | item | what it is |
|---|---|---|---|
| `vessel_field.png` | vessel | Field Vessel | plain clay-and-copper capsule, standard issue, cheap enough to waste |
| `vessel_fine.png` | vessel | Fine Vessel | tighter seams and a truer weight; brighter, better made |
| `vessel_deep.png` | vessel | Deep Vessel | cold-forged for the Hollow Sea trade; deep blue |
| `vessel_dusk.png` | vessel | Dusk Vessel | smoked glass, works after dark |
| `vessel_net.png` | vessel | Net Vessel | wide-mouthed and lined with mesh |
| `vessel_warden.png` | vessel | Warden Vessel | one of a handful ever made; white and gold, and it does not fail |
| `potion.png` | healing | Potion | flask, restores 20 HP, tastes like pond and pine |
| `potion_strong.png` | healing | Strong Potion | the same flask, fuller, restores 60 |
| `potion_great.png` | healing | Great Potion | fuller again, restores 150 |
| `potion_full.png` | healing | Full Restore | full to the neck; all HP and any condition |
| `berry_tonic.png` | berry | Tonic Berry | a berry on a stem with one leaf; grows wild on the west routes |
| `cure_poison.png` | statusHeal | Clearleaf | a leaf. Chew, do not swallow |
| `cure_burn.png` | statusHeal | Coolsalve | a squat lidded pot of salve |
| `cure_freeze.png` | statusHeal | Thawcloth | a square of cloth, hung on point |
| `cure_sleep.png` | statusHeal | Wakebell | a sharp little hand bell |
| `cure_para.png` | statusHeal | Steadyroot | a knotty forked root |
| `cure_all.png` | statusHeal | Full Heal | a phial with a cross on it |
| `revive.png` | revive | Rouse | a feather |
| `revive_full.png` | revive | Full Rouse | the same feather, brighter, with a glow on it |
| `repel.png` | exploration | Ward Incense | a cone of incense with smoke rising |
| `escape.png` | exploration | Escape Line | a cord and a hook — an anchor shape |
| `key_vellum.png` | key | The Vellum | Dr. Vess's bound field record |
| `key_map.png` | key | Region Map | Veldras, drawn in 1913 and stubbornly not redrawn since |

Those descriptions are what the game's own data says each item is, so the shop
lines and the bag text already assume them. You are free to reinterpret any of
them — just say which, and the data will be updated to match rather than leaving
the two out of step.

### What has arrived so far, and what it changed

| file | frames | note |
|---|---|---|
| `vessel_field.png` | `-open` | drawn as a **hinged blue-and-silver tech chest**, not the "plain clay-and-copper capsule" the shop line describes |
| `potion.png` | — | drawn as a **glowing cyan flask with a metal collar**, not the pond-and-pine brown the bag text describes |

Both are reinterpretations, and good ones — but two things are now out of step
and want a decision rather than drifting:

1. **The words.** `data/items/items.json` still says clay and copper, and pond
   and pine. Either the drawings or the descriptions should move.
2. **The family.** The other five vessels are still the generated capsules, so
   the shelf currently holds one chest and five capsules. They want the same
   treatment — `Vessel-fine-closed.png` / `Vessel-fine-open.png` and so on — or
   the generated ones want redrawing as chests.
