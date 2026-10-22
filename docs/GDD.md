# PAWNRIFT — Game Design

This document records confirmed design and a proposed delivery plan. Implementation is authorized through **Stage 7B.2: deliberate character/enemy inspection and minimal HP bars**, preserving Stage 7B.1 presentation and existing combat rules. Stage 7C tutorial, Stage 8 progression/randomized deck composition and Stage 10 saving are future work. Publish verified updates to GitHub and Cloudflare; directly deploy the tested build if it is not live. **Provisional** balance needs playtesting. **Open** design is not permission to invent later systems. Basic movement and attacks never require dice.

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
- The red katana defines Pawn's visual identity, worn sheathed at its left hip. Pawn moves one orthogonal tile per accepted click or WASD/arrow keypress; obstacles, occupancy, missing cells, and board bounds block movement. Pawn basic attacks reliably hit one living orthogonal neighbor in current sight, subject to terrain and clear sight. Health/damage values are provisional.

### Tactical rules to settle

The base action economy is confirmed: one valid action advances one synchronized turn, independently of dice. Future dice use (individual values, sum, allocation, timing windows) and card interactions remain **open**.

Stage 6 settles the starting deck, hand, and resource timing below. **Open:** deck growth, rewards, upgrades/removals, persistence through death, and future dice/card interactions. Damage, individual card costs, and effect strengths remain provisional.

### Stage 6 cards and combat feedback

- Start with **12 cards**, a **4-card hand**, and draw/discard piles. Each physical card has a stable instance ID separate from its typed definition. A floor seed determines the initial shuffle and every subsequent reshuffle; rendering never consumes that randomness.
- After a valid play, discard that instance and immediately draw to four. If a draw is needed and the draw pile is empty, shuffle the entire discard pile, including the just-played card, using the next deterministic shuffle index. Basic actions do not draw or discard. Unplayed cards remain in hand.
- Start at **3 energy maximum** (configurable). Validate and spend the full cost before the effect; recover **1 energy once at world completion**, capped at maximum. Regeneration cannot make an unaffordable card playable. Cost-1 cards therefore have zero net energy change after completion; cost-3 cards leave 1 from a full pool. Basic actions also recover 1; energy never resets to full per action.
- Every valid card consumes one world turn and receives exactly one response per surviving eligible enemy. Invalid targets, unaffordable plays, inspection, selection, and cancellation change no resources, cards, or time. Existing phase/action-ID guards apply to cards too. Basic actions always remain available.
- Damage cards target one currently visible, living neighbor in any of eight directions with clear sight and no blocking terrain/occupancy. Slip uses ordinary one-tile Pawn movement into a currently visible unoccupied cell; it never jumps obstacles or reveals hidden contents. Self cards require an applicable effect: Mend at full HP and Focus at its cap are invalid.
- **Provisional starter composition and effects**, centralized in `src/data/cards.ts`:

| Card | Copies | Cost | Effect |
| --- | --- | --- | --- |
| Cut | 3 | 1 | Deal 4 to an adjacent foe |
| Ward | 2 | 1 | Block a total of 3 during this enemy response |
| Riposte | 2 | 1 | Block a total of 1; counter the first actual strike for 4 |
| Slip | 2 | 1 | Move one clear orthogonal tile; block 1 this response |
| Focus | 1 | 0 | Gain 1 Focus, capped at 3; each point adds 1 to the next basic/card/signature strike, then all are consumed |
| Crimson | 1 | 3 | Deal 7 to an adjacent foe |
| Mend | 1 | 2 | Heal 4, capped at maximum HP |

- Card block is a shared pool across incoming strikes; block and prepared counters expire after the coming response, even if foes only telegraph or miss. A prepared counter requires a real strike and a surviving Pawn, and triggers once. Basic Q guard/counter retains its existing behavior. Focus persists until a successful strike or run reset.
- The compact bottom hand sits in reserved screen space below the Canvas. Click to inspect/select; click a highlighted foe/tile to target, or use Play for self cards. Cancel/Escape is free. Names, costs, effects, playability, energy, Focus, and pile counts remain readable. Normal controls can still submit basic actions.
- Player HP has a muted crimson bar plus current/max numbers. Living enemies expose compact bars only in current sight, including under debug reveal. Stable event IDs drive damage/healing/BLOCKED values that rise/fade, stagger per recipient, expire after 850 ms, and are capped at 12 concurrent indicators. Labels follow recipients and obey current sight. Pawn recoil and the existing enemy hit flash provide restrained feedback; no attack animation is implemented.
- Defeat and fresh-run/same-seed floor reset preserve their existing semantics and reset deck, resources, targeting, and event IDs atomically. There are no card rewards, upgrades, removals, saving, transformations, Light/Dark modifiers, dice effects, or synergies yet. Definition/instance separation and the discriminated effect/action types provide extension points without implementing those systems.

### Stage 6.1 card presentation and help

The upper-right **Playtest Tools** are available in production: seed input, layout selection, generation from that seed, and a fresh-dungeon button. The always-visible **Test forms** shortcut opens this exclusive panel directly to transformation grants before seed controls; its contents scroll with a sticky heading. Grant/activation feedback explains carried-item, busy, slot and recovery restrictions. Stage 7B replaces ordinary-form Pawn placeholders with distinct humanoid models. Regeneration resets the temporary encounter through the existing atomic reset. The user subsequently authorized all current testing tools publicly, including terrain reveal and transformation tests. Terrain reveal never changes exploration memory or exposes hidden enemies.

The floating-hand update supersedes the earlier card justification preference: compact card descriptions use left-aligned natural wrapping, a readable proportional body font, and bold numerical effects/keywords. Longer explanatory prose may be justified; headings, labels and Energy indicators retain deliberate alignment.

