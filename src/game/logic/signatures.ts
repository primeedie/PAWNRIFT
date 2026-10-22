import { abilityBalance as balance, signatureAbilities } from '../../data/abilities'
import type { ChessForm } from '../../data/forms'
import type { CombatEvent, Enemy, GameState } from './combat'
import { currentForm } from './transformations'
import { cellFromId, cellId, type Dungeon } from './dungeon'
import { seededRandom } from '../../utils/seededRandom'
import { canSeeContent, updateFog, visibleCells } from './visibility'
import { canKnightLand, elevationAt, playerBoard } from './perching'
import { directionTo, type Cell } from './movement'
import { formAttackTargets, knownPreviewState } from './formCombat'
import { passiveBalance } from '../../data/passives'
import { cloneEnemy } from './damage'
export { damageEnemy } from './damage'
import { emitDamage, pushEnemy, smiteBudget, splitBonus } from './passives'
import { gridDistance } from './enemyAI'

export type SignatureState = {
  cooldowns: Record<ChessForm, number>
  usedThisTurn?: ChessForm
  decree?: { origin: Cell; light: boolean }
  eyeUsed: boolean
  reveal: { cells: number[]; turnsLeft: number; foresight: boolean } | null
  parryReady: boolean
  samuraiCharges: number
}
export function emptySignatures(): SignatureState {
  return { cooldowns: { pawn: 0, knight: 0, bishop: 0, rook: 0, queen: 0, king: 0 }, eyeUsed: false, reveal: null, parryReady: false, samuraiCharges: 0 }
}
export function signatureFog(state: Pick<GameState, 'dungeon' | 'cell' | 'explored' | 'signatures' | 'mode' | 'trainingVision'>) {
  if (state.mode === 'training' && state.trainingVision === 'full') {
    const visible = new Set(state.dungeon.tiles.map(cellId)); return { visible, explored: new Set(visible) }
  }
  const fog = updateFog(state.dungeon.tiles, state.cell, state.explored)
  if (!state.signatures.reveal || state.signatures.reveal.turnsLeft <= 0) return fog
  const visible = new Set([...fog.visible, ...state.signatures.reveal.cells])
  return { visible, explored: new Set([...fog.explored, ...visible]) }
}
export function chooseAstralRegion(dungeon: Dungeon, explored: ReadonlySet<number>, turn: number): number[] | undefined {
  const present = new Set(dungeon.tiles.map(cellId))
  const regions: { cells: number[]; weight: number }[] = []
  for (let row = 0; row <= 4; row++) for (let column = 0; column <= 4; column++) {
    const cells = Array.from({ length: 16 }, (_, i) => (row + Math.floor(i / 4)) * 8 + column + i % 4)
    const unseen = cells.filter((id) => !explored.has(id)).length
    if (unseen && cells.every((id) => present.has(id))) regions.push({ cells, weight: unseen * unseen })
  }
  if (!regions.length) return undefined
  const random = seededRandom(`${dungeon.seed}:astral-eye:${turn}:${[...explored].sort((a, b) => a - b).join(',')}`)
  let roll = random() * regions.reduce((sum, region) => sum + region.weight, 0)
  return regions.find((region) => (roll -= region.weight) < 0)?.cells ?? regions.at(-1)!.cells
}
export function vaultTargets(state: GameState, destination: Cell, preview = false) {
  const source = preview ? knownPreviewState(state) : state
  const dx = Math.abs(destination.column - state.cell.column), dy = Math.abs(destination.row - state.cell.row)
  if (!((dx === 1 && dy === 2) || (dx === 2 && dy === 1)) || !canKnightLand(destination, playerBoard(source))) return []
  return formAttackTargets({ ...source, cell: destination }).filter((enemy) => canSeeContent(cellId(enemy.cell), state))
}
export function vaultDestinations(state: GameState) {
  return Array.from({ length: 64 }, (_, id) => cellFromId(id)).filter((cell) => vaultTargets(state, cell, true).length)
}
export function royalDecreeTargets(state: GameState, origin: Cell = state.cell) {
  return state.enemies.filter((enemy) => enemy.hp > 0 && canSeeContent(cellId(enemy.cell), state)
    && Math.max(Math.abs(enemy.cell.column - origin.column), Math.abs(enemy.cell.row - origin.row)) <= 2)
    .sort((a, b) => a.id.localeCompare(b.id))
}
export function abilityReason(state: GameState) {
  if (state.status !== 'playing' || state.hp <= 0) return 'Run ended.'
  const form = currentForm(state.transformations)
  if (form === 'pawn' && state.signatures.samuraiCharges > 0) return 'Samurai Mode is already active.'
  if (form === 'king' && state.mode !== 'training') return 'King is available in Training Grounds only.'
  if (form === 'bishop') {
    if (state.signatures.eyeUsed) return 'Used this floor.'
    if (!chooseAstralRegion(state.dungeon, state.explored, state.turn)) return 'The entire map is explored.'
  } else if (state.signatures.cooldowns[form] > 0) return `${state.signatures.cooldowns[form]} turns remaining.`
  if (form === 'king' && !royalDecreeTargets(state).length) return 'No visible foes in the 5x5.'
  if (form === 'knight' && !vaultDestinations(state).length) return 'No visible leap-and-thrust combination.'
  if (form === 'queen' && !state.enemies.some((enemy) => enemy.hp > 0 && canSeeContent(cellId(enemy.cell), state)
    && gridDistance(state.cell, enemy.cell) <= balance.fearRange)) return 'No visible foes within 3 tiles.'
}

