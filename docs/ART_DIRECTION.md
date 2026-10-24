# PAWNRIFT art direction

Internal direction: **Inked Dark-Fantasy Diorama**. PAWNRIFT remains the sole title; this phrase is not a tagline. The supplied roster conveys mood, material contrast and character identity, not a requirement to reproduce its ornament, mounts, text or proportions.

## Readability and construction

- Sculpted miniature warriors on the established illustrated 8x8 tabletop. Preserve checker parity, muted biomes, fog, targeting, camera angle and grid scale. Detail must contribute a readable silhouette at default zoom.
- **Stage 8.2: chess silhouette first, humanoid second, detail third.** Use distinct torso profiles and head geometry, tapered articulated limbs, modeled boots/gauntlets and folded cloth surfaces. Shoulders sit beside the ribcage; elbows bend outward, wrists follow weapon sockets, knees support a grounded stance. Pawn shoulders stay small. No detached hands, featureless box torsos or interchangeable rounded helmets with an accessory.
- Existing mesh sources are editable TypeScript profiles in `characterMeshes.ts`, composed through shared joint conventions. Blender was unavailable; these are code-authored surfaces, **not Blender assets, GLB exports or skinned animation clips**. A future authored GLB can replace a presentation mesh while retaining the shoulder/elbow/wrist, hip/knee, back hinges and weapon socket conventions. Never introduce unlicensed assets.
- Share immutable geometry/materials across remounts. Shape and controlled folds carry detail; no downloaded texture packs, wireframe overlays, elaborate bloom or particle clouds.

## Ink, materials and light

- Selective inverted hulls emphasize major character/weapon surfaces and a few rocks/walls/blocks. Target approximately **1.35 CSS pixels**, scaled from drawing-buffer resolution and pixel ratio, independent of zoom. Back faces, ordinary depth testing and a small depth offset preserve occlusion. Never outline every triangle, trim strip or tile.
- Hulls have no pointer hit target, damage or shadow pass. Terrain hull opacity follows the ancestor fog fade. Unknown terrain/entities retain existing visibility boundaries. Public Art comparison toggles ink for comparison.
- A warm directional key, restrained cool hemisphere/ambient fill and cool rim provide depth. One 1024px soft shadow map supplies character/ground contact; terrain receives shadows. Avoid fullscreen postprocessing/AO passes unless measured benefit justifies their cost.
- Cloth is matte/rough; leather and underlayers remain charcoal. Steel uses lower roughness/higher metalness; porcelain is lighter and less metallic; brass is warm and controlled. Magical accents have restrained emission. Pawn's ivory cape and steel separate it from dark clothing; its katana supplies the principal crimson accent.
- Neutral comparison lighting is a development tool, not a second biome theme. No claim of final exposure, outline thickness or FPS without rendered browser inspection.

## Roster and equipment

| Piece | Silhouette / resting personality | Equipped striking surface |
| --- | --- | --- |
| Pawn | Angular hood over a compact Pawn-like mask, charcoal layers, ivory asymmetric half-cape, sash, bracers, structured boots; patient lowered ronin stance | Left-hip crimson katana; withdraw along sheath, cut with edge, follow through and visibly reseat |
| Knight | Elongated equine profile, angular muzzle/cheeks, strong neck and sculpted mane in both variants; athletic tapered body, Light forward/Dark guarded | Separate Hallowed cavalry lance / Void combat spear, thrust with tip; supporting hand follows the same shaft |
| Bishop | Teardrop chess mitre with a real diagonal open slit, tall layered robes and deliberate scholar gestures; Dark slightly hunched/fractured | Light staff only, cast from focus / Dark tome only, cradled at its spine with the other hand over pages; no stick or second weapon |
| Rook | Square crenellated castle helmet, wide fortress torso, heavy open lower plate and grounded brace | Light warhammer / Dark radial flanged battle mace; supported grip and actual striking surface. Stage 8.2 supersedes both-hammer direction |
| Queen | Narrow-waisted royal body, flared layered skirt and elaborate outward crown; Dark broken royal mantle | Light claws on both hands / Dark segmented, back-mounted blade wings; no Dark knuckles |
| King | Broad chest, heavy mantle and tall central cross ornament distinguish the monarch from Queen; commanding two-handed stance | Attunement-specific greatsword, edge leads the cut; resting blade carried clear of face; Training only |

Hallowed corruption is oppressive sacred order: symmetry, porcelain/brass and ceremonial construction. Void corruption is consumption: asymmetric broken surfaces, real holes and gaps, ragged cloth and slate/violet. Neither is morality or a palette swap. Pawn has one uncorrupted appearance.

## Aligned world variants

Retain each biome's base checker colors and motifs: barracks barricades, academy books, fortress battlements, castle regalia. Hallowed construction adds matched piers/plinths, sacred slit walls, ordered ivory/brass framing and squared tile inlays under a warm key. Void uses broken asymmetric piers, pierced fractured walls, loose fragments, violet cracks and a cooler key/rim. Roughness and restrained emission distinguish the materials. Small static translucent shaft/fracture accents supply atmosphere, never particle clouds. Fog scales their original transparency/emission; hidden terrain and entities retain existing boundaries. Decorative detail does not change collision/perch heights, seeded layouts, parity or vision.

Dark Queen's folded mantle stays near the body with uneven blade tips. Two fixed-length support links connect each shoulder to its blade hinge; attacks open the hinges and bring real blade edges into the neighboring target envelope. Signature poses briefly spread/sweep wider, then fold back. Empty hands conduct the motion. No flight, extra range, targets, counters, passive damage or AoE changes are implied.

## Animation and verification

- Anticipation, commitment, contact, follow-through and recovery should remain distinct. Current basic clips are provisional: Pawn 1.10s, Knight 1.00s, Bishop 1.10s, Rook 1.50s, Queen 1.05s, King 1.60s; signatures 1.45–2.10s. Heavy cuts include a 32ms pose dwell at contact, not a simulation pause.
- Pawn draws along the real left-hip sheath before turning the blade. It seats by approximately 704ms; Sharpener's existing resolved bonus is presented at 880ms afterward. Original resolved hit metadata/damage remains intact; feedback maps it onto the cinematic timeline. Samurai Mode still has exactly three automatic parries; its brief deflections create no damage or extra response.
- Shared IK preserves limb lengths and derives two-handed support from weapon-local space. Cast effects originate only from equipped staff/tome sockets; wing trails follow a blade socket. Target recoil/flash follows seen resolved impact events. Effects are bounded, fog-safe and presentation-only.
- Movement retains distinct steps, heavy strides, graceful robe motion and Knight leap/landing. Reduced motion removes idle sway, stride/bob, large torso motion, pulses and signature wing spectacle while preserving necessary weapon contact.
- Public Training controls provide a separate model viewer: piece/attunement, orbit/zoom, idle/move/basic/signature/parry samples, pause/restart/scrub, reduced motion, ink/light comparison and viewer FPS/draw/triangle counters. Black silhouette and neutral-gray overrides remove decorative materials/ink; final mode restores original materials. Compare all six side by side at close, gameplay and thumbnail isometric scales, for both attunements. It never submits gameplay actions, changes forms in the run, consumes RNG or writes saves.
- Inspect all forms/attunements at game zoom and close range: feet, elbows, grips, torso/ground clipping, wing folds/directions, katana draw and sword/hammer contact. Then inspect multi-enemy scenes, fog transitions, overlays and zoom. Automated geometry/contact/phase tests cannot certify rendered quality or performance. Keep unresolved visual QA explicit when no browser surface is available.
