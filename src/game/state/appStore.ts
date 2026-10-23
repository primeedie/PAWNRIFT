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
    if(run.saveError)return
    if (!run.hasStartedRun || run.status === 'defeat' || run.status === 'victory' || run.hp <= 0) run.restartRun()
    else run.resumeRun()
    set({ screen: 'scene' })
  },
  newRun: () => {
    if(usePawnStore.getState().saveError)return
    usePawnStore.getState().restartRun()
    set({ screen: 'scene' })
  },
  showTitle: () => {
    const state = usePawnStore.getState()
    if(state.tutorial)state.exitTutorial()
    if (usePawnStore.getState().training) usePawnStore.getState().leaveTraining()
    usePawnStore.getState().suspendRun()
    set({ screen: 'title' })
  },
}))
