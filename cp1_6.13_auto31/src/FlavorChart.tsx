import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { FlavorScore } from './coffeeData';

interface FlavorChartProps {
  flavorScores: FlavorScore[];
  size?: number;
  highlightedDimension?: string | null;
  onDimensionHover?: (dimension: string | null) => void;
  color?: string;
  gradientId?: string;
}

const FlavorChart: React.FC<FlavorChartProps> = ({
  flavorScores,
  size = 320,
  highlightedDimension = null,
  onDimensionHover,
  color = '#6F4E37',
  gradientId = 'radarGradient',
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    label: string;
    value: number;
  }>({
    visible: false,
    x: 0,
    y: 0,
    label: '',
    value: 0,
  });

  const handleHoverStart = useCallback(
    (dimension: string, event: React.MouseEvent | MouseEvent, score: number) => {
      setTooltip({
        visible: true,
        x: (event as MouseEvent).clientX,
        y: (event as MouseEvent).clientY,
        label: dimension,
        value: score,
      });
      if (onDimensionHover) {
        onDimensionHover(dimension);
      }
    },
    [onDimensionHover]
  );

  const handleHoverMove = useCallback((event: React.MouseEvent | MouseEvent) => {
    setTooltip((prev) => ({
      ...prev,
      x: (event as MouseEvent).clientX,
      y: (event as MouseEvent).clientY,
    }));
  }, []);

  const handleHoverEnd = useCallback(() => {
    setTooltip((prev) => ({ ...prev, visible: false }));
    if (onDimensionHover) {
      onDimensionHover(null);
    }
  }, [onDimensionHover]);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 40;
    const levels = 5;
    const maxValue = 10;

    const dimensions = flavorScores.map((d) => d.dimension);
    const angleSlice = (Math.PI * 2) / dimensions.length;

    const defs = svg.append('defs');
    const gradient = defs
      .append('linearGradient')
      .attr('id', gradientId)
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '100%');
    gradient.append('stop').attr('offset', '0%').attr('stop-color', '#FF8C00');
    gradient.append('stop').attr('offset', '100%').attr('stop-color', '#B22222');

    const rootGroup = svg
      .append('g')
      .attr('transform', `translate(${centerX}, ${centerY})`);

    for (let i = 1; i <= levels; i++) {
      const levelRadius = (radius * i) / levels;
      const points: string[] = [];
      dimensions.forEach((_, index) => {
        const angle = index * angleSlice - Math.PI / 2;
        const x = levelRadius * Math.cos(angle);
        const y = levelRadius * Math.sin(angle);
        points.push(`${x},${y}`);
      });
      rootGroup
        .append('polygon')
        .attr('points', points.join(' '))
        .attr('fill', 'none')
        .attr('stroke', 'rgba(62, 39, 35, 0.1)')
        .attr('stroke-dasharray', '4 4');
    }

    dimensions.forEach((dimension, index) => {
      const angle = index * angleSlice - Math.PI / 2;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);

      rootGroup
        .append('line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', x)
        .attr('y2', y)
        .attr('stroke', 'rgba(62, 39, 35, 0.15)');
    });

    dimensions.forEach((dimension, index) => {
      const angle = index * angleSlice - Math.PI / 2;
      const labelRadius = radius + 22;
      const x = labelRadius * Math.cos(angle);
      const y = labelRadius * Math.sin(angle);

      const isHighlighted = highlightedDimension === dimension;
      rootGroup
        .append('text')
        .attr('x', x)
        .attr('y', y)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', isHighlighted ? '#D4AF37' : '#6D4C41')
        .attr('font-weight', isHighlighted ? '700' : '400')
        .attr('font-size', 12)
        .attr('style', 'transition: all 0.15s ease')
        .text(dimension);
    });

    const dataPoints = flavorScores.map((d, index) => {
      const angle = index * angleSlice - Math.PI / 2;
      const valueRadius = (radius * d.score) / maxValue;
      return {
        x: valueRadius * Math.cos(angle),
        y: valueRadius * Math.sin(angle),
        dimension: d.dimension,
        score: d.score,
      };
    });

    const lineGenerator = d3
      .line<{ x: number; y: number }>()
      .x((d) => d.x)
      .y((d) => d.y)
      .curve(d3.curveLinearClosed);

    rootGroup
      .append('path')
      .datum(dataPoints)
      .attr('d', lineGenerator)
      .attr('fill', `url(#${gradientId})`)
      .attr('fill-opacity', 0.35)
      .attr('stroke', color)
      .attr('stroke-width', 2.5);

    const pointsGroup = rootGroup.append('g');

    dataPoints.forEach((point) => {
      const isHighlighted = highlightedDimension === point.dimension;

      pointsGroup
        .append('circle')
        .attr('cx', point.x)
        .attr('cy', point.y)
        .attr('r', isHighlighted ? 7 : 5)
        .attr('fill', isHighlighted ? '#D4AF37' : color)
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 2)
        .attr('style', 'cursor: pointer; transition: r 0.15s ease, fill 0.15s ease;')
        .on('mouseenter', function (event) {
          d3.select(this).attr('r', 7);
          handleHoverStart(point.dimension, event as MouseEvent, point.score);
        })
        .on('mousemove', function (event) {
          handleHoverMove(event as MouseEvent);
        })
        .on('mouseleave', function () {
          d3.select(this).attr('r', highlightedDimension === point.dimension ? 7 : 5);
          handleHoverEnd();
        });

      pointsGroup
        .append('circle')
        .attr('cx', point.x)
        .attr('cy', point.y)
        .attr('r', 22)
        .attr('fill', 'transparent')
        .attr('style', 'cursor: pointer')
        .on('mouseenter', function (event) {
          const visibleCircle = d3
            .select(pointsGroup.node() as SVGGElement)
            .selectAll<SVGCircleElement, unknown>('circle[r="5"], circle[r="7"]')
            .filter(function () {
              return (
                d3.select(this).attr('cx') === String(point.x) &&
                d3.select(this).attr('cy') === String(point.y) &&
                d3.select(this).attr('fill') !== 'transparent'
              );
            });
          visibleCircle.attr('r', 7);
          handleHoverStart(point.dimension, event as MouseEvent, point.score);
        })
        .on('mousemove', function (event) {
          handleHoverMove(event as MouseEvent);
        })
        .on('mouseleave', function () {
          const visibleCircle = d3
            .select(pointsGroup.node() as SVGGElement)
            .selectAll<SVGCircleElement, unknown>('circle')
            .filter(function () {
              return (
                d3.select(this).attr('cx') === String(point.x) &&
                d3.select(this).attr('cy') === String(point.y) &&
                d3.select(this).attr('fill') !== 'transparent'
              );
            });
          visibleCircle.attr('r', highlightedDimension === point.dimension ? 7 : 5);
          handleHoverEnd();
        });
    });
  }, [
    flavorScores,
    size,
    color,
    gradientId,
    highlightedDimension,
    handleHoverStart,
    handleHoverMove,
    handleHoverEnd,
  ]);

  useEffect(() => {
    if (tooltipRef.current && tooltip.visible) {
      tooltipRef.current.style.left = `${tooltip.x + 12}px`;
      tooltipRef.current.style.top = `${tooltip.y - 36}px`;
    }
  }, [tooltip]);

  return (
    <React.Fragment>
      <svg ref={svgRef} width={size} height={size} className="radar-chart" />
      <div
        ref={tooltipRef}
        className={`radar-tooltip ${tooltip.visible ? 'visible' : ''}`}
        style={{ position: 'fixed', pointerEvents: 'none' }}
      >
        <div style={{ fontWeight: 600, marginBottom: 2 }}>{tooltip.label}</div>
        <div style={{ fontSize: 12, opacity: 0.9 }}>
          得分: {tooltip.value.toFixed(1)}
        </div>
      </div>
    </React.Fragment>
  );
};

export default FlavorChart;
