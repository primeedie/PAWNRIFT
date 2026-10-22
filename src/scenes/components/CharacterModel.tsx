import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BoxGeometry, ConeGeometry, CylinderGeometry, ExtrudeGeometry, Group, MeshBasicMaterial, MeshLambertMaterial, OctahedronGeometry, RingGeometry, Shape, SphereGeometry } from 'three'
import { characterDesigns, characterPalettes, type CharacterForm } from '../../data/characterDesigns'
import { turnTiming } from '../../data/combatBalance'
import type { Attunement } from '../../data/forms'
import { animationCue, characterPose, presentationDuration } from '../../utils/characterAnimation'
import { usePawnStore } from '../../game/state/pawnStore'
import { SheathedKatana } from './CrimsonKatana'

type V = [number, number, number]
type Tone = keyof typeof characterPalettes.light
const geometry = { box: new BoxGeometry(1, 1, 1), sphere: new SphereGeometry(1, 10, 6),
  cylinder: new CylinderGeometry(1, 1, 1, 8), cone: new ConeGeometry(1, 1, 4), octahedron: new OctahedronGeometry(1), ring: new RingGeometry(0.12, 0.15, 12), arc: new RingGeometry(0.18, 0.20, 8, 1, 0, 1.8) }
const palettes = Object.fromEntries(Object.entries(characterPalettes).map(([name, colors]) => [name,
  Object.fromEntries(Object.entries(colors).map(([tone, color]) => [tone, new MeshLambertMaterial({ color, flatShading: true })]))])) as Record<Attunement, Record<Tone, MeshLambertMaterial>>
const effects = { light: new MeshBasicMaterial({ color: characterPalettes.light.glow, transparent: true, opacity: 0.40, depthWrite: false }),
  dark: new MeshBasicMaterial({ color: characterPalettes.dark.glow, transparent: true, opacity: 0.40, depthWrite: false }) }
const mantle = new Shape()
mantle.moveTo(-0.14, 0); [[0.13, 0.02], [0.19, -0.26], [0.11, -0.24], [0.07, -0.33], [0.01, -0.26], [-0.04, -0.30], [-0.15, -0.22]].forEach(([x, y]) => mantle.lineTo(x, y))
mantle.closePath()
const mantleGeometry = new ExtrudeGeometry(mantle, { depth: 0.018, bevelEnabled: false, steps: 1 })

function Part({ shape = 'box', size, at = [0, 0, 0], rotate = [0, 0, 0], tone = 'ivory', variant }: {
  shape?: keyof typeof geometry; size: readonly [number, number, number]; at?: V; rotate?: V; tone?: Tone; variant: Attunement
}) { return <mesh geometry={geometry[shape]} material={palettes[variant][tone]} scale={size as V} position={at} rotation={rotate} /> }

