import { useState, useEffect, useMemo, useRef } from 'react';
import * as d3Scale from 'd3-scale';
import {
  useTrafficStore,
  type TrafficPacket,
  type Protocol,
  type IPPoint,
} from '@store/useTrafficStore';
import { TrafficSimulator } from '@traffic/TrafficSimulator';

const PROTOCOL_COLORS: Record<Protocol, string> = {
  TCP: '#3498db',
  UDP: '#2ecc71',
  ICMP: '#e74c3c',
};

interface StatsItem {
  ip: string;
  count: number;
  protocol: Protocol;
}

function LeftPanel() {
  const packets = useTrafficStore((s) => s.packets);
  const selectedIP = useTrafficStore((s) => s.selectedIP);
  const selectIP = useTrafficStore((s) => s.selectIP);
  const [tab, setTab] = useState<'src' | 'dst'>('src');
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const t = setInterval(() => forceUpdate((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const stats = useMemo((): StatsItem[] => {
    const map = new Map<string, { count: number; protocols: Map<Protocol, number> }>();
    const cutoff = Date.now() - 10000;
    for (const p of packets) {
      if (p.timestamp < cutoff) continue;
      const ip = tab === 'src' ? p.srcIP : p.dstIP;
      if (!map.has(ip)) {
        map.set(ip, { count: 0, protocols: new Map() });
      }
      const entry = map.get(ip)!;
      entry.count++;
      entry.protocols.set(p.protocol, (entry.protocols.get(p.protocol) || 0) + 1);
    }
    const arr: StatsItem[] = [];
    for (const [ip, data] of map) {
      let topProto: Protocol = 'TCP';
      let topCount = 0;
      for (const [proto, cnt] of data.protocols) {
        if (cnt > topCount) {
          topCount = cnt;
          topProto = proto;
        }
      }
      arr.push({ ip, count: data.count, protocol: topProto });
    }
    return arr.sort((a, b) => b.count - a.count).slice(0, 50);
  }, [packets, tab]);

  const handleClick = (ip: string) => {
    selectIP(selectedIP === ip ? null : ip);
  };

  return (
    <div className="panel-left">
      <div className="panel-header">
        <div className="panel-title">地址统计</div>
        <div className="tab-group">
          <button
            className={`tab-btn ${tab === 'src' ? 'active' : ''}`}
            onClick={() => setTab('src')}
          >
            源地址
          </button>
          <button
            className={`tab-btn ${tab === 'dst' ? 'active' : ''}`}
            onClick={() => setTab('dst')}
          >
            目的地址
          </button>
        </div>
      </div>
      <div className="stats-list">
        {stats.length === 0 ? (
          <div className="empty-list">暂无数据...</div>
        ) : (
          stats.map((item) => (
            <div
              key={item.ip}
              className={`stats-item ${selectedIP === item.ip ? 'selected' : ''}`}
              onClick={() => handleClick(item.ip)}
            >
              <span
                className="protocol-dot"
                style={{ background: PROTOCOL_COLORS[item.protocol] }}
              />
              <span className="stats-ip" title={item.ip}>
                {item.ip}
              </span>
              <span className="stats-count">{item.count}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: number;
  unit?: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">
        {value.toLocaleString()}
        {unit && <span className="stat-unit">{unit}</span>}
      </div>
    </div>
  );
}

function LineChart({
  data,
  width,
  height,
  color = '#ff6f00',
}: {
  data: IPPoint[];
  width: number;
  height: number;
  color?: string;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const padding = { top: 10, right: 15, bottom: 22, left: 35 };

  const { xScale, yScale, pathD, areaD, points } = useMemo(() => {
    const innerW = width - padding.left - padding.right;
    const innerH = height - padding.top - padding.bottom;

    const times = data.map((d) => d.time);
    const counts = data.map((d) => d.count);
    const minT = times.length > 0 ? Math.min(...times) : 0;
    const maxT = times.length > 0 ? Math.max(...times) : 1;
    const maxC = Math.max(1, ...counts, 5);

    const xScale = d3Scale
      .scaleLinear()
      .domain([minT, maxT])
      .range([0, innerW]);

    const yScale = d3Scale
      .scaleLinear()
      .domain([0, maxC])
      .range([innerH, 0]);

    const pts = data.map((d) => ({
      x: xScale(d.time),
      y: yScale(d.count),
      time: d.time,
      count: d.count,
    }));

    let path = '';
    for (let i = 0; i < pts.length; i++) {
      path += `${i === 0 ? 'M' : 'L'}${pts[i].x.toFixed(2)},${pts[i].y.toFixed(2)}`;
    }

    let area = '';
    if (pts.length > 0) {
      area = `M${pts[0].x.toFixed(2)},${innerH}`;
      for (let i = 0; i < pts.length; i++) {
        area += ` L${pts[i].x.toFixed(2)},${pts[i].y.toFixed(2)}`;
      }
      area += ` L${pts[pts.length - 1].x.toFixed(2)},${innerH} Z`;
    }

    return { xScale, yScale, pathD: path, areaD: area, points: pts };
  }, [data, width, height]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!svgRef.current || points.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - padding.left;
    const innerW = width - padding.left - padding.right;
    const ratio = Math.max(0, Math.min(1, x / innerW));
    const idx = Math.round(ratio * (points.length - 1));
    setHoverIdx(idx >= 0 && idx < points.length ? idx : null);
  };

  const handleMouseLeave = () => setHoverIdx(null);

  const yTicks = 4;
  const xTicks = 5;

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <g transform={`translate(${padding.left}, ${padding.top})`}>
        {Array.from({ length: yTicks + 1 }, (_, i) => {
          const y = (i / yTicks) * (height - padding.top - padding.bottom);
          const val = yScale.invert(height - padding.top - padding.bottom - y);
          return (
            <g key={i}>
              <line
                x1={0}
                y1={y}
                x2={width - padding.left - padding.right}
                y2={y}
                stroke="rgba(255,255,255,0.05)"
                strokeWidth={1}
              />
              <text
                x={-6}
                y={y + 3}
                fill="#6b7280"
                fontSize="10"
                textAnchor="end"
                fontFamily="monospace"
              >
                {Math.round(val)}
              </text>
            </g>
          );
        })}
        {Array.from({ length: xTicks + 1 }, (_, i) => {
          const x = (i / xTicks) * (width - padding.left - padding.right);
          const t = xScale.invert(x);
          const secs = Math.max(0, Math.round((Date.now() - t) / 1000));
          return (
            <text
              key={i}
              x={x}
              y={height - padding.top - padding.bottom + 15}
              fill="#6b7280"
              fontSize="10"
              textAnchor="middle"
              fontFamily="monospace"
            >
              -{secs}s
            </text>
          );
        })}
        {areaD && <path d={areaD} fill="url(#lineGradient)" />}
        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {hoverIdx !== null && points[hoverIdx] && (
          <g>
            <line
              x1={points[hoverIdx].x}
              y1={0}
              x2={points[hoverIdx].x}
              y2={height - padding.top - padding.bottom}
              stroke="rgba(255,255,255,0.2)"
              strokeDasharray="3 3"
            />
            <circle
              cx={points[hoverIdx].x}
              cy={points[hoverIdx].y}
              r={4}
              fill={color}
              stroke="#fff"
              strokeWidth={1.5}
            />
            <foreignObject
              x={Math.min(points[hoverIdx].x + 8, width - padding.left - padding.right - 80)}
              y={Math.max(points[hoverIdx].y - 40, 0)}
              width={80}
              height={36}
            >
              <div
                style={{
                  background: 'rgba(13,17,23,0.95)',
                  border: '1px solid #7c4dff',
                  borderRadius: 4,
                  padding: '4px 8px',
                  fontSize: 10,
                  color: '#fff',
                  fontFamily: 'monospace',
                }}
              >
                <div style={{ color: '#ff6f00', fontWeight: 'bold' }}>
                  包数: {points[hoverIdx].count}
                </div>
              </div>
            </foreignObject>
          </g>
        )}
      </g>
    </svg>
  );
}

function TimelineSlider() {
  const [dragging, setDragging] = useState(false);
  const [localTime, setLocalTime] = useState<number>(Date.now());
  const startTime = useTrafficStore((s) => s.startTime);
  const terrainHeights = useTrafficStore((s) => s.terrainHeights);
  const isReplaying = useTrafficStore((s) => s.isReplaying);
  const setReplaying = useTrafficStore((s) => s.setReplaying);
  const setPaused = useTrafficStore((s) => s.setPaused);
  const setTime = useTrafficStore((s) => s.setTime);

  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isReplaying) {
      setLocalTime(Date.now());
    }
  }, [isReplaying]);

  const windowStart = Date.now() - 60000;
  const windowEnd = Date.now();
  const range = windowEnd - windowStart;

  const progress = isReplaying
    ? Math.max(0, Math.min(1, (localTime - windowStart) / range))
    : 1;

  const peaks = useMemo(() => {
    const result: { ratio: number; height: number }[] = [];
    for (let t = 0; t < terrainHeights.length; t++) {
      let max = 0;
      for (let z = 0; z < terrainHeights[t].length; z++) {
        if (terrainHeights[t][z] > max) max = terrainHeights[t][z];
      }
      if (max > 0.5) {
        result.push({
          ratio: (t + 0.5) / terrainHeights.length,
          height: max / 6,
        });
      }
    }
    return result;
  }, [terrainHeights]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    setReplaying(true);
    setPaused(true);
    updateTime(e);
  };

  const updateTime = (e: React.MouseEvent | MouseEvent) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(
      0,
      Math.min(1, (e.clientX - rect.left) / rect.width)
    );
    const t = windowStart + ratio * range;
    setLocalTime(t);
    setTime(t);
  };

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (e: MouseEvent) => updateTime(e);
    const handleUp = () => {
      setDragging(false);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragging]);

  const handleDoubleClick = () => {
    setReplaying(false);
    setPaused(false);
    setTime(Date.now());
  };

  return (
    <div className="timeline-container" onDoubleClick={handleDoubleClick}>
      <div className="timeline-label">
        <span>60s前</span>
        <span className="timeline-current">
          {isReplaying
            ? new Date(localTime).toLocaleTimeString()
            : '实时'}
        </span>
        <span>现在</span>
      </div>
      <div
        ref={trackRef}
        className={`timeline-track ${dragging ? 'dragging' : ''}`}
        onMouseDown={handleMouseDown}
      >
        <div className="timeline-gradient" />
        {peaks.map((p, i) => (
          <div
            key={i}
            className="timeline-peak"
            style={{
              left: `${p.ratio * 100}%`,
              opacity: 0.3 + p.height * 0.7,
            }}
          />
        ))}
        <div
          className="timeline-progress"
          style={{ width: `${progress * 100}%` }}
        />
        <div
          className="timeline-thumb"
          style={{ left: `${progress * 100}%` }}
        />
      </div>
      {isReplaying && (
        <div className="timeline-hint">拖拽滑块回放 · 双击返回实时</div>
      )}
    </div>
  );
}

function RightPanel() {
  const packets = useTrafficStore((s) => s.packets);
  const anomalies = useTrafficStore((s) => s.anomalies);
  const selectedIP = useTrafficStore((s) => s.selectedIP);
  const selectedIPHistory = useTrafficStore((s) => s.selectedIPHistory);
  const addSelectedIPHistory = useTrafficStore((s) => s.addSelectedIPHistory);
  const isPaused = useTrafficStore((s) => s.isPaused);
  const togglePause = useTrafficStore((s) => s.togglePause);

  const [pps, setPps] = useState(0);
  const [activeIPs, setActiveIPs] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const cutoff = now - 1000;
      let count = 0;
      const ipSet = new Set<string>();
      const cutoff2 = now - 30000;
      for (const p of packets) {
        if (p.timestamp > cutoff) count++;
        if (p.timestamp > cutoff2) {
          ipSet.add(p.srcIP);
          ipSet.add(p.dstIP);
        }
      }
      setPps(count);
      setActiveIPs(ipSet.size);
    }, 1000);
    return () => clearInterval(interval);
  }, [packets]);

  useEffect(() => {
    if (!selectedIP) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const cutoff = now - 1000;
      let count = 0;
      for (const p of packets) {
        if (
          p.timestamp > cutoff &&
          (p.srcIP.startsWith(selectedIP.substring(0, selectedIP.lastIndexOf('.'))) ||
            p.dstIP.startsWith(selectedIP.substring(0, selectedIP.lastIndexOf('.'))))
        ) {
          count++;
        }
      }
      const parts = selectedIP.split('.');
      const seg = `${parts[0]}.${parts[1]}.${parts[2]}`;
      let cnt = 0;
      for (const p of packets) {
        if (p.timestamp > cutoff && (p.srcIP.startsWith(seg) || p.dstIP.startsWith(seg))) {
          cnt++;
        }
      }
      addSelectedIPHistory({ time: now, count: cnt });
    }, 1000);
    return () => clearInterval(interval);
  }, [selectedIP, packets, addSelectedIPHistory]);

  const exportSnapshot = () => {
    const snapshot = {
      exportTime: new Date().toISOString(),
      packets: packets.slice(-500),
      anomalies,
      selectedIP,
    };
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `traffic-snapshot-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const chartData = useMemo(() => {
    if (selectedIPHistory.length > 0) return selectedIPHistory;
    const fallback: IPPoint[] = [];
    const now = Date.now();
    const ipStats: Record<string, number> = {};
    for (let i = 60; i >= 0; i -= 2) {
      fallback.push({ time: now - i * 1000, count: Math.floor(Math.random() * 10) });
    }
    return fallback;
  }, [selectedIPHistory]);

  return (
    <div className="panel-right">
      <div className="panel-header">
        <div className="panel-title">实时统计</div>
      </div>
      <div className="stats-cards">
        <StatCard label="总包数/秒" value={pps} unit="/s" />
        <StatCard label="活跃IP数" value={activeIPs} />
        <StatCard label="异常数" value={anomalies.length} />
      </div>

      <div className="panel-subtitle">
        {selectedIP ? `IP段: ${selectedIP.substring(0, selectedIP.lastIndexOf('.'))}.0/24 流量趋势` : '选择IP段查看流量趋势'}
      </div>
      <div className="chart-container">
        <LineChart data={chartData} width={290} height={180} />
      </div>

      <div className="control-buttons">
        <button className="control-btn" onClick={togglePause}>
          {isPaused ? '▶ 继续' : '⏸ 暂停'}
        </button>
        <button
          className="control-btn"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('resetCamera'));
          }}
        >
          ⟲ 重置视角
        </button>
        <button className="control-btn" onClick={exportSnapshot}>
          ⤓ 导出快照
        </button>
      </div>
    </div>
  );
}

function SearchBar() {
  const [value, setValue] = useState('');
  const selectIP = useTrafficStore((s) => s.selectIP);
  const selectedIP = useTrafficStore((s) => s.selectedIP);
  const selectedIPHistory = useTrafficStore((s) => s.selectedIPHistory);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (value.length === 0) {
      setSuggestions([]);
      return;
    }
    const all = TrafficSimulator.IPSegments;
    const filtered = all.filter((ip) => ip.startsWith(value)).slice(0, 6);
    setSuggestions(filtered);
  }, [value]);

  const handleSearch = () => {
    if (value.trim()) {
      const match = TrafficSimulator.IPSegments.find((ip) =>
        ip.startsWith(value.trim())
      );
      if (match) {
        selectIP(match.replace('.0/24', '.1'));
      } else {
        selectIP(value.trim());
      }
    } else {
      selectIP(null);
    }
  };

  return (
    <div className="search-container">
      <div className="search-box-wrapper">
        <input
          type="text"
          className="search-input"
          placeholder="搜索IP段 (如 192.168.1)..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSearch();
          }}
        />
        <button className="search-btn" onClick={handleSearch}>
          🔍
        </button>
        {suggestions.length > 0 && (
          <div className="search-suggestions">
            {suggestions.map((s) => (
              <div
                key={s}
                className="suggestion-item"
                onClick={() => {
                  setValue(s.replace('.0/24', ''));
                  selectIP(s.replace('.0/24', '.1'));
                  setSuggestions([]);
                }}
              >
                {s}
              </div>
            ))}
          </div>
        )}
      </div>
      {selectedIP && (
        <div className="selected-info">
          已选中: <strong>{selectedIP.substring(0, selectedIP.lastIndexOf('.'))}.0/24</strong>
        </div>
      )}
      {selectedIP && selectedIPHistory.length > 1 && (
        <div className="mini-chart">
          <LineChart data={selectedIPHistory.slice(-30)} width={260} height={70} />
        </div>
      )}
    </div>
  );
}

export default function UIPanel() {
  return (
    <>
      <LeftPanel />
      <RightPanel />
      <div className="bottom-panel">
        <SearchBar />
        <TimelineSlider />
      </div>
    </>
  );
}
