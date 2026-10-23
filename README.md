# PAWNRIFT

Single-player isometric chess-inspired roguelite prototype. Stage 8 adds TIMEO KINGDOM's four six-floor biomes, Hallowed/Void route choices, seeded 8+4 starters, run-only treasure cards with four numerical rarity tiers, and local save/resume. Existing combat, fog, transformations, low-poly models, compact cards, camera and isolated Training/tutorials are reused. King remains Training-only. Boss arenas have metadata and an explicit development skip; boss encounters and permanent rewards are not implemented.

Stage 7C adds optional interactive onboarding using the real gameplay rules. Start from the small first-time prompt, or open **? Help → Tutorials → Choose lesson** during a run or Training. All eight lessons are independently replayable; no tutorial completion is required to play.

**Stack:** TypeScript, React/Vite, Three.js/React Three Fiber, Drei, Zustand, and Vitest. No backend or runtime services.

Stage 8.1 adds shaped articulated character surfaces, selective thin ink, material/key/rim/shadow depth, a charcoal/ivory ronin Pawn and back-mounted Dark Queen blade wings. Combat values/ranges and Stage 8 progression remain intact. **Playtest Tools → Enter Training Grounds → Art comparison → Open character model viewer** provides separate orbit/zoom, playback/pause/scrubbing and ink/light comparison. King remains Training-only. See [Art direction](docs/ART_DIRECTION.md) for the editable mesh workflow and visual QA limitations.

## Local setup

Use Node 24 (`.node-version`) and npm. A modern WebGL2-capable browser is required.

```sh
npm ci
npm run dev
```

