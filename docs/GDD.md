# PAWNRIFT — Game Design

This document records confirmed design and a proposed delivery plan. Implementation is authorized through **Stage 7A: transformation rules, combat integration, readable UI and normal-run seed randomization**. Stage 7B character redesign, Stage 7C tutorial, Stage 8 progression/randomized deck composition and Stage 10 saving are future work. Publish verified updates to GitHub and Cloudflare; directly deploy the tested build if it is not live. **Provisional** balance needs playtesting. **Open** design is not permission to invent later systems. Basic movement and attacks never require dice.

## Concept and pillars

A single-player isometric, chess-inspired roguelite about a tiny living Pawn with a signature crimson katana. Explore compact chessboard dungeons with a shared player-driven clock, defeat chess bosses, and carry permanent essences back to a future walkable lobby. A separate deck complements basic movement and attacks; optional lightweight 2d6 effects remain future work.

- Readable tactics: compact spaces, clear silhouettes, consequential positioning.
- Route choices: explore through fog, navigate obstacles, and weigh treasure against danger.
- Build expression: cards and future optional dice effects complement tactics; consumable boss forms create temporary power windows.
- Persistent purpose: collect all eight boss essences to unlock the boss rush and Mirror.

No multiplayer. Avoid adding systems beyond this scope without an explicit design decision.

## Exploration and combat

- Each floor is a procedurally generated **8×8 board** containing obstacles, chess-themed enemies, treasure, and multiple route choices.
- Fog of war reveals a **one-tile radius**, including diagonals where line of sight permits. Solid walls occlude sight; diagonal sight requires both orthogonal flanking cells to be clear (no corner-peeking). Unexplored terrain is hidden; explored terrain remains dimly visible. Future enemies, loot, and traps require current sight, never exploration memory.
- Exploration and combat use the same board and synchronized player-driven turns, with no separate battle screen or artificial combat rounds.
- One valid move, attack, defend/counter, wait, or future time-consuming ability advances the world once. Menus, inspection, hovering, camera movement/zoom, invalid actions, and debug controls do not advance time.
- The **separate deckbuilding system** contains attack, defense, and utility cards; dice manipulation remains future work. Optional **2d6** may support bonuses, special abilities, card effects, and risk/reward events; never mandatory movement rolls or accuracy rolls for basic attacks. Transformations are consumables, never cards.
- Chess identities should inform enemy movement and threat readability. Exact movement, attacks, telegraphs, and exceptions remain **open**; standard chess rules are not automatically binding.
- The red katana defines Pawn's visual identity, worn sheathed at its left hip. Pawn moves one orthogonal tile per accepted click or WASD/arrow keypress; obstacles, occupancy, missing cells, and board bounds block movement. Basic attacks reliably hit an adjacent orthogonal living enemy in current sight. Health/damage values are provisional.

### Tactical rules to settle

The base action economy is confirmed: one valid action advances one synchronized turn, independently of dice. Future dice use (individual values, sum, allocation, timing windows) and card interactions remain **open**.

Stage 6 settles the starting deck, hand, and resource timing below. **Open:** deck growth, rewards, upgrades/removals, persistence through death, and future dice/card interactions. Damage, individual card costs, and effect strengths remain provisional.

### Stage 6 cards and combat feedback