The hand is a centered collection of individual portrait cards targeting a content-aware 3:4, with distinct geometric emblems, category accents, subtle borders/shadows and 150 ms hover/focus emphasis. Its positioning layer is transparent and passes unrelated clicks through; only the card track and compact resource/targeting rows accept input. Small or large hands retain intrinsic sizing and use horizontal scrolling when constrained. Wide desktop controls flank the hand; narrower layouts reserve a separate controls row. Measured hand height keeps the board/context panels clear. This is presentation only: selection, targeting, costs, draw/discard and world turns are unchanged.

Stage 6.1 adds presentation only: Attack/crimson, Defense/steel blue, Mobility/desaturated teal, and Utility/violet category symbols and labels; a shared lightning-shaped Energy icon on cards and HUD; explicit typed keyword tokens; and one central glossary for Energy, Block, Focus, Counter/Riposte, Draw, Discard, Damage, and Healing. Hover, keyboard focus, or tap explains a term; Help lists the same entries. Tooltips sit above the HUD, clamp to the viewport, scroll for long content, remain readable while hovered/focused or pinned by tap, and dismiss with Escape/outside click. Dismissal does not click through or consume an action. Card selection and keyword controls are separate semantic buttons. Smaller hands scroll horizontally instead of shrinking type. No effect, deck, energy, movement, damage formula, AI, fog, generation, or Game Over rule changes.

Descriptions now explicitly name damage/targets, who receives healing, and temporary protection. The glossary clarifies that a response includes all eligible enemies, unused Block and Riposte expire even without an incoming strike, Riposte requires survival and triggers despite full blocking, Focus does not increase counters, and used cards can return immediately on a reshuffle. These clarify existing behavior rather than changing it.

### Stage 7A transformation gameplay

- Implemented forms are Pawn, Knight, Bishop, Rook and Queen. King/Mirror stay reserved. Forms are consumables, never cards. No bosses, essences, full progression, persistent saving or model redesign are added here.
- A confirmed activation spends one shared charge and one world turn, then surviving enemies respond. Inspection/cancel/invalid activation are free. One form at a time; two distinct carried identities maximum. Light/Dark must be unlocked before activation and cannot switch mid-duration. Unlocking another attunement never refills charges.
- An activation lasts the activation floor plus the next floor. The completed-floor hook alone decrements duration; normal actions never do. After the second completed floor, return to Pawn for one full global recovery floor. New Run/reseeding aborts an active form, starts recovery, and never counts as a completed recovery floor or refunds a charge. Runtime floor transitions are hooks/development simulations only; full progression waits for Stage 8.
- Zero charges still allow the final two-floor activation. When that activity ends (including death/abandonment), remove the item and track reconstruction separately. Two subsequent wins over that boss **identity**, across either variant, reconstruct on the first and reacquire on the second. Reacquisition capacity is 5; if inventory is full, retain ready-to-claim eligibility without requiring a third win. These ownership/abandonment choices are **provisional Stage 7A interpretations**, not a new boss/reward system.
- Death requires explicitly retaining exactly one eligible carried item with positive remaining charges. Keep those charges and applicable global recovery; lose the other item. Zero-charge activity is not retainable and ends on death. With no eligible items, skip selection. Restart/Play cannot bypass a pending choice. Reconstruction progress survives in memory; refresh clears all current in-memory progression. Voluntary New Run preserves positive-charge carried items/reconstruction but ends active duration and preserves recovery; no refill/reset exploit.
- **Stage 7A.1 movement:** Pawn walks one orthogonal tile. Knight now walks one orthogonal tile or L-leaps over intervening obstacles, fixing strict-L corridor traps. Only explicitly marked flat low blocks (current height 0.475, maximum 0.5) support perching; trees, tall walls and rounded rocks do not. Landing requires an unoccupied perch and at least one safe adjacent dismount. Walking off costs one turn. Enemies approach adjacent cells and can telegraph/hit the elevated Knight; perching grants no invulnerability. Bishop slides diagonally and may walk exactly one orthogonal tile as a free-of-Energy fallback; it does not activate signatures. Rook slides straight and Queen either way. All slides reach the full clear lane (maximum 7), requiring every traversed cell and destination to be currently visible, traversable and unoccupied. No direction changes or automatic attacks. Normal one-tile sight generally limits practical slides to one tile; remembered terrain/debug terrain reveal does not extend sight. Existing temporary Astral Eye sight may permit longer clear lanes without changing its rules. All accepted moves cost one world turn and one enemy response; invalid input costs none. Bishop WASD/arrows walks, Shift selects diagonals; clicks select full legal lanes. The 5x5 schematic uses primary-color diamonds for slides and secondary-color circles for walking.
- **Controls and previews:** Knight WASD/arrows walk; Shift+key selects four L-jumps, and clicks permit all eight. Bishop keys select diagonals; Queen Shift selects diagonals. Preview uses remembered terrain/currently visible occupants only, with faint geometric attempts into unscouted terrain. Actual moves validate full collision without spending a turn on failure. A schematic 5x5 mini-board explains each form without claiming map-specific legality.
- **Basic combat, provisional:** Pawn 3 damage to one orthogonal neighbor; Knight 3 up to 2 clear straight tiles; Bishop 2 to one of eight neighboring tiles; Rook 4 to one orthogonal neighbor plus 2 temporary Block; Queen 3 to any adjacent tile. Light adds 1 transformed basic damage; Dark adds 1 basic Block. Basics cost no Energy. Rook specializes in defense; Bishop in information, Knight mobility and Queen groups. Focus boosts the first damaging basic/card/signature strike once, never counters. Cards retain their existing targeting/effects in every form. Normal Q Defend remains independent of signatures.
- **Voluntary Return to Pawn:** explicit confirmation costs one world turn and receives the normal response. No charge refund; remaining duration is lost. A perched Knight lands on the first safe adjacent tile in deterministic N/E/S/W order; refuse without mutation if none exists. One full *subsequent* Pawn floor is required: completing the partially transformed current floor only starts that recovery floor. Recovery is global. Zero-charge items are destroyed immediately when voluntarily ending activity, with reconstruction tracked normally.
- **Compact presentation:** current form/attunement, charges, duration/recovery, signature status and confirmed Return to Pawn. Forms, Moves and testing tools share one exclusive expandable panel with internal scrolling, measured header/footer/hand clearance and a reserved desktop Canvas sidebar. Ordinary help triggers only from keywords/info buttons after 300 ms hover, immediately on focus/tap; one tooltip, viewport/controls-aware placement, Escape/outside dismissal, and free inspection. Detailed mechanics live in Help. Semantic text colors meet 4.5:1 against panel/background (attack uses the existing brighter contrast-safe crimson). No body/weapon redesign or world recoloring.

