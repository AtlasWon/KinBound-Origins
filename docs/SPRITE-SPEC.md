# Kin sprite spec

What the game needs from a hand-drawn creature sprite. Written for whoever is
making the art, not for the engine.

There is a checker that reads a folder of these and tells you what is wrong
with them before you ever launch the game:

```bash
npm run kin:check
```

---

## The essentials

| | |
|---|---|
| **Format** | PNG. Not JPEG, not WebP. |
| **Canvas** | 128 × 128 pixels, every time, for every creature. |
| **Background** | Fully transparent. |
| **Edges** | Hard. No anti-aliasing, no soft or partly-transparent pixels. |
| **Views** | Two per creature: **front** and **back**. |
| **Names** | `<id>-front.png` and `<id>-back.png`, e.g. `cinderpaw-front.png` |

The 128 × 128 canvas is fixed. What changes between creatures is **how much of
that canvas the creature fills** — see the size ladder below.

---

## The two views

**Front** is the creature seen as an opponent, across the field. It faces
**left**, toward the player. This is the view used on the party screen, in the
Kin list, and for the enemy in battle.

**Front is the important one.** If back views are slow to make, send all 48
fronts first — the game will use the procedural sprite for the back until the
real one arrives, and everything stays playable.

**Back** is the player's own creature, seen from behind, facing **away to the
right**. You mostly see the rump, the back of the head, the tail. It is a
different drawing, not a mirrored front — a mirrored front leaves the face
pointing the wrong way and puts the tail on the wrong side.

---

## Two things that will bite

**1. Anti-aliased edges.** Most image generators soften edges by default, which
leaves a halo of half-transparent pixels. In pixel art against a battle
background that reads as a grey fringe around the creature. Every pixel should
be either fully opaque or fully transparent. The checker counts these and will
tell you.

**2. Lossy compression.** If the art passes through anything that saves as JPEG
— including some export and sharing paths — the flat colour areas fill with
thousands of near-identical shades and the crisp pixel edges smear. It often
looks fine at a glance and terrible in the game. Keep it PNG end to end. The
checker flags a suspicious colour count.

---

## Nothing on the canvas but the creature

Every opaque pixel is treated as part of the creature — the loader finds the
outline to seat it on the ground. So one stray dot in a corner shifts the whole
creature's framing, and an opaque background makes the entire 128 × 128 square
"the creature", which collapses the seating completely.

That means no:

- **Drop shadow or ground.** The game lays down its own contact shadow so drawn
  and generated creatures stand on the same floor. A baked-in one gets seated as
  part of the body and doubles up.
- **Background, border, frame, label, signature, or colour-swatch strip.**
  Transparent right to the edges.
- **Two creatures in one image**, or an evolution line on one canvas. One
  creature per file.

**Maximum drawing size: 128 wide × 124 tall.** Anything larger is shrunk to fit
and loses its crispness.

---

## Keep the relative sizes true

This is the one that is easy to get wrong and hard to spot until the whole
roster is together. A 0.3 m grub drawn to fill its canvas ends up bigger on
screen than a 2.4 m standing stone drawn the same way — the game had exactly
this bug and it took measuring the whole roster to see it.

So fill the canvas according to the creature's real size:

| Band | Height | Fill roughly | Species |
|---|---|---|---|
| **Tiny** | ≤ 0.35 m | 50–65 px tall | rillfry, nibbet, pipwing, nettlebug, pebblet, fizzlet, gravelet, pinchel, silthopper |
| **Small** | 0.4–0.6 m | 65–85 px | sprigling, rilltail, chalkid, frostnip, shalefin, cinderpaw, spinnet, sootmoth, slatewing, tuftail, tallowmoth |
| **Mid** | 0.7–1.0 m | 85–100 px | emberbore, burrowen, kestrelle, lantric, bramblehusk, cairnling, deeplum, gullswift, blazelynx, voltwick, brinewisp |
| **Large** | 1.1–1.6 m | 100–115 px | brookmaw, currentail, mossback, anchorling, weaverjaw, clatterclaw, rimehound, bristlebuck, bladderwrack, chalkmar, craglide, galecrest, tidewrack |
| **Huge** | > 1.6 m | 115–126 px | volcatrix, thornmarch, maelstrix, menhir |

A tiny creature is *supposed* to have empty canvas above it.

---

## Framing

Stand the creature on the **bottom** of the canvas and centre it roughly
left-to-right. It does not have to be exact — the loader finds the creature's
actual outline and seats it on the ground line itself, so small inconsistencies
between images are handled for you. Leave a pixel or two of clearance at the
bottom rather than running hard into the edge.

---

## Draw in 2 × 2 blocks

Effectively: draw a 64 × 64 creature at double size, so every block, line and
edge is two pixels wide.

This matters more than it sounds. The party screen, the in-battle switch list,
the Roost and the title-screen flock all draw the creature at **64 × 64**, which
is the 128 image halved. Art drawn in 2 × 2 blocks halves *exactly* — every pixel
in the small version is a colour that was really there. Art drawn on a 1-pixel
grid gets a majority vote per block instead, and looks visibly soft everywhere
the small version is used.

