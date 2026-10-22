export function LegalTileHighlight({ uncertain = false, selected = false }: { uncertain?: boolean; selected?: boolean }) {
  return (
    <group position={[0, 0.012, 0]}>
      {!uncertain && <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.87, 0.87]} />
        <meshBasicMaterial color={selected ? '#e1c477' : '#74b7ac'} transparent opacity={selected ? 0.35 : 0.18} depthWrite={false} />
      </mesh>}
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
        <ringGeometry args={[0.53, 0.57, 4]} />
        <meshBasicMaterial color={selected ? '#e1c477' : uncertain ? '#8996a5' : '#74b7ac'} transparent opacity={uncertain ? 0.3 : 0.85} depthWrite={false} />
      </mesh>
    </group>
  )
}