#### Stage 7A.1 signatures

Each successful signature is one synchronized world action with **no Energy or extra transformation-charge cost**. Its cast response does not decrement the newly applied cooldown; subsequent valid completed turns decrement it once, including reversion/activation. Cooldowns persist across real floor hooks. Invalid attempts, inspection, targeting and cancellation are free; phase/action-ID guards reject duplicate input. New runs reset temporary signature state. Values not fixed by the brief are provisional and centralized in typed balance data.

| Form / signature | Limit | Effect |
| --- | --- | --- |
| Pawn - Crimson Reversal | 5 turns | Negate one eligible marked incoming strike this response; counter for a provisional 5 damage at clear orthogonal range 1 if alive. Expires after that response even without a strike. Normal Q remains usable independently. |
| Knight - Vaulting Charge | 7 turns | Legal L-leap plus clear straight lance thrust, range 2, as one action; both landing and currently visible target required. Light: base 3 + 2 damage; Dark: base 3 and 3 temporary Block. Valid designated perches allowed. |
| Bishop - Astral Eye | Once per actual floor, shared Light/Dark | Seeded weighted choice among in-bounds 4x4 regions containing unexplored terrain, weight unexplored-count squared; independent of objectives/entities. Cast response and next response provide the two completed-turn visibility window. Terrain is remembered; remote entities/statuses disappear afterward. Fully explored floors disable it for free. Light: newly discovered foes Exposed, next eligible received attack +2 once, expires after provisional 3 subsequent turns. Dark: one next planned response shown for currently revealed foes; hazards will be identified when a hazard system exists. |
| Rook - Iron Bastion | 9 turns | Light 4 Block + first eligible adjacent retaliation 5; Dark 8 Block + retaliation 2. One retaliation maximum; survival and clear range 1 required. Block/retaliation expire after this response, used or not. |
| Queen - Dread Sovereign | 10 turns | Visible enemies in centered 3x3 take Light 7 / Dark 4 damage. Visible foes within provisional Manhattan radius 3 receive Fear for one response: valid retreat away, otherwise hesitate; cancel pending strike. Boss flag resists Fear (no bosses implemented). Dark additionally weakens the next actual strike by provisional 1. No dungeon-wide control. |

Astral Eye uses a separate deterministic stream derived from floor seed, current turn and sorted explored cells; it consumes neither layout nor deck randomness. The real completed-floor hook resets Eye and temporary reveal once, preserving cooldowns. No enemies, treasure or hazards are fabricated for the reveal; only current Rooklings exist. Fear/Exposed are bounded rule state, never permanent remembered entity markers. Dark weakness lasts until the next real strike and does not stack.

- **Public testing tools — explicitly authorized after Stage 7A:** grant/unlock either attunement, test normal activation, inspect charges/reconstruction, simulate a completed floor or boss win, force death for retention testing, and reveal terrain. The same toolbox is available locally and on Cloudflare; no development-only gate. Grants still respect two slots, shared charges and reconstruction; activations use normal turn resolution. Simulations require a ready living run and do not add automatic campaign progression. Until bosses/rewards exist, obtain forms through these public grants.

### Stage 7A.3 reliability and public playtesting

Baseline audit: among 1,000 generated encounters, 940 had fewer than two safe starting moves and 43 had none. The farthest-node spawn heuristic selected dead ends, and enemy placement could occupy their sole exit; existing connectivity tests did not include this occupancy constraint. Separately, closing HUD controls left focus inside keyboard handlers, swallowing movement. Repair both rather than weakening fog.

Generation retains four procedural styles, 64 tiles, loops/branches/dead ends and global checker parity. Choose a connected spawn with two existing orthogonal exits; keep initial enemies at least two Pawn steps away. Validate grid bounds, unique tiles, connected Pawn routes, spawn/exit/reservations and exact prop/collision/sight classifications after placement. On failure, deterministically repair anchors/routes/props; retry with at most three derived attempt seeds, then use a guaranteed connected fallback. Record recovery metadata for diagnostics. Normal New Run/Restart uses a fresh master seed; floor 1 uses that seed, later floors derive `master:floor:N:layout`. Layout, shuffle and Astral Eye streams stay independent. This adds floor-seed hooks, not campaign progression.

