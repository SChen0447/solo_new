import { useEffect, useRef, useState } from 'react';
import { useGameStore, CANVAS_WIDTH, CANVAS_HEIGHT } from './GameLoop';
import { Renderer } from './renderer';
import { formatTime, phaseName } from './entities';

function ControlPanel() {
  const timeSpeed = useGameStore((s) => s.timeSpeed);
  const setTimeSpeed = useGameStore((s) => s.setTimeSpeed);
  const worldTime = useGameStore((s) => s.worldTime);
  const phase = useGameStore((s) => s.phase);

  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        right: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: 'rgba(0,0,0,0.45)',
        padding: '10px 16px',
        borderRadius: 8,
        backdropFilter: 'blur(4px)',
      }}
    >
      <div style={{ color: '#fff', fontSize: 12, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
        时间流速: {timeSpeed.toFixed(1)}x
      </div>
      <input
        type="range"
        min={0.1}
        max={3}
        step={0.1}
        value={timeSpeed}
        onChange={(e) => setTimeSpeed(parseFloat(e.target.value))}
        style={{
          width: 140,
          cursor: 'pointer',
          accentColor: '#ffd700',
        }}
      />
      <div
        style={{
          color: '#ffd700',
          fontSize: 12,
          fontFamily: 'monospace',
          whiteSpace: 'nowrap',
          borderLeft: '1px solid rgba(255,255,255,0.3)',
          paddingLeft: 12,
        }}
      >
        {phaseName(phase)} {formatTime(worldTime)}
      </div>
    </div>
  );
}

function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const [, forceUpdate] = useState(0);
  const start = useGameStore((s) => s.start);
  const stop = useGameStore((s) => s.stop);
  const showNPCInfo = useGameStore((s) => s.showNPCInfo);
  const showShopMessage = useGameStore((s) => s.showShopMessage);
  const npcs = useGameStore((s) => s.npcs);
  const phase = useGameStore((s) => s.phase);

  useEffect(() => {
    if (!canvasRef.current) return;
    canvasRef.current.width = CANVAS_WIDTH;
    canvasRef.current.height = CANVAS_HEIGHT;
    const renderer = new Renderer(canvasRef.current);
    rendererRef.current = renderer;

    let rafId: number;
    const renderLoop = () => {
      const state = useGameStore.getState();
      renderer.render(state);
      rafId = requestAnimationFrame(renderLoop);
    };
    rafId = requestAnimationFrame(renderLoop);

    start();

    return () => {
      cancelAnimationFrame(rafId);
      stop();
    };
  }, [start, stop]);

  useEffect(() => {
    forceUpdate((n) => n + 1);
  }, [phase]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !rendererRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    const renderer = rendererRef.current;

    const hitNPC = renderer.hitTestNPC(mx, my, npcs);
    if (hitNPC) {
      showNPCInfo(hitNPC, { x: mx, y: my });
      return;
    }

    if (renderer.hitTestShop(mx, my)) {
      let message = '';
      switch (phase) {
        case 'day':
          message = '欢迎光临!';
          break;
        case 'dusk':
          message = '要打烊了!';
          break;
        case 'night':
          message = '已关门!';
          break;
      }
      showShopMessage({ x: mx, y: my }, message);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      onClick={handleCanvasClick}
      style={{
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        display: 'block',
        borderRadius: 12,
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
        cursor: 'pointer',
        imageRendering: 'pixelated',
      }}
    />
  );
}

function LegendPanel() {
  const npcsInfo = [
    { name: '商人', color: '#e53935', desc: '白天在商店营业' },
    { name: '守卫', color: '#1e88e5', desc: '沿路径巡逻警戒' },
    { name: '村民', color: '#8e24aa', desc: '镇中心自由活动' },
  ];

  return (
    <div
      style={{
        marginTop: 16,
        background: 'rgba(0,0,0,0.5)',
        padding: '14px 20px',
        borderRadius: 10,
        color: '#fff',
        fontFamily: 'monospace',
        fontSize: 12,
        maxWidth: CANVAS_WIDTH,
      }}
    >
      <div style={{ marginBottom: 10, color: '#ffd700', fontWeight: 'bold', fontSize: 13 }}>
        图例说明
      </div>
      <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
        {npcsInfo.map((info) => (
          <div key={info.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 14,
                height: 28,
                background: info.color,
                borderRadius: 2,
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            />
            <div>
              <div style={{ fontWeight: 'bold' }}>{info.name}</div>
              <div style={{ color: '#aaa', fontSize: 11 }}>{info.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12, color: '#aaa', fontSize: 11, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 10 }}>
        提示: 点击NPC查看信息 · 点击商店查看营业状态 · 使用右上角滑块调节昼夜速度
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: CANVAS_WIDTH,
        }}
      >
        <GameCanvas />
        <ControlPanel />
      </div>
      <LegendPanel />
    </div>
  );
}
