import type { DungeonTile } from '../game/logic/dungeon'
import { gridToWorld } from './grid'

// Fallback bounds when no floor is supplied. Dungeon framing uses per-object bounds below.
export const BOARD_BOUNDS = { min: [-4, -0.8, -4], max: [4, 1.6, 4] } as const
export const BOARD_TARGET: [number, number, number] = [0, 0.4, 0]
export const CAMERA_POSITION: [number, number, number] = [12, 12.4, 12]
export const MIN_ZOOM_SCALE = 0.65
export const MAX_ZOOM_SCALE = 1

export function clampZoomScale(value: number) {
  return Math.min(MAX_ZOOM_SCALE, Math.max(MIN_ZOOM_SCALE, value))
}

export function legacyBoardZoom(width: number, height: number) {
  const spanX = BOARD_BOUNDS.max[0] - BOARD_BOUNDS.min[0]
  const spanY = BOARD_BOUNDS.max[1] - BOARD_BOUNDS.min[1]
  const spanZ = BOARD_BOUNDS.max[2] - BOARD_BOUNDS.min[2]
  const projectedWidth = (spanX + spanZ) / Math.sqrt(2)
  const projectedHeight = (spanX + 2 * spanY + spanZ) / Math.sqrt(6)
  return 0.88 * Math.min(Math.max(1, width) / projectedWidth, Math.max(1, height) / projectedHeight)
}

type Point = [number, number, number]

// Independent of fog/current positions: framing cannot reveal exploration or follow the Pawn.
export function boardVisualPoints(tiles?: readonly DungeonTile[]): Point[] {
  const points: Point[] = []
  const box = (x: number, z: number, halfX: number, halfZ: number, low: number, high: number) => {
    for (const dx of [-halfX, halfX]) for (const y of [low, high]) for (const dz of [-halfZ, halfZ]) points.push([x + dx, y, z + dz])
  }
  if (!tiles?.length) {
    for (const x of [-4, 4]) for (const y of [-0.8, 1.6]) for (const z of [-4, 4]) points.push([x, y, z])
    return points
  }
  for (const tile of tiles) {
    const [x, , z] = gridToWorld(tile.column, tile.row)
    box(x, z, 0.493, 0.493, -0.72, 0)
    if (tile.prop) {
      const bounds = {
        tree: [0.49, 0.35, 1.36], rock: [0.36, 0.36, 0.46],
        wall: [0.445, 0.145, 1.01], block: [0.285, 0.285, 0.475], crystal: [0.32, 0.2, 0.54],
      }[tile.prop]
      const rotated = Math.abs(Math.sin(tile.rotation)) > 0.5
      box(x, z, bounds[rotated ? 1 : 0], bounds[rotated ? 0 : 1], 0, bounds[2])
    }
    if (!tile.blocksMovement || tile.perchHeight) {
      const height = tile.perchHeight ?? 0
      // Allow Pawn/enemy movement anywhere traversable without changing the framing.
      // Lower envelope includes the sheathed katana at every facing and idle/step sway.
      box(x, z, 1.15, 1.15, 0.12 + height, 1.25 + height)
      box(x, z, 0.38, 0.38, -0.02 + height, 1.68 + height)
    }
  }
  return points
}

export function boardFraming(width: number, height: number, tiles?: readonly DungeonTile[], hudHeight = 0) {
  const points = boardVisualPoints(tiles)
  const right = points.map(([x, , z]) => (x - z) / Math.sqrt(2))
  const up = points.map(([x, y, z]) => (-x + 2 * y - z) / Math.sqrt(6))
  const minX = Math.min(...right), maxX = Math.max(...right)
  const minY = Math.min(...up), maxY = Math.max(...up)
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2
  const target: Point = [cx / Math.sqrt(2) - cy / Math.sqrt(6), 2 * cy / Math.sqrt(6), -cx / Math.sqrt(2) - cy / Math.sqrt(6)]
  // Pixel margins also leave room for Html enemy health/intent labels at board edges.
  const padY = Math.min(18, height * 0.04)
  // Aim at ~75% terrain width when height allows; complete character/prop bounds take priority.
  const terrainRight = tiles?.map(tile=>(tile.column-tile.row)/Math.sqrt(2))
  const terrainWidth = terrainRight?.length ? Math.max(...terrainRight)-Math.min(...terrainRight)+1.972/Math.sqrt(2) : 8*Math.sqrt(2)
  const fit = Math.min(Math.max(1,width-24)/(maxX-minX), Math.max(1,width*0.78)/terrainWidth, Math.max(1, height - 2 * padY) / (maxY - minY))
  const previous = legacyBoardZoom(width, Math.max(1, height - hudHeight))
  return { zoom: fit, target, points, previousZoom: previous }
}

export function fitBoardZoom(width: number, height: number) {
  return boardFraming(width, height).zoom
}
