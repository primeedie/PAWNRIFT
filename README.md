# PAWNRIFT

Single-player isometric chess-inspired roguelite prototype with seeded 8×8 dungeons, one-tile fog, synchronized turns, and basic Pawn combat. Stage 5.5 adds Game Over, fresh-run restart, closer responsive framing, and static deployment preparation.

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

W/Up decreases the row (−Z); D/Right increases the column (+X). The board axes appear diagonal on screen. Valid actions advance the world once; invalid input, menus, camera controls, hover, and debug tools do not. Enemies act only in response to accepted actions. Rookling marks a strike tile one turn before attacking it; evade or defend.

At zero HP, one modal dims the visible board and blocks gameplay. **RESTART RUN** generates a fresh seed and resets HP, enemies, turns, fog, and temporary state. **MAIN MENU** returns to the title with playback stopped; Play after defeat starts a fresh run. A living run retains its pending phase while in the menu and completes that phase once when resumed. Refresh starts at the title and resets in-memory run data.

Defeat all enemies and reach the exit to clear the floor. Victory's **Restart floor** replays the same seed. Balance is provisional in `src/data/combatBalance.ts`; automatic floor progression, persistent saves, lobby, cards, dice effects, transformations, and bosses are not implemented.

## Generation, visuals, and development tools

The default seed remains `dungeon-in-a-box` for reproducibility. Four layout styles use connectivity validation/repair. Enemy, trap, treasure, and alternate-exit reservations protect future content space; only the enemy is currently spawned. Fog includes diagonals when wall sight permits, remembers terrain dimly, and never reveals hidden enemies through memory. Chess colors use global row/column parity. The supplied background and Space Mono font are bundled locally; the font license is in `src/assets/fonts/OFL.txt`.

Desktop framing targets 28% enlargement over the previous reserved-row view, capped to fit terrain, props, and every legal character position. Wide desktops use the unused HUD corners; smaller displays retain separate HUD rows. The isometric angle and world coordinates are unchanged.

With `npm run dev`, open **Dungeon tools · development** to enter a seed/style, generate a floor, or reveal terrain temporarily. Regeneration resets the complete encounter; revealing terrain does not modify exploration memory or expose hidden enemies. Debug controls are removed from production.

## GitHub preparation

Repository: [primeedie/PAWNRIFT](https://github.com/primeedie/PAWNRIFT) (private), default branch `main`. The lockfile is preserved. `.gitignore` excludes dependencies, build/cache output, temporary files, environment secrets, private keys, and local tool credentials.

For future approved updates, run from the project directory:

```sh
git add .
git diff --cached --stat
git commit -m "Describe your changes"
git push
```

The initial GitHub upload was explicitly authorized. Further publishing actions and Cloudflare deployment still require authorization.

## Cloudflare Pages

When Cloudflare deployment is approved:

1. Cloudflare dashboard → Workers & Pages → Create application → Pages → Import an existing Git repository. Connect the PAWNRIFT repository.
2. Framework: **React (Vite)**; production branch: **main**; build command: **npm run build**; output directory: **dist**; root directory: repository root.
3. Use Node **24** (selected by `.node-version`; alternatively set `NODE_VERSION=24`). No runtime environment variables, backend, database, or Workers are required.
4. Review settings and deploy only when approved. Then check the title, Play, movement/combat, Game Over, refresh, asset loading, and browser console on the resulting `pages.dev` URL.

Vite's base is explicitly `/`. This app uses state-based navigation at the domain root. Cloudflare Pages supplies SPA fallback when no top-level `404.html` exists, so no custom redirect file is needed. See the official [React deployment guide](https://developers.cloudflare.com/pages/framework-guides/deploy-a-react-site/), [SPA behavior](https://developers.cloudflare.com/pages/configuration/serving-pages/), and [Node version settings](https://developers.cloudflare.com/pages/configuration/build-image/).

## Architecture and verification

`src/game/logic` contains pure generation, movement, fog, AI, and turn rules. `src/game/state` coordinates atomic run state and navigation. `src/scenes` presents those rules; `src/ui` holds controls and playback coordination; `src/data` holds balance/palettes; `src/utils` holds seeded randomness and framing math.

Tests include 1,000 seeds per layout style, 1,000 automatic-style seeds, enemy spawning/combat, fog, rapid-input guards, defeat/restart/menu cancellation, and camera projection/desktop HUD separation. Numerical projection checks do not replace browser visual verification. See [docs/GDD.md](docs/GDD.md) and [AGENTS.md](AGENTS.md) for design and task boundaries.