function Weapon({ form, variant }: { form: CharacterForm; variant: Attunement }) {
  const dark = variant === 'dark'
  if (form === 'pawn') return null
  if (form === 'knight') return <group name={dark ? 'dark-spear' : 'light-lance'} rotation={[Math.PI / 2, 0, 0]}>
    <Part variant={variant} shape="cylinder" size={[0.025, 0.82, 0.025]} at={[0, 0.04, 0]} tone="cloth" />
    <Part variant={variant} shape="cone" size={[dark ? 0.095 : 0.075, 0.20, 0.045]} at={[0, 0.54, 0]} tone={dark ? 'metal' : 'ivory'} />
    <Part variant={variant} size={[0.13, 0.035, 0.06]} at={[0, 0.41, 0]} tone="accent" />
    <Part variant={variant} shape="cone" size={[0.04, 0.11, 0.04]} at={[0, -0.42, 0]} rotate={[Math.PI, 0, 0]} tone="metal" />
    {dark && <Part variant={variant} shape="octahedron" size={[0.11, 0.055, 0.045]} at={[0, 0.46, 0]} tone="accent" />}
  </group>
  if (form === 'bishop') return dark ? <group name="dark-spellbook" rotation={[0.18, 0, 0]} position={[0, 0.02, 0.04]}>
    {[-1, 1].map((side) => <group key={side} rotation={[0, side * 0.25, 0]}>
      <Part variant={variant} size={[0.13, 0.24, 0.045]} at={[side * 0.069, 0, 0]} tone="cloth" />
      <Part variant={variant} size={[0.115, 0.20, 0.014]} at={[side * 0.065, 0, 0.026]} tone="ivory" />
    </group>)}<Part variant={variant} size={[0.035, 0.25, 0.055]} tone="accent" />
  </group> : <group name="light-staff">
    <Part variant={variant} shape="cylinder" size={[0.025, 0.92, 0.025]} at={[0, 0.15, 0]} tone="cloth" />
    <Part variant={variant} shape="octahedron" size={[0.08, 0.13, 0.07]} at={[0, 0.69, 0]} tone="accent" />
    <Part variant={variant} shape="ring" size={[0.70, 0.70, 0.70]} at={[0, 0.69, 0]} tone="metal" />
  </group>
  if (form === 'rook') return <group name={dark ? 'dark-warhammer' : 'light-greataxe'}>
    <Part variant={variant} shape="cylinder" size={[0.035, 0.59, 0.035]} at={[0, 0.12, 0]} tone="cloth" />
    <Part variant={variant} size={[0.06, 0.10, 0.065]} at={[0, -0.05, 0]} tone="accent" />
    {dark ? <><Part variant={variant} size={[0.35, 0.20, 0.23]} at={[0, 0.43, 0]} tone="metal" />
      <Part variant={variant} size={[0.38, 0.12, 0.15]} at={[0, 0.43, 0]} tone="armor" /></>
      : <><Part variant={variant} shape="octahedron" size={[0.21, 0.19, 0.06]} at={[0.10, 0.42, 0]} tone="metal" />
        <Part variant={variant} shape="octahedron" size={[0.15, 0.15, 0.055]} at={[-0.09, 0.42, 0]} tone="ivory" /></>}
  </group>
  return <group name={dark ? 'dark-knuckles' : 'light-claws'}>
    <Part variant={variant} size={[0.15, 0.10, 0.12]} at={[0, -0.01, 0.06]} tone="metal" />
    {[-1, 0, 1].map((index) => dark ? <Part key={index} variant={variant} shape="octahedron" size={[0.038, 0.035, 0.045]} at={[index * 0.048, -0.005, 0.13]} tone="accent" />
      : <Part key={index} variant={variant} shape="cone" size={[0.018, 0.18, 0.018]} at={[index * 0.045, 0, 0.18]} rotate={[Math.PI / 2, 0, 0]} tone="ivory" />)}
  </group>
}

