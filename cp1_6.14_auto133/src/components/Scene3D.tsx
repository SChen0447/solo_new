import { useRef, useMemo, useEffect, useState } from 'react'
import { useFrame, ThreeEvent } from '@react-three/fiber'
import { OrbitControls, Html, Grid, Stars, EffectComposer, Bloom } from '@react-three/drei'
import * as THREE from 'three'
import type { CityNode, DataFlow, NodeType } from '../store'
import {
  generateBezierCurve,
  getPointOnBezier,
  getRateColor,
  calculateLoadState,
  getNodeTypeColor,
  getBezierLength,
} from '../utils/dataFlow'

interface Scene3DProps {
  nodes: CityNode[]
  flows: DataFlow[]
  selectedNodeId: string | null
  hoveredNodeId: string | null
  onNodeClick: (nodeId: string | null) => void
  onNodeHover: (nodeId: string | null) => void
}

interface EmitParticle {
  id: number
  position: THREE.Vector3
  velocity: THREE.Vector3
  life: number
  maxLife: number
  color: THREE.Color
}

function CityNodeMesh({
  node,
  isSelected,
  isHovered,
  onClick,
  onPointerOver,
  onPointerOut,
}: {
  node: CityNode
  isSelected: boolean
  isHovered: boolean
  onClick: () => void
  onPointerOver: () => void
  onPointerOut: () => void
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const edgesRef = useRef<THREE.LineSegments>(null)
  const timeRef = useRef(0)
  const emitParticlesRef = useRef<EmitParticle[]>([])
  const particleIdRef = useRef(0)
  const lastEmitTimeRef = useRef(0)

  const loadState = useMemo(() => calculateLoadState(node.load), [node.load])
  const baseColor = useMemo(() => getNodeTypeColor(node.type), [node.type])

  const targetScale = useMemo(() => {
    return isSelected ? 1.2 : 1
  }, [isSelected])

  const targetY = useMemo(() => {
    return node.position[1] + (isSelected ? 2 : 0)
  }, [isSelected, node.position])

  useFrame((state, delta) => {
    if (!meshRef.current) return

    timeRef.current += delta

    const mesh = meshRef.current

    const currentScale = mesh.scale.x
    const newScale = THREE.MathUtils.lerp(currentScale, targetScale, delta * 5)
    mesh.scale.set(newScale, newScale, newScale)

    const currentY = mesh.position.y
    const newY = THREE.MathUtils.lerp(currentY, targetY, delta * 5)
    mesh.position.y = newY

    const material = mesh.material as THREE.MeshStandardMaterial

    if (loadState.level === 'low') {
      const pulse = Math.sin(timeRef.current * Math.PI * 2 / loadState.pulseSpeed) * 0.5 + 0.5
      const opacity = THREE.MathUtils.lerp(
        loadState.opacityRange[0],
        loadState.opacityRange[1],
        pulse
      )
      material.opacity = opacity
    } else if (loadState.level === 'medium') {
      mesh.rotation.y += loadState.rotationSpeed * delta * 2
      material.opacity = 0.7
    } else if (loadState.level === 'high') {
      const pulse = Math.sin(timeRef.current * Math.PI * 2 / 0.2) * 0.5 + 0.5
      const opacity = THREE.MathUtils.lerp(
        loadState.opacityRange[0],
        loadState.opacityRange[1],
        pulse
      )
      material.opacity = opacity
    }

    if (edgesRef.current) {
      const edgeMaterial = edgesRef.current.material as THREE.LineBasicMaterial
      if (isHovered || isSelected) {
        edgeMaterial.opacity = 0.8
      } else {
        edgeMaterial.opacity = 0
      }
    }

    if (loadState.particleEmitRate > 0) {
      const emitInterval = 1 / loadState.particleEmitRate
      if (timeRef.current - lastEmitTimeRef.current > emitInterval) {
        lastEmitTimeRef.current = timeRef.current
        
        for (let i = 0; i < loadState.particleCount; i++) {
          const direction = new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            Math.random(),
            (Math.random() - 0.5) * 2
          ).normalize()
          
          emitParticlesRef.current.push({
            id: particleIdRef.current++,
            position: new THREE.Vector3(
              mesh.position.x,
              mesh.position.y,
              mesh.position.z
            ),
            velocity: direction.multiplyScalar(2),
            life: 1,
            maxLife: 1,
            color: new THREE.Color(baseColor),
          })
        }
      }
    }

    emitParticlesRef.current = emitParticlesRef.current.filter((p) => {
      p.position.add(p.velocity.clone().multiplyScalar(delta))
      p.life -= delta
      return p.life > 0
    })
  })

  const emitParticleMeshes = useMemo(() => {
    return emitParticlesRef.current.map((p) => (
      <mesh key={p.id} position={p.position.toArray()}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshBasicMaterial color={p.color} transparent opacity={p.life} />
      </mesh>
    ))
  }, [])

  return (
    <group position={[node.position[0], targetY, node.position[2]]}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation()
          onClick()
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          onPointerOver()
        }}
        onPointerOut={(e) => {
          e.stopPropagation()
          onPointerOut()
        }}
      >
        <boxGeometry args={[10, 10, 10]} />
        <meshStandardMaterial
          color={baseColor}
          transparent
          opacity={0.7}
          emissive={baseColor}
          emissiveIntensity={isHovered ? 0.3 : 0.1}
        />
      </mesh>

      <lineSegments ref={edgesRef}>
        <edgesGeometry args={[new THREE.BoxGeometry(10.1, 10.1, 10.1)]} />
        <lineBasicMaterial color={baseColor} transparent opacity={0} linewidth={2} />
      </lineSegments>

      {isSelected && (
        <Html position={[0, 8, 0]} center>
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '14px',
              whiteSpace: 'nowrap',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{node.name}</div>
            <div style={{ color: getNodeTypeColor(node.type), marginBottom: '4px' }}>
              类型: {node.type === 'commercial' ? '商业区' : node.type === 'residential' ? '居民区' : '工业区'}
            </div>
            <div>
              负载: {node.load.toFixed(1)}%
              <span
                style={{
                  display: 'inline-block',
                  width: '60px',
                  height: '6px',
                  background: '#333',
                  borderRadius: '3px',
                  marginLeft: '8px',
                  verticalAlign: 'middle',
                }}
              >
                <span
                  style={{
                    display: 'block',
                    width: `${node.load}%`,
                    height: '100%',
                    background: loadState.level === 'low' ? '#4caf50' : loadState.level === 'medium' ? '#ffc107' : '#f44336',
                    borderRadius: '3px',
                  }}
                />
              </span>
            </div>
          </div>
        </Html>
      )}

      {emitParticleMeshes}
    </group>
  )
}