- Start with **12 cards**, a **4-card hand**, and draw/discard piles. Each physical card has a stable instance ID separate from its typed definition. A floor seed determines the initial shuffle and every subsequent reshuffle; rendering never consumes that randomness.
- After a valid play, discard that instance and immediately draw to four. If a draw is needed and the draw pile is empty, shuffle the entire discard pile, including the just-played card, using the next deterministic shuffle index. Basic actions do not draw or discard. Unplayed cards remain in hand.
- Start at **3 energy maximum** (configurable). Validate and spend the full cost before the effect; recover **1 energy once at world completion**, capped at maximum. Regeneration cannot make an unaffordable card playable. Cost-1 cards therefore have zero net energy change after completion; cost-3 cards leave 1 from a full pool. Basic actions also recover 1; energy never resets to full per action.
- Every valid card consumes one world turn and receives exactly one response per surviving eligible enemy. Invalid targets, unaffordable plays, inspection, selection, and cancellation change no resources, cards, or time. Existing phase/action-ID guards apply to cards too. Basic actions always remain available.
- Damage cards target a currently visible, living orthogonal neighbor with clear sight and no blocking terrain/occupancy. Slip uses ordinary one-tile Pawn movement into a currently visible unoccupied cell; it never jumps obstacles or reveals hidden contents. Self cards require an applicable effect: Mend at full HP and Focus at its cap are invalid.
- **Provisional starter composition and effects**, centralized in `src/data/cards.ts`:

| Card | Copies | Cost | Effect |
| --- | --- | --- | --- |
| Cut | 3 | 1 | Deal 4 to an adjacent foe |
| Ward | 2 | 1 | Block a total of 3 during this enemy response |
| Riposte | 2 | 1 | Block a total of 1; counter the first actual strike for 4 |
| Slip | 2 | 1 | Move one clear orthogonal tile; block 1 this response |
| Focus | 1 | 0 | Gain 1 Focus, capped at 3; each point adds 1 to the next basic/card strike, then all are consumed |
| Crimson | 1 | 3 | Deal 7 to an adjacent foe |
| Mend | 1 | 2 | Heal 4, capped at maximum HP |

- Card block is a shared pool across incoming strikes; block and prepared counters expire after the coming response, even if foes only telegraph or miss. A prepared counter requires a real strike and a surviving Pawn, and triggers once. Basic Q guard/counter retains its existing behavior. Focus persists until a successful strike or run reset.
- The compact bottom hand sits in reserved screen space below the Canvas. Click to inspect/select; click a highlighted foe/tile to target, or use Play for self cards. Cancel/Escape is free. Names, costs, effects, playability, energy, Focus, and pile counts remain readable. Normal controls can still submit basic actions.
- Player HP has a muted crimson bar plus current/max numbers. Living enemies expose compact bars only in current sight, including under debug reveal. Stable event IDs drive damage/healing/BLOCKED values that rise/fade, stagger per recipient, expire after 850 ms, and are capped at 12 concurrent indicators. Labels follow recipients and obey current sight. Pawn recoil and the existing enemy hit flash provide restrained feedback; no attack animation is implemented.
- Defeat and fresh-run/same-seed floor reset preserve their existing semantics and reset deck, resources, targeting, and event IDs atomically. There are no card rewards, upgrades, removals, saving, transformations, Light/Dark modifiers, dice effects, or synergies yet. Definition/instance separation and the discriminated effect/action types provide extension points without implementing those systems.

### Stage 6.1 card presentation and help

The upper-right Dungeon tools are available in production: seed input, layout selection, generation from that seed, and a fresh-dungeon button. Regeneration resets the temporary encounter through the existing atomic reset. The user subsequently authorized all current testing tools publicly, including terrain reveal and transformation tests. Terrain reveal never changes exploration memory or exposes hidden enemies.

Card body text uses full justification by default; text that requires centered presentation retains it. Short headings, category labels, and Energy indicators retain their deliberate alignment.

Stage 6.1 adds presentation only: Attack/crimson, Defense/steel blue, Mobility/desaturated teal, and Utility/violet category symbols and labels; a shared lightning-shaped Energy icon on cards and HUD; explicit typed keyword tokens; and one central glossary for Energy, Block, Focus, Counter/Riposte, Draw, Discard, Damage, and Healing. Hover, keyboard focus, or tap explains a term; Help lists the same entries. Tooltips sit above the HUD, clamp to the viewport, scroll for long content, remain readable while hovered/focused or pinned by tap, and dismiss with Escape/outside click. Dismissal does not click through or consume an action. Card selection and keyword controls are separate semantic buttons. Smaller hands scroll horizontally instead of shrinking type. No effect, deck, energy, movement, damage formula, AI, fog, generation, or Game Over rule changes.

