# Tarin

The rival system: what he is, where the pieces live, and how a later stage adds
to him without touching any code.

Canon for the character is `docs/CANON.md`. This file is the implementation.

---

## The idea

Tarin is not a boss you fight every few towns. He is a sixteen-year-old doing
the same thing the player is doing, at the same time, mostly **off screen**.

CANON asks for him every one or two settlements, and — more importantly — for
the player to keep hearing about him in between: he beat a Hallkeeper this
morning, he helped somebody fix something, he caught something rare, he lost
badly, he caused trouble. Sometimes he has the Crest before you; sometimes he
complains you got there first.

That is a *system*, not a set of lines. Writing it as lines means every new town
has to remember to mention him, and the day somebody forgets, he stops existing.

---

## The three pieces

| Piece | Where | What it is |
|---|---|---|
| **The ledger** | `src/systems/tarin.ts` | An ordered table of beats: where he is, how many Crests he holds. The only file a later stage has to change. |
| **The projection** | `src/systems/state.ts` | Re-derives the current beat on every flag, Crest and map visit, and publishes it as read-only flags and a text token. |
| **The words** | `data/dialogue/common.json`, `data/events/common.json` | Four gossip voices and one town script, all branching on those flags. |

### The ledger

```ts
{
  id: 'briarbell',                 // stable; publishes as tarin_at_briarbell
  opens: { visited: 'briarbell' }, // the PLAYER's progress that puts him here
  crests: 1,                       // Bond Crests he holds during this beat
  where: 'Briarbell',              // for {tarin_where}
  doing: '...',                    // author's note; what the voices describe
}
```

A beat opens on the player's progress: a flag, a map they have set foot on, or a
Crest they hold. The **last** beat whose condition holds is the one he is living
in — last rather than first, so a beat that can never fire (a map a later stage
has not built yet) is stepped over instead of stranding him there forever.

### What it publishes

| Flag | Meaning |
|---|---|
| `tarin_at_<beat>` | the beat he is in. Exactly one is ever set. |
| `tarin_holds_1` … `_8` | a Bond Crest he has earned |
| `tarin_ahead` | he holds more Crests than the player |
| `tarin_even` | the same number |
| `tarin_behind` | fewer |
| `{tarin_where}` | text token: where he was last heard of |

Flags, deliberately. Every content mechanism in this engine already reads flags
— dialogue variants (`ifFlags`), event conditions, NPC `requiresFlag` and
`hiddenIfFlag`, shop stock — so the whole world can react to Tarin with **no new
engine support at all**. A townsperson becomes a source of news about him by
pointing at a dialogue entry. That is the entire integration cost.

They are **derived**. Nothing writes them, they are never serialised, and
`GameState.fromJSON` recomputes them from the flags and Crests the save actually
carries. So they cannot drift out of step with a save, they cost nothing to
store, there is no `SAVE_VERSION` bump, and a save written during Stage 1 picks
up Stage 4's ledger the first time it is loaded.

**Ahead / behind is not authored.** The ledger only says how many Crests he
holds; whether that puts him in front falls out of the comparison with the
player's own. A player who dawdles finds him ahead of them in places no script
planned for, and a player who sprints leaves him behind — which is the point. He
is running his own race, not waiting for you.

---

## Adding him to a settlement (a later stage)

Three edits. No code, no new scene, no save change.

1. **Append a row to `TARIN_LEDGER`** in `src/systems/tarin.ts`, in story order.
   Stable id, what opens it, how many Crests he holds, where he is.

2. **Add one variant to the top of each voice** in `data/dialogue/common.json` —
   `tarin_word_street`, `tarin_word_hall`, `tarin_word_clinic`,
   `tarin_word_shop` — gated on `"ifFlags": ["tarin_at_<your id>"]`. **Top**,
   because the registry takes the first variant that matches. Every voice ends
   with an ungated variant, so an NPC pointed at one always has something to say.

   Then point NPCs at them: `"script": "tarin_word_street"` on a townsperson,
   `"tarin_word_hall"` on a Hall attendant, and so on. Four voices rather than
   one so a town does not repeat itself back at you.

3. **If he appears in person**, add a branch to the `tarin_town` script in
   `data/events/common.json` (it is one `if` ladder on `tarin_at_*`), and put an
   NPC on the map:

   ```json
   { "id": "town_tarin", "sprite": "rival", "x": 0, "y": 0, "facing": "down",
     "movement": { "kind": "static" }, "script": "tarin_town",
     "requiresFlag": "<the flag that opens your beat>",
     "hiddenIfFlag": "tarin_<yourtown>_done" }
   ```

   The id **must** be `town_tarin` — the shared script removes him by that name.

