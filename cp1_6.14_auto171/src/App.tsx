import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useCityStore } from './store';
import { CityGenerator } from './core/CityGenerator';
import { CityRenderer } from './visualization/CityRenderer';
import { AnimationController } from './visualization/AnimationController';
import ControlPanel from './ui/ControlPanel';

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
}

function ParticleExplosion({ progress }: { progress: number }) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [visible, setVisible] = useState(false);
  const prevMilestoneRef = useRef(0);

  useEffect(() => {
    const milestones = [0.25, 0.5, 0.75, 1.0];
    const currentMilestone = milestones.find(
      (m) => progress >= m && prevMilestoneRef.current < m
    );

    if (currentMilestone !== undefined) {
      prevMilestoneRef.current = currentMilestone;
      const colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#9b59b6', '#e74c3c', '#1abc9c'];
      const newParticles: Particle[] = Array.from({ length: 100 }, (_, i) => {
        const angle = (Math.PI * 2 * i) / 100 + Math.random() * 0.3;
        const speed = 80 + Math.random() * 120;
        return {
          id: i,
          x: 0,
          y: 0,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: colors[Math.floor(Math.random() * colors.length)],
          life: 1,
        };
      });
      setParticles(newParticles);
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [progress]);

  if (!visible || particles.length === 0) return null;

  const t = 0.5;

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '55%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 200,
      }}
    >
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: p.x + p.vx * t,
            top: p.y + p.vy * t,
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: p.color,
            opacity: 1 - t,
            transform: `scale(${1 - t * 0.5})`,
          }}
        />
      ))}
    </div>
  );
}

function ScreenGlow({ progress }: { progress: number }) {
  const [glowing, setGlowing] = useState(false);
  const prevMilestoneRef = useRef(0);

  useEffect(() => {
    const milestones = [0.25, 0.5, 0.75, 1.0];
    const currentMilestone = milestones.find(
      (m) => progress >= m && prevMilestoneRef.current < m
    );

    if (currentMilestone !== undefined) {
      prevMilestoneRef.current = currentMilestone;
      setGlowing(true);
      const timer = setTimeout(() => setGlowing(false), 300);
      return () => clearTimeout(timer);
    }
  }, [progress]);

  if (!glowing) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 150,
        boxShadow: 'inset 0 0 80px 20px rgba(102, 126, 234, 0.4)',
      }}
    />
  );
}

function FpsDisplay({ fps }: { fps: number }) {
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (fps < 30) {
      const id = setInterval(() => setFlash((f) => !f), 400);
      return () => clearInterval(id);
    } else {
      setFlash(false);
    }
  }, [fps]);

  return (
    <div
      style={{
        position: 'fixed',
        top: 20,
        right: 24,
        zIndex: 100,
        fontFamily: 'monospace',
        fontSize: 14,
        fontWeight: 700,
        color: fps < 30 ? (flash ? '#ff4444' : '#882222') : '#44ff88',
        transition: 'color 0.2s',
      }}
    >
      FPS: {fps}
    </div>
  );
}

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<CityRenderer | null>(null);
  const controllerRef = useRef<AnimationController | null>(null);
  const generatorRef = useRef<CityGenerator | null>(null);
  const prevParamsRef = useRef<string>('');

  const { params, growthProgress, isNightMode, cameraMode, fps, setGrowthProgress, setFps } =
    useCityStore();
  const [displayProgress, setDisplayProgress] = useState(0);

  const regenerateCity = useCallback(() => {
    if (!controllerRef.current) return;

    const generator = new CityGenerator({
      plotSize: params.plotSize,
      density: params.density,
      maxHeight: params.maxHeight,
      seed: Math.floor(Math.random() * 100000),
    });

    generatorRef.current = generator;
    controllerRef.current.setCityGenerator(generator);

    if (rendererRef.current) {
      rendererRef.current.createGround(params.plotSize);
    }
  }, [params]);

  useEffect(() => {
    if (!containerRef.current) return;

    const renderer = new CityRenderer(containerRef.current);
    rendererRef.current = renderer;

    const controller = new AnimationController(renderer);
    controllerRef.current = controller;

    controller.setOnProgressUpdate((t) => {
      setGrowthProgress(t);
      setDisplayProgress(t);
    });

    controller.setOnFpsUpdate((fps) => {
      setFps(fps);
    });

    const paramsKey = JSON.stringify(params);
    prevParamsRef.current = paramsKey;

    const generator = new CityGenerator({
      plotSize: params.plotSize,
      density: params.density,
      maxHeight: params.maxHeight,
    });
    generatorRef.current = generator;
    controller.setCityGenerator(generator);
    controller.setGrowthSpeed(params.growthSpeed);

    renderer.createGround(params.plotSize);
    controller.start();

    return () => {
      controller.dispose();
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    const paramsKey = JSON.stringify(params);
    if (paramsKey !== prevParamsRef.current) {
      prevParamsRef.current = paramsKey;
      regenerateCity();
    }
  }, [params, regenerateCity]);

  useEffect(() => {
    if (controllerRef.current) {
      controllerRef.current.setGrowthSpeed(params.growthSpeed);
    }
  }, [params.growthSpeed]);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setNightMode(isNightMode);
    }
  }, [isNightMode]);

  useEffect(() => {
    if (rendererRef.current && controllerRef.current) {
      const tallest = controllerRef.current.getTallestBuilding();
      rendererRef.current.setCameraMode(cameraMode, tallest ?? undefined);
    }
  }, [cameraMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const store = useCityStore.getState();
      if (e.key === '1') store.setCameraMode('overview');
      else if (e.key === '2') store.setCameraMode('ground');
      else if (e.key === '3') store.setCameraMode('follow');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const pctValue = (displayProgress * 100).toFixed(1);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0a0a0f', overflow: 'hidden' }}>
      <div
        ref={containerRef}
        style={{
          position: 'absolute',
          left: 332,
          top: 0,
          right: 0,
          bottom: 0,
        }}
      />

      <ControlPanel />

      <ParticleExplosion progress={growthProgress} />
      <ScreenGlow progress={growthProgress} />

      <div
        style={{
          position: 'fixed',
          bottom: 32,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '60%',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span
          style={{
            fontSize: 12,
            color: '#a0a8c0',
            fontFamily: 'monospace',
            fontWeight: 600,
          }}
        >
          {pctValue}%
        </span>
        <div
          style={{
            width: '100%',
            height: 6,
            borderRadius: 3,
            background: '#2a2a3e',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${displayProgress * 100}%`,
              height: '100%',
              borderRadius: 3,
              background: 'linear-gradient(to right, #667eea, #764ba2)',
              transition: 'width 0.1s linear',
            }}
          />
        </div>
      </div>

      <FpsDisplay fps={fps} />
    </div>
  );
}
