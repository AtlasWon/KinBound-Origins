# Multiplayer — Investigation

> Investigation and plan, not an implementation. Nothing in this document has been built.
> Every claim about the codebase below was checked against the files, and the two screenshots
> referenced were captured from the running game (`tools/shots/mpscout.js`).

---

## What I would do first

**Build a LAN link battle, and do not touch the overworld.**

Add `LINK BATTLE` to the title screen, let one player host and one join by typing an IP, and
have the two of them fight with their own parties. No shared world, no shared story, no shared
save. Two evenings of play value, and it is the one piece of multiplayer this codebase is
already shaped for.

The reason is `src/battle/battle.ts:229`:

```ts
takeTurn(playerAction: BattleAction, foeAction: BattleAction): BattleEvent[]
```

That is a lockstep netcode turn already written. Both actions in, a deterministic event list
out, no rendering, no input, no globals. There is exactly one caller — `submit()` at
`src/scenes/battle.ts:1310` — so there is exactly one place to intercept. The engine's own
header comment says the point of the event split is "to let a replay be reconstructed from a
seed"; a link battle is a replay with two authors.

Everything the harder stages need — a transport, a version handshake, a way to serialise a
party, a desync check, a connection UI — gets built and proven here, on a feature that cannot
break single-player because it is a new scene on the stack.

**What I would not do first is story co-op.** It is achievable, it is a genuinely good idea,
and it is a three-to-four-month project on top of a two-to-three-week prerequisite refactor.
The section below on flags and cutscenes is why. Read that before deciding.

---

## 1. What "playing the story together" could mean

Three different projects wear the same words.

### Option A — One world, shared progress

Both players are in the same world file. Both story flags, both seal counts, both Vellums are
the same object. Whatever happens, happens to both of you.

**What it feels like.** Two people in one save. You beat the Kin Hall and *we* have the Bond Crest.
You can both be in different rooms of the same town. Genuinely, this is the fantasy.

**What it costs.** The thing nobody says out loud: two players cannot share one set of story
flags without merging them, and merging story flags is a class of bug you cannot test your way
out of. If `crest_2_taken` is set on one machine and not the other — because of a disconnect
mid-cutscene, a crash, a warp that raced a flag write — you get a world state no script in
`data/events/` was written for. There are 23 scripts today and there will be a hundred. The
symptoms are unreproducible and they arrive weeks later in someone's saved game.

You can avoid the merge by making one machine authoritative — but then it is Option C, and you
have not actually shared progress. **Option A as literally stated is a trap.** Do not build it.

### Option B — Two worlds that meet

Each player plays their own single-player game with their own save. They connect to trade kin
and to battle. Optionally, a "visit" mode where one walks around the other's world without
advancing anything.

**What it feels like.** The link cable. You each play your own game, and the multiplayer is a
thing you go and do — you meet at the Kin Clinic, you trade a Sprigling for a Cinderpaw, you
fight. It is not co-op and it does not pretend to be. It is also the multiplayer that this
genre actually ran on for twenty years, and people played it for thousands of hours.

**What it costs.** Small. It touches `Battle` (which is ready), the Roost box UI (which
exists, `src/scenes/roost.ts`), and nothing else in the game. Weeks, not months.

### Option C — Host-authoritative session

One player's world is *the* world. The other joins it as a guest with their own body, their own
party, their own bag, and their own Vellum, but the story belongs to the host's save file. When
the guest disconnects, they keep their creatures and lose the plot.

**What it feels like.** Stardew Valley's farmhand. You are meaningfully playing the game — you
catch things, you fight trainers, you walk into the Kin Hall beside your friend and you are
*there* for it — but it is their journey. If you want your own eight seals you have to host
your own world, and your friend joins yours.

**What it costs.** Large but bounded, and every individual problem has a defensible answer,
which is not true of Option A. The guest's progress question is the honest sore spot and it is
a design decision, not an engineering one.

### Recommendation

**Do B, then C. In that order, and treat the boundary between them as a real decision point.**

B is cheap, it is fun on its own, and it builds the entire transport and determinism stack that
C needs. When B ships, you will know from real use whether the connection story works, whether
people can actually get two machines talking, and whether you want to spend a quarter on C.