Open the printed localhost URL (normally http://localhost:5173). On PowerShell, use `npm.cmd` if execution policy blocks `npm`. Stop servers with Ctrl+C before running `npm ci` on Windows to avoid native-module file locks.

```sh
npm test
npm run build
npm run preview
```

The build checks TypeScript and writes `dist/`. Preview serves production files, normally at http://localhost:4173. `npm run test:watch` enables Vitest watch mode. The existing Three.js chunk-size warning is nonfatal.

## Play

| Control | Action |
| --- | --- |
| WASD / arrows / glowing neighbor | One orthogonal move |
| E / Attack | Attack one eligible primary target; legal directions depend on form |
| Choose target → click a highlighted foe | Aim one basic attack; arming/canceling are free |
| Click a visible enemy without targeting | Toggle its right-side information; no attack or turn |
| Hover/focus form icon / click form icon | Small ability tooltip / toggle left character statistics |
| Q / Defend | Guard and counter the next enemy response |
| Space / period / Wait | Wait one turn |
| Mouse wheel | Bounded camera zoom |
| Click a card, then highlighted foe/tile or Play | Play a targeted/self card |
| Escape / Cancel | Close inspection or cancel targeting without advancing time |
| Forms → Inspect → Confirm activation | Activate a carried transformation for one world turn |
| Signature Use > Confirm use | One-turn signature; no Energy cost |
| Knight signature Use > L-landing > highlighted foe | Leap and thrust as one turn |
| Knight Shift + WASD/arrows | Four L-jumps; click for all eight |
| Moves | Instructional 5x5 movement guide |
| Return to Pawn > Confirm return | Forfeit duration; one turn; full subsequent recovery floor |

W/Up decreases the row (−Z); D/Right increases the column (+X). The board axes appear diagonal on screen. Small crimson rings mark eligible attack targets; teal squares mark movement. Basics: Pawn/Rook orthogonal 1; Knight orthogonal 2; Bishop magic orthogonal 2 / diagonal 1 with a clear lane; Queen/King all eight neighbors at range 1. Bishop adds its explicit small Swish splash. Adjacent damage cards keep eight-neighbor targeting, and signatures retain their own targeting. Valid actions advance the world once; invalid input, menus, camera controls, hover, and debug tools do not. Enemies act only in response to accepted actions. Rookling marks a strike tile one turn before attacking it; evade or defend.

Bishop two-tile magic requires a currently visible enemy, clear valid terrain and no intervening living enemy. Normal one-tile sight is unchanged; use existing Astral Eye or full-sight Training Grounds to test the extra reach. Diagonal reach 2 is invalid. Swish/Burn and all other damage/passive values are unchanged. Models use bent elbows/wrists, linked weapon grips and form-specific motion: Pawn quickdraw/reseat before Sharpener, Knight braced thrust, Bishop staff/book cast, Rook heavy strike, Queen claw cut and training-only King greatsword sweep. Geometry/materials stay shared; animation never executes combat.

Transformed movement: Knight walks orthogonally; Shift selects four L-jumps and clicks allow all eight. Designated low flat blocks permit safe perching and dismounts. Bishop walks one orthogonal tile with WASD/arrows; Shift selects NW/NE/SE/SW diagonals for Bishop/Queen. Rook/Queen use ordinary orthogonal keys. Click destinations for full clear lanes (maximum 7); every traversed sliding tile must be currently visible, unoccupied and traversable. Normal one-tile sight usually limits slides to one tile; remembered terrain and terrain-reveal tools do not grant sight. Bishop walking costs no Energy or signature use. The 5x5 guide distinguishes diagonal slides from fallback walking. Faint unscouted outlines remain only for Pawn/Knight attempts. A valid move always costs one turn regardless of distance.

Crimson Reversal now enters **Samurai Mode**: 3 automatic parries until spent or floor end, cooldown 10 subsequent completed turns. Activation costs one world turn and no Energy. Eligible direct melee/projectile strikes consume one parry; DoT, environmental, unblockable and unparryable damage do not. Auto-parries never counter or add Sharpener stacks. Q/Defend and separately prepared Riposte remain independent. Transforming, dying or entering the next floor clears protection while preserving the established cooldown rules. In Training Grounds, use up to four sparring dummies, attack-pattern samples, Reset Samurai Mode, Reset cooldowns, Advance turn and Automatic parry events.

First **Play**, **New Run**, and **Restart Run** use fresh random seeds. **Resume** restores the actual saved run, including pending responses/rewards. **Run / seed** shows/copies the master seed, route history and original 12 cards. Enter a seed from the title or this panel; **Restart same seed** starts a labeled manual run. Manual/development-modified runs are ineligible for future permanent rewards. Independent seeded streams keep layouts, starter selection/shuffle and treasure reproducible.

Transformations carry five activation charges shared between Light/Dark and last the activation floor plus one more completed floor. Then complete a full Pawn recovery floor before transforming again. Ordinary actions do not spend charges. New Run/reseeding ends active duration and preserves applicable recovery/charges; it cannot refill or skip recovery. On death, choose exactly one positive-charge carried item before restarting, if any; zero-charge activity is destroyed when it ends. Exhaustion tracks two subsequent corresponding boss-identity wins separately from ownership. See the GDD for provisional combat values and edge-case interpretations.

Open public **Playtest Tools → Transformation testing** to grant/unlock ordinary forms and test their real activation/duration/recovery. **Progression / treasure testing** supports biome/floor jumps, prior route votes, nearby test chests and explicit **Skip Unimplemented Boss — Development Only**. These manipulations mark modified runs. Simulated boss wins remain explicit test overrides; skips never grant wins, essences or reconstruction. **Enter Training Grounds → Form and attunement** tests King; normal-run King remains rejected.

At zero HP, one modal blocks gameplay. Choose an eligible retained transformation first, when offered. **RESTART RUN** resets temporary state and run cards with a fresh seed, preserving applicable retained charges/recovery/reconstruction. **MAIN MENU** suspends playback. Browser reload restores the saved run at the title; Resume completes any pending response exactly once. The versioned local save preserves map/fog, enemies, deck, routes, transformations and pending treasure. Unreadable/unsupported saves remain untouched until explicit discard; blocked storage shows a notice. Training/tutorials never overwrite the actual run save.

Cards spend energy upfront; each completed world turn restores 1, capped at 3. Basic actions remain free and also restore energy. Playing a card discards it and draws back to four; an empty draw pile reshuffles discard deterministically. Unplayed cards stay in hand. Ward/Riposte/Slip Block lasts two responses; Riposte's first-strike counter expires after the immediate response. Focus boosts the next strike; Mend restores HP. Inspection and invalid plays consume nothing.

Compact cards show names, Energy, category icons and effect summaries. Hover, keyboard focus or touch expands a card upward about 1.6x without resizing the hand or camera; scroll larger hands horizontally. The permanent form icon shows brief ability help on hover/focus and toggles live left-side statistics on click; **Use** remains separate. Enemy overhead UI is only a 40×4px HP bar. Click a visible foe, or use the keyboard-accessible **Inspect foe…** selector, for one live right-side panel. Same-foe click, Escape or outside click closes it; the first ordinary board dismissal cannot also move. Hidden/dead enemies lose inspection immediately. Explicit combat targeting wins over inspection. **? Help** retains the shared glossary; all inspection is free.

Clear enemies, then click a discovered Hallowed/Light or Void/Dark exit from its tile or one orthogonal neighbor. Its button also appears nearby. Each ordinary floor records one choice; five votes select the biome's Floor 6 boss manifestation. Ordinary exit transitions are free boundaries. Boss fights are unimplemented: use the explicit development skip to continue through all four biomes. No boss rewards, lobby, dice or essences are implemented.

A visible adjacent chest offers **Open chest · 1 turn**. Its enemy response finishes before three cards appear. Take one into discard or skip all, with no extra turn. Decide later/menu/reload preserve the offer; choose/skip before further world actions. Common/Uncommon/Rare/Epic show actual values and retain each named card's icon and cost. All rewards last only for this run. Balance is provisional in the existing data modules plus `src/data/biomes.ts`.

## Generation, visuals, and development tools

Four seeded layout styles use connectivity validation/repair with a provisional 10–15% blocking target across 36 interior candidates. Campaign placement validates both exits, approachable optional treasure and reachable Rooklings using Pawn movement. Biome palettes and small decorative motifs reuse the low-poly board; decorative props never block. Fog remembers terrain but entities and chests require current sight, including under public terrain reveal. Checker parity stays global. The supplied background and Space Mono font are bundled locally; its license is `src/assets/fonts/OFL.txt`.

The camera fits the complete world to the measured area between HUD and compact 3:4 floating hand, without the old zoom cap or repeated HUD subtraction. Fog never changes framing; wheel zoom stays bounded.

Open **Playtest Tools** in the upper-right corner, locally or on the live site, to enter a seed, choose a layout style, or generate a new dungeon. Test regeneration resets entities, events and fog while preserving carried transformations, run resources/deck/turn, cooldowns and Astral Eye usage. It does not complete a floor. The active seed is shown so it can be reused. **Reveal complete map** is also available publicly for terrain inspection; it never modifies exploration memory or exposes hidden enemies.

## GitHub preparation

Repository: [primeedie/PAWNRIFT](https://github.com/primeedie/PAWNRIFT) (public), default branch `main`. The lockfile is preserved. `.gitignore` excludes dependencies, build/cache output, temporary files, environment secrets, private keys, and local tool credentials.

After completing and verifying requested updates, publish them per the standing user instruction. From the project directory:

```sh
git add .
git diff --cached --stat
git commit -m "Describe your changes"
git push
```

The user authorized automatic GitHub pushes and Cloudflare deployments after every completed, verified requested edit, without repeat confirmation. This does not authorize beginning additional gameplay stages.

For work across two devices, fetch and inspect the current branch and working tree before editing. Fast-forward a clean checkout to the latest remote branch; preserve uncommitted changes and reconcile concurrent edits before pushing. Never force-push or overwrite work from the other device. Both devices should follow the shared instructions in `AGENTS.md`. Report any authentication, tooling or deployment blocker explicitly; a successful push alone does not confirm a live deployment.

After pushing, verify the current build at `https://pawnrift.pages.dev`. If Git integration has not published it, deploy the tested `dist` directly to the existing `pawnrift` project on branch `main`, then verify live assets. Do not leave publication pending on Git integration.

## Cloudflare Pages

Cloudflare Pages setup (deployment is authorized):

1. Cloudflare dashboard → Workers & Pages → Create application → Pages → Import an existing Git repository. Connect the PAWNRIFT repository.
2. Framework: **React (Vite)**; production branch: **main**; build command: **npm run build**; output directory: **dist**; root directory: repository root.
3. Use Node **24** (selected by `.node-version`; alternatively set `NODE_VERSION=24`). No runtime environment variables, backend, database, or Workers are required.
4. Deploy completed, verified updates. Then check the title, Play, movement/combat, Game Over, refresh, asset loading, and browser console on the resulting `pages.dev` URL.

Vite's base is explicitly `/`. This app uses state-based navigation at the domain root. Cloudflare Pages supplies SPA fallback when no top-level `404.html` exists, so no custom redirect file is needed. See the official [React deployment guide](https://developers.cloudflare.com/pages/framework-guides/deploy-a-react-site/), [SPA behavior](https://developers.cloudflare.com/pages/configuration/serving-pages/), and [Node version settings](https://developers.cloudflare.com/pages/configuration/build-image/).

## Architecture and verification

Tutorials preserve a separate complete snapshot, including an active Training session and its original run. Use the existing controls to perform each task, then Continue. **Retry exercise** restores its checkpoint; **Skip / choose lesson** bypasses exercises or opens the lesson list without awarding completion. **Exit tutorial** restores the previous session, even during an animation or targeting. Escape first closes inspection/targeting, then requests exit. Prompt dismissal/checkmarks are the only new persisted settings, in a separate versioned local key; no run/progression save is added.

Check Movement, Attacks, World Turns, Cards/Energy, Defense, Forms, Fog/Inspection and Statuses. Card Block, Bastion and Samurai use real response phases. The parry exercise teaches Samurai's automatic parries; there is no separate manual-parry input. Forms offer optional Light/Dark practice for Knight/Bishop/Rook/Queen; King remains in Training only. Diagrams illustrate rules rather than limiting lane length. Browser-rendered layout, touch and input verification were unavailable for this stage.

Open **Playtest Tools → Enter Training Grounds**, then close controls to use the normal board, WASD/arrows, E, Q, Space and cards. Training controls offer six forms/attunements including training-only King, open/line/cluster/blocked/perch/Eye scenarios, up to four configurable wooden dummies, passive/sparring responses and player/target positioning. Eye uses actual fog; other training scenarios expose the arena for full-lane movement. **Combat Analysis** shows resolved damage components, independent Bleed contributions, mitigation/overkill and DPT. Reset comparison restores configured targets; Leave Training restores the paused run. Training is not persisted on refresh.

`src/game/logic` contains pure generation, movement, fog, AI, cards/deck, and turn rules. `src/game/state` coordinates atomic run state and navigation. `src/scenes` presents those rules; `src/ui` holds controls/hand and playback coordination; `src/data` holds typed cards, balance, and palettes; `src/utils` holds seeded randomness and framing math.

Tests include 1,000 seeds per layout style, 1,000 automatic-style seeds, enemy spawning/combat, fog, rapid-input guards, defeat/restart/menu cancellation, camera projection/desktop HUD separation, seeded deck conservation/reshuffles, card effects/targets/costs, energy timing, HP/indicator formatting, and inspection without world actions. Numerical projection and static UI checks do not replace browser visual verification. See [docs/GDD.md](docs/GDD.md) and [AGENTS.md](AGENTS.md) for design and task boundaries.

## Stage 7A.3 checks

Use public Playtest Tools to grant/unlock up to two forms, then Forms > Inspect > Confirm activation. Test Knight walking in corridors, L-jumps onto flat low blocks, safe dismount/reversion, and enemy strikes while perched. Ordinary grants must not refill charges; only the explicit Restore charges test override may do so. Simulated floor completion counts the partial reversion floor first, then a full Pawn recovery floor.

Signatures: Pawn enters Samurai Mode with 3 automatic parries (10-turn cooldown); Knight needs both leap landing and visible lance target (7); Bishop reveals a seeded 4x4 once per floor; Rook grants temporary Block/one retaliation (9); Queen hits visible nearby groups and causes one-response retreat/hesitation (10). Light/Dark effects are explained on the info icon. Cooldowns start at the full value after casting and tick on later valid turns only. Q/Defend and basic attacks remain available. Eye sight ends after casting response + next response; remembered terrain must not retain remote foes or HP. Dark foresight shows one next action, with no fabricated hazards.

## Stage 7B.4 checks

In Training, compare both attunements of Knight, Bishop, Rook, Queen and King. Hallowed models have ordered ivory/gold ceremonial armor; Void models have fractured headwear, asymmetric armor and torn cloth. Bishop equips only staff or tome, with effects from that equipment. Both Rooks use warhammers; King cuts with the greatsword edge. Pawn keeps its uncorrupted silhouette, sheath and Samurai Mode.

Ward, Riposte and Slip Block lasts two enemy responses; Q/Defend and Riposte's counter still last only the immediate response. Bastion keeps its existing 4/8 Block and 5/2 retaliation: Block lasts three responses and retaliation may trigger once within the first two. The activation response counts first, even if no enemy hits. Remaining Block and response windows appear in the compact status row and character inspection; sources expire independently and clear on floor/death/reset. Use sparring responses and Space/Advance turn to check actual phases, then Leave Training to verify exact run restoration.

Boss audit: Chimera Knight, Yin and Yang Bishop, Twin Towers, Queen of Pain and Mirror are concept-only; no boss models or AI are present. No experimental summons were added. Automated model/pose checks do not verify rendered clipping, animation quality or frame rate; no browser preview was available for this pass.

Check form-icon hover/click, live left/right panels, same/different foe selection, Escape/outside dismissal, explicit target priority and tiny HP bars at 1366x768, 1440x900, 1920x1080 and 2560x1440. Both inspection panels may coexist on desktops; narrower windows show the most recent one. Preserve hand/footer access and camera scale. Test training King inspection, dummy configuration and exact run restoration. Automated state/projection checks cannot establish pixel quality; a connected browser is required. King campaign acquisition, progression, bosses and saves remain future work.

Public testing: open Playtest Tools, then Transformation testing. Grant a form/attunement, activate normally, and use explicitly labeled test overrides for replacement, charge/duration/recovery or cooldown/Eye resets. Combat testing restores player resources or places a visible, valid test Rookling. Dungeon controls copy/replay/regenerate seeds and simulate an actual completed floor. Map Diagnostics validates Pawn connectivity, shows known legal destinations and optional logical overlays without revealing hidden enemies. Close panels or press Escape to restore gameplay focus.

Verify at 1366x768, 1440x900, 1920x1080 and 2560x1440 (and 80/100/125% browser zoom): move beyond initial fog; inspect world/card size and clipping; test every form/attunement and replacement; close Help/panels and resume keyboard movement. Automated projection, state and 1,000-encounter audits do not replace actual browser screenshots.
