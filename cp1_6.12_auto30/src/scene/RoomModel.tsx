import { useMemo } from 'react'

export function RoomModel() {
  const wallMaterial = useMemo(
    () => ({ color: '#F5F1E8', roughness: 0.9, metalness: 0.02 }),
    []
  )
  const floorMaterial = useMemo(
    () => ({ color: '#8B6F47', roughness: 0.8, metalness: 0.05 }),
    []
  )
  const sofaMaterial = useMemo(
    () => ({ color: '#3D3D3D', roughness: 0.85 }),
    []
  )
  const tableMaterial = useMemo(
    () => ({ color: '#A0522D', roughness: 0.6 }),
    []
  )

  const roomW = 8
  const roomH = 4
  const roomD = 7

  return (
    <group>
      <mesh
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
      >
        <planeGeometry args={[roomW, roomD]} />
        <meshStandardMaterial {...floorMaterial} />
      </mesh>

      <mesh receiveShadow position={[0, roomH / 2, -roomD / 2]}>
        <boxGeometry args={[roomW, roomH, 0.1]} />
        <meshStandardMaterial {...wallMaterial} />
      </mesh>

      <mesh
        receiveShadow
        position={[-roomW / 2, roomH / 2, 0]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <boxGeometry args={[roomD, roomH, 0.1]} />
        <meshStandardMaterial {...wallMaterial} />
      </mesh>

      <mesh
        receiveShadow
        position={[roomW / 2, roomH / 2, 0]}
        rotation={[0, -Math.PI / 2, 0]}
      >
        <boxGeometry args={[roomD, roomH, 0.1]} />
        <meshStandardMaterial {...wallMaterial} />
      </mesh>

      <group position={[0, 0, -2]}>
        <mesh castShadow receiveShadow position={[0, 0.4, 0]}>
          <boxGeometry args={[3.2, 0.8, 1]} />
          <meshStandardMaterial {...sofaMaterial} />
        </mesh>
        <mesh castShadow receiveShadow position={[-1.3, 0.9, 0]}>
          <boxGeometry args={[0.6, 0.8, 0.95]} />
          <meshStandardMaterial {...sofaMaterial} />
        </mesh>
        <mesh castShadow receiveShadow position={[1.3, 0.9, 0]}>
          <boxGeometry args={[0.6, 0.8, 0.95]} />
          <meshStandardMaterial {...sofaMaterial} />
        </mesh>
        <mesh castShadow receiveShadow position={[0, 0.95, -0.45]}>
          <boxGeometry args={[2.2, 0.7, 0.15]} />
          <meshStandardMaterial {...sofaMaterial} />
        </mesh>
      </group>

      <group position={[0, 0, 0.5]}>
        <mesh castShadow receiveShadow position={[0, 0.5, 0]}>
          <boxGeometry args={[1.4, 0.08, 0.8]} />
          <meshStandardMaterial {...tableMaterial} />
        </mesh>
        {[
          [-0.6, -0.35],
          [0.6, -0.35],
          [-0.6, 0.35],
          [0.6, 0.35],
        ].map(([x, z], i) => (
          <mesh key={i} castShadow receiveShadow position={[x, 0.25, z]}>
            <boxGeometry args={[0.06, 0.5, 0.06]} />
            <meshStandardMaterial {...tableMaterial} />
          </mesh>
        ))}
      </group>
    </group>
  )
}
