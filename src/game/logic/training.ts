import { bossForms, type Attunement } from '../../data/forms'
import { cardBalance } from '../../data/cards'
import { createGame, type Enemy, type GameState } from './combat'
import { cellFromId, cellId, type Dungeon } from './dungeon'
import { canOccupy, sameCell, type Cell } from './movement'
import { createStarterDeck } from './deck'
import { emptyTransformations, activateTransformation, grantTransformation } from './transformations'
import { emptySignatures, signatureFog } from './signatures'
import { emptyPassives } from './passives'
import { emptyAnalysis, type Analysis } from './combatAnalysis'

export type TrainingForm = 'pawn' | typeof bossForms[number]
export type DummySpec = { id: string; cell: Cell; hp: number; defense: number; block: number;
  rank: 'normal' | 'elite' | 'boss'; behavior: 'passive' | 'sparring'; knockback: boolean }
export type TrainingScenario = 'open' | 'line' | 'cluster' | 'separated' | 'blocked' | 'perch' | 'eye'
export const trainingScenarios: TrainingScenario[] = ['open', 'line', 'cluster', 'separated', 'blocked', 'perch', 'eye']
export type TrainingSession = { id: number; scenario: TrainingScenario; dummies: DummySpec[]; analysis: Analysis }
export type TrainingCommand =
  | { kind: 'form'; form: TrainingForm; attunement: Attunement }
  | { kind: 'scenario'; scenario: TrainingScenario }
  | { kind: 'dummies'; specs: DummySpec[] }
  | { kind: 'dummy-resource'; id: string; resource: 'hp' | 'block' }
  | { kind: 'position'; cell: Cell }
  | { kind: 'restore'; resource: 'hp' | 'energy' | 'focus' | 'deck' | 'cooldowns' | 'charges' }
  | { kind: 'reset' | 'statuses' | 'passives' | 'analysis' | 'log' | 'dummy-reset' }