C is the answer to what was actually asked for. But there is a stage between them — walking
around together with no shared story at all, Stage 4 below — that delivers most of the *feeling*
of co-op for a fraction of C's cost. Play that for an evening before committing to C. There is
a real chance it is enough.

---

## 2. The hard problems, named against this code

### 2.1 `GameState` does not distinguish the world from the player

`src/systems/state.ts` is one class that is both. In one object:

| World-owned | Player-owned | Genuinely ambiguous |
|---|---|---|
| `flags`, `vars` | `party`, `boxes`, `boxNames` | `seals` — earned together or each? |
| `visited` | `inventory`, `money` | `arts` — traversal abilities gate the map |
| `defeatedTrainers` | `playerName`, `appearance` | `defeatedTrainers` — does a trainer P1 beat re-challenge P2? |
| | `currentMap/X/Y/Facing`, `respawn*` | `money` — one purse is warmer, two is fairer |
| | `seen`, `caught` (Vellum) | |

`arts` is the one that bites. Field arts gate traversal. If the host has the water art and the
guest does not, the host swims away and the guest is stranded on a beach with no way to follow
and no way to earn it. Either arts are world-owned (so the guest gets abilities they did not
earn, and keeps none of them) or you need a "follow the host across impassable terrain" verb
that does not exist today.

`defeatedTrainers` is the one that is quietly worst. It is a `Set<string>` consulted before a
trainer challenges. Shared, the guest walks past 32 trainers who ignore them and gets no
battles. Split, the host has to watch the same fight twice. Neither is right; the real answer is
probably "shared, but the guest can rematch", and that is a content decision affecting every
trainer in the game.

**Nothing about this is netcode.** It is a refactor of `state.ts` into a `WorldProgress` half
and a `PlayerFile` half, and it is worth doing on its own merits — New Game+, a second character
slot, and a "reset the story but keep the box" feature are all impossible until it exists.

### 2.2 Cutscenes stop the world, for one player

`OverworldScene.update` (`src/scenes/overworld.ts:383`):

```ts
if (this.events?.running) {
  this.events.update();
  this.updateCamera();
  return;          // <- no player movement, no NPC ticks, nothing
}
```

One `EventRunner`, owned by the overworld, and while it runs the entire update path returns
early. That is exactly right for one player and exactly wrong for two.

Worse, the VM's dialogue verbs (`say`, `ask`, `choice` in `src/scenes/eventHost.ts`) push a
`DialogueScene` onto the local scene stack. Two players cannot both be answering the same
YES/NO. One of them has to be the author of the scene.

Three ways out, in increasing cost:

1. **Freeze both.** The triggerer plays the scene; the other player's body locks and their
   screen shows a "waiting for AVEN" plate. Simple, honest, and occasionally annoying — a
   thirty-second scene with a five-line conversation is thirty seconds of a friend watching
   nothing. Ship this first.
2. **Local-only for small scripts.** Most of the 23 scripts in `data/events/` are one NPC
   saying three lines. Tag those as local: they run for the triggerer, the other player keeps
   walking, and the only replication needed is "this NPC turned to face someone".
3. **Replicated cutscenes.** The VM's actor commands (`moveActor`, `faceActor`, `spawnNpc`,
   `warp`, `fade`, `shake`) go over the wire so both players watch the same scene from their own
   camera, and only the dialogue box is local. This is the good version. It also means both
   players can be *in* the scene, which is what a story co-op eventually wants, and it means an
   NPC's scripted walk has to survive a peer joining halfway through it.

The opening is the acute case. `OpeningScene` is 2,307 lines of cinematic that `replaceAll`s
the whole stack (`src/scenes/opening.ts:2218` → `CreatorScene` → `src/scenes/creator.ts:405` →
`OverworldScene`). It is not a scene you can be *joined during*. A guest joining a host who has
not finished the opening is a case that needs a straight answer: the session does not open until
the host is in the world.

### 2.3 One player in a battle, the other is not

`BattleScene` sets neither `transparent` nor `passthrough` (`src/core/scene.ts` supports both;
grep the whole of `src/` and **nothing sets `passthrough` at all** — it is a field that has
never been used). So pushing a battle stops the local overworld dead. Fine for one player.

