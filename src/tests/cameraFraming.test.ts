import { describe, expect, it } from 'vitest'
import { OrthographicCamera, Vector3 } from 'three'
import { cellFromId, generateDungeon, layoutStyles } from '../game/logic/dungeon'
import { boardFraming, MIN_ZOOM_SCALE, MAX_ZOOM_SCALE } from '../utils/boardFraming'
import { gridToWorld } from '../utils/grid'

describe('responsive floor framing', () => {
  const views = [
    { width: 1920, height: 1080, hud: 200 }, { width: 1366, height: 768, hud: 200 },
    { width: 1280, height: 720, hud: 200 }, { width: 1024, height: 540, hud: 0 },
    { width: 800, height: 430, hud: 0 }, { width: 480, height: 550, hud: 0 },
  ]
  it('fits terrain depth, every prop, and roaming characters across layouts and viewport sizes', () => {
    for (const style of layoutStyles) for (let seed = 0; seed < 20; seed++) {
      const dungeon = generateDungeon(`frame-${seed}`, style)
      for (const view of views) {
        const framing = boardFraming(view.width, view.height, dungeon.tiles, view.hud)
        for (const scale of [MIN_ZOOM_SCALE, MAX_ZOOM_SCALE]) {
          const camera = new OrthographicCamera(-view.width / 2, view.width / 2, view.height / 2, -view.height / 2, 0.1, 100)
          const [x, y, z] = framing.target
          camera.position.set(x + 12, y + 12, z + 12)
          camera.lookAt(x, y, z)
          camera.zoom = framing.zoom * scale
          camera.updateProjectionMatrix(); camera.updateMatrixWorld()
          expect(new Vector3(...framing.target).project(camera).length()).toBeLessThan(1)
          let extentX = 0, extentY = 0, extentZ = 0
          for (const point of framing.points) {
            const p = new Vector3(...point).project(camera)
            extentX = Math.max(extentX, Math.abs(p.x))
            extentY = Math.max(extentY, Math.abs(p.y))
            extentZ = Math.max(extentZ, Math.abs(p.z))
          }
          expect(extentX).toBeLessThan(0.981)
          expect(extentY).toBeLessThan(0.981)
          expect(extentZ).toBeLessThan(1)
        }
      }
    }
  }, 20000)
  it('targets a 28% closer desktop view while capping at the full-content fit', () => {
    const dungeon = generateDungeon('dungeon-in-a-box')
    for (const view of views.slice(0, 3)) {
      const result = boardFraming(view.width, view.height, dungeon.tiles, view.hud)
      expect(result.zoom / result.previousZoom).toBeCloseTo(1.28)
    }
  })
  it('handles irregular/missing platforms and keeps world/grid coordinates unchanged', () => {
    const tiles = generateDungeon('fragmented').tiles.filter((tile) => ![8, 9, 10, 32, 33].includes(tile.row * 8 + tile.column))
    const copy = structuredClone(tiles)
    expect(boardFraming(800, 500, tiles).zoom).toBeGreaterThan(0)
    expect(tiles).toEqual(copy)
    expect(gridToWorld(0, 0)).toEqual([-3.5, 0, -3.5])
    expect(gridToWorld(7, 7)).toEqual([3.5, 0, 3.5])
    const sparse = tiles.filter((tile) => tile.column < 3 && tile.row < 4)
    expect(boardFraming(800, 500, sparse).zoom).toBeGreaterThan(0)
    expect(cellFromId(63)).toEqual({ column: 7, row: 7 })
  })
  it('keeps projected content away from the desktop HUD corner regions', () => {
    for (const style of layoutStyles) for (let seed = 0; seed < 10; seed++) {
      const tiles = generateDungeon(`hud-${seed}`, style).tiles
      for (const view of views.slice(0, 3)) {
        const f = boardFraming(view.width, view.height, tiles, view.hud)
        const camera = new OrthographicCamera(-view.width / 2, view.width / 2, view.height / 2, -view.height / 2, 0.1, 100)
        const [x, y, z] = f.target
        camera.position.set(x + 12, y + 12, z + 12); camera.lookAt(x, y, z)
        camera.zoom = f.zoom; camera.updateProjectionMatrix(); camera.updateMatrixWorld()
        const regions = [
          [20, 16, 300, 100], [view.width - 290, 16, view.width - 20, 100],
          [20, view.height - 160, 395, view.height - 16],
          [view.width - 390, view.height - 90, view.width - 20, view.height - 16],
        ]
        for (let i = 0; i < f.points.length; i += 8) {
          const pixels = f.points.slice(i, i + 8).map((point) => {
            const p = new Vector3(...point).project(camera)
            return [(p.x + 1) * view.width / 2, (1 - p.y) * view.height / 2]
          })
          const left = Math.min(...pixels.map((p) => p[0])), right = Math.max(...pixels.map((p) => p[0]))
          const top = Math.min(...pixels.map((p) => p[1])), bottom = Math.max(...pixels.map((p) => p[1]))
          for (const [rx1, ry1, rx2, ry2] of regions) expect(right < rx1 || left > rx2 || bottom < ry1 || top > ry2).toBe(true)
        }
      }
    }
  })
})
