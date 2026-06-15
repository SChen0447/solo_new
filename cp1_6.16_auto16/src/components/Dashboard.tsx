import React, { useEffect, useRef } from 'react';
import { useAppContext } from './App';
import { GrowthInstruction, STATE_NAMES, PlantState } from '../types';

interface DashboardProps {
  instruction: GrowthInstruction | null;
}

const Dashboard: React.FC<DashboardProps> = ({ instruction }) => {
  const { snapshot, reset } = useAppContext();
  const chartCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!chartCanvasRef.current || !snapshot) return;

    const canvas = chartCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    }

    const w = rect.width;
    const h = rect.height;
    const padding = 4;

    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.fillRect(0, 0, w, h);

    const history = snapshot.growthRateHistory;
    if (history.length < 2) return;

    const maxRate = Math.max(...history, 0.01);
    const minRate = Math.min(...history, 0);
    const range = maxRate - minRate || 1;

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.moveTo(padding, h / 2);
    ctx.lineTo(w - padding, h / 2);
    ctx.stroke();

    for (let i = 0; i < history.length - 1; i++) {
      const t1 = i / (history.length - 1);
      const t2 = (i + 1) / (history.length - 1);
      const x1 = padding + t1 * (w - padding * 2);
      const x2 = padding + t2 * (w - padding * 2);
      const y1 = h - padding - ((history[i] - minRate) / range) * (h - padding * 2);
      const y2 = h - padding - ((history[i + 1] - minRate) / range) * (h - padding * 2);

      const rateRatio = (history[i + 1] - minRate) / range;
      const r = Math.round(229 - rateRatio * (229 - 67));
      const g = Math.round(57 + rateRatio * (160 - 57));
      const b = Math.round(53 + rateRatio * (71 - 53));

      ctx.beginPath();
      ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    const lastRate = history[history.length - 1];
    const lastRatio = (lastRate - minRate) / range;
    const lastX = w - padding;
    const lastY = h - padding - lastRatio * (h - padding * 2);

    ctx.beginPath();
    ctx.fillStyle = 'rgba(67, 160, 71, 0.3)';
    ctx.arc(lastX, lastY, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = '#43a047';
    ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
    ctx.fill();
  }, [snapshot]);

  const params = snapshot?.params;
  const variety = snapshot?.variety;
  const stateColor = instruction?.stateColor || '#8d6e63';
  const currentState = instruction?.state || PlantState.SEED;
  const stateProgress = params?.stateProgress || 0;
  const height = instruction?.height || 0;
  const maxHeight = variety?.maxHeight || 300;
  const heightProgress = Math.min(height / maxHeight, 1);
  const overallProgress = Math.min(
    (getStateIndex(currentState) + stateProgress) / 5,
    1
  );

  const circumference = 2 * Math.PI * 42;
  const dashOffset = circumference * (1 - overallProgress);

  return (
    <div className="glass-panel dark dashboard">
      <div className="panel-title">
        <span className="title-icon">📊</span>
        <h3>数据统计</h3>
        <button className="reset-btn" onClick={reset} title="重新播种">
          🔄 重置
        </button>
      </div>

      <div className="dashboard-content">
        <div className="progress-ring-container">
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="6"
            />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke={stateColor}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 50 50)"
              style={{ transition: 'stroke-dashoffset 0.5s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.5s ease' }}
            />
          </svg>
          <div className="progress-text">
            <div className="progress-percent">{(overallProgress * 100).toFixed(0)}%</div>
            <div className="progress-label">生命周期</div>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-label">当前高度</div>
            <div className="stat-value">{height.toFixed(1)}<span className="stat-unit">px</span></div>
            <div className="stat-bar">
              <div
                className="stat-bar-fill"
                style={{
                  width: `${heightProgress * 100}%`,
                  background: stateColor,
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
          </div>

          <div className="stat-item">
            <div className="stat-label">叶片数量</div>
            <div className="stat-value">{params?.leaves.length || 0}<span className="stat-unit">片</span></div>
          </div>

          <div className="stat-item">
            <div className="stat-label">当前状态</div>
            <div className="stat-value">
              <span className="state-badge" style={{ background: stateColor + '33', color: stateColor }}>
                {STATE_NAMES[currentState]}
              </span>
            </div>
          </div>

          <div className="stat-item">
            <div className="stat-label">生长天数</div>
            <div className="stat-value">{(params?.growthDays || 0).toFixed(2)}<span className="stat-unit">天</span></div>
          </div>

          <div className="stat-item">
            <div className="stat-label">帧率</div>
            <div className="stat-value">
              {snapshot?.fps || 0}<span className="stat-unit">fps</span>
            </div>
          </div>

          <div className="stat-item">
            <div className="stat-label">生长速率</div>
            <div className="stat-value" style={{ color: getGrowthRateColor(params?.growthRate || 0) }}>
              {(params?.growthRate || 0).toFixed(3)}
            </div>
          </div>
        </div>

        <div className="chart-container">
          <div className="chart-label">
            <span>📈 生长速率趋势</span>
            <span className="chart-hint">近50帧</span>
          </div>
          <canvas ref={chartCanvasRef} className="chart-canvas" />
        </div>
      </div>
    </div>
  );
};

function getStateIndex(state: PlantState): number {
  const order = [
    PlantState.SEED,
    PlantState.SPROUT,
    PlantState.MATURE,
    PlantState.FLOWERING,
    PlantState.FRUITING,
    PlantState.WITHERED
  ];
  return order.indexOf(state);
}

function getGrowthRateColor(rate: number): string {
  if (rate < 0.3) return '#e53935';
  if (rate < 0.6) return '#fb8c00';
  return '#43a047';
}

export default Dashboard;
