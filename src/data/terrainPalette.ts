// Global coordinate parity, independent of layout generation, gaps, or platform membership.
export const chessTileColors = ['#8a997b', '#53644f'] as const
export function checkerIndex(column: number, row: number): 0 | 1 {
  return ((column + row) % 2) as 0 | 1
}
