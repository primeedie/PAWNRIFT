# PAWNRIFT

Single-player isometric chess-inspired roguelite prototype with seeded 8×8 dungeons, one-tile fog, synchronized combat, and a fixed 12-card starter deck. Stage 7A.1 adds safe Knight walking/perching, confirmed reversion, five turn-based signatures, and a compact HUD with movement mini-boards. Transformation lifecycle, cards and fresh normal-run seeds remain intact.

**Stack:** TypeScript, React/Vite, Three.js/React Three Fiber, Drei, Zustand, and Vitest. No backend or runtime services.

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
| E / Attack / click an adjacent visible enemy | Reliable katana attack |
| Q / Defend | Guard and counter the next enemy response |
| Space / period / Wait | Wait one turn |
| Mouse wheel | Bounded camera zoom |
| Click a card, then highlighted foe/tile or Play | Play a targeted/self card |
| Escape / Cancel | Cancel card selection without advancing time |
| Forms → Inspect → Confirm activation | Activate a carried transformation for one world turn |
| Signature Use > Confirm use | One-turn signature; no Energy cost |
| Knight signature Use > L-landing > highlighted foe | Leap and thrust as one turn |
| Knight Shift + WASD/arrows | Four L-jumps; click for all eight |
| Moves | Instructional 5x5 movement guide |
| Return to Pawn > Confirm return | Forfeit duration; one turn; full subsequent recovery floor |

W/Up decreases the row (−Z); D/Right increases the column (+X). The board axes appear diagonal on screen. Valid actions advance the world once; invalid input, menus, camera controls, hover, and debug tools do not. Enemies act only in response to accepted actions. Rookling marks a strike tile one turn before attacking it; evade or defend.

Transformed movement: Knight walks orthogonally; Shift selects four L-jumps and clicks allow all eight. Designated low flat blocks permit safe perching and dismounts. Bishop maps W/D/S/A to NW/NE/SE/SW diagonal steps; Queen adds those diagonals with Shift. Rook/Queen use ordinary orthogonal keys; clicks reach the full provisional 3-tile slide range. Solid teal destinations are scouted; faint outlines are unscouted attempts that reveal nothing and can be blocked. A valid move always costs one turn regardless of distance.

First **Play**, **New Run**, and **Restart Run** use fresh random seeds. **Resume** preserves a living run and any pending response. Explicit public seeds/styles reproduce the same floor and deck shuffle. No unseeded randomness is added inside generation. Starting deck composition remains fixed; Stage 8 will add 8 essential cards + 4 balanced seeded selections using independent layout/selection/shuffle streams.

Transformations carry five activation charges shared between Light/Dark and last the activation floor plus one more completed floor. Then complete a full Pawn recovery floor before transforming again. Ordinary actions do not spend charges. New Run/reseeding ends active duration and preserves applicable recovery/charges; it cannot refill or skip recovery. On death, choose exactly one positive-charge carried item before restarting, if any; zero-charge activity is destroyed when it ends. Exhaustion tracks two subsequent corresponding boss-identity wins separately from ownership. See the GDD for provisional combat values and edge-case interpretations.

Full progression, bosses/acquisition and form-model redesign are not yet implemented. Locally or on the live site, open **Dungeon tools → Transformation testing** to grant/unlock a form, activate through normal turns, inspect charges, simulate completed floors/boss wins, or test death retention. All current testing tools are intentionally public at the user's request. The existing Pawn model gets a small form label pending Stage 7B. The completed-floor hook is ready for Stage 8 without automatic progression.

At zero HP, one modal dims the visible board and blocks gameplay. Choose an eligible retained transformation first, when offered. **RESTART RUN** generates a fresh seed and resets HP, enemies, turns, fog, deck and temporary combat state, preserving the chosen item's charges, applicable recovery and reconstruction progress. **MAIN MENU** suspends playback; Play after defeat returns to any pending retention choice or starts fresh. A living run retains its pending phase and completes it once on Resume. Refresh resets all in-memory run data; persistent saving is Stage 10.

Cards spend energy upfront; each completed world turn restores 1, capped at 3. Basic actions remain free and also restore energy. Playing a card discards it and draws back to four; an empty draw pile reshuffles discard deterministically. Unplayed cards stay in hand. Ward/Slip block and Riposte's first-strike counter expire after the coming response. Focus boosts the next strike; Mend restores HP. Inspection and invalid plays consume nothing.

Cards show category symbols/colors and a lightning Energy cost at the top right. Hover, focus, or tap an underlined keyword or Energy icon for an explanation; **? Help** opens the same glossary. Escape/outside click dismisses help without issuing a game command. Card inspection and keyword buttons are separate. On narrow screens, scroll the hand horizontally to keep text readable. Stage 6.1 changes presentation and descriptions only; gameplay balance is unchanged.

Defeat all enemies and reach the exit to clear the floor. Victory's **Restart floor** replays the same seed and deck, without refilling transformation charges or bypassing recovery. Balance is provisional in `src/data/combatBalance.ts`, `src/data/cards.ts` and `src/data/forms.ts`; automatic progression, saves, lobby, rewards/upgrades, dice, bosses and essences remain future work.

