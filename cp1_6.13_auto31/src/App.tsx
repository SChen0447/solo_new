import React, { useState, useMemo, useCallback } from 'react';
import { coffeeBeans, CoffeeBean, regions, roastLevels, RoastPoint } from './coffeeData';
import FlavorChart from './FlavorChart';
import ComparisonPanel from './ComparisonPanel';
import * as d3 from 'd3';

type ViewMode = 'gallery' | 'detail' | 'comparison';

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('gallery');
  const [selectedCoffeeId, setSelectedCoffeeId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [roastFilter, setRoastFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [isFilterAnimating, setIsFilterAnimating] = useState(false);

  const filteredCoffees = useMemo(() => {
    return coffeeBeans.filter((coffee) => {
      const roastMatch = roastFilter === 'all' || coffee.roastLevel === roastFilter;
      const regionMatch = regionFilter === 'all' || coffee.region === regionFilter;
      return roastMatch && regionMatch;
    });
  }, [roastFilter, regionFilter]);

  const selectedCoffee = useMemo(() => {
    return coffeeBeans.find((c) => c.id === selectedCoffeeId) || null;
  }, [selectedCoffeeId]);

  const handleRoastFilterChange = useCallback((value: string) => {
    setIsFilterAnimating(true);
    setRoastFilter(value);
    setTimeout(() => setIsFilterAnimating(false), 300);
  }, []);

  const handleRegionFilterChange = useCallback((value: string) => {
    setIsFilterAnimating(true);
    setRegionFilter(value);
    setTimeout(() => setIsFilterAnimating(false), 300);
  }, []);

  const toggleCompare = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setCompareIds((prev) => {
        if (prev.includes(id)) {
          return prev.filter((x) => x !== id);
        }
        if (prev.length >= 2) {
          return prev;
        }
        return [...prev, id];
      });
    },
    []
  );

  const startComparison = useCallback(() => {
    if (compareIds.length === 2) {
      setViewMode('comparison');
    }
  }, [compareIds]);

  const goToGallery = useCallback(() => {
    setViewMode('gallery');
    setSelectedCoffeeId(null);
  }, []);

  const goToDetail = useCallback((id: string) => {
    setSelectedCoffeeId(id);
    setViewMode('detail');
  }, []);

  const renderRoastCurve = (coffee: CoffeeBean) => {
    const width = 500;
    const height = 240;
    const padding = { top: 20, right: 20, bottom: 40, left: 50 };
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;

    const maxTime = d3.max(coffee.roastCurve, (d) => d.time) || 0;
    const maxTemp = d3.max(coffee.roastCurve, (d) => d.temperature) || 0;
    const minTemp = d3.min(coffee.roastCurve, (d) => d.temperature) || 0;
    const tempRange = maxTemp - minTemp;

    const xScale = d3.scaleLinear().domain([0, maxTime]).range([0, innerWidth]);
    const yScale = d3
      .scaleLinear()
      .domain([minTemp - tempRange * 0.1, maxTemp + tempRange * 0.1])
      .range([innerHeight, 0]);

    const line = d3
      .line<RoastPoint>()
      .x((d) => xScale(d.time))
      .y((d) => yScale(d.temperature))
      .curve(d3.curveMonotoneX);

    const area = d3
      .area<RoastPoint>()
      .x((d) => xScale(d.time))
      .y0(innerHeight)
      .y1((d) => yScale(d.temperature))
      .curve(d3.curveMonotoneX);

    const yTicks = 5;

    return (
      <div style={{ position: 'relative', width: '100%' }}>
        <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
          <defs>
            <linearGradient id="roastCurveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FF8C00" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#B22222" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="roastLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FFD700" />
              <stop offset="50%" stopColor="#FF8C00" />
              <stop offset="100%" stopColor="#B22222" />
            </linearGradient>
          </defs>
          <g transform={`translate(${padding.left}, ${padding.top})`}>
            {Array.from({ length: yTicks + 1 }).map((_, i) => {
              const y = (innerHeight * i) / yTicks;
              return (
                <line
                  key={i}
                  x1={0}
                  x2={innerWidth}
                  y1={y}
                  y2={y}
                  stroke="rgba(62, 39, 35, 0.08)"
                  strokeDasharray="4 4"
                />
              );
            })}

            <path d={area(coffee.roastCurve) || ''} fill="url(#roastCurveGradient)" />

            <path
              d={line(coffee.roastCurve) || ''}
              fill="none"
              stroke="url(#roastLineGradient)"
              strokeWidth={3}
              strokeLinecap="round"
            />

            {coffee.roastCurve.map((point, i) => (
              <g key={i} className="roast-point-group">
                <circle
                  cx={xScale(point.time)}
                  cy={yScale(point.temperature)}
                  r={5}
                  fill="#6F4E37"
                  stroke="white"
                  strokeWidth={2}
                  style={{ cursor: 'pointer', transition: 'r 0.2s ease' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.setAttribute('r', '8');
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.setAttribute('r', '5');
                  }}
                >
                  <title>{`${point.time} 分钟\n${point.temperature}°C`}</title>
                </circle>
              </g>
            ))}

            {Array.from({ length: yTicks + 1 }).map((_, i) => {
              const temp = minTemp - tempRange * 0.1 + (maxTemp + tempRange * 0.1 - (minTemp - tempRange * 0.1)) * (1 - i / yTicks);
              return (
                <text
                  key={`ytick-${i}`}
                  x={-10}
                  y={(innerHeight * i) / yTicks + 4}
                  textAnchor="end"
                  fontSize="11"
                  fill="#6D4C41"
                >
                  {Math.round(temp)}°C
                </text>
              );
            })}

            {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
              <text
                key={`xtick-${i}`}
                x={innerWidth * t}
                y={innerHeight + 24}
                textAnchor="middle"
                fontSize="11"
                fill="#6D4C41"
              >
                {(maxTime * t).toFixed(0)} 分
              </text>
            ))}

            <text
              x={innerWidth / 2}
              y={innerHeight + 38}
              textAnchor="middle"
              fontSize="12"
              fill="#3E2723"
              fontWeight={500}
            >
              烘焙时间
            </text>
          </g>
        </svg>
      </div>
    );
  };

  const renderGallery = () => (
    <div className="gallery-view">
      <div className="filter-bar">
        <div className="filter-group">
          <label>烘焙度:</label>
          <button
            className={`filter-pill ${roastFilter === 'all' ? 'active' : ''}`}
            onClick={() => handleRoastFilterChange('all')}
          >
            全部
          </button>
          {roastLevels.map((level) => (
            <button
              key={level.value}
              className={`filter-pill ${roastFilter === level.value ? 'active' : ''}`}
              onClick={() => handleRoastFilterChange(level.value)}
            >
              {level.label}
            </button>
          ))}
        </div>
        <div className="filter-group">
          <label>产地:</label>
          <button
            className={`filter-pill ${regionFilter === 'all' ? 'active' : ''}`}
            onClick={() => handleRegionFilterChange('all')}
          >
            全部
          </button>
          {regions.map((region) => (
            <button
              key={region}
              className={`filter-pill ${regionFilter === region ? 'active' : ''}`}
              onClick={() => handleRegionFilterChange(region)}
            >
              {region}
            </button>
          ))}
        </div>
      </div>

      {compareIds.length > 0 && (
        <div className="compare-bar">
          <span>
            已选择 <strong>{compareIds.length}</strong> / 2 款咖啡豆进行比较
          </span>
          <button
            className="btn-primary"
            onClick={startComparison}
            disabled={compareIds.length !== 2}
          >
            开始比较
          </button>
        </div>
      )}

      <div className="coffee-grid" style={{ opacity: isFilterAnimating ? 0.6 : 1, transition: 'opacity 0.3s ease' }}>
        {filteredCoffees.map((coffee) => {
          const isSelected = compareIds.includes(coffee.id);
          return (
            <div
              key={coffee.id}
              className={`coffee-card ${isSelected ? 'selected' : ''}`}
              onClick={() => goToDetail(coffee.id)}
              style={{
                animation: isFilterAnimating ? 'none' : undefined,
              }}
            >
              <div
                className="coffee-card-image"
                style={{
                  background: `linear-gradient(135deg, ${coffee.colorStart} 0%, ${coffee.colorEnd} 100%)`,
                }}
              >
                <div
                  className="coffee-card-checkbox"
                  onClick={(e) => toggleCompare(coffee.id, e)}
                >
                  {isSelected && (
                    <div
                      style={{
                        color: 'white',
                        fontSize: 14,
                        fontWeight: 'bold',
                      }}
                    >
                      ✓
                    </div>
                  )}
                </div>
                <span className="coffee-bean-icon" role="img" aria-label="coffee bean">
                  ☕
                </span>
              </div>
              <div className="coffee-card-content">
                <div className="coffee-card-name">{coffee.name}</div>
                <div className="coffee-card-origin">{coffee.origin}</div>
                <span className={`roast-tag ${coffee.roastLevel}`}>{coffee.roastLevelLabel}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderDetail = () => {
    if (!selectedCoffee) return null;

    return (
      <div className="detail-view">
        <div className="detail-header">
          <button className="back-btn" onClick={goToGallery}>
            ← 返回画廊
          </button>
          <h2 style={{ fontSize: 24, fontWeight: 600 }}>{selectedCoffee.name}</h2>
        </div>

        <div className="detail-content">
          <div className="detail-card">
            <h3>烘焙曲线</h3>
            {renderRoastCurve(selectedCoffee)}
          </div>

          <div className="detail-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h3>风味雷达图</h3>
            <FlavorChart flavorScores={selectedCoffee.flavorScores} size={280} />
          </div>
        </div>

        <div className="detail-card" style={{ marginTop: 24 }}>
          <h3>咖啡豆信息</h3>
          <div className="detail-info">
            <div className="detail-info-item">
              <span>产地</span>
              <span>{selectedCoffee.origin}</span>
            </div>
            <div className="detail-info-item">
              <span>产区</span>
              <span>{selectedCoffee.region}</span>
            </div>
            <div className="detail-info-item">
              <span>烘焙度</span>
              <span>
                <span className={`roast-tag ${selectedCoffee.roastLevel}`}>
                  {selectedCoffee.roastLevelLabel}
                </span>
              </span>
            </div>
          </div>
        </div>

        <div className="detail-card" style={{ marginTop: 24 }}>
          <h3>品鉴笔记</h3>
          <p className="tasting-notes">{selectedCoffee.tastingNotes}</p>
        </div>
      </div>
    );
  };

  const renderComparison = () => {
    if (compareIds.length !== 2) return null;
    return (
      <ComparisonPanel
        coffeeIds={[compareIds[0], compareIds[1]] as [string, string]}
        onBack={goToGallery}
      />
    );
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>☕ 咖啡风味地图</h1>
        <p>探索世界各地精品咖啡豆的风味之旅</p>
      </header>
      <main className="app-main">
        {viewMode === 'gallery' && renderGallery()}
        {viewMode === 'detail' && renderDetail()}
        {viewMode === 'comparison' && renderComparison()}
      </main>
    </div>
  );
};

export default App;
