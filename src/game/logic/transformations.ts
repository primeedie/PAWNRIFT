import { transformationRules as rules, type Attunement, type BossForm, type ChessForm } from '../../data/forms'

export type TransformationItem = { form: BossForm; charges: number; attunements: Attunement[] }
export type TransformationState = {
  inventory: TransformationItem[]
  active: { form: BossForm; attunement: Attunement; floorsLeft: number } | null
  recovery: number
  recoveryStartsNextFloor?: boolean
  reconstruction: Partial<Record<BossForm, 0 | 1 | 2>>
}
export const emptyTransformations = (): TransformationState => ({ inventory: [], active: null, recovery: 0, reconstruction: {} })
export const currentForm = (state: TransformationState): ChessForm => state.active?.form ?? 'pawn'

export function activationReason(state: TransformationState, form: BossForm, attunement: Attunement) {
  if (state.active) return 'Already transformed.'
  if (state.recovery > 0) return 'Recovery in progress.'
  const item = state.inventory.find((entry) => entry.form === form)
  if (!item) return 'Transformation not carried.'
  if (item.charges <= 0) return 'No charges remaining.'
  if (!item.attunements.includes(attunement)) return 'Attunement unavailable.'
}
export function activateTransformation(state: TransformationState, form: BossForm, attunement: Attunement): TransformationState | null {
  if (activationReason(state, form, attunement)) return null
  return { ...state, inventory: state.inventory.map((item) => item.form === form ? { ...item, charges: item.charges - 1 } : item),
    active: { form, attunement, floorsLeft: rules.activeFloors } }
}

// Initial grants/unlocking attunements never refill an already owned charge pool.
export function grantTransformation(state: TransformationState, form: BossForm, attunement: Attunement): TransformationState | null {
  const owned = state.inventory.find((item) => item.form === form)
  if (owned) return { ...state, inventory: state.inventory.map((item) => item.form === form
    ? { ...item, attunements: [...new Set([...item.attunements, attunement])] } : item) }
  if (state.inventory.length >= rules.slots || (state.reconstruction[form] !== undefined && state.reconstruction[form] !== 2)) return null
  const reconstruction = { ...state.reconstruction }
  delete reconstruction[form]
  return { ...state, inventory: [...state.inventory, { form, charges: rules.charges, attunements: [attunement] }], reconstruction }
}

export function endActivation(state: TransformationState, deferRecovery = false): TransformationState {
  if (!state.active) return state
  const exhausted = state.inventory.filter((item) => item.charges === 0)
  const reconstruction = { ...state.reconstruction }
  for (const item of exhausted) reconstruction[item.form] = 0
  return { ...state, active: null, recovery: rules.recoveryFloors, ...(deferRecovery ? { recoveryStartsNextFloor: true } : {}),
    inventory: state.inventory.filter((item) => item.charges > 0), reconstruction }
}
export function completeTransformationFloor(state: TransformationState): TransformationState {
  if (state.active) return state.active.floorsLeft > 1
    ? { ...state, active: { ...state.active, floorsLeft: state.active.floorsLeft - 1 } } : endActivation(state)
  if (state.recoveryStartsNextFloor) return { ...state, recoveryStartsNextFloor: false }
  return { ...state, recovery: Math.max(0, state.recovery - 1) }
}

// Future boss-win hook; identity (not variant) counts. Full inventory preserves ready-to-claim progress.
export function recordTransformationBossWin(state: TransformationState, form: BossForm, attunement: Attunement): TransformationState {
  if (form === 'king') return state // No postgame acquisition/progression in the public prototype.
  const progress = state.reconstruction[form]
  if (progress === 0) return { ...state, reconstruction: { ...state.reconstruction, [form]: 1 } }
  if (progress === 1 || progress === 2) {
    const ready = { ...state, reconstruction: { ...state.reconstruction, [form]: 2 as const } }
    return grantTransformation(ready, form, attunement) ?? ready
  }
  return grantTransformation(state, form, attunement) ?? {...state,reconstruction:{...state.reconstruction,[form]:2}}
}
export const retentionChoices = (state: TransformationState) => state.inventory.filter((item) => item.charges > 0)

export function retainAfterDeath(state: TransformationState, chosen?: BossForm): TransformationState | null {
  const choices = retentionChoices(state)
  if (choices.length && !choices.some((item) => item.form === chosen)) return null
  const ended = endActivation(state)
  return { ...ended, inventory: ended.inventory.filter((item) => item.form === chosen) }
}

// Starting/reseeding is not a completed floor and cannot skip global recovery or refill charges.
export function transformationsForNewRun(state: TransformationState) {
  const next = endActivation(state)
  return next.recoveryStartsNextFloor ? { ...next, recoveryStartsNextFloor: false } : next
}
