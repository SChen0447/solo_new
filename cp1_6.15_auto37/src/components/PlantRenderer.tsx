import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Plant, Species, SPECIES_CONFIG } from '../types';
import { useWeatherStore } from '../store/weatherStore';

interface PlantMeshProps {
  plants: Plant[];
  species: Species;
  onPlantClick: (id: string) => void;
  lodDistance: number;
}

const PlantInstancedMesh: React.FC<PlantMeshProps> = React.memo(({ plants, species, onPlantClick, lodDistance }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const leavesRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const { camera } = useThree();
  const glowPlantId = useWeatherStore((s) => s.glowPlantId);
  const glowRef = useRef<THREE.Mesh>(null);
  const [glowPlant, setGlowPlant] = useState<Plant | null>(null);

  const cfg = SPECIES_CONFIG[species];
  const [trunkGeom, leavesGeom] = useMemo(() => {
    const trunkRadius = species === 'tree' ? 0.3 : species === 'shrub' ? 0.15 : species === 'vine' ? 0.05 : 0.02;
    const t = new THREE.CylinderGeometry(trunkRadius * 0.7, trunkRadius, 1, 6);
    const leafSize = species === 'tree' ? 0.8 : species === 'shrub' ? 0.5 : species === 'vine' ? 0.3 : 0.15;
    const l = new THREE.SphereGeometry(leafSize, 6, 4);
    return [t, l];
  }, [species]);

  const maxLeavesPerPlant = cfg.maxLeaves;
  const totalInstances = plants.length;
  const totalLeafInstances = plants.reduce((sum, p) => sum + Math.max(1, Math.floor(p.leafCount / 2)), 0);

  useFrame(() => {
    if (!meshRef.current) return;
    const mesh = meshRef.current;
    const leavesMesh = leavesRef.current;

    let leafIndex = 0;
    plants.forEach((plant, i) => {
      const camDist = camera.position.distanceTo(
        new THREE.Vector3(plant.position[0], plant.position[1] + plant.height / 2, plant.position[2])
      );
      const lodFactor = camDist < lodDistance ? 1 : camDist < lodDistance * 2 ? 0.5 : 0.25;

      dummy.position.set(plant.position[0], plant.height / 2, plant.position[2]);
      dummy.rotation.set(plant.tilt, plant.orientation, 0);
      dummy.scale.set(1, plant.height, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, new THREE.Color(cfg.color));

      const leafCount = Math.max(1, Math.floor(plant.leafCount * lodFactor / 2));
      for (let j = 0; j < leafCount && leafIndex < (leavesMesh?.count ?? 0); j++) {
        const angle = (j / leafCount) * Math.PI * 2 + plant.orientation;
        const radius = plant.height * 0.3 * (0.6 + Math.random() * 0.4);
        const height = plant.height * (0.4 + (j / leafCount) * 0.55);
        const leafSize = (0.7 + Math.random() * 0.6) * (species === 'grass' ? 0.5 : 1);

        dummy.position.set(
          plant.position[0] + Math.cos(angle) * radius,
          height + plant.position[1],
          plant.position[2] + Math.sin(angle) * radius
        );
        dummy.rotation.set(
          plant.tilt * 0.5 + (Math.random() - 0.5) * 0.3,
          angle + plant.orientation,
          (Math.random() - 0.5) * 0.3
        );
        dummy.scale.setScalar(leafSize * lodFactor);
        dummy.updateMatrix();
        if (leavesMesh) {
          leavesMesh.setMatrixAt(leafIndex, dummy.matrix);
          leavesMesh.setColorAt(leafIndex, new THREE.Color(plant.leafColor));
        }
        leafIndex++;
      }
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    if (leavesMesh) {
      leavesMesh.instanceMatrix.needsUpdate = true;
      if (leavesMesh.instanceColor) leavesMesh.instanceColor.needsUpdate = true;
    }

    if (glowRef.current && glowPlant) {
      glowRef.current.position.set(glowPlant.position[0], glowPlant.height / 2, glowPlant.position[2]);
      const scale = Math.max(2, glowPlant.height * 0.6);
      glowRef.current.scale.setScalar(scale);
      const color = glowPlant.health >= 80 ? '#aaffaa' : glowPlant.health >= 40 ? '#ffcc44' : '#ff6666';
      (glowRef.current.material as THREE.MeshBasicMaterial).color.set(color);
    }
  });

  useEffect(() => {
    if (glowPlantId) {
      const p = plants.find((pl) => pl.id === glowPlantId);
      setGlowPlant(p || null);
    } else {
      setGlowPlant(null);
    }
  }, [glowPlantId, plants]);

  const handleClick = (e: any) => {
    e.stopPropagation();
    const instanceId = e.instanceId;
    if (instanceId !== undefined && plants[instanceId]) {
      onPlantClick(plants[instanceId].id);
    }
  };

  return (
    <group>
      <instancedMesh
        ref={meshRef}
        args={[trunkGeom, undefined, Math.max(1, totalInstances)]}
        castShadow
        receiveShadow
        onClick={handleClick}
      >
        <meshStandardMaterial vertexColors roughness={0.9} />
      </instancedMesh>

      <instancedMesh
        ref={leavesRef}
        args={[leavesGeom, undefined, Math.max(1, totalLeafInstances)]}
        castShadow
      >
        <meshStandardMaterial vertexColors roughness={0.8} transparent opacity={0.9} />
      </instancedMesh>

      {glowPlant && (
        <mesh ref={glowRef}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial transparent opacity={0.3} color="#aaffaa" side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
});

PlantInstancedMesh.displayName = 'PlantInstancedMesh';

export const PlantRenderer: React.FC = React.memo(() => {
  const plants = useWeatherStore((s) => s.plants);
  const selectPlant = useWeatherStore((s) => s.selectPlant);
  const initPlants = useWeatherStore((s) => s.initPlants);
  const tick = useWeatherStore((s) => s.tick);

  useEffect(() => {
    if (plants.length === 0) {
      initPlants();
    }
  }, [plants.length, initPlants]);

  useFrame((_, delta) => {
    tick(delta * 1000);
  });

  const grouped = useMemo(() => {
    const groups: Record<Species, Plant[]> = { tree: [], shrub: [], vine: [], grass: [] };
    plants.forEach((p) => groups[p.species].push(p));
    return groups;
  }, [plants]);

  const handleClick = React.useCallback((id: string) => {
    selectPlant(id);
  }, [selectPlant]);

  return (
    <group>
      {(Object.keys(grouped) as Species[]).map((species) => (
        <PlantInstancedMesh
          key={species}
          plants={grouped[species]}
          species={species}
          onPlantClick={handleClick}
          lodDistance={30}
        />
      ))}
    </group>
  );
});

PlantRenderer.displayName = 'PlantRenderer';

export const Ground: React.FC = React.memo(() => {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[200, 200, 50, 50]} />
      <meshStandardMaterial color="#3a5a2a" roughness={1} />
    </mesh>
  );
});

Ground.displayName = 'Ground';
