import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useGameStore } from '../../stores/gameStore';
import {
  Star,
  STAR_TYPE_COLORS,
  STAR_TYPE_NAMES,
  MAP_SIZE,
  FUEL_PER_JUMP_UNIT,
  TIME_PER_JUMP_UNIT,
} from '../../utils/constants';
import {
  generateStars,
  getStarById,
  areStarsConnected,
} from './starGenerator';

interface HoveredStarInfo {
  star: Star;
  x: number;
  y: number;
}

export const StarMap: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const navStartTimeRef = useRef<number>(0);
  const [hoveredStar, setHoveredStar] = useState<HoveredStarInfo | null>(null);
  const [viewport, setViewport] = useState({ offsetX: 0, offsetY: 0, scale: 1 });
  const isDraggingRef = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  const {
    stars,
    connections,
    currentStarId,
    selectedStarId,
    setStars,
    setConnections,
    setCurrentStar,
    setSelectedStar,
    isNavigating,
    navigationProgress,
    navigationPath,
    startNavigation,
    updateNavigationProgress,
    completeNavigation,
    addResources,
    resources,
  } = useGameStore();

  const [routeInfo, setRouteInfo] = useState<{ fuel: number; time: number } | null>(null);

  useEffect(() => {
    const { stars: generatedStars, connections: generatedConnections } = generateStars();
    setStars(generatedStars);
    setConnections(generatedConnections);
    if (generatedStars.length > 0) {
      setCurrentStar(generatedStars[0].id);
      useGameStore.getState().addVisitedStar(generatedStars[0].id);
    }
  }, [setStars, setConnections, setCurrentStar]);

  const screenToMap = useCallback(
    (screenX: number, screenY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
        x: (screenX - rect.left - viewport.offsetX) / viewport.scale,
        y: (screenY - rect.top - viewport.offsetY) / viewport.scale,
      };
    },
    [viewport]
  );

  const mapToScreen = useCallback(
    (mapX: number, mapY: number) => {
      return {
        x: mapX * viewport.scale + viewport.offsetX,
        y: mapY * viewport.scale + viewport.offsetY,
      };
    },
    [viewport]
  );

  const findStarAtPosition = useCallback(
    (mapX: number, mapY: number): Star | null => {
      for (const star of stars) {
        const dx = star.x - mapX;
        const dy = star.y - mapY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 20) {
          return star;
        }
      }
      return null;
    },
    [stars]
  );

  const drawStar = useCallback(
    (ctx: CanvasRenderingContext2D, star: Star, time: number) => {
      const { x, y } = mapToScreen(star.x, star.y);
      const baseColor = STAR_TYPE_COLORS[star.type];
      const isCurrent = star.id === currentStarId;
      const isSelected = star.id === selectedStarId;
      const isVisited = useGameStore.getState().visitedStars.has(star.id);

      if (isSelected) {
        const haloAngle = (time / 2000) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(x, y, 30, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(100, 180, 255, 0.6)';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 4]);
        ctx.lineDashOffset = -haloAngle * 5;
        ctx.stroke();
        ctx.setLineDash([]);

        const gradient = ctx.createRadialGradient(x, y, 15, x, y, 35);
        gradient.addColorStop(0, 'rgba(100, 180, 255, 0.3)');
        gradient.addColorStop(1, 'rgba(100, 180, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, 35, 0, Math.PI * 2);
        ctx.fill();
      }

      if (isCurrent) {
        ctx.beginPath();
        ctx.arc(x, y, 25, 0, Math.PI * 2);
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      const size = star.isSpecial ? 10 : 7;
      const glowSize = size * 2.5;

      const starGlow = ctx.createRadialGradient(x, y, 0, x, y, glowSize);
      starGlow.addColorStop(0, baseColor);
      starGlow.addColorStop(0.4, baseColor + '88');
      starGlow.addColorStop(1, baseColor + '00');
      ctx.fillStyle = starGlow;
      ctx.beginPath();
      ctx.arc(x, y, glowSize, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = baseColor;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();

      if (star.type === 'pulsar') {
        const pulse = 0.5 + 0.5 * Math.sin(time / 300);
        ctx.globalAlpha = pulse;
        ctx.beginPath();
        ctx.arc(x, y, size + 4, 0, Math.PI * 2);
        ctx.strokeStyle = baseColor;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      if (star.type === 'black_hole') {
        ctx.beginPath();
        ctx.arc(x, y, size * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = '#000';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, size * 2, 0, Math.PI * 2);
        ctx.strokeStyle = '#8844ff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      if (isVisited || isCurrent) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(star.name, x, y + size + 18);
      }
    },
    [currentStarId, selectedStarId, mapToScreen]
  );

  const drawConnections = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      connections.forEach((conn) => {
        const fromStar = getStarById(stars, conn.from);
        const toStar = getStarById(stars, conn.to);
        if (!fromStar || !toStar) return;

        const from = mapToScreen(fromStar.x, fromStar.y);
        const to = mapToScreen(toStar.x, toStar.y);

        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.strokeStyle = 'rgba(100, 150, 200, 0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    },
    [connections, stars, mapToScreen]
  );

  const drawNavigationPath = useCallback(
    (ctx: CanvasRenderingContext2D, progress: number) => {
      if (!navigationPath) return;

      const from = mapToScreen(navigationPath.from.x, navigationPath.from.y);
      const to = mapToScreen(navigationPath.to.x, navigationPath.to.y);

      const currentX = from.x + (to.x - from.x) * progress;
      const currentY = from.y + (to.y - from.y) * progress;

      const gradient = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
      gradient.addColorStop(0, '#00ff88');
      gradient.addColorStop(1, '#0088ff');

      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(currentX, currentY);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 3;
      ctx.stroke();

      if (progress < 1) {
        ctx.beginPath();
        ctx.arc(currentX, currentY, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#00ff88';
        ctx.fill();

        const shipGlow = ctx.createRadialGradient(currentX, currentY, 0, currentX, currentY, 15);
        shipGlow.addColorStop(0, 'rgba(0, 255, 136, 0.5)');
        shipGlow.addColorStop(1, 'rgba(0, 255, 136, 0)');
        ctx.fillStyle = shipGlow;
        ctx.beginPath();
        ctx.arc(currentX, currentY, 15, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    [navigationPath, mapToScreen]
  );

  const drawBackgroundStars = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => {
      ctx.fillStyle = '#0d0d1a';
      ctx.fillRect(0, 0, width, height);

      const bgStarCount = 200;
      for (let i = 0; i < bgStarCount; i++) {
        const seed = i * 137.5;
        const x = (seed * 7.3) % width;
        const y = (seed * 13.7) % height;
        const size = ((seed * 3.1) % 2) + 0.5;
        const twinkle = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(time / 500 + i));
        ctx.fillStyle = `rgba(255, 255, 255, ${twinkle * 0.6})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    []
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      setViewport((v) => ({
        ...v,
        offsetX: (rect.width - MAP_SIZE.width) / 2,
        offsetY: (rect.height - MAP_SIZE.height) / 2,
      }));
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    startTimeRef.current = performance.now();

    const render = (time: number) => {
      const elapsed = time - startTimeRef.current;
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      drawBackgroundStars(ctx, width, height, elapsed);
      drawConnections(ctx);

      if (isNavigating && navigationPath) {
        const elapsedNav = time - navStartTimeRef.current;
        const progress = Math.min(1, elapsedNav / 1500);
        updateNavigationProgress(progress);
        drawNavigationPath(ctx, progress);

        if (progress >= 1) {
          const targetStar = navigationPath.to;
          const distance = Math.sqrt(
            (navigationPath.to.x - navigationPath.from.x) ** 2 +
              (navigationPath.to.y - navigationPath.from.y) ** 2
          );
          const fuelCost = Math.ceil(distance * FUEL_PER_JUMP_UNIT);
          addResources({ fuel: -fuelCost });
          completeNavigation();
        }
      }

      stars.forEach((star) => {
        drawStar(ctx, star, elapsed);
      });

      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationRef.current);
    };
  }, [
    stars,
    connections,
    isNavigating,
    navigationPath,
    navigationProgress,
    drawBackgroundStars,
    drawConnections,
    drawStar,
    drawNavigationPath,
    updateNavigationProgress,
    completeNavigation,
    addResources,
  ]);

  useEffect(() => {
    if (!isNavigating && selectedStarId && currentStarId) {
      const fromStar = getStarById(stars, currentStarId);
      const toStar = getStarById(stars, selectedStarId);
      if (fromStar && toStar && areStarsConnected(connections, currentStarId, selectedStarId)) {
        const distance = Math.sqrt(
          (toStar.x - fromStar.x) ** 2 + (toStar.y - fromStar.y) ** 2
        );
        setRouteInfo({
          fuel: Math.ceil(distance * FUEL_PER_JUMP_UNIT),
          time: Math.ceil(distance * TIME_PER_JUMP_UNIT),
        });
      } else {
        setRouteInfo(null);
      }
    } else {
      setRouteInfo(null);
    }
  }, [selectedStarId, currentStarId, stars, connections, isNavigating]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDraggingRef.current) {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      setViewport((v) => ({
        ...v,
        offsetX: v.offsetX + dx,
        offsetY: v.offsetY + dy,
      }));
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      return;
    }

    const mapPos = screenToMap(e.clientX, e.clientY);
    const star = findStarAtPosition(mapPos.x, mapPos.y);

    if (star) {
      setHoveredStar({ star, x: e.clientX, y: e.clientY });
    } else {
      setHoveredStar(null);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const wasDragging = isDraggingRef.current;
    isDraggingRef.current = false;

    const dx = Math.abs(e.clientX - lastMousePos.current.x);
    const dy = Math.abs(e.clientY - lastMousePos.current.y);

    if (!wasDragging || (dx < 5 && dy < 5)) {
      const mapPos = screenToMap(e.clientX, e.clientY);
      const star = findStarAtPosition(mapPos.x, mapPos.y);

      if (star && star.id !== currentStarId && !isNavigating) {
        if (selectedStarId === star.id) {
          if (
            currentStarId &&
            areStarsConnected(connections, currentStarId, star.id)
          ) {
            const fromStar = getStarById(stars, currentStarId);
            if (fromStar) {
              const distance = Math.sqrt(
                (star.x - fromStar.x) ** 2 + (star.y - fromStar.y) ** 2
              );
              const fuelCost = Math.ceil(distance * FUEL_PER_JUMP_UNIT);
              if (resources.fuel >= fuelCost) {
                navStartTimeRef.current = performance.now();
                startNavigation(fromStar, star);
              } else {
                useGameStore.getState().addFloatMessage('燃料不足，无法航行！', false);
              }
            }
          }
        } else {
          if (currentStarId && areStarsConnected(connections, currentStarId, star.id)) {
            setSelectedStar(star.id);
          } else if (currentStarId) {
            useGameStore.getState().addFloatMessage('该星系与当前位置不相连', false);
          }
        }
      }
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setViewport((v) => {
      const newScale = Math.max(0.3, Math.min(2, v.scale * delta));
      return { ...v, scale: newScale };
    });
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        style={{ cursor: hoveredStar ? 'pointer' : 'grab', display: 'block' }}
      />

      {routeInfo && (
        <div
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            padding: '12px 20px',
            borderRadius: 12,
            background: 'rgba(26, 26, 46, 0.9)',
            border: '1px solid rgba(102, 51, 153, 0.5)',
            backdropFilter: 'blur(10px)',
            animation: 'breathing-glow 3s ease-in-out infinite',
          }}
        >
          <div style={{ fontSize: 13, color: '#aaa', marginBottom: 6 }}>航线信息</div>
          <div style={{ display: 'flex', gap: 20 }}>
            <div>
              <span style={{ color: '#ffaa00', fontSize: 14 }}>⛽ 燃料消耗: </span>
              <span style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
                -{routeInfo.fuel}
              </span>
            </div>
            <div>
              <span style={{ color: '#00ccff', fontSize: 14 }}>⏱ 预计时间: </span>
              <span style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
                {routeInfo.time}s
              </span>
            </div>
          </div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 8 }}>再次点击确认航行</div>
        </div>
      )}

      {hoveredStar && (
        <div
          style={{
            position: 'fixed',
            left: Math.min(hoveredStar.x + 16, window.innerWidth - 240),
            top: Math.min(hoveredStar.y + 16, window.innerHeight - 280),
            width: 220,
            padding: '14px 16px',
            borderRadius: 16,
            background: 'rgba(30, 30, 40, 0.85)',
            borderLeft: `4px solid ${STAR_TYPE_COLORS[hoveredStar.star.type]}`,
            backdropFilter: 'blur(10px)',
            pointerEvents: 'none',
            zIndex: 100,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 4 }}>
            {hoveredStar.star.name}
          </div>
          <div
            style={{
              fontSize: 12,
              color: STAR_TYPE_COLORS[hoveredStar.star.type],
              marginBottom: 12,
            }}
          >
            {STAR_TYPE_NAMES[hoveredStar.star.type]}
          </div>
          <div style={{ fontSize: 12, color: '#ddd', lineHeight: 1.8 }}>
            <div>⛽ 燃料: +{hoveredStar.star.resources.fuel}</div>
            <div>⛏ 矿石: +{hoveredStar.star.resources.ore}</div>
            <div>⚡ 能量: +{hoveredStar.star.resources.energy}</div>
          </div>
          {hoveredStar.star.isSpecial && (
            <div
              style={{
                marginTop: 10,
                fontSize: 11,
                color: '#e94560',
                fontWeight: 'bold',
              }}
            >
              ⚠ 特殊天体
            </div>
          )}
        </div>
      )}
    </div>
  );
};