You do **not** have to align the blocks to the corner of the canvas — the loader
nudges the whole drawing by up to a pixel to find the grid. You just have to work
in blocks.

`npm run kin:check` prints an on-grid percentage per file. 100% is the target.

---

## The 48 species

Names, sizes, types and the one-line description each was designed from. The
full list with evolution links is in `data/creatures/species.json`.

| id | size | type | what it is |
|---|---|---|---|
| sprigling | 0.4 m | verdant | squat four-legged bud with a heavy leaf collar |
| bramblehusk | 0.9 m | verdant | hunched quadruped under a woven thorn shell |
| thornmarch | 1.8 m | verdant, stone | broad-shouldered walker plated in mossed slabs |
| cinderpaw | 0.5 m | ember | lean short-legged cub with an oversized tufted tail |
| blazelynx | 1.0 m | ember | long-limbed cat, high shoulders, mane of ember tufts |
| volcatrix | 1.7 m | ember | upright bipedal cat, braced stance, banded forearms |
| rilltail | 0.4 m | tide | flat-headed otterish shape with a broad paddle tail |
| brookmaw | 1.1 m | tide | heavy-shouldered swimmer, fluked tail, wide jaw |
| maelstrix | 2.1 m | tide | long coiling swimmer with a crowned brow and trailing fins |
| nibbet | 0.3 m | beast | small round rodent, long ears, ring-marked tail |
| burrowen | 0.8 m | beast | broad digging rodent with shovel forepaws |
| pipwing | 0.3 m | gale | small round bird, oversized head, short tail |
| kestrelle | 0.8 m | gale | falcon build, swept wings, banded chest |
| galecrest | 1.6 m | gale | large raptor with a forked tail and a raised crest |
| nettlebug | 0.3 m | verdant | segmented grub with raised bristle ridges |
| spinnet | 0.5 m | venom | eight-legged spinner, high abdomen, silk spools at the hip |
| weaverjaw | 1.2 m | venom | heavy-bodied spinner with armoured jaw plates |
| tuftail | 0.6 m | beast | small grazing quadruped, thick neck ruff |
| bristlebuck | 1.4 m | beast | stag-like grazer with a bristled mantle and low horns |
| pebblet | 0.3 m | stone | rounded boulder with stubby limbs and a seam of quartz |
| cairnling | 0.9 m | stone | stacked slab figure, uneven shoulders, moss at the joints |
| menhir | 2.4 m | stone | tall monolith with ore veins and a carved face |
| fizzlet | 0.3 m | spark | small bristling ball with two trailing filaments |
| voltwick | 1.0 m | spark | lean upright creature with a filament crest and forked tail |
| rillfry | 0.2 m | tide | slim darting fish with a split tail |
| currentail | 1.1 m | tide | streamlined swimmer with long trailing tail ribbons |
| sootmoth | 0.5 m | ember | broad-winged moth with ember-lit wing edges |
| chalkid | 0.4 m | stone | rounded chalk lump with blunt limbs and a banded seam |
| chalkmar | 1.5 m | stone | broad slab-plated walker with a chalk-white underbody |
| mossback | 1.1 m | stone, verdant | low mossed boulder with a slow-blinking eye and stubby legs |
| slatewing | 0.5 m | stone, gale | angular flat-winged bird with slate plating along the back |
| craglide | 1.5 m | stone, gale | large raptor with slab-plated wings and a hooked stone beak |
| emberbore | 0.7 m | ember, stone | squat armoured digger with a glowing drill-snout |
| lantric | 0.8 m | spark | hanging iron lantern with a filament core and two hook arms |
| frostnip | 0.4 m | frost | small frost-furred canine with icicle whiskers |
| rimehound | 1.3 m | frost | long-legged hound with a frost mane and trailing breath |
| deeplum | 0.9 m | tide | trailing deep-water form with one hanging lure light |
| tallowmoth | 0.6 m | spirit | pale broad-winged moth with luminous wing panels |
| gravelet | 0.3 m | stone | scruffy digger caked in loose grit, oversized foreclaws |
| shalefin | 0.4 m | tide, stone | flat bottom-dwelling fish with a gritted upper hide |
| tidewrack | 1.6 m | tide, stone | heavy shingle-plated swimmer with a blunt ramming head |
| pinchel | 0.3 m | tide | squat armoured crab with one oversized claw |
| clatterclaw | 1.2 m | tide | broad reef crab with paired shearing claws |
| gullswift | 0.9 m | gale, tide | long-winged seabird with a dagger bill and forked tail |
| bladderwrack | 1.4 m | verdant, tide | draped kelp column with float bladders and a holdfast base |
| silthopper | 0.3 m | verdant | long-legged mud insect built for launching |
| brinewisp | 1.0 m | spirit | drifting hooded light with a trailing brine veil |
| anchorling | 1.1 m | iron | iron anchor form with barnacled flukes and a single eye |

Those descriptions are what the game's own data says each creature is, so
dialogue, types and the region all already assume them. You are free to
reinterpret any of them — just tell me which, and I will update the data to
match rather than leaving the two out of step.
