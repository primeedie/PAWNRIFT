export const BOARD_SIZE = 8
export const TILE_SIZE = 1

// Columns increase along +X; rows increase along +Z. Tile surface is Y=0.
// Cell centers run from -3.5 to +3.5; the board is centered at the origin.
export function gridToWorld(column: number, row: number): [number, number, number] {
  const offset = (BOARD_SIZE - 1) / 2
  return [(column - offset) * TILE_SIZE, 0, (row - offset) * TILE_SIZE]
}
