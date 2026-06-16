import React, { useRef, useEffect, useCallback } from 'react';
import type { EcosystemState, Cell, Animal } from '../simulation/ecosystem';
import { TERRAIN_CONFIGS } from '../simulation/ecosystem';

interface EcoMapProps {
  state: EcosystemState;
  onCellClick: (x: number, y: number) => void;
  selectedTool: string | null;
  cellSize?: number;
}

const EcoMap: React.FC<EcoMapProps> = ({ state, onCellClick, selectedTool, cellSize = 80 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  const drawTerrain = useCallback((ctx: CanvasRenderingContext2D, cell: Cell, x: number, y: number) => {
    const config = TERRAIN_CONFIGS[cell.terrain];
    ctx.fillStyle = config.color;
    ctx.fillRect(x, y, cellSize, cellSize);

    ctx.strokeStyle = '#444444';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, cellSize, cellSize);

    if (cell.disasterType) {
      ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
      ctx.fillRect(x, y, cellSize, cellSize);
    }

    if (cell.disasterTimer > 0) {
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${cell.disasterTimer}`, x + cellSize / 2, y + 15);
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '10px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`🍖${cell.food}`, x + 4, y + cellSize - 8);
    ctx.fillText(`💧${cell.water}`, x + cellSize / 2 + 4, y + cellSize - 8);
  }, [cellSize]);

  const drawAnimal = useCallback((ctx: CanvasRenderingContext2D, animal: Animal, baseX: number, baseY: number, offset: number) => {
    const row = Math.floor(offset / 3);
    const col = offset % 3;
    const spacing = cellSize / 4;
    const startX = baseX + spacing + col * spacing;
    const startY = baseY + spacing + row * spacing;

    if (animal.species === '兔子') {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(startX, startY, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    } else if (animal.species === '狐狸') {
      ctx.fillStyle = '#FF9800';
      ctx.beginPath();
      ctx.arc(startX, startY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    } else {
      ctx.fillStyle = animal.diet === 'herbivore' ? '#81C784' : '#FF7043';
      ctx.beginPath();
      ctx.arc(startX, startY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    if (animal.hunger > 1) {
      ctx.fillStyle = '#FF0000';
      ctx.font = 'bold 8px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('!', startX, startY - 6);
    }
  }, [cellSize]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        const cell = state.grid[y][x];
        const px = x * cellSize;
        const py = y * cellSize;

        drawTerrain(ctx, cell, px, py);

        const maxDisplay = Math.min(cell.animals.length, 9);
        for (let i = 0; i < maxDisplay; i++) {
          drawAnimal(ctx, cell.animals[i], px, py, i);
        }

        if (cell.animals.length > 9) {
          ctx.fillStyle = '#FFD700';
          ctx.font = 'bold 10px Arial';
          ctx.textAlign = 'right';
          ctx.fillText(`+${cell.animals.length - 9}`, px + cellSize - 4, py + 12);
        }
      }
    }

    animationRef.current = requestAnimationFrame(render);
  }, [state, cellSize, drawTerrain, drawAnimal]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(render);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [render]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / cellSize);
    const y = Math.floor((e.clientY - rect.top) / cellSize);

    if (x >= 0 && x < state.width && y >= 0 && y < state.height) {
      onCellClick(x, y);
    }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <canvas
        ref={canvasRef}
        width={state.width * cellSize}
        height={state.height * cellSize}
        onClick={handleClick}
        style={{
          cursor: selectedTool ? 'crosshair' : 'default',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}
      />
    </div>
  );
};

export default EcoMap;
