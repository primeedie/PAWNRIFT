import { testForms, transformationRules, type Attunement, type BossForm, type ChessForm } from '../../data/forms'
import { cardBalance } from '../../data/cards'
import type { GameState } from './combat'
import { cellId, distancesFrom, dungeonIssues, validCell } from './dungeon'
import { canOccupy, sameCell, type Cell } from './movement'
import { currentForm, endActivation, grantTransformation } from './transformations'
import { pawnLanding, perchTiles, playerBoard, reversionReason } from './perching'
import { signatureFog } from './signatures'
import { chessDestinations, formMovement } from './chessMovement'
import { applyBleed, applyBurn, applyConcussion, emptyPassives } from './passives'
import { cloneEnemy } from './damage'
import { knownPreviewState } from './formCombat'

export type PlaytestAction =
  | { kind: 'passive-reset' | 'sharpener-reset' | 'king-availability' }
  | { kind: 'status'; targetId: string; effect: 'burn' | 'bleed' | 'concussion' | 'immunity' | 'clear' | 'clear-burn' | 'clear-bleed' | 'clear-concussion' }
  | { kind: 'replace'; form: BossForm; attunement: Attunement; replace: BossForm }
  | { kind: 'charges'; form: BossForm }
  | { kind: 'duration'; floors: number }
  | { kind: 'recovery' | 'revert' | 'eye' | 'clear-enemies' | 'hp' | 'energy' | 'focus' }
  | { kind: 'cooldown'; form?: ChessForm }
  | { kind: 'spawn'; cell?: Cell }
export const diagnosticLayers = ['walkable', 'obstacles', 'void', 'reachable', 'legal', 'spawn', 'exit'] as const
// Intentionally public during the prototype phase; one switch for eventual release.
export const PLAYTEST_TOOLS_ENABLED = true
export type DiagnosticLayer = typeof diagnosticLayers[number]

// Explicit public prototype overrides. Ordinary grants, actions and floor hooks never call this.
export function applyPlaytest(state: GameState, action: PlaytestAction): GameState | null {
  if (!PLAYTEST_TOOLS_ENABLED || state.status !== 'playing' || state.hp <= 0) return null
  if (state.mode !== 'training' && (action.kind === 'king-availability' || ('form' in action && action.form === 'king'))) return null
  const next: GameState = { ...state, events: [], guarding: false, block: 0, blockSources:[],fortified:undefined,preparedCounter: 0 }
  if (action.kind === 'king-availability') {
    if (state.transformations.active?.form === 'king') return null
    const reconstruction = { ...state.transformations.reconstruction }; delete reconstruction.king
    next.transformations = { ...state.transformations, reconstruction }
  } else if (action.kind === 'passive-reset') { next.passives = emptyPassives(); next.enemies = state.enemies.map((enemy) => ({ ...cloneEnemy(enemy), burn: undefined, bleed: undefined, concussion: undefined, stunImmunity: 0, stunned: false })) }
  else if (action.kind === 'sharpener-reset') next.passives = { ...state.passives, sharpener: 0 }
  else if (action.kind === 'status') {
    if (!state.enemies.some((enemy) => enemy.id === action.targetId && enemy.hp > 0 && state.visible.has(cellId(enemy.cell)))) return null
    next.enemies = state.enemies.map(cloneEnemy)
    const enemy = next.enemies.find((enemy) => enemy.id === action.targetId)!
    if (action.effect === 'burn') applyBurn(enemy, state.turn - 1)
    else if (action.effect === 'bleed') applyBleed(enemy, state.turn - 1)
    else if (action.effect === 'concussion') applyConcussion(enemy)
    else if (action.effect === 'immunity') enemy.stunImmunity = 0
    else if (action.effect === 'clear-burn') enemy.burn = undefined
    else if (action.effect === 'clear-bleed') enemy.bleed = undefined
    else if (action.effect === 'clear-concussion') { enemy.concussion = undefined; enemy.stunned = false }
    else { enemy.burn = undefined; enemy.bleed = undefined; enemy.concussion = undefined; enemy.stunImmunity = 0; enemy.stunned = false }
  } else if (action.kind === 'replace') {
    if (!testForms.includes(action.form) || !state.transformations.inventory.some((item) => item.form === action.replace)
      || state.transformations.active?.form === action.replace || state.transformations.inventory.some((item) => item.form === action.form)) return null
    const reconstruction = { ...state.transformations.reconstruction }
    delete reconstruction[action.form]
    next.transformations = grantTransformation({ ...state.transformations, reconstruction,
      inventory: state.transformations.inventory.filter((item) => item.form !== action.replace) }, action.form, action.attunement)!
  } else if (action.kind === 'charges') {
    if (!state.transformations.inventory.some((item) => item.form === action.form)) return null
    next.transformations = { ...state.transformations, inventory: state.transformations.inventory.map((item) => item.form === action.form
      ? { ...item, charges: transformationRules.charges } : item) }
  } else if (action.kind === 'duration') {
    if (!state.transformations.active || !Number.isInteger(action.floors) || action.floors < 1 || action.floors > 2) return null
    next.transformations = { ...state.transformations, active: { ...state.transformations.active, floorsLeft: action.floors } }
  } else if (action.kind === 'recovery') next.transformations = { ...state.transformations, recovery: 0, recoveryStartsNextFloor: false }
  else if (action.kind === 'revert') {
    if (reversionReason(state)) return null
    next.cell = { ...pawnLanding(state)! }; next.elevation = 0
    next.transformations = endActivation(state.transformations, true)
    next.passives = { ...state.passives, smite: 0, kingBasics: 0, smiteTurn: undefined, smiteSpent: 0 }
  } else if (action.kind === 'cooldown') {
    if (action.form && action.form !== 'pawn' && !testForms.includes(action.form)) return null
    const cooldowns = { ...state.signatures.cooldowns }
    for (const form of Object.keys(cooldowns) as ChessForm[]) if (!action.form || action.form === form) cooldowns[form] = 0
    next.signatures = { ...state.signatures, cooldowns, usedThisTurn: undefined }
  } else if (action.kind === 'eye') next.signatures = { ...state.signatures, eyeUsed: false, reveal: null }
  else if (action.kind === 'clear-enemies') next.enemies = []
  else if (action.kind === 'hp') next.hp = state.maxHp
  else if (action.kind === 'energy') next.energy = state.maxEnergy
  else if (action.kind === 'focus') next.focus = cardBalance.maxFocus
  else if (action.kind === 'spawn') {
    // Only spawn at visible, reachable, collision-free cells. Debug never exposes a hidden occupant.
    const open = new Set(state.dungeon.tiles.filter((tile) => !tile.blocksMovement).map(cellId))
    const reachable = distancesFrom(open, cellId(pawnLanding(state) ?? state.cell))
    const legal = (cell: Cell) => validCell(cell) && !sameCell(cell, state.cell) && state.visible.has(cellId(cell))
      && reachable.has(cellId(cell)) && canOccupy(cell, playerBoard(state))
    const cell = action.cell ? legal(action.cell) ? action.cell : undefined : state.dungeon.tiles.filter(legal)
      .sort((a, b) => Number(Math.abs(b.column - state.cell.column) === Math.abs(b.row - state.cell.row) && currentForm(state.transformations) === 'bishop')
        - Number(Math.abs(a.column - state.cell.column) === Math.abs(a.row - state.cell.row) && currentForm(state.transformations) === 'bishop') || cellId(a) - cellId(b))[0]
    if (!cell) return null
    next.enemies = [...state.enemies, { id: `test-${state.turn}-${cellId(cell)}`, kind: 'rookling', cell: { ...cell }, from: { ...cell },
      hp: 8, maxHp: 8, intent: 'idle', searchLeft: 0 }]
  } else return null
  return { ...next, ...signatureFog(next) }
}

