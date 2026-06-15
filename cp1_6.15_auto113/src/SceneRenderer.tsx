import React, { useRef, useMemo, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { FishData, FishSpecies } from "./store";
import {
  TANK_WIDTH,
  TANK_DEPTH,
  TANK_HEIGHT,
  TANK_WALL_THICKNESS,
  FISH_PALETTES,
} from "./FishBehavior";

const GLASS_COLOR = "#e0f7fa";
const FRAME_COLOR = "#1565c0";
const SAMPLE_POINTS_HIGH = 16;
const SAMPLE_POINTS_LOW = 8;

interface SceneRendererProps {
  fishes: FishData[];
  ripples: Array<{
    id: string;
    position: { x: number; z: number };
    startTime: number;
    duration: number;
    maxRadius: number;
  }>;
  surfaceRipples: Array<{
    id: string;
    position: { x: number; z: number };
    startTime: number;
    duration: number;
    maxRadius: number;
  }>;
  bubbles: Array<{
    id: string;
    position: { x: number; y: number; z: number };
    radius: number;
    speed: number;
  }>;
  temperature: number;
  waterQuality: number;
  lightIntensity: number;
  onTankClick: (x: number, z: number) => void;
  onFishClick: (fishId: string) => void;
  selectedFishId: string | null;
}

const FishMesh: React.FC<{
  fish: FishData;
  lightIntensity: number;
  onClick: () => void;
  isSelected: boolean;
}> = ({ fish, lightIntensity, onClick, isSelected }) => {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const torsoRef = useRef<THREE.Mesh>(null);
  const tailRef = useRef<THREE.Mesh>(null);
  const dorsalFinRef = useRef<THREE.Mesh>(null);
  const pectoralFinRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);

  const palette = FISH_PALETTES[fish.species];
  const saturation = 0.2 + (lightIntensity / 10) * 0.8;

  const adjustColor = (hex: string, satFactor: number): THREE.Color => {
    const color = new THREE.Color(hex);
    const hsl = { h: 0, s: 0, l: 0 };
    color.getHSL(hsl);
    hsl.s = Math.min(1, hsl.s * satFactor);
    color.setHSL(hsl.h, hsl.s, hsl.l);
    return color;
  };

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    const phase = fish.phase;

    groupRef.current.position.set(
      fish.position.x,
      fish.position.y,
      fish.position.z
    );
    groupRef.current.rotation.set(
      fish.rotation.x,
      fish.rotation.y,
      fish.rotation.z
    );

    const swing = Math.sin(phase) * 0.08;
    const tailSwing = Math.sin(phase) * 0.4;

    if (torsoRef.current) {
      torsoRef.current.rotation.z = swing * 0.3;
    }
    if (tailRef.current) {
      tailRef.current.rotation.z = tailSwing;
      tailRef.current.position.x = -fish.size * 1.1 + Math.sin(phase) * 0.05;
    }
    if (headRef.current) {
      headRef.current.rotation.z = -swing * 0.2;
    }

    const finFlap = Math.sin(phase * 2) * 0.5;
    if (pectoralFinRef.current) {
      pectoralFinRef.current.rotation.z = finFlap;
    }
    if (dorsalFinRef.current) {
      dorsalFinRef.current.rotation.z = Math.sin(phase * 1.5) * 0.15;
    }

    if (glowRef.current && fish.species === "lanternfish") {
      const glowIntensity = 0.3 + (lightIntensity / 10) * 0.7;
      const pulse = 0.7 + Math.sin(t * 3 + fish.noiseOffset) * 0.3;
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = glowIntensity * pulse;
    }

    if (haloRef.current && isSelected) {
      const pulse = 0.3 + Math.sin(t * (Math.PI * 2) / 1.2) * 0.1;
      haloRef.current.scale.setScalar(1 + Math.sin(t * 2) * 0.08);
      const mat = haloRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = pulse;
    }
  });

  const primaryColor = useMemo(
    () => adjustColor(palette.primary, saturation),
    [palette.primary, saturation]
  );
  const secondaryColor = useMemo(
    () => adjustColor(palette.secondary, saturation),
    [palette.secondary, saturation]
  );
  const finColor = useMemo(
    () => adjustColor(palette.primary, saturation * 0.8),
    [palette.primary, saturation]
  );

  const s = fish.size;

  return (
    <group ref={groupRef} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <mesh ref={torsoRef} position={[0, 0, 0]} castShadow>
        <sphereGeometry args={[s * 0.7, 16, 16]} />
        <meshStandardMaterial
          color={primaryColor}
          roughness={0.3}
          metalness={0.2}
        />
      </mesh>

      <mesh ref={headRef} position={[s * 0.6, 0, 0]} castShadow>
        <sphereGeometry args={[s * 0.55, 16, 16]} />
        <meshStandardMaterial
          color={primaryColor}
          roughness={0.3}
          metalness={0.2}
        />
      </mesh>

      <mesh position={[s * 0.75, s * 0.15, s * 0.25]}>
        <sphereGeometry args={[s * 0.1, 8, 8]} />
        <meshStandardMaterial color="#000000" />
      </mesh>
      <mesh position={[s * 0.75, s * 0.15, -s * 0.25]}>
        <sphereGeometry args={[s * 0.1, 8, 8]} />
        <meshStandardMaterial color="#000000" />
      </mesh>

      <mesh ref={tailRef} position={[-s * 1.1, 0, 0]}>
        <sphereGeometry args={[s * 0.5, 12, 12]} />
        <meshStandardMaterial
          color={secondaryColor}
          roughness={0.3}
          metalness={0.2}
        />
      </mesh>

      <mesh ref={dorsalFinRef} position={[0, s * 0.7, 0]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.02, s * 0.15, s * 0.5, 8]} />
        <meshStandardMaterial
          color={finColor}
          transparent
          opacity={0.7}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh
        ref={pectoralFinRef}
        position={[s * 0.2, -s * 0.1, s * 0.6]}
        rotation={[Math.PI / 4, 0, 0]}
      >
        <cylinderGeometry args={[0.015, s * 0.12, s * 0.4, 8]} />
        <meshStandardMaterial
          color={finColor}
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh
        position={[s * 0.2, -s * 0.1, -s * 0.6]}
        rotation={[-Math.PI / 4, 0, 0]}
      >
        <cylinderGeometry args={[0.015, s * 0.12, s * 0.4, 8]} />
        <meshStandardMaterial
          color={finColor}
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>

      {fish.species === "lanternfish" && palette.glow && (
        <mesh ref={glowRef} position={[0, -s * 0.3, 0]}>
          <sphereGeometry args={[s * 0.25, 12, 12]} />
          <meshBasicMaterial
            color={palette.glow}
            transparent
            opacity={0.8}
          />
        </mesh>
      )}

      {isSelected && (
        <mesh ref={haloRef} position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[s * 1.2, s * 1.4, 32]} />
          <meshBasicMaterial
            color="#00e5ff"
            transparent
            opacity={0.4}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {fish.species === "clownfish" && (
        <>
          <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[s * 0.7, s * 0.05, 8, 16]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          <mesh position={[-s * 0.3, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[s * 0.65, s * 0.05, 8, 16]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
        </>
      )}

      {fish.species === "angelfish" && (
        <mesh position={[s * 0.3, 0, 0]}>
          <sphereGeometry args={[s * 0.3, 12, 12]} />
          <meshStandardMaterial color={secondaryColor} />
        </mesh>
      )}
    </group>
  );
};

const RippleMesh: React.FC<{
  ripple: {
    id: string;
    position: { x: number; z: number };
    startTime: number;
    duration: number;
    maxRadius: number;
  };
  y?: number;
  color?: string;
}> = ({ ripple, y = 0.02, color = "#00e5ff" }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!meshRef.current) return;
    const now = performance.now() / 1000;
    const elapsed = now - ripple.startTime;
    const progress = Math.min(1, elapsed / ripple.duration);
    const currentRadius = 0.05 + progress * ripple.maxRadius;
    const opacity = 1 - progress;
    meshRef.current.scale.setScalar(currentRadius);
    const mat = meshRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = opacity * 0.8;
  });

  return (
    <mesh
      ref={meshRef}
      position={[ripple.position.x, y, ripple.position.z]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <ringGeometry args={[0.95, 1, 32]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.8}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
};

const DustParticles: React.FC<{ lightIntensity: number; fishCount: number }> = ({
  lightIntensity,
  fishCount,
}) => {
  const pointsRef = useRef<THREE.Points>(null);
  const baseCount = Math.floor(50 + (lightIntensity / 10) * 150);
  const count = fishCount > 80 ? Math.floor(baseCount * 0.5) : baseCount;

  const [positions, velocities] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * (TANK_WIDTH - 0.4);
      pos[i * 3 + 1] = Math.random() * (TANK_HEIGHT - 0.4) + 0.1;
      pos[i * 3 + 2] = (Math.random() - 0.5) * (TANK_DEPTH - 0.4);
      vel[i * 3] = (Math.random() - 0.5) * 0.05;
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.03;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.05;
    }
    return [pos, vel];
  }, [count]);

  useFrame((_, dt) => {
    if (!pointsRef.current) return;
    const posArray = pointsRef.current.geometry.attributes.position
      .array as Float32Array;
    for (let i = 0; i < count; i++) {
      posArray[i * 3] += velocities[i * 3] * dt;
      posArray[i * 3 + 1] += velocities[i * 3 + 1] * dt;
      posArray[i * 3 + 2] += velocities[i * 3 + 2] * dt;

      const halfW = TANK_WIDTH / 2 - 0.2;
      const halfD = TANK_DEPTH / 2 - 0.2;
      if (posArray[i * 3] > halfW || posArray[i * 3] < -halfW)
        velocities[i * 3] *= -1;
      if (posArray[i * 3 + 1] > TANK_HEIGHT - 0.2 || posArray[i * 3 + 1] < 0.1)
        velocities[i * 3 + 1] *= -1;
      if (posArray[i * 3 + 2] > halfD || posArray[i * 3 + 2] < -halfD)
        velocities[i * 3 + 2] *= -1;
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  const opacity = 0.15 + (lightIntensity / 10) * 0.45;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={count}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.008}
        color="#ffffff"
        transparent
        opacity={opacity}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
};

const BubbleMesh: React.FC<{
  bubble: {
    id: string;
    position: { x: number; y: number; z: number };
    radius: number;
    speed: number;
  };
}> = ({ bubble }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!meshRef.current) return;
    meshRef.current.position.set(
      bubble.position.x,
      bubble.position.y,
      bubble.position.z
    );
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[bubble.radius, 8, 8]} />
      <meshPhysicalMaterial
        color="#e0f7fa"
        transparent
        opacity={0.4}
        transmission={0.6}
        thickness={0.02}
        roughness={0}
      />
    </mesh>
  );
};

