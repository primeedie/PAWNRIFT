import { describe, expect, it } from 'vitest'
import { OrthographicCamera, Vector3 } from 'three'
import { characterDesigns, characterTiming } from '../data/characterDesigns'
import { passiveBalance } from '../data/passives'
import { animationCue, characterPose, presentationDuration, type AnimationCue } from '../utils/characterAnimation'
import { createTraining, trainingArena } from '../game/logic/training'
import { resolveTurn } from '../game/logic/combat'
import { boardFraming } from '../utils/boardFraming'
import { gridToWorld } from '../utils/grid'

const forms = ['pawn', 'knight', 'bishop', 'rook', 'queen'] as const
const cues: AnimationCue[] = ['idle', 'move', 'attack', 'signature', 'defend', 'parry', 'counter', 'hit', 'transform', 'revert', 'death']
describe('presentation is deterministic and independent of combat', () => {
  it('samples every form/action without mutating rules, producing invalid transforms or stale accessories', () => {
    const game = createTraining(1).game, before = structuredClone(game)
    for (const form of forms) for (const cue of cues) for (let tick = 0; tick <= 100; tick++) {
      const pose = characterPose(form, cue, tick / 100)
      expect(Object.values(pose).every(Number.isFinite)).toBe(true)
      expect(pose.scale).toBeGreaterThan(0.9)
      expect(pose.draw).toBeGreaterThanOrEqual(0)
      expect(pose.draw).toBeLessThanOrEqual(1)
      expect(pose).toEqual(characterPose(form, cue, tick / 100))
    }
    expect(game).toEqual(before)
    expect(characterPose('pawn', 'idle', 0).draw).toBe(0)
  })
  it('resheathes before the Sharpener impact and keeps model timings inside one player presentation', () => {
    expect(characterTiming.pawn.basic).toBe(passiveBalance.iaiMs)
    expect(characterPose('pawn', 'attack', passiveBalance.followupMs / characterTiming.pawn.basic).draw).toBe(0)
    const game = createTraining(1).game, first = resolveTurn(game, { kind: 'attack', targetId: 'dummy-1' })!
    const second = resolveTurn(first, { kind: 'attack', targetId: 'dummy-1' })!
    expect(second.turn).toBe(2)
    expect(presentationDuration(second)).toBeGreaterThan(passiveBalance.followupMs)
    const id = second.eventSerial
    for (let frame = 0; frame < 200; frame++) characterPose('pawn', 'attack', frame / 199)
    expect(second.eventSerial).toBe(id)
    expect(second.passives.sharpener).toBe(2)
  })
  it('prioritizes death/reaction and returns to idle across action interruptions', () => {
    const game = createTraining(1).game
    expect(animationCue({ ...game, hp: 0, lastAction: 'attack' }, 'player')).toBe('death')
    expect(animationCue({ ...game, lastAction: 'attack' }, 'ready')).toBe('idle')
    expect(animationCue({ ...game, lastAction: 'transform' }, 'player')).toBe('transform')
    expect(animationCue({ ...game, lastAction: 'revert' }, 'player')).toBe('revert')
    expect(animationCue({ ...game, events: [{ id: 1, actor: 'pawn', kind: 'parry', cell: game.cell, seen: true }] }, 'enemies')).toBe('parry')
    for (const form of forms) for (const cue of cues) {
      const pose = characterPose(form, cue, 0.5, true)
      expect([pose.lean, pose.twist, pose.leftLeg, pose.rightLeg, pose.cape, pose.pulse]).toEqual([0, 0, 0, 0, 0, 0])
      expect(pose.scale).toBe(1)
    }
  })
})
describe('fixed-camera character clearance', () => {
  it.each([[1366, 768], [1440, 900], [1920, 1080], [2560, 1440]])('retains the fixed full-floor projection at %ix%i', (width, height) => {
    // Projection check of authored roaming envelopes, not a substitute for pixel/browser QA.
    for (const scenario of ['open', 'perch'] as const) {
      const tiles = trainingArena(scenario).tiles, canvasHeight = height - 360
      const framing = boardFraming(width, canvasHeight, tiles)
      const camera = new OrthographicCamera(-width / 2, width / 2, canvasHeight / 2, -canvasHeight / 2, 0.1, 100)
      const [x, y, z] = framing.target
      camera.position.set(x + 12, y + 12, z + 12); camera.lookAt(...framing.target); camera.zoom = framing.zoom
      camera.updateProjectionMatrix(); camera.updateMatrixWorld()
      for (const tile of tiles.filter((tile) => !tile.blocksMovement || tile.perchHeight)) {
        const [tx, , tz] = gridToWorld(tile.column, tile.row), base = tile.perchHeight ?? 0
        for (const form of forms) for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
          const body = new Vector3(tx + dx * 0.34, base + characterDesigns[form].height, tz + dz * 0.34).project(camera)
          const equipment = new Vector3(tx + dx * 0.75, base + 0.95, tz + dz * 0.75).project(camera)
          for (const point of [body, equipment]) { expect(Math.abs(point.x)).toBeLessThan(1); expect(Math.abs(point.y)).toBeLessThan(1) }
        }
      }
    }
  })
})