For two, the question is what the remote player sees where their friend is standing. The
answer that works is "a body standing still with a small marker over it", which is what Stardew
does and which needs no engine change. What does *not* work without a fight is having the other
player wander into grass and start their own battle while the first is still running — nothing
breaks, but you will get two battle scenes' worth of music competing, and `startBattle`
(`src/scenes/overworld.ts:628`) reorders the party in place before pushing the scene:

```ts
const lead = this.state.firstHealthyIndex();
if (lead > 0) { const [k] = this.state.party.splice(lead, 1); if (k) this.state.party.unshift(k); }
```

If parties are per-player that is harmless. If you ever share a party, that mutation is a race.

**Co-op battles — both players against one trainer — are not a netcode problem.** They are a
battle-engine rewrite. `SideId` is `'player' | 'foe'`, a two-value union threaded through every
one of the 27 `BattleEvent` variants. `BattleSide.active` is singular. `orderMoves` sorts an
array of exactly two. The battle scene is 2,858 lines drawing one panel per side. Adding a
third participant is 1–2 months and it destabilises the part of the game that currently works
best. See Stage 6.

### 2.4 A scene stack that assumes one local player

`SceneStack` is a single stack owned by `Game`, and every scene reads `game.input` directly —
one `InputManager`, one set of bindings. A scene *is* implicitly "the local player's scene".

This sounds fatal and is not, because of a happy accident: **networked co-op is easier here
than couch co-op.** Over the wire, each machine keeps its own stack, its own input, its own
camera, and the remote player exists only as data the overworld draws — a `RemotePlayer`
record fed into `OverworldScene` and read nowhere else. The stack never learns there are two
people.

Local two-pad co-op is the hard one. It needs a second input source through
`src/core/input.ts` (whose `ACTIONS` and `bindings` are a single flat record), a way for two
players to have two menus open at once on one stack, and a shared camera. On the shared camera:
the screenshot at `build/shots/mp-03-overworld.png` is 240×160, which is **15 tiles wide by 10
tall**. Two players on one camera are tethered to about ±7 tiles horizontally and ±5 vertically
before one of them is off screen. That is a leash, and in a game with 74 warps between 30 maps
it is a constant argument. Split-screen at 240×160 gives each player 7×10 tiles, which is
unplayable. **Do not build couch co-op.**

### 2.5 Is the battle simulation deterministic enough for lockstep?

I audited this specifically. **Yes, with four named caveats — and none of them are floating
point.**

**The RNG is solid.** `src/core/rng.ts` is xoshiro128\*\* built entirely from `Math.imul`, XOR,
shifts and `>>> 0`. Every operation is exact 32-bit integer arithmetic. Identical output on any
JavaScript engine on any platform, forever. `getState()`/`setState()` already exist for
snapshotting, and — note — **no game code calls either of them** (only `tests/formulas.test.js:422`), despite the
comment saying they are for saving mid-battle state.

**The damage math is safe.** `calcDamage` (`src/battle/formulas.ts:286`) is integer arithmetic
with `Math.floor` at every step. The only non-integers entering it are `stageMultiplier` (exact
small ratios like `3/2`, `2/3`), the effectiveness chart (`0.25`/`0.5`/`1`/`2`/`4`, all exactly
representable), STAB `1.5`, and weather `1.5`/`0.5`. IEEE-754 multiply and `Math.floor` are
exactly specified. There is no accumulation, no `+=` on a float, no trig.

**The two `Math.pow` calls do not matter.** `Math.pow` is *not* required to be bit-identical
across engines. It appears three times:

- `formulas.ts:409` and `:427` — `Math.pow(b/65536, 4)`, used only to *report* a capture
  probability. The four shake checks are `rng.below(65536) < b`, pure integers.
- `battle.ts:503` — `1 / Math.pow(2, side.protectStreak)`, integer exponent, exact.
- `ai.ts:253` — affects AI move choice. Irrelevant in a PvP link battle; see caveat 4.

`Math.sqrt` at `formulas.ts:402` is required by IEEE-754 to be correctly rounded, so it is
deterministic.

Now the four real caveats:

1. **The battle seed is wall-clock.** `src/battle/battle.ts:155` is `new Rng(config.seed ??
   Date.now())`, and the only real caller passes `seed: \`${Date.now()}\`` at
   `src/scenes/battle.ts:401`. Both peers must agree a seed at connect time. One line, but it
   has to happen.