Descriptions now explicitly name damage/targets, who receives healing, and temporary protection. The glossary clarifies that a response includes all eligible enemies, unused Block and Riposte expire even without an incoming strike, Riposte requires survival and triggers despite full blocking, Focus does not increase counters, and used cards can return immediately on a reshuffle. These clarify existing behavior rather than changing it.

### Stage 7A transformation gameplay

- Implemented forms are Pawn, Knight, Bishop, Rook and Queen. King/Mirror stay reserved. Forms are consumables, never cards. No bosses, essences, full progression, persistent saving or model redesign are added here.
- A confirmed activation spends one shared charge and one world turn, then surviving enemies respond. Inspection/cancel/invalid activation are free. One form at a time; two distinct carried identities maximum. Light/Dark must be unlocked before activation and cannot switch mid-duration. Unlocking another attunement never refills charges.
- An activation lasts the activation floor plus the next floor. The completed-floor hook alone decrements duration; normal actions never do. After the second completed floor, return to Pawn for one full global recovery floor. New Run/reseeding aborts an active form, starts recovery, and never counts as a completed recovery floor or refunds a charge. Runtime floor transitions are hooks/development simulations only; full progression waits for Stage 8.
- Zero charges still allow the final two-floor activation. When that activity ends (including death/abandonment), remove the item and track reconstruction separately. Two subsequent wins over that boss **identity**, across either variant, reconstruct on the first and reacquire on the second. Reacquisition capacity is 5; if inventory is full, retain ready-to-claim eligibility without requiring a third win. These ownership/abandonment choices are **provisional Stage 7A interpretations**, not a new boss/reward system.
- Death requires explicitly retaining exactly one eligible carried item with positive remaining charges. Keep those charges and applicable global recovery; lose the other item. Zero-charge activity is not retainable and ends on death. With no eligible items, skip selection. Restart/Play cannot bypass a pending choice. Reconstruction progress survives in memory; refresh clears all current in-memory progression. Voluntary New Run preserves positive-charge carried items/reconstruction but ends active duration and preserves recovery; no refill/reset exploit.
- **Movement:** Pawn one orthogonal tile; Knight an L-jump over intermediate obstacles; Bishop diagonal slides; Rook orthogonal slides; Queen both. Slide limit is provisionally 3. Occupants/obstacles stop slides and block destinations; Knight must land on a valid free tile. Every valid move costs one world turn regardless of distance. Existing one-tile fog is unchanged.
- **Preview policy:** current-sight destinations are teal; faint unscouted outlines are geometric attempts calculated using remembered terrain and currently visible occupants only. They reveal no terrain, walls or hidden enemies, and may fail without spending a turn if an unknown collision blocks the actual move. This lets Knights move before distant tiles are explored. Click a marker or use keys. WASD/arrows retain orthogonal steps for Pawn/Rook/Queen; Bishop maps W/D/S/A to NW/NE/SE/SW diagonal steps. Knight uses (-1,-2), (2,-1), (1,2), (-2,1), with Shift selecting the mirrored four jumps. Shift selects Queen diagonals. Clicks allow full slide ranges.
- **Provisional attacks/abilities**, centralized in src/data/forms.ts: Pawn retains its 3-damage katana, Focus and free Defend/counter. Knight basic is 3 damage up to 2 clear orthogonal tiles; Thrust costs 1 Energy for 4 damage on that lane. Bishop basic is 3 damage up to 2 clear diagonal tiles; Ward costs 1 Energy and grants Light 3 Block + 1 Focus, or Dark 5 Block. Rook basic is 4 damage to an orthogonal neighbor; Lane strike costs 1 Energy for 5 damage up to 3 clear straight tiles. Queen basic is 3 damage to any of 8 neighbors; Twin strike costs 2 Energy for two hits of 3, stopping if the target dies. All attacks require current sight and clear lanes; intervening occupants block ranged strikes.
- **Attunements:** Light adds 1 damage to transformed basics and each damaging signature hit. Dark grants 1 Block on a basic, or 2 on a damaging signature. Bishop Ward uses the distinct values above. Focus boosts only the first strike and never counters. Card costs, targets, effects, draws and Energy recovery are unchanged by form. Basic attacks remain Energy-free and reliable. Signature costs are paid upfront; one completed world action restores 1 Energy as before. Defend/counter remains available in all forms.
- **Presentation:** compact current form/attunement/charge/duration-or-recovery/slots HUD, with collapsed inventory and explicit activation confirmation. Shared hover/focus/tap tooltips explain advanced movement, abilities, duration and recovery; they issue no actions. A small chess label identifies the active form above the existing Pawn placeholder; full bodies/weapons are Stage 7B. Semantic CSS tokens distinguish attack, defense, mobility, utility, Energy and Light/Dark; text tokens are tested at 4.5:1 against panel/background. Use bold names/numbers, spare optional flavor italics (none needed here), and concise reasons for unavailable actions. Do not recolor the world.
- **Public testing tools — explicitly authorized after Stage 7A:** grant/unlock either attunement, test normal activation, inspect charges/reconstruction, simulate a completed floor or boss win, force death for retention testing, and reveal terrain. The same toolbox is available locally and on Cloudflare; no development-only gate. Grants still respect two slots, shared charges and reconstruction; activations use normal turn resolution. Simulations require a ready living run and do not add automatic campaign progression. Until bosses/rewards exist, obtain forms through these public grants.

