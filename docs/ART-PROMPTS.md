# Art prompts for KinBound

Generated from the game's own creature data by `node tools/art-prompts.js`.
If a creature's design changes in `data/creatures/species.json`, re-run it.

---

## How to use this

**Step 1.** Start a new ChatGPT conversation and paste the block below marked
**THE BRIEF**. It sets the technical rules once.

**Step 2.** Paste one creature block at a time. Each is self-contained enough to
work on its own, but the brief makes the results far more consistent.

**Step 3.** Save what comes back as `<id>-front.png` and `<id>-back.png` into
`assets/kin/`, then run `npm run kin:check`.

**If the results drift** after a long conversation -- soft edges creeping back,
sizes wandering -- start a fresh conversation and paste the brief again. Image
models lose earlier instructions as a chat grows.

**Do the three starters first** (sprigling, cinderpaw, rilltail) and check how
they look in the game before committing to all 96. They are the creatures a
player sees first and longest, and they will tell you whether the style is
right.

---

## THE BRIEF

> I need pixel-art creature sprites for a Game Boy Advance-style monster-catching
> RPG. They must match the look of Pokémon Ruby/Sapphire/Emerald battle sprites.
>
> **Technical requirements, all mandatory:**
>
> - PNG, exactly 128 × 128 pixels, fully transparent background.
> - **Hard edges only.** Every pixel either fully opaque or fully transparent.
>   No anti-aliasing, no soft edges, no partial transparency, no glow or blur
>   bleeding into the background.
> - **Draw in 2 × 2 pixel blocks** — effectively a 64 × 64 creature at double
>   size. Every line, edge and detail two pixels wide. This keeps it crisp when
>   the game shows a half-size version.
> - Limited palette: roughly 12–20 colours total, in flat areas with hard-edged
>   shading bands. No gradients, no dithering, no airbrushing.
> - One light source, from the upper left.
> - **Nothing on the canvas but the creature.** No ground, no shadow, no
>   background, no border, no frame, no text, no signature, no colour swatches.
>   The game draws its own shadow.
> - The creature stands near the bottom of the canvas, roughly centred, and must
>   fit inside 128 wide × 124 tall.
>
> **Style requirements:**
>
> - Readable at a glance. The silhouette alone should identify the creature.
> - Built from a few large shapes rather than many small marks. Large flat colour
>   areas with deliberate shading — not texture scattered over the whole body.
> - Clear anatomy: you can instantly tell a limb from a body.
> - Eyes small and expressive, not large glossy anime eyes. Two eyes clearly
>   separated with visible face between them.
> - A confident pose with weight on one side. Not stiff, square or symmetrical.
>
> I will describe one creature at a time. For each, give me **two separate
> images**:
>
> 1. **FRONT** — the creature seen from the front-side, **facing LEFT**. This is
>    how an opponent is seen across a battlefield.
> 2. **BACK** — the same creature seen **from behind, facing away to the RIGHT**.
>    You see its back, rump and tail; the face is not visible. This is a
>    different drawing, not a mirrored front.
>
> Confirm you understand, and I will send the first creature.

---

## The creatures

### Sprigling  `sprigling`

| | |
|---|---|
| **Type** | verdant (plant life -- leaves, moss, bark, seeds) |
| **Size** | 0.4 m, 7.2 kg — SMALL band, draw it **65-85 px tall** in the 128 canvas |
| **Known as** | the Hedge Sprout |
| **Lives in** | highland hedgerow |
| **Facing** | front faces **LEFT**; back faces **away to the RIGHT** |

**Prompt to paste:**

> Next creature: **Sprigling**, the Hedge Sprout.
>
> squat four-legged bud with a heavy leaf collar.
>
> Its element is verdant, so it should read visually as plant life -- leaves, moss, bark, seeds.
>
> It is 0.4 m tall and weighs 7.2 kg. Draw it **65-85 px tall** inside the
> 128 × 128 canvas, so its size on screen is honest next to the others.
>
> Lore, for character rather than literal detail: It plants both feet and refuses to be moved. Hollow children use them to hold gates shut.
>
> It is stage 1 of 3 in a family: **Sprigling** → Bramblehusk → Thornmarch. It evolves INTO Bramblehusk at level 16, so leave room for it to grow — this stage should read as younger and simpler.
>
> Suggested palette, which you can refine: #4f8a45, #3a6b34, #8fc36a, #c9d98a, #2a4a26.
>
> Give me the FRONT view (facing left) and the BACK view (from behind, facing
> away to the right) as two separate 128 × 128 PNGs with transparent
> backgrounds and hard pixel edges.

---

### Bramblehusk  `bramblehusk`

| | |
|---|---|
| **Type** | verdant (plant life -- leaves, moss, bark, seeds) |
| **Size** | 0.9 m, 31.5 kg — MID band, draw it **85-100 px tall** in the 128 canvas |
| **Known as** | the Bramble Bearer |
| **Lives in** | highland hedgerow |
| **Facing** | front faces **LEFT**; back faces **away to the RIGHT** |

**Prompt to paste:**

> Next creature: **Bramblehusk**, the Bramble Bearer.
>
> hunched quadruped under a woven thorn shell.
>
> Its element is verdant, so it should read visually as plant life -- leaves, moss, bark, seeds.
>
> It is 0.9 m tall and weighs 31.5 kg. Draw it **85-100 px tall** inside the
> 128 × 128 canvas, so its size on screen is honest next to the others.
>
> Lore, for character rather than literal detail: The husk on its back is last season's growth, kept deliberately. It never sheds anything it can still use.
>
> It is stage 2 of 3 in a family: Sprigling → **Bramblehusk** → Thornmarch. It evolves FROM Sprigling at level 16, so it should look like the same animal grown up — keep a shared silhouette signature and a related palette, but change the proportions and add complexity. It evolves INTO Thornmarch at level 34.
>
> Suggested palette, which you can refine: #4f8a45, #356030, #8fc36a, #a8863f, #22401f.
>
> Give me the FRONT view (facing left) and the BACK view (from behind, facing
> away to the right) as two separate 128 × 128 PNGs with transparent
> backgrounds and hard pixel edges.

---

### Thornmarch  `thornmarch`

| | |
|---|---|
| **Type** | verdant (plant life -- leaves, moss, bark, seeds) and stone (rock and earth -- slabs, grit, mineral seams) |
| **Size** | 1.8 m, 186 kg — HUGE band, draw it **115-126 px tall** in the 128 canvas |
| **Known as** | the Standing Hedge |
| **Lives in** | highland hedgerow |
| **Facing** | front faces **LEFT**; back faces **away to the RIGHT** |

**Prompt to paste:**

> Next creature: **Thornmarch**, the Standing Hedge.
>
> broad-shouldered walker plated in mossed slabs.
>
> Its element is verdant and stone, so it should read visually as plant life -- leaves, moss, bark, seeds, combined with rock and earth -- slabs, grit, mineral seams.
>
> It is 1.8 m tall and weighs 186 kg. Draw it **115-126 px tall** inside the
> 128 × 128 canvas, so its size on screen is honest next to the others — this one is large and should nearly fill the canvas.
>
> Lore, for character rather than literal detail: Old ones root in place for a season and come back up as part of the wall. Farmers build around them.
>
> It is stage 3 of 3 in a family: Sprigling → Bramblehusk → **Thornmarch**. It evolves FROM Bramblehusk at level 34, so it should look like the same animal grown up — keep a shared silhouette signature and a related palette, but change the proportions and add complexity.
>
> Suggested palette, which you can refine: #4f7a42, #2f5030, #8a9a6a, #9a9088, #1e3320.
>
> Give me the FRONT view (facing left) and the BACK view (from behind, facing
> away to the right) as two separate 128 × 128 PNGs with transparent
> backgrounds and hard pixel edges.

---

### Cinderpaw  `cinderpaw`

| | |
|---|---|
| **Type** | flame (fire and heat -- embers, scorch, glowing cracks) |
| **Size** | 0.5 m, 9.1 kg — SMALL band, draw it **65-85 px tall** in the 128 canvas |
| **Known as** | the Ember Cub |
| **Lives in** | highland scrub |
| **Facing** | front faces **LEFT**; back faces **away to the RIGHT** |

**Prompt to paste:**

> Next creature: **Cinderpaw**, the Ember Cub.
>
> lean short-legged cub with an oversized tufted tail.
>
> Its element is flame, so it should read visually as fire and heat -- embers, scorch, glowing cracks.
>
> It is 0.5 m tall and weighs 9.1 kg. Draw it **65-85 px tall** inside the
> 128 × 128 canvas, so its size on screen is honest next to the others.
>
> Lore, for character rather than literal detail: It sleeps in cold ash and wakes up warm. Nobody has satisfactorily explained where the heat comes from.
>
> It is stage 1 of 3 in a family: **Cinderpaw** → Blazelynx → Volcatrix. It evolves INTO Blazelynx at level 16, so leave room for it to grow — this stage should read as younger and simpler.
>
> Suggested palette, which you can refine: #e0703a, #b04a26, #f2b45a, #3a2018, #ffe0a0.
>
> Give me the FRONT view (facing left) and the BACK view (from behind, facing
> away to the right) as two separate 128 × 128 PNGs with transparent
> backgrounds and hard pixel edges.

---

### Blazelynx  `blazelynx`