2. **`Kin.fromJSON` consumes RNG draws.** `src/systems/kin.ts:365` calls the `Kin` constructor,
   which rolls IVs, nature, ability and gender from the `Rng` you hand it (`kin.ts:80–92`)
   *before* overwriting them with the saved values. So deserialising a party silently advances
   whatever stream you pass. `GameState.fromJSON` passes `worldRng` (`state.ts:302`), which is
   fine today; the moment you deserialise a peer's party you must not pass a stream both sides
   depend on.

3. **`Kin.uid` is a per-process counter and is not serialised.** `let nextUid = 1` at
   `kin.ts:42`; `toJSON` (`kin.ts:354`) omits it. So the same creature has different uids on the
   two machines, and `BattleSide.participants` — a `Set<number>` of uids driving EXP
   distribution — is not comparable across the wire. This is also a latent *single-player* bug:
   reload a save and every kin gets a fresh uid.

4. **Side assignment must be canonical, because speed ties consume a draw.** `orderMoves`
   (`battle.ts:279`) breaks a tie with `this.rng.next() < 0.5 ? -1 : 1`. If the two peers feed
   `takeTurn` in different argument orders, they consume the stream identically but assign the
   outcome to opposite sides, and they diverge on the first speed tie. The host is canonically
   `'player'` on **both** machines; the guest's battle scene mirrors the sides at render time
   only.

**Conclusion: mirrored lockstep is the right architecture for a link battle.** Both peers
construct an identical `Battle` from a wire payload, both call `takeTurn(hostAction,
guestAction)` in that fixed order, both get identical event lists containing their own local
`Kin` objects. The only new wire types are `BattleAction` (three small variants) and the initial
party payload, for which `Kin.toJSON` already exists.

