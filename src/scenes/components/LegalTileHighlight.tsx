export function LegalTileHighlight({ uncertain = false }: { uncertain?: boolean }) {
  return (
    <group position={[0, 0.012, 0]}>
      {!uncertain && <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.87, 0.87]} />
        <meshBasicMaterial color="#74b7ac" transparent opacity={0.18} depthWrite={false} />
      </mesh>}
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
        <ringGeometry args={[0.53, 0.57, 4]} />
        <meshBasicMaterial color={uncertain ? '#8996a5' : '#74b7ac'} transparent opacity={uncertain ? 0.3 : 0.85} depthWrite={false} />
      </mesh>
    </group>
  )
}
