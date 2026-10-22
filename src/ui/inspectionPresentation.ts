import type { GameState } from '../game/logic/combat'
import { currentForm } from '../game/logic/transformations'
import { formBalance } from '../data/forms'
import { combatBalance } from '../data/combatBalance'
import { passiveBalance } from '../data/passives'
import { signatureAbilities, abilityBalance as a } from '../data/abilities'
import { abilityReason } from '../game/logic/signatures'
import { defenseBalance } from '../data/defenseBalance'

// Read-only previews from the same configured values as combat; no damage/status mutation.
export function characterStats(state: GameState) {
  const form = currentForm(state.transformations), active = state.transformations.active
  const base = form === 'pawn' ? combatBalance.playerDamage : formBalance[form].damage
  const attunement = active?.attunement === 'light' ? formBalance.lightDamage : 0
  return { form, damage: base + attunement + state.focus, focus: state.focus,
    bonus: form === 'pawn' ? state.passives.sharpener : form === 'king' ? Math.min(passiveBalance.smiteCap,state.passives.smite+passiveBalance.smiteGain) : 0,
    range: form === 'pawn' ? 1 : formBalance[form].attackRange,
    directions: form === 'bishop' ? 'Orthogonal 2 / diagonal 1' : form === 'pawn' || form === 'rook' || form === 'knight' ? 'Orthogonal' : 'Eight directions',
    basicBlock: (form === 'rook' ? formBalance.rook.basicBlock : 0) + (active?.attunement === 'dark' ? formBalance.darkBlock : 0),
    block: state.block, guarding: state.guarding ? combatBalance.guardReduction : 0,
  }
}

export function signatureInfo(state: GameState) {
  const form = currentForm(state.transformations), light = state.transformations.active?.attunement === 'light'
  const ability = signatureAbilities[form]
  const descriptions = {
    pawn: signatureAbilities.pawn.summary,
    knight: `L-leap and thrust for ${a.lanceDamage+(light?a.chargeLightBonus:0)} damage${light?'':` + ${a.chargeDarkBlock} Block`}; choose a visible foe within ${formBalance.knight.attackRange} clear orthogonal tiles of landing.`,
    bishop: `Reveal a seeded unexplored 4×4 for ${a.eyeTurns} responses; ${light?`newly discovered foes gain Exposed +${a.exposedBonus}`:'see one next enemy plan'}.`,
    rook: `Gain ${light?a.rookLightBlock:a.rookDarkBlock} Block for ${defenseBalance.bastionBlockWindows} responses; retaliate once for ${light?a.rookLightRetaliation:a.rookDarkRetaliation} within the first ${defenseBalance.bastionRetaliationWindows}.`,
    queen: `Surrounding 3×3 deals ${light?a.queenLightDamage:a.queenDarkDamage} damage; Fear within ${a.fearRange} tiles${light?'':`, next foe strike −${a.queenWeakness}`}.`,
    king: `After one enemy response, strike visible foes in a 5×5: ${light?passiveBalance.decreeLightInner:passiveBalance.decreeDarkInner}/${light?passiveBalance.decreeLightOuter:passiveBalance.decreeDarkOuter} inner/outer damage${light?'':', eligible outward knockback'}; Smite is shared.`,
  }
  const limit = form === 'bishop' ? 'Once per floor' : `Cooldown: ${ability.cooldown} turns`
  const status = form === 'pawn' && state.signatures.samuraiCharges>0 ? `SAMURAI MODE ${state.signatures.samuraiCharges}/${a.samuraiParries}` : form === 'bishop' ? state.signatures.eyeUsed ? 'Used this floor' : 'Ready'
    : state.signatures.cooldowns[form] ? `${state.signatures.cooldowns[form]} turns left` : 'Ready'
  const description = descriptions[form] + (state.focus && (form==='knight'||form==='queen'||form==='king') ? ` First hit gains ${state.focus} Focus damage.` : '')
  return { ...ability, description, limit, status, unavailable: abilityReason(state), tooltip: `${description} ${limit}. ${status}.` }
}