| | |
|---|---|
| **Type** | flame (fire and heat -- embers, scorch, glowing cracks) |
| **Size** | 1 m, 27.4 kg — MID band, draw it **85-100 px tall** in the 128 canvas |
| **Known as** | the Kindled Hunter |
| **Lives in** | highland scrub |
| **Facing** | front faces **LEFT**; back faces **away to the RIGHT** |

**Prompt to paste:**

> Next creature: **Blazelynx**, the Kindled Hunter.
>
> long-limbed cat, high shoulders, mane of ember tufts.
>
> Its element is flame, so it should read visually as fire and heat -- embers, scorch, glowing cracks.
>
> It is 1 m tall and weighs 27.4 kg. Draw it **85-100 px tall** inside the
> 128 × 128 canvas, so its size on screen is honest next to the others.
>
> Lore, for character rather than literal detail: Runs the ridgelines at dusk. You see the tail-light long before you see the animal.
>
> It is stage 2 of 3 in a family: Cinderpaw → **Blazelynx** → Volcatrix. It evolves FROM Cinderpaw at level 16, so it should look like the same animal grown up — keep a shared silhouette signature and a related palette, but change the proportions and add complexity. It evolves INTO Volcatrix at level 34.
>
> Suggested palette, which you can refine: #e0703a, #a03c1e, #f2b45a, #2e1a14, #ffd070.
>
> Give me the FRONT view (facing left) and the BACK view (from behind, facing
> away to the right) as two separate 128 × 128 PNGs with transparent
> backgrounds and hard pixel edges.

---

### Volcatrix  `volcatrix`

| | |
|---|---|
| **Type** | flame (fire and heat -- embers, scorch, glowing cracks) and brawl (brawl) |
| **Size** | 1.7 m, 88.6 kg — HUGE band, draw it **115-126 px tall** in the 128 canvas |
| **Known as** | the Ridge Burner |
| **Lives in** | highland scrub |
| **Facing** | front faces **LEFT**; back faces **away to the RIGHT** |

**Prompt to paste:**

> Next creature: **Volcatrix**, the Ridge Burner.
>
> upright bipedal cat, braced stance, banded forearms.
>
> Its element is flame and brawl, so it should read visually as fire and heat -- embers, scorch, glowing cracks, combined with brawl.
>
> It is 1.7 m tall and weighs 88.6 kg. Draw it **115-126 px tall** inside the
> 128 × 128 canvas, so its size on screen is honest next to the others — this one is large and should nearly fill the canvas.
>
> Lore, for character rather than literal detail: It fights standing up, which no other cat in Veldras does. The stance is learned, not born.
>
> It is stage 3 of 3 in a family: Cinderpaw → Blazelynx → **Volcatrix**. It evolves FROM Blazelynx at level 34, so it should look like the same animal grown up — keep a shared silhouette signature and a related palette, but change the proportions and add complexity.
>
> Suggested palette, which you can refine: #e06a34, #8f3218, #f2b45a, #2a1610, #ffcc60.
>
> Give me the FRONT view (facing left) and the BACK view (from behind, facing
> away to the right) as two separate 128 × 128 PNGs with transparent
> backgrounds and hard pixel edges.

---

### Rilltail  `rilltail`

| | |
|---|---|
| **Type** | tide (water -- fins, wet hide, foam, sea life) |
| **Size** | 0.4 m, 8.8 kg — SMALL band, draw it **65-85 px tall** in the 128 canvas |
| **Known as** | the Brook Reader |
| **Lives in** | streams and ponds |
| **Facing** | front faces **LEFT**; back faces **away to the RIGHT** |

**Prompt to paste:**

> Next creature: **Rilltail**, the Brook Reader.
>
> flat-headed otterish shape with a broad paddle tail.
>
> Its element is tide, so it should read visually as water -- fins, wet hide, foam, sea life.
>
> It is 0.4 m tall and weighs 8.8 kg. Draw it **65-85 px tall** inside the
> 128 × 128 canvas, so its size on screen is honest next to the others.
>
> Lore, for character rather than literal detail: It taps the water surface in patterns. Vess is convinced this is counting. Nobody can say what it is counting.
>
> It is stage 1 of 3 in a family: **Rilltail** → Brookmaw → Maelstrix. It evolves INTO Brookmaw at level 16, so leave room for it to grow — this stage should read as younger and simpler.
>
> Suggested palette, which you can refine: #4a86bd, #2c5a86, #8fd0e8, #e8f0f4, #1c3a58.
>
> Give me the FRONT view (facing left) and the BACK view (from behind, facing
> away to the right) as two separate 128 × 128 PNGs with transparent
> backgrounds and hard pixel edges.

---

### Brookmaw  `brookmaw`

| | |
|---|---|
| **Type** | tide (water -- fins, wet hide, foam, sea life) |
| **Size** | 1.1 m, 33.9 kg — LARGE band, draw it **100-115 px tall** in the 128 canvas |
| **Known as** | the Slow Current |
| **Lives in** | streams and ponds |
| **Facing** | front faces **LEFT**; back faces **away to the RIGHT** |

**Prompt to paste:**

> Next creature: **Brookmaw**, the Slow Current.
>
> heavy-shouldered swimmer, fluked tail, wide jaw.
>
> Its element is tide, so it should read visually as water -- fins, wet hide, foam, sea life.
>
> It is 1.1 m tall and weighs 33.9 kg. Draw it **100-115 px tall** inside the
> 128 × 128 canvas, so its size on screen is honest next to the others.
>
> Lore, for character rather than literal detail: Holds station against a current all day without visible effort, then moves faster than anything its size has any right to.
>
> It is stage 2 of 3 in a family: Rilltail → **Brookmaw** → Maelstrix. It evolves FROM Rilltail at level 16, so it should look like the same animal grown up — keep a shared silhouette signature and a related palette, but change the proportions and add complexity. It evolves INTO Maelstrix at level 34.
>
> Suggested palette, which you can refine: #3f79b0, #264e78, #7fc4e0, #dce8f0, #16304c.
>
> Give me the FRONT view (facing left) and the BACK view (from behind, facing
> away to the right) as two separate 128 × 128 PNGs with transparent
> backgrounds and hard pixel edges.

---

### Maelstrix  `maelstrix`

| | |
|---|---|
| **Type** | tide (water -- fins, wet hide, foam, sea life) and psyche (the psychic -- smooth forms, odd symmetry) |
| **Size** | 2.1 m, 121.4 kg — HUGE band, draw it **115-126 px tall** in the 128 canvas |
| **Known as** | the Reading Depth |
| **Lives in** | streams and ponds |
| **Facing** | front faces **LEFT**; back faces **away to the RIGHT** |

**Prompt to paste:**

> Next creature: **Maelstrix**, the Reading Depth.
>
> long coiling swimmer with a crowned brow and trailing fins.
>
> Its element is tide and psyche, so it should read visually as water -- fins, wet hide, foam, sea life, combined with the psychic -- smooth forms, odd symmetry.
>
> It is 2.1 m tall and weighs 121.4 kg. Draw it **115-126 px tall** inside the
> 128 × 128 canvas, so its size on screen is honest next to the others — this one is large and should nearly fill the canvas.
>
> Lore, for character rather than literal detail: Old sailors will not name it out loud on the water. They say it answers, and that answering is the problem.
>
> It is stage 3 of 3 in a family: Rilltail → Brookmaw → **Maelstrix**. It evolves FROM Brookmaw at level 34, so it should look like the same animal grown up — keep a shared silhouette signature and a related palette, but change the proportions and add complexity.
>
> Suggested palette, which you can refine: #3a6fa8, #1f4670, #7fc4e0, #c9a8e0, #122a44.
>
> Give me the FRONT view (facing left) and the BACK view (from behind, facing
> away to the right) as two separate 128 × 128 PNGs with transparent
> backgrounds and hard pixel edges.

---

### Nibbet  `nibbet`

| | |
|---|---|
| **Type** | beast (plain animal -- fur, hooves, honest anatomy) |
| **Size** | 0.3 m, 3.4 kg — TINY band, draw it **50-65 px tall** in the 128 canvas |
| **Known as** | the Pantry Thief |
| **Lives in** | everywhere, unfortunately |
| **Facing** | front faces **LEFT**; back faces **away to the RIGHT** |

**Prompt to paste:**

> Next creature: **Nibbet**, the Pantry Thief.
>
> small round rodent, long ears, ring-marked tail.
>
> Its element is beast, so it should read visually as plain animal -- fur, hooves, honest anatomy.
>
> It is 0.3 m tall and weighs 3.4 kg. Draw it **50-65 px tall** inside the
> 128 × 128 canvas, so its size on screen is honest next to the others — this one is small and should have plenty of empty canvas above it.
>
> Lore, for character rather than literal detail: Every household in Veldras has a story about one. Most of the stories end with a missing loaf.
>
> It is stage 1 of 2 in a family: **Nibbet** → Burrowen. It evolves INTO Burrowen at level 18, so leave room for it to grow — this stage should read as younger and simpler.
>
> Suggested palette, which you can refine: #b09070, #7d6248, #e0cdb0, #3a2c20, #d8a05a.
>
> Give me the FRONT view (facing left) and the BACK view (from behind, facing
> away to the right) as two separate 128 × 128 PNGs with transparent
> backgrounds and hard pixel edges.

---

### Burrowen  `burrowen`

| | |
|---|---|
| **Type** | beast (plain animal -- fur, hooves, honest anatomy) and terra (terra) |
| **Size** | 0.8 m, 24.6 kg — MID band, draw it **85-100 px tall** in the 128 canvas |
| **Known as** | the Undermine |
| **Lives in** | farmland and quarry |
| **Facing** | front faces **LEFT**; back faces **away to the RIGHT** |