function DataFlowLine({
  flow,
  sourceNode,
  targetNode,
}: {
  flow: DataFlow
  sourceNode: CityNode
  targetNode: CityNode
}) {
  const particlesRef = useRef<THREE.Mesh[]>([])
  const progressRef = useRef<number[]>([])
  const trailRef = useRef<THREE.Line[]>([])
  const timeRef = useRef(0)

  const curve = useMemo(() => {
    return generateBezierCurve(sourceNode.position, targetNode.position)
  }, [sourceNode.position, targetNode.position])

  const curveLength = useMemo(() => getBezierLength(curve), [curve])

  const particleCount = useMemo(() => {
    return Math.min(Math.floor(curveLength / 0.5), 50)
  }, [curveLength])

  const lineColor = useMemo(() => getRateColor(flow.rate), [flow.rate])

  useEffect(() => {
    progressRef.current = []
    for (let i = 0; i < particleCount; i++) {
      progressRef.current.push(i / particleCount)
    }
  }, [particleCount])

  useFrame((state, delta) => {
    timeRef.current += delta

    const speed = (0.05 + (flow.rate / 100) * 0.05) * delta * 60

    for (let i = 0; i < particleCount; i++) {
      if (!particlesRef.current[i]) continue

      progressRef.current[i] += speed
      if (progressRef.current[i] > 1) {
        progressRef.current[i] = progressRef.current[i] - 1
      }

      const point = getPointOnBezier(curve, progressRef.current[i])
      particlesRef.current[i].position.copy(point)

      const particleMat = particlesRef.current[i].material as THREE.MeshBasicMaterial
      particleMat.color.copy(getRateColor(flow.rate))
    }
  })

  const linePoints = useMemo(() => {
    const points: THREE.Vector3[] = []
    for (let i = 0; i <= 50; i++) {
      points.push(getPointOnBezier(curve, i / 50))
    }
    return points
  }, [curve])

  const lineGeometry = useMemo(() => {
    const positions = new Float32Array(linePoints.length * 3)
    linePoints.forEach((p, i) => {
      positions[i * 3] = p.x
      positions[i * 3 + 1] = p.y
      positions[i * 3 + 2] = p.z
    })
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geo
  }, [linePoints])

  return (
    <group>
      <line geometry={lineGeometry}>
        <lineBasicMaterial color={lineColor} transparent opacity={0.3} />
      </line>

      {Array.from({ length: particleCount }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            if (el) particlesRef.current[i] = el
          }}
        >
          <sphereGeometry args={[0.2, 8, 8]} />
          <meshBasicMaterial color={lineColor} />
        </mesh>
      ))}
    </group>
  )
}

