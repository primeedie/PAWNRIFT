import { useEffect, useRef, useState } from 'react'
import { Html } from '@react-three/drei'
import { usePawnStore } from '../../game/state/pawnStore'
import { combatIndicator } from '../../game/logic/combatIndicators'
import { cellId } from '../../game/logic/dungeon'
import { canSeeContent } from '../../game/logic/visibility'
import { gridToWorld } from '../../utils/grid'
import type { CombatEvent } from '../../game/logic/combat'

const LIFETIME_MS = 850
type Indicator = { event: CombatEvent; born: number; lane: number }

export function CombatFeedback() {
  const state = usePawnStore()
  const [indicators, setIndicators] = useState<Indicator[]>([])
  const cursor = useRef({ dungeon: state.dungeon, serial: state.eventSerial })
  useEffect(() => {
    const changedFloor = cursor.current.dungeon !== state.dungeon
    const previous = changedFloor ? 0 : cursor.current.serial
    cursor.current = { dungeon: state.dungeon, serial: state.eventSerial }
    const fresh = state.events.filter((event) => event.id > previous && combatIndicator(event))
    const now = performance.now()
    setIndicators((old) => {
      const active = changedFloor ? [] : old.filter((entry) => now - entry.born < LIFETIME_MS)
      for (const event of fresh) {
        const used = new Set(active.filter((entry) => entry.event.targetId === event.targetId).map((entry) => entry.lane))
        let lane = 0
        while (used.has(lane)) lane++
        active.push({ event, born: now, lane })
      }
      return active.slice(-12)
    })
  }, [state.dungeon, state.events, state.eventSerial])
  useEffect(() => {
    if (!indicators.length) return
    const delay = Math.max(0, Math.min(...indicators.map((entry) => entry.born + LIFETIME_MS)) - performance.now())
    const timer = window.setTimeout(() => setIndicators((old) => old.filter((entry) => performance.now() - entry.born < LIFETIME_MS)), delay + 1)
    return () => window.clearTimeout(timer)
  }, [indicators])
  return <group name="combat-feedback">
    {cursor.current.dungeon === state.dungeon && indicators.map(({ event, lane }) => {
      const indicator = combatIndicator(event)
      const cell = event.targetId === 'pawn' ? state.cell : state.enemies.find((enemy) => enemy.id === event.targetId)?.cell ?? event.cell
      if (!indicator || !canSeeContent(cellId(cell), state)) return null
      const [x, , z] = gridToWorld(cell.column, cell.row)
      return <Html key={event.id} position={[x, 1.35 + lane * 0.22 + (event.targetId === 'pawn' ? state.elevation : 0), z]} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
        <span className={`combat-number ${indicator.tone}`} style={{ marginLeft: (lane % 3) * 12 }}>{indicator.text}</span>
      </Html>
    })}
  </group>
}
