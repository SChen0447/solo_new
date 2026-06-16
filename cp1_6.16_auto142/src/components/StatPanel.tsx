import React, { useRef, useEffect, useCallback } from 'react';
import type { StatsSnapshot } from '../simulation/ecosystem';

interface StatPanelProps {
  currentStats: StatsSnapshot;
  history: StatsSnapshot[];
}

interface LineConfig {
  key: keyof StatsSnapshot;
  label: string;
  color: string;
  unit?: string;
}

const LINE_CONFIGS: LineConfig[] = [
  { key: 'herbivores', label: '食草动物数', color: '#4CAF50', unit: '只' },
  { key: 'carnivores', label: '食肉动物数', color: '#FF5722', unit: '只' },
  { key: 'avgResources', label: '平均资源量', color: '#2196F3', unit: '' },
  { key: 'diversity', label: '物种多样性', color: '#9C27B0', unit: '' },
];

const StatPanel: React.FC<StatPanelProps> = ({ currentStats, history }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = { top: 20, right: 20, bottom: 40, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#2D2D2D';
    ctx.fillRect(0, 0, width, height);

    if (history.length < 2) {
      ctx.fillStyle = '#BDBDBD';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('等待更多数据...', width / 2, height / 2);
      return;
    }

    const maxValues: Record<keyof StatsSnapshot, number> = {
      herbivores: 1,
      carnivores: 1,
      avgResources: 1,
      diversity: 1,
    };

    for (const stats of history) {
      for (const config of LINE_CONFIGS) {
        maxValues[config.key] = Math.max(maxValues[config.key], stats[config.key] * 1.1);
      }
    }

    ctx.strokeStyle = '#444444';
    ctx.lineWidth = 1;

    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartHeight * i) / 4;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      ctx.fillStyle = '#BDBDBD';
      ctx.font = '10px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(`${(maxValues.herbivores * (4 - i) / 4).toFixed(0)}`, padding.left - 5, y + 3);
    }

    const stepInterval = Math.max(1, Math.floor(history.length / 10));
    for (let i = 0; i < history.length; i += stepInterval) {
      const x = padding.left + (chartWidth * i) / (history.length - 1);
      ctx.strokeStyle = '#444444';
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, height - padding.bottom);
      ctx.stroke();

      ctx.fillStyle = '#BDBDBD';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${i}`, x, height - padding.bottom + 15);
    }

    for (const config of LINE_CONFIGS) {
      ctx.strokeStyle = config.color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      for (let i = 0; i < history.length; i++) {
        const x = padding.left + (chartWidth * i) / (history.length - 1);
        const value = history[i][config.key];
        const y = padding.top + chartHeight - (chartHeight * value) / maxValues[config.key];

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }

    ctx.fillStyle = '#E0E0E0';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('步数', width / 2, height - 8);

    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('数值', 0, 0);
    ctx.restore();

    const legendY = 10;
    LINE_CONFIGS.forEach((config, index) => {
      const x = padding.left + index * (width - padding.left - padding.right) / LINE_CONFIGS.length;
      ctx.fillStyle = config.color;
      ctx.fillRect(x, legendY, 12, 12);
      ctx.fillStyle = '#E0E0E0';
      ctx.font = '10px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(config.label, x + 16, legendY + 10);
    });
  }, [history]);

  useEffect(() => {
    drawChart();
  }, [drawChart]);

  return (
    <div
      style={{
        width: '320px',
        backgroundColor: '#2D2D2D',
        borderRadius: '8px',
        padding: '20px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      <h3 style={{ margin: 0, color: '#E0E0E0', fontSize: '18px', borderBottom: '2px solid #444', paddingBottom: '10px' }}>
        📊 数据统计
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {LINE_CONFIGS.map((config) => (
          <div
            key={config.key}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 12px',
              backgroundColor: '#1E1E1E',
              borderRadius: '6px',
              borderLeft: `4px solid ${config.color}`,
            }}
          >
            <span style={{ color: '#BDBDBD', fontSize: '14px' }}>{config.label}</span>
            <span style={{ color: config.color, fontSize: '18px', fontWeight: 'bold' }}>
              {typeof currentStats[config.key] === 'number' 
                ? currentStats[config.key].toFixed(config.key === 'diversity' ? 2 : 0)
                : currentStats[config.key]}
              {config.unit}
            </span>
          </div>
        ))}
      </div>

      <div>
        <h4 style={{ margin: '0 0 10px 0', color: '#BDBDBD', fontSize: '14px' }}>
          趋势图 (最近50步)
        </h4>
        <canvas
          ref={canvasRef}
          width={280}
          height={200}
          style={{
            borderRadius: '6px',
            backgroundColor: '#1E1E1E',
          }}
        />
      </div>

      <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid #444' }}>
        <div style={{ fontSize: '12px', color: '#757575', lineHeight: '1.6' }}>
          <p style={{ margin: '4px 0' }}><strong>图例说明:</strong></p>
          <p style={{ margin: '2px 0' }}>🍖 食物资源 | 💧 水资源</p>
          <p style={{ margin: '2px 0' }}>⚪ 兔子(食草) | 🟠 狐狸(食肉)</p>
          <p style={{ margin: '2px 0' }}>❗ 饥饿警告 | 🔥 灾难影响</p>
        </div>
      </div>
    </div>
  );
};

export default StatPanel;
