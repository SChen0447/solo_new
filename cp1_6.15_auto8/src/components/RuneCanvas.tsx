import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Point, detectRune, getRuneResults } from '@/modules/runeEngine';
import {
  EnergySystemState,
  createNodes,
  updateEnergySystem,
  activateAllNodesAndTransfer,
  triggerResonance,
  getNodeScale,
  getFlashOpacity,
  resetNodes,
} from '@/modules/energySystem';
import { spellFormulas } from '@/data/runes';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface TrailPoint extends Point {
  opacity: number;
  createdAt: number;
}

interface RunePulse {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  startTime: number;
  duration: number;
}

const RuneCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [trailPoints, setTrailPoints] = useState<TrailPoint[]>([]);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [runePulses, setRunePulses] = useState<RunePulse[]>([]);
  const [completedRunes, setCompletedRunes] = useState<{
    points: Point[];
    type: string;
    createdAt: number;
  }[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [canvasSize, setCanvasSize] = useState({ width: 600, height: 600 });
  const [energyState, setEnergyState] = useState<EnergySystemState>({
    nodes: [],
    energyWaves: [],
    resonance: { active: false, startTime: 0, duration: 0 },
    flashEffect: { active: false, startTime: 0, duration: 0 },
  });

  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(Date.now());
  const centerRef = useRef({ x: 300, y: 300 });

  const addRuneToSequence = useAppStore((state) => state.addRuneToSequence);
  const clearRuneSequence = useAppStore((state) => state.clearRuneSequence);
  const addLog = useAppStore((state) => state.addLog);
  const unlockSpell = useAppStore((state) => state.unlockSpell);
  const isSpellUnlocked = useAppStore((state) => state.isSpellUnlocked);
  const currentRuneSequence = useAppStore((state) => state.currentRuneSequence);
  const setCurrentSpell = useAppStore((state) => state.setCurrentSpell);
  const setSpellActive = useAppStore((state) => state.setSpellActive);

  useEffect(() => {
    const centerX = canvasSize.width / 2;
    const centerY = canvasSize.height / 2;
    centerRef.current = { x: centerX, y: centerY };
    setEnergyState((prev) => ({
      ...prev,
      nodes: createNodes(centerX, centerY),
    }));
  }, [canvasSize.width, canvasSize.height]);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        const size = Math.min(width, height);
        setCanvasSize({ width: size, height: size });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getCanvasPoint = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>): Point => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0, timestamp: Date.now() };
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        timestamp: Date.now(),
      };
    },
    []
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      setIsDrawing(true);
      const point = getCanvasPoint(e);
      setCurrentPath([point]);
    },
    [getCanvasPoint]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;
      const point = getCanvasPoint(e);
      setCurrentPath((prev) => [...prev, point]);
      setTrailPoints((prev) => [
        ...prev,
        { ...point, opacity: 1, createdAt: Date.now() },
      ]);
    },
    [isDrawing, getCanvasPoint]
  );

  const spawnParticles = useCallback(
    (x: number, y: number, color: string, count: number) => {
      const newParticles: Particle[] = [];
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 1;
        newParticles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          maxLife: 1,
          color,
          size: Math.random() * 4 + 2,
        });
      }
      setParticles((prev) => [...prev, ...newParticles]);
    },
    []
  );

  const spawnSpellParticles = useCallback(
    (x: number, y: number, spellType: string, color: string) => {
      const count = 50;
      const newParticles: Particle[] = [];

      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        let speed = Math.random() * 2 + 1;
        let size = Math.random() * 4 + 2;
        let vy = Math.sin(angle) * speed;
        let vx = Math.cos(angle) * speed;

        if (spellType === 'fireball') {
          speed = Math.random() * 3 + 1;
          vy = -Math.abs(vy) * 0.5;
          size = Math.random() * 6 + 3;
        } else if (spellType === 'frost') {
          speed = Math.random() * 1.5 + 0.5;
          size = Math.random() * 3 + 2;
        } else if (spellType === 'lightning') {
          speed = Math.random() * 5 + 2;
          size = Math.random() * 2 + 1;
        }

        newParticles.push({
          x,
          y,
          vx,
          vy,
          life: 1,
          maxLife: 1,
          color,
          size,
        });
      }

      setParticles((prev) => [...prev, ...newParticles]);
    },
    []
  );

  const checkSpellCombination = useCallback(
    (sequence: string[]) => {
      const result = getRuneResults(sequence as any);
      if (result.matchedSpell) {
        const isNew = !isSpellUnlocked(result.matchedSpell.id);
        if (isNew) {
          unlockSpell(result.matchedSpell.id);
        }

        addLog({
          runes: sequence as any,
          spellName: result.matchedSpell.name,
          spellColor: result.matchedSpell.color,
          success: true,
        });

        setCurrentSpell(result.matchedSpell);
        setSpellActive(true);

        setEnergyState((prev) => {
          let newState = activateAllNodesAndTransfer(
            prev,
            centerRef.current.x,
            centerRef.current.y
          );
          newState = triggerResonance(newState);
          return newState;
        });

        setTimeout(() => {
          spawnSpellParticles(
            centerRef.current.x,
            centerRef.current.y,
            result.matchedSpell!.spellType,
            result.matchedSpell!.color
          );
        }, 500);

        setTimeout(() => {
          setSpellActive(false);
          setCurrentSpell(null);
          clearRuneSequence();
          setCompletedRunes([]);
          setEnergyState((prev) => resetNodes(prev));
        }, 3000);

        return true;
      }
      return false;
    },
    [
      addLog,
      unlockSpell,
      isSpellUnlocked,
      setCurrentSpell,
      setSpellActive,
      clearRuneSequence,
      spawnSpellParticles,
    ]
  );

  const handleMouseUp = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (currentPath.length > 10) {
      const result = detectRune(currentPath);
      if (result.type && result.confidence > 0.4) {
        addRuneToSequence(result.type);
        setCompletedRunes((prev) => [
          ...prev,
          { points: currentPath, type: result.type!, createdAt: Date.now() },
        ]);

        const lastPoint = currentPath[Math.floor(currentPath.length / 2)];
        setRunePulses((prev) => [
          ...prev,
          {
            x: lastPoint.x,
            y: lastPoint.y,
            radius: 0,
            maxRadius: 60,
            startTime: Date.now(),
            duration: 300,
          },
        ]);

        spawnParticles(lastPoint.x, lastPoint.y, '#aaddff', 15);

        const newSequence = [...currentRuneSequence, result.type];
        if (newSequence.length >= 3) {
          const matched = checkSpellCombination(newSequence);
          if (!matched && newSequence.length >= 5) {
            addLog({
              runes: newSequence as any,
              spellName: null,
              spellColor: null,
              success: false,
            });
            clearRuneSequence();
            setCompletedRunes([]);
          }
        }
      }
    }

    setCurrentPath([]);
  }, [isDrawing, currentPath, addRuneToSequence, currentRuneSequence, checkSpellCombination, addLog, clearRuneSequence, spawnParticles]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      const now = Date.now();
      const deltaTime = now - lastTimeRef.current;
      lastTimeRef.current = now;

      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

      const centerX = centerRef.current.x;
      const centerY = centerRef.current.y;

      ctx.beginPath();
      ctx.arc(centerX, centerY, 80, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(centerX, centerY, 120, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();

      setEnergyState((prev) => updateEnergySystem(prev, deltaTime));

      energyState.nodes.forEach((node) => {
        const scale = getNodeScale(node, 1);
        const radius = 8 * scale;

        const gradient = ctx.createRadialGradient(
          node.x,
          node.y,
          0,
          node.x,
          node.y,
          radius * 2
        );
        gradient.addColorStop(0, node.color);
        gradient.addColorStop(0.5, node.color + '80');
        gradient.addColorStop(1, 'transparent');

        ctx.beginPath();
        ctx.arc(node.x, node.y, radius * 2, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.fill();

        if (node.active) {
          ctx.beginPath();
          ctx.arc(node.x, centerY, radius * 1.5, 0, Math.PI * 2);
          ctx.strokeStyle = node.color;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });

      energyState.nodes.forEach((node) => {
        ctx.beginPath();
        ctx.moveTo(node.x, node.y);
        ctx.lineTo(centerX, centerY);
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.1)';
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      energyState.energyWaves.forEach((wave) => {
        const x = wave.startX + (wave.endX - wave.startX) * wave.progress;
        const y = wave.startY + (wave.endY - wave.startY) * wave.progress;

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 12);
        gradient.addColorStop(0, wave.color);
        gradient.addColorStop(0.5, wave.color + '80');
        gradient.addColorStop(1, 'transparent');

        ctx.beginPath();
        ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      });

      completedRunes.forEach((rune) => {
        if (rune.points.length < 2) return;

        const age = (Date.now() - rune.createdAt) / 200;
        const fadeIn = Math.min(1, age);

        ctx.shadowColor = '#aaddff';
        ctx.shadowBlur = 10 * fadeIn;

        ctx.beginPath();
        ctx.moveTo(rune.points[0].x, rune.points[0].y);
        for (let i = 1; i < rune.points.length; i++) {
          ctx.lineTo(rune.points[i].x, rune.points[i].y);
        }
        ctx.strokeStyle = `rgba(170, 221, 255, ${0.9 * fadeIn})`;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        ctx.shadowBlur = 0;
      });

      const nowTime = Date.now();
      const activeTrails = trailPoints.filter(
        (p) => nowTime - p.createdAt < 500
      );
      setTrailPoints(activeTrails);

      if (activeTrails.length > 1) {
        ctx.beginPath();
        ctx.moveTo(activeTrails[0].x, activeTrails[0].y);
        for (let i = 1; i < activeTrails.length; i++) {
          const point = activeTrails[i];
          const age = (nowTime - point.createdAt) / 500;
          const opacity = 1 - age;
          ctx.strokeStyle = `rgba(170, 221, 255, ${opacity * 0.7})`;
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          ctx.lineTo(point.x, point.y);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(point.x, point.y);
        }
      }

      if (currentPath.length > 1) {
        ctx.beginPath();
        ctx.moveTo(currentPath[0].x, currentPath[0].y);
        for (let i = 1; i < currentPath.length; i++) {
          ctx.lineTo(currentPath[i].x, currentPath[i].y);
        }
        ctx.strokeStyle = 'rgba(170, 221, 255, 0.9)';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
      }

      const activePulses = runePulses.filter(
        (p) => nowTime - p.startTime < p.duration
      );
      setRunePulses(activePulses);

      activePulses.forEach((pulse) => {
        const progress = (nowTime - pulse.startTime) / pulse.duration;
        const radius = pulse.maxRadius * progress;
        const opacity = 1 - progress;

        ctx.beginPath();
        ctx.arc(pulse.x, pulse.y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(170, 221, 255, ${opacity})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      });

      const currentSpell = useAppStore.getState().currentSpell;
      const spellActive = useAppStore.getState().spellActive;
      if (spellActive && currentSpell) {
        const spellX = centerX;
        const spellY = centerY;

        const gradient = ctx.createRadialGradient(
          spellX,
          spellY,
          0,
          spellX,
          spellY,
          50
        );
        gradient.addColorStop(0, currentSpell.color);
        gradient.addColorStop(0.5, currentSpell.color + '80');
        gradient.addColorStop(1, 'transparent');

        ctx.beginPath();
        ctx.arc(spellX, spellY, 50, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(spellX, spellY, 20, 0, Math.PI * 2);
        ctx.fillStyle = currentSpell.color;
        ctx.fill();

        if (Math.random() > 0.5) {
          spawnSpellParticles(
            spellX,
            spellY,
            currentSpell.spellType,
            currentSpell.color
          );
        }
      }

      setParticles((prev) =>
        prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.05,
            life: p.life - deltaTime / 2000,
          }))
          .filter((p) => p.life > 0)
      );

      particles.forEach((p) => {
        const alpha = p.life / p.maxLife;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
        ctx.fill();
      });

      const flashOpacity = getFlashOpacity(energyState.flashEffect);
      if (flashOpacity > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${flashOpacity})`;
        ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
      }

      if (energyState.resonance.active) {
        const progress =
          (nowTime - energyState.resonance.startTime) /
          energyState.resonance.duration;
        const radius = 100 * progress;
        const opacity = 1 - progress;

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 215, 0, ${opacity * 0.8})`;
        ctx.lineWidth = 4;
        ctx.stroke();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [
    canvasSize,
    currentPath,
    trailPoints,
    runePulses,
    completedRunes,
    particles,
    energyState,
    spawnSpellParticles,
  ]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '60%',
        aspectRatio: '1 / 1',
        maxWidth: '600px',
        maxHeight: '600px',
        border: '2px solid rgba(255, 215, 0, 0.3)',
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: '#000000',
        boxShadow: '0 0 30px rgba(255, 215, 0, 0.1)',
        position: 'relative',
      }}
    >
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          cursor: 'crosshair',
          display: 'block',
        }}
      />
    </div>
  );
};

export default RuneCanvas;
