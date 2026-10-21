import { lazy, Suspense } from 'react'
import { useAppStore } from './game/state/appStore'
import { TitleScreen } from './ui/TitleScreen'
import { CombatHUD, CombatStatus } from './ui/CombatHUD'
import { useTurnPlayback } from './ui/useTurnPlayback'
import { usePawnStore } from './game/state/pawnStore'
import { GameOver } from './ui/GameOver'
import { CardHand } from './ui/CardHand'

const FoundationScene = lazy(() => import('./scenes/FoundationScene'))
const DungeonTools = lazy(() => import('./ui/DungeonTools'))

export function App() {
  useTurnPlayback()
  const screen = useAppStore((state) => state.screen)
  const showTitle = useAppStore((state) => state.showTitle)
  const defeated = usePawnStore((state) => state.status === 'defeat' || state.hp <= 0)

  if (screen === 'title') return <TitleScreen />

  return (
    <main className="scene-screen">
      <header className="scene-header">
        <div><h1>PAWNRIFT</h1><p className="level-label">LEVEL 1</p></div>
        <CombatStatus />
      </header>
      <div className="scene-viewport">
        <Suspense fallback={<p className="scene-loading" role="status">Opening the box…</p>}>
          <FoundationScene />
        </Suspense>
        <Suspense fallback={null}><DungeonTools /></Suspense>
      </div>
      <footer className="scene-footer">
        <div className="game-actions">
          <CombatHUD />
          <button className="secondary-button" onClick={showTitle}>Return to menu</button>
        </div>
        <div className="scene-controls" role="img" aria-label="Move with W A S D or arrow keys. Click a glowing adjacent tile to move. Scroll the mouse wheel to zoom.">
          <div className="key-cluster" aria-hidden="true">
            <kbd className="key-up">W</kbd><kbd className="key-left">A</kbd><kbd className="key-down">S</kbd><kbd className="key-right">D</kbd>
          </div>
          <span className="control-separator" aria-hidden="true" />
          <div className="key-cluster" aria-hidden="true">
            <kbd className="key-up">↑</kbd><kbd className="key-left">←</kbd><kbd className="key-down">↓</kbd><kbd className="key-right">→</kbd>
          </div>
          <span className="control-separator" aria-hidden="true" />
          <div className="mouse-controls" aria-hidden="true">
            <span className="control-icon">
              <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
                <path d="M6 3v24l6.5-6 4.5 8 4-2-4.5-8L26 17 6 3Z" fill="currentColor" stroke="#385464" strokeWidth="1.4" strokeLinejoin="round" />
                <path d="M22 5v5M26 9l-3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
            <span className="control-icon">
              <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
                <rect x="8" y="3" width="16" height="26" rx="8" stroke="currentColor" strokeWidth="2.4" />
                <path d="M16 4v9M8 14h16" stroke="currentColor" strokeWidth="2" />
                <rect x="14.5" y="7" width="3" height="5" rx="1.5" fill="currentColor" />
              </svg>
            </span>
          </div>
        </div>
      </footer>
      <CardHand />
      {defeated && <GameOver />}
    </main>
  )
}