const GlassPanel: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
  size: [number, number];
}> = ({ position, rotation = [0, 0, 0], size }) => {
  return (
    <mesh position={position} rotation={rotation} receiveShadow>
      <boxGeometry args={[size[0], size[1], TANK_WALL_THICKNESS]} />
      <meshPhysicalMaterial
        color={GLASS_COLOR}
        transparent
        opacity={0.25}
        transmission={0.9}
        thickness={0.1}
        roughness={0.05}
        metalness={0.1}
        ior={1.33}
        clearcoat={1}
        clearcoatRoughness={0}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

const SceneRenderer: React.FC<SceneRendererProps> = ({
  fishes,
  ripples,
  surfaceRipples,
  bubbles,
  temperature,
  waterQuality,
  lightIntensity,
  onTankClick,
  onFishClick,
  selectedFishId,
}) => {
  const groundRef = useRef<THREE.Mesh>(null);
  const rotatingLightRef = useRef<THREE.PointLight>(null);
  const { scene } = useThree();

  const handleClick = (e: any) => {
    e.stopPropagation();
    const point = e.point;
    onTankClick(point.x, point.z);
  };

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (rotatingLightRef.current) {
      const radius = 5;
      rotatingLightRef.current.position.x = Math.cos(t * 0.1) * radius;
      rotatingLightRef.current.position.z = Math.sin(t * 0.1) * radius;
      rotatingLightRef.current.position.y = 6;
    }
  });

  const waterFogColor = useMemo(() => {
    const qualityFactor = waterQuality / 100;
    const tempFactor = (temperature - 10) / 25;
    const color = new THREE.Color();
    const hue = 0.5 + qualityFactor * 0.05 - tempFactor * 0.03;
    color.setHSL(hue, 0.6, 0.12);
    return color;
  }, [waterQuality, temperature]);

  useEffect(() => {
    scene.fog = new THREE.FogExp2(waterFogColor, 0.06);
  }, [waterFogColor, scene]);

  const halfW = TANK_WIDTH / 2;
  const halfD = TANK_DEPTH / 2;
  const halfH = TANK_HEIGHT / 2;
  const frameT = TANK_WALL_THICKNESS;

  const samplePoints = fishes.length > 80 ? SAMPLE_POINTS_LOW : SAMPLE_POINTS_HIGH;
  void samplePoints;

  return (
    <group>
      <ambientLight intensity={0.3 + lightIntensity * 0.05} />
      <directionalLight
        position={[3, 8, 5]}
        intensity={0.5 + lightIntensity * 0.08}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-halfW - 1}
        shadow-camera-right={halfW + 1}
        shadow-camera-top={halfH + 1}
        shadow-camera-bottom={-1}
        shadow-camera-near={0.1}
        shadow-camera-far={20}
      />
      <pointLight
        ref={rotatingLightRef}
        position={[5, 6, 0]}
        intensity={0.4 + lightIntensity * 0.06}
        color="#b2ebf2"
        distance={15}
        decay={2}
        castShadow
      />
      <pointLight
        position={[0, TANK_HEIGHT - 0.2, 0]}
        intensity={0.3}
        color="#e1f5fe"
        distance={10}
      />

      <mesh ref={groundRef} position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} onClick={handleClick} receiveShadow>
        <planeGeometry args={[TANK_WIDTH - frameT * 2, TANK_DEPTH - frameT * 2]} />
        <meshStandardMaterial
          color="#1a3a5c"
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>

      <mesh position={[0, 0, 0]} receiveShadow>
        <boxGeometry args={[TANK_WIDTH - frameT * 2, 0.02, TANK_DEPTH - frameT * 2]} />
        <meshStandardMaterial
          color="#0d47a1"
          roughness={0.8}
          metalness={0.2}
        />
      </mesh>

      <GlassPanel
        position={[0, halfH, -halfD]}
        rotation={[0, 0, 0]}
        size={[TANK_WIDTH, TANK_HEIGHT]}
      />
      <GlassPanel
        position={[0, halfH, halfD]}
        rotation={[0, 0, 0]}
        size={[TANK_WIDTH, TANK_HEIGHT]}
      />
      <GlassPanel
        position={[-halfW, halfH, 0]}
        rotation={[0, Math.PI / 2, 0]}
        size={[TANK_DEPTH, TANK_HEIGHT]}
      />
      <GlassPanel
        position={[halfW, halfH, 0]}
        rotation={[0, Math.PI / 2, 0]}
        size={[TANK_DEPTH, TANK_HEIGHT]}
      />

      {[
        { pos: [0, TANK_HEIGHT, 0], size: [TANK_WIDTH, TANK_DEPTH], rot: [-Math.PI / 2, 0, 0] as [number, number, number] },
        { pos: [0, halfH, -halfD], size: [TANK_WIDTH, TANK_HEIGHT], rot: [0, 0, 0] as [number, number, number] },
        { pos: [0, halfH, halfD], size: [TANK_WIDTH, TANK_HEIGHT], rot: [0, 0, 0] as [number, number, number] },
        { pos: [-halfW, halfH, 0], size: [TANK_DEPTH, TANK_HEIGHT], rot: [0, Math.PI / 2, 0] as [number, number, number] },
        { pos: [halfW, halfH, 0], size: [TANK_DEPTH, TANK_HEIGHT], rot: [0, Math.PI / 2, 0] as [number, number, number] },
      ].map((f, i) => (
        <group key={`frame-${i}`}>
          <mesh
            position={[
              f.pos[0] + (i >= 3 ? (i === 3 ? -frameT / 2 : frameT / 2) : 0),
              f.pos[1] + (i === 0 ? frameT / 2 : 0),
              f.pos[2] + (i >= 1 && i <= 2 ? (i === 1 ? -frameT / 2 : frameT / 2) : 0),
            ]}
            rotation={f.rot}
          >
            <boxGeometry
              args={[
                f.size[0] + frameT,
                frameT,
                frameT,
              ]}
            />
            <meshStandardMaterial
              color={FRAME_COLOR}
              metalness={0.6}
              roughness={0.3}
            />
          </mesh>
          <mesh
            position={[
              f.pos[0] + (i >= 3 ? (i === 3 ? -frameT / 2 : frameT / 2) : 0),
              f.pos[1] - (i === 0 ? 0 : halfH) + (i === 0 ? frameT / 2 : 0),
              f.pos[2] + (i >= 1 && i <= 2 ? (i === 1 ? -frameT / 2 : frameT / 2) : 0),
            ]}
            rotation={f.rot}
          >
            <boxGeometry
              args={[
                f.size[0] + frameT,
                frameT,
                frameT,
              ]}
            />
            <meshStandardMaterial
              color={FRAME_COLOR}
              metalness={0.6}
              roughness={0.3}
            />
          </mesh>
          {i !== 0 && (
            <>
              <mesh
                position={[
                  f.pos[0] - f.size[0] / 2 + (i >= 3 ? (i === 3 ? -frameT / 2 : frameT / 2) : 0),
                  f.pos[1],
                  f.pos[2] + (i >= 1 && i <= 2 ? (i === 1 ? -frameT / 2 : frameT / 2) : 0),
                ]}
                rotation={f.rot}
              >
                <boxGeometry args={[frameT, frameT, TANK_HEIGHT + frameT]} />
                <meshStandardMaterial
                  color={FRAME_COLOR}
                  metalness={0.6}
                  roughness={0.3}
                />
              </mesh>
              <mesh
                position={[
                  f.pos[0] + f.size[0] / 2 + (i >= 3 ? (i === 3 ? -frameT / 2 : frameT / 2) : 0),
                  f.pos[1],
                  f.pos[2] + (i >= 1 && i <= 2 ? (i === 1 ? -frameT / 2 : frameT / 2) : 0),
                ]}
                rotation={f.rot}
              >
                <boxGeometry args={[frameT, frameT, TANK_HEIGHT + frameT]} />
                <meshStandardMaterial
                  color={FRAME_COLOR}
                  metalness={0.6}
                  roughness={0.3}
                />
              </mesh>
            </>
          )}
        </group>
      ))}

      <DustParticles lightIntensity={lightIntensity} fishCount={fishes.length} />

      {bubbles.map((bubble) => (
        <BubbleMesh key={bubble.id} bubble={bubble} />
      ))}

      {ripples.map((ripple) => (
        <RippleMesh key={ripple.id} ripple={ripple} y={0.03} />
      ))}

      {surfaceRipples.map((ripple) => (
        <RippleMesh
          key={ripple.id}
          ripple={ripple}
          y={TANK_HEIGHT - 0.05}
          color="#80deea"
        />
      ))}

      {fishes.map((fish) => (
        <FishMesh
          key={fish.id}
          fish={fish as any}
          lightIntensity={lightIntensity}
          onClick={() => onFishClick(fish.id)}
          isSelected={fish.id === selectedFishId}
        />
      ))}

      <mesh position={[0, TANK_HEIGHT - 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[TANK_WIDTH, TANK_DEPTH]} />
        <meshPhysicalMaterial
          color="#80deea"
          transparent
          opacity={0.1}
          transmission={0.8}
          roughness={0.1}
          metalness={0}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};

export default SceneRenderer;