export function movementRejection(state: GameState, to: Cell): string | undefined {
  if (!validCell(to)) return 'Out of bounds'
  const form = currentForm(state.transformations)
  const dx = to.column - state.cell.column, dy = to.row - state.cell.row
  const straight = (dx === 0) !== (dy === 0), diagonal = Math.abs(dx) === Math.abs(dy) && dx !== 0
  const slide = form === 'bishop' ? diagonal : form === 'rook' ? straight : form === 'queen' && (straight || diagonal)
  if (slide) for (let step = 1; step <= Math.max(Math.abs(dx), Math.abs(dy)); step++) {
    if (!state.visible.has(cellId({ column: state.cell.column + Math.sign(dx) * step, row: state.cell.row + Math.sign(dy) * step })))
      return 'Lane extends beyond current sight'
  }
  const tile = state.dungeon.tiles.find((tile) => sameCell(tile, to))
  if (!tile) return 'Missing tile'
  // No hidden entity location is exposed, even with terrain diagnostics enabled.
  if (state.enemies.some((enemy) => enemy.hp > 0 && sameCell(enemy.cell, to)))
    return state.visible.has(cellId(to)) ? 'Destination occupied' : 'Destination unavailable'
  if (state.occupied.some((cell) => sameCell(cell, to))) return state.visible.has(cellId(to)) ? 'Destination occupied' : 'Destination unavailable'
  if (formMovement(currentForm(state.transformations))(state.cell, to, playerBoard(state))) return
  if (tile.blocksMovement) return 'Blocked by obstacle or unsafe perch'
  return 'Invalid movement pattern or blocked intermediate path'
}

export function mapDiagnostics(state: GameState) {
  const open = new Set(state.dungeon.tiles.filter((tile) => !tile.blocksMovement).map(cellId))
  const reachable = distancesFrom(open, cellId(state.dungeon.spawn))
  const known = knownPreviewState(state)
  const pawn = chessDestinations('pawn', state.cell, playerBoard(known))
  const active = chessDestinations(currentForm(state.transformations), state.cell, playerBoard(known))
  const issues = dungeonIssues(state.dungeon)
  const tile = state.dungeon.tiles.find((tile) => sameCell(tile, state.cell))
  if (!validCell(state.cell) || !tile) issues.push('Player on missing or out-of-bounds terrain')
  else if (tile.blocksMovement && !(currentForm(state.transformations) === 'knight' && perchTiles(state.dungeon).some((entry) => sameCell(entry, state.cell))))
    issues.push('Player inside blocking terrain')
  const taken = new Set<number>([cellId(state.cell), ...state.occupied.map(cellId)])
  for (const enemy of state.enemies.filter((enemy) => enemy.hp > 0)) {
    if (!validCell(enemy.cell) || !open.has(cellId(enemy.cell)) || taken.has(cellId(enemy.cell))) issues.push('Invalid enemy occupancy')
    taken.add(cellId(enemy.cell))
  }
  return { open, reachable, pawn, active, issues, connected: reachable.has(cellId(state.dungeon.exit)),
    tile }
}
