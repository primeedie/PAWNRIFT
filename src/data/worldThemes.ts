import type { Attunement } from './forms'

// Presentation only. Biome palettes remain the base; these describe the corruption within them.
export const worldThemes={
  light:{name:'Hallowed',tint:'#c4bda0',side:'#566363',stone:'#8f938b',trim:'#b9a471',emission:'#9c8b60',key:'#eddbb9',rim:'#9eaec5'},
  dark:{name:'Void',tint:'#82778e',side:'#3c4055',stone:'#535766',trim:'#9780b4',emission:'#67517e',key:'#c9c8db',rim:'#a28bc1'},
} satisfies Record<Attunement,Record<string,string>>