export function resolveSignature(state: GameState, options: { destination?: Cell; targetId?: string }): GameState | null {
  if (abilityReason(state)) return null
  const form = currentForm(state.transformations), light = state.transformations.active?.attunement === 'light'
  if (form !== 'knight' && (options.destination || options.targetId)) return null
  const next: GameState = { ...state, enemies: state.enemies.map(cloneEnemy), passives: { ...state.passives }, events: [],
    block: 0, preparedCounter: 0, guarding: false, lastAction: 'ability',
    signatures: { ...state.signatures, cooldowns: { ...state.signatures.cooldowns, [form]: signatureAbilities[form].cooldown },
      usedThisTurn: form, parryReady: false } }
  const emit = (event: Omit<CombatEvent, 'id' | 'seen'>) => next.events.push({ ...event, id: ++next.eventSerial, seen: true })
  const strike = (enemy: Enemy, amount: number, attunement = 0) => {
    emitDamage(enemy, [amount + attunement + next.focus], emit, { impactDelayMs: form === 'knight' ? 440 : form === 'queen' ? 180 : 0, inputs: [{ source: signatureAbilities[form].name, category: 'signature', attunementName: state.transformations.active?.attunement, base: amount, attunement, focus: next.focus }] })
    next.focus = 0
  }
  if (form === 'pawn') {
    next.signatures.samuraiCharges = balance.samuraiParries
    emit({ kind: 'guard', actor: 'pawn', cell: next.cell })
  } else if (form === 'knight') {
    if (!options.destination || !vaultTargets(state, options.destination).some((enemy) => enemy.id === options.targetId)) return null
    next.cell = { ...options.destination }
    next.elevation = elevationAt(state.dungeon, next.cell)
    const target = next.enemies.find((enemy) => enemy.id === options.targetId)!
    next.facing = directionTo(next.cell, target.cell)
    emit({ kind: 'move', actor: 'pawn', cell: next.cell })
    strike(target, balance.lanceDamage, light ? balance.chargeLightBonus : 0)
    next.block = light ? 0 : balance.chargeDarkBlock
  } else if (form === 'bishop') {
    const cells = chooseAstralRegion(state.dungeon, state.explored, state.turn)!
    next.signatures.eyeUsed = true
    next.signatures.reveal = { cells, turnsLeft: balance.eyeTurns, foresight: !light }
    const ordinarySight = visibleCells(state.dungeon.tiles, state.cell)
    for (const enemy of next.enemies) if (light && enemy.hp > 0 && cells.includes(cellId(enemy.cell)) && !ordinarySight.has(cellId(enemy.cell)))
      enemy.exposedTurns = balance.exposedTurns
    emit({ kind: 'reveal', actor: 'pawn', cell: next.cell })
  } else if (form === 'rook') {
    next.block = light ? balance.rookLightBlock : balance.rookDarkBlock
    next.preparedCounter = light ? balance.rookLightRetaliation : balance.rookDarkRetaliation
    emit({ kind: 'guard', actor: 'pawn', cell: next.cell })
  } else if (form === 'king') {
    next.signatures.decree = { origin: { ...state.cell }, light }
    emit({ kind: 'windup', actor: 'pawn', cell: state.cell })
  } else {
    for (const enemy of [...next.enemies].sort((a, b) => a.id.localeCompare(b.id))) {
      if (enemy.hp <= 0 || !canSeeContent(cellId(enemy.cell), state)) continue
      if (Math.max(Math.abs(enemy.cell.column - state.cell.column), Math.abs(enemy.cell.row - state.cell.row)) <= 1)
        strike(enemy, light ? balance.queenLightDamage : balance.queenDarkDamage)
      if (enemy.hp > 0 && gridDistance(enemy.cell, state.cell) <= balance.fearRange) {
        enemy.fearTurns = enemy.boss ? 0 : 1
        if (!light) enemy.weakenedDamage = balance.queenWeakness
      }
    }
  }
  return { ...next, ...signatureFog(next) }
}

