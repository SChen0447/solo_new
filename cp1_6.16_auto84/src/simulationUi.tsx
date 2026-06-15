import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';
import { useSimulationStore } from './stateManager';
import { Cell, TerrainType } from './gameEngine';

const TERRAIN_COLORS: Record<TerrainType, string> = {
  grass: '#90EE90',
  forest: '#228B22',
  water: '#00BFFF',
  stone: '#808080',
};

const TERRAIN_NAMES: Record<TerrainType, string> = {
  grass: '草地',
  forest: '森林',
  water: '水源',
  stone: '石头',
};

const ConfigPanel: React.FC = () => {
  const {
    config,
    updateConfig,
    startSimulation,
    pauseSimulation,
    resumeSimulation,
    resetSimulation,
    isRunning,
    isPaused,
    activePreset,
    applyPreset,
  } = useSimulationStore();

  const presets = [
    { id: 'quick', name: '快速测试', color: '#4ade80' },
    { id: 'standard', name: '标准模式', color: '#60a5fa' },
    { id: 'hard', name: '困难模式', color: '#f87171' },
  ];

  return (
    <div className="config-panel">
      <h2 style={{ color: '#e8a838', marginBottom: '16px', fontSize: '18px' }}>参数配置</h2>

      <div className="preset-buttons" style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {presets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => applyPreset(preset.id)}
            className={`preset-btn ${activePreset === preset.id ? 'active' : ''}`}
            style={{
              flex: 1,
              padding: '8px 4px',
              border: `2px solid ${preset.color}`,
              borderRadius: '6px',
              background: activePreset === preset.id ? `${preset.color}20` : 'transparent',
              color: preset.color,
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {preset.name}
          </button>
        ))}
      </div>

      <div className="slider-group" style={{ marginBottom: '16px' }}>
        <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
          <span>地图大小</span>
          <span style={{ color: '#e8a838' }}>{config.mapSize} x {config.mapSize}</span>
        </label>
        <input
          type="range"
          min="10"
          max="50"
          value={config.mapSize}
          onChange={(e) => updateConfig({ mapSize: parseInt(e.target.value) })}
          disabled={isRunning}
          style={{ width: '100%', accentColor: '#e8a838' }}
        />
      </div>

      <div className="slider-group" style={{ marginBottom: '16px' }}>
        <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
          <span>资源密度</span>
          <span style={{ color: '#e8a838' }}>{(config.resourceDensity * 100).toFixed(0)}%</span>
        </label>
        <input
          type="range"
          min="0.1"
          max="0.5"
          step="0.05"
          value={config.resourceDensity}
          onChange={(e) => updateConfig({ resourceDensity: parseFloat(e.target.value) })}
          disabled={isRunning}
          style={{ width: '100%', accentColor: '#e8a838' }}
        />
      </div>

      <div className="slider-group" style={{ marginBottom: '16px' }}>
        <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
          <span>怪物生成概率</span>
          <span style={{ color: '#e8a838' }}>{(config.monsterSpawnRate * 100).toFixed(0)}%</span>
        </label>
        <input
          type="range"
          min="0.1"
          max="0.3"
          step="0.05"
          value={config.monsterSpawnRate}
          onChange={(e) => updateConfig({ monsterSpawnRate: parseFloat(e.target.value) })}
          disabled={isRunning}
          style={{ width: '100%', accentColor: '#e8a838' }}
        />
      </div>

      <div className="slider-group" style={{ marginBottom: '16px' }}>
        <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
          <span>玩家初始生命</span>
          <span style={{ color: '#e8a838' }}>{config.playerHealth}</span>
        </label>
        <input
          type="range"
          min="50"
          max="200"
          step="10"
          value={config.playerHealth}
          onChange={(e) => updateConfig({ playerHealth: parseInt(e.target.value) })}
          disabled={isRunning}
          style={{ width: '100%', accentColor: '#e8a838' }}
        />
      </div>

      <div className="slider-group" style={{ marginBottom: '24px' }}>
        <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
          <span>模拟轮数</span>
          <span style={{ color: '#e8a838' }}>{config.simulationRounds} 轮</span>
        </label>
        <input
          type="range"
          min="1"
          max="20"
          value={config.simulationRounds}
          onChange={(e) => updateConfig({ simulationRounds: parseInt(e.target.value) })}
          disabled={isRunning}
          style={{ width: '100%', accentColor: '#e8a838' }}
        />
      </div>

      <div className="control-buttons" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {!isRunning ? (
          <button
            onClick={startSimulation}
            style={{
              padding: '12px',
              background: 'linear-gradient(135deg, #e8a838, #d4942f)',
              border: 'none',
              borderRadius: '8px',
              color: '#1a1a2e',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'transform 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            开始模拟
          </button>
        ) : (
          <>
            {isPaused ? (
              <button
                onClick={resumeSimulation}
                style={{
                  padding: '12px',
                  background: 'linear-gradient(135deg, #4ade80, #22c55e)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#1a1a2e',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                继续
              </button>
            ) : (
              <button
                onClick={pauseSimulation}
                style={{
                  padding: '12px',
                  background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#1a1a2e',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                暂停
              </button>
            )}
          </>
        )}
        <button
          onClick={resetSimulation}
          style={{
            padding: '10px',
            background: 'transparent',
            border: '2px solid #64748b',
            borderRadius: '8px',
            color: '#94a3b8',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#e8a838';
            e.currentTarget.style.color = '#e8a838';
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#64748b';
            e.currentTarget.style.color = '#94a3b8';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          重置
        </button>
      </div>
    </div>
  );
};

const ResourceDisplay: React.FC = () => {
  const currentState = useSimulationStore((state) => state.currentState);

  if (!currentState) return null;

  const { wood, water, stone } = currentState.player.resources;
  const total = wood + water + stone;

  const woodAngle = total > 0 ? (wood / total) * 360 : 120;
  const waterAngle = total > 0 ? (water / total) * 360 : 120;
  const stoneAngle = total > 0 ? (stone / total) * 360 : 120;

  const describeArc = (startAngle: number, endAngle: number, radius: number) => {
    const start = polarToCartesian(50, 50, radius, endAngle);
    const end = polarToCartesian(50, 50, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return [
      'M', start.x, start.y,
      'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
      'L', 50, 50,
      'Z',
    ].join(' ');
  };

  const polarToCartesian = (cx: number, cy: number, r: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: cx + r * Math.cos(angleInRadians),
      y: cy + r * Math.sin(angleInRadians),
    };
  };

  return (
    <div className="resource-display" style={{ marginBottom: '20px' }}>
      <h3 style={{ color: '#e8a838', marginBottom: '12px', fontSize: '14px' }}>资源状态</h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ position: 'relative', width: '80px', height: '80px' }}>
          <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
            <path d={describeArc(0, woodAngle, 40)} fill="#8B4513" />
            <path d={describeArc(woodAngle, woodAngle + waterAngle, 40)} fill="#00BFFF" />
            <path
              d={describeArc(woodAngle + waterAngle, woodAngle + waterAngle + stoneAngle, 40)}
              fill="#808080"
            />
            <circle cx="50" cy="50" r="22" fill="#16213e" />
          </svg>
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: '12px',
              fontWeight: 'bold',
              color: '#e8a838',
            }}
          >
            {total}
          </div>
        </div>
        <div style={{ flex: 1, fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <div style={{ width: '10px', height: '10px', background: '#8B4513', borderRadius: '2px' }} />
            <span>木材: {wood}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <div style={{ width: '10px', height: '10px', background: '#00BFFF', borderRadius: '2px' }} />
            <span>水源: {water}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '10px', height: '10px', background: '#808080', borderRadius: '2px' }} />
            <span>石料: {stone}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const GridMapView: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const {
    currentState,
    viewScale,
    viewOffset,
    setViewScale,
    setViewOffset,
    hoveredCell,
    setHoveredCell,
  } = useSimulationStore();

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [targetScale, setTargetScale] = useState(1);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !currentState) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const map = currentState.map;
    const mapSize = map.length;
    const cellSize = Math.min(container.clientWidth, container.clientHeight) / mapSize;
    const scaledCellSize = cellSize * viewScale;

    const totalWidth = scaledCellSize * mapSize;
    const totalHeight = scaledCellSize * mapSize;

    const offsetX = (container.clientWidth - totalWidth) / 2 + viewOffset.x * viewScale;
    const offsetY = (container.clientHeight - totalHeight) / 2 + viewOffset.y * viewScale;

    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < mapSize; y++) {
      for (let x = 0; x < mapSize; x++) {
        const cell = map[y][x];
        const px = offsetX + x * scaledCellSize;
        const py = offsetY + y * scaledCellSize;

        let color = TERRAIN_COLORS[cell.terrain];

        if (!cell.explored) {
          color = '#2a2a4a';
        }

        if (currentState.isNight && !cell.illuminated && cell.explored) {
          color = adjustBrightness(color, -0.6);
        }

        ctx.fillStyle = color;
        ctx.fillRect(px, py, scaledCellSize - 1, scaledCellSize - 1);

        if (cell.flashTimer > 0) {
          ctx.fillStyle = `rgba(255, 255, 255, ${cell.flashTimer / 300 * 0.5})`;
          ctx.fillRect(px, py, scaledCellSize - 1, scaledCellSize - 1);
        }

        if (cell.building === 'wall') {
          ctx.fillStyle = '#374151';
          ctx.fillRect(px + 2, py + 2, scaledCellSize - 5, scaledCellSize - 5);
        }

        if (cell.building === 'torch') {
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(px + scaledCellSize / 2, py + scaledCellSize / 2, scaledCellSize / 4, 0, Math.PI * 2);
          ctx.fill();
          if (currentState.isNight) {
            ctx.fillStyle = 'rgba(251, 191, 36, 0.2)';
            ctx.beginPath();
            ctx.arc(px + scaledCellSize / 2, py + scaledCellSize / 2, scaledCellSize * 0.8, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    const player = currentState.player;
    const playerPx = offsetX + player.x * scaledCellSize + scaledCellSize / 2;
    const playerPy = offsetY + player.y * scaledCellSize + scaledCellSize / 2;

    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(playerPx, playerPy, scaledCellSize / 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#60a5fa';
    ctx.beginPath();
    ctx.arc(playerPx - 2, playerPy - 2, scaledCellSize / 6, 0, Math.PI * 2);
    ctx.fill();

    for (const monster of currentState.monsters) {
      const mx = offsetX + monster.x * scaledCellSize + scaledCellSize / 2;
      const my = offsetY + monster.y * scaledCellSize + scaledCellSize / 2;

      ctx.fillStyle = '#ef4444';
      ctx.font = `${scaledCellSize * 0.7}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('☠', mx, my);
    }

    for (const ft of currentState.floatingTexts) {
      const fx = offsetX + ft.x * scaledCellSize + scaledCellSize / 2;
      const fy = offsetY + ft.y * scaledCellSize + scaledCellSize / 2;
      const alpha = ft.life / 1000;

      ctx.fillStyle = ft.color;
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.globalAlpha = alpha;
      ctx.fillText(ft.text, fx, fy);
      ctx.globalAlpha = 1;
    }

    if (currentState.nightTransition > 0) {
      const alpha = currentState.nightTransition * 0.3;
      const gradient1 = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.3);
      gradient1.addColorStop(0, `rgba(20, 20, 60, ${alpha})`);
      gradient1.addColorStop(1, 'rgba(20, 20, 60, 0)');
      ctx.fillStyle = gradient1;
      ctx.fillRect(0, 0, canvas.width, canvas.height * 0.3);

      const gradient2 = ctx.createLinearGradient(0, canvas.height * 0.7, 0, canvas.height);
      gradient2.addColorStop(0, 'rgba(20, 20, 60, 0)');
      gradient2.addColorStop(1, `rgba(20, 20, 60, ${alpha})`);
      ctx.fillStyle = gradient2;
      ctx.fillRect(0, canvas.height * 0.7, canvas.width, canvas.height * 0.3);
    }

    if (hoveredCell) {
      const hx = offsetX + hoveredCell.x * scaledCellSize;
      const hy = offsetY + hoveredCell.y * scaledCellSize;
      ctx.strokeStyle = '#e8a838';
      ctx.lineWidth = 2;
      ctx.strokeRect(hx, hy, scaledCellSize - 1, scaledCellSize - 1);
    }
  }, [currentState, viewScale, viewOffset, hoveredCell]);

  useEffect(() => {
    if (targetScale === viewScale) return;

    let animationId: number;
    const startTime = performance.now();
    const startScale = viewScale;
    const duration = 200;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const newScale = startScale + (targetScale - startScale) * eased;

      setViewScale(newScale);

      if (progress < 1) {
        animationId = requestAnimationFrame(animate);
      }
    };

    animationId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationId);
  }, [targetScale]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newScale = Math.max(0.5, Math.min(2, targetScale + delta));
    setTargetScale(newScale);
  }, [targetScale]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - viewOffset.x, y: e.clientY - viewOffset.y });
  }, [viewOffset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container || !currentState) return;

    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const map = currentState.map;
    const mapSize = map.length;
    const cellSize = Math.min(rect.width, rect.height) / mapSize;
    const scaledCellSize = cellSize * viewScale;

    const offsetX = (rect.width - scaledCellSize * mapSize) / 2 + viewOffset.x * viewScale;
    const offsetY = (rect.height - scaledCellSize * mapSize) / 2 + viewOffset.y * viewScale;

    const cellX = Math.floor((mouseX - offsetX) / scaledCellSize);
    const cellY = Math.floor((mouseY - offsetY) / scaledCellSize);

    if (cellX >= 0 && cellY >= 0 && cellX < mapSize && cellY < mapSize) {
      setHoveredCell({ x: cellX, y: cellY });
    } else {
      setHoveredCell(null);
    }

    if (isDragging) {
      const dx = (e.clientX - dragStart.x) / viewScale;
      const dy = (e.clientY - dragStart.y) / viewScale;
      setViewOffset({ x: dx, y: dy });
    }
  }, [currentState, viewScale, viewOffset, isDragging, dragStart, setHoveredCell, setViewOffset]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
    setHoveredCell(null);
  }, [setHoveredCell]);

  return (
    <div
      ref={containerRef}
      className="grid-map-container"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
        }}
      />
      {hoveredCell && currentState && (
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            left: '10px',
            background: 'rgba(22, 33, 62, 0.9)',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            border: '1px solid #e8a83840',
          }}
        >
          <div>坐标: ({hoveredCell.x}, {hoveredCell.y})</div>
          <div>地形: {TERRAIN_NAMES[currentState.map[hoveredCell.y][hoveredCell.x].terrain]}</div>
        </div>
      )}
      {currentState && (
        <div
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'rgba(22, 33, 62, 0.9)',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            border: '1px solid #e8a83840',
          }}
        >
          <div>第 {currentState.day} 天</div>
          <div>回合: {currentState.turn}</div>
          <div style={{ color: currentState.isNight ? '#93c5fd' : '#fbbf24' }}>
            {currentState.isNight ? '夜晚' : '白天'}
          </div>
          <div>生命: {currentState.player.health}/{currentState.player.maxHealth}</div>
          <div>怪物: {currentState.monsters.length}</div>
          {currentState.totalSimulationRounds > 1 && (
            <div style={{ color: '#e8a838', marginTop: '4px' }}>
              第 {currentState.simulationRound}/{currentState.totalSimulationRounds} 轮
            </div>
          )}
        </div>
      )}
    </div>
  );
};

function adjustBrightness(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, Math.floor((num >> 16) * (1 + amount))));
  const g = Math.min(255, Math.max(0, Math.floor(((num >> 8) & 0x00ff) * (1 + amount))));
  const b = Math.min(255, Math.max(0, Math.floor((num & 0x0000ff) * (1 + amount))));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

const StatsPanel: React.FC<{ expanded: boolean; onToggle: () => void }> = ({ expanded, onToggle }) => {
  const { statistics, currentState } = useSimulationStore();

  const resourceData = useMemo(() => {
    if (!statistics?.allResults?.length) return [];

    const result = statistics.allResults[0];
    return result.dailyStats.map((day) => ({
      day: day.day,
      木材: day.woodCollected,
      水源: day.waterCollected,
      石料: day.stoneCollected,
    }));
  }, [statistics]);

  const combatData = useMemo(() => {
    if (!statistics?.allResults?.length) return [];

    const result = statistics.allResults[0];
    return result.dailyStats.map((day) => ({
      day: day.day,
      胜利: day.combatWins,
      失败: day.combats - day.combatWins,
    }));
  }, [statistics]);

  const radarData = useMemo(() => {
    if (!statistics) return [];

    const maxDays = 30;
    const maxResources = 500;
    const maxWinRate = 1;
    const maxBuildings = 20;

    const avgResources = (statistics.avgWoodCollected + statistics.avgWaterCollected + statistics.avgStoneCollected) / 3;

    return [
      { subject: '采集效率', value: Math.min(100, (avgResources / maxResources) * 100) },
      { subject: '建造数量', value: Math.min(100, (statistics.avgBuildingsBuilt / maxBuildings) * 100) },
      { subject: '战斗胜率', value: statistics.avgCombatWinRate * 100 },
      { subject: '存活天数', value: Math.min(100, (statistics.avgSurvivedDays / maxDays) * 100) },
      { subject: '综合评分', value: statistics.collectionEfficiency },
    ];
  }, [statistics]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            background: 'rgba(22, 33, 62, 0.95)',
            border: '1px solid #e8a838',
            borderRadius: '6px',
            padding: '8px',
            fontSize: '12px',
          }}
        >
          <p style={{ color: '#e8a838', marginBottom: '4px' }}>第 {label} 天</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className="stats-panel"
      style={{
        width: expanded ? '40%' : '60px',
        transition: 'width 0.3s ease',
        background: '#16213e',
        borderLeft: '1px solid #2d3748',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <button
        onClick={onToggle}
        style={{
          position: 'absolute',
          left: '-15px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '30px',
          height: '60px',
          background: '#e8a838',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          color: '#1a1a2e',
          fontSize: '16px',
          fontWeight: 'bold',
          zIndex: 10,
          transition: 'transform 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
        }}
      >
        {expanded ? '»' : '«'}
      </button>

      {expanded && (
        <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
          <h2 style={{ color: '#e8a838', marginBottom: '16px', fontSize: '18px' }}>统计分析</h2>

          {statistics ? (
            <>
              <div
                className="chart-card"
                style={{
                  background: '#1a1a2e',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '16px',
                  boxShadow: '0 0 15px rgba(232, 168, 56, 0.1)',
                  border: '1px solid rgba(232, 168, 56, 0.2)',
                }}
              >
                <h3 style={{ color: '#e0e0e0', marginBottom: '12px', fontSize: '14px' }}>资源消耗曲线</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={resourceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                    <XAxis dataKey="day" stroke="#94a3b8" fontSize={10} />
                    <YAxis stroke="#94a3b8" fontSize={10} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Line type="monotone" dataKey="木材" stroke="#8B4513" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="水源" stroke="#00BFFF" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="石料" stroke="#808080" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div
                className="chart-card"
                style={{
                  background: '#1a1a2e',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '16px',
                  boxShadow: '0 0 15px rgba(232, 168, 56, 0.1)',
                  border: '1px solid rgba(232, 168, 56, 0.2)',
                }}
              >
                <h3 style={{ color: '#e0e0e0', marginBottom: '12px', fontSize: '14px' }}>战斗胜负统计</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={combatData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                    <XAxis dataKey="day" stroke="#94a3b8" fontSize={10} />
                    <YAxis stroke="#94a3b8" fontSize={10} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Bar dataKey="胜利" fill="#4ade80" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="失败" fill="#f87171" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div
                className="chart-card"
                style={{
                  background: '#1a1a2e',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '16px',
                  boxShadow: '0 0 15px rgba(232, 168, 56, 0.1)',
                  border: '1px solid rgba(232, 168, 56, 0.2)',
                }}
              >
                <h3 style={{ color: '#e0e0e0', marginBottom: '12px', fontSize: '14px' }}>综合能力雷达</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#2d3748" />
                    <PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={10} />
                    <PolarRadiusAxis stroke="#475569" fontSize={8} />
                    <Radar name="能力值" dataKey="value" stroke="#e8a838" fill="#e8a838" fillOpacity={0.3} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div
                className="summary-stats"
                style={{
                  background: '#1a1a2e',
                  borderRadius: '8px',
                  padding: '12px',
                  border: '1px solid rgba(232, 168, 56, 0.2)',
                }}
              >
                <h3 style={{ color: '#e0e0e0', marginBottom: '12px', fontSize: '14px' }}>模拟结果汇总</h3>
                <div style={{ fontSize: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <span style={{ color: '#94a3b8' }}>平均存活天数: </span>
                    <span style={{ color: '#e8a838', fontWeight: 'bold' }}>{statistics.avgSurvivedDays.toFixed(1)}</span>
                    <span style={{ color: '#64748b', fontSize: '10px' }}> ±{statistics.stdSurvivedDays.toFixed(1)}</span>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8' }}>平均胜率: </span>
                    <span style={{ color: '#4ade80', fontWeight: 'bold' }}>{(statistics.avgCombatWinRate * 100).toFixed(1)}%</span>
                    <span style={{ color: '#64748b', fontSize: '10px' }}> ±{(statistics.stdCombatWinRate * 100).toFixed(1)}%</span>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8' }}>平均木材: </span>
                    <span style={{ color: '#8B4513', fontWeight: 'bold' }}>{statistics.avgWoodCollected.toFixed(0)}</span>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8' }}>平均水源: </span>
                    <span style={{ color: '#00BFFF', fontWeight: 'bold' }}>{statistics.avgWaterCollected.toFixed(0)}</span>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8' }}>平均石料: </span>
                    <span style={{ color: '#808080', fontWeight: 'bold' }}>{statistics.avgStoneCollected.toFixed(0)}</span>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8' }}>平均建造: </span>
                    <span style={{ color: '#a78bfa', fontWeight: 'bold' }}>{statistics.avgBuildingsBuilt.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div style={{ color: '#64748b', textAlign: 'center', padding: '40px 20px' }}>
              <p style={{ marginBottom: '8px' }}>暂无统计数据</p>
              <p style={{ fontSize: '12px' }}>点击"开始模拟"查看结果</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const SimulationUI: React.FC = () => {
  const { panelExpanded, togglePanel, initEngine } = useSimulationStore();

  useEffect(() => {
    initEngine();
  }, [initEngine]);

  return (
    <div
      className="simulation-container"
      style={{
        display: 'flex',
        width: '100%',
        height: '100vh',
        background: '#1a1a2e',
        color: '#e0e0e0',
      }}
    >
      <div
        className="left-panel"
        style={{
          width: '25%',
          minWidth: '280px',
          background: '#16213e',
          borderRight: '1px solid #2d3748',
          padding: '20px',
          overflowY: 'auto',
        }}
      >
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ color: '#e8a838', fontSize: '20px', fontWeight: 'bold' }}>
            🏰 生存沙盒模拟器
          </h1>
          <p style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>
            自动模拟与平衡分析
          </p>
        </div>
        <ConfigPanel />
        <ResourceDisplay />
      </div>

      <div
        className="center-panel"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          minWidth: 0,
        }}
      >
        <GridMapView />
      </div>

      <StatsPanel expanded={panelExpanded} onToggle={togglePanel} />
    </div>
  );
};

export default SimulationUI;
