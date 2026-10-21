import { useEffect, useState } from 'react'
import { layoutStyles, type LayoutStyle } from '../game/logic/dungeon'
import { usePawnStore } from '../game/state/pawnStore'
import { newRunSeed } from '../utils/newRunSeed'

export default function DungeonTools() {
  const { dungeon, revealAll, loadDungeon, toggleReveal } = usePawnStore()
  const [seed, setSeed] = useState(dungeon.seed)
  const [style, setStyle] = useState<LayoutStyle | ''>('')
  useEffect(() => setSeed(dungeon.seed), [dungeon.seed])
  return (
    <details className="dungeon-dev-tools" onKeyDown={(event) => event.stopPropagation()}>
      <summary>Dungeon tools</summary>
      <form onSubmit={(event) => { event.preventDefault(); loadDungeon(seed, style || undefined) }}>
        <label>Seed<input value={seed} maxLength={200} onChange={(event) => setSeed(event.target.value)} /></label>
        <label>Layout<select value={style} onChange={(event) => setStyle(event.target.value as LayoutStyle | '')}>
          <option value="">From seed</option>
          {layoutStyles.map((item) => <option key={item} value={item}>{item}</option>)}
        </select></label>
        <button type="submit">Generate seed</button>
        <button type="button" onClick={() => {
          const next = newRunSeed(dungeon.seed)
          setSeed(next); loadDungeon(next, style || undefined)
        }}>New dungeon</button>
        {import.meta.env.DEV && <label className="dev-checkbox"><input type="checkbox" checked={revealAll} onChange={toggleReveal} />Reveal complete map</label>}
        <p>Active: {dungeon.seed} · {dungeon.style}</p>
        <p>Generating a dungeon resets this run.</p>
      </form>
    </details>
  )
}