### Run seeds and Stage 8 starter plan

The repeated first layout came from the fixed initial seed and Play resuming that initialization board. Initial state and first Play now use fresh cryptographic run-boundary seeds. New Run and Restart always choose fresh seeds; Resume preserves an existing living run, including pending enemy playback. Play after victory starts fresh. An explicitly entered seed/style remains reproducible and is passed unchanged into the generator; generation algorithms and seeded randomness are unchanged. The title distinguishes Resume from New Run.

**Planned for Stage 8, not implemented:** each starting deck totals 12 cards: 8 essential starters plus 4 chosen from a balanced starter pool. Normal runs should vary composition; a saved seed should reproduce the same selection. Use independent deterministic streams for dungeon layouts, starter selection and shuffle order, so changing one system cannot consume another system's randomness. Essential identities, pool balance and duplicate constraints remain open. Stage 7A keeps the existing fixed 12-card composition and seeded shuffle.

### Stage 5 turn and combat rules

1. Accept one valid action while ready; lock overlapping input.
2. Resolve the Pawn's action and immediate damage/defeats, then update fog.
3. After lightweight action presentation, resolve one action per eligible living enemy in stable ID order. Enemies killed by the player cannot respond; resolution stops when the Pawn dies.
4. Future status/hazard ticks belong after enemy actions; none exist yet.
5. Check terminal conditions, increment the turn once, finish response presentation, then restore player control.

Rendering never advances rules. The pure resolver is deterministic; Zustand coordinates explicit player/enemy presentation phases with action IDs. Stale or duplicate callbacks and rapid inputs cannot process extra turns. Menus suspend pending phases and invalidate old callbacks; resuming a living run finishes the pending response exactly once without skipping an enemy turn.

