import React, { useState, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { useSimulationStore } from '../../store/useSimulationStore';
import { BuildingBlock } from '../shared/types';
import {
  GRID_SIZE,
  CELL_SIZE,
  WORLD_MIN,
  BUILDING_SIZE,
  BUILDING_MIN_HEIGHT,
  BUILDING_MAX_HEIGHT,
  COLORS,
} from '../shared/constants';

const heightColor = (h: number): THREE.Color => {
  const t = (h - BUILDING_MIN_HEIGHT) / (BUILDING_MAX_HEIGHT - BUILDING_MIN_HEIGHT);
  const low = new THREE.Color(COLORS.BUILDING_LOW);
  const high = new THREE.Color(COLORS.BUILDING_HIGH);
  return low.clone().lerp(high, Math.max(0, Math.min(1, t)));
};

interface BlockProps {
  block: BuildingBlock;
  onClick: () => void;
  onDragPos: (dx: number, dz: number) => void;
  onHeight: (delta: number) => void;
}

const BuildingBlockMesh: React.FC<BlockProps> = ({ block, onClick, onDragPos, onHeight }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hover, setHover] = useState(false);
  const dragState = useRef({
    dragging: false,
    startX: 0,
    startZ: 0,
    accDX: 0,
    accDZ: 0,
    mode: 'pos' as 'pos' | 'height',
  });

  const color = useMemo(() => heightColor(block.height), [block.height]);
  const yPos = block.height / 2;

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    dragState.current.dragging = true;
    dragState.current.startX = e.clientX;
    dragState.current.startZ = e.clientY;
    dragState.current.accDX = 0;
    dragState.current.accDZ = 0;
    dragState.current.mode = e.shiftKey ? 'height' : 'pos';
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!dragState.current.dragging) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startZ;
    dragState.current.startX = e.clientX;
    dragState.current.startZ = e.clientY;
    if (dragState.current.mode === 'pos') {
      dragState.current.accDX += dx;
      dragState.current.accDZ += dy;
      const step = CELL_SIZE;
      if (Math.abs(dragState.current.accDX) > 30) {
        const gridDX = Math.round(dragState.current.accDX / 30);
        onDragPos(gridDX, 0);
        dragState.current.accDX -= gridDX * 30;
      }
      if (Math.abs(dragState.current.accDZ) > 30) {
        const gridDZ = Math.round(dragState.current.accDZ / 30);
        onDragPos(0, gridDZ);
        dragState.current.accDZ -= gridDZ * 30;
      }
    } else {
      if (Math.abs(dy) > 30) {
        onHeight(dy > 0 ? -1 : 1);
        dragState.current.startZ = e.clientY;
      }
    }
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    const wasDragging = dragState.current.dragging;
    dragState.current.dragging = false;
    const moved =
      Math.abs(dragState.current.accDX) > 5 ||
      Math.abs(dragState.current.accDZ) > 5;
    if (wasDragging && !moved) {
      onClick();
    }
  };

  return (
    <mesh
      ref={meshRef}
      position={[block.worldX, yPos, block.worldZ]}
      castShadow
      receiveShadow
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHover(false);
        document.body.style.cursor = '';
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <boxGeometry args={[BUILDING_SIZE, block.height, BUILDING_SIZE]} />
      <meshStandardMaterial
        color={color}
        roughness={hover ? 0.3 : 0.6}
        metalness={hover ? 0.3 : 0.1}
        emissive={color}
        emissiveIntensity={hover ? 0.08 : 0.02}
      />
      <lineSegments>
        <edgesGeometry
          attach="geometry"
          args={[new THREE.BoxGeometry(BUILDING_SIZE + 0.02, block.height + 0.02, BUILDING_SIZE + 0.02)]}
        />
        <lineBasicMaterial color={0x58a6ff} transparent opacity={hover ? 0.9 : 0.25} />
      </lineSegments>
    </mesh>
  );
};

const AddPreview: React.FC = () => {
  const [hoverCell, setHoverCell] = useState<{ x: number; z: number } | null>(null);
  const [pulse, setPulse] = useState(0);
  const addBuilding = useSimulationStore((s) => s.addBuilding);
  const buildings = useSimulationStore((s) => s.buildings);

  useFrame((state) => {
    setPulse(Math.sin(state.clock.elapsedTime * Math.PI * 2) * 0.1);
  });

  const handleMove = (e: ThreeEvent<PointerEvent>) => {
    const pt = e.point;
    const gx = Math.floor((pt.x - WORLD_MIN) / CELL_SIZE);
    const gz = Math.floor((pt.z - WORLD_MIN) / CELL_SIZE);
    if (gx < 0 || gx >= GRID_SIZE || gz < 0 || gz >= GRID_SIZE) {
      setHoverCell(null);
      return;
    }
    setHoverCell({ x: gx, z: gz });
  };

  const handleLeave = () => setHoverCell(null);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (!hoverCell) return;
    e.stopPropagation();
    const exists = buildings.some(
      (b) => b.gridX === hoverCell.x && b.gridZ === hoverCell.z
    );
    if (!exists) {
      addBuilding(hoverCell.x, hoverCell.z, 4);
    }
  };

  if (!hoverCell) {
    return (
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.005, 0]}
        onPointerMove={handleMove}
        onPointerLeave={handleLeave}
      >
        <planeGeometry args={[GRID_SIZE * CELL_SIZE, GRID_SIZE * CELL_SIZE]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    );
  }

  const wx = WORLD_MIN + hoverCell.x * CELL_SIZE + CELL_SIZE / 2;
  const wz = WORLD_MIN + hoverCell.z * CELL_SIZE + CELL_SIZE / 2;
  const exists = buildings.some(
    (b) => b.gridX === hoverCell.x && b.gridZ === hoverCell.z
  );
  const h = 4;

  return (
    <>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.005, 0]}
        onPointerMove={handleMove}
        onPointerLeave={handleLeave}
        onClick={handleClick}
      >
        <planeGeometry args={[GRID_SIZE * CELL_SIZE, GRID_SIZE * CELL_SIZE]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      {!exists && (
        <mesh position={[wx, h / 2, wz]}>
          <boxGeometry args={[BUILDING_SIZE, h, BUILDING_SIZE]} />
          <meshStandardMaterial
            color={0x58a6ff}
            transparent
            opacity={0.45 + pulse}
            emissive={0x58a6ff}
            emissiveIntensity={0.3}
          />
        </mesh>
      )}
    </>
  );
};

export const Buildings: React.FC = () => {
  const buildings = useSimulationStore((s) => s.buildings);
  const removeBuilding = useSimulationStore((s) => s.removeBuilding);
  const updateBuildingPos = useSimulationStore((s) => s.updateBuildingPos);
  const updateBuildingHeight = useSimulationStore((s) => s.updateBuildingHeight);

  return (
    <group>
      {buildings.map((b) => (
        <BuildingBlockMesh
          key={b.id}
          block={b}
          onClick={() => removeBuilding(b.id)}
          onDragPos={(dx, dz) => updateBuildingPos(b.id, b.gridX + dx, b.gridZ + dz)}
          onHeight={(d) => updateBuildingHeight(b.id, d)}
        />
      ))}
      <AddPreview />
    </group>
  );
};
