import { useEffect, useState } from 'react'
import { layoutStyles, type LayoutStyle } from '../game/logic/dungeon'
import { usePawnStore } from '../game/state/pawnStore'
import { newRunSeed } from '../utils/newRunSeed'
import TransformationTools from './TransformationTools'
import { CombatTools } from './CombatTools'
import { MapDiagnostics } from './MapDiagnostics'
import { closeHudPanels } from './hudInteraction'

export default function DungeonTools() {
  const state = usePawnStore(), { dungeon, revealAll } = state
  const [seed, setSeed] = useState(dungeon.seed), [style, setStyle] = useState<LayoutStyle | ''>(''), [message, setMessage] = useState('')
  useEffect(() => setSeed(dungeon.seed), [dungeon.seed])
  const locked = !state.runActive || state.phase !== 'ready' || state.hp <= 0
  return <details id="dungeon-tools" className="dungeon-dev-tools" name="hud-panels" data-tooltip-avoid onKeyDown={(event) => {
    if (event.currentTarget.open) {
      event.stopPropagation()
      if (/^(w|a|s|d|arrowup|arrowdown|arrowleft|arrowright)$/i.test(event.key)
        && !(event.target instanceof HTMLElement && event.target.closest('input, textarea, select'))) state.recordInputBlocked()
    }
    if (event.key === 'Escape') closeHudPanels()
  }}>
    <summary>Playtest Tools</summary>
    <div className="playtest-contents">
      <button type="button" onClick={closeHudPanels}>Close tools</button>
      <p>Public prototype tools. Explicit overrides affect only this test session.</p>
      <details id="transformation-testing"><summary>Transformation testing</summary><TransformationTools /></details>
      <details><summary>Combat testing</summary><CombatTools /></details>
      <details><summary>Dungeon controls</summary>
        <form onSubmit={(event) => { event.preventDefault(); setMessage(state.regenerateFloor(seed, style || undefined) ? 'Seed generated; carried forms and run resources preserved.' : 'Finish the current action first.') }}>
          <label>Seed<input value={seed} maxLength={200} onChange={(event) => setSeed(event.target.value)} /></label>
          <label>Layout<select value={style} onChange={(event) => setStyle(event.target.value as LayoutStyle | '')}>
            <option value="">From seed</option>{layoutStyles.map((item) => <option key={item}>{item}</option>)}
          </select></label>
          <button type="submit" disabled={locked}>Generate seed</button>
          <button type="button" disabled={locked} onClick={() => { const next = newRunSeed(dungeon.seed); setSeed(next); state.regenerateFloor(next, style || undefined) }}>New dungeon</button>
          <button type="button" disabled={locked} onClick={() => state.regenerateFloor()}>Regenerate current floor / reset encounter</button>
          <button type="button" disabled={locked} onClick={() => state.transitionFloor(undefined, true)}>Simulate completed floor</button>
          <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(dungeon.seed); setMessage('Floor seed copied.') } catch { setMessage('Copy unavailable; select the seed text below.') } }}>Copy current seed</button>
          <label className="dev-checkbox"><input type="checkbox" checked={revealAll} onChange={state.toggleReveal} />Reveal complete map</label>
          <button type="button" onClick={() => { if (state.revealAll) state.toggleReveal(); state.diagnosticLayers.forEach(state.toggleDiagnostic) }}>Restore normal fog</button>
          <p>Active: {dungeon.seed} - {dungeon.style}</p><p>Regeneration resets encounter entities and fog; it does not complete a floor or refill transformations/resources.</p>
        </form>
      </details>
      <MapDiagnostics />
      <p role="status">{message}</p>
    </div>
  </details>
}