- **Attack:** click an adjacent visible enemy or press E/Attack. No accuracy roll; one turn.
- **Defend/counter:** Q/Defend guards for the coming enemy response, reducing incoming damage and countering each real adjacent strike. Guard expires after that response. No counter on a missed strike.
- **Wait:** Space, period, or Wait advances one turn without movement.
- **Rookling:** one small chess-tower enemy archetype, currently spawned once per floor on a reachable unoccupied cell, normally its reserved cell. It detects through proximity plus wall-aware sight, pursues with occupancy-aware BFS, and remembers only its last observed Pawn position. After losing sight it travels there, searches briefly, then idles.
- **Telegraph:** an adjacent Rookling spends an action marking a strike tile. Its next action strikes that tile; movement can evade it, or guard can counter it. Enemies never act while the player is inactive.
- **Visibility:** enemy models, HP, and intent require current sight, even if terrain is remembered or debug map reveal is on. Simple hit flashes/rings and a short event line provide feedback. The Pawn model and sheathed weapon stay intact.
- **Defeat:** HP zero immediately stops the remaining enemy sequence and all further gameplay. One centered GAME OVER modal dims the visible scene. RESTART RUN generates a fresh seed and resets HP, enemies, turns, fog, and temporary state. MAIN MENU suspends playback and returns to the title; Play after defeat starts a fresh run. The navigation boundary may later route defeat to the lobby, but no lobby, progression, or death penalties exist yet.
- **Victory — provisional:** defeating the floor's enemies and reaching the exit clears the floor; no automatic floor progression yet. Victory's Restart floor resets the same seed, enemies, and fog.

All Stage 5 balance is **provisional**, centralized in `src/data/combatBalance.ts`: Pawn HP 12, katana damage 3; Rookling HP 6, strike damage 2; guard reduction 2, counter damage 2; detection Manhattan radius 4; search 2 turns. Presentation delays (240 ms player / 220 ms enemy) are provisional and do not create autonomous world ticks.

Stage 7A implements Pawn, Knight L-jump, Bishop diagonal slide, Rook orthogonal slide and Queen combined slides through shared movement predicates and fog-safe previews. Each completed movement costs one world turn regardless of distance. King one-tile movement remains future postgame work.

## Floors, alignment, and bosses

There are **four main biomes**, each containing **six floors**: five regular floors followed by one boss floor, for **24 main-route floors**. Biome names, environments, transitions, and exact boss ordering remain open.

On each regular floor, choose **Light (offensive)** or **Dark (defensive)** alignment. The majority of that biome's five choices selects its Floor 6 boss variant. Five votes always produce a majority; reset the tally for the next biome. **Open:** when the choice is made and what concrete offensive/defensive changes it grants.

| Boss identity | Required silhouette | Variants |
| --- | --- | --- |
| Chimera Knight | Two horse heads | Light and Dark |
| Yin and Yang Bishop | Left Light / right Dark | Light and Dark |
| Twin Towers | Two Rooks | Light and Dark |
| Queen of Pain | One Queen | Light and Dark |

Each biome has one of these boss identities. The Bishop's left/right visual identity remains intact in both variants. Variant mechanics, encounter balance, and biome assignment are **open**.

Generation must be seed-reproducible. **Provisional acceptance criteria:** start and exit are connected, required objectives are reachable, obstacles do not seal the only route, placements do not overlap illegally, and regular floors offer meaningful alternate routes. Layout density, treasure frequency, enemy counts, and boss-floor layout constraints remain **provisional**.

Stage 4 implements maze, open courtyard, narrow-corridor, and branching layouts, with ordinary orthogonal connectivity validation and deterministic corridor repair. All 64 terrain cells exist; collision determines traversability. Spawn/exit and four reservation cells are protected from blocking props. Stage 5 uses the enemy reservation for a Rookling; trap, treasure, and alternate-exit reservations remain empty metadata. Structure, density, prop frequencies, and fade timings are provisional. The exit has a clear-floor condition but no automatic floor transition.

## Progression, lobby, and endgame

- Defeating each distinct boss variant grants its **permanent essence**: four bosses × two variants = **eight essences**.
- The eight essences fill a chessboard display in the **walkable lobby**. Essences never disappear, including after death or transformation depletion.
- Collecting all eight unlocks a **boss rush against all eight variants**, followed by **the Mirror**: another Pawn that absorbed the recalled defeated bosses and uses their powers.
- The **King form is reserved for late postgame content**; it is outside the initial main route and minimal slice.

