import { useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useGameStore, Vec3, WallData, FloorData, MossData, HiddenZoneData, BranchPath } from './store';

const generateId = () => `id-${Math.random().toString(36).substr(2, 9)}`;

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

interface GeneratedMap {
  walls: WallData[];
  floors: FloorData[];
  mossPoints: MossData[];
  hiddenZones: HiddenZoneData[];
  branches: BranchPath[];
  collectibleSpawnPoints: Vec3[];
}

export function generateCaveMap(seed: number = 42): GeneratedMap {
  const rand = seededRandom(seed);
  const walls: WallData[] = [];
  const floors: FloorData[] = [];
  const mossPoints: MossData[] = [];
  const branches: BranchPath[] = [];
  const collectibleSpawnPoints: Vec3[] = [];

  const mainPathLength = 30;
  const mainPathWidth = 4;
  const wallHeight = 5;

  const addBoxRoom = (
    centerX: number,
    centerZ: number,
    width: number,
    depth: number,
    wallTypeProb: number = 0.85
  ) => {
    const halfW = width / 2;
    const halfD = depth / 2;
    const hw = wallHeight / 2;

    floors.push({
      id: generateId(),
      position: [centerX, 0, centerZ],
      size: [width, 0.2, depth],
    });

    for (let dz = -halfD + 1; dz < halfD - 1; dz += 2 + Math.random() * 2) {
      walls.push({
        id: generateId(),
        position: [centerX - halfW, hw, centerZ + dz],
        size: [0.5, wallHeight, 2.5 + rand() * 1.5],
        materialType: rand() < wallTypeProb ? 'rock' : 'metal',
        rotation: [0, 0, 0],
      });
      walls.push({
        id: generateId(),
        position: [centerX + halfW, hw, centerZ + dz],
        size: [0.5, wallHeight, 2.5 + rand() * 1.5],
        materialType: rand() < wallTypeProb ? 'rock' : 'metal',
        rotation: [0, 0, 0],
      });
    }

    for (let dx = -halfW + 1; dx < halfW - 1; dx += 2 + Math.random() * 2) {
      walls.push({
        id: generateId(),
        position: [centerX + dx, hw, centerZ - halfD],
        size: [2.5 + rand() * 1.5, wallHeight, 0.5],
        materialType: rand() < wallTypeProb ? 'rock' : 'metal',
        rotation: [0, 0, 0],
      });
      walls.push({
        id: generateId(),
        position: [centerX + dx, hw, centerZ + halfD],
        size: [2.5 + rand() * 1.5, wallHeight, 0.5],
        materialType: rand() < wallTypeProb ? 'rock' : 'metal',
        rotation: [0, 0, 0],
      });
    }
  };

  addBoxRoom(0, 0, 6, 6);
  collectibleSpawnPoints.push([0, 1, 0]);

  const addCorridor = (
    startX: number,
    startZ: number,
    endX: number,
    endZ: number,
    width: number = 3.5
  ) => {
    const dx = endX - startX;
    const dz = endZ - startZ;
    const length = Math.sqrt(dx * dx + dz * dz);
    const steps = Math.ceil(length / 3);
    const hw = wallHeight / 2;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = startX + dx * t;
      const z = startZ + dz * t;

      floors.push({
        id: generateId(),
        position: [x, 0, z],
        size: [width, 0.2, 3.5],
      });

      if (i % 2 === 0) {
        const perpX = -dz / length;
        const perpZ = dx / length;
        const halfW = width / 2;

        walls.push({
          id: generateId(),
          position: [x + perpX * halfW, hw, z + perpZ * halfW],
          size: [0.5, wallHeight, 3],
          materialType: rand() < 0.9 ? 'rock' : 'metal',
          rotation: [0, -Math.atan2(dz, dx), 0],
        });
        walls.push({
          id: generateId(),
          position: [x - perpX * halfW, hw, z - perpZ * halfW],
          size: [0.5, wallHeight, 3],
          materialType: rand() < 0.9 ? 'rock' : 'metal',
          rotation: [0, -Math.atan2(dz, dx), 0],
        });
      }
    }

    branches.push({
      id: generateId(),
      start: [startX, 0, startZ],
      end: [endX, 0, endZ],
      width,
    });
  };

  addCorridor(3, 0, 15, 0);
  addBoxRoom(18, 0, 7, 5);
  collectibleSpawnPoints.push([18, 1, 0]);
  collectibleSpawnPoints.push([18, 1, 2]);

  addCorridor(0, -3, 0, -12);
  addBoxRoom(0, -15, 6, 6);
  collectibleSpawnPoints.push([0, 1, -15]);

  addCorridor(15, 0, 20, 8);
  addBoxRoom(24, 11, 5, 5);
  collectibleSpawnPoints.push([24, 1, 11]);

  const hiddenZones: HiddenZoneData[] = [];
  addCorridor(0, 3, 0, 10);
  addCorridor(0, 10, -8, 14);
  addBoxRoom(-12, 16, 5, 5);
  collectibleSpawnPoints.push([-12, 1, 16]);
  hiddenZones.push({
    id: generateId(),
    position: [-12, 1, 16],
    size: [5, 3, 5],
    entered: false,
  });

  const wallSurfaces: Array<{ pos: Vec3; normal: Vec3 }> = [];
  for (const wall of walls) {
    const [wx, wy, wz] = wall.position;
    const [sx, sy, sz] = wall.size;
    if (sx < sz) {
      wallSurfaces.push({ pos: [wx + sx / 2 + 0.01, wy, wz], normal: [1, 0, 0] });
      wallSurfaces.push({ pos: [wx - sx / 2 - 0.01, wy, wz], normal: [-1, 0, 0] });
    } else {
      wallSurfaces.push({ pos: [wx, wy, wz + sz / 2 + 0.01], normal: [0, 0, 1] });
      wallSurfaces.push({ pos: [wx, wy, wz - sz / 2 - 0.01], normal: [0, 0, -1] });
    }
  }

  const mossCount = 9;
  const shuffledSurfaces = [...wallSurfaces].sort(() => rand() - 0.5);

  for (let i = 0; i < mossCount && i < shuffledSurfaces.length; i++) {
    const surface = shuffledSurfaces[i];
    const jitterY = (rand() - 0.5) * 2;
    mossPoints.push({
      id: generateId(),
      position: [
        surface.pos[0] + surface.normal[0] * 0.02,
        surface.pos[1] + jitterY,
        surface.pos[2] + surface.normal[2] * 0.02,
      ],
      radius: 0.05 + rand() * 0.1,
      opacity: 0.4 + rand() * 0.3,
      blinkPeriod: 1.5 + rand() * 1.5,
    });
  }

  return {
    walls,
    floors,
    mossPoints,
    hiddenZones,
    branches,
    collectibleSpawnPoints,
  };
}