**Prompt to paste:**

> Next creature: **Burrowen**, the Undermine.
>
> broad digging rodent with shovel forepaws.
>
> Its element is beast and terra, so it should read visually as plain animal -- fur, hooves, honest anatomy, combined with terra.
>
> It is 0.8 m tall and weighs 24.6 kg. Draw it **85-100 px tall** inside the
> 128 × 128 canvas, so its size on screen is honest next to the others.
>
> Lore, for character rather than literal detail: Digs a tunnel network under a field in one night. The Kellowmere quarry hires them and pretends it does not.
>
> It is stage 2 of 2 in a family: Nibbet → **Burrowen**. It evolves FROM Nibbet at level 18, so it should look like the same animal grown up — keep a shared silhouette signature and a related palette, but change the proportions and add complexity.
>
> Suggested palette, which you can refine: #a8825c, #6e5238, #d8bd95, #33261a, #c98f4a.
>
> Give me the FRONT view (facing left) and the BACK view (from behind, facing
> away to the right) as two separate 128 × 128 PNGs with transparent
> backgrounds and hard pixel edges.

---

### Pipwing  `pipwing`

| | |
|---|---|
| **Type** | gale (wind and sky -- feathers, streamlined shapes) |
| **Size** | 0.3 m, 2.1 kg — TINY band, draw it **50-65 px tall** in the 128 canvas |
| **Known as** | the First Flock |
| **Lives in** | open route and treeline |
| **Facing** | front faces **LEFT**; back faces **away to the RIGHT** |

**Prompt to paste:**

> Next creature: **Pipwing**, the First Flock.
>
> small round bird, oversized head, short tail.
>
> Its element is gale, so it should read visually as wind and sky -- feathers, streamlined shapes.
>
> It is 0.3 m tall and weighs 2.1 kg. Draw it **50-65 px tall** inside the
> 128 × 128 canvas, so its size on screen is honest next to the others — this one is small and should have plenty of empty canvas above it.
>
> Lore, for character rather than literal detail: The first thing to leave before weather turns. Hollow farmers watch the pipwings, not the sky.
>
> It is stage 1 of 3 in a family: **Pipwing** → Kestrelle → Galecrest. It evolves INTO Kestrelle at level 17, so leave room for it to grow — this stage should read as younger and simpler.
>
> Suggested palette, which you can refine: #9ab8e8, #5f7ba8, #e0e8f4, #2c3850, #e0b060.
>
> Give me the FRONT view (facing left) and the BACK view (from behind, facing
> away to the right) as two separate 128 × 128 PNGs with transparent
> backgrounds and hard pixel edges.

---

### Kestrelle  `kestrelle`

| | |
|---|---|
| **Type** | gale (wind and sky -- feathers, streamlined shapes) and beast (plain animal -- fur, hooves, honest anatomy) |
| **Size** | 0.8 m, 14.2 kg — MID band, draw it **85-100 px tall** in the 128 canvas |
| **Known as** | the Hanging Hunter |
| **Lives in** | open route and treeline |
| **Facing** | front faces **LEFT**; back faces **away to the RIGHT** |

**Prompt to paste:**

> Next creature: **Kestrelle**, the Hanging Hunter.
>
> falcon build, swept wings, banded chest.
>
> Its element is gale and beast, so it should read visually as wind and sky -- feathers, streamlined shapes, combined with plain animal -- fur, hooves, honest anatomy.
>
> It is 0.8 m tall and weighs 14.2 kg. Draw it **85-100 px tall** inside the
> 128 × 128 canvas, so its size on screen is honest next to the others.
>
> Lore, for character rather than literal detail: Holds position in a headwind without moving a feather. It is showing off, and it knows it.
>
> It is stage 2 of 3 in a family: Pipwing → **Kestrelle** → Galecrest. It evolves FROM Pipwing at level 17, so it should look like the same animal grown up — keep a shared silhouette signature and a related palette, but change the proportions and add complexity. It evolves INTO Galecrest at level 36.
>
> Suggested palette, which you can refine: #8fb0e0, #4f6b98, #e8eef8, #232c40, #d8a04a.
>
> Give me the FRONT view (facing left) and the BACK view (from behind, facing
> away to the right) as two separate 128 × 128 PNGs with transparent
> backgrounds and hard pixel edges.

---

### Galecrest  `galecrest`

| | |
|---|---|
| **Type** | gale (wind and sky -- feathers, streamlined shapes) and spark (electricity -- filaments, arcs, static) |
| **Size** | 1.6 m, 39.8 kg — LARGE band, draw it **100-115 px tall** in the 128 canvas |
| **Known as** | the Stormrider |
| **Lives in** | open route and treeline |
| **Facing** | front faces **LEFT**; back faces **away to the RIGHT** |

**Prompt to paste:**

> Next creature: **Galecrest**, the Stormrider.
>
> large raptor with a forked tail and a raised crest.
>
> Its element is gale and spark, so it should read visually as wind and sky -- feathers, streamlined shapes, combined with electricity -- filaments, arcs, static.
>
> It is 1.6 m tall and weighs 39.8 kg. Draw it **100-115 px tall** inside the
> 128 × 128 canvas, so its size on screen is honest next to the others.
>
> Lore, for character rather than literal detail: Flies into the front instead of away from it. The crest sparks when the pressure drops.
>
> It is stage 3 of 3 in a family: Pipwing → Kestrelle → **Galecrest**. It evolves FROM Kestrelle at level 36, so it should look like the same animal grown up — keep a shared silhouette signature and a related palette, but change the proportions and add complexity.
>
> Suggested palette, which you can refine: #7fa4dc, #3f5a88, #e8eef8, #f0d060, #1c2438.
>
> Give me the FRONT view (facing left) and the BACK view (from behind, facing
> away to the right) as two separate 128 × 128 PNGs with transparent
> backgrounds and hard pixel edges.

---

### Nettlebug  `nettlebug`

| | |
|---|---|
| **Type** | chitin (chitin) |
| **Size** | 0.3 m, 4.5 kg — TINY band, draw it **50-65 px tall** in the 128 canvas |
| **Known as** | the Nettle Grub |
| **Lives in** | thistlemoor undergrowth |
| **Facing** | front faces **LEFT**; back faces **away to the RIGHT** |

**Prompt to paste:**

> Next creature: **Nettlebug**, the Nettle Grub.
>
> segmented grub with raised bristle ridges.
>
> Its element is chitin, so it should read visually as chitin.
>
> It is 0.3 m tall and weighs 4.5 kg. Draw it **50-65 px tall** inside the
> 128 × 128 canvas, so its size on screen is honest next to the others — this one is small and should have plenty of empty canvas above it.
>
> Lore, for character rather than literal detail: Eats only stinging plants and becomes, predictably, unpleasant to handle.
>
> It is stage 1 of 3 in a family: **Nettlebug** → Spinnet → Weaverjaw. It evolves INTO Spinnet at level 12, so leave room for it to grow — this stage should read as younger and simpler.
>
> Suggested palette, which you can refine: #8fb03a, #5f7a24, #c9d98a, #33401a, #d0a050.
>
> Give me the FRONT view (facing left) and the BACK view (from behind, facing
> away to the right) as two separate 128 × 128 PNGs with transparent
> backgrounds and hard pixel edges.

---

### Spinnet  `spinnet`

| | |
|---|---|
| **Type** | chitin (chitin) and venom (toxins -- chitin, spines, warning colours) |
| **Size** | 0.5 m, 11 kg — SMALL band, draw it **65-85 px tall** in the 128 canvas |
| **Known as** | the Patient Weaver |
| **Lives in** | thistlemoor undergrowth |
| **Facing** | front faces **LEFT**; back faces **away to the RIGHT** |

**Prompt to paste:**

> Next creature: **Spinnet**, the Patient Weaver.
>
> eight-legged spinner, high abdomen, silk spools at the hip.
>
> Its element is chitin and venom, so it should read visually as chitin, combined with toxins -- chitin, spines, warning colours.
>
> It is 0.5 m tall and weighs 11 kg. Draw it **65-85 px tall** inside the
> 128 × 128 canvas, so its size on screen is honest next to the others.
>
> Lore, for character rather than literal detail: Spends four days building and one minute using. It considers this a fair trade.
>
> It is stage 2 of 3 in a family: Nettlebug → **Spinnet** → Weaverjaw. It evolves FROM Nettlebug at level 12, so it should look like the same animal grown up — keep a shared silhouette signature and a related palette, but change the proportions and add complexity. It evolves INTO Weaverjaw at level 28.
>
> Suggested palette, which you can refine: #7a9a34, #4f6820, #b8c878, #9a58b0, #2a3818.
>
> Give me the FRONT view (facing left) and the BACK view (from behind, facing
> away to the right) as two separate 128 × 128 PNGs with transparent
> backgrounds and hard pixel edges.

---

### Weaverjaw  `weaverjaw`

| | |
|---|---|
| **Type** | chitin (chitin) and venom (toxins -- chitin, spines, warning colours) |
| **Size** | 1.2 m, 47.3 kg — LARGE band, draw it **100-115 px tall** in the 128 canvas |
| **Known as** | the Standing Trap |
| **Lives in** | thistlemoor undergrowth |
| **Facing** | front faces **LEFT**; back faces **away to the RIGHT** |