**Playtest Tools** are intentionally public and collapsed, with expandable Transformation, Combat, Dungeon and Map Diagnostics sections. Grant/unlock normally; explicit test controls can replace an inactive carried slot, refill charges, set 1-2 remaining floors, clear recovery, safely return to Pawn, reset individual/all cooldowns and Eye use. Combat tools spawn only valid currently visible unoccupied Rookling cells, clear enemies, and restore player HP/Energy/Focus. These overrides are distinct from ordinary gameplay, cost no turn, refuse during pending responses and mark a test session. Normal activation still costs one charge and one turn. No hidden enemy state or HP is printed; no credentials/server privileges/saves exist. A single public prototype flag can disable tooling for a future release; keep it enabled now.

Regeneration resets encounter entities, event/targeting state and fog while preserving carried transformation state, HP/Energy/Focus, deck, world turn, cooldowns and Eye usage. It never counts as a floor completion. Explicit actual-floor simulation runs the existing lifecycle hook once, derives the next seed and resets floor-only sight/Eye state. Copy/replay floor seeds and fresh test layouts use the same generator.

Map Diagnostics reports master/floor seeds, coordinates/tile type, walkable and spawn-reachable counts, known Pawn/form destinations, required-route connectivity, validation causes, generation recovery and opt-in rejected-input reasons. Explicit overlays mark walkable/blocked/void/reachable/legal/spawn/destination terrain; current 64-tile floors contain no void. Pawn/Knight unscouted moves are tentative and hidden occupancy stays undisclosed. Bishop/Rook/Queen slides show only clear currently visible lanes. Reveal/overlays do not alter exploration memory or show unseen entities. Closing Forms, Moves, Help or Tools restores game focus; open contexts/modal Help block underlying world input. Full Help uses categorized, justified prose in a dedicated modal with Close/Escape; short card effects stay left-aligned with bold values and unchanged mechanics.

### Stage 7A.4 combat passives and public King preview

This stage supersedes the preceding universal-adjacency basic attack rule. Cards keep their independent targeting; ordinary basics choose one primary foe. Pawn/Rook attack orthogonally at range 1, Knight orthogonally up to 2 through a clear lane, Bishop/Queen/King attack any neighbor at range 1. All require a living, currently visible target on valid clear terrain with sight/occupancy checks. Chess movement, signatures and enemy HP/statistics are unchanged. Attack and movement mini-boards are separate; eligible foe rings are crimson, movement markers teal.

| Form / passive | Confirmed behavior |
| --- | --- |
| Pawn / Sharpener | Existing floor stacks add a separate follow-up to a basic (cap 5). Grant one stack after that valid basic resolves, including a mitigated hit; never grant from the follow-up. Direct damaging cards and Crimson Reversal's eligible counter gain a separate bonus capped at 3; ordinary guard/Riposte counters are not eligible skills. No bonus to other forms, non-damaging skills or DoT ticks. |
| Knight / Sky Piercer | Orthogonal basic reach 2, with no intervening blocker/enemy. Ignore `floor(defense * 0.10)` flat mitigation; Block still absorbs. Optional defense/Block fields support fixtures and future stats; current enemies receive no new stats. |
| Bishop / Swish | Each basic splashes 1 to at most two other currently visible living neighbors of the struck tile, stable ID order, with solid-corner/sight/terrain/occupancy checks. No chaining or automatic Burn on secondary targets. Opposite global checker parity between Bishop and primary victim applies Burn, independent of attunement. |
| Rook / Stun Strike | One non-resettable Concussion countdown per living victim. Normal/elite/boss gets 1/2/3 eligible responses including the application response, then skips exactly one. Afterwards immunity blocks new applications for 2/3/5 subsequent turns. No queued stuns; counters/retaliation do not apply it. An uninterruptible transition pauses response opportunities/countdowns; no new boss AI is implemented. |
| Queen / Severance | Basics add one independent Bleed stack, cap 3. Each deals 2 on its next three completed world turns; at cap do not add or refresh. Signature hits never apply it. |
| King / Smite (test only) | Each valid offensive action gains +2 before damage, capped +10, once per action across basics, damaging cards, Royal Decree and eligible direct counters. Share one total bonus budget across AoE targets in stable order (quotient/remainder); multiple counters spend it once, in response order. No growth from DoTs. Every third basic attempts one safe outward push; bosses/uninterruptible enemies resist. |

Passives cost neither Energy nor extra turns. Their core values are identical for Light/Dark; generic attunement bonuses apply only to existing basics, not passive damage. Focus and Exposed remain single-use direct-hit modifiers. A valid, positive attack against a living eligible victim counts as a hit even when mitigation absorbs its damage; follow-ups do not activate new passives or counters. Flat defense is consumed once across main/follow-up components, then remaining Block is spent in order; each displayed number is actual HP damage and reports absorbed Block when relevant. A defeated primary receives no follow-up. DoTs use the same mitigation calculation per tick without consuming Exposed.

**Resolution order:** validate without mutation; resolve all direct components/passives atomically; update sight; present the player action; for each living enemy in stable order, tick due Burn/Bleed once, stop that enemy if defeated, resolve Concussion/stun/immunity, then its permitted response. Death stops all later responses/ticks and cancels pending King shockwaves. If alive, resolve a pending Royal Decree after the complete response. Finish existing bounded statuses/cooldowns, terminal checks, Energy recovery and exactly one world-turn increment. Invalid input, inspection, menus and public overrides never tick anything; existing action-ID/phase guards survive suspension/resume.

Burn deals 1 on each of two *subsequent* responses, never on application; refreshing replaces its duration and defers its next tick until after that new application action. Bleed stacks each store their own application turn and remaining ticks (3); no shared expiry or per-enemy-loop duplication. DoTs still tick on a stunned/Fear/uninterruptible enemy's world boundary; Concussion counts only interruptible response opportunities. All statuses clear on enemy death. Terrain memory/debug reveal never displays hidden enemy status, HP or damage events.