function Head({ form, variant }: { form: CharacterForm; variant: Attunement }) {
  const dark = variant === 'dark'
  return <group name={`${form}-head`}>
    <Part variant={variant} shape="sphere" size={form === 'rook' ? [0.16, 0.16, 0.16] : [0.18, 0.18, 0.17]} />
    {[-1, 1].map((side) => <Part key={side} variant={variant} size={[0.027, 0.024, 0.012]} at={[side * 0.055, 0, 0.17]} tone="eye" />)}
    {form === 'pawn' && <>
      <Part variant={variant} shape="sphere" size={[0.185, 0.10, 0.18]} at={[0, 0.09, -0.015]} tone="armor" />
      <Part variant={variant} size={[0.22, 0.035, 0.06]} at={[0, 0.035, 0.145]} tone="ivory" />
      <Part variant={variant} size={[0.07, 0.09, 0.10]} at={[-0.145, -0.045, 0.08]} tone="metal" />
    </>}
    {form === 'knight' && <>
      <Part variant={variant} size={[0.27, 0.16, 0.24]} at={[0, 0.04, -0.025]} tone="armor" />
      <Part variant={variant} shape="cone" size={[0.13, 0.22, 0.10]} at={[0, -0.04, 0.14]} rotate={[Math.PI / 2, 0, Math.PI / 4]} tone="metal" />
      {[-1, 1].map((side) => <Part key={side} variant={variant} shape="cone" size={[0.035, 0.11, 0.04]} at={[side * 0.10, 0.18, -0.035]} tone="ivory" />)}
      {[0, 1, 2].map((i) => <Part key={i} variant={variant} shape="cone" size={[0.055, 0.13 - i * 0.02, 0.04]} at={[0, 0.17 - i * 0.015, -0.04 - i * 0.055]} tone="accent" />)}
    </>}
    {form === 'bishop' && <>
      {[-1, 1].map((side) => <Part key={side} variant={variant} shape="cone" size={[0.095, 0.33, 0.095]} at={[side * 0.055, 0.20, -0.005]} rotate={[0, Math.PI / 4, side * -0.07]} tone={dark ? 'cloth' : 'ivory'} />)}
      <Part variant={variant} size={[0.027, 0.20, 0.018]} at={[0, 0.20, 0.07]} rotate={[0, 0, -0.25]} tone="accent" />
    </>}
    {form === 'rook' && <>
      <Part variant={variant} size={[0.31, 0.23, 0.29]} at={[0, 0.03, -0.02]} tone="armor" />
      <Part variant={variant} size={[0.19, 0.035, 0.02]} at={[0, 0, 0.136]} tone="dark" />
      {[-1, 0, 1].map((i) => <Part key={i} variant={variant} size={[0.072, 0.115, 0.10]} at={[i * 0.105, 0.20, -0.015]} tone="ivory" />)}
    </>}
    {form === 'queen' && <>
      <Part variant={variant} shape="cylinder" size={[0.17, 0.055, 0.17]} at={[0, 0.13, 0]} tone="metal" />
      {[0, 1, 2, 3, 4].map((i) => <Part key={i} variant={variant} shape="cone" size={[0.034, i === 0 ? 0.20 : 0.16, 0.034]}
        at={[Math.sin(i * Math.PI * 2 / 5) * 0.14, 0.23, Math.cos(i * Math.PI * 2 / 5) * 0.14]} tone="accent" />)}
      <Part variant={variant} shape="octahedron" size={[0.035, 0.055, 0.025]} at={[0, 0.095, 0.17]} tone="accent" />
    </>}
  </group>
}