Two rules make it safe: **ban items in link battles** (which sidesteps `BattleConfig.bag`
needing the opponent's inventory, and which the real games effectively did anyway), and **send a
checksum of both parties' HP/status/PP after every turn** so a divergence is caught in one turn
rather than five, with an honest "the link desynced" message instead of two players seeing
different games.

The alternative — host-authoritative, host sends the event list — is worse here, because
`BattleEvent` carries live `Kin` object references (`{ t: 'damage'; kin: Kin; ... }`) that the
presentation layer dereferences. Making those wire-safe is a real refactor. Worth doing anyway
(see §4), but not needed for Stage 1.

### 2.6 What a save file means for two people

Today: one JSON blob per slot in `localStorage`, three manual slots plus autosave
(`src/systems/save.ts`). The launcher pins the origin to `kinbound://game` specifically because
`localStorage` is origin-keyed and a random HTTP port would wipe every save
(`launcher/main.cjs`, the `GAME_SCHEME` comment). That is a well-built system and the co-op
design has to respect it.

Under Option C:

- **The host's slot is the world.** Nothing changes for them. They save; the world saves.
- **The guest gets a new kind of slot**, a *co-op file*, holding only their player half: party,
  boxes, bag, money, name, appearance, Vellum. Not flags. Not seals. On reconnect they bring
  their creatures back into the host's world.
- **The guest's single-player save is untouched and does not advance.** This is the real cost
  and it should be said in the UI at connect time, not discovered. A player who only ever joins
  never has a save that reflects what they played.
- `SAVE_VERSION` goes to 2 and `migrate()` (`save.ts:130`) stops being the no-op stub it is
  today. That function has one job and it has never had to do it. The first time it does, it
  is operating on people's real playthroughs.
- **A peer's serialised save is hostile input.** `Kin.fromJSON` currently trusts `data.level`,
  `data.moves` and `data.ivs` completely — it is reading a file the player owns, so that is
  fine. Over the wire it is not fine: a modified client hands you a level-4000 creature with
  moves that do not exist in `data/moves/`, and the registry lookup returns `undefined` deep
  inside the damage formula. Every field from a peer must be validated against the registry and
  clamped before it becomes a `Kin`.

---

## 3. The transport

### Does the no-dependency rule survive? Yes — comfortably.

Worth being precise about what the rule is. `src/` has zero runtime dependencies and that is the
rule that matters. `package.json` already ships `electron-updater` as a real dependency, but it
lives in `launcher/updater.cjs`, in the main process, outside the game. So: **nothing new inside
`src/`** — and nothing needs to be, because the two viable transports are both platform APIs.

What does *not* survive for free is **hosting**. That is the honest headline of this section.

### The four options

**1. Raw TCP over `node:net`, in the Electron main process.** Bridged to the game through
`launcher/preload.cjs`, which already has exactly the right pattern — a small fixed list of
whole verbs, no Node in the renderer. Zero dependencies, zero hosting, zero accounts, and about
150 lines including a length-prefixed framing.

- *Works:* same house, same LAN. Also over Tailscale / ZeroTier / Hamachi, which a surprising
  number of people already have and which makes "same LAN" mean "same friend group".
- *Does not work:* the open internet without port forwarding. The browser build at all.
- **This is the cheapest thing that is real, and it is the right Stage 1.**

**2. WebRTC `RTCDataChannel`.** A Chromium platform API. Zero dependencies in `src/`, works in
both the Electron game window and the browser build, does NAT traversal, gives you an
ordered-reliable channel (and an unordered one if you ever want position updates cheap).

- Needs *signalling*: the two peers must exchange an SDP offer/answer and ICE candidates
  before they can talk.
  - **Without hosting:** copy-paste the offer and the answer. An SDP blob is 2–4 KB; deflated
    and base64'd it is still 600–900 characters. Fine to paste, impossible to type, and
    miserable as a shipped feature. Acceptable for a first internet test, not for players.
  - **With hosting:** ~150 lines of `node:http` + `node:crypto` on any small VPS. That is a
    service you keep alive, a domain you renew, and a moderation surface you own.
- Needs STUN. `stun:stun.l.google.com:19302` is free and handles most home NATs.
- **Needs TURN for the rest.** Symmetric NAT and carrier-grade NAT (common on mobile
  broadband) cannot be traversed; those pairs need a relay, which carries all their traffic and
  costs money proportional to use. Budget for roughly 10–20% of pairs failing without one. If
  you do not run TURN, the failure message has to be honest and specific, because "it just
  doesn't connect" with no explanation is the worst outcome in this whole document.

**3. WebSocket relay.** The client side is a browser built-in, so still zero deps in `src/`.
The server is the same hosting problem as signalling, but simpler in kind — no NAT traversal, no
TURN, no ICE. The cost is that *every byte* goes through your machine, so you are paying
bandwidth as well as uptime, and your server is a single point of failure for every session.
`ws` on the server would be one launcher-side dependency, or hand-roll RFC 6455 in ~250 lines
with `node:net` + `node:crypto` for zero.

**4. Steam / Epic / GOG networking.** Free relay, free NAT traversal, free friend list, free
lobby UI. Also a store account, a build pipeline that is not `electron-builder --publish never`,
and a platform dependency for a game that currently ships as a self-hosted installer with its
own updater. Mentioned for completeness; not recommended for this project's shape.

### Verdict

- **Stage 1 (LAN):** option 1. Nothing to pay for, nothing to maintain, works tonight.
- **Stage 3 (internet):** option 2, with option 3's server doing double duty as the signalling
  endpoint. One small always-on box gets you both.
- Plainly: **LAN play is free; internet play costs you a server you keep alive, whichever way
  you go.** There is no arrangement where two arbitrary home machines find each other with
  nothing in the middle.

---

## 4. What should change before any netcode is written

Every item here is worth doing on its own merits. If multiplayer is cancelled after Stage 0, the
game is better for having done these.

1. **Split `GameState` into `WorldProgress` and `PlayerFile`** (`src/systems/state.ts`). The
   biggest one. Unlocks New Game+, a second character slot, and "keep the box, reset the story".
   *~2–3 days, plus a save migration.*

2. **Give `Kin` a stable id that survives `toJSON`** (`kin.ts:42`, `:354`). Fixes a real
   single-player bug — `BattleSide.participants` is a `Set` of uids and a reloaded party gets
   fresh ones, so EXP participation is wrong after a load — and is a hard prerequisite for
   trading. *~half a day.*

3. **Pass an explicit seed at every `Battle` construction** instead of `Date.now()`
   (`scenes/battle.ts:401`), and store it. Then wire up `Rng.getState()`/`setState()`, which
   exist, are documented as being for exactly this, and are called by no game code. Result: a battle
   survives a reload, and any battle can be replayed from its seed. *~1 day.*

4. **Move the AI off `battle.rng`** (`scenes/battle.ts:407` passes `this.battle.rng` into
   `TrainerAI`). Today an AI tweak perturbs the battle's own stream, so two runs of the same
   seed diverge after any AI change. Give it its own generator. *~1 hour.*

5. **Make `BattleEvent` wire-safe.** Replace the live `kin: Kin` references with
   `{ side, slot }`. This is what the module's own header says the event split is for — "a
   replay reconstructed from a seed" — and it is currently not true, because the events hold
   pointers into mutable objects. *~1–2 days.*

6. **Replace simulation-affecting `Math.random`.** There is exactly one:
   `src/scenes/overworld.ts:139`, NPC idle cooldown. Use `game.rng`. The two in
   `engine/renderer.ts:420` (screen shake) and `gfx/movefx.ts:187` are presentation and should
   stay. *~10 minutes.*

7. **One `bodies` list in the overworld.** `OverworldScene` keeps `player: PlayerBody` and
   `npcs: NpcInstance[]` as separate fields with separate update paths. A remote player is
   neither. One list, each entry with a driver (local input / remote input / NPC behaviour), is
   the shape that admits a second player without a special case in the hot path of a 1,344-line
   file. *~2–3 days.*

8. **Give `EventRunner` a triggerer.** `start(script, onComplete)` has no notion of who set it
   off. Adding one costs nothing today and is unavoidable later. *~half a day.*

9. **A content hash and a version gate.** `data/` drives the battle math. Two clients with
   different `data/moves/` will desync silently and look like a bug in the netcode. Hash the
   manifest at build time; refuse to connect on a mismatch, and say which side is out of date.
   *~half a day.*

---

## 5. The staged plan

Sizes assume one person who knows this codebase, working evenings and weekends. They are
calendar estimates, not effort estimates, and they are deliberately not optimistic.

### Stage 0 — Prerequisites — **2–3 weeks**
Everything in §4. No netcode. Ships value alone. Save version goes to 2 here, once, rather than
three times across three stages.

### Stage 1 — LAN link battle — **2–3 weeks**
`LINK BATTLE` on the title screen → host, or join by IP → version + content handshake →
exchange serialised parties and an agreed seed → mirrored `Battle`, host is canonically
`'player'` on both machines → `submit()` sends a `BattleAction` and blocks on the peer's →
per-turn checksum with an honest desync bail-out. Items and fleeing disabled by rule.

**This is the smallest genuinely fun milestone**, and I would ship it as a release on its own.

### Stage 2 — Trading — **1–2 weeks**
Needs Stage 0's stable ids. The Roost (`src/scenes/roost.ts`) already draws the box grid; the
trade screen is that with two panels. The protocol is the interesting part: both offer, both
confirm, both write, both acknowledge, and a disconnect at any point leaves both parties intact.
A trade that eats a creature is the one bug in this whole document that players will never
forgive.

### Stage 3 — Internet play — **2–4 weeks, plus indefinite hosting**
WebRTC in a new `src/net/`, a signalling server you own and run, STUN, and a specific failure
message for the pairs that would have needed TURN. Stages 1 and 2 work unchanged over the new
pipe if the transport is behind an interface from the start — which is the one design rule
Stage 1 must not skip.

**This is where the project stops being free.**

### Stage 4 — Walking together, no story — **3–5 weeks**
Host-authoritative overworld. The guest joins the host's map with their own body, their own
party, their own wild encounters. No shared cutscenes. No shared flags. NPCs answer whoever
talks to them, and the dialogue box is local. Warps are per-player — the guest can walk into a
house on their own. The remote player is a `RemotePlayer` record the overworld draws, behind a
null check, off the single-player path.

Position sync at 10 Hz with interpolation is plenty; `WALK_SPEED` is 1.6 px/tick and there is no
combat in the overworld, so nothing here needs prediction or rollback.

**Play this for an evening before starting Stage 5.** There is a real chance it is already the
thing that was wanted, at a fifth of the cost.

### Stage 5 — Story co-op — **2–4 months**
Cutscene arbitration (§2.2), flag ownership (§2.1), the co-op save format (§2.6), the guest's
progress decision, and then QA across 23 scripts, 87 NPCs, 32 trainer teams and 74 warps —
doubled, because every one of them now has a second person standing next to it.

This is the stage that can go badly. It is also the only one that answers the original question.

### Stage 6 — 2v2 co-op battles — **1–2 months. Skip this.**
A battle-engine rewrite, not a netcode task (§2.3), touching the 1,176-line simulation and the
2,858-line battle scene — the part of the game that currently works best. The value over Stage 5
is small. The risk is not.

---

## 6. Where the button actually goes

Both menus were captured and measured rather than guessed.

### The title screen — yes, here

`src/scenes/title.ts:35` constructs `new ListMenu<string>([], 3)` and renders at
`this.menu.render(r, x, 104, w, { rowHeight: 12 })` (`title.ts:136`). `ListMenu.height()` is
`visible * rowH + padY * 2`, so the box is `3 × 12 + 8 = 44` tall and ends at **y = 148** on a
160-tall screen. See `build/shots/mp-02-title-menu.png`.

A fourth entry makes it 56 tall and it ends at **exactly 160** — flush with the bottom edge, no
margin. So the change is two lines, not one: the constructor's `3` becomes `4` (otherwise the
fourth item scrolls instead of showing), and the render origin moves from `104` to about `96` to
keep the 8px margin the rest of the screen respects.

