import React, { useState, useMemo } from 'react';
import FlavorChart from './FlavorChart';
import { coffeeBeans, CoffeeBean, RoastPoint } from './coffeeData';
import * as d3 from 'd3';

interface ComparisonPanelProps {
  coffeeIds: [string, string];
  onBack: () => void;
}

const ComparisonPanel: React.FC<ComparisonPanelProps> = ({ coffeeIds, onBack }) => {
  const [highlightedDimension, setHighlightedDimension] = useState<string | null>(null);

  const coffees = useMemo(() => {
    return coffeeIds.map((id) => coffeeBeans.find((c) => c.id === id)).filter(Boolean) as CoffeeBean[];
  }, [coffeeIds]);

  if (coffees.length < 2) {
    return <div className="detail-view">请选择两款咖啡豆进行比较</div>;
  }

  const [coffee1, coffee2] = coffees;

  const renderRoastCurve = (coffee: CoffeeBean, color: string, index: number) => {
    const width = 400;
    const height = 200;
    const padding = { top: 20, right: 20, bottom: 30, left: 40 };
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;

    const allPoints = [...coffee1.roastCurve, ...coffee2.roastCurve];
    const maxTime = d3.max(allPoints, (d) => d.time) || 0;
    const maxTemp = d3.max(allPoints, (d) => d.temperature) || 0;
    const minTemp = d3.min(allPoints, (d) => d.temperature) || 0;
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

    return (
      <div style={{ position: 'relative', width: '100%', maxWidth: width }}>
        <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
          <defs>
            <linearGradient id={`curveGradient-${coffee.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.4" />
              <stop offset="100%" stopColor={color} stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <g transform={`translate(${padding.left}, ${padding.top})`}>
            {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
              <line
                key={i}
                x1={0}
                x2={innerWidth}
                y1={innerHeight * t}
                y2={innerHeight * t}
                stroke="rgba(62, 39, 35, 0.1)"
                strokeDasharray="4 4"
              />
            ))}

            <path d={area(coffee.roastCurve) || ''} fill={`url(#curveGradient-${coffee.id})`} />

            <path
              d={line(coffee.roastCurve) || ''}
              fill="none"
              stroke={color}
              strokeWidth={2.5}
              strokeLinecap="round"
            />

            {coffee.roastCurve.map((point, i) => (
              <circle
                key={i}
                cx={xScale(point.time)}
                cy={yScale(point.temperature)}
                r={4}
                fill={color}
                stroke="white"
                strokeWidth={2}
              >
                <title>{`${point.time}分钟: ${point.temperature}°C`}</title>
              </circle>
            ))}

            <text x={-10} y={yScale(minTemp - tempRange * 0.05)} textAnchor="end" fontSize="11" fill="#6D4C41">
              {Math.round(minTemp - tempRange * 0.1)}°C
            </text>
            <text x={-10} y={innerHeight / 2} textAnchor="end" fontSize="11" fill="#6D4C41">
              温度
            </text>
            <text x={innerWidth / 2} y={innerHeight + 24} textAnchor="middle" fontSize="11" fill="#6D4C41">
              时间 (分钟)
            </text>
            <text x={0} y={innerHeight + 24} textAnchor="start" fontSize="11" fill="#6D4C41">
              0
            </text>
            <text x={innerWidth} y={innerHeight + 24} textAnchor="end" fontSize="11" fill="#6D4C41">
              {maxTime}
            </text>
          </g>
        </svg>
      </div>
    );
  };

  const renderCombinedRoastCurve = () => {
    const width = 600;
    const height = 280;
    const padding = { top: 30, right: 20, bottom: 40, left: 50 };
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;

    const allPoints = [...coffee1.roastCurve, ...coffee2.roastCurve];
    const maxTime = d3.max(allPoints, (d) => d.time) || 0;
    const maxTemp = d3.max(allPoints, (d) => d.temperature) || 0;
    const minTemp = d3.min(allPoints, (d) => d.temperature) || 0;
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

    const colors = ['#FF8C00', '#6F4E37'];

    return (
      <div style={{ position: 'relative', width: '100%', maxWidth: width, margin: '0 auto' }}>
        <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
          <defs>
            {[coffee1, coffee2].map((coffee, i) => (
              <linearGradient key={coffee.id} id={`combined-curve-${i}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={colors[i]} stopOpacity="0.3" />
                <stop offset="100%" stopColor={colors[i]} stopOpacity="0.02" />
              </linearGradient>
            ))}
          </defs>
          <g transform={`translate(${padding.left}, ${padding.top})`}>
            {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
              <line
                key={i}
                x1={0}
                x2={innerWidth}
                y1={innerHeight * t}
                y2={innerHeight * t}
                stroke="rgba(62, 39, 35, 0.1)"
                strokeDasharray="4 4"
              />
            ))}

            {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
              const temp = minTemp - tempRange * 0.1 + (maxTemp + tempRange * 0.1 - (minTemp - tempRange * 0.1)) * (1 - t);
              return (
                <text
                  key={i}
                  x={-10}
                  y={innerHeight * t + 4}
                  textAnchor="end"
                  fontSize="11"
                  fill="#6D4C41"
                >
                  {Math.round(temp)}°
                </text>
              );
            })}

            {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
              <text
                key={i}
                x={innerWidth * t}
                y={innerHeight + 24}
                textAnchor="middle"
                fontSize="11"
                fill="#6D4C41"
              >
                {(maxTime * t).toFixed(0)}分
              </text>
            ))}

            {[coffee1, coffee2].map((coffee, i) => {
              const area = d3
                .area<RoastPoint>()
                .x((d) => xScale(d.time))
                .y0(innerHeight)
                .y1((d) => yScale(d.temperature))
                .curve(d3.curveMonotoneX);
              return (
                <path
                  key={`area-${coffee.id}`}
                  d={area(coffee.roastCurve) || ''}
                  fill={`url(#combined-curve-${i})`}
                />
              );
            })}

            {[coffee1, coffee2].map((coffee, i) => (
              <path
                key={`line-${coffee.id}`}
                d={line(coffee.roastCurve) || ''}
                fill="none"
                stroke={colors[i]}
                strokeWidth={2.5}
                strokeLinecap="round"
              />
            ))}

            {[coffee1, coffee2].map((coffee, ci) =>
              coffee.roastCurve.map((point, pi) => (
                <circle
                  key={`${coffee.id}-${pi}`}
                  cx={xScale(point.time)}
                  cy={yScale(point.temperature)}
                  r={4}
                  fill={colors[ci]}
                  stroke="white"
                  strokeWidth={2}
                >
                  <title>{`${coffee.name}\n${point.time}分钟: ${point.temperature}°C`}</title>
                </circle>
              ))
            )}

            <g transform={`translate(${innerWidth - 140}, -10)`}>
              {[coffee1, coffee2].map((coffee, i) => (
                <g key={coffee.id} transform={`translate(${i * 80}, 0)`}>
                  <circle cx={8} cy={8} r={6} fill={colors[i]} />
                  <text x={20} y={12} fontSize="12" fill="#3E2723">
                    {coffee.name.split(' ')[0]}
                  </text>
                </g>
              ))}
            </g>
          </g>
        </svg>
      </div>
    );
  };

  const colors = ['#FF8C00', '#6F4E37'];

  return (
    <div className="comparison-view">
      <div className="comparison-header">
        <h2>风味对比</h2>
        <button className="btn-secondary" onClick={onBack}>
          返回画廊
        </button>
      </div>

      <div className="detail-card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16 }}>烘焙曲线对比</h3>
        {renderCombinedRoastCurve()}
      </div>

      <div className="comparison-charts">
        <div className="comparison-card" style={{ textAlign: 'center' }}>
          <h3 style={{ color: colors[0] }}>{coffee1.name}</h3>
          <div className="origin">{coffee1.origin}</div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <FlavorChart
              flavorScores={coffee1.flavorScores}
              size={280}
              highlightedDimension={highlightedDimension}
              onDimensionHover={setHighlightedDimension}
              color={colors[0]}
              gradientId={`radar-${coffee1.id}`}
            />
          </div>
          <div style={{ marginTop: 8 }}>
            <span className={`roast-tag ${coffee1.roastLevel}`}>{coffee1.roastLevelLabel}</span>
          </div>
        </div>

        <div className="comparison-card" style={{ textAlign: 'center' }}>
          <h3 style={{ color: colors[1] }}>{coffee2.name}</h3>
          <div className="origin">{coffee2.origin}</div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <FlavorChart
              flavorScores={coffee2.flavorScores}
              size={280}
              highlightedDimension={highlightedDimension}
              onDimensionHover={setHighlightedDimension}
              color={colors[1]}
              gradientId={`radar-${coffee2.id}`}
            />
          </div>
          <div style={{ marginTop: 8 }}>
            <span className={`roast-tag ${coffee2.roastLevel}`}>{coffee2.roastLevelLabel}</span>
          </div>
        </div>
      </div>

      <div className="comparison-cards">
        <div className="comparison-card">
          <h3>品鉴笔记 - {coffee1.name}</h3>
          <p className="tasting-notes">{coffee1.tastingNotes}</p>
        </div>
        <div className="comparison-card">
          <h3>品鉴笔记 - {coffee2.name}</h3>
          <p className="tasting-notes">{coffee2.tastingNotes}</p>
        </div>
      </div>
    </div>
  );
};

export default ComparisonPanel;