Since one biome visit yields only one variant encounter, collecting both variants requires revisiting bosses across playthroughs or another approved replay structure. **Open:** run reset rules, biome replay access, victory handling, lobby return timing, and what persists besides essences and the specified retained transformation.

**Open:** boss-rush order, recovery between fights, retry behavior, rewards, and Mirror mechanics. No additional endgame modes are assumed.

## Weapons and forms

| Form | Light weapon | Dark weapon |
| --- | --- | --- |
| Pawn | Red katana (shared identity) | Red katana (shared identity) |
| Knight | Lance | Spear |
| Bishop | Staff | Book |
| Rook | Greataxe | Hammer |
| Queen | Claws | Knuckles |
| King — late postgame | Greatsword | Dual swords |

Weapons establish identity. Stage 7A implements the provisional combat rules above while retaining the Pawn placeholder; Stage 7B will redesign form bodies/weapons. Light favors offense and Dark favors defense. Main-content balance remains open.

## Transformation consumables

Confirmed lifecycle rules:

1. Each consumable supplies **five activations**. Light and Dark attunements **share the charge pool**.
2. Each activation supplies **two floors of activity**, including both exploration and combat. Only **one form** can be active at a time.
3. Each activation requires **one compulsory global Pawn recovery floor**. “Global” means another stored form cannot bypass the recovery requirement.
4. Inventory holds **two transformation consumables**.
5. After death, retain **one chosen transformation with its remaining charges**.
6. When the last charge is spent, the consumable remains usable for its active duration and is **permanently destroyed when that duration ends**.
7. After destruction, reacquisition requires **two subsequent victories over the corresponding boss**: the first reconstructs it; the second reacquires it. Do not award the consumable on the reconstruction win or count earlier victories toward this requirement.
8. Permanent essences are independent of this lifecycle and never disappear.

**Stage 7A timing:** activation floor counts, then the next completed floor, then one full Pawn recovery floor. The hooks count completed floors without a biome/boss exception. Death/abandonment ends activity and preserves applicable recovery; zero-charge activity is destroyed, not retained. Full campaign boundaries remain Stage 8 design work.

**Open ownership:** initial acquisition conditions; whether “corresponding boss” means identity or exact variant; attunement selection/switch timing; duplicate handling; full-inventory reward handling; charge count upon reacquisition; and whether reconstruction progress persists after death. Five activations is the confirmed consumable capacity; no refill mechanic is specified.

Future rules should represent inventory ownership, charges, active duration, global recovery, and reconstruction progress explicitly so none can be bypassed through equipment changes or saving/loading.

## Art and presentation

Stylized, charming, minimalist **low-poly isometric miniature worlds**. Use chunky floating terrain, flat-shaded geometry, restrained palettes, clean silhouettes, and playful character animation. Preserve the tiny Pawn and its red katana as the visual anchor.

**PAWNRIFT** is the official title in the title screen, HUD, browser tab, and documentation. Use clean, elegant typography with the supplied Space Mono font. No taglines, slogans, marketing phrases, or decorative text. Terrain uses two muted sage/olive and deeper moss/stone green colors, alternating by global `(row + column) % 2`. The pattern stays visible but dim/desaturated in remembered terrain and hidden in unexplored cells. Preserve the moody lighting, teal sidewalls, darkened star background, Pawn silhouette, and fixed camera.

Stage 5.5 framing targets a 28% closer desktop view, capped by the actual floor's terrain/prop bounds plus a roaming character envelope and label margin. It does not depend on fog or follow the player. Wide desktop Canvas layout uses empty HUD corners; smaller screens reserve HUD rows and favor fitting the complete floor. The fixed isometric angle, bounded smooth wheel zoom, and world/grid dimensions remain intact. Left action controls use keycap–function labels matching the right-side hints.

Avoid photorealism, generic AI-generated fantasy aesthetics, and excessive clutter. Obstacles, reachable tiles, threats, treasure, alignment, and fog must remain legible at board scale. Follow the **user-supplied low-poly isometric reference**, the later muted palette, and the supplied darkened star background.

