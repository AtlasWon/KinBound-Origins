> **SUPERSEDED.** This is the pre-Caelora design draft, kept for reference only.
> [CANON.md](CANON.md) is the authority on names, people, places and story beats;
> where the two disagree, CANON wins. The names in here were swept by the Caelora
> rename, but the structure behind them was not, and much of it is now wrong.

# KINBOUND — Amber Version
## Design Bible v1

A full-scale monster-catching RPG in the spirit of the 2002–2004 handheld era. Original world,
original creatures, original story, original music. Reference games were studied for *systems and
pacing only*.

---

# 1. PITCH

> Every seventy years the currents of the Caeloran Sea reverse, and the whole of Caelora moves.
> Herds swim, flocks turn, whole species walk to the other side of the world. They call it
> **the Turning**, and it has drowned three cities in living memory.
>
> A guild of engineers has decided it will never happen again. They are not cruel. They are not
> wrong about the drowning. They are simply about to kill the region to save it.

The player is a newcomer to Caelora who is handed their first companion, walks the whole crescent
of the region, earns eight Seals, and ends up the only person standing between the Stillwater
Concord and the machinery that holds the sea still.

---

# 2. NOMENCLATURE (original terms)

| Concept | This game's term |
|---|---|
| The creatures | **kin** (a kin, wild kin, your kin) |
| Creature encyclopedia | **the Vellum** |
| Capture device | **Vessel** (Field / Fine / Deep / Warden Vessel) |
| Healing facility | **Waystation** |
| Shop | **Provisioner** |
| Currency | **marks** (M) |
| Gym | **Bastion** |
| Gym leader | **Keeper** |
| Badge | **Seal** |
| HM-style traversal | **Field Art** |
| Elite Four | **the Standing Four** |
| Final venue | **the Spire** |
| Storage system | **the Roost** (clinic terminal) |
| Villains | **the Stillwater Concord** |
| Legendary creatures | **the Wardens** |

---

# 3. REGION: CAELORA

A crescent landmass curled around a vast inland sea (**the Caeloran Sea**), open to the ocean at one
southeastern strait. Cold pine highlands in the north-west, temperate farmland and quarry country
in the west, a hot volcanic spine in the south, marsh and delta in the south-east, and a
storm-battered cliff coast running back up the east. The Caeloran Sea itself holds islands the player
cannot reach until late.

**Travel shape:** the player walks the crescent clockwise — west highlands, then south coast, then
east cliffs, then north peaks — and only then goes *inward*, onto and under the Caeloran Sea, for the
climax. The inner sea is visible from almost everywhere, all game, and is unreachable until Act 4.
That is the region's single biggest "look at what you cannot have yet" hook.

## 3.1 Settlements (14)

| # | Place | Role | Bastion |
|---|---|---|---|
| 1 | **Hearthmere** | Home village. Highland, six buildings, a well. | — |
| 2 | **Ashgate** | First real town. First Waystation + Provisioner. | — |
| 3 | **Kellowmere** | Quarry town on a cold lake. | **1 — Stone** |
| 4 | **Tanners Rest** | Trade crossroads, big Provisioner, cycle shop. | — |
| 5 | **Brackwater** | Fishing port, tidal flats, docks. | **2 — Tide** |
| 6 | **Cinderfall** | Industrial city on a caldera slope. Concord factory. | **3 — Spark** |
| 7 | **Hallowfen** | Stilt-houses over a poison marsh. | **4 — Venom** |
| 8 | **Vantry** | Regional capital and harbour. Concord public HQ. | **5 — Brawl** |
| 9 | **Kite Landing** | Cliff town of glider-riders. | **6 — Gale** |
| 10 | **Solmere** | Terraced island town, mirrors and light-wells. | **7 — Radiant** |
| 11 | **Gravehold** | A city built inside its own necropolis. | **8 — Spirit** |
| 12 | **Northwatch** | Last supplies before the peaks. | — |
| 13 | **The Spire** | Standing Four + Champion. | — |
| 14 | **Tidefall** | Postgame island settlement. | — |

## 3.2 Routes (26) and wild areas

Routes 1–26 following the clockwise crescent, plus named wild areas:
**Thistlemoor Wood**, **Kettle Caves**, **Quarry Descent**, **Sablewash Beach**, **Cinderfall
Undermine**, **Drownmarsh Deep**, **The Sunken Span**, **Skyreach Stair**, **Gravehold Ossuary**,
**Northwatch Pass** (victory-road analogue), **The Anchorage** (Act 4 mega-dungeon beneath the
Caeloran Sea), and postgame **The Drowned Choir**.

## 3.3 Region design rules (enforced during map authoring)

1. Every dead end contains an item, a hidden item, an NPC with real information, a rare encounter
   patch, or a *view* of future content. Never nothing.
2. Every route has at least two distinct terrain types and one traversal obstacle.
3. Every route has a one-way shortcut (ledge/drop) that pays off on the return trip.
4. Every hard gate is visible at least one full route before the player can open it.
5. Each Field Art retroactively opens 3–8 previously-seen places.
6. No route is a straight corridor. Minimum one meaningful branch per route.

