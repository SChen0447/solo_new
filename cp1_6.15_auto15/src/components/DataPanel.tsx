import React, { useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store';

const WaveformCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioFeatures = useAppStore((s) => s.audioFeatures);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, w, h);

    if (!audioFeatures) return;
    const data = audioFeatures.waveform;
    if (data.length === 0) return;

    ctx.strokeStyle = '#58a6ff';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#58a6ff';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    const step = w / data.length;
    for (let i = 0; i < data.length; i++) {
      const y = (data[i] + 1) * (h / 2);
      if (i === 0) ctx.moveTo(0, y);
      else ctx.lineTo(i * step, y);
    }
    ctx.stroke();
  }, [audioFeatures]);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={60}
      style={{ width: '100%', height: '60px', borderRadius: '4px', background: '#0d1117' }}
    />
  );
};

const MeterBar: React.FC<{ value: number; max: number; label: string; unit: string; color: string }> = ({
  value, max, label, unit, color,
}) => {
  const pct = Math.min(1, value / max);
  const barColor = pct < 0.5 ? '#58a6ff' : pct < 0.8 ? '#f0883e' : '#da3633';

  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
        <span style={{ fontSize: '12px', color: '#8b949e' }}>{label}</span>
        <span style={{ fontSize: '18px', fontWeight: 'bold', color }}>
          {value.toFixed(label === '节奏' ? 0 : 1)}
          <span style={{ fontSize: '11px', color: '#8b949e', marginLeft: '2px' }}>{unit}</span>
        </span>
      </div>
      <div style={{ width: '100%', height: '8px', background: '#21262d', borderRadius: '4px', overflow: 'hidden' }}>
        <div
          style={{
            width: `${pct * 100}%`,
            height: '100%',
            background: `linear-gradient(to right, #58a6ff, ${barColor})`,
            borderRadius: '4px',
            transition: 'width 0.1s ease-out',
          }}
        />
      </div>
    </div>
  );
};

const HitRateDisplay: React.FC = () => {
  const combatRecords = useAppStore((s) => s.combatRecords);
  const skillNames = ['音波冲击', '护盾共鸣', '音刃斩', '震荡波', '回声陷阱'];
  const skillIds = ['sonicBlast', 'shieldResonance', 'soundBlade', 'shockwave', 'echoTrap'];

  const rates = skillIds.map((id) => {
    const records = combatRecords.filter((r) => r.skillId === id);
    const hits = records.filter((r) => r.hit).length;
    const total = records.length;
    return { id, name: skillNames[skillIds.indexOf(id)], hits, total, rate: total > 0 ? hits / total : 0 };
  });

  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ fontSize: '12px', color: '#8b949e', marginBottom: '6px' }}>技能命中率</div>
      {rates.map((r) => (
        <div key={r.id} style={{ display: 'flex', alignItems: 'center', marginBottom: '4px', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: '#c9d1d9', width: '60px', flexShrink: 0 }}>{r.name}</span>
          <div style={{ flex: 1, height: '6px', background: '#21262d', borderRadius: '3px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${r.rate * 100}%`,
                height: '100%',
                background: r.rate > 0.5 ? '#3fb950' : r.rate > 0.2 ? '#f0883e' : '#da3633',
                borderRadius: '3px',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <span style={{ fontSize: '11px', color: '#8b949e', width: '40px', textAlign: 'right' }}>
            {r.total > 0 ? `${Math.round(r.rate * 100)}%` : '-'}
          </span>
        </div>
      ))}
    </div>
  );
};

const HistoryList: React.FC = () => {
  const combatRecords = useAppStore((s) => s.combatRecords);
  const displayRecords = combatRecords.slice(0, 30);

  return (
    <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
      <div style={{ fontSize: '12px', color: '#8b949e', marginBottom: '6px' }}>历史记录</div>
      {displayRecords.map((record) => {
        const time = new Date(record.timestamp);
        const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}:${time.getSeconds().toString().padStart(2, '0')}`;
        return (
          <div
            key={record.id}
            style={{
              background: '#161b22',
              borderRadius: '8px',
              padding: '8px',
              marginBottom: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: record.hit ? '#3fb950' : '#da3633',
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '12px', color: '#c9d1d9', fontWeight: 600 }}>{record.skillName}</div>
              <div style={{ fontSize: '10px', color: '#8b949e' }}>
                {record.pitch}Hz · {record.volume.toFixed(2)} · {record.bpm}BPM
              </div>
            </div>
            <div style={{ fontSize: '10px', color: '#484f58', flexShrink: 0 }}>{timeStr}</div>
          </div>
        );
      })}
      {displayRecords.length === 0 && (
        <div style={{ fontSize: '12px', color: '#484f58', textAlign: 'center', padding: '20px 0' }}>
          暂无记录
        </div>
      )}
    </div>
  );
};

const DataPanel: React.FC = () => {
  const audioFeatures = useAppStore((s) => s.audioFeatures);

  const pitch = audioFeatures?.pitch ?? 0;
  const volume = audioFeatures?.volume ?? 0;
  const bpm = audioFeatures?.bpm ?? 0;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '12px',
        background: '#0d1117',
        borderLeft: '1px solid #21262d',
        overflow: 'hidden',
      }}
    >
      <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#58a6ff', marginBottom: '10px' }}>
        数据面板
      </div>
      <WaveformCanvas />
      <div style={{ marginTop: '12px' }}>
        <MeterBar value={pitch} max={1000} label="音高" unit="Hz" color="#58a6ff" />
        <MeterBar value={volume} max={1} label="音量" unit="" color="#f0883e" />
        <MeterBar value={bpm} max={180} label="节奏" unit="BPM" color="#da3633" />
      </div>
      <HitRateDisplay />
      <HistoryList />
    </div>
  );
};

export default DataPanel;
