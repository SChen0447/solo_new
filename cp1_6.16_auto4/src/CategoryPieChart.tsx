import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Category, Expense } from './api';

interface CategoryPieChartProps {
  categories: Category[];
  expenses: Expense[];
  animationKey?: number;
}

interface SliceData {
  category: Category;
  total: number;
  startAngle: number;
  endAngle: number;
  percentage: number;
}

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

const CategoryPieChart: React.FC<CategoryPieChartProps> = ({ categories, expenses, animationKey = 0 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{ visible: boolean; x: number; y: number; category: Category; amount: number } | null>(null);
  const animationRef = useRef<number>(0);
  const animationProgressRef = useRef<number>(0);
  const hoverProgressRef = useRef<number[]>([]);
  const lastTimeRef = useRef<number>(0);

  const colorMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach(cat => map.set(cat.id, cat.color));
    return map;
  }, [categories]);

  const sliceData = useMemo((): SliceData[] => {
    const categoryTotals = new Map<string, number>();
    
    expenses.forEach(expense => {
      const current = categoryTotals.get(expense.categoryId) || 0;
      categoryTotals.set(expense.categoryId, current + expense.amount);
    });

    const grandTotal = Array.from(categoryTotals.values()).reduce((sum, val) => sum + val, 0);
    
    let startAngle = -Math.PI / 2;
    const slices: SliceData[] = [];
    
    categories.forEach(category => {
      const total = categoryTotals.get(category.id) || 0;
      if (total > 0) {
        const percentage = total / grandTotal;
        const endAngle = startAngle + percentage * Math.PI * 2;
        slices.push({
          category,
          total,
          startAngle,
          endAngle,
          percentage,
        });
        startAngle = endAngle;
      }
    });

    return slices;
  }, [categories, expenses]);

  const getCanvasCoordinates = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const getSliceAtPosition = useCallback((x: number, y: number): number | null => {
    const canvas = canvasRef.current;
    if (!canvas || sliceData.length === 0) return null;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 30;

    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > radius || distance < 0) return null;

    let angle = Math.atan2(dy, dx);
    if (angle < -Math.PI / 2) {
      angle += Math.PI * 2;
    }

    for (let i = 0; i < sliceData.length; i++) {
      let startAngle = sliceData[i].startAngle;
      let endAngle = sliceData[i].endAngle;
      
      if (startAngle < -Math.PI / 2) {
        startAngle += Math.PI * 2;
        endAngle += Math.PI * 2;
      }
      
      if (angle >= startAngle && angle < endAngle) {
        return i;
      }
    }

    return null;
  }, [sliceData]);

  const draw = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const deltaTime = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;

    if (animationProgressRef.current < 1) {
      animationProgressRef.current = Math.min(1, animationProgressRef.current + deltaTime / 500);
    }

    for (let i = 0; i < hoverProgressRef.current.length; i++) {
      const target = hoveredIndex === i ? 1 : 0;
      const current = hoverProgressRef.current[i];
      const diff = target - current;
      hoverProgressRef.current[i] = current + diff * deltaTime / 150;
    }

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 30;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const progress = easeOutCubic(animationProgressRef.current);
    const rotationOffset = (1 - progress) * Math.PI;

    sliceData.forEach((slice, index) => {
      const hoverProgress = hoverProgressRef.current[index] || 0;
      const popOutDistance = hoverProgress * 15;

      const midAngle = (slice.startAngle + slice.endAngle) / 2 + rotationOffset;
      const offsetX = Math.cos(midAngle) * popOutDistance;
      const offsetY = Math.sin(midAngle) * popOutDistance;

      const sliceCenterX = centerX + offsetX;
      const sliceCenterY = centerY + offsetY;

      const gradient = ctx.createRadialGradient(
        sliceCenterX, sliceCenterY, radius * 0.3,
        sliceCenterX, sliceCenterY, radius
      );
      gradient.addColorStop(0, slice.category.color);
      gradient.addColorStop(1, adjustBrightness(slice.category.color, -20));

      ctx.beginPath();
      ctx.moveTo(sliceCenterX, sliceCenterY);
      ctx.arc(
        sliceCenterX, sliceCenterY, radius,
        slice.startAngle + rotationOffset,
        slice.endAngle + rotationOffset
      );
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    const isAnimating = animationProgressRef.current < 1 || 
      hoverProgressRef.current.some(p => Math.abs(p - Math.round(p)) > 0.01);
    
    if (isAnimating) {
      animationRef.current = requestAnimationFrame(draw);
    }
  }, [sliceData, hoveredIndex]);

  const startAnimation = useCallback(() => {
    animationProgressRef.current = 0;
    hoverProgressRef.current = sliceData.map(() => 0);
    lastTimeRef.current = performance.now();
    animationRef.current = requestAnimationFrame(draw);
  }, [draw, sliceData.length]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoordinates(e);
    const index = getSliceAtPosition(x, y);
    
    if (index !== null) {
      setHoveredIndex(index);
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        setTooltip({
          visible: true,
          x: e.clientX - rect.left + 15,
          y: e.clientY - rect.top - 10,
          category: sliceData[index].category,
          amount: sliceData[index].total,
        });
      }
    } else {
      setHoveredIndex(null);
      setTooltip(null);
    }

    animationRef.current = requestAnimationFrame(draw);
  }, [getCanvasCoordinates, getSliceAtPosition, sliceData, draw]);

  const handleMouseLeave = useCallback(() => {
    setHoveredIndex(null);
    setTooltip(null);
    animationRef.current = requestAnimationFrame(draw);
  }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeCanvas = () => {
      const size = container.clientWidth;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
      startAnimation();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationRef.current);
    };
  }, [startAnimation]);

  useEffect(() => {
    hoverProgressRef.current = sliceData.map(() => 0);
    startAnimation();
    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [sliceData, animationKey, startAnimation]);

  if (sliceData.length === 0) {
    return (
      <div className="pie-chart-container" ref={containerRef}>
        <div className="no-data">暂无数据</div>
      </div>
    );
  }

  return (
    <div className="pie-chart-container" ref={containerRef}>
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
      {tooltip && (
        <div 
          className="pie-tooltip"
          style={{
            left: tooltip.x,
            top: tooltip.y,
          }}
        >
          <div className="tooltip-color" style={{ backgroundColor: tooltip.category.color }} />
          <div className="tooltip-content">
            <div className="tooltip-name">{tooltip.category.name}</div>
            <div className="tooltip-amount">¥{tooltip.amount.toFixed(2)}</div>
          </div>
        </div>
      )}
      <style>{`
        .pie-chart-container {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 350px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pie-chart-container canvas {
          cursor: pointer;
        }

        .pie-tooltip {
          position: absolute;
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(44, 62, 80, 0.9);
          color: white;
          padding: 8px 12px;
          border-radius: 8px;
          pointer-events: none;
          z-index: 10;
          animation: fadeIn 0.2s ease;
          font-size: 14px;
        }

        .tooltip-color {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .tooltip-name {
          font-weight: 600;
          margin-right: 8px;
        }

        .tooltip-amount {
          font-weight: 700;
          color: #50E3C2;
        }

        .no-data {
          color: #999;
          font-size: 16px;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

function adjustBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = clamp((num >> 16) + amt);
  const G = clamp((num >> 8 & 0x00FF) + amt);
  const B = clamp((num & 0x0000FF) + amt);
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(255, value));
}

export default React.memo(CategoryPieChart);