Sharpener survives temporary form changes and encounter regeneration, resets on actual floor entry, death and New Run. Smite and its basic-attack cadence last one King activation, carry across its first floor transition, and reset on expiry/reversion/death/new activation. Encounter regeneration does not refill passive resources or transformation charges. Player death/restart clears all temporary state.

**Presentation:** Pawn basics use a provisional 620 ms grip/quickdraw/slash/resheathe sequence, small crimson trail, main number at 170 ms and Sharpener follow-up at 430 ms. All damage belongs to the accepted action; no response between components. R3F frames only present results. Damage/status cues and number lifetimes are bounded, compact and visible-only. HUD shows one passive keyword and relevant counter; deliberate shared tooltips give details. Public Combat testing can reset passives/Sharpener, apply/clear individual visible-target statuses, inspect separate Bleed lifetimes/countdowns, clear immunity, advance a real turn or reset an encounter.

**Explicit King exception:** the owner requested King in public Test forms despite the attached brief's postgame-only restriction. Test King uses normal five-charge/two-slot/duration/recovery/retention guards and the shared Pawn placeholder, with provisional basic 4, one-step eight-direction movement, Smite, first-direct-hit Royal Poise mitigation 1 and no basic cleave. Royal Decree retains the documented 5x5 inner/outer Light 12/6 or Dark 9/4 damage, 8-turn cooldown and full response during wind-up; Dark attempts safe outward knockback. Smite is one shared budget, not a bonus per target. There are no incoming player knockback sources yet; ordinary knockback resistance remains a future integration requirement. No King boss rewards/acquisition or postgame progression; an explicit test-eligibility override permits granting a destroyed test King again without changing ordinary reconstruction rules. Full King model/animation remains deferred.

### Stage 7B characters and Training Grounds

Stage 7B delivery below is retained as context. Stage 7B.1 supersedes its King exclusion and earlier normal-run King testing access.

Five ordinary forms share an articulated humanoid rig with distinct silhouettes: Pawn's faceted round helm, traveler plates/sash, ragged half-mantle and left-hip crimson katana; Knight's horse visor/mane and athletic armor; Bishop's split mitre and vertical robes; Rook's battlement helm and broad fortress plates; Queen's pointed crown and asymmetric royal cloth. All occupy one logical cell. Muted ivory/gold Light and slate/violet Dark share core rig geometry but change equipment: lance/spear, staff/book, greataxe/hammer and claws/knuckles. No Rook greatsword or Queen sword. The existing King prototype remains outside this redesign and outside training; no King model, unlock or ability is added.

Shared module-level low-poly geometry/materials and named body/arm/leg/weapon pivots support idle, steps/glides, Knight leap/perch, basic attacks, signatures, defend/parry/counter, recoil, transform/revert and death poses. Pawn grips, draws, slashes and resheathes before the separate 430 ms Sharpener impact. Timed presentation uses action IDs/events; no mesh frame changes rules. Presentation durations and impact delays are centralized/provisional. Old equipment unmounts on switching; GPU resources remain shared/bounded. Reduced motion suppresses idle sway, bob/jump, large turns and pulses. Camera angle, fit, wheel zoom and grid coordinates remain unchanged.

**Training Grounds** is an isolated public 8x8 arena entered from Playtest Tools and left through a persistent Leave Training button. Reuse muted checker tiles/floating teal terrain and a few corner stones. Ordinary scenarios explicitly grant full **training** sight for full-lane tests; Eye uses normal fog and actual seeded, once-per-floor Astral Eye. Blocked/perch scenarios supply designated solid geometry. Normal dungeon sight/generation never receive this exception. Pawn and the four ordinary transformations can be equipped freely in either attunement. Actual attacks/cards/signatures retain their normal costs, targeting and cooldowns. No King choice, new biome, lobby, reward or progression.

Entry deep-clones every non-function store field at a ready boundary. Leave replaces all data from that snapshot, including optional/absent fields, deck/shuffle state, seeds, fog, enemies/statuses, resources, form/attunement/charges/duration/recovery, Eye/cooldowns/passives and targeting. Only the callback token changes monotonically to reject stale events. Leave may cancel an unfinished training action; Main Menu restores the run before suspending it. Real floor/progression hooks are unavailable in training. Training defeat offers reset/leave, not real retention. Training writes no saves; refresh returns to ordinary title initialization (persistent real runs remain future work).

One to three wooden dummies are real combat entities. Configurable HP defaults to **provisional 1,000**; exact defense/initial Block, Normal/Elite/Boss resistance class, allowed knockback and validated coordinates are editable. Passive dummies receive one counted no-op response; sparring dummies stay planted and use the existing orthogonal telegraph/strike, defense/parry/retaliation path. All existing statuses work; no boss AI or production enemy-stat changes. Reject invalid, overlapping, blocked/out-of-bounds placement and reviving under the player. Comparison reset restores configured targets, resources/deck, passive/status state and analysis. Free controls also restore HP/Block, cooldowns/Eye, charges/recovery, resources/deck, clear statuses/stacks or reposition the player; Advance explicitly spends one real training turn. Controls remain collapsed in the exclusive HUD sidebar.

**Combat Analysis** consumes engine-authored impacts: source, base, Focus/attunement/passive/skill values, Exposed, defense applied/penetrated, absorbed Block, overkill and actual HP damage. Sharpener/Swish remain separate impacts; each Bleed tick records independent stack lifetimes and raw/effective contributions. Additive passive contribution is attributed after non-passive damage through the same mitigation/HP clamp, never estimated in React. Resolver completions update observed HP damage, basic and card/skill/counter totals, the direct-passive subset, DoT, Block/overkill, incoming HP/Block, offensive/action counts and **DPT = observed HP damage / completed turns since analysis reset**. Labels identify overlapping subsets. The chronological log is capped at 80 events independently of totals; clearing it preserves statistics. Only seen events and currently visible target statuses appear, including in Eye scenarios.