**Prompt to paste:**

> Next creature: **Weaverjaw**, the Standing Trap.
>
> heavy-bodied spinner with armoured jaw plates.
>
> Its element is chitin and venom, so it should read visually as chitin, combined with toxins -- chitin, spines, warning colours.
>
> It is 1.2 m tall and weighs 47.3 kg. Draw it **100-115 px tall** inside the
> 128 × 128 canvas, so its size on screen is honest next to the others.
>
> Lore, for character rather than literal detail: It does not chase. In sixty recorded encounters, not once has it needed to.
>
> It is stage 3 of 3 in a family: Nettlebug → Spinnet → **Weaverjaw**. It evolves FROM Spinnet at level 28, so it should look like the same animal grown up — keep a shared silhouette signature and a related palette, but change the proportions and add complexity.
>
> Suggested palette, which you can refine: #6e8a2e, #43581c, #a8b868, #8a4aa0, #22300f.
>
> Give me the FRONT view (facing left) and the BACK view (from behind, facing
> away to the right) as two separate 128 × 128 PNGs with transparent
> backgrounds and hard pixel edges.

---

### Tuftail  `tuftail`

| | |
|---|---|
| **Type** | beast (plain animal -- fur, hooves, honest anatomy) |
| **Size** | 0.6 m, 13.8 kg — SMALL band, draw it **65-85 px tall** in the 128 canvas |
| **Known as** | the Hedgegrazer |
| **Lives in** | route verges |
| **Facing** | front faces **LEFT**; back faces **away to the RIGHT** |

**Prompt to paste:**

> Next creature: **Tuftail**, the Hedgegrazer.
>
> small grazing quadruped, thick neck ruff.
>
> Its element is beast, so it should read visually as plain animal -- fur, hooves, honest anatomy.
>
> It is 0.6 m tall and weighs 13.8 kg. Draw it **65-85 px tall** inside the
> 128 × 128 canvas, so its size on screen is honest next to the others.
>
> Lore, for character rather than literal detail: Follows walkers for a mile and a half, then loses interest exactly at the parish boundary.
>
> It is stage 1 of 2 in a family: **Tuftail** → Bristlebuck. It evolves INTO Bristlebuck through friendship, so leave room for it to grow — this stage should read as younger and simpler.
>
> Suggested palette, which you can refine: #c9b088, #8f7856, #e8dcc0, #4a3a28, #6e8a4a.
>
> Give me the FRONT view (facing left) and the BACK view (from behind, facing
> away to the right) as two separate 128 × 128 PNGs with transparent
> backgrounds and hard pixel edges.

---

### Bristlebuck  `bristlebuck`

| | |
|---|---|
| **Type** | beast (plain animal -- fur, hooves, honest anatomy) and verdant (plant life -- leaves, moss, bark, seeds) |
| **Size** | 1.4 m, 78.5 kg — LARGE band, draw it **100-115 px tall** in the 128 canvas |
| **Known as** | the Hedge Warden |
| **Lives in** | route verges |
| **Facing** | front faces **LEFT**; back faces **away to the RIGHT** |

**Prompt to paste:**

> Next creature: **Bristlebuck**, the Hedge Warden.
>
> stag-like grazer with a bristled mantle and low horns.
>
> Its element is beast and verdant, so it should read visually as plain animal -- fur, hooves, honest anatomy, combined with plant life -- leaves, moss, bark, seeds.
>
> It is 1.4 m tall and weighs 78.5 kg. Draw it **100-115 px tall** inside the
> 128 × 128 canvas, so its size on screen is honest next to the others.
>
> Lore, for character rather than literal detail: Puts itself between a herd and whatever is coming. It has never once been asked to.
>
> It is stage 2 of 2 in a family: Tuftail → **Bristlebuck**. It evolves FROM Tuftail through friendship, so it should look like the same animal grown up — keep a shared silhouette signature and a related palette, but change the proportions and add complexity.
>
> Suggested palette, which you can refine: #b89a70, #7d6444, #e0d4b0, #4f7a42, #3a2c1c.
>
> Give me the FRONT view (facing left) and the BACK view (from behind, facing
> away to the right) as two separate 128 × 128 PNGs with transparent
> backgrounds and hard pixel edges.

---

### Pebblet  `pebblet`

| | |
|---|---|
| **Type** | stone (rock and earth -- slabs, grit, mineral seams) |
| **Size** | 0.3 m, 22 kg — TINY band, draw it **50-65 px tall** in the 128 canvas |
| **Known as** | the Loose Stone |
| **Lives in** | quarry and cave |
| **Facing** | front faces **LEFT**; back faces **away to the RIGHT** |

**Prompt to paste:**

> Next creature: **Pebblet**, the Loose Stone.
>
> rounded boulder with stubby limbs and a seam of quartz.
>
> Its element is stone, so it should read visually as rock and earth -- slabs, grit, mineral seams.
>
> It is 0.3 m tall and weighs 22 kg. Draw it **50-65 px tall** inside the
> 128 × 128 canvas, so its size on screen is honest next to the others — this one is small and should have plenty of empty canvas above it.
>
> Lore, for character rather than literal detail: Indistinguishable from a rock until it is not. Kellowmere quarry hands kick everything twice.
>
> It is stage 1 of 3 in a family: **Pebblet** → Cairnling → Menhir. It evolves INTO Cairnling at level 22, so leave room for it to grow — this stage should read as younger and simpler.
>
> Suggested palette, which you can refine: #9d9da3, #6b6b73, #c8c8d0, #3a3a42, #d8c890.
>
> Give me the FRONT view (facing left) and the BACK view (from behind, facing
> away to the right) as two separate 128 × 128 PNGs with transparent
> backgrounds and hard pixel edges.

---

### Cairnling  `cairnling`

| | |
|---|---|
| **Type** | stone (rock and earth -- slabs, grit, mineral seams) |
| **Size** | 0.9 m, 105 kg — MID band, draw it **85-100 px tall** in the 128 canvas |
| **Known as** | the Stacked Marker |
| **Lives in** | quarry and cave |
| **Facing** | front faces **LEFT**; back faces **away to the RIGHT** |

**Prompt to paste:**

> Next creature: **Cairnling**, the Stacked Marker.
>
> stacked slab figure, uneven shoulders, moss at the joints.
>
> Its element is stone, so it should read visually as rock and earth -- slabs, grit, mineral seams.
>
> It is 0.9 m tall and weighs 105 kg. Draw it **85-100 px tall** inside the
> 128 × 128 canvas, so its size on screen is honest next to the others.
>
> Lore, for character rather than literal detail: Stacks itself in the shape of a waymarker and stands at crossroads. Travellers have been following them for centuries. Nobody knows where they lead.
>
> It is stage 2 of 3 in a family: Pebblet → **Cairnling** → Menhir. It evolves FROM Pebblet at level 22, so it should look like the same animal grown up — keep a shared silhouette signature and a related palette, but change the proportions and add complexity. It evolves INTO Menhir at level 38.
>
> Suggested palette, which you can refine: #93939b, #5f5f68, #c0c0c8, #33333c, #6e8a4a.
>
> Give me the FRONT view (facing left) and the BACK view (from behind, facing
> away to the right) as two separate 128 × 128 PNGs with transparent
> backgrounds and hard pixel edges.

---

### Menhir  `menhir`

| | |
|---|---|
| **Type** | stone (rock and earth -- slabs, grit, mineral seams) and iron (worked metal -- rivets, plate, rust) |
| **Size** | 2.4 m, 460 kg — HUGE band, draw it **115-126 px tall** in the 128 canvas |
| **Known as** | the Standing Stone |
| **Lives in** | quarry and cave |
| **Facing** | front faces **LEFT**; back faces **away to the RIGHT** |

**Prompt to paste:**

> Next creature: **Menhir**, the Standing Stone.
>
> tall monolith with ore veins and a carved face.
>
> Its element is stone and iron, so it should read visually as rock and earth -- slabs, grit, mineral seams, combined with worked metal -- rivets, plate, rust.
>
> It is 2.4 m tall and weighs 460 kg. Draw it **115-126 px tall** inside the
> 128 × 128 canvas, so its size on screen is honest next to the others — this one is large and should nearly fill the canvas.
>
> Lore, for character rather than literal detail: There are nineteen on the Northwatch ridge. There were eighteen last spring. Nobody saw it arrive.
>
> It is stage 3 of 3 in a family: Pebblet → Cairnling → **Menhir**. It evolves FROM Cairnling at level 38, so it should look like the same animal grown up — keep a shared silhouette signature and a related palette, but change the proportions and add complexity.
>
> Suggested palette, which you can refine: #8a8a92, #565660, #b8b8c0, #93a3ad, #2a2a33.
>
> Give me the FRONT view (facing left) and the BACK view (from behind, facing
> away to the right) as two separate 128 × 128 PNGs with transparent
> backgrounds and hard pixel edges.

---

### Fizzlet  `fizzlet`

| | |
|---|---|
| **Type** | spark (electricity -- filaments, arcs, static) |
| **Size** | 0.3 m, 5 kg — TINY band, draw it **50-65 px tall** in the 128 canvas |
| **Known as** | the Loose Charge |
| **Lives in** | cinderfall works and route wires |
| **Facing** | front faces **LEFT**; back faces **away to the RIGHT** |

**Prompt to paste:**

