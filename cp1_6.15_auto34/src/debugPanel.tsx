import React, { useRef, useEffect } from 'react';
import { useCharacterStore } from './character';
import { getRadarValues } from './weatherEngine';

interface DebugPanelProps {
  fps: number;
}

const PANEL_WIDTH = 320;

const RADAR_LABELS = ['移速', '攻击', '防御', '冷却', '特效密度'];

function getStatusColor(mod: number): string {
  if (mod > 0.01) return '#f1c40f';
  if (mod < -0.01) return '#e74c3c';
  return '#2ecc71';
}

function drawRadarChart(
  ctx: CanvasRenderingContext2D,
  values: number[],
  color: string,
  size: number
): void {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 30;
  const n = values.length;

  ctx.clearRect(0, 0, size, size);

  for (let ring = 1; ring <= 3; ring++) {
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      const x = cx + Math.cos(angle) * r * (ring / 3);
      const y = cy + Math.sin(angle) * r * (ring / 3);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lx = cx + Math.cos(angle) * (r + 18);
    const ly = cy + Math.sin(angle) * (r + 18);
    ctx.fillText(RADAR_LABELS[i], lx, ly);
  }

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.fillStyle = color.replace(')', ',0.15)').replace('rgb', 'rgba');
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const idx = i % n;
    const angle = (Math.PI * 2 * idx) / n - Math.PI / 2;
    const v = Math.min(Math.max(values[idx], 0), 2) / 2;
    const x = cx + Math.cos(angle) * r * v;
    const y = cy + Math.sin(angle) * r * v;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawSpectrum(
  ctx: CanvasRenderingContext2D,
  fpsHistory: number[],
  width: number,
  height: number
): void {
  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, height / 2);
  ctx.lineTo(width, height / 2);
  ctx.stroke();

  if (fpsHistory.length < 2) return;

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#2ecc71');
  gradient.addColorStop(0.5, '#f1c40f');
  gradient.addColorStop(1, '#e74c3c');

  ctx.strokeStyle = gradient;
  ctx.lineWidth = 2;
  ctx.beginPath();
  const step = width / (fpsHistory.length - 1);
  for (let i = 0; i < fpsHistory.length; i++) {
    const x = i * step;
    const y = height - (fpsHistory[i] / 60) * height;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

const DebugPanel: React.FC<DebugPanelProps> = ({ fps }) => {
  const radarCanvasRef = useRef<HTMLCanvasElement>(null);
  const spectrumCanvasRef = useRef<HTMLCanvasElement>(null);
  const fpsHistoryRef = useRef<number[]>([]);
  const store = useCharacterStore();

  const wp = store.weatherParams;
  const radarValues = getRadarValues(wp);

  useEffect(() => {
    fpsHistoryRef.current.push(fps);
    if (fpsHistoryRef.current.length > 120) {
      fpsHistoryRef.current.shift();
    }
  }, [fps]);

  useEffect(() => {
    const canvas = radarCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    drawRadarChart(ctx, radarValues, wp.primaryColor, 200);
  }, [radarValues, wp.primaryColor]);

  useEffect(() => {
    const canvas = spectrumCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    drawSpectrum(ctx, fpsHistoryRef.current, 280, 60);
  }, [fps]);

  const fpsColor = fps >= 30 ? '#2ecc71' : '#e74c3c';

  const stats = [
    { label: 'HP', value: store.currentHP, mod: 0, base: store.baseHP },
    { label: '攻击力', value: store.currentAttack, mod: wp.attackMod, base: store.baseAttack },
    { label: '防御力', value: store.currentDefense, mod: wp.defenseMod, base: store.baseDefense },
    { label: '移速', value: store.currentSpeed, mod: wp.speedMod, base: store.baseSpeed },
    { label: '技能冷却%', value: store.currentCooldown * 100, mod: wp.cooldownMod, base: store.baseCooldown * 100 },
  ];

  return (
    <div
      style={{
        width: PANEL_WIDTH,
        minHeight: 600,
        background: 'rgba(26, 26, 46, 0.95)',
        borderLeft: `2px solid ${wp.primaryColor}`,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        fontFamily: 'monospace',
        color: '#ccc',
        overflowY: 'auto',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#888', fontSize: 12 }}>帧率</span>
        <span style={{ color: fpsColor, fontSize: 24, fontWeight: 'bold' }}>{fps} FPS</span>
      </div>

      <div>
        <span style={{ color: '#888', fontSize: 12 }}>频谱图</span>
        <canvas
          ref={spectrumCanvasRef}
          width={280}
          height={60}
          style={{ width: '100%', height: 60, marginTop: 4, borderRadius: 4 }}
        />
      </div>

      <div style={{ textAlign: 'center' }}>
        <span style={{ color: '#888', fontSize: 12 }}>天气参数雷达图</span>
        <canvas
          ref={radarCanvasRef}
          width={200}
          height={200}
          style={{ width: 200, height: 200, marginTop: 4 }}
        />
      </div>

      <div>
        <span style={{ color: '#888', fontSize: 12, marginBottom: 8, display: 'block' }}>角色状态</span>
        {stats.map((s) => (
          <div
            key={s.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '4px 0',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: getStatusColor(s.mod),
                }}
              />
              <span style={{ fontSize: 13 }}>{s.label}</span>
            </div>
            <span style={{ fontSize: 13, color: wp.primaryColor }}>{Math.round(s.value)}</span>
          </div>
        ))}
      </div>

      <div style={{ color: '#666', fontSize: 11 }}>
        粒子数: {store.totalParticles}
      </div>

      <button
        onClick={() => store.clearSkillEffects()}
        style={{
          padding: '10px 0',
          background: 'rgba(255,255,255,0.08)',
          border: `1px solid ${wp.primaryColor}`,
          borderRadius: 8,
          color: wp.primaryColor,
          cursor: 'pointer',
          fontSize: 13,
          transition: 'background 0.2s',
          fontFamily: 'monospace',
        }}
        onMouseEnter={(e) => {
          (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.18)';
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)';
        }}
      >
        清除粒子
      </button>
    </div>
  );
};

export default DebugPanel;