### The pause menu — no

`src/scenes/mainmenu.ts` already carries 8 entries against a hand-computed budget, with a
comment explaining that the previous version drew its clock off the bottom of the display. Run
the arithmetic for a ninth entry: `rowH = max(11, min(13, floor(96 / 9))) = 11`, then
`fitTo(104)` gives `visible = floor(96 / 11) = 8`. **Nine entries means only eight are visible
and the pause menu scrolls for the first time in the game's life.** See
`build/shots/mp-04-pause-menu.png` for how full it already is.

Put the in-world connection somewhere else. A terminal in the Kin Clinic is the genre-correct
answer, it costs one map object and one event script rather than an engine change, and it gives
the player a defined safe place to be standing when a link opens — which matters, because
"where was I when the connection dropped" is a question the save system has to be able to
answer.

---

## 7. Risks

**The save migration.** `migrate()` (`save.ts:130`) is a stub that has never run. Stage 0 makes
it run, on real playthroughs. The save system's own header brags about read-back verification
for exactly this reason — that care needs to extend to the migration, and the migration needs a
test that loads a genuine v1 file, not a synthetic one.

**`OverworldScene` regressions.** 1,344 lines, the busiest file in the project, and the one the
comments say "is where does the game feel good is won or lost". Every co-op branch added to
`update()` is a place single-player can quietly regress. Keep the remote player behind a null
check, keep the co-op path out of `updatePlayer`, and screenshot-test the single-player walk
cycle after every stage.

