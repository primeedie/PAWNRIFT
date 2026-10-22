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
  it('fills the available world rectangle instead of applying the old conservative zoom cap', () => {
    const dungeon = generateDungeon('dungeon-in-a-box')
    for (const view of views.slice(0, 3)) {
      const result = boardFraming(view.width, view.height, dungeon.tiles, view.hud)
      expect(result.zoom / result.previousZoom).toBeGreaterThan(1.28)
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
  it('keeps the complete world within the measured header/hand/sidebar clearance at desktop sizes and browser zooms', () => {
    for (const [screenWidth, screenHeight] of [[1366,768],[1440,900],[1920,1080],[2560,1440]]) for (const browserScale of [0.8, 1, 1.25]) {
      const width = screenWidth / browserScale, height = screenHeight / browserScale
      const header = 100, hand = 260, canvasHeight = height - header - hand
      for (const sidebar of [0, 340]) {
        const canvasWidth = width - sidebar
        const f = boardFraming(canvasWidth, canvasHeight, generateDungeon('usable-world').tiles)
        const camera = new OrthographicCamera(-canvasWidth/2,canvasWidth/2,canvasHeight/2,-canvasHeight/2,0.1,100)
        const [x,y,z] = f.target
        camera.position.set(x+12,y+12,z+12); camera.lookAt(x,y,z); camera.zoom=f.zoom
        camera.updateProjectionMatrix();camera.updateMatrixWorld()
        for (const point of f.points) {
          const p = new Vector3(...point).project(camera)
          const px=(p.x+1)*canvasWidth/2, py=header+(1-p.y)*canvasHeight/2
          expect(px).toBeGreaterThan(0);expect(px).toBeLessThan(width-sidebar)
          expect(py).toBeGreaterThan(header);expect(py).toBeLessThan(height-hand)
        }
      }
    }
  })
})