Automated isolation, dummy/class/status/targeting, damage/DPT, interruption/reduced-motion and four desktop projection checks accompany existing tests. Actual model appearance, animation feel, pixel readability, clipping and live FPS require browser inspection when connected; projection checks do not certify visual QA.

### Stage 7B.1 visual refinement and training King

The measured floating hand now reserves ~200 px rather than the prior ~300 px (actual measurements remain responsive). Default cards are ~100–112 px wide and 150 px high, with full-effect summaries. Hover, keyboard focus or touch enlarges the same face 1.6x upward over the board; fixed-size slots never reflow. A viewport-clamped fixed face escapes the horizontal scroll clip, retains interactive keyword tooltips and resets on leave/blur/outside/Escape/action/floor changes. Targeting and resources stay accessible; no card costs or deck rules change.

Camera fitting targets **78% terrain width** when height permits, bounded by the entire terrain, raised props and roaming head/weapon envelope. Compact hand sizing and reduced top/bottom padding reclaim height. Desktop HUD occupies the corners over a taller Canvas, with a small left inset balancing its width; the empty top-center area is usable world space. Narrow windows keep the measured separate HUD row. Short/wide windows remain height-limited rather than clipping required cells to meet a width quota. Fit is independent of fog/current form/position. Inspection panels overlay the paused playfield without shrinking it. Resize/floor-fit updates and manual wheel zoom interpolate; fixed isometric angle and grid/world coordinates are unchanged.

World enemy labels contain only name, HP/max HP, thin bar and compact status symbols/counts. Small camera-projected upward offsets separate crowded labels; overlays ignore pointer events. **Inspect foes** provides current-sight-only classification, defense/Block, intent/foresight and status durations; Dummy Settings/Combat Analysis remain available. No remembered/hidden entity labels or HP are exposed.

All forms gain reusable silhouette profiles, layered breast/knee/shoulder/waist armor and brighter separated metal. Pawn retains faceted round headwear, a folded volumetric ragged half-mantle and left-hip sheath; the drawn crimson blade follows the actual hand joint and retains the existing one-turn iai/Sharpener sequence. Knight gains muzzle/cheek plates and layered animated mane, a thicker wrapped shaft and profiled lance/spear head. Bishop has front/back split-mitre plates/band, structured robe shoulders, ring/gem staff and cover/page/spine book details. Rook gains corner crenellations, visor/cheek plates and broad profiled greataxe or reinforced striking-face hammer. Queen has a layered pointed crown, armor/fabric panels and separated broad claw blades or reinforced knuckles. Light/Dark equipment and protective shapes remain distinct; resources are shared, no new lights/assets/dependencies.

**King is now selectable only in Training Grounds**, using the existing resolver, dummies, isolation and analysis. Normal tools omit King; store grants/replacement overrides, activation and signatures reject normal-run King access. There is no story unlock or acquisition. Training Iudicium has a taller tiered crown, broad regal plates, mantle and a ridged, pointed greatsword with distinct guard/grip/pommel in both test attunements. This requested training weapon supersedes the Dark dual-sword concept for the prototype only; postgame production design remains open. Heavy swings, bracing and a bounded post-response Decree wave use existing action IDs; reduced motion suppresses the wave. Ordinary fog scenarios retain seen-hit effects instead of a whole-arena wave.

King retains adjacent eight-direction one-tile movement/single-target basics, provisional baseline 4 plus existing attunement modifiers; Smite +2 on successful offensive action, newly earned bonus applied, cap +10, one shared budget across targets/hits, no DoT gains. Every third basic attempts valid outward displacement; selecting Boss resistance disables dummy knockback unless explicitly re-enabled. Royal Poise reduces the first eligible direct hit per response by provisional 1; no enemy presently applies player knockback, so player displacement resistance has no live attack to exercise. Decree remains cooldown 8, one activation turn, ordinary enemy response then visible 5x5 hits: Light 12/6 inner/outer, Dark 9/4 plus eligible displacement. Defeat cancels its wave. Form changes reset Smite and its spending token; leaving training restores the complete original run.

Automated coverage includes King restrictions/isolation, Decree ordering/damage/analysis, Smite cap, Poise, movement/displacement, expanded-card bounds, label crowding/fog and camera/character projection at four requested desktop sizes. Actual rendered silhouettes, hover/touch feel, HUD pixels/clipping and frame rate remain unverified while no browser is connected. No Stage 7C/8 content, ordinary combat rebalance, generation/fog change or dummy stat scaling.

### Stage 7B.2 deliberate inspection and minimal HP HUD

The current chess icon remains a constant-size HUD button for Pawn and all transformations, including training King; its Light/Dark accent updates with the form. Hover after 300 ms or keyboard focus uses the shared small tooltip for actual signature name, current-variant effect, configured cooldown/once-per-floor limit and availability. Leaving the icon dismisses this transient help. Clicking/tapping toggles live **left-side character information**, never an ability. Passive help remains separate; signature **Use**/confirmation/targeting retains its existing control and action guards.

Character information derives main basic damage/Focus, separate Sharpener/Smite forecast, range/directions, current/on-basic Block and implemented guarding/Poise from existing state/configuration. It shows the actual passive name/rules/counters, ability availability/restrictions, active item charges/duration and global Pawn recovery. No invented armor or other future stats. Damage is labeled before target mitigation/Exposed; full passive rules are expandable.