Why the scenes live in `common.json` and not a per-map event file: it is loaded
on every map, so a Tarin scene cannot be lost when somebody else rewrites a town,
and his scenes are not scattered across eight files owned by eight people.

Why the **actor** is a map NPC and not a `spawnNpc`: `overworld.loadMap` starts
the *first* enter script that matches a map and then stops, so an enter-script
spawn silently loses to whatever else claimed that map — Route 1 already has a
Tideheart script, and the first pass of the Route 1 meeting played out with an
invisible Tarin because of exactly this. `requiresFlag` and `hiddenIfFlag` bring
him and take him away with no script involved, which is also how he vanishes
between sessions. The one exception is the Hearthmere starter battle, which
spawns him because the map NPC has already been removed by the scene before it.

---

## Stage 1: the four appearances

| # | Where | Beat | Battle |
|---|---|---|---|
| 1 | Hearthmere, outside the lab | the starter fight | yes |
| 2 | Route 1, the last rise | they walk the last mile together; he goes quiet about his mother | no |
| 3 | Briarbell | he already has the first Crest — **ahead** | no |
| 4 | Stonewake | he has been poking at Meridian instead of the Hall | yes |

Not every appearance is a fight, on purpose. Three fights in Act 1 would make
him a boss again.

The Stage 1 ledger runs `dawn → road → north → briarbell → ruinwood → stonewake
→ quarry`. He is level with the player on the road, **ahead** at Briarbell (he
took the first Crest the morning the player walked in and the town is still
talking about it), and dithering at **Stonewake** because he spent the week
getting thrown out of the Meridian office instead of fighting the Hallkeeper.
Sometimes he wins the race; sometimes he loses it to his own worst habit. Neither
is a scripted humiliation, and he is never cruel and never betrays the player.

---

## The starter relationship, and the numbers

**Tarin takes the starter the player's own beats.** Sprigling → he takes
Rilltail; Cinderpaw → Sprigling; Rilltail → Cinderpaw. The player holds the type
advantage in the first fight.

This is the opposite of what shipped, and it was decided by measurement, not
taste. Sorrell hands out a level six starter. Measured with one kin, no items,
novice play, 300+ runs per cell:

**If the rival holds the advantage** (what shipped):

| Rival level | Player win rate (sprigling / cinderpaw / rilltail) |
|---|---|
| 6, same as the player | 0–29% |
| 5 | 8–13% |
| 4 | 98 / 64 / 100% |
| 3, flat-zero IVs (what shipped) | 100 / 98 / 100% |

There is no fair setting. A super-effective STAB move at this level two-shots,
so the fight is either a mugging or — once you handicap the rival enough to fix
that — a walkover that the player cannot lose and therefore cannot feel. The
shipped version was tuned to 97–100%, which is not a fight.

**If the player holds the advantage** (what is there now), with Tarin one level
up because he has been out on the road since before dawn picking fights:

| Tarin's level | Player win rate | HP the winner keeps | Turns |
|---|---|---|---|
| 6 | 97–100% | 54–73% | 2.3–4.3 |
| **7** | **99 / 91 / 82%** | **60 / 55 / 40%** | **2.5–4.5** |
| 8 | 32–92% | 32–54% | 2.6–5.1 |

Level 7 is the answer. The player wins, but they finish visibly hurt — and the
surviving HP matters as much as the win rate, because the scene straight after
this one has the player's mother put the party back together. On a 100% win at
full health that scene is a lie.

Reproduce with `simulate.mjs`'s `rate(starter, 6, id, 300, 'novice')`. Pin the
level to **six**: the fight happens the minute the player walks out of the lab,
and the harness's own progression table samples the Hearthmere stage at its
midpoint (level 7) instead.

### Stonewake

Ace 16 — his starter, evolved — with two plain **beast** kin at 13 and 14.

The bench is beast on purpose. Every elemental bench that was tried pulled the
three branches apart: a Slatewing (stone/gale) on its own dropped a Verdant
player from 93% to nothing, because gale halves verdant while his ace is still
weak to it. Beast is neutral to all three starters, so the only type relationship
left in the fight is the one that belongs there — his ace loses to yours.