## Generation, visuals, and development tools

Normal starts use fresh seeds; enter a specific seed in Dungeon tools for reproducibility. Four layout styles use connectivity validation/repair. Enemy, trap, treasure, and alternate-exit reservations protect future content space; only the enemy is spawned. Fog includes diagonals when wall sight permits, remembers terrain dimly, and never reveals hidden enemies through memory or movement previews. Chess colors use global row/column parity. The supplied background and Space Mono font are bundled locally; the font license is in `src/assets/fonts/OFL.txt`.

Desktop framing targets 28% enlargement over the previous reserved-row view, capped to fit terrain, props, and every legal character position. Wide desktops use the unused HUD corners; smaller displays retain separate HUD rows. The isometric angle and world coordinates are unchanged.

Open **Dungeon tools** in the upper-right corner, locally or on the live site, to enter a seed, choose a layout style, or generate a new dungeon. Generation resets HP, cards, turns and fog while preserving transformation lifecycle rules. The active seed is shown so it can be reused. **Reveal complete map** is also available publicly for terrain inspection; it never modifies exploration memory or exposes hidden enemies.

## GitHub preparation

Repository: [primeedie/PAWNRIFT](https://github.com/primeedie/PAWNRIFT) (public), default branch `main`. The lockfile is preserved. `.gitignore` excludes dependencies, build/cache output, temporary files, environment secrets, private keys, and local tool credentials.

After completing and verifying requested updates, publish them per the standing user instruction. From the project directory:

```sh
git add .
git diff --cached --stat
git commit -m "Describe your changes"
git push
```

The user authorized ongoing GitHub pushes and Cloudflare deployments for completed, verified updates. This does not authorize beginning additional gameplay stages.

After pushing, verify the current build at `https://pawnrift.pages.dev`. If Git integration has not published it, deploy the tested `dist` directly to the existing `pawnrift` project on branch `main`, then verify live assets. Do not leave publication pending on Git integration.

## Cloudflare Pages

Cloudflare Pages setup (deployment is authorized):

1. Cloudflare dashboard → Workers & Pages → Create application → Pages → Import an existing Git repository. Connect the PAWNRIFT repository.
2. Framework: **React (Vite)**; production branch: **main**; build command: **npm run build**; output directory: **dist**; root directory: repository root.
3. Use Node **24** (selected by `.node-version`; alternatively set `NODE_VERSION=24`). No runtime environment variables, backend, database, or Workers are required.
4. Deploy completed, verified updates. Then check the title, Play, movement/combat, Game Over, refresh, asset loading, and browser console on the resulting `pages.dev` URL.

Vite's base is explicitly `/`. This app uses state-based navigation at the domain root. Cloudflare Pages supplies SPA fallback when no top-level `404.html` exists, so no custom redirect file is needed. See the official [React deployment guide](https://developers.cloudflare.com/pages/framework-guides/deploy-a-react-site/), [SPA behavior](https://developers.cloudflare.com/pages/configuration/serving-pages/), and [Node version settings](https://developers.cloudflare.com/pages/configuration/build-image/).

## Architecture and verification

`src/game/logic` contains pure generation, movement, fog, AI, cards/deck, and turn rules. `src/game/state` coordinates atomic run state and navigation. `src/scenes` presents those rules; `src/ui` holds controls/hand and playback coordination; `src/data` holds typed cards, balance, and palettes; `src/utils` holds seeded randomness and framing math.

Tests include 1,000 seeds per layout style, 1,000 automatic-style seeds, enemy spawning/combat, fog, rapid-input guards, defeat/restart/menu cancellation, camera projection/desktop HUD separation, seeded deck conservation/reshuffles, card effects/targets/costs, energy timing, HP/indicator formatting, and inspection without world actions. Numerical projection and static UI checks do not replace browser visual verification. See [docs/GDD.md](docs/GDD.md) and [AGENTS.md](AGENTS.md) for design and task boundaries.

## Stage 7A.1 checks

Use public Dungeon tools to grant/unlock up to two forms, then Forms > Inspect > Confirm activation. Test Knight walking in corridors, L-jumps onto flat low blocks, safe dismount/reversion, and enemy strikes while perched. Charges must not refill. Simulated floor completion counts the partial reversion floor first, then a full Pawn recovery floor.

Signatures: Pawn parries one marked strike (5-turn cooldown); Knight needs both leap landing and visible lance target (7); Bishop reveals a seeded 4x4 once per floor; Rook grants temporary Block/one retaliation (9); Queen hits visible nearby groups and causes one-response retreat/hesitation (10). Light/Dark effects are explained on the info icon. Cooldowns start at the full value after casting and tick on later valid turns only. Q/Defend and basic attacks remain available. Eye sight ends after casting response + next response; remembered terrain must not retain remote foes or HP. Dark foresight shows one next action, with no fabricated hazards.

Check exclusive Forms/Moves/Dungeon panels at 1024x768, 1280x720 and larger desktops, hand/footer access, tooltip delay/focus/tap/Escape, default camera and perch label placement. Automated layout/contrast checks cannot establish visual quality; a connected browser is required for visual verification. King is planned for Stage 16 only; no new models, progression, bosses or saves are included.
