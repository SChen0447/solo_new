import React, { useRef, useEffect, useCallback } from 'react';
import { PhysicsEngine, type Particle, type Bubble } from './physicsEngine';
import { usePotionStore } from './store';

const CAULDRON_W = 400;
const CAULDRON_H = 400;

const PotionMixer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<PhysicsEngine | null>(null);
  const isStirringRef = useRef(false);
  const dragOverRef = useRef(false);
  const dragPosRef = useRef({ x: 0, y: 0 });

  const stirAccum = usePotionStore(s => s.stirAccum);
  const temperature = usePotionStore(s => s.temperature);
  const addedIngredients = usePotionStore(s => s.addedIngredients);
  const shakeActive = usePotionStore(s => s.shakeActive);
  const setEngine = usePotionStore(s => s.setEngine);
  const updateStirAccum = usePotionStore(s => s.updateStirAccum);
  const addIngredient = usePotionStore(s => s.addIngredient);
  const clearCauldron = usePotionStore(s => s.clearCauldron);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const engine = new PhysicsEngine(CAULDRON_W, CAULDRON_H);
    engineRef.current = engine;
    setEngine(engine);

    engine.setOnUpdate((particles: Particle[], bubbles: Bubble[]) => {
      if (!ctx) return;
      ctx.clearRect(0, 0, CAULDRON_W, CAULDRON_H);

      const grad = ctx.createLinearGradient(0, 0, 0, CAULDRON_H);
      grad.addColorStop(0, '#0f3460');
      grad.addColorStop(1, '#1a1a2e');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CAULDRON_W, CAULDRON_H);

      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      for (const b of bubbles) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        ctx.globalAlpha = b.alpha;
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      if (isStirringRef.current) {
        ctx.save();
        ctx.translate(dragPosRef.current.x, dragPosRef.current.y);
        ctx.rotate(-Math.PI / 4);
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(-3, -35, 6, 70);
        ctx.fillStyle = '#A0522D';
        ctx.fillRect(-5, -40, 10, 12);
        ctx.restore();
      }

      const stir = engine.getStirAccum();
      if (stir !== usePotionStore.getState().stirAccum) {
        updateStirAccum(stir);
      }
    });

    engine.start();

    return () => {
      engine.stop();
    };
  }, [setEngine, updateStirAccum]);

  const getCanvasPos = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = CAULDRON_W / rect.width;
    const scaleY = CAULDRON_H / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPos(e);
    isStirringRef.current = true;
    dragPosRef.current = pos;
    engineRef.current?.startStir(pos.x, pos.y);
  }, [getCanvasPos]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isStirringRef.current) return;
    const pos = getCanvasPos(e);
    dragPosRef.current = pos;
    engineRef.current?.updateStir(pos.x, pos.y);
  }, [getCanvasPos]);

  const handleMouseUp = useCallback(() => {
    isStirringRef.current = false;
    engineRef.current?.stopStir();
  }, []);

  const handleMouseLeave = useCallback(() => {
    isStirringRef.current = false;
    engineRef.current?.stopStir();
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    dragOverRef.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CAULDRON_W / rect.width;
    const scaleY = CAULDRON_H / rect.height;
    dragPosRef.current = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    dragOverRef.current = false;
    const data = e.dataTransfer.getData('ingredient');
    if (!data) return;
    try {
      const ingredient = JSON.parse(data);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = CAULDRON_W / rect.width;
      const scaleY = CAULDRON_H / rect.height;
      const cx = (e.clientX - rect.left) * scaleX;
      const cy = (e.clientY - rect.top) * scaleY;
      addIngredient(ingredient, cx, cy);
    } catch { /* ignore */ }
  }, [addIngredient]);

  return (
    <div className="relative flex items-start gap-4">
      <div className="flex flex-col gap-3 pt-4" style={{ width: '28px' }}>
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-amber-300 font-semibold" style={{ fontSize: '10px' }}>搅拌</span>
          <div
            className="relative rounded-full overflow-hidden"
            style={{
              width: '20px',
              height: '200px',
              background: '#1a1a2e',
              border: '1px solid #333',
            }}
          >
            <div
              className="absolute bottom-0 left-0 right-0 transition-all duration-200"
              style={{
                height: `${stirAccum}%`,
                background: 'linear-gradient(to top, #5c3317, #daa520)',
                borderRadius: '0 0 10px 10px',
              }}
            />
          </div>
          <span className="text-xs text-amber-200" style={{ fontSize: '10px' }}>{Math.round(stirAccum)}%</span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-blue-300 font-semibold" style={{ fontSize: '10px' }}>温度</span>
          <div
            className="relative rounded-full overflow-hidden"
            style={{
              width: '20px',
              height: '200px',
              background: '#1a1a2e',
              border: '1px solid #333',
            }}
          >
            <div
              className="absolute bottom-0 left-0 right-0 transition-all duration-300"
              style={{
                height: `${temperature}%`,
                background: 'linear-gradient(to top, #3498db, #e74c3c)',
                borderRadius: '0 0 10px 10px',
              }}
            />
          </div>
          <span className="text-xs text-blue-200" style={{ fontSize: '10px' }}>{Math.round(temperature)}°</span>
        </div>
      </div>

      <div
        className={`relative transition-transform ${shakeActive ? 'animate-shake' : ''}`}
        style={{
          width: CAULDRON_W,
          height: CAULDRON_H,
        }}
      >
        <div
          className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{
            boxShadow: '0 0 80px 20px rgba(100, 80, 200, 0.15), inset 0 0 60px rgba(15, 52, 96, 0.5)',
            border: '3px solid rgba(100, 80, 200, 0.2)',
            borderRadius: '24px',
          }}
        />

        <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex gap-44">
          <div style={{
            width: '40px',
            height: '20px',
            background: 'linear-gradient(135deg, #555, #333)',
            borderRadius: '8px 8px 0 0',
            border: '2px solid #666',
          }} />
          <div style={{
            width: '40px',
            height: '20px',
            background: 'linear-gradient(135deg, #555, #333)',
            borderRadius: '8px 8px 0 0',
            border: '2px solid #666',
          }} />
        </div>

        <canvas
          ref={canvasRef}
          width={CAULDRON_W}
          height={CAULDRON_H}
          className="rounded-3xl cursor-crosshair"
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        />
      </div>

      <div className="flex flex-col gap-2 pt-4" style={{ minWidth: '120px' }}>
        <div className="text-xs text-gray-400 mb-1 font-semibold">已添加材料</div>
        {addedIngredients.length === 0 && (
          <div className="text-xs text-gray-600 italic">拖拽材料到锅炉中</div>
        )}
        {addedIngredients.map(ing => (
          <div
            key={ing.id}
            className="flex items-center gap-2 px-2 py-1 rounded-lg"
            style={{
              background: 'rgba(255,255,255,0.05)',
              borderLeft: `3px solid ${ing.color}`,
            }}
          >
            <span style={{ fontSize: '14px' }}>{ing.icon}</span>
            <span className="text-xs text-gray-300">{ing.name}</span>
          </div>
        ))}
        {addedIngredients.length >= 2 && (
          <button
            onClick={() => usePotionStore.getState().checkRecipe()}
            className="mt-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            检测配方
          </button>
        )}
        {addedIngredients.length > 0 && (
          <button
            onClick={clearCauldron}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 hover:scale-105"
            style={{
              background: 'rgba(255,107,107,0.2)',
              color: '#ff6b6b',
              border: '1px solid rgba(255,107,107,0.3)',
              cursor: 'pointer',
            }}
          >
            清空锅炉
          </button>
        )}
      </div>
    </div>
  );
};

export default PotionMixer;