export const defaultDummy = (index = 0, cell: Cell = { column: 4, row: 3 }): DummySpec => ({
  id: `dummy-${index + 1}`, cell, hp: 1000, defense: 0, block: 0, rank: 'normal', behavior: 'passive', knockback: true,
})
export function trainingArena(scenario: TrainingScenario = 'open'): Dungeon {
  return { seed: `training-grounds:${scenario}`, style: 'courtyard', spawn: { column: 3, row: 3 }, exit: { column: 0, row: 0 }, reservations: [],
    tiles: Array.from({ length: 64 }, (_, id) => {
      const wall = scenario === 'blocked' && id === 28, perch = scenario === 'perch' && id === 44
      return { ...cellFromId(id), blocksMovement: wall || perch, blocksSight: wall, rotation: 0,
        ...([0, 7, 56, 63].includes(id) ? { decoration: { kind: 'rock' as const, corner: id % 4 } } : {}),
        ...(wall ? { prop: 'wall' as const } : perch ? { prop: 'block' as const, perchHeight: 0.475 } : {}) }
    }) }
}
export function dummyEnemy(spec: DummySpec): Enemy {
  return { id: spec.id, kind: 'dummy', cell: { ...spec.cell }, from: { ...spec.cell }, hp: spec.hp, maxHp: spec.hp,
    defense: spec.defense, block: spec.block, boss: spec.rank === 'boss', elite: spec.rank === 'elite',
    trainingDummy: { behavior: spec.behavior, knockback: spec.knockback }, intent: 'idle', searchLeft: 0 }
}
export function trainingDummyPositions(scenario: TrainingScenario): Cell[] {
  return scenario === 'eye' ? [{ column: 6, row: 5 }, { column: 1, row: 1 }, { column: 1, row: 6 }] : scenario === 'line' || scenario === 'blocked' ? [{ column: 5, row: 3 }, { column: 6, row: 3 }, { column: 4, row: 4 }]
    : scenario === 'separated' ? [{ column: 1, row: 1 }, { column: 6, row: 2 }, { column: 5, row: 6 }]
      : [{ column: 4, row: 3 }, { column: 4, row: 4 }, { column: 3, row: 4 }]
}
export function createTraining(id: number, scenario: TrainingScenario = 'open', specs?: DummySpec[]) {
  const dummies = specs ?? (scenario === 'cluster' || scenario === 'separated' ? trainingDummyPositions(scenario).map((cell, i) => defaultDummy(i, cell))
    : [defaultDummy(0, trainingDummyPositions(scenario)[0])])
  const dungeon = trainingArena(scenario)
  const spawn = dungeon.tiles.filter((tile) => !tile.blocksMovement && !dummies.some((spec) => sameCell(spec.cell, tile)))
    .sort((a, b) => Math.abs(a.column - 3) + Math.abs(a.row - 3) - Math.abs(b.column - 3) - Math.abs(b.row - 3) || cellId(a) - cellId(b))[0]
  dungeon.spawn = { column: spawn.column, row: spawn.row }
  const game: GameState = { ...createGame(dungeon), mode: 'training', trainingVision: scenario === 'eye' ? 'fog' : 'full',
    enemies: dummies.map(dummyEnemy) }
  const session: TrainingSession = { id, scenario, dummies: structuredClone(dummies), analysis: emptyAnalysis() }
  return { game: { ...game, ...signatureFog(game) }, session }
}
function validDummies(game: GameState, specs: DummySpec[]) {
  const used = new Set<number>([cellId(game.cell)])
  return specs.length >= 1 && specs.length <= 3 && specs.every((spec) => {
    if (!spec.id.startsWith('dummy-') || !Number.isInteger(spec.hp) || spec.hp < 1 || spec.hp > 100000
      || !Number.isInteger(spec.defense) || spec.defense < 0 || spec.defense > 1000
      || !Number.isInteger(spec.block) || spec.block < 0 || spec.block > 10000
      || !['normal', 'elite', 'boss'].includes(spec.rank) || !['passive', 'sparring'].includes(spec.behavior)
      || used.has(cellId(spec.cell)) || !canOccupy(spec.cell, { size: 8, available: game.dungeon.tiles, blocked: game.dungeon.tiles.filter((tile) => tile.blocksMovement), occupied: [] })) return false
    used.add(cellId(spec.cell)); return true
  }) && new Set(specs.map((spec) => spec.id)).size === specs.length
}
export function trainingControl(game: GameState, session: TrainingSession, command: TrainingCommand): { game: GameState; session: TrainingSession } | null {
  if (game.mode !== 'training') return null
  let next = { ...game, events: [] as GameState['events'] }, metadata = session
  if (command.kind === 'form') {
    if (command.form !== 'pawn' && !bossForms.some((form) => form === command.form)) return null
    if (!game.dungeon.tiles.some((tile) => sameCell(tile, game.cell) && !tile.blocksMovement)) return null
    const transformations = command.form === 'pawn' ? emptyTransformations()
      : activateTransformation(grantTransformation(grantTransformation(emptyTransformations(), command.form, 'light')!, command.form, 'dark')!, command.form, command.attunement)!
    if (transformations.inventory[0]) transformations.inventory[0].charges = 5 // explicit isolated training override
    next = { ...next, transformations, passives: { ...game.passives, smite: 0, kingBasics: 0 } }
  } else if (command.kind === 'scenario' || command.kind === 'reset') {
    const fresh = createTraining(session.id, command.kind === 'scenario' ? command.scenario : session.scenario,
      command.kind === 'reset' ? session.dummies : undefined)
    return { ...fresh, game: { ...fresh.game, transformations: structuredClone(game.transformations) } }
  } else if (command.kind === 'dummies' || command.kind === 'dummy-reset') {
    const specs = command.kind === 'dummies' ? command.specs : session.dummies
    if (!validDummies(game, specs)) return null
    next.enemies = specs.map(dummyEnemy)
    metadata = { ...session, dummies: structuredClone(specs), analysis: emptyAnalysis() }
  } else if (command.kind === 'dummy-resource') {
    const spec = session.dummies.find((spec) => spec.id === command.id)
    if (!spec) return null
    const target = game.enemies.find((enemy) => enemy.id === spec.id)
    if (command.resource === 'hp' && target && target.hp <= 0 && !canOccupy(target.cell, { size: 8, available: game.dungeon.tiles,
      blocked: game.dungeon.tiles.filter((tile) => tile.blocksMovement), occupied: [game.cell, ...game.enemies.filter((enemy) => enemy.id !== spec.id && enemy.hp > 0).map((enemy) => enemy.cell)] })) return null
    next.enemies = game.enemies.map((enemy) => enemy.id !== command.id ? enemy : { ...enemy, [command.resource]: spec[command.resource],
      ...(enemy.hp <= 0 ? { intent: 'idle' as const, attackTarget: undefined } : {}) })
  } else if (command.kind === 'position') {
    if (!canOccupy(command.cell, { size: 8, available: game.dungeon.tiles, blocked: game.dungeon.tiles.filter((tile) => tile.blocksMovement),
      occupied: game.enemies.filter((enemy) => enemy.hp > 0).map((enemy) => enemy.cell) })) return null
    next.cell = { ...command.cell }; next.elevation = 0
  } else if (command.kind === 'restore') {
    if (command.resource === 'hp') { next.hp = game.maxHp; next.status = 'playing' }
    if (command.resource === 'energy') next.energy = game.maxEnergy
    if (command.resource === 'focus') next.focus = cardBalance.maxFocus
    if (command.resource === 'deck') next.deck = createStarterDeck(game.dungeon.seed)
    if (command.resource === 'cooldowns') next.signatures = emptySignatures()
    if (command.resource === 'charges') next.transformations = { ...game.transformations, recovery: 0, recoveryStartsNextFloor: false,
      inventory: game.transformations.inventory.map((item) => ({ ...item, charges: 5 })) }
  } else if (command.kind === 'statuses') next.enemies = session.dummies.map((spec) => {
    const original = game.enemies.find((enemy) => enemy.id === spec.id)
    return { ...dummyEnemy(spec), cell: original?.cell ?? spec.cell, from: original?.cell ?? spec.cell, hp: original?.hp ?? spec.hp, block: original?.block ?? spec.block }
  })
  else if (command.kind === 'passives') next.passives = emptyPassives()
  else if (command.kind === 'analysis') metadata = { ...session, analysis: emptyAnalysis() }
  else if (command.kind === 'log') metadata = { ...session, analysis: { ...session.analysis, history: [] } }
  return { game: { ...next, ...signatureFog(next) }, session: metadata }
}
