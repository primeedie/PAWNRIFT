import { useArtSettings } from './artSettingsStore'

export function ArtControls({viewer=false}:{viewer?:boolean}){
  const settings=useArtSettings()
  return <fieldset className="art-controls"><legend>Art comparison · presentation only</legend>
    <label><input type="checkbox" checked={settings.outlines} onChange={event=>useArtSettings.setState({outlines:event.target.checked})}/>Selective ink outlines</label>
    <label>Lighting<select value={settings.lighting} onChange={event=>useArtSettings.setState({lighting:event.target.value as typeof settings.lighting})}><option value="diorama">Diorama key / rim</option><option value="neutral">Neutral comparison</option></select></label>
    {viewer&&<button type="button" onClick={()=>useArtSettings.setState({viewerOpen:true})}>Open character model viewer</button>}
  </fieldset>
}
