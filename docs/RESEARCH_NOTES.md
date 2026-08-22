# Research Notes — GBA-Era Monster RPG Design
> Internal development notes. Reference material studied to understand *why* the genre works.
> Nothing here is copied content: these are mechanical facts, measurements and design analysis
> used to build original equivalents.

## 1. Verified mechanical reference (Generation III)

### 1.1 Damage
```
base = ((2*Level/5 + 2) * Power * A / D) / 50
dmg  = (base * burn * screen * targets * weather + 2)
       * crit * STAB * type1 * type2 * rand(85..100)/100
```
All divisions truncate. Gen III criticals are **2x and ignore the defender's Defense boosts**
(later gens changed this). Random spread is 85–100 inclusive — a **15% damage band**, which is
the single most important source of "this roll matters" tension in the whole game.

**Why it works:** the `/50 + 2` shape means damage scales roughly linearly with level while the
`A/D` ratio stays the dominant term. A super-effective STAB hit is `1.5 * 2 = 3x`, which is almost
exactly "half the opponent's HP bar" at equal levels. That 3x number is what makes type knowledge
feel *powerful* rather than incremental.

### 1.2 Capture
```
a = ((3*HPmax - 2*HPcur) / (3*HPmax)) * catchRate * ballBonus * statusBonus
if a >= 255 -> guaranteed
b = 1048560 / sqrt(sqrt(16711680 / a))
4 independent checks, each passes if rand(0..65535) < b
```
Status: sleep/freeze `2.0x`, paralysis/poison/burn `1.5x`, none `1.0x`.
Base catch rates cluster at 255 / 190 / 120 / 45 / 3.

**Why it works:** HP term maxes at `3x` improvement (full HP -> 1 HP). Status adds another 2x.
So skilled play (chip to red, then sleep) is worth a **6x** swing. The four-shake structure
converts a single probability into a *dramatic beat* with three near-misses — the animation is
doing narrative work, not just reporting a coin flip.

### 1.3 Stats
```
HP    = floor((2*Base + IV + floor(EV/4)) * Level/100) + Level + 10
Other = floor(floor((2*Base + IV + floor(EV/4)) * Level/100) + 5) * NatureMod
```
IV 0–31, EV 0–255 per stat / 510 total, nature +-10%.

### 1.4 Experience
```
gain = (baseYield * defeatedLevel / 7) * trainerBonus(1.5) / participants
```
Growth curves (total EXP at L100): Erratic 600k, Fast 800k, MediumFast 1.0M (`n^3`),
MediumSlow 1,059,860 (`6n^3/5 - 15n^2 + 100n - 140`), Slow 1.25M (`5n^3/4`), Fluctuating 1.64M.

**Why it works:** EXP scales with the *defeated* level, so grinding on weak enemies decays
naturally and the player is always pulled forward into fresh content. Cubic curves mean early
levels come in a rush (the dopamine hook) and late levels demand real commitment.

## 2. Progression pacing (measured reference curve)

| Milestone | Ref. level | Delta |
|---|---|---|
| Badge 1 | 15 | — |
| Badge 2 | 18 | +3 |
| Badge 3 | 23 | +5 |
| Badge 4 | 28 | +5 |
| Badge 5 | 31 | +3 |
| Badge 6 | 33 | +2 |
| *(story crisis arc)* | — | — |
| Badge 7 | 42 | +9 |
| Badge 8 | 43 | +1 |
| Elite 1–4 | 46 -> 55 | +3..+9 |
| Champion | 55–58 | +3 |

**The critical read:** the +9 jump between badge 6 and badge 7 is *not* a difficulty spike, it is
where the main story crisis lives. The player spends that gap doing the villain-arc dungeon and
legendary encounter, and emerges having levelled naturally. Badges 7 and 8 are only 1 level apart
because they are geographically adjacent endgame content. **A well-paced region hides its level
gaps inside story, never inside grinding.**

## 3. The moment-to-moment loop (what keeps it entertaining)

Answers to the ten study questions, per "route traversal" — the single most repeated activity:

1. **Doing:** walking a branching path, choosing to enter or dodge tall grass, engaging or avoiding
   line-of-sight trainers, picking up visible items, probing for hidden ones.
2. **Information available:** party HP/levels, terrain type underfoot, trainer sight-lines, visible
   item balls, exits. Deliberately *not* available: encounter tables, hidden item positions,
   enemy movesets. The information gap is the content.
3. **Decisions:** push on or heal; spend a capture vessel now or save it; grind this patch or move;
   which of six creatures leads; take the ledge shortcut (one-way) or keep exploring.
4. **Systems interacting:** encounter RNG, party state, inventory scarcity, type matchups,
   traversal gating, money economy, EXP curve.
5. **Why it stays fun:** *variable-ratio reward* (encounter tables) layered on *deterministic
   progress* (the route ends somewhere new). Randomness supplies texture; the map supplies purpose.
   Either alone gets boring within minutes.
6. **Battle frequency:** roughly one wild encounter every 5–12 steps in grass, and 4–12 trainers
   per route. A battle roughly every 20–40 seconds of route time.
7. **Curiosity reward:** every dead end holds something — item, hidden item, NPC gift, rare
   encounter patch, or a view of a place you cannot reach yet. **A dead end that is truly empty is
   a bug.**
8. **Difficulty growth:** enemy levels rise ~2–4 per route; enemy team *size* rises; movesets gain
   status and coverage moves; boss AI tiers up.
9. **Early-progress prevention:** soft gates (level walls, one-way ledges) and hard gates
   (traversal abilities, story flags, locked doors). Hard gates are always *visible* long before
   they open — that is what creates the mental to-do list.
10. **Re-opening the world:** each traversal art (cut/surf/climb equivalents) retroactively unlocks
    3–8 places you already walked past. The world appears to double in size without new map data.

## 4. GBA presentation constraints (adopted as art direction)

- Native resolution **240x160**, 8x8 background tiles, sprites up to 64x64, 4bpp = **15 colours +
  transparency** per palette, 16 sprite palettes / 16 background palettes.
- Adopted rules for this project: creature battle sprites **64x64**, back sprites **64x64**,
  party icons **32x32**, overworld characters **16x32** on a **16x16** tile grid, UI on an 8px
  grid, hard 1px outlines, no anti-aliasing, no gradients wider than 4 steps.
- Rendering: internal buffer at a fixed low resolution, integer-scaled to the window, camera
  positions snapped to whole pixels. **No subpixel sprite placement, ever.**

## 5. PC-native improvements over the reference era
Things the original hardware could not do that we should:
- Mouse: hover states, click-to-select in every menu and list; never *required*.
- Full remapping, gamepad support, run-by-default option.
- Battle speed setting + optional animation skip; text speed including "instant".
- Autosave alongside manual multi-slot saves.
- Time-of-day from the system clock.
- Removal of hardware-era dead time (menu open latency, forced scroll delays).

## Sources
- https://bulbapedia.bulbagarden.net/wiki/Damage
- https://bulbapedia.bulbagarden.net/wiki/Catch_rate
- https://bulbapedia.bulbagarden.net/wiki/Experience
- https://pokemondb.net/ruby-sapphire/gymleaders-elitefour
- https://gbadev.net/gbadoc/sprites.html
- https://www.copetti.org/writings/consoles/game-boy/
