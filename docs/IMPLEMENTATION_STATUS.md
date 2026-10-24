# PAWNRIFT implementation status

Current scope: Stage 9 Porta Barracks enemies and Knight encounters, preserving Stage 8 progression and subsequent character/world refinements. No Stage 10.

## Stage 9

- Four normal archetypes (Initiate, Halberdier, Crossbow Sentinel, Shield Guard), Elite Cavalier, Hallowed Cavalry Commander and two-headed Void Chimera Knight. Definitions/fixtures are centralized in `data/enemies.ts`; all final statistics await the user's document. Shared committed plans, stable pathfinding, spacing, recovery, finite Block and existing statuses/mitigation run through the normal deterministic resolver.
- Porta floors 1–5 use conservative encounter fixtures; Floor 6 has a dedicated majority-selected court and actual boss. Thin current-sight-only threat outlines, Crossbow aim segments and charge landing markers share collision geometry with damage. No player/camera overhaul or vision expansion. One-tile ordinary sight limits long ranged engagements; full-sight Training/Eye can test complete lanes.
- Explicit phase testing switches pattern ordering, cancels incompatible plans and grants a recovery opening. No automatic HP thresholds or final scaling/resistances. Real death is settled once, records the manifestation, runs supported eligible Knight acquisition/reconstruction and opens Astra. Manual/modified/Training/skips cannot earn legitimate rewards. No permanent essences, lobby or later bosses.
- Public enemy tools and Training expose the actual roster, passive/sparring, pause, pattern, phase, status, reset and arena controls. Combat Analysis and exact run snapshots remain. Save envelope v3 preserves plans/finite protection/outcomes and accepts v1/v2 without rerolling existing content. Full inventory preserves ready Knight reconstruction credit rather than replacing/refilling items.
- Optional quiet, user-enabled synthesized wind-up/impact/Block/parry/phase/defeat cues use no downloaded audio. Model grips are checked on actual articulated meshes in four facings; offline close/game/thumbnail silhouettes/material-color renders reviewed. No browser is connected: live PBR/ink, responsive play, all-animation clipping, audio output and FPS remain unverified.
- Verification: **424 tests across 34 files pass**; TypeScript and production build pass. Includes 1,000 seeds across all six Porta floors (6,000 encounters), full Stage 8 progression/save/tutorial/Training regressions, genuine boss outcomes, interrupted tactical responses, and actual mesh grips/grounding in four facings. Existing Three CommonJS/bundle-size warnings remain nonfatal. Offline roster renders supplement tests; live browser QA remains unavailable. Numerical fields pending: HP, damage, defense, attack parameters/recovery/cooldowns, resistances/status modifiers, HP phase thresholds, floor scaling, encounter budgets and reward balance.

## Stage 8.1 presentation

- Shared custom shaped torso/limb/hood/boot/cloth surfaces retain articulated shoulders/elbows/wrists, hips/knees and weapon sockets. Pawn uses uncorrupted charcoal/ivory ronin clothing, mask and left-hip katana. Knight/Bishop/Rook/King gain shaped armor/headwear/garments and material depth; Hallowed/Void construction stays distinct.
- Dark Queen replaces hand knuckles with an asymmetrical folding blade mantle, two connected fixed-length links per shoulder and blade-edge attack/signature motion; Light Queen retains dual claws. No combat range/damage/status change. King remains Training-only.
- Selective 1.35px inverted hulls, differentiated Standard materials, warm key/cool rim/fill and one soft contact-shadow map. Fogged terrain excludes hull shaders from color cloning and passes its fade to them; hidden entities remain hidden.
- Longer weapon-specific cinematic clips, heavy contact dwell, socket-led trails and directional recoil. Pawn visibly draws/seats before the presentation Sharpener follow-up. Resolved damage/metadata and world phases remain authoritative.
- Separate public Training model viewer has orbit/zoom, form/attunement, playback/pause/scrub, reduced motion, lighting/outline comparison and runtime viewer counters. No viewer action touches run/training rules or saves.
- Blender was unavailable. Geometry is editable code-authored mesh profiles, not exported GLB/skinned assets. No browser is connected, so rendered quality, clipping, GPU shader output and FPS remain pending manual inspection. These changes are not a claim of finished character artwork. See `ART_DIRECTION.md`.
- Stage 8.1 verification: **382 tests across 29 files pass**, including nine new shaped-mesh/material/equipment/wing/contact/presentation tests. TypeScript and production build pass; existing bundle-size and test-only Three CommonJS warnings remain nonfatal. All Stage 8 deterministic progression/treasure/save/practice regressions pass.

## Implemented

- TIMEO KINGDOM: PORTA BARRACKS, ASTRA ACADEMY, THE HIGH WALL and TIMEO CASTLE, six floors each. Five ordinary floors have distinct Hallowed/Void exits; one committed vote per floor selects the boss manifestation. Compact biome/floor/alignment HUD, inspectable seed/history/starter and dismissible biome introductions.
- Existing pure generation, Pawn movement, fog, collision, combat resolver, transformation lifecycle, models, camera and floating cards are reused. Validated campaign placement reserves both exits, optional approachable treasure and existing Rooklings. Per-biome palettes/motifs reuse shared geometry. Generation retries/fallback remain bounded.
- Authoritative `pawnStore` state with pure `logic/run.ts` transitions, `floorContent.ts` placement and data-driven biome metadata. Run/floor tokens and phase guards prevent duplicate transitions. Floor boundaries carry deck/resources/charges, reset temporary protection/per-floor abilities and tick duration/recovery once.
- Twelve Common starter instances: eight essentials plus four seeded balanced selections, provisional three-copy cap. Separate selection/shuffle/layout/placement/reward/cosmetic streams. Four explicit numerical rarity tiers use existing effects/costs and seven distinct named SVG icons.
- Current-sight-only optional chests: opening receives one real enemy response, then a three-choice overlay offers one run-only discard reward or skip for no extra turn. Stable offers, pending-action guards and instance IDs prevent rerolls/duplicate grants.
- Validated `pawnrift:active-run:v1` local save: map/fog/entities, actual deck, resources/forms/statuses, seeds/mode, route history and pending phases/rewards. Resume pauses until selected and invalidates stale callbacks. Unreadable saves are preserved until explicit reset. Practice snapshots/preferences remain separate.
- Public progression/chest tools alongside existing forms/combat/seed tools. Manual seeds and manipulated runs are labeled ineligible for future permanent rewards.

## Boss audit and deferred content

Historical Stage 8 audit: all bosses were concepts. Stage 9 now implements the two Porta manifestations only. Astra/High Wall/Timeo/Mirror remain **C: concept/documentation only**; their boss floors still use explicit development skips without win/reward credit. Floor 24 ends development traversal explicitly.

No permanent lobby/essence progression, later biome boss fights, In Limine, Umbral Light, King story unlock, multiplayer, traps, dice or player redesign. King remains isolated to Training. All tuning is provisional; enemy/boss statistics remain deferred.

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
