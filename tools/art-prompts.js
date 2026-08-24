#!/usr/bin/env node
// Builds docs/ART-PROMPTS.md: one image-generation prompt per species, written
// from the game's own data so the art and the game cannot drift apart.
//
//   node tools/art-prompts.js

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const species = JSON.parse(readFileSync(join(ROOT, 'data/creatures/species.json'), 'utf8'));

const byId = new Map(species.map((s) => [s.id, s]));

// Evolution links run one way in the data, so walk them once to get the
// reverse edge too -- a prompt needs to say what a creature came FROM as well
// as what it becomes, or the middle of a three-stage line loses its family.
const from = new Map();
for (const s of species) {
  for (const e of s.evolutions ?? []) from.set(e.to, { id: s.id, method: e.method });
}

function chainOf(s) {
  let head = s;
  const guard = new Set();
  while (from.has(head.id) && !guard.has(head.id)) { guard.add(head.id); head = byId.get(from.get(head.id).id); }
  const out = [];
  let cur = head;
  const seen = new Set();
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    out.push(cur);
    const next = (cur.evolutions ?? [])[0];
    cur = next ? byId.get(next.to) : null;
  }
  return out;
}

function methodText(m) {
  if (!m) return '';
  if (m.kind === 'level') return `at level ${m.level}`;
  if (m.kind === 'item') return `with ${String(m.item).replace(/_/g, ' ')}`;
  if (m.kind === 'friendship') return 'through friendship';
  return m.kind ? `by ${m.kind}` : '';
}

const SIZE_BANDS = [
  [0.35, 'TINY', '50-65 px tall'],
  [0.6, 'SMALL', '65-85 px tall'],
  [1.0, 'MID', '85-100 px tall'],
  [1.6, 'LARGE', '100-115 px tall'],
  [Infinity, 'HUGE', '115-126 px tall'],
];
const bandOf = (h) => SIZE_BANDS.find(([lim]) => h <= lim);

// The game's own type names are not all self-explanatory to someone drawing
// from the outside, so each one carries the visual cue it should read as.
const TYPE_LOOK = {
  verdant: 'plant life -- leaves, moss, bark, seeds',
  flame: 'fire and heat -- embers, scorch, glowing cracks',
  tide: 'water -- fins, wet hide, foam, sea life',
  gale: 'wind and sky -- feathers, streamlined shapes',
  stone: 'rock and earth -- slabs, grit, mineral seams',
  spark: 'electricity -- filaments, arcs, static',
  frost: 'ice and cold -- rime, icicles, pale breath',
  venom: 'toxins -- chitin, spines, warning colours',
  spirit: 'the ethereal -- soft light, drifting veils',
  beast: 'plain animal -- fur, hooves, honest anatomy',
  iron: 'worked metal -- rivets, plate, rust',
  umbral: 'shadow -- deep tones, low light',
  psyche: 'the psychic -- smooth forms, odd symmetry',
};

const PREAMBLE = `# Art prompts for KinBound

Generated from the game's own creature data by \`node tools/art-prompts.js\`.
If a creature's design changes in \`data/creatures/species.json\`, re-run it.

---

## How to use this

**Step 1.** Start a new ChatGPT conversation and paste the block below marked
**THE BRIEF**. It sets the technical rules once.

**Step 2.** Paste one creature block at a time. Each is self-contained enough to
work on its own, but the brief makes the results far more consistent.

**Step 3.** Save what comes back as \`<id>-front.png\` and \`<id>-back.png\` into
\`assets/kin/\`, then run \`npm run kin:check\`.

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

`;

function blockFor(s) {
  const chain = chainOf(s);
  const [, band, px] = bandOf(s.height);
  const idx = chain.findIndex((c) => c.id === s.id);
  const pal = (s.design?.palette ?? []).join(', ');
  const types = s.types.map((t) => `${t} (${TYPE_LOOK[t] ?? t})`).join(' and ');

  let family = '';
  if (chain.length > 1) {
    const names = chain.map((c, i) => (i === idx ? `**${c.name}**` : c.name)).join(' → ');
    const parts = [`It is stage ${idx + 1} of ${chain.length} in a family: ${names}.`];
    const prev = from.get(s.id);
    if (prev) {
      parts.push(`It evolves FROM ${byId.get(prev.id).name} ${methodText(prev.method)}, so it should look like the same animal grown up — keep a shared silhouette signature and a related palette, but change the proportions and add complexity.`);
    }
    const next = (s.evolutions ?? [])[0];
    if (next) {
      parts.push(`It evolves INTO ${byId.get(next.to).name} ${methodText(next.method)}${prev ? '' : ', so leave room for it to grow — this stage should read as younger and simpler'}.`);
    }
    family = parts.join(' ');
  } else {
    family = 'It does not evolve and has no relatives, so it stands alone — give it a strong, distinctive identity.';
  }

  return `### ${s.name}  \`${s.id}\`

| | |
|---|---|
| **Type** | ${types} |
| **Size** | ${s.height} m, ${s.weight} kg — ${band} band, draw it **${px}** in the 128 canvas |
| **Known as** | ${s.category} |
| **Lives in** | ${s.habitat} |
| **Facing** | front faces **LEFT**; back faces **away to the RIGHT** |

**Prompt to paste:**

> Next creature: **${s.name}**, ${s.category}.
>
> ${s.design?.silhouette ?? ''}.
>
> Its element is ${s.types.join(' and ')}, so it should read visually as ${s.types.map((t) => TYPE_LOOK[t] ?? t).join(', combined with ')}.
>
> It is ${s.height} m tall and weighs ${s.weight} kg. Draw it **${px}** inside the
> 128 × 128 canvas, so its size on screen is honest next to the others${band === 'TINY' ? ' — this one is small and should have plenty of empty canvas above it' : band === 'HUGE' ? ' — this one is large and should nearly fill the canvas' : ''}.
>
> Lore, for character rather than literal detail: ${s.vellumEntry}
>
> ${family}
>
> ${pal ? `Suggested palette, which you can refine: ${pal}.` : ''}
>
> Give me the FRONT view (facing left) and the BACK view (from behind, facing
> away to the right) as two separate 128 × 128 PNGs with transparent
> backgrounds and hard pixel edges.

---
`;
}

const order = [...species].sort((a, b) => a.num - b.num);
const out = PREAMBLE + order.map(blockFor).join('\n');

const dest = join(ROOT, 'docs/ART-PROMPTS.md');
mkdirSync(dirname(dest), { recursive: true });
writeFileSync(dest, out);
console.log(`art-prompts: ${order.length} species -> ${relative(ROOT, dest)} (${(out.length / 1024).toFixed(0)} KB)`);
