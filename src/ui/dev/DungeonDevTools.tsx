import { useState } from 'react'
import { layoutStyles, type LayoutStyle } from '../../game/logic/dungeon'
import { usePawnStore } from '../../game/state/pawnStore'

export default function DungeonDevTools() {
  const { dungeon, revealAll, loadDungeon, toggleReveal } = usePawnStore()
  const [seed, setSeed] = useState(dungeon.seed)
  const [style, setStyle] = useState<LayoutStyle | ''>('')
  return (
    <details className="dungeon-dev-tools">
      <summary>Dungeon tools · development</summary>
      <form onSubmit={(event) => { event.preventDefault(); loadDungeon(seed, style || undefined) }}>
        <label>Seed<input value={seed} maxLength={200} onChange={(event) => setSeed(event.target.value)} /></label>
        <label>Layout<select value={style} onChange={(event) => setStyle(event.target.value as LayoutStyle | '')}>
          <option value="">From seed</option>
          {layoutStyles.map((item) => <option key={item} value={item}>{item}</option>)}
        </select></label>
        <button type="submit">Generate seed</button>
        <button type="button" onClick={() => {
          const next = crypto.getRandomValues(new Uint32Array(1))[0].toString(16)
          setSeed(next); loadDungeon(next, style || undefined)
        }}>New dungeon</button>
        <label className="dev-checkbox"><input type="checkbox" checked={revealAll} onChange={toggleReveal} />Reveal complete map</label>
        <p>Active: {dungeon.seed} · {dungeon.style}</p>
      </form>
    </details>
  )
}