export function CharacterModel({ form, variant, reducedMotion = false }: { form: CharacterForm; variant: Attunement; reducedMotion?: boolean }) {
  const state = usePawnStore(), design = characterDesigns[form]
  const body = useRef<Group>(null), leftArm = useRef<Group>(null), rightArm = useRef<Group>(null)
  const leftLeg = useRef<Group>(null), rightLeg = useRef<Group>(null), cape = useRef<Group>(null), pulse = useRef<Group>(null), barrier = useRef<Group>(null), cuts = useRef<Group>(null)
  const intro = useRef(0)
  const motion = useRef({ key: '', elapsed: 0 }), pose = useRef(characterPose(form, 'idle', 0))
  const cue = animationCue(state, state.phase)
  useFrame(({ clock }, delta) => {
    const key = `${state.actionId}:${state.phase}:${cue}`
    if (motion.current.key !== key) motion.current = { key, elapsed: 0 }
    if (state.runActive) motion.current.elapsed += delta * 1000
    const t = motion.current.elapsed / (state.phase === 'enemies' ? turnTiming.enemyMs : presentationDuration(state))
    intro.current += delta * 1000
    pose.current = characterPose(form, cue === 'idle' && state.training && intro.current < 340 ? 'transform' : cue, cue === 'idle' && state.training ? intro.current / 340 : t, reducedMotion)
    const p = pose.current
    if (body.current) {
      body.current.rotation.set(p.lean, p.twist, 0)
      body.current.scale.setScalar(p.scale)
      body.current.position.y = reducedMotion ? 0 : (cue === 'death' ? 0.1 : Math.abs(p.lean) * 0.1) + Math.sin(clock.elapsedTime * (form === 'rook' ? 1.4 : 2)) * 0.006
    }
    if (leftArm.current) leftArm.current.rotation.x = p.leftArm
    if (rightArm.current) {
      const reaching = form === 'pawn' && ['attack', 'counter', 'defend', 'parry', 'signature'].includes(cue)
        ? Math.min(1, t / 0.12) * (1 - p.draw * 0.65) : 0
      rightArm.current.rotation.x = p.rightArm
      rightArm.current.rotation.z = form === 'pawn' ? -0.8 * reaching : 0.08
      rightArm.current.position.x = design.shoulder - reaching * 0.1
      rightArm.current.scale.y = 1 + reaching * 0.22
    }
    if (leftLeg.current) leftLeg.current.rotation.x = p.leftLeg
    if (rightLeg.current) rightLeg.current.rotation.x = p.rightLeg
    if (cape.current) cape.current.rotation.x = p.cape + (reducedMotion ? 0 : Math.sin(clock.elapsedTime * 1.6) * 0.015)
    if (pulse.current) { pulse.current.visible = p.pulse > 0.08; pulse.current.scale.setScalar(0.8 + p.pulse * 0.2) }
    if (cuts.current) cuts.current.visible = p.slash > 0.15 || (cue === 'signature' && p.pulse > 0.2)
    if (barrier.current) barrier.current.visible = p.guard > 0 && (form === 'rook' || cue === 'parry')
  })
  return <group ref={body} name={`humanoid-${form}-${variant}`} dispose={null}>
    <Part variant={variant} size={[design.chest[0], 0.13, 0.20]} at={[0, 0.45, 0]} tone="cloth" />
    <Part variant={variant} size={design.chest} at={[0, 0.68, 0]} tone={form === 'bishop' ? 'cloth' : 'armor'} />
    <Part variant={variant} size={[design.chest[0] * 0.88, 0.035, 0.235]} at={[0, 0.49, 0]} tone="accent" />
    <Part variant={variant} size={[0.10, 0.10, 0.12]} at={[0, 0.88, 0]} tone="ivory" />
    <Part variant={variant} shape="cylinder" size={[0.135, 0.045, 0.13]} at={[0, 0.88, 0]} tone="metal" />
    <group position={[0, design.headY, 0]}><Head form={form} variant={variant} /></group>
    {[-1, 1].map((side) => <group key={side} ref={side === -1 ? leftLeg : rightLeg} name={side === -1 ? 'left-leg' : 'right-leg'} position={[side * (form === 'rook' ? 0.115 : 0.08), 0.40, 0]}>
      <Part variant={variant} size={[form === 'rook' ? 0.14 : 0.105, 0.18, 0.12]} at={[0, -0.09, 0]} tone="ivory" />
      <Part variant={variant} shape="sphere" size={[0.065, 0.06, 0.06]} at={[0, -0.18, 0.01]} tone="metal" />
      <Part variant={variant} size={[0.11, 0.12, 0.13]} at={[0, -0.25, 0]} tone="armor" />
      <Part variant={variant} size={[0.14, 0.10, 0.21]} at={[0, -0.32, 0.04]} tone="dark" />
    </group>)}
    {[-1, 1].map((side) => <group key={side} ref={side === -1 ? leftArm : rightArm} name={side === -1 ? 'left-arm' : 'right-arm'} position={[side * design.shoulder, 0.81, 0]} rotation={[0, 0, side * -0.08]}>
      <Part variant={variant} size={[form === 'rook' ? 0.21 : 0.14, form === 'rook' ? 0.17 : 0.11, 0.22]} tone="armor" />
      <Part variant={variant} size={[0.085, 0.18, 0.10]} at={[0, -0.12, 0]} tone="ivory" />
      <Part variant={variant} shape="sphere" size={[0.055, 0.055, 0.055]} at={[0, -0.22, 0]} tone="metal" />
      <Part variant={variant} size={[form === 'rook' ? 0.12 : 0.095, 0.13, 0.12]} at={[0, -0.27, 0]} tone={variant === 'dark' ? 'armor' : 'ivory'} />
      <Part variant={variant} size={[0.09, 0.085, 0.09]} at={[0, -0.35, 0.015]} tone="ivory" />
      {variant === 'dark' && form !== 'pawn' && <Part variant={variant} size={[0.12, 0.12, 0.04]} at={[side * 0.025, -0.25, 0.07]} tone="accent" />}
      {(side === 1 || form === 'queen') && <group position={[0, -0.35, 0.055]}><Weapon form={form} variant={variant} /></group>}
    </group>)}
    {form === 'pawn' && <>
      <group ref={cape} position={[0.105, 0.82, -0.13]} rotation={[0, 0.12, -0.05]}><mesh geometry={mantleGeometry} material={palettes[variant].cloth} /></group>
      <Part variant={variant} shape="octahedron" size={[0.045, 0.04, 0.035]} at={[0.14, 0.82, 0.08]} tone="metal" />
      <Part variant={variant} size={[0.07, 0.21, 0.035]} at={[-0.09, 0.39, 0.12]} rotate={[0, 0, -0.12]} tone="cloth" />
      <SheathedKatana motion={pose} />
    </>}
    {form === 'bishop' && <>
      {[-1, 0, 1].map((side) => <Part key={side} variant={variant} size={[0.13, 0.40, 0.21]} at={[side * 0.105, 0.40, -0.01]} rotate={[0, 0, side * -0.07]} tone={side ? 'cloth' : 'armor'} />)}
      <Part variant={variant} size={[0.045, 0.38, 0.025]} at={[0, 0.64, 0.12]} tone="accent" />
    </>}
    {form === 'rook' && <>
      <Part variant={variant} size={[0.35, 0.25, 0.08]} at={[0, 0.69, 0.15]} tone="metal" />
      <Part variant={variant} size={[0.18, 0.045, 0.025]} at={[0, 0.73, 0.20]} tone="accent" />
    </>}
    {form === 'queen' && <>
      <Part variant={variant} shape="cone" size={[0.21, 0.30, 0.15]} at={[0, 0.40, -0.04]} rotate={[0, Math.PI / 4, 0]} tone="cloth" />
      <Part variant={variant} size={[0.12, 0.31, 0.025]} at={[-0.15, 0.58, -0.12]} rotate={[0, 0, -0.18]} tone="cloth" />
      <Part variant={variant} shape="octahedron" size={[0.045, 0.065, 0.025]} at={[0, 0.77, 0.12]} tone="accent" />
    </>}
    {form === 'queen' && <group ref={cuts} name="queen-cut-arcs" visible={false}>
      {[-1, 1].map((side) => <mesh key={side} geometry={geometry.arc} material={effects[variant]} position={[side * 0.22, 0.57, 0.29]} rotation={[0, side * 0.3, side * 0.6]} />)}
    </group>}
    <group ref={barrier} visible={false} name="temporary-guard-geometry">
      {[-1, 0, 1].map((side) => <Part key={side} variant={variant} size={[0.13, 0.25, 0.035]} at={[side * 0.13, 0.64, 0.24]} rotate={[0, side * 0.25, 0]} tone="accent" />)}
    </group>
    <group ref={pulse} visible={false} name={`${form}-signature-emphasis`}>
      <mesh geometry={geometry.ring} material={effects[variant]} position={form === 'bishop' ? [0, 1.26, 0.10] : [0, 0.05, 0]} rotation={form === 'bishop' ? [0, 0, 0] : [-Math.PI / 2, 0, 0]} scale={form === 'bishop' ? 1 : 2.8} />
      {form === 'bishop' && <Part variant={variant} shape="octahedron" size={[0.035, 0.05, 0.025]} at={[0, 1.26, 0.10]} tone="accent" />}
    </group>
  </group>
}
