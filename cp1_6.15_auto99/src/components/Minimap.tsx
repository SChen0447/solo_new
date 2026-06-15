import { useRef, useEffect, useState } from 'react';
import { useGameStore } from '../game/store';
import { MINIMAP_CONFIG, MAP_WIDTH, MAP_HEIGHT, TILE_SIZE } from '../game/constants';

export default function Minimap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const frameRef = useRef(0);

  const { grid, player, monsters, loots, exploredTiles } = useGameStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    frameRef.current++;
    if (frameRef.current % 5 !== 0) return;

    const size = MINIMAP_CONFIG.size;
    canvas.width = size;
    canvas.height = size;

    const scale = size / Math.max(MAP_WIDTH, MAP_HEIGHT);

    ctx.fillStyle = '#212121';
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = '#616161';
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        if (exploredTiles.has(`${x},${y}`) && grid[y]?.[x]?.type === 1) {
          ctx.fillRect(x * scale, y * scale, Math.max(1, scale), Math.max(1, scale));
        }
      }
    }

    ctx.fillStyle = '#ffd54f';
    for (const loot of loots) {
      if (!loot.collected && exploredTiles.has(`${Math.floor(loot.x)},${Math.floor(loot.y)}`)) {
        ctx.beginPath();
        ctx.arc(loot.x * scale, loot.y * scale, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.fillStyle = '#e53935';
    for (const monster of monsters) {
      if (
        monster.state !== 'dead' &&
        exploredTiles.has(`${Math.floor(monster.x)},${Math.floor(monster.y)}`)
      ) {
        ctx.beginPath();
        ctx.arc(monster.x * scale, monster.y * scale, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(player.x * scale, player.y * scale, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  const scale = isHovered ? MINIMAP_CONFIG.hoverScale : 1;
  const opacity = isHovered ? MINIMAP_CONFIG.hoverAlpha : MINIMAP_CONFIG.alpha;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'fixed',
        right: '16px',
        bottom: '16px',
        width: MINIMAP_CONFIG.size,
        height: MINIMAP_CONFIG.size,
        opacity,
        transform: `scale(${scale})`,
        transformOrigin: 'bottom right',
        transition: `opacity ${MINIMAP_CONFIG.transition}s ease, transform ${MINIMAP_CONFIG.transition}s ease`,
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
        pointerEvents: 'auto',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
}