> Next creature: **Fizzlet**, the Loose Charge.
>
> small bristling ball with two trailing filaments.
>
> Its element is spark, so it should read visually as electricity -- filaments, arcs, static.
>
> It is 0.3 m tall and weighs 5 kg. Draw it **50-65 px tall** inside the
> 128 × 128 canvas, so its size on screen is honest next to the others — this one is small and should have plenty of empty canvas above it.
>
> Lore, for character rather than literal detail: Sticks to metal fences and refuses to be removed politely.
>
> It is stage 1 of 2 in a family: **Fizzlet** → Voltwick. It evolves INTO Voltwick at level 24, so leave room for it to grow — this stage should read as younger and simpler.
>
> Suggested palette, which you can refine: #e8c53a, #b09420, #fff0a0, #3a3418, #8fb4cf.
>
> Give me the FRONT view (facing left) and the BACK view (from behind, facing
> away to the right) as two separate 128 × 128 PNGs with transparent
> backgrounds and hard pixel edges.

---

### Voltwick  `voltwick`

| | |
|---|---|
| **Type** | spark (electricity -- filaments, arcs, static) |
| **Size** | 1 m, 22.5 kg — MID band, draw it **85-100 px tall** in the 128 canvas |
| **Known as** | the Live Line |
| **Lives in** | cinderfall works and route wires |
| **Facing** | front faces **LEFT**; back faces **away to the RIGHT** |

**Prompt to paste:**

> Next creature: **Voltwick**, the Live Line.
>
> lean upright creature with a filament crest and forked tail.
>
> Its element is spark, so it should read visually as electricity -- filaments, arcs, static.
>
> It is 1 m tall and weighs 22.5 kg. Draw it **85-100 px tall** inside the
> 128 × 128 canvas, so its size on screen is honest next to the others.
>
> Lore, for character rather than literal detail: Cinderfall pays a bounty for every one removed from the substation. The bounty has never been reduced.
>
> It is stage 2 of 2 in a family: Fizzlet → **Voltwick**. It evolves FROM Fizzlet at level 24, so it should look like the same animal grown up — keep a shared silhouette signature and a related palette, but change the proportions and add complexity.
>
> Suggested palette, which you can refine: #e8c53a, #a88a1c, #fff0a0, #4a4020, #6fa8d0.
>
> Give me the FRONT view (facing left) and the BACK view (from behind, facing
> away to the right) as two separate 128 × 128 PNGs with transparent
> backgrounds and hard pixel edges.

---

### Rillfry  `rillfry`

| | |
|---|---|
| **Type** | tide (water -- fins, wet hide, foam, sea life) |
| **Size** | 0.2 m, 2.4 kg — TINY band, draw it **50-65 px tall** in the 128 canvas |
| **Known as** | the Shallow Dart |
| **Lives in** | ponds and shallows |
| **Facing** | front faces **LEFT**; back faces **away to the RIGHT** |

**Prompt to paste:**

> Next creature: **Rillfry**, the Shallow Dart.
>
> slim darting fish with a split tail.
>
> Its element is tide, so it should read visually as water -- fins, wet hide, foam, sea life.
>
> It is 0.2 m tall and weighs 2.4 kg. Draw it **50-65 px tall** inside the
> 128 × 128 canvas, so its size on screen is honest next to the others — this one is small and should have plenty of empty canvas above it.
>
> Lore, for character rather than literal detail: Travels in counts of exactly seven. Split the shoal and both halves stop moving until it is seven again.
>
> It is stage 1 of 2 in a family: **Rillfry** → Currentail. It evolves INTO Currentail at level 20, so leave room for it to grow — this stage should read as younger and simpler.
>
> Suggested palette, which you can refine: #6fb0d8, #3f7aa8, #c0e8f4, #1f4060, #e0d070.
>
> Give me the FRONT view (facing left) and the BACK view (from behind, facing
> away to the right) as two separate 128 × 128 PNGs with transparent
> backgrounds and hard pixel edges.

---

### Currentail  `currentail`

| | |
|---|---|
| **Type** | tide (water -- fins, wet hide, foam, sea life) |
| **Size** | 1.1 m, 26.8 kg — LARGE band, draw it **100-115 px tall** in the 128 canvas |
| **Known as** | the Running Water |
| **Lives in** | ponds and shallows |
| **Facing** | front faces **LEFT**; back faces **away to the RIGHT** |

**Prompt to paste:**

> Next creature: **Currentail**, the Running Water.
>
> streamlined swimmer with long trailing tail ribbons.
>
> Its element is tide, so it should read visually as water -- fins, wet hide, foam, sea life.
>
> It is 1.1 m tall and weighs 26.8 kg. Draw it **100-115 px tall** inside the
> 128 × 128 canvas, so its size on screen is honest next to the others.
>
> Lore, for character rather than literal detail: Swims upstream through the Turning while everything else swims with it. Nobody has established why.
>
> It is stage 2 of 2 in a family: Rillfry → **Currentail**. It evolves FROM Rillfry at level 20, so it should look like the same animal grown up — keep a shared silhouette signature and a related palette, but change the proportions and add complexity.
>
> Suggested palette, which you can refine: #4a90c0, #28648f, #a8dcf0, #16344f, #e8d078.
>
> Give me the FRONT view (facing left) and the BACK view (from behind, facing
> away to the right) as two separate 128 × 128 PNGs with transparent
> backgrounds and hard pixel edges.

---

### Sootmoth  `sootmoth`

| | |
|---|---|
| **Type** | flame (fire and heat -- embers, scorch, glowing cracks) and chitin (chitin) |
| **Size** | 0.5 m, 6.2 kg — SMALL band, draw it **65-85 px tall** in the 128 canvas |
| **Known as** | the Ash Drifter |
| **Lives in** | chimneys and warm caves |
| **Facing** | front faces **LEFT**; back faces **away to the RIGHT** |

**Prompt to paste:**

> Next creature: **Sootmoth**, the Ash Drifter.
>
> broad-winged moth with ember-lit wing edges.
>
> Its element is flame and chitin, so it should read visually as fire and heat -- embers, scorch, glowing cracks, combined with chitin.
>
> It is 0.5 m tall and weighs 6.2 kg. Draw it **65-85 px tall** inside the
> 128 × 128 canvas, so its size on screen is honest next to the others.
>
> Lore, for character rather than literal detail: Lays its eggs in still-warm hearths. Householders in Cinderfall have simply given up.
>
> It does not evolve and has no relatives, so it stands alone — give it a strong, distinctive identity.
>
> Suggested palette, which you can refine: #c9603a, #8a3a20, #f0a860, #4a3428, #e8d0a0.
>
> Give me the FRONT view (facing left) and the BACK view (from behind, facing
> away to the right) as two separate 128 × 128 PNGs with transparent
> backgrounds and hard pixel edges.

---

### Chalkid  `chalkid`

| | |
|---|---|
| **Type** | stone (rock and earth -- slabs, grit, mineral seams) |
| **Size** | 0.4 m, 18.5 kg — SMALL band, draw it **65-85 px tall** in the 128 canvas |
| **Known as** | the Chalk Nodule |
| **Lives in** | quarry faces |
| **Facing** | front faces **LEFT**; back faces **away to the RIGHT** |

**Prompt to paste:**

> Next creature: **Chalkid**, the Chalk Nodule.
>
> rounded chalk lump with blunt limbs and a banded seam.
>
> Its element is stone, so it should read visually as rock and earth -- slabs, grit, mineral seams.
>
> It is 0.4 m tall and weighs 18.5 kg. Draw it **65-85 px tall** inside the
> 128 × 128 canvas, so its size on screen is honest next to the others.
>
> Lore, for character rather than literal detail: Leaves a white smear on anything it touches. Quarry children use them to mark tunnels and then cannot explain the extra marks.
>
> It is stage 1 of 2 in a family: **Chalkid** → Chalkmar. It evolves INTO Chalkmar at level 26, so leave room for it to grow — this stage should read as younger and simpler.
>
> Suggested palette, which you can refine: #d8d4c4, #a8a494, #f0ece0, #8a8478, #3a3830.
>
> Give me the FRONT view (facing left) and the BACK view (from behind, facing
> away to the right) as two separate 128 × 128 PNGs with transparent
> backgrounds and hard pixel edges.

---

### Chalkmar  `chalkmar`

| | |
|---|---|
| **Type** | stone (rock and earth -- slabs, grit, mineral seams) and iron (worked metal -- rivets, plate, rust) |
| **Size** | 1.5 m, 210 kg — LARGE band, draw it **100-115 px tall** in the 128 canvas |
| **Known as** | the Cut Face |
| **Lives in** | quarry faces |
| **Facing** | front faces **LEFT**; back faces **away to the RIGHT** |

**Prompt to paste:**

> Next creature: **Chalkmar**, the Cut Face.
>
> broad slab-plated walker with a chalk-white underbody.
>
> Its element is stone and iron, so it should read visually as rock and earth -- slabs, grit, mineral seams, combined with worked metal -- rivets, plate, rust.
>
> It is 1.5 m tall and weighs 210 kg. Draw it **100-115 px tall** inside the
> 128 × 128 canvas, so its size on screen is honest next to the others.
>
> Lore, for character rather than literal detail: Grows a shell of quarried slate over the soft chalk beneath. Nobody has ever seen one shed, and nobody has ever found a shed one.
>
> It is stage 2 of 2 in a family: Chalkid → **Chalkmar**. It evolves FROM Chalkid at level 26, so it should look like the same animal grown up — keep a shared silhouette signature and a related palette, but change the proportions and add complexity.
>
> Suggested palette, which you can refine: #b0b4bc, #7c8088, #d8dce4, #a89c78, #2e3138.
>
> Give me the FRONT view (facing left) and the BACK view (from behind, facing
> away to the right) as two separate 128 × 128 PNGs with transparent
> backgrounds and hard pixel edges.

