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

## The essentials

| | |
|---|---|
| **Format** | PNG. Not JPEG, not WebP. |
| **Canvas** | 32 × 32 pixels, every time, for every item. |
| **Background** | Fully transparent. |
| **Edges** | Hard. No anti-aliasing, no soft or partly-transparent pixels. |
| **Views** | One per item. Items do not turn round. |
| **Names** | `<icon-key>.png`, e.g. `vessel_field.png` — **not** the item id, see below. |

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

If you name a file after the item id by mistake, `npm run item:check` says so and
tells you the name it should have had. It will not guess silently.

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
target**, and every icon the game generates already hits it, so anything less is
a step down from what is on screen today.

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