---

# 4. FIELD ARTS (traversal gating)

| Art | Granted after | Opens |
|---|---|---|
| **Clear** | Bastion 1 | cut through bramble walls |
| **Shoulder** | Bastion 2 | push heavy stones |
| **Kindle** | Bastion 3 | light dark caves |
| **Wade** | Bastion 4 | cross shallow marsh water |
| **Swim** | Bastion 5 | traverse deep water |
| **Updraft** | Bastion 6 | ride thermals up cliff faces |
| **Delve** | Bastion 7 | dive beneath the Caeloran Sea |
| **Recall** | Bastion 8 | fast-travel to visited Waystations |

---

# 5. TYPE SYSTEM (17 types)

**Beast, Flame, Tide, Verdant, Spark, Frost, Brawl, Venom, Terra, Gale, Psyche, Chitin, Stone,
Spirit, Iron, Umbral, Radiant.**

The matrix is authored fresh in `data/region/types.json`. Design targets: every type has
2–4 offensive advantages and 2–4 defensive weaknesses; no type is strictly dominant; a small number
of true immunities exist so that immunity stays memorable rather than routine.

---

# 6. STORY

## Act 1 — Hearthmere (levels 5–18)

The player's family moves to Hearthmere. **Doctor Halcyon Sorrell**, a field naturalist who studies
migration rather than combat, gives the player a starter and a blank Vellum, and asks — not orders —
for help filling it. **Rival: Tarin Ashe**, the child of Hallowfen's Keeper; talented, competitive,
generous, and quietly terrified of being only ever "the Keeper's kid."

Beats: starter choice, first catch, Thistlemoor Wood, Ashgate, Kellowmere, Bastion 1.

## Act 2 — The Long Coast (levels 18–34)

The crescent opens up. Concord surveyors appear on routes taking measurements and are polite,
helpful, and slightly evasive. They fund the Cinderfall Bastion. They pay for a Waystation roof.
Kin Halls 2–4. First excavation site. First Warden rumours. Tarin beats the player at least once.

## Act 3 — Stillwater (levels 34–42)

Reveal: the Concord is building **the Stillwater Array**, a ring of anchors intended to lock the
Caeloran Sea currents permanently. **Director Isolde Kerrow** lost Old Tidefall — and her brother —
in the last Turning. She is warm, reasonable, and utterly immovable. The player watches the first
anchor fire; the sea goes glassy; weather across three routes changes permanently.
Kin Halls 5–6. Ecosystem damage becomes visible on routes the player already walked.

## Act 4 — The Anchorage (levels 42–50)

The Array wakes **Vauros**, the Deep Warden, in pain. Storms shred the east coast. The player
descends into the Anchorage with Tarin and Sorrell, fights through Concord engineers who are
*evacuating civilians while they work*, and reaches Kerrow at the core. The final question is not
whether to stop her — it is whether to break the Array or **re-tune** it. Vauros is faceable here.

Payoff: Kerrow is not defeated by argument. She is defeated by being shown a working alternative.

## Act 5 — The Spire (levels 50–62)

Kin Halls 7–8, Northwatch Pass, the Standing Four, the Champion, credits.

## Postgame

Tidefall reconstruction, the Drowned Choir, Warden hunts, rematch circuit, a Champion-tier
sequence, and the second Turning event.

## Level curve (authored to match the measured reference pacing)

```
B1 15 | B2 18 | B3 23 | B4 28 | B5 31 | B6 34 | [Act 4 crisis 34->42] | B7 42 | B8 44
Standing Four 47 / 50 / 53 / 56 | Champion 58-62
```

---

# 7. CREATURE ROSTER PLAN

Target **186 obtainable kin** plus 8 Wardens = **194 entries**.

- 3 starter families (3 stages each) = 9
- 4 early-route families (rodent / bird / bug / forager) = 11
- 38 mid families spanning 2–3 stages = ~92
- 30 single-stage specialists = 30
- 6 fossil-revival kin = 6
- 1 pseudo-legendary line (3 stages) = 3
- Regional myth kin, trade-substitute evolutions, time and location evolutions = remainder
- 8 Wardens (3 major, 5 lesser)

Every family gets a **role identity** first (wall / sweeper / pivot / trapper / support) and stats
second, so that no two families sharing a typing feel the same.

---

# 8. TECHNICAL DIRECTION

- **Stack:** TypeScript, HTML5 Canvas 2D, zero runtime dependencies. `tsc` for types, `esbuild`
  for the release bundle, `node:test` for unit tests.
- **Render:** fixed internal buffer **480x320** (2x the 240x160 reference field, giving a modern
  window without cheating the art scale), integer-scaled, `imageSmoothingEnabled = false`,
  camera snapped to integer pixels.
- **Simulation:** fixed 60Hz logic step decoupled from render.
- **Data-driven:** all creatures, moves, items, trainers, encounters, maps, dialogue and events
  live in `/data/**.json` and load at runtime. No content hardcoded in engine modules.
- **Events:** a scripted command VM (`data/events/*.json`) with conditions and actions, so story
  content never requires touching engine code.