---

### Mossback  `mossback`

| | |
|---|---|
| **Type** | verdant (plant life -- leaves, moss, bark, seeds) and stone (rock and earth -- slabs, grit, mineral seams) |
| **Size** | 1.1 m, 165 kg — LARGE band, draw it **100-115 px tall** in the 128 canvas |
| **Known as** | the Slow Boulder |
| **Lives in** | quarry faces |
| **Facing** | front faces **LEFT**; back faces **away to the RIGHT** |

**Prompt to paste:**

> Next creature: **Mossback**, the Slow Boulder.
>
> low mossed boulder with a slow-blinking eye and stubby legs.
>
> Its element is verdant and stone, so it should read visually as plant life -- leaves, moss, bark, seeds, combined with rock and earth -- slabs, grit, mineral seams.
>
> It is 1.1 m tall and weighs 165 kg. Draw it **100-115 px tall** inside the
> 128 × 128 canvas, so its size on screen is honest next to the others.
>
> Lore, for character rather than literal detail: Moves roughly two metres a day. Surveyors mark them on charts as landmarks and have had to redraw the charts twice.
>
> It does not evolve and has no relatives, so it stands alone — give it a strong, distinctive identity.
>
> Suggested palette, which you can refine: #6e7a5c, #4a5440, #93a37c, #8a8478, #26301f.
>
> Give me the FRONT view (facing left) and the BACK view (from behind, facing
> away to the right) as two separate 128 × 128 PNGs with transparent
> backgrounds and hard pixel edges.

---

### Slatewing  `slatewing`

| | |
|---|---|
| **Type** | stone (rock and earth -- slabs, grit, mineral seams) and gale (wind and sky -- feathers, streamlined shapes) |
| **Size** | 0.5 m, 12 kg — SMALL band, draw it **65-85 px tall** in the 128 canvas |
| **Known as** | the Loose Shard |
| **Lives in** | quarry faces |
| **Facing** | front faces **LEFT**; back faces **away to the RIGHT** |

**Prompt to paste:**

> Next creature: **Slatewing**, the Loose Shard.
>
> angular flat-winged bird with slate plating along the back.
>
> Its element is stone and gale, so it should read visually as rock and earth -- slabs, grit, mineral seams, combined with wind and sky -- feathers, streamlined shapes.
>
> It is 0.5 m tall and weighs 12 kg. Draw it **65-85 px tall** inside the
> 128 × 128 canvas, so its size on screen is honest next to the others.
>
> Lore, for character rather than literal detail: Roosts flat against a quarry wall and is indistinguishable from the wall until the wall leaves.
>
> It is stage 1 of 2 in a family: **Slatewing** → Craglide. It evolves INTO Craglide at level 28, so leave room for it to grow — this stage should read as younger and simpler.
>
> Suggested palette, which you can refine: #8a90a0, #5c6272, #c0c6d4, #a8845a, #282c38.
>
> Give me the FRONT view (facing left) and the BACK view (from behind, facing
> away to the right) as two separate 128 × 128 PNGs with transparent
> backgrounds and hard pixel edges.

---

### Craglide  `craglide`

| | |
|---|---|
| **Type** | stone (rock and earth -- slabs, grit, mineral seams) and gale (wind and sky -- feathers, streamlined shapes) |
| **Size** | 1.5 m, 52 kg — LARGE band, draw it **100-115 px tall** in the 128 canvas |
| **Known as** | the Falling Wall |
| **Lives in** | quarry faces |
| **Facing** | front faces **LEFT**; back faces **away to the RIGHT** |

**Prompt to paste:**

> Next creature: **Craglide**, the Falling Wall.
>
> large raptor with slab-plated wings and a hooked stone beak.
>
> Its element is stone and gale, so it should read visually as rock and earth -- slabs, grit, mineral seams, combined with wind and sky -- feathers, streamlined shapes.
>
> It is 1.5 m tall and weighs 52 kg. Draw it **100-115 px tall** inside the
> 128 × 128 canvas, so its size on screen is honest next to the others.
>
> Lore, for character rather than literal detail: Dives without a single wingbeat. The quarry calls the sound it makes on the way down "the whistle", and they stop working when they hear it.
>
> It is stage 2 of 2 in a family: Slatewing → **Craglide**. It evolves FROM Slatewing at level 28, so it should look like the same animal grown up — keep a shared silhouette signature and a related palette, but change the proportions and add complexity.
>
> Suggested palette, which you can refine: #7d8494, #4e5464, #b8c0d0, #c08a3a, #20242e.
>
> Give me the FRONT view (facing left) and the BACK view (from behind, facing
> away to the right) as two separate 128 × 128 PNGs with transparent
> backgrounds and hard pixel edges.

---

### Emberbore  `emberbore`

| | |
|---|---|
| **Type** | flame (fire and heat -- embers, scorch, glowing cracks) and terra (terra) |
| **Size** | 0.7 m, 41 kg — MID band, draw it **85-100 px tall** in the 128 canvas |
| **Known as** | the Hot Seam |
| **Lives in** | quarry undermine |
| **Facing** | front faces **LEFT**; back faces **away to the RIGHT** |

**Prompt to paste:**

> Next creature: **Emberbore**, the Hot Seam.
>
> squat armoured digger with a glowing drill-snout.
>
> Its element is flame and terra, so it should read visually as fire and heat -- embers, scorch, glowing cracks, combined with terra.
>
> It is 0.7 m tall and weighs 41 kg. Draw it **85-100 px tall** inside the
> 128 × 128 canvas, so its size on screen is honest next to the others.
>
> Lore, for character rather than literal detail: Bores through rock by heating it until it gives up. The tunnels it leaves are perfectly round and slightly warm for a week.
>
> It does not evolve and has no relatives, so it stands alone — give it a strong, distinctive identity.
>
> Suggested palette, which you can refine: #c06038, #8a3c1e, #e8a050, #8a7a5a, #2e1c14.
>
> Give me the FRONT view (facing left) and the BACK view (from behind, facing
> away to the right) as two separate 128 × 128 PNGs with transparent
> backgrounds and hard pixel edges.

---

### Lantric  `lantric`

| | |
|---|---|
| **Type** | spark (electricity -- filaments, arcs, static) and iron (worked metal -- rivets, plate, rust) |
| **Size** | 0.8 m, 34 kg — MID band, draw it **85-100 px tall** in the 128 canvas |
| **Known as** | the Pit Lamp |
| **Lives in** | quarry undermine |
| **Facing** | front faces **LEFT**; back faces **away to the RIGHT** |

**Prompt to paste:**

> Next creature: **Lantric**, the Pit Lamp.
>
> hanging iron lantern with a filament core and two hook arms.
>
> Its element is spark and iron, so it should read visually as electricity -- filaments, arcs, static, combined with worked metal -- rivets, plate, rust.
>
> It is 0.8 m tall and weighs 34 kg. Draw it **85-100 px tall** inside the
> 128 × 128 canvas, so its size on screen is honest next to the others.
>
> Lore, for character rather than literal detail: Hangs itself on a hook and burns steady for eleven hours. Quarry crews insist this is a coincidence and hang it up anyway.
>
> It does not evolve and has no relatives, so it stands alone — give it a strong, distinctive identity.
>
> Suggested palette, which you can refine: #c8b458, #8a7a30, #f4e69a, #93a3ad, #2a2a20.
>
> Give me the FRONT view (facing left) and the BACK view (from behind, facing
> away to the right) as two separate 128 × 128 PNGs with transparent
> backgrounds and hard pixel edges.

---

### Frostnip  `frostnip`

| | |
|---|---|
| **Type** | frost (ice and cold -- rime, icicles, pale breath) |
| **Size** | 0.4 m, 8 kg — SMALL band, draw it **65-85 px tall** in the 128 canvas |
| **Known as** | the Cold Snap |
| **Lives in** | kellowmere lakeshore |
| **Facing** | front faces **LEFT**; back faces **away to the RIGHT** |

**Prompt to paste:**

> Next creature: **Frostnip**, the Cold Snap.
>
> small frost-furred canine with icicle whiskers.
>
> Its element is frost, so it should read visually as ice and cold -- rime, icicles, pale breath.
>
> It is 0.4 m tall and weighs 8 kg. Draw it **65-85 px tall** inside the
> 128 × 128 canvas, so its size on screen is honest next to the others.
>
> Lore, for character rather than literal detail: Sleeps on the lake shore where the water refuses to freeze, which is the only warm place it can find and the only place it does not want to be.
>
> It is stage 1 of 2 in a family: **Frostnip** → Rimehound. It evolves INTO Rimehound at level 25, so leave room for it to grow — this stage should read as younger and simpler.
>
> Suggested palette, which you can refine: #c8e4f0, #8fb4cc, #f0fafc, #5a7a94, #26384a.
>
> Give me the FRONT view (facing left) and the BACK view (from behind, facing
> away to the right) as two separate 128 × 128 PNGs with transparent
> backgrounds and hard pixel edges.

---

### Rimehound  `rimehound`

