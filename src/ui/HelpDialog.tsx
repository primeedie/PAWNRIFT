import { useEffect, useRef, useState } from 'react'
import { glossary, type Keyword } from '../data/glossary'
import { restoreGameFocus } from './hudInteraction'

const sections: Record<string, Keyword[]> = {
  Movement: ['movement', 'perch'], Combat: ['damage', 'healing', 'fear'],
  'Cards & resources': ['energy', 'draw', 'discard', 'focus', 'block', 'counter'],
  Transformations: ['transformation', 'attunement', 'charges', 'duration', 'recovery'],
  Signatures: ['ability', 'exposed', 'foresight'],
}
export function HelpDialog({ close }: { close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [section, setSection] = useState('Movement')
  useEffect(() => { const element = dialog.current!; element.showModal(); return () => element.close() }, [])
  const dismiss = () => { dialog.current?.close(); close(); restoreGameFocus() }
  return <dialog ref={dialog} className="help-dialog" aria-labelledby="help-heading"
    onKeyDown={(event) => event.stopPropagation()} onCancel={(event) => { event.preventDefault(); dismiss() }}>
    <header><h2 id="help-heading">Mechanics guide</h2><button onClick={dismiss}>Close</button></header>
    <label>Section<select value={section} onChange={(event) => setSection(event.target.value)}>
      {Object.keys(sections).map((name) => <option key={name}>{name}</option>)}
    </select></label>
    <dl>{sections[section].map((key) => <div key={key}><dt>{glossary[key].label}</dt><dd>{glossary[key].explanation.split(/(\b\d+\b)/g)
      .map((part, index) => /^\d+$/.test(part) ? <strong key={index}>{part}</strong> : part)}</dd></div>)}</dl>
  </dialog>
}
