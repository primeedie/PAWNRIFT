# PAWNRIFT implementation status

Current scope: Stage 8. No Stage 9 work.

## Implemented

- TIMEO KINGDOM: PORTA BARRACKS, ASTRA ACADEMY, THE HIGH WALL and TIMEO CASTLE, six floors each. Five ordinary floors have distinct Hallowed/Void exits; one committed vote per floor selects the boss manifestation. Compact biome/floor/alignment HUD, inspectable seed/history/starter and dismissible biome introductions.
- Existing pure generation, Pawn movement, fog, collision, combat resolver, transformation lifecycle, models, camera and floating cards are reused. Validated campaign placement reserves both exits, optional approachable treasure and existing Rooklings. Per-biome palettes/motifs reuse shared geometry. Generation retries/fallback remain bounded.
- Authoritative `pawnStore` state with pure `logic/run.ts` transitions, `floorContent.ts` placement and data-driven biome metadata. Run/floor tokens and phase guards prevent duplicate transitions. Floor boundaries carry deck/resources/charges, reset temporary protection/per-floor abilities and tick duration/recovery once.
- Twelve Common starter instances: eight essentials plus four seeded balanced selections, provisional three-copy cap. Separate selection/shuffle/layout/placement/reward/cosmetic streams. Four explicit numerical rarity tiers use existing effects/costs and seven distinct named SVG icons.
- Current-sight-only optional chests: opening receives one real enemy response, then a three-choice overlay offers one run-only discard reward or skip for no extra turn. Stable offers, pending-action guards and instance IDs prevent rerolls/duplicate grants.
- Validated `pawnrift:active-run:v1` local save: map/fog/entities, actual deck, resources/forms/statuses, seeds/mode, route history and pending phases/rewards. Resume pauses until selected and invalidates stale callbacks. Unreadable saves are preserved until explicit reset. Practice snapshots/preferences remain separate.
- Public progression/chest tools alongside existing forms/combat/seed tools. Manual seeds and manipulated runs are labeled ineligible for future permanent rewards.

## Boss audit and deferred content

All four bosses and Mirror remain **C: concept/documentation only**. No boss models or AI existed to reuse. Boss floors contain arena/setup/variant metadata only; **Skip Unimplemented Boss — Development Only** advances without legitimate win, essence, transformation grant or reconstruction credit. Floor 24 ends development traversal explicitly.

No permanent lobby/essence progression, boss fights, In Limine, Umbral Light, King story unlock, multiplayer, new enemy roster, traps, dice or general character redesign. King remains isolated to Training. Treasure/deck/rarity tuning is provisional; playtest before final balance.

## Verification

- Property tests cover 100 representative seeds across all 24 floors (2,400 floors), repeated-seed equality, actual Pawn reachability, placement, exits, treasure and boss majority. Independent stream isolation and 1,000 early treasure offers are tested.
- Resolver/store tests traverse all 20 ordinary floors using Pawn movement/basic combat and explicitly skip four bosses; cover vote isolation, busy/stale/double exits, transformation expiry/recovery, same-floor overrides and final boundary.
- Tests cover 8+4 composition/copy limits/seed variety, all numerical rarity definitions and rendered metadata, chest opening/response/claim/skip, interrupted player/enemy phases, reload idempotence, save validation and exact Training/tutorial restoration without overwriting the real save.
- Verified: **373 tests across 28 files pass**, including 21 Stage 8 tests; `npm run build` passes TypeScript and Vite. Build retains the existing nonfatal bundle-size warning. Existing 1,000-seed density regression remains 12.46% interior blockers; campaign placement additionally passes the 2,400-floor reachability/content audit.
- No browser surface is connected in this session. Rendered WebGL, responsive pixel layout, touch feel, hover/clipping and frame rate require manual verification; automated rendering assertions are server-rendered markup, not browser visual QA. Publication is checked separately through Cloudflare status and production homepage/asset integrity.

## What to check

1. Play a fresh run; use WASD/arrows, E, Q and cards. Clear a floor, approach either discovered exit and confirm one vote/one new floor. Check distinct gateways, muted biome colors and readable compact HUD.
2. Use Run / seed to copy/restart manually; compare original starter/map. Reload, Resume and confirm current deck, fog, charges and pending response/reward survive.
3. Open an adjacent visible chest. Confirm one turn/response, three readable tiered cards, no extra turn for take/skip and no duplicate reward after reload. Check keyboard focus, tooltips and smaller windows.
4. Grant a form through Playtest Tools, activate, complete two floors, then complete the Pawn recovery floor. Verify charges do not refill. Use progression tools for majority/boss arena checks; skips must remain development-only.
5. Enter/leave Training and tutorials, including from a run with a pending action; confirm exact restoration and King remains Training-only. Check board/card framing at common desktop sizes and smooth zoom.