| | |
|---|---|
| **Type** | frost (ice and cold -- rime, icicles, pale breath) and beast (plain animal -- fur, hooves, honest anatomy) |
| **Size** | 1.3 m, 54 kg — LARGE band, draw it **100-115 px tall** in the 128 canvas |
| **Known as** | the Long Winter |
| **Lives in** | kellowmere lakeshore |
| **Facing** | front faces **LEFT**; back faces **away to the RIGHT** |

**Prompt to paste:**

> Next creature: **Rimehound**, the Long Winter.
>
> long-legged hound with a frost mane and trailing breath.
>
> Its element is frost and beast, so it should read visually as ice and cold -- rime, icicles, pale breath, combined with plain animal -- fur, hooves, honest anatomy.
>
> It is 1.3 m tall and weighs 54 kg. Draw it **100-115 px tall** inside the
> 128 × 128 canvas, so its size on screen is honest next to the others.
>
> Lore, for character rather than literal detail: Runs the lake ice in packs of three. There is always a fourth set of tracks and there has never been a fourth hound.
>
> It is stage 2 of 2 in a family: Frostnip → **Rimehound**. It evolves FROM Frostnip at level 25, so it should look like the same animal grown up — keep a shared silhouette signature and a related palette, but change the proportions and add complexity.
>
> Suggested palette, which you can refine: #a8cfe0, #6d94ac, #e8f6fc, #4a6880, #1e2c3c.
>
> Give me the FRONT view (facing left) and the BACK view (from behind, facing
> away to the right) as two separate 128 × 128 PNGs with transparent
> backgrounds and hard pixel edges.

---

### Deeplum  `deeplum`

| | |
|---|---|
| **Type** | tide (water -- fins, wet hide, foam, sea life) and umbral (shadow -- deep tones, low light) |
| **Size** | 0.9 m, 28 kg — MID band, draw it **85-100 px tall** in the 128 canvas |
| **Known as** | the Lamp Below |
| **Lives in** | kellowmere lake |
| **Facing** | front faces **LEFT**; back faces **away to the RIGHT** |

**Prompt to paste:**

> Next creature: **Deeplum**, the Lamp Below.
>
> trailing deep-water form with one hanging lure light.
>
> Its element is tide and umbral, so it should read visually as water -- fins, wet hide, foam, sea life, combined with shadow -- deep tones, low light.
>
> It is 0.9 m tall and weighs 28 kg. Draw it **85-100 px tall** inside the
> 128 × 128 canvas, so its size on screen is honest next to the others.
>
> Lore, for character rather than literal detail: A single pale light, forty metres down, that has not moved in the eleven years the lake has been surveyed.
>
> It does not evolve and has no relatives, so it stands alone — give it a strong, distinctive identity.
>
> Suggested palette, which you can refine: #2f4a68, #1c2e44, #5a86a8, #c8e0a0, #101a26.
>
> Give me the FRONT view (facing left) and the BACK view (from behind, facing
> away to the right) as two separate 128 × 128 PNGs with transparent
> backgrounds and hard pixel edges.

---

### Tallowmoth  `tallowmoth`

| | |
|---|---|
| **Type** | chitin (chitin) and radiant (radiant) |
| **Size** | 0.6 m, 5.4 kg — SMALL band, draw it **65-85 px tall** in the 128 canvas |
| **Known as** | the Lampwing |
| **Lives in** | quarry undermine |
| **Facing** | front faces **LEFT**; back faces **away to the RIGHT** |

**Prompt to paste:**

> Next creature: **Tallowmoth**, the Lampwing.
>
> pale broad-winged moth with luminous wing panels.
>
> Its element is chitin and radiant, so it should read visually as chitin, combined with radiant.
>
> It is 0.6 m tall and weighs 5.4 kg. Draw it **65-85 px tall** inside the
> 128 × 128 canvas, so its size on screen is honest next to the others.
>
> Lore, for character rather than literal detail: Drawn to any steady light. Quarry crews carry a spare lamp purely to send somewhere else.
>
> It does not evolve and has no relatives, so it stands alone — give it a strong, distinctive identity.
>
> Suggested palette, which you can refine: #e8dca8, #b8a870, #fdf6d8, #d8b048, #4a4028.
>
> Give me the FRONT view (facing left) and the BACK view (from behind, facing
> away to the right) as two separate 128 × 128 PNGs with transparent
> backgrounds and hard pixel edges.

---

### Gravelet  `gravelet`

| | |
|---|---|
| **Type** | terra (terra) |
| **Size** | 0.3 m, 9.6 kg — TINY band, draw it **50-65 px tall** in the 128 canvas |
| **Known as** | the Spoil Heap |
| **Lives in** | quarry spoil |
| **Facing** | front faces **LEFT**; back faces **away to the RIGHT** |

**Prompt to paste:**

> Next creature: **Gravelet**, the Spoil Heap.
>
> scruffy digger caked in loose grit, oversized foreclaws.
>
> Its element is terra, so it should read visually as terra.
>
> It is 0.3 m tall and weighs 9.6 kg. Draw it **50-65 px tall** inside the
> 128 × 128 canvas, so its size on screen is honest next to the others — this one is small and should have plenty of empty canvas above it.
>
> Lore, for character rather than literal detail: Lives in the waste rock and eats what the quarry throws away, which is most of it.
>
> It does not evolve and has no relatives, so it stands alone — give it a strong, distinctive identity.
>
> Suggested palette, which you can refine: #b09878, #7a6650, #d8c8a8, #8a7040, #332a1e.
>
> Give me the FRONT view (facing left) and the BACK view (from behind, facing
> away to the right) as two separate 128 × 128 PNGs with transparent
> backgrounds and hard pixel edges.

---

### Shalefin  `shalefin`

| | |
|---|---|
| **Type** | tide (water -- fins, wet hide, foam, sea life) |
| **Size** | 0.4 m, 11.2 kg — SMALL band, draw it **65-85 px tall** in the 128 canvas |
| **Known as** | the Flat Runner |
| **Lives in** | tidal flats |
| **Facing** | front faces **LEFT**; back faces **away to the RIGHT** |

**Prompt to paste:**

> Next creature: **Shalefin**, the Flat Runner.
>
> flat bottom-dwelling fish with a gritted upper hide.
>
> Its element is tide, so it should read visually as water -- fins, wet hide, foam, sea life.
>
> It is 0.4 m tall and weighs 11.2 kg. Draw it **65-85 px tall** inside the
> 128 × 128 canvas, so its size on screen is honest next to the others.
>
> Lore, for character rather than literal detail: Lies under two centimetres of water on the flats and is invisible until you tread on one. Then it is extremely visible.
>
> It is stage 1 of 2 in a family: **Shalefin** → Tidewrack. It evolves INTO Tidewrack at level 29, so leave room for it to grow — this stage should read as younger and simpler.
>
> Suggested palette, which you can refine: #6a7f8c, #43535e, #9db3bd, #c8b078, #232e36.
>
> Give me the FRONT view (facing left) and the BACK view (from behind, facing
> away to the right) as two separate 128 × 128 PNGs with transparent
> backgrounds and hard pixel edges.

---

### Tidewrack  `tidewrack`

| | |
|---|---|
| **Type** | tide (water -- fins, wet hide, foam, sea life) and stone (rock and earth -- slabs, grit, mineral seams) |
| **Size** | 1.6 m, 96 kg — LARGE band, draw it **100-115 px tall** in the 128 canvas |
| **Known as** | the Ground Swell |
| **Lives in** | tidal flats |
| **Facing** | front faces **LEFT**; back faces **away to the RIGHT** |

**Prompt to paste:**

> Next creature: **Tidewrack**, the Ground Swell.
>
> heavy shingle-plated swimmer with a blunt ramming head.
>
> Its element is tide and stone, so it should read visually as water -- fins, wet hide, foam, sea life, combined with rock and earth -- slabs, grit, mineral seams.
>
> It is 1.6 m tall and weighs 96 kg. Draw it **100-115 px tall** inside the
> 128 × 128 canvas, so its size on screen is honest next to the others.
>
> Lore, for character rather than literal detail: Carries a hide of cemented shingle. Brackwater dredges the channel twice a year and finds the shingle gone every time.
>
> It is stage 2 of 2 in a family: Shalefin → **Tidewrack**. It evolves FROM Shalefin at level 29, so it should look like the same animal grown up — keep a shared silhouette signature and a related palette, but change the proportions and add complexity.
>
> Suggested palette, which you can refine: #5c7280, #38464f, #8fa6b2, #b09a68, #1c262d.
>
> Give me the FRONT view (facing left) and the BACK view (from behind, facing
> away to the right) as two separate 128 × 128 PNGs with transparent
> backgrounds and hard pixel edges.

---

### Pinchel  `pinchel`

| | |
|---|---|
| **Type** | tide (water -- fins, wet hide, foam, sea life) and chitin (chitin) |
| **Size** | 0.3 m, 7.8 kg — TINY band, draw it **50-65 px tall** in the 128 canvas |
| **Known as** | the Flat Picker |
| **Lives in** | tidal flats |
| **Facing** | front faces **LEFT**; back faces **away to the RIGHT** |

**Prompt to paste:**

