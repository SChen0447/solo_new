import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { Node } from '../types';
import { SENSOR_BASE_VALUES } from '../data/networkData';
import { eventBus } from '../utils/eventBus';
import { useNetworkStore } from '../store/useNetworkStore';

interface SensorNodeProps {
  node: Node;
  isSelected: boolean;
  visible: boolean;
}

function getSensorColor(value: number, type: string): string {
  const baseValue = SENSOR_BASE_VALUES[type as keyof typeof SENSOR_BASE_VALUES];
  const ratio = Math.max(0, Math.min(1, (value - baseValue * 0.5) / (baseValue)));
  
  const r1 = 0, g1 = 0.9, b1 = 0.46;
  const r2 = 1, g2 = 0.09, b2 = 0.27;
  
  const r = Math.round((r1 + (r2 - r1) * ratio) * 255);
  const g = Math.round((g1 + (g2 - g1) * ratio) * 255);
  const b = Math.round((b1 + (b2 - b1) * ratio) * 255);
  
  return `rgb(${r}, ${g}, ${b})`;
}

export function SensorNode({ node, isSelected, visible }: SensorNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const pulseRef = useRef<THREE.Mesh>(null);
  const [opacity, setOpacity] = useState(visible ? 1 : 0);
  const [pulseScale, setPulseScale] = useState(1);
  const currentValue = useNetworkStore((state) =>
    state.nodes.find((n) => n.id === node.id)?.sensor.value ?? node.sensor.value
  );

  useEffect(() => {
    let animationId: number;
    const targetOpacity = visible ? 1 : 0;
    const duration = 500;
    const startTime = performance.now();
    const startOpacity = opacity;

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const newOpacity = startOpacity + (targetOpacity - startOpacity) * eased;
      setOpacity(newOpacity);

      if (progress < 1) {
        animationId = requestAnimationFrame(animate);
      }
    }

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [visible]);

  useFrame((state) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      material.opacity = opacity;
      material.color.set(getSensorColor(currentValue, node.sensor.type));
      
      const baseScale = isSelected ? 1.5 : 1;
      meshRef.current.scale.setScalar(baseScale);
    }

    if (isSelected && pulseRef.current) {
      const time = state.clock.elapsedTime;
      const pulse = 1 + Math.sin(time * 4) * 0.2;
      setPulseScale(pulse);
      const material = pulseRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.5 * (1 - (pulse - 1) / 0.2) * opacity;
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    eventBus.emit('SELECT_NODE', node.id);
  };

  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = () => {
    document.body.style.cursor = 'default';
  };

  const color = getSensorColor(currentValue, node.sensor.type);
  const displayValue = currentValue.toFixed(2);

  return (
    <group position={[node.x, node.y, node.z]}>
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={opacity}
          emissive={color}
          emissiveIntensity={isSelected ? 0.3 : 0.1}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {isSelected && (
        <mesh ref={pulseRef} scale={pulseScale}>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0} wireframe />
        </mesh>
      )}

      {opacity > 0.5 && (
        <Html
          position={[0, 1.2, 0]}
          center
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          <div
            style={{
              background: 'rgba(13, 27, 42, 0.9)',
              padding: '4px 8px',
              borderRadius: '4px',
              color: '#e0e0e0',
              fontSize: '12px',
              whiteSpace: 'nowrap',
              border: '1px solid rgba(41, 182, 246, 0.5)',
              backdropFilter: 'blur(4px)',
            }}
          >
            {displayValue} {node.sensor.unit}
          </div>
        </Html>
      )}
    </group>
  );
}
