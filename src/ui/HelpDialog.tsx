import { useEffect, useRef, useState } from 'react'
import { glossary, type Keyword } from '../data/glossary'
import { restoreGameFocus } from './hudInteraction'
import { TutorialLibrary } from './TutorialLibrary'

const sections: Record<string, Keyword[]> = {
  Movement: ['movement', 'range', 'sight', 'perch'], Combat: ['worldTurn','damage', 'healing','defend','parry'],
  'Cards & resources': ['energy', 'draw', 'discard', 'focus', 'block', 'counter'],
  Transformations: ['transformation', 'attunement', 'charges', 'duration', 'recovery'],
  Signatures: ['ability', 'cooldown', 'foresight'],
  Statuses:['burn','bleed','concussion','stun','fear','exposed','focus','counter'],
  Tutorials:[],
}
export function HelpDialog({ close }: { close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [section, setSection] = useState('Movement')
  useEffect(() => { const element = dialog.current!; element.showModal(); return () => element.close() }, [])
  const dismiss = () => { dialog.current?.close(); close(); restoreGameFocus() }
  return <dialog ref={dialog} className="help-dialog" aria-labelledby="help-heading"
    onKeyDown={(event) => event.stopPropagation()} onCancel={(event) => { event.preventDefault(); dismiss() }}>
    <header><h2 id="help-heading">Help</h2><button onClick={dismiss}>Close</button></header>
    <button onClick={()=>setSection('Tutorials')}>Tutorials → Choose lesson</button>
    <label>Section<select value={section} onChange={(event) => setSection(event.target.value)}>
      {Object.keys(sections).map((name) => <option key={name}>{name}</option>)}
    </select></label>
    {section==='Tutorials'?<TutorialLibrary close={dismiss}/>:<div className="help-glossary">{sections[section].map(key=><details key={key}>
      <summary>{glossary[key].label}</summary><p>{glossary[key].summary}</p><p>{glossary[key].explanation}</p>
    </details>)}</div>}
  </dialog>
}
