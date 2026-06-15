import React, { useRef, useEffect, useState } from 'react';
import { useStore } from '../stores/useStore';
import * as THREE from 'three';

const MAP_SIZE = 150;
const MAP_RANGE = 30;

export const MiniMap: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useStore((s) => s.particles);
  const cameraPosition = useStore((s) => s.cameraPosition);
  const cameraTarget = useStore((s) => s.cameraTarget);
  const setCameraPosition = useStore((s) => s.setCameraPosition);
  const setCameraTarget = useStore((s) => s.setCameraTarget);

  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<number | null>(null);

  const worldToMap = (x: number, z: number): [number, number] => {
    const mapX = MAP_SIZE / 2 + (x / MAP_RANGE) * (MAP_SIZE / 2);
    const mapY = MAP_SIZE / 2 - (z / MAP_RANGE) * (MAP_SIZE / 2);
    return [Math.max(0, Math.min(MAP_SIZE, mapX)), Math.max(0, Math.min(MAP_SIZE, mapY))];
  };

  const mapToWorld = (mapX: number, mapY: number): [number, number] => {
    const x = ((mapX - MAP_SIZE / 2) / (MAP_SIZE / 2)) * MAP_RANGE;
    const z = ((MAP_SIZE / 2 - mapY) / (MAP_SIZE / 2)) * MAP_RANGE;
    return [x, z];
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, MAP_SIZE, MAP_SIZE);

    ctx.fillStyle = 'rgba(15, 15, 25, 0.7)';
    ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);

    ctx.strokeStyle = 'rgba(100, 100, 140, 0.3)';
    ctx.lineWidth = 1;
    const gridCount = 6;
    for (let i = 0; i <= gridCount; i++) {
      const pos = (i / gridCount) * MAP_SIZE;
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, MAP_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(MAP_SIZE, pos);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(100, 100, 140, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, MAP_SIZE - 2, MAP_SIZE - 2);

    particles.forEach((p) => {
      const [mx, my] = worldToMap(p.position.x, p.position.z);
      
      ctx.beginPath();
      ctx.arc(mx, my, 6, 0, Math.PI * 2);
      ctx.fillStyle = p.color + '44';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(mx, my, 4, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(mx, my, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    });

    const [camX, camZ] = worldToMap(cameraPosition.x, cameraPosition.z);
    const [targetX, targetZ] = worldToMap(cameraTarget.x, cameraTarget.z);

    ctx.beginPath();
    ctx.moveTo(camX, camZ);
    ctx.lineTo(targetX, targetZ);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(camX, camZ, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(targetX, targetZ, 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fill();
  }, [particles, cameraPosition, cameraTarget]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isAnimating) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const [worldX, worldZ] = mapToWorld(x, y);

    const startPos = cameraPosition.clone();
    const startTarget = cameraTarget.clone();
    const endTarget = new THREE.Vector3(worldX, 0, worldZ);
    const endPos = new THREE.Vector3(worldX, startPos.y - startTarget.y, worldZ + 15);

    const startTime = performance.now();
    const duration = 800;

    setIsAnimating(true);

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const easeT = 1 - Math.pow(1 - t, 3);

      const currentPos = new THREE.Vector3().lerpVectors(startPos, endPos, easeT);
      const currentTarget = new THREE.Vector3().lerpVectors(startTarget, endTarget, easeT);

      setCameraPosition(currentPos);
      setCameraTarget(currentTarget);

      const controls = document.querySelector('.MapView') as any;
      if (controls) {
        const orbitControls = (window as any).__orbitControls;
        if (orbitControls) {
          orbitControls.target.copy(currentTarget);
        }
      }

      if (t < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };

    animate();
  };

  return (
    <div className="mini-map">
      <div className="mini-map-title">迷你地图</div>
      <canvas
        ref={canvasRef}
        width={MAP_SIZE}
        height={MAP_SIZE}
        onClick={handleClick}
        className="mini-map-canvas"
      />
    </div>
  );
};
