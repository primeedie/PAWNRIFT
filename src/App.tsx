import { lazy, Suspense, useRef } from 'react'
import { useAppStore } from './game/state/appStore'
import { TitleScreen } from './ui/TitleScreen'
import { CombatHUD, CombatStatus } from './ui/CombatHUD'
import { useTurnPlayback } from './ui/useTurnPlayback'
import { usePawnStore } from './game/state/pawnStore'
import { GameOver } from './ui/GameOver'
import { CardHand } from './ui/CardHand'
import { TransformationHUD } from './ui/TransformationHUD'
import { TooltipProvider } from './ui/KeywordTooltip'
import { useHudLayout } from './ui/useHudLayout'
import { PLAYTEST_TOOLS_ENABLED } from './game/logic/playtesting'
import { InspectionPanels } from './ui/InspectionPanels'
import { useInspection } from './ui/useInspection'
import { TutorialPanel } from './ui/TutorialPanel'
import { tutorialStep } from './game/logic/tutorial'
import { RunHUD, FloorInteractions, BiomeIntroduction } from './ui/RunHUD'
import { TreasureReward } from './ui/TreasureReward'
import { useArtSettings } from './ui/artSettingsStore'

const FoundationScene = lazy(() => import('./scenes/FoundationScene'))
const TrainingTools = lazy(() => import('./ui/TrainingTools'))
const DungeonTools = lazy(() => import('./ui/DungeonTools'))
const ModelViewer = lazy(() => import('./ui/ModelViewer'))

export function App() {
  useTurnPlayback()
  const screen = useAppStore((state) => state.screen)
  const viewerOpen=useArtSettings(state=>state.viewerOpen)
  useInspection(screen === 'scene')
  const showTitle = useAppStore((state) => state.showTitle)
  const defeated = usePawnStore((state) => state.status === 'defeat' || state.hp <= 0)
  const training = usePawnStore((state) => state.training)
  const tutorial = usePawnStore(state=>state.tutorial)
  const leaveTraining = usePawnStore((state) => state.leaveTraining)
  const root = useRef<HTMLElement>(null)
  useHudLayout(root, screen === 'scene')

  if (screen === 'title') return <TitleScreen />

  return (
    <TooltipProvider sessionKey={tutorial?.id??'game'}><main ref={root} className={`scene-screen${tutorial?' tutorial-scene':''}`} tabIndex={-1}
      data-tutorial-cue={tutorial&&!tutorial.done?tutorialStep(tutorial).cue:undefined}
      data-tutorial-inspection={tutorial?tutorialStep(tutorial).goal:undefined}>
      <header className="scene-header">
        <div><h1>PAWNRIFT</h1><div className="level-label">{tutorial?'TUTORIAL':training ? 'TRAINING GROUNDS' : <RunHUD/>}</div><TransformationHUD /></div>
        <CombatStatus />
      </header>
      <div className="scene-viewport">
        <Suspense fallback={<p className="scene-loading" role="status">Opening the box…</p>}>
          <FoundationScene />
        </Suspense>
        {PLAYTEST_TOOLS_ENABLED && !tutorial && <Suspense fallback={null}>{training ? <TrainingTools /> : <DungeonTools />}</Suspense>}
      </div>
      <footer className="scene-footer" data-tooltip-avoid>
        <div className="game-actions">
          <FloorInteractions/>
          <CombatHUD />
          {training && !tutorial && <button className="secondary-button" onClick={leaveTraining}>Leave Training</button>}
          <button className="secondary-button" onClick={showTitle}>Return to menu</button>
        </div>
        <div className="scene-controls" role="img" aria-label="Move with WASD or arrows. Knight walks normally; Shift selects four L-jumps. Bishop walks normally; Shift selects diagonals. Slides require a clear currently visible lane. Click highlighted destinations for all jumps/slides. Faint outlines are unscouted attempts. Scroll to zoom.">
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
      <InspectionPanels />
      <BiomeIntroduction/>
      <TreasureReward/>
      {viewerOpen&&<Suspense fallback={null}><ModelViewer/></Suspense>}
      {tutorial&&<TutorialPanel/>}
      {defeated && !tutorial && <GameOver />}
    </main></TooltipProvider>
  )
}
