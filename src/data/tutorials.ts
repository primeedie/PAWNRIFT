import type { Keyword } from './glossary'
import type { CardId } from './cards'
import type { Cell } from '../game/logic/movement'

export type LessonId = 'movement' | 'attacks' | 'turns' | 'cards' | 'defense' | 'forms' | 'fog' | 'statuses'
export type TutorialGoal = 'destination' | 'move' | 'basic' | 'enemy-inspected' | 'character-inspected' | 'card-inspected'
  | 'response' | 'card' | 'energy' | 'defend' | 'block' | 'block-expired' | 'parry' | 'counter' | 'bastion' | 'transform'
  | 'ability' | 'reveal' | 'conceal' | 'burn' | 'bleed' | 'stun' | 'fear' | 'exposed' | 'focus'
export type TutorialFixture = 'empty' | 'obstacle' | 'target' | 'clock' | 'cards' | 'guard' | 'block' | 'parry'
  | 'riposte' | 'bastion' | 'item' | 'form' | 'form-ability' | 'fog' | 'burn' | 'bleed' | 'stun' | 'fear' | 'exposed' | 'focus'
export type TutorialCue = 'move' | 'attack' | 'inspect' | 'card' | 'defend' | 'wait' | 'ability' | 'forms'
export type TutorialStep = {
  id: string; title: string; instruction: string; goal: TutorialGoal; fixture?: TutorialFixture
  hint: string; cue: TutorialCue; diagram?: 'movement' | 'attack'; highlight?: Cell; target?: boolean
  card?: CardId; topics?: Keyword[]
}
export type TutorialLesson = { id: LessonId; title: string; steps: TutorialStep[] }
export const tutorials: TutorialLesson[] = [
  { id:'movement',title:'01 · Movement',steps:[
    {id:'step',title:'One tile at a time',instruction:'Move to the outlined tile. Pawn moves one square horizontally or vertically on the grid.',goal:'destination',fixture:'empty',highlight:{column:4,row:3},cue:'move',diagram:'movement',hint:'Click the outlined tile, or press D / Right. Board axes appear diagonal on screen.'},
    {id:'obstacle',title:'Go around a wall',instruction:'Reach the outlined tile beyond the wall. Walls and occupied tiles cannot be entered; invalid moves cost nothing.',goal:'destination',fixture:'obstacle',highlight:{column:4,row:2},cue:'move',diagram:'movement',hint:'Try the wall to see a free rejection. Then W / Up, followed by D / Right, goes around it.'},
  ]},
  {id:'attacks',title:'02 · Basic attacks',steps:[
    {id:'strike',title:'Choose one target',instruction:'Use E / Attack, or Choose target then click the marked dummy. Ordinary enemy clicks inspect; they do not attack.',goal:'basic',fixture:'target',target:true,cue:'attack',diagram:'attack',topics:['range','sight'],hint:'Pawn attacks one orthogonal neighbor. Teal squares mean movement; crimson × marks mean eligible attack targets.'},
  ]},
  {id:'turns',title:'03 · World turns',steps:[
    {id:'inspect',title:'Inspection is free',instruction:'Click the visible dummy to inspect it. Watch the turn count: inspection, tooltips and camera zoom cost no time.',goal:'enemy-inspected',fixture:'clock',target:true,cue:'inspect',topics:['worldTurn'],hint:'Click the dummy without selecting a card or Choose target. You can also use Inspect foe in the action controls.'},
    {id:'response',title:'Let the world respond',instruction:'Close inspection, then press Space / Wait. One accepted action gives each eligible enemy one response.',goal:'response',cue:'wait',topics:['worldTurn'],hint:'Escape closes inspection. Space advances one turn; this harmless sparring dummy will prepare its strike.'},
  ]},
  {id:'cards',title:'04 · Cards & Energy',steps:[
    {id:'inspect',title:'Read a card',instruction:'Hover, keyboard-focus or tap Cut. Its corner shows the upfront Energy cost; the enlarged face explains the target.',goal:'card-inspected',fixture:'cards',card:'cut',cue:'card',topics:['energy'],hint:'Tab to Cut for a keyboard preview, or hover/tap its face. Selecting it alone does not spend Energy.'},
    {id:'play',title:'Pay, play, replace',instruction:'Select Cut, then click the marked dummy. Watch Energy spend before the response, then recover afterward. Played cards discard and draw back to four.',goal:'card',card:'cut',target:true,cue:'card',topics:['draw','discard'],hint:'Cut targets one visible neighbor in any of eight directions. No new cards or rarities are introduced here.'},
    {id:'recover',title:'Recover Energy',instruction:'Use Space / Wait once. Every completed world turn restores Energy up to its cap, including basic actions.',goal:'energy',cue:'wait',topics:['energy'],hint:'Energy recovers only after the enemy response. Invalid plays, inspecting and canceling recover nothing.'},
  ]},
  {id:'defense',title:'05 · Defend, Block & parry',steps:[
    {id:'guard',title:'Answer a telegraphed strike',instruction:'The dummy has already marked your tile. Use Q / Defend for immediate reduction and an adjacent counter this response.',goal:'defend',fixture:'guard',cue:'defend',topics:['defend'],hint:'Q is a manual guard/counter, not a reflex-timed parry. It expires after this one response.'},
    {id:'block',title:'Absorb a hit',instruction:'Play Ward before this predictable direct hit. Block is a finite pool: absorbed damage spends it.',goal:'block',fixture:'block',card:'ward',cue:'card',topics:['block'],hint:'Select Ward, then Play above the hand. Its remaining Block can protect the next response too.'},
    {id:'inspect-block',title:'Read the remainder',instruction:'Click your form icon to inspect the remaining Block and its source-specific response window.',goal:'character-inspected',cue:'inspect',topics:['block'],hint:'The chess icon opens left-side statistics. Hovering it explains the ability without activating it.'},
    {id:'expiry',title:'Protection is temporary',instruction:'Close inspection and wait once. Ward’s immediate response counted first; its remaining pool expires after response two.',goal:'block-expired',cue:'wait',hint:'Escape, then Space. A hit may deplete Block earlier; either way it cannot become permanent.'},
    {id:'parry',title:'Samurai Mode',instruction:'Use Crimson Reversal → Confirm use. Its three automatic parries negate eligible direct hits; the immediate attack spends one.',goal:'parry',fixture:'parry',cue:'ability',topics:['parry','cooldown'],hint:'There is no separate manual-parry command. DoT, environment, unblockable and explicitly unparryable attacks bypass Samurai Mode.'},
    {id:'riposte',title:'Block and counter differ',instruction:'Play Riposte. Its first-hit counter belongs to this response; its Block has the card’s longer lifetime.',goal:'counter',fixture:'riposte',card:'riposte',cue:'card',topics:['counter'],hint:'Select Riposte, then Play. A surviving player can counter even when Block absorbs the whole hit.'},
    {id:'bastion',title:'A longer fortified stance',instruction:'Use Iron Bastion → Confirm use. Its Block lasts three responses; retaliation may trigger once within the first two.',goal:'bastion',fixture:'bastion',cue:'ability',topics:['block'],hint:'This isolated Dark Rook uses the real 8 Block / 2 retaliation values. The immediate response is window one.'},
    {id:'bastion-expiry',title:'Follow the remaining windows',instruction:'Wait through the next two responses. Watch remaining Block decrease and expire; Bastion does not retaliate every turn.',goal:'block-expired',cue:'wait',hint:'Space once for window two, then once for window three. No enemies or extra phases are added by the tutorial.'},
  ]},
  {id:'forms',title:'06 · Chess forms & abilities',steps:[
    {id:'activate',title:'Items, not cards',instruction:'Choose a practice form below, then Forms → Inspect attunement → Confirm activation. Only a tutorial item spends its charge.',goal:'transform',fixture:'item',cue:'forms',topics:['transformation','charges','duration','recovery','attunement'],hint:'Items share five Light/Dark activations, last two floors, and require one complete Pawn recovery floor. Two distinct types fit in inventory; early reversion refunds nothing.'},
    {id:'movement',title:'Try a different movement',instruction:'Make one legal move with your practice form. Diagrams illustrate directions; actual unobstructed visible slides can reach seven tiles.',goal:'move',fixture:'form',cue:'move',diagram:'movement',hint:'Knight/Bishop can walk one orthogonal tile. Click for full L-jumps or slides; Shift + direction selects jumps/diagonals.'},
    {id:'basic',title:'Basic and passive',instruction:'Attack the marked dummy. Read your form’s passive below, then inspect its real effect on the target or your statistics.',goal:'basic',fixture:'form',cue:'attack',target:true,diagram:'attack',topics:['passive'],hint:'Knight pierces defense; Bishop adds Swish/Burn; Rook starts Concussion; Queen adds Bleed. Pawn builds Sharpener for later iai follow-ups.'},
    {id:'ability',title:'Use a signature',instruction:'Use your signature through the normal ability controls. It costs one world turn and no Energy. Other forms are optional practice.',goal:'ability',fixture:'form-ability',cue:'ability',topics:['ability'],hint:'Knight: choose a highlighted L-landing then a foe. Other forms: Use → Confirm use. Bishop uses actual fog here so Astral Eye has terrain to discover.'},
  ]},
  {id:'fog',title:'07 · Fog & enemy information',steps:[
    {id:'explore',title:'Explore the corner',instruction:'Move to the outlined tile. See nearby terrain, remember explored terrain dimly, and discover entities only in current sight.',goal:'reveal',fixture:'fog',highlight:{column:4,row:3},cue:'move',topics:['sight'],hint:'D / Right approaches the corner. Solid walls block sight; diagonals require both flanking cells to be clear.'},
    {id:'inspect',title:'Inspect what you can see',instruction:'Click the newly visible dummy. Its HP, statuses and known intention belong in deliberate inspection, not permanent labels.',goal:'enemy-inspected',target:true,cue:'inspect',hint:'Inspection is free. Tiny overhead bars and targeting never expose hidden enemies.'},
    {id:'conceal',title:'Memory is terrain only',instruction:'Close inspection and step back to the outlined tile. The enemy leaves current sight; its information must disappear.',goal:'conceal',highlight:{column:3,row:3},cue:'move',hint:'Escape, then A / Left. Remembering a tile does not preserve enemy HP, targeting or inspection.'},
  ]},
  {id:'statuses',title:'08 · Status effects',steps:[
    {id:'burn',title:'Burn starts later',instruction:'As Bishop, attack the opposite-color neighboring dummy, then wait. Observe a real subsequent Burn tick.',goal:'burn',fixture:'burn',cue:'attack',target:true,topics:['burn'],hint:'E applies Burn here; Space advances its first later tick. Inspect the target for the remaining duration.'},
    {id:'bleed',title:'Independent Bleed stacks',instruction:'As Queen, attack twice. The first stack ticks on the second response while a new stack gains its own lifetime.',goal:'bleed',fixture:'bleed',cue:'attack',target:true,topics:['bleed'],hint:'Press E twice, allowing each response to finish. Each stack expires independently; full stacks never refresh.'},
    {id:'stun',title:'Concussion, then Stun',instruction:'As Rook, attack once, then wait. The countdown permits its configured responses before skipping one.',goal:'stun',fixture:'stun',cue:'attack',target:true,topics:['concussion','stun'],hint:'E starts Concussion; Space reaches the skipped response. Subsequent immunity prevents immediate reapplication.'},
    {id:'fear',title:'Fear disrupts one response',instruction:'Use Queen’s Dread Sovereign. Observe this practice target hesitate during its actual response.',goal:'fear',fixture:'fear',cue:'ability',topics:['fear'],hint:'Use → Confirm use. Real mobile foes retreat when possible; stationary dummies hesitate. Bosses resist the disruption.'},
    {id:'exposed',title:'Discover and expose',instruction:'Use Light Bishop’s Astral Eye. A newly discovered foe gains Exposed for the next eligible received attack.',goal:'exposed',fixture:'exposed',cue:'ability',topics:['exposed'],hint:'Use → Confirm use. The tutorial never marks a hidden foe. Newly revealed information obeys actual Eye visibility.'},
    {id:'focus',title:'Prepare your next strike',instruction:'Play Focus and inspect the resource row. Focus persists until your next damaging strike; it does not increase ordinary counters.',goal:'focus',fixture:'focus',card:'focus',cue:'card',topics:['focus','counter'],hint:'Select Focus, then Play. Riposte was practiced in Defense; its counter and Block expire separately.'},
  ]},
]
export const tutorialLesson = (id: LessonId) => tutorials.find(lesson=>lesson.id===id)!