**Cutscene bugs are the least testable class of bug here.** 23 scripts written on the assumption
of exactly one player. They fail rarely, at a specific timing, in someone else's session.

**A dead menu item.** `LINK BATTLE` on the title screen is, for most players most of the time,
a button that leads to a screen asking for an IP address of a friend who is not currently
playing. That is a worse first impression than no button. Consider what it says when there is
nobody to connect to.

**Competitive balance.** 32 trainer teams have never been asked whether the move set is fair
between two humans who are trying. Something will be broken. That is fine and expected, but the
first link battles will find it in an hour.

**Security.** Opening a socket in the Electron main process turns the game into a network
service. Cap message sizes, never trust a length prefix, never `eval` anything from the wire,
and validate every field of a peer's `Kin` against the registry before constructing one (§2.6).
This is a boundary the project does not currently have anywhere.

**Autosave under someone else's feet.** `autosave` fires on entering a clinic
(`overworld.ts:163`). In co-op the guest walking into the host's clinic would write the
host's save. Probably fine — decide it deliberately rather than discovering it.

**Scope, said plainly.** `src/` is 53,000 lines, of which the loop, state, battle and scenes
that multiplayer has to touch are about 15,800. Stages 0–5 are somewhere between four and seven
months for one person, and **the netcode is the small part of that** — the cost is the refactor
underneath it and the QA on top of it. Stages 0–2 are three to six weeks and produce something
real and shippable on their own. That is where I would draw the line and re-decide.
