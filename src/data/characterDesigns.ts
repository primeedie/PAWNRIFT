import { passiveBalance } from './passives'
import type { Attunement } from './forms'
export type CharacterForm = 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen'
export const characterDesigns = {
  pawn: { title: 'The Duelist', head: 'faceted pawn helmet', chest: [0.29, 0.31, 0.20], shoulder: 0.19, headY: 0.98, height: 1.21, light: 'crimson katana', dark: 'crimson katana' },
  knight: { title: 'The Lancer', head: 'horse visor and mane crest', chest: [0.31, 0.34, 0.21], shoulder: 0.21, headY: 1.05, height: 1.34, light: 'lance', dark: 'spear' },
  bishop: { title: 'The Arcanist', head: 'split mitre', chest: [0.25, 0.37, 0.19], shoulder: 0.18, headY: 1.02, height: 1.39, light: 'staff', dark: 'spellbook' },
  rook: { title: 'The Bulwark', head: 'battlement helm', chest: [0.43, 0.35, 0.26], shoulder: 0.23, headY: 1.00, height: 1.29, light: 'greataxe', dark: 'warhammer' },
  queen: { title: 'The Sovereign', head: 'five-point crown', chest: [0.29, 0.37, 0.21], shoulder: 0.21, headY: 1.05, height: 1.39, light: 'claws', dark: 'reinforced knuckles' },
} as const
export const characterPalettes = {
  light: { ivory: '#ded8c4', armor: '#87938b', cloth: '#626e70', metal: '#8c9292', accent: '#c1aa76', dark: '#354751', eye: '#243842', glow: '#dfc78e' },
  dark: { ivory: '#cdcfc8', armor: '#526273', cloth: '#43485e', metal: '#697a89', accent: '#a18fb8', dark: '#2e3548', eye: '#d0c6d9', glow: '#a698c1' },
} as const satisfies Record<Attunement, Record<string, string>>
// Presentation milliseconds only, never action budgets or rule timers.
export const characterTiming = {
  pawn: { basic: passiveBalance.iaiMs, impact: passiveBalance.mainHitMs, move: 300, signature: 380 },
  knight: { basic: 380, impact: 150, move: 440, signature: 600 },
  bishop: { basic: 380, impact: 140, move: 360, signature: 480 },
  rook: { basic: 520, impact: 230, move: 440, signature: 460 },
  queen: { basic: 340, impact: 110, move: 360, signature: 480 },
} as const