export default function Scene3D({
  nodes,
  flows,
  selectedNodeId,
  hoveredNodeId,
  onNodeClick,
  onNodeHover,
}: Scene3DProps) {
  const cameraDistanceRef = useRef(30)

  const flowData = useMemo(() => {
    return flows
      .map((flow) => {
        const sourceNode = nodes.find((n) => n.id === flow.sourceId)
        const targetNode = nodes.find((n) => n.id === flow.targetId)
        if (!sourceNode || !targetNode) return null
        return { flow, sourceNode, targetNode }
      })
      .filter(Boolean) as { flow: DataFlow; sourceNode: CityNode; targetNode: CityNode }[]
  }, [flows, nodes])

  const handleSceneClick = () => {
    onNodeClick(null)
  }

  return (
    <>
      <color attach="background" args={['#0a0a1a']} />
      <fog attach="fog" args={['#0a0a1a', 50, 100]} />

      <ambientLight intensity={0.3} />
      <pointLight position={[20, 30, 20]} intensity={1} color="#ffffff" />
      <pointLight position={[-20, 20, -20]} intensity={0.5} color="#7c4dff" />
      <directionalLight position={[0, 50, 0]} intensity={0.5} color="#4fc3f7" />

      <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />

      <Grid
        position={[0, -5, 0]}
        args={[100, 100]}
        cellSize={5}
        cellThickness={0.5}
        cellColor="#1a1a3a"
        sectionSize={25}
        sectionThickness={1}
        sectionColor="#2a2a4a"
        fadeDistance={80}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid
      />

      <group onClick={handleSceneClick}>
        {nodes.map((node) => (
          <CityNodeMesh
            key={node.id}
            node={node}
            isSelected={selectedNodeId === node.id}
            isHovered={hoveredNodeId === node.id}
            onClick={() => onNodeClick(node.id)}
            onPointerOver={() => onNodeHover(node.id)}
            onPointerOut={() => onNodeHover(null)}
          />
        ))}

        {flowData.map(({ flow, sourceNode, targetNode }) => (
          <DataFlowLine
            key={flow.id}
            flow={flow}
            sourceNode={sourceNode}
            targetNode={targetNode}
          />
        ))}
      </group>

      <EffectComposer>
        <Bloom
          intensity={0.5}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>

      <OrbitControls
        enablePan={false}
        minDistance={10}
        maxDistance={50}
        minPolarAngle={0}
        maxPolarAngle={Math.PI / 2}
        enableDamping
        dampingFactor={0.05}
      />
    </>
  )
}