## Technical architecture

Confirmed stack: **TypeScript, React/Vite, Three.js / React Three Fiber, Zustand, Vitest**. Local saved progression; no multiplayer.

- **Rules:** pure TypeScript movement, collision, sight, perception/pathfinding, cards/deck cycling, and explicit turn resolution; no React or Three.js dependencies. Future dice, alignment, transformation lifecycle, and progression extend these rules.
- **Generation:** seeded board generation and validation. Route all gameplay randomness through an explicit seeded source; rendering must not consume gameplay randomness.
- **Application state:** Zustand coordinates rule state and player commands. React handles menus/HUD; React Three Fiber renders the board and characters from rule state.
- **Persistence:** a versioned local save for confirmed permanent progression, transformation ownership/charges, and any later-approved persistent fields. **Open:** mid-run saving, autosave timing, and recovery from invalid saves.
- **Verification:** Vitest for deterministic rules and generation invariants, alignment majorities, transformation timing/depletion/reconstruction, and save round trips. Verify visual readability separately once implementation is authorized.
- **Static deployment preparation:** Node 24, Vite base `/`, `npm run build` → `dist`, Cloudflare Pages production branch `main`. No backend or Workers. Lockfile and local assets remain in version control; dependencies/output/secrets are ignored. The standing user instruction authorizes publishing completed, verified updates to GitHub and Cloudflare Pages.

These are responsibilities, not a requirement to create a large framework or finalize a directory tree now.

## Minimal playable vertical slice — proposed

Before full content production, validate **one biome's six-floor loop**: five small regular boards with alignment choices and one boss floor with the majority-selected variant. Use Chimera Knight and its Light/Dark variants as the **provisional** first boss. Use placeholder low-poly visuals, a small explicitly defined card pool covering the four card roles, and the minimum enemy roster needed to test tactics.

The slice must demonstrate seeded 8×8 generation, alternate routes, obstacles, treasure, one-tile fog, unified player-driven combat, a small approved card pool, both alignment outcomes, a walkable lobby with essence display, and local persistence. Optional 2d6 decisions may be added only after their role is approved; they must not gate base movement/attacks. Include one boss-form consumable type with shared Light/Dark charges and the complete lifecycle rules; the inventory still supports two slots.

Use focused rules tests or developer scenarios to verify five-charge exhaustion, recovery, death retention, and two-win reacquisition without requiring a long manual playthrough. Do not build all biomes, the full card catalog, boss rush, Mirror, or King for this slice.

**Exit criteria:** a player can finish the six-floor loop; the same seed and commands reproduce rule outcomes; both majority branches select correctly; the essence survives death/reload; transformation rules pass verification; and the board remains readable. Any unresolved rules needed by these criteria must be decided explicitly before they are implemented.

## Milestones and decision gates

1. **Planning — completed:** initial GDD and repository guidance, followed by foundation, visual board, Pawn movement/polish, procedural dungeons/fog, and Stage 5 player-driven combat/branding. Optional dice/card rules and transformation lifecycle ambiguities remain unresolved.
2. **Core rules — through Stage 7A:** seeded generation/fog, fresh normal-run seeds, synchronized combat/cards, transformation lifecycle/movement/abilities/retention and readable tooltips/HUD. Model redesign (7B), tutorial (7C), full progression/random starter selection (8) and persistence (10) remain separate authorized stages.
3. **Playable slice:** build the six-floor loop above, presentation, lobby, and local saves; playtest and revise provisional balance.
4. **Main content:** expand to four biomes, all eight variants and essences, approved card/enemy content, and transformation forms. Confirm replay progression supports collecting every essence.
5. **Endgame and polish:** implement the eight-variant boss rush and Mirror; tune progression and readability. King remains a separate late-postgame decision.

All unspecified balance numbers remain **provisional**, including health, damage, movement/action budgets, card counts/costs, reward amounts, spawn rates, and difficulty scaling. The confirmed counts and durations stated above remain fixed unless the user changes them.