| Player level | Win rate (sprigling / cinderpaw / rilltail) |
|---|---|
| 14 | 11 / 12 / 94% |
| 15 | 53 / 49 / 100% |
| 16+ | 99 / 97 / 100% |

The cliff at 16 is the starter evolving, not the tuning: arriving at Stonewake
underlevelled is meant to be a real fight, arriving on the curve is a win that
still costs a kin. **If Stonewake lands earlier or later on the level curve than
assumed, move all three party levels together** — that is the only lever, and it
keeps the three branches balanced.

The Rilltail column runs high throughout because Rilltail learns Undertow (65
power, STAB) at level 10 while the other two are still on 40-power moves. That is
a starter imbalance, not a rival one, and it is not fixed here.

### Trainer ids

`tarin_first_<species>` and `tarin_stonewake_<species>` are keyed by **the
species Tarin leads with**, never by the player's. The old `tarin_km_*` ids were
keyed by the player's and it was a trap; they are gone. His later teams should
follow the same convention, and the id names the starter he was *given*, not the
form he brings — a level 16 `tarin_stonewake_sprigling` fields a Bramblehusk.

---

## Files

```
src/systems/tarin.ts             the ledger, and the doc comment that repeats all of this
src/systems/state.ts             syncTarin(); derived flags; the {tarin_where} token
data/events/common.json          tarin_route1 (step, route_1) and tarin_town (interact)
data/events/hearthmere.json      hm_tarin_meet and hm_tarin_first -- the starter battle
data/events/kellowmere.json      km_tarin, a wrapper that calls tarin_town
data/dialogue/common.json        tarin_word_street / _hall / _clinic / _shop, and hm_ollet
data/trainers/trainers.json      tarin_first_* and tarin_stonewake_*, with the numbers
data/maps/hearthmere.json        the hm_tarin actor
data/maps/route_1.json           the route_tarin actor
tests/helpers/simulate.mjs       the RIVAL table that maps a starter to his id
tools/shots/tarinarc.js          drives all three Stage 1 beats and prints the ledger
```

`tools/shots/tarinarc.js` is the smoke test. It boots, plays the starter battle,
the Route 1 meeting and a town check-in, and prints the ledger flags at every
step, so a change to any of the pieces above can be checked by looking:

```
node tools/serve.js                                  # if nothing is on 5173
npx electron tools/capture.cjs tools/shots/tarinarc.js
```

Shots land in `build/shots/tarin-*`. Edit `STARTER` at the top of the driver to
walk the other two branches.

---

## Stage 5: Act 5, the storm

Seven beats, three of them in person, one battle. The Crest column finishes —
canon puts him at seven or eight by Crownspire — but the interesting thing is
not that it rises, it is where it **stalls**.

