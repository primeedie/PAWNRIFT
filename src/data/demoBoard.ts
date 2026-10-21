import { BOARD_SIZE } from '../utils/grid'

export type PropKind = 'tree' | 'rock' | 'wall' | 'block' | 'crystal'
type Placement = { column: number; row: number; kind: PropKind; blocksMovement: boolean; rotation?: number }

// Hand-placed visual composition only: a grove, broken enclosure, and open center.
// Crystals are decorative; solid geometry blocks movement. No encounters or randomness.
export const demoProps: Placement[] = [
  { column: 0, row: 0, kind: 'tree', blocksMovement: true },
  { column: 2, row: 0, kind: 'tree', blocksMovement: true, rotation: 0.7 },
  { column: 0, row: 2, kind: 'tree', blocksMovement: true, rotation: 1.2 },
  { column: 1, row: 1, kind: 'rock', blocksMovement: true },
  { column: 3, row: 1, kind: 'rock', blocksMovement: true },
  { column: 5, row: 0, kind: 'wall', blocksMovement: true },
  { column: 6, row: 0, kind: 'wall', blocksMovement: true },
  { column: 7, row: 0, kind: 'block', blocksMovement: true },
  { column: 7, row: 1, kind: 'wall', blocksMovement: true, rotation: Math.PI / 2 },
  { column: 5, row: 2, kind: 'block', blocksMovement: true },
  { column: 7, row: 3, kind: 'crystal', blocksMovement: false },
  { column: 0, row: 5, kind: 'rock', blocksMovement: true },
  { column: 1, row: 6, kind: 'block', blocksMovement: true },
  { column: 2, row: 5, kind: 'block', blocksMovement: true },
  { column: 0, row: 7, kind: 'crystal', blocksMovement: false },
  { column: 5, row: 6, kind: 'tree', blocksMovement: true, rotation: 0.5 },
  { column: 7, row: 5, kind: 'tree', blocksMovement: true, rotation: 1.4 },
  { column: 7, row: 7, kind: 'rock', blocksMovement: true },
]

export const demoTiles = Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, index) => ({
  column: index % BOARD_SIZE,
  row: Math.floor(index / BOARD_SIZE),
}))
