import { describe, expect, it } from 'vitest'
import { OrthographicCamera, Vector3 } from 'three'
import { demoProps, demoTiles } from '../data/demoBoard'
import { BOARD_SIZE, gridToWorld } from '../utils/grid'
import {
  BOARD_BOUNDS, BOARD_TARGET, CAMERA_POSITION,
  MIN_ZOOM_SCALE, MAX_ZOOM_SCALE, clampZoomScale, fitBoardZoom,
} from '../utils/boardFraming'

describe('static board coordinates', () => {
  it('contains exactly 64 unique cells covering the 8×8 board', () => {
    expect(demoTiles).toHaveLength(64)
    const cells = new Set(demoTiles.map(({ column, row }) => `${column},${row}`))
    expect(cells.size).toBe(64)
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let column = 0; column < BOARD_SIZE; column++) {
        expect(cells.has(`${column},${row}`)).toBe(true)
      }
    }
    expect(demoProps.every(({ column, row }) => cells.has(`${column},${row}`))).toBe(true)
  })

  it('centers the board with unit spacing and a consistent X/Z orientation', () => {
    expect(gridToWorld(0, 0)).toEqual([-3.5, 0, -3.5])
    expect(gridToWorld(7, 7)).toEqual([3.5, 0, 3.5])
    expect(gridToWorld(1, 0)).toEqual([-2.5, 0, -3.5])
    expect(gridToWorld(0, 1)).toEqual([-3.5, 0, -2.5])
  })
})

describe('orthographic framing regression', () => {
  const viewports = [[1920, 850], [1280, 530], [800, 430], [480, 600], [1200, 220]]

  for (const [width, height] of viewports) {
    for (const scale of [MIN_ZOOM_SCALE, MAX_ZOOM_SCALE]) {
      it(`centers and contains all visual bounds at ${width}×${height}, zoom ${scale}`, () => {
        const camera = new OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, 0.1, 100)
        camera.position.set(...CAMERA_POSITION)
        camera.lookAt(...BOARD_TARGET)
        camera.zoom = fitBoardZoom(width, height) * scale
        camera.updateProjectionMatrix()
        camera.updateMatrixWorld()

        const center = new Vector3(...BOARD_TARGET).project(camera)
        expect(center.x).toBeCloseTo(0)
        expect(center.y).toBeCloseTo(0)
        for (const x of [BOARD_BOUNDS.min[0], BOARD_BOUNDS.max[0]]) {
          for (const y of [BOARD_BOUNDS.min[1], BOARD_BOUNDS.max[1]]) {
            for (const z of [BOARD_BOUNDS.min[2], BOARD_BOUNDS.max[2]]) {
              const projected = new Vector3(x, y, z).project(camera)
              expect(Math.abs(projected.x)).toBeLessThanOrEqual(0.981)
              expect(Math.abs(projected.y)).toBeLessThanOrEqual(0.981)
              expect(Math.abs(projected.z)).toBeLessThan(1)
            }
          }
        }
      })
    }
  }

  it('bounds zoom before it can crop the board', () => {
    expect(clampZoomScale(100)).toBe(MAX_ZOOM_SCALE)
    expect(clampZoomScale(-100)).toBe(MIN_ZOOM_SCALE)
    expect(clampZoomScale(0.8)).toBe(0.8)
  })
})
