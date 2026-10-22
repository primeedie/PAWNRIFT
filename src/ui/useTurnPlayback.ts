import { useEffect } from 'react'
import { passiveBalance } from '../data/passives'
import { turnTiming } from '../data/combatBalance'
import { usePawnStore } from '../game/state/pawnStore'

// Runs above the Canvas. Menus suspend pending phases; resuming cannot skip an enemy response.
export function useTurnPlayback() {
  const phase = usePawnStore((state) => state.phase)
  const id = usePawnStore((state) => state.actionId)
  const advance = usePawnStore((state) => state.advancePlayback)
  const active = usePawnStore((state) => state.runActive)
  const defeated = usePawnStore((state) => state.status === 'defeat' || state.hp <= 0)
  const playerMs = usePawnStore((state) => state.events.some((event) => (event.delayMs ?? 0) > 0)
    || (!state.transformations.active && state.lastAction === 'attack') ? passiveBalance.iaiMs : turnTiming.playerMs)
  useEffect(() => {
    if (phase === 'ready' || !active || defeated) return
    const timer = window.setTimeout(() => advance(id, phase), phase === 'player' ? playerMs : turnTiming.enemyMs)
    return () => window.clearTimeout(timer)
  }, [phase, id, advance, active, defeated, playerMs])
}
