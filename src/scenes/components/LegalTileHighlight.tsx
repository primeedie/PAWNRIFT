export function LegalTileHighlight({ uncertain = false, selected = false, attack = false }: { uncertain?: boolean; selected?: boolean; attack?: boolean }) {
  const color = attack ? '#e29a9a' : selected ? '#e1c477' : uncertain ? '#8996a5' : '#74b7ac'
  return (
    <group name={attack ? 'attack-target-highlight' : 'movement-destination-highlight'} position={[0, 0.012, 0]}>
      {!uncertain && !attack && <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.87, 0.87]} />
        <meshBasicMaterial color={color} transparent opacity={selected ? 0.35 : 0.18} depthWrite={false} />
      </mesh>}
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
        <ringGeometry args={attack ? [0.34, 0.39, 24] : [0.53, 0.57, 4]} />
        <meshBasicMaterial color={color} transparent opacity={uncertain ? 0.3 : 0.85} depthWrite={false} />
      </mesh>
    </group>
  )
}
