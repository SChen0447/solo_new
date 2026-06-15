import React, { useRef, useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useAquariumStore, FishData, Ripple, Bubble, SurfaceRipple } from "./store";
import SceneRenderer from "./SceneRenderer";
import ControlPanel from "./ControlPanel";
import {
  Fish,
  createFish,
  updateFishes,
  generateRippleId,
  generateBubbleId,
  generateSurfaceRippleId,
  TANK_WIDTH,
  TANK_DEPTH,
  TANK_HEIGHT,
} from "./FishBehavior";

const FishTank: React.FC = () => {
  const {
    temperature,
    waterQuality,
    lightIntensity,
    selectedSpecies,
    selectedFishId,
    fishes,
    ripples,
    bubbles,
    surfaceRipples,
    addFish,
    addRipple,
    removeRipple,
    addBubble,
    removeBubble,
    addSurfaceRipple,
    removeSurfaceRipple,
    updateFishes: updateStoreFishes,
    updateBubbles: updateStoreBubbles,
    setSelectedFishId,
  } = useAquariumStore();

  const fishObjectsRef = useRef<Fish[]>([]);
  const bubbleSpawnTimerRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    const storeFishIds = new Set(fishes.map((f) => f.id));
    const existingIds = new Set(fishObjectsRef.current.map((f) => f.id));

    for (const f of fishes) {
      if (!existingIds.has(f.id)) {
        const newFish = new Fish(f.species, f.position, f.size);
        newFish.id = f.id;
        newFish.direction = { ...f.direction };
        newFish.phase = f.phase;
        fishObjectsRef.current.push(newFish);
      }
    }

    fishObjectsRef.current = fishObjectsRef.current.filter((f) =>
      storeFishIds.has(f.id)
    );

    for (const fish of fishObjectsRef.current) {
      const storeFish = fishes.find((f) => f.id === fish.id);
      if (storeFish) {
        fish.isSelected = storeFish.isSelected;
      }
    }
  }, [fishes.length, selectedFishId]);

  useEffect(() => {
    for (const fish of fishObjectsRef.current) {
      fish.isSelected = fish.id === selectedFishId;
    }
  }, [selectedFishId]);

  useEffect(() => {
    const animate = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;

      if (fishObjectsRef.current.length > 0) {
        fishObjectsRef.current = updateFishes(
          fishObjectsRef.current,
          dt,
          temperature,
          waterQuality,
          lightIntensity
        );
        const updatedFishes: FishData[] = fishObjectsRef.current.map((f) =>
          f.toFishData()
        );
        updateStoreFishes(updatedFishes);
      }

      bubbleSpawnTimerRef.current -= dt;
      if (bubbleSpawnTimerRef.current <= 0) {
        const bubbleCount = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < bubbleCount; i++) {
          const x = (Math.random() - 0.5) * (TANK_WIDTH - 0.4);
          const z = (Math.random() - 0.5) * (TANK_DEPTH - 0.4);
          const radius = 0.02 + Math.random() * 0.04;
          const speed = 0.2 + Math.random() * 0.2;
          const bubble: Bubble = {
            id: generateBubbleId(),
            position: { x, y: 0.05, z },
            radius,
            speed,
          };
          addBubble(bubble);
        }
        bubbleSpawnTimerRef.current = 0.3 + Math.random() * 0.7;
      }

      if (bubbles.length > 0) {
        const updatedBubbles: Bubble[] = [];
        for (const bubble of bubbles) {
          const newY = bubble.position.y + bubble.speed * dt;
          if (newY >= TANK_HEIGHT - 0.1) {
            const sr: SurfaceRipple = {
              id: generateSurfaceRippleId(),
              position: { x: bubble.position.x, z: bubble.position.z },
              startTime: now / 1000,
              duration: 0.5,
              maxRadius: 0.1 + Math.random() * 0.2,
            };
            addSurfaceRipple(sr);
          } else {
            const wobbleX = Math.sin(now / 500 + bubble.id.length) * dt * 0.1;
            const wobbleZ = Math.cos(now / 600 + bubble.id.length) * dt * 0.1;
            updatedBubbles.push({
              ...bubble,
              position: {
                x: bubble.position.x + wobbleX,
                y: newY,
                z: bubble.position.z + wobbleZ,
              },
            });
          }
        }
        if (updatedBubbles.length !== bubbles.length) {
          updateStoreBubbles(updatedBubbles);
        } else {
          let changed = false;
          for (let i = 0; i < updatedBubbles.length; i++) {
            if (
              updatedBubbles[i].position.y !== bubbles[i].position.y ||
              updatedBubbles[i].position.x !== bubbles[i].position.x ||
              updatedBubbles[i].position.z !== bubbles[i].position.z
            ) {
              changed = true;
              break;
            }
          }
          if (changed) updateStoreBubbles(updatedBubbles);
        }
      }

      const currentTime = now / 1000;
      for (const ripple of ripples) {
        if (currentTime - ripple.startTime > ripple.duration) {
          removeRipple(ripple.id);
        }
      }
      for (const sr of surfaceRipples) {
        if (currentTime - sr.startTime > sr.duration) {
          removeSurfaceRipple(sr.id);
        }
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [
    temperature,
    waterQuality,
    lightIntensity,
    bubbles,
    ripples,
    surfaceRipples,
    addBubble,
    addSurfaceRipple,
    removeRipple,
    removeSurfaceRipple,
    updateStoreFishes,
    updateStoreBubbles,
  ]);

  const handleTankClick = (x: number, z: number) => {
    setSelectedFishId(null);

    const halfW = TANK_WIDTH / 2 - 0.2;
    const halfD = TANK_DEPTH / 2 - 0.2;
    const clampedX = Math.max(-halfW, Math.min(halfW, x));
    const clampedZ = Math.max(-halfD, Math.min(halfD, z));

    const newFish = createFish(selectedSpecies, clampedX, clampedZ);
    addFish(newFish.toFishData());

    const ripple: Ripple = {
      id: generateRippleId(),
      position: { x: clampedX, z: clampedZ },
      startTime: performance.now() / 1000,
      duration: 0.8,
      maxRadius: 0.5 + Math.random() * 0.7,
    };
    addRipple(ripple);
  };

  const handleFishClick = (fishId: string) => {
    setSelectedFishId(fishId === selectedFishId ? null : fishId);
  };

  const bgColor = useMemo(() => "#0a0e27", []);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: `linear-gradient(135deg, ${bgColor} 0%, #0d1b3e 50%, #0a1628 100%)`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Canvas
        shadows
        camera={{ position: [5, 4, 6], fov: 45, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
      >
        <color attach="background" args={[bgColor]} />

        <SceneRenderer
          fishes={fishes}
          ripples={ripples}
          surfaceRipples={surfaceRipples}
          bubbles={bubbles}
          temperature={temperature}
          waterQuality={waterQuality}
          lightIntensity={lightIntensity}
          onTankClick={handleTankClick}
          onFishClick={handleFishClick}
          selectedFishId={selectedFishId}
        />

        <OrbitControls
          enableDamping
          dampingFactor={0.08}
          minPolarAngle={Math.PI / 2 - (Math.PI / 180) * 30}
          maxPolarAngle={Math.PI / 2 + (Math.PI / 180) * 45}
          minDistance={2}
          maxDistance={10}
          enablePan={false}
          target={[0, TANK_HEIGHT / 2, 0]}
        />
      </Canvas>

      <ControlPanel />

      <div
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          color: "#00e5ff",
          fontSize: "12px",
          padding: "12px 16px",
          background: "rgba(13, 27, 42, 0.7)",
          borderRadius: "8px",
          border: "1px solid rgba(0, 188, 212, 0.3)",
          backdropFilter: "blur(8px)",
          lineHeight: 1.8,
          zIndex: 100,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "6px", color: "#00e676" }}>
          🌊 操作指南
        </div>
        <div>🖱️ 左键拖拽：旋转视角</div>
        <div>🔍 滚轮：缩放视野</div>
        <div>📍 点击缸底：放置鱼类</div>
        <div>🐟 点击鱼：查看详情</div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: "16px",
          left: "50%",
          transform: "translateX(-50%)",
          color: "#4db6ac",
          fontSize: "11px",
          padding: "8px 16px",
          background: "rgba(13, 27, 42, 0.5)",
          borderRadius: "6px",
          letterSpacing: "0.5px",
          zIndex: 100,
          userSelect: "none",
        }}
      >
        ✨ 调节水温、水质和光照，观察鱼群行为的变化 ✨
      </div>
    </div>
  );
};

export default FishTank;
