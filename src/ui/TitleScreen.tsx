import { useAppStore } from '../game/state/appStore'

export function TitleScreen() {
  const play = useAppStore((state) => state.play)

  return (
    <main className="title-screen">
      <div className="title-content">
        <h1>PAWNRIFT</h1>
        <button className="play-button" onClick={play}>Play</button>
      </div>
    </main>
  )
}