Every currently visible living enemy/dummy has only a **40×4px screen-space HP bar** above its head, with minimal dark backing, no visible text/status icons and no pointer interception. Normal enemy clicks toggle a single **right-side enemy panel**; another enemy switches selection. The panel shows actual HP, classification, defense/current Block, current visible intent and legitimate Foresight, status stacks/independent durations. Training targets additionally show configured class, behavior, HP, defense/initial Block and knockback setting. A current-sight-only selector offers keyboard inspection. No large enemy hover panel. Death/concealment clears selection immediately; rendering also filters sight/alive state, independently of debug terrain reveal.

**Click routing:** card targeting, a valid Knight/Queen/King signature target, or explicit basic-attack aim takes priority over inspection. Self/region abilities still use their own confirmation, not enemy clicks. **E/Attack** preserves its immediate single-primary-target behavior; **Choose target** freely arms a mouse basic attack, with eligible target rings and Cancel/Escape. Invalid targets inspect nothing, spend nothing and never fall through to movement. The first ordinary board click outside inspection dismisses it without moving; blank-space/Pawn clicks also dismiss. UI events do not fall through to the Canvas.

Inspection lives only in `src/ui/inspectionStore.ts`, outside run/training data and deterministic rules. It consumes no turn/resources, never pauses an accepted response, and clears at floor/session/menu boundaries. Both side panels may coexist at widths ≥1200px; narrower windows keep the most recently opened panel. Restrained fixed, scrollable overlays reserve measured header/footer/hand clearance, have explicit close controls/Escape/outside dismissal and keyboard focus management, and never resize the camera. Existing exclusive Tools/Forms/Help controls retain their guards. All Stage 7B.1 models, palette, camera, card expansion, mechanics and training-only King access remain unchanged.

Automated coverage verifies free inspection/toggle/switch, visibility/death cleanup, live selected data, combat target priority, invalid/no-fallthrough input, one response per action, configured stat previews versus real combat events, tooltip delay/routing, text-free HP markup and desktop/narrow panel policy. Existing four-resolution camera projection checks remain green; actual interactive/pixel/overlap/touch verification is unavailable without a connected browser.

### Run seeds and Stage 8 starter plan

The repeated first layout came from the fixed initial seed and Play resuming that initialization board. Initial state and first Play now use fresh cryptographic run-boundary seeds. New Run and Restart always choose fresh seeds; Resume preserves an existing living run, including pending enemy playback. Play after victory starts fresh. An explicitly entered seed/style remains reproducible and is passed unchanged into the generator; generation algorithms and seeded randomness are unchanged. The title distinguishes Resume from New Run.

**Planned for Stage 8, not implemented:** each starting deck totals 12 cards: 8 essential starters plus 4 chosen from a balanced starter pool. Normal runs should vary composition; a saved seed should reproduce the same selection. Use independent deterministic streams for dungeon layouts, starter selection and shuffle order, so changing one system cannot consume another system's randomness. Essential identities, pool balance and duplicate constraints remain open. Stage 7A keeps the existing fixed 12-card composition and seeded shuffle.

### Stage 5 turn and combat rules

1. Accept one valid action while ready; lock overlapping input.
2. Resolve the Pawn's action and immediate damage/defeats, then update fog.
3. After lightweight action presentation, resolve one action per eligible living enemy in stable ID order. Enemies killed by the player cannot respond; resolution stops when the Pawn dies.
4. Resolve bounded status durations/cooldowns after enemy actions; hazard systems remain future work.
5. Check terminal conditions, increment the turn once, finish response presentation, then restore player control.

Rendering never advances rules. The pure resolver is deterministic; Zustand coordinates explicit player/enemy presentation phases with action IDs. Stale or duplicate callbacks and rapid inputs cannot process extra turns. Menus suspend pending phases and invalidate old callbacks; resuming a living run finishes the pending response exactly once without skipping an enemy turn.

- **Attack:** E/Attack strikes one eligible visible enemy; Choose target then enemy click explicitly aims a basic. Unarmed enemy clicks inspect freely (Stage 7B.2). Basic eligibility depends on form: Pawn/Rook orthogonal range 1; Knight orthogonal range 2; Bishop/Queen/King all eight directions at range 1. Basics select one primary enemy; Bishop Swish explicitly adds its bounded secondary splash. Cut/Crimson independently retain eight-neighbor targeting. Sight, solid terrain, missing cells and occupancy constrain targeting. No accuracy roll; one turn. Explicitly eligible targets have small crimson rings; movement uses teal square markers. Ordinary melee never paints an area attack; Queen signatures retain their explicit area effects.
- **Defend/counter:** Q/Defend guards for the coming enemy response, reducing incoming damage and countering each real adjacent strike. Guard expires after that response. No counter on a missed strike.
- **Wait:** Space, period, or Wait advances one turn without movement.
- **Rookling:** one small chess-tower enemy archetype, currently spawned once per floor on a reachable unoccupied cell, normally its reserved cell. It detects through proximity plus wall-aware sight, pursues with occupancy-aware BFS, and remembers only its last observed Pawn position. After losing sight it travels there, searches briefly, then idles.
- **Telegraph:** an adjacent Rookling spends an action marking a strike tile. Its next action strikes that tile; movement can evade it, or guard can counter it. Enemies never act while the player is inactive.
- **Visibility:** enemy models, HP, and intent require current sight, even if terrain is remembered or debug map reveal is on. Simple hit flashes/rings and a short event line provide feedback. The Pawn model and sheathed weapon stay intact.
- **Defeat:** HP zero immediately stops the remaining enemy sequence and all further gameplay. One centered GAME OVER modal dims the visible scene. RESTART RUN generates a fresh seed and resets HP, enemies, turns, fog, and temporary state. MAIN MENU suspends playback and returns to the title; Play after defeat starts a fresh run. The navigation boundary may later route defeat to the lobby, but no lobby, progression, or death penalties exist yet.
- **Victory — provisional:** defeating the floor's enemies and reaching the exit clears the floor; no automatic floor progression yet. Victory's Restart floor resets the same seed, enemies, and fog.