export function resolveRoyalDecree(state: GameState) {
  const decree = state.signatures.decree
  if (!decree || state.hp <= 0) return
  const targets = royalDecreeTargets(state, decree.origin)
  const budget = targets.length ? smiteBudget(state.passives, state.turn) : 0
  const emit = (event: Omit<CombatEvent, 'id' | 'seen'>) => state.events.push({ ...event, id: ++state.eventSerial, seen: true })
  targets.forEach((enemy, index) => {
    const inner = Math.max(Math.abs(enemy.cell.column - decree.origin.column), Math.abs(enemy.cell.row - decree.origin.row)) <= 1
    const amount = decree.light ? inner ? passiveBalance.decreeLightInner : passiveBalance.decreeLightOuter
      : inner ? passiveBalance.decreeDarkInner : passiveBalance.decreeDarkOuter
    emitDamage(enemy, [amount + splitBonus(budget, targets.length, index) + state.focus], emit, { effect: 'smite', inputs: [{ source: 'Royal Decree', category: 'signature', attunementName: state.transformations.active?.attunement, base: amount, passive: splitBonus(budget, targets.length, index), focus: state.focus }] })
    state.focus = 0
    if (!decree.light) pushEnemy(state, enemy, decree.origin)
  })
  return state
}

export function finishSignatureTurn(state: GameState): GameState {
  const signatures: SignatureState = { ...state.signatures, cooldowns: { ...state.signatures.cooldowns }, parryReady: false, usedThisTurn: undefined,
    samuraiCharges: state.hp > 0 && currentForm(state.transformations) === 'pawn' ? Math.min(balance.samuraiParries,Math.max(0,state.signatures.samuraiCharges)) : 0,
    reveal: state.signatures.reveal && state.signatures.reveal.turnsLeft > 1
      ? { ...state.signatures.reveal, turnsLeft: state.signatures.reveal.turnsLeft - 1 } : null }
  for (const form of Object.keys(signatures.cooldowns) as ChessForm[]) if (form !== state.signatures.usedThisTurn)
    signatures.cooldowns[form] = Math.max(0, signatures.cooldowns[form] - 1)
  const enemies = state.enemies.map((enemy) => ({ ...enemy, exposedTurns: state.signatures.usedThisTurn === 'bishop'
    ? enemy.exposedTurns : Math.max(0, (enemy.exposedTurns ?? 0) - 1) }))
  const next = { ...state, signatures, enemies }
  return { ...next, ...signatureFog(next) }
}
