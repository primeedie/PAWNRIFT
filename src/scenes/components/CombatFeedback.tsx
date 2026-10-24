import { useEffect, useRef, useState } from 'react'
import { Html } from '@react-three/drei'
import { usePawnStore } from '../../game/state/pawnStore'
import { combatIndicator } from '../../game/logic/combatIndicators'
import { cellId } from '../../game/logic/dungeon'
import { canSeeContent } from '../../game/logic/visibility'
import { gridToWorld } from '../../utils/grid'
import type { CombatEvent } from '../../game/logic/combat'
import { impactPresentationDelay } from '../../utils/combatPresentation'
import { playCombatCue } from '../../ui/combatAudio'

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
    state.events.filter(event=>event.id>previous&&event.seen).slice(-6).forEach(playCombatCue)
    const now = performance.now()
    setIndicators((old) => {
      const active = changedFloor ? [] : old.filter((entry) => now - entry.born < LIFETIME_MS)
      for (const event of fresh) {
        const used = new Set(active.filter((entry) => entry.event.targetId === event.targetId).map((entry) => entry.lane))
        let lane = 0
        while (used.has(lane)) lane++
        active.push({ event, born: now + impactPresentationDelay(event,state.events,state.transformations.active?.form??'pawn'), lane })
      }
      return active.slice(-12)
    })
  }, [state.dungeon, state.events, state.eventSerial])
  useEffect(() => {
    if (!indicators.length) return
    const now = performance.now()
    const deadlines = indicators.flatMap((entry) => [entry.born > now ? entry.born : entry.born + LIFETIME_MS,
      ...(entry.event.effect && entry.born + 140 > now ? [entry.born + 140] : [])])
    const delay = Math.max(0, Math.min(...deadlines) - now)
    const timer = window.setTimeout(() => setIndicators((old) => old.filter((entry) => performance.now() - entry.born < LIFETIME_MS)), delay + 1)
    return () => window.clearTimeout(timer)
  }, [indicators])
  return <group name="combat-feedback">
    {cursor.current.dungeon === state.dungeon && indicators.map(({ event, lane, born }) => {
      const indicator = combatIndicator(event)
      const cell = event.targetId === 'pawn' ? state.cell : state.enemies.find((enemy) => enemy.id === event.targetId)?.cell ?? event.cell
      if (performance.now() < born || !indicator || !canSeeContent(cellId(cell), state)) return null
      const [x, , z] = gridToWorld(cell.column, cell.row)
      const color = event.effect === 'splash' || event.effect === 'burn' ? '#b5a0d3'
        : event.effect === 'concussion' || event.effect === 'smite' ? '#e1c477' : event.effect === 'pierce' ? '#94b7d6' : '#e29a9a'
      return <group key={event.id}>
        {(event.effect||event.kind==='stun') && performance.now() - born < 140 && <mesh position={[x, event.effect==='sharpener'?0.65:0.04, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.34, 0.43, 12]} /><meshBasicMaterial color={color} transparent opacity={0.55} depthWrite={false} />
        </mesh>}
        <Html position={[x, 1.35 + lane * 0.22 + (event.targetId === 'pawn' ? state.elevation : 0), z]} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
        <span className={`combat-number ${indicator.tone}`} style={{ marginLeft: (lane % 3) * 12 }}>{indicator.text}</span>
        </Html>
      </group>
    })}
  </group>
}