All Stage 5 balance is **provisional**, centralized in `src/data/combatBalance.ts`: Pawn HP 12, katana damage 3; Rookling HP 6, strike damage 2; guard reduction 2, counter damage 2; detection Manhattan radius 4; search 2 turns. Presentation delays (240 ms player / 220 ms enemy) are provisional and do not create autonomous world ticks.

Stage 7A implements Pawn, Knight L-jump, Bishop diagonal slide, Rook orthogonal slide and Queen combined slides through shared movement predicates and fog-safe previews. Each completed movement costs one world turn regardless of distance. King one-tile movement is available only as the explicitly requested public test preview.

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

Stage 4 implements maze, open courtyard, narrow-corridor, and branching layouts, with ordinary orthogonal connectivity validation and deterministic corridor repair. All 64 terrain cells exist; collision determines traversability. Spawn/exit and four reservation cells are protected from blocking props. Stage 5 uses the enemy reservation for a Rookling; trap, treasure, and alternate-exit reservations remain empty metadata. Interior density refinement retains separated blocking cells from already connected routes, opening the rest into combat/diagonal space while keeping perimeter routes, branches and optional dead ends. Revalidate connectivity after placement with the existing deterministic repair/retry/fallback. The provisional target is 10-15% of 36 interior candidate floor cells, excluding the outer structural perimeter (no void currently). Corner-scaled trees, rocks and crystals are decorative, never collision/sight blockers. A 1,000-seed audit measured interior blockers falling from 43.77% (15,757/36,000) to 12.46% (4,487/36,000); whole-board blockers including perimeter fell from 53.46% to 35.85%. Same-seed generation remains reproducible within this revision; prior layouts change. Structure, density, prop frequencies, and fade timings are provisional. The exit has a clear-floor condition but no automatic floor transition.

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

Weapons establish identity. Stage 7B provides distinct humanoid bodies and Light/Dark equipment for the five ordinary forms while preserving Stage 7A.4 combat rules. Light favors offense and Dark favors defense. Main-content balance remains open.

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

Stage 7A.3 supersedes the conservative 28% camera cap: fit the complete terrain/prop/roaming-character envelope to the actual gameplay row between measured HUD and compact hand, reserving a context sidebar when open. Never subtract HUD height twice. The desired 1.6-2.2x starting enlargement is constrained by complete-world clipping limits; actual visual scale still needs browser playtesting. Framing ignores fog, remains centered on fixed world bounds and retains smooth bounded wheel zoom, isometric angle and grid/world coordinates.

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
2. **Core rules and characters — through Stage 7B:** seeded generation/fog, synchronized combat/cards, transformation lifecycle/movement/abilities/passives/statuses, humanoid ordinary forms, event-driven presentation and isolated public Training Grounds/analysis. The prior King prototype stays outside training. Tutorial (7C), full progression/random starter selection (8) and persistence (10) remain separate authorized stages. Browser visual QA remains necessary when connected.
3. **Playable slice:** build the six-floor loop above, presentation, lobby, and local saves; playtest and revise provisional balance.
4. **Main content:** expand to four biomes, all eight variants and essences, approved card/enemy content, and transformation forms. Confirm replay progression supports collecting every essence.
5. **Endgame and polish:** implement the eight-variant boss rush and Mirror; tune progression and readability. King remains a separate late-postgame decision.

All unspecified balance numbers remain **provisional**, including health, damage, movement/action budgets, card counts/costs, reward amounts, spawn rates, and difficulty scaling. The confirmed counts and durations stated above remain fixed unless the user changes them.

## Stage 16 King - provisional postgame specification only

**The Sovereign** is an intentionally powerful endgame reward, not a campaign unlock in Stage 7A. King testing was explicitly authorized in Stage 7A.4. Preserve the confirmed Light greatsword / Dark dual-sword weapon identities; the heavy greatsword style is the initial concept and the dual-sword implementation comes later. King walks one tile in any direction per world turn, with no leaps or slides. Basic damage targets 40-50% above Pawn with restrained frontal cleave, one action rather than multiple free attacks.

**Royal Poise:** resist ordinary knockback and reduce the first eligible direct hit per world turn by a small configurable amount. Never stack that mitigation within a turn; explicitly designed boss attacks may break/bypass Poise. No dangerous-attack immunity.

**Royal Decree:** cooldown 8 world turns; centered 5x5, excluding King's cell: inner eight adjacent tiles, outer sixteen. Light Execution deals 12 inner / 6 outer, with no extra control. Dark Dominion deals 9 / 4 and knocks eligible enemies one tile outward only into valid destinations; bosses resist displacement. Activate and mark area, allow one synchronized enemy response, then resolve the shockwave at its end. Timing, defense and outward displacement must be deterministic; death must stop resolution. All values are provisional.

King should dominate ordinary encounters while preserving positioning, telegraphs and late-boss mastery. Queen retains mobility, Rook sustained defense, Knight jumping, Bishop information and Pawn precision/parry niches. No random misses, arbitrary HP penalties or excessive Energy costs solely to weaken King. Stage 7A.4 explicitly permits a functional King test preview through public Playtest Tools; campaign acquisition and final models remain future work.
