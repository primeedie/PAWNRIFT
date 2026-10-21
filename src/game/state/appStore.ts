import { create } from 'zustand'
import { usePawnStore } from './pawnStore'

type AppState = {
  screen: 'title' | 'scene'
  play: () => void
  newRun: () => void
  showTitle: () => void
}

// This navigation boundary can later route defeated runs to the lobby.
export const useAppStore = create<AppState>((set) => ({
  screen: 'title',
  play: () => {
    const run = usePawnStore.getState()
    if (!run.hasStartedRun || run.status === 'defeat' || run.status === 'victory' || run.hp <= 0) run.restartRun()
    else run.resumeRun()
    set({ screen: 'scene' })
  },
  newRun: () => {
    usePawnStore.getState().restartRun()
    set({ screen: 'scene' })
  },
  showTitle: () => {
    usePawnStore.getState().suspendRun()
    set({ screen: 'title' })
  },
}))
