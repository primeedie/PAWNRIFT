import type { Attunement } from './forms'
export type CharacterForm = 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king'
export const characterDesigns = {
  pawn: { title: 'The Ivory Ronin', head: 'rounded Pawn crown, layered cowl and narrow collar', chest: [0.28, 0.31, 0.22], shoulder: 0.17, headY: 1.045, height: 1.23, light: 'crimson katana', dark: 'crimson katana' },
  knight: { title: 'The Lancer', head: 'elongated equine chess head and sculpted mane', chest: [0.32, 0.37, 0.24], shoulder: 0.21, headY: 1.05, height: 1.43, light: 'cavalry lance', dark: 'combat spear' },
  bishop: { title: 'The Arcanist', head: 'split mitre', chest: [0.25, 0.37, 0.19], shoulder: 0.18, headY: 1.02, height: 1.45, light: 'ceremonial staff', dark: 'void tome' },
  rook: { title: 'The Bulwark', head: 'castle battlement helm', chest: [0.49, 0.35, 0.36], shoulder: 0.23, headY: 0.98, height: 1.29, light: 'hallowed warhammer', dark: 'void battle mace' },
  queen: { title: 'The Sovereign', head: 'flared sovereign crown', chest: [0.29, 0.39, 0.22], shoulder: 0.21, headY: 1.05, height: 1.41, light: 'dual claws', dark: 'bladed void mantle wings' },
  king: { title: 'Iudicium', head: 'tall cross-crested monarch crown', chest: [0.43, 0.42, 0.30], shoulder: 0.25, headY: 1.10, height: 1.68, light: 'greatsword', dark: 'greatsword (training)' },
} as const
export const characterPalettes = {
  light: { ivory: '#d4cbb5', armor: '#68717e', cloth: '#4a454e', metal: '#b7bcc4', accent: '#b79a60', dark: '#272c39', eye: '#202736', glow: '#d4b578' },
  dark: { ivory: '#a6abb8', armor: '#42465f', cloth: '#292633', metal: '#858aab', accent: '#a28abf', dark: '#1c2030', eye: '#d0c6d9', glow: '#9c7ac5' },
} as const satisfies Record<Attunement, Record<string, string>>
// Presentation milliseconds only, never action budgets or rule timers.
export const parryPresentationMs=100
export const characterTiming = {
  pawn: { basic: 1100, impact: 350, move: 430, signature: 1450 },
  knight: { basic: 1000, impact: 460, move: 600, signature: 1500 },
  bishop: { basic: 1100, impact: 520, move: 520, signature: 1700 },
  rook: { basic: 1500, impact: 780, move: 650, signature: 1800 },
  queen: { basic: 1050, impact: 440, move: 510, signature: 1850 },
  king: { basic: 1600, impact: 830, move: 650, signature: 2100 },
} as const
export const roninFollowupMs=880 // Presentation only; after the blade is seated at 704ms.
