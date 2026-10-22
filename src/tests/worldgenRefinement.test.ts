import { expect, it } from 'vitest'
import { cellFromId, cellId, dungeonIssues, generateDungeon, neighborIds } from '../game/logic/dungeon'
import { formMovement } from '../game/logic/chessMovement'
import { createGame, movementBoard, resolveTurn, type GameState } from '../game/logic/combat'
import { activateTransformation, emptyTransformations, grantTransformation } from '../game/logic/transformations'
import { visibleCells } from '../game/logic/visibility'

it('audits 1,000 reproducible floors for density, decoration, collision, fog and Bishop/Pawn routes', () => {
  let blocked = 0, interior = 0, all = 0, decorations = 0
  const forms = activateTransformation(grantTransformation(emptyTransformations(), 'bishop', 'light')!, 'bishop', 'light')!
  for (let seed = 0; seed < 1000; seed++) {
    const dungeon = generateDungeon(`density-${seed}`)
    expect(dungeon).toEqual(generateDungeon(`density-${seed}`))
    expect(dungeonIssues(dungeon)).toEqual([])
    const open = new Set(dungeon.tiles.filter((tile) => !tile.blocksMovement).map(cellId))
    const parents = new Map<number, number>([[cellId(dungeon.spawn), -1]]), queue = [cellId(dungeon.spawn)]
    for (let i = 0; i < queue.length; i++) for (const next of neighborIds(queue[i])) {
      if (open.has(next) && !parents.has(next)) { parents.set(next, queue[i]); queue.push(next) }
    }
    expect(parents.size).toBe(open.size)
    expect(parents.has(cellId(dungeon.exit))).toBe(true)
    let game: GameState = { ...createGame(dungeon), enemies: [], transformations: forms }
    const route: number[] = []
    for (let id = cellId(dungeon.exit); parents.get(id) !== -1; id = parents.get(id)!) route.unshift(id)
    for (const id of route) {
      const to = cellFromId(id), before = game
      expect(formMovement('pawn')(game.cell, to, movementBoard(game))).toBe(true)
      expect(formMovement('bishop')(game.cell, to, movementBoard(game))).toBe(true)
      expect((to.row + to.column) % 2).not.toBe((game.cell.row + game.cell.column) % 2)
      game = resolveTurn(game, { kind: 'move', destination: to })!
      expect(game.turn).toBe(before.turn + 1)
      expect(game.energy).toBe(before.energy)
      expect(game.signatures).toEqual(before.signatures)
      expect(game.transformations).toEqual(before.transformations)
      expect(game.visible).toEqual(visibleCells(dungeon.tiles, to))
    }
    expect(game.status).toBe('victory')
    for (const tile of dungeon.tiles) {
      if (tile.blocksMovement) all++
      if (tile.column > 0 && tile.column < 7 && tile.row > 0 && tile.row < 7) { interior++; if (tile.blocksMovement) blocked++ }
      if (tile.decoration) { decorations++; expect(tile.blocksMovement || tile.blocksSight).toBe(false) }
    }
  }
  // Aggregate tuning, not a quota per floor; structural perimeter is excluded.
  expect(blocked / interior).toBeGreaterThanOrEqual(0.10)
  expect(blocked / interior).toBeLessThanOrEqual(0.15)
  expect(decorations).toBeGreaterThan(blocked)
  process.stdout.write(JSON.stringify({ floors: 1000, candidateInteriorTiles: interior, blockingInteriorTiles: blocked,
    interiorPercent: 100 * blocked / interior, allBoardPercent: 100 * all / 64000, decorations }) + '\n')
}, 30000)