interface WallMeshProps {
  wall: WallData;
}

function WallMesh({ wall }: WallMeshProps) {
  const isRock = wall.materialType === 'rock';
  const color = isRock ? '#4a3f35' : '#556270';
  const emissiveColor = isRock ? '#f5deb3' : '#e0f7fa';

  return (
    <mesh
      position={wall.position}
      rotation={wall.rotation}
      castShadow
      receiveShadow
      userData={{ materialType: wall.materialType, isWall: true }}
    >
      <boxGeometry args={[wall.size[0], wall.size[1], wall.size[2]]} />
      <meshStandardMaterial
        color={color}
        roughness={isRock ? 0.9 : 0.3}
        metalness={isRock ? 0.05 : 0.8}
        flatShading
      />
    </mesh>
  );
}

interface FloorMeshProps {
  floor: FloorData;
}

function FloorMesh({ floor }: FloorMeshProps) {
  return (
    <mesh position={floor.position} receiveShadow>
      <boxGeometry args={[floor.size[0], floor.size[1], floor.size[2]]} />
      <meshStandardMaterial
        color="#3d352e"
        roughness={0.95}
        metalness={0.02}
        flatShading
      />
    </mesh>
  );
}

interface HiddenZoneDetectorProps {
  zone: HiddenZoneData;
}

function HiddenZoneDetector({ zone }: HiddenZoneDetectorProps) {
  const playerPos = useGameStore((s) => s.player.position);
  const setHiddenZoneEntered = useGameStore((s) => s.setHiddenZoneEntered);
  const triggeredRef = useRef(false);
  const fadeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (zone.entered || triggeredRef.current) return;

    const dx = Math.abs(playerPos[0] - zone.position[0]);
    const dy = Math.abs(playerPos[1] - zone.position[1]);
    const dz = Math.abs(playerPos[2] - zone.position[2]);

    if (
      dx < zone.size[0] / 2 &&
      dy < zone.size[1] / 2 &&
      dz < zone.size[2] / 2
    ) {
      triggeredRef.current = true;
      setHiddenZoneEntered(zone.id);

      let audioCtx: AudioContext | null = null;
      try {
        audioCtx = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.value = 80;
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
          0.001,
          audioCtx.currentTime + 0.3
        );

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.3);
      } catch (e) {
        // Audio not supported
      }

      const flashEl = document.createElement('div');
      flashEl.style.cssText = `
        position: fixed; inset: 0; background: rgba(255,255,255,0.3);
        z-index: 9999; pointer-events: none; opacity: 0;
        transition: opacity 0.1s;
      `;
      document.body.appendChild(flashEl);
      requestAnimationFrame(() => {
        flashEl.style.opacity = '1';
        setTimeout(() => {
          flashEl.style.opacity = '0';
          setTimeout(() => flashEl.remove(), 150);
        }, 50);
      });
    }
  }, [playerPos, zone, setHiddenZoneEntered]);

  return (
    <mesh position={zone.position} visible={false}>
      <boxGeometry args={zone.size} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  );
}

export function CaveMap() {
  const setCaveMap = useGameStore((s) => s.setCaveMap);
  const initCollectibles = useGameStore((s) => s.initCollectibles);
  const caveMap = useGameStore((s) => s.caveMap);

  const generated = useMemo(() => generateCaveMap(Date.now() % 10000), []);

  useEffect(() => {
    setCaveMap({
      walls: generated.walls,
      floors: generated.floors,
      mossPoints: generated.mossPoints,
      hiddenZones: generated.hiddenZones,
      branches: generated.branches,
    });

    const colorPalette = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#f38181', '#aa96da'];
    const items = generated.collectibleSpawnPoints.slice(0, 6).map((pos, idx) => ({
      id: `collect-${idx}`,
      position: pos as Vec3,
      collected: false,
      color: colorPalette[idx % colorPalette.length],
    }));
    initCollectibles(items);
  }, [generated, setCaveMap, initCollectibles]);

  return (
    <group>
      {generated.floors.map((f) => (
        <FloorMesh key={f.id} floor={f} />
      ))}
      {generated.walls.map((w) => (
        <WallMesh key={w.id} wall={w} />
      ))}
      {generated.hiddenZones.map((z) => (
        <HiddenZoneDetector key={z.id} zone={z} />
      ))}
    </group>
  );
}

export { MossLight } from './LightModule';