> Next creature: **Pinchel**, the Flat Picker.
>
> squat armoured crab with one oversized claw.
>
> Its element is tide and chitin, so it should read visually as water -- fins, wet hide, foam, sea life, combined with chitin.
>
> It is 0.3 m tall and weighs 7.8 kg. Draw it **50-65 px tall** inside the
> 128 × 128 canvas, so its size on screen is honest next to the others — this one is small and should have plenty of empty canvas above it.
>
> Lore, for character rather than literal detail: Works the tideline for whatever the sea has given up on. Will fight anything for a shell it does not need.
>
> It is stage 1 of 2 in a family: **Pinchel** → Clatterclaw. It evolves INTO Clatterclaw at level 27, so leave room for it to grow — this stage should read as younger and simpler.
>
> Suggested palette, which you can refine: #c26a4a, #8a4028, #e8a074, #5f7a48, #2e1a12.
>
> Give me the FRONT view (facing left) and the BACK view (from behind, facing
> away to the right) as two separate 128 × 128 PNGs with transparent
> backgrounds and hard pixel edges.

---

### Clatterclaw  `clatterclaw`

| | |
|---|---|
| **Type** | tide (water -- fins, wet hide, foam, sea life) and chitin (chitin) |
| **Size** | 1.2 m, 68 kg — LARGE band, draw it **100-115 px tall** in the 128 canvas |
| **Known as** | the Dredge |
| **Lives in** | tidal flats |
| **Facing** | front faces **LEFT**; back faces **away to the RIGHT** |

**Prompt to paste:**

> Next creature: **Clatterclaw**, the Dredge.
>
> broad reef crab with paired shearing claws.
>
> Its element is tide and chitin, so it should read visually as water -- fins, wet hide, foam, sea life, combined with chitin.
>
> It is 1.2 m tall and weighs 68 kg. Draw it **100-115 px tall** inside the
> 128 × 128 canvas, so its size on screen is honest next to the others.
>
> Lore, for character rather than literal detail: The sound of a colony working the flats at night carries a mile inland. Brackwater has stopped finding it unsettling.
>
> It is stage 2 of 2 in a family: Pinchel → **Clatterclaw**. It evolves FROM Pinchel at level 27, so it should look like the same animal grown up — keep a shared silhouette signature and a related palette, but change the proportions and add complexity.
>
> Suggested palette, which you can refine: #b85a3c, #7a3420, #e09468, #4f6a3c, #28150f.
>
> Give me the FRONT view (facing left) and the BACK view (from behind, facing
> away to the right) as two separate 128 × 128 PNGs with transparent
> backgrounds and hard pixel edges.

---

### Gullswift  `gullswift`

| | |
|---|---|
| **Type** | gale (wind and sky -- feathers, streamlined shapes) and tide (water -- fins, wet hide, foam, sea life) |
| **Size** | 0.9 m, 16.4 kg — MID band, draw it **85-100 px tall** in the 128 canvas |
| **Known as** | the Channel Diver |
| **Lives in** | brackwater channel |
| **Facing** | front faces **LEFT**; back faces **away to the RIGHT** |

**Prompt to paste:**

> Next creature: **Gullswift**, the Channel Diver.
>
> long-winged seabird with a dagger bill and forked tail.
>
> Its element is gale and tide, so it should read visually as wind and sky -- feathers, streamlined shapes, combined with water -- fins, wet hide, foam, sea life.
>
> It is 0.9 m tall and weighs 16.4 kg. Draw it **85-100 px tall** inside the
> 128 × 128 canvas, so its size on screen is honest next to the others.
>
> Lore, for character rather than literal detail: Hits the water at forty knots and comes up with something every time. Nobody has photographed a miss.
>
> It does not evolve and has no relatives, so it stands alone — give it a strong, distinctive identity.
>
> Suggested palette, which you can refine: #e4ecf4, #a8b8c8, #ffffff, #e0a038, #2a3440.
>
> Give me the FRONT view (facing left) and the BACK view (from behind, facing
> away to the right) as two separate 128 × 128 PNGs with transparent
> backgrounds and hard pixel edges.

---

### Bladderwrack  `bladderwrack`

| | |
|---|---|
| **Type** | verdant (plant life -- leaves, moss, bark, seeds) and tide (water -- fins, wet hide, foam, sea life) |
| **Size** | 1.4 m, 44 kg — LARGE band, draw it **100-115 px tall** in the 128 canvas |
| **Known as** | the Holdfast |
| **Lives in** | tidal flats |
| **Facing** | front faces **LEFT**; back faces **away to the RIGHT** |

**Prompt to paste:**

> Next creature: **Bladderwrack**, the Holdfast.
>
> draped kelp column with float bladders and a holdfast base.
>
> Its element is verdant and tide, so it should read visually as plant life -- leaves, moss, bark, seeds, combined with water -- fins, wet hide, foam, sea life.
>
> It is 1.4 m tall and weighs 44 kg. Draw it **100-115 px tall** inside the
> 128 × 128 canvas, so its size on screen is honest next to the others.
>
> Lore, for character rather than literal detail: Anchors to one rock and stays there for its whole life. Prise one loose and it will find the same rock again.
>
> It does not evolve and has no relatives, so it stands alone — give it a strong, distinctive identity.
>
> Suggested palette, which you can refine: #5a7a48, #3a5230, #8aa860, #c8b45a, #22301c.
>
> Give me the FRONT view (facing left) and the BACK view (from behind, facing
> away to the right) as two separate 128 × 128 PNGs with transparent
> backgrounds and hard pixel edges.

---

### Silthopper  `silthopper`

| | |
|---|---|
| **Type** | terra (terra) and chitin (chitin) |
| **Size** | 0.3 m, 4.2 kg — TINY band, draw it **50-65 px tall** in the 128 canvas |
| **Known as** | the Mud Skipper |
| **Lives in** | tidal flats |
| **Facing** | front faces **LEFT**; back faces **away to the RIGHT** |

**Prompt to paste:**

> Next creature: **Silthopper**, the Mud Skipper.
>
> long-legged mud insect built for launching.
>
> Its element is terra and chitin, so it should read visually as terra, combined with chitin.
>
> It is 0.3 m tall and weighs 4.2 kg. Draw it **50-65 px tall** inside the
> 128 × 128 canvas, so its size on screen is honest next to the others — this one is small and should have plenty of empty canvas above it.
>
> Lore, for character rather than literal detail: Crosses two hundred metres of open mud in under a minute and has never once been seen to walk.
>
> It does not evolve and has no relatives, so it stands alone — give it a strong, distinctive identity.
>
> Suggested palette, which you can refine: #8a7a52, #5c5034, #b8a878, #6a8a4a, #2a2418.
>
> Give me the FRONT view (facing left) and the BACK view (from behind, facing
> away to the right) as two separate 128 × 128 PNGs with transparent
> backgrounds and hard pixel edges.

---

### Brinewisp  `brinewisp`

| | |
|---|---|
| **Type** | tide (water -- fins, wet hide, foam, sea life) and spirit (the ethereal -- soft light, drifting veils) |
| **Size** | 1 m, 2.2 kg — MID band, draw it **85-100 px tall** in the 128 canvas |
| **Known as** | the Channel Light |
| **Lives in** | brackwater channel |
| **Facing** | front faces **LEFT**; back faces **away to the RIGHT** |

**Prompt to paste:**

> Next creature: **Brinewisp**, the Channel Light.
>
> drifting hooded light with a trailing brine veil.
>
> Its element is tide and spirit, so it should read visually as water -- fins, wet hide, foam, sea life, combined with the ethereal -- soft light, drifting veils.
>
> It is 1 m tall and weighs 2.2 kg. Draw it **85-100 px tall** inside the
> 128 × 128 canvas, so its size on screen is honest next to the others.
>
> Lore, for character rather than literal detail: Appears over the channel on flat nights. Brackwater lost eleven boats to them in one generation and then stopped following them.
>
> It does not evolve and has no relatives, so it stands alone — give it a strong, distinctive identity.
>
> Suggested palette, which you can refine: #7fd0d8, #3f8090, #c8f4f8, #a8e8b0, #1c3840.
>
> Give me the FRONT view (facing left) and the BACK view (from behind, facing
> away to the right) as two separate 128 × 128 PNGs with transparent
> backgrounds and hard pixel edges.

---

### Anchorling  `anchorling`

| | |
|---|---|
| **Type** | iron (worked metal -- rivets, plate, rust) and tide (water -- fins, wet hide, foam, sea life) |
| **Size** | 1.1 m, 148 kg — LARGE band, draw it **100-115 px tall** in the 128 canvas |
| **Known as** | the Lost Weight |
| **Lives in** | brackwater channel |
| **Facing** | front faces **LEFT**; back faces **away to the RIGHT** |

**Prompt to paste:**

> Next creature: **Anchorling**, the Lost Weight.
>
> iron anchor form with barnacled flukes and a single eye.
>
> Its element is iron and tide, so it should read visually as worked metal -- rivets, plate, rust, combined with water -- fins, wet hide, foam, sea life.
>
> It is 1.1 m tall and weighs 148 kg. Draw it **100-115 px tall** inside the
> 128 × 128 canvas, so its size on screen is honest next to the others.
>
> Lore, for character rather than literal detail: Every one of them is shaped like a working anchor. Brackwater has never lost an anchor it could not account for.
>
> It does not evolve and has no relatives, so it stands alone — give it a strong, distinctive identity.
>
> Suggested palette, which you can refine: #7f8a94, #4e5860, #b4c0cc, #5a7a58, #20272e.
>
> Give me the FRONT view (facing left) and the BACK view (from behind, facing
> away to the right) as two separate 128 × 128 PNGs with transparent
> backgrounds and hard pixel edges.

---