| # | Beat | Opens on | Crests | In person? |
|---|---|---|---|---|
| 1 | `snowroad` | `route_8` / `route_9` / `route_8_pass` visited | 5 | no |
| 2 | `frostmere` | `frostmere` or `frostmere_hall` visited | 6 — **ahead** | yes, **battle** |
| 3 | `observatory` | `act5_elias_message` (the dome's own flag) | 6 | yes, no jokes |
| 4 | `skyreach` | `skyreach` or `skyreach_hall` visited | 6 — **behind** | no |
| 5 | `windward` | Crest 7 | 7 | no |
| 6 | `crownspire` | `crownspire` or `crownspire_hall` visited | 7 | yes, short |
| 7 | `summit_pact` | Crest 8 | 8 | yes, the agreement |

Two of those three in-person scenes need an actor somebody else has to place;
the third already has one. **Frostmere has no Tarin on it** — the battle is
unreachable until a `town_tarin` is stood on the apron. The **Observatory**
wrote its own `fo_tarin` in the dome, which is a better scene than a shared
branch for that room, so the `tarin_at_observatory` branch of `tarin_town` is
the fallback for anywhere else the beat is still open — do not put a second
actor in the dome. **Crownspire** already stands a `cs_tarin`, and
`data/events/common.json` carries a `cs_tarin` wrapper that feeds it, in the
`r3_tarin` pattern.

He is **ahead** at Frostmere — he took the Frost Crest days before the player
walked in and then did not go anywhere — and **behind** at Skyreach, because he
lost three days on the dock bridges getting other people off them in the wind.
That stall is his whole arc stated in the one column the player can see: he
started wanting to be strong and he is now somebody who will drop the count to
hold a rope. No line of dialogue says it, and none should.

He holds six from Frostmere through the Observatory and out the far side of
Skyreach — three beats without the number moving, in the middle of the act where
it is meant to be moving fastest. That is the Act 2 trick used once more and for
the last time, pointed at the one scene in the game where the count is beneath
everybody.

### The Frostmere battle

Four kin, and the team is his whole journey rather than a power curve:

| | | |
|---|---|---|
| Bristlebuck | 32, flat-zero IVs, hand-written moves | the Tuftail from Route 1 |
| Tidewrack | 32, flat-zero IVs | the Shalefin he went down the Tideglass deep lane for |
| Voltwick | 33, flat-zero IVs, hand-written moves | the Fizzlet off the central road |
| his starter, second evolution | 36 | what Sorrell gave him |

**Optional, and `onLoss` is `continue`.** He asks; the player may say no; a loss
is a scene he offers to run again, not a whiteout. He also hands over two Great
Potions before the ask. Those three things together are the difficulty valve,
and they are why the fight can be tuned to "I had to try" instead of to a win
rate that has to be safe for everybody.

**The Act 1–2 all-Beast bench does not survive the second evolution.** Beast was
chosen because it is neutral to all three starters, so the only type
relationship left in the fight was the one that belongs there — his ace loses to
yours. At 34 the starters gain a second type, and Bristlebuck (beast/verdant)
becomes a wall for Thornmarch and Maelstrix while handing Volcatrix a free 2x.
Measured, the three branches came apart to **13 / 69 / 46%** — the Slatewing
failure this document already warns about, one act later.

Tidewrack is the corrective and it was chosen by measurement, not taste: tide/
stone is 4x open to a Verdant player, a quarter-damage wall to a Flame one and
level to a Tide one, which is the exact inverse of what Bristlebuck does. With
both on the field the branches close to within seven points at every level in
the band. Bristlebuck also carries a hand-written moveset for one reason — it
learns Recover at 30, and a self-healing wall in front of a novice player is a
stall, not a fight.

**Measured**, novice play, no items, matched party of four, 500 runs per cell
(sprigling / cinderpaw / rilltail):

| Player level | Win rate | HP the winner keeps | Kin still up |
|---|---|---|---|
| 36 | 68 / 71 / 81% | 39–43% | 1.9–2.1 of 4 |
| **37** | **83 / 85 / 90%** | **42–46%** | **2.1** |
| 38 | 90 / 91 / 94% | 51–58% | 2.5 |

Veteran play at 37: 88 / 95 / 98%. Lone starter at the solo-lead level: L44
88 / 81 / 73%, L46 98 / 88 / 89%. On the harness's own `CATCHABLE` bench —
which swaps in a Galecrest the moment the party passes 36 — the same fight reads
99 / 89 / 99% at L37; the table above uses a fixed, ordinary Act 3–4 bench
(Weaverjaw, Craglide, Currentail) because the harness's own bench puts a
74-point BST cliff in the middle of the band and makes the fight unreadable.

The difficulty lives in the second and third columns, not the first. A win costs
half the party.

```js
const m = await import('./tests/helpers/simulate.mjs');
m.matchedRate('sprigling', 37, 'tarin_frostmere_rilltail', 500, 'novice');
```

**The band is the assumption most likely to go stale.** The progression table in
`simulate.mjs` stops at Harrowgate, where the team-raiser leaves at 34; Aureline
and the north-west road are assumed to add about three, putting arrival at
Frostmere near 37. If the snow road lands heavier or lighter than that, **move
all four levels together** — that is the only lever, and it keeps the branches
level.

### Files added

```
src/systems/tarin.ts             seven Act 5 rows appended to TARIN_LEDGER
data/trainers/trainers.json      tarin_frostmere_sprigling / _cinderpaw / _rilltail
data/events/common.json          three branches in tarin_town, and the cs_tarin wrapper
tools/shots/tarinact5.js         drives the ledger and all three Act 5 scenes
```

`tools/shots/tarinact5.js` is the Act 5 smoke test. It walks the ledger beat by
beat, prints the flags and `{tarin_where}` at each, then plays the Frostmere
scene (including the battle), the Observatory and the agreement:

```
node tools/serve.js                                  # if nothing is on 5173
npx electron tools/capture.cjs tools/shots/tarinact5.js
```

Shots land in `build/shots/t5-*`. It stages the scenes through the event runner
on `tideglass_warehouse` rather than walking to them, because the three
settlements were still being built when it was written — none of the scenes
moves an actor, so none of them needs him standing there to run.
