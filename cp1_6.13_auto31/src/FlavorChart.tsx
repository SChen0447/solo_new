import React, { useEffect, useRef, useState } from 'react';
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
  const [tooltip, setTooltip] = useState<{ visible: boolean; x: number; y: number; label: string; value: number }>({
    visible: false,
    x: 0,
    y: 0,
    label: '',
    value: 0,
  });

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

    const gridGroup = svg.append('g').attr('class', 'radar-grid').attr('transform', `translate(${centerX}, ${centerY})`);

    for (let i = 1; i <= levels; i++) {
      const levelRadius = (radius * i) / levels;
      const points: string[] = [];
      dimensions.forEach((_, index) => {
        const angle = index * angleSlice - Math.PI / 2;
        const x = levelRadius * Math.cos(angle);
        const y = levelRadius * Math.sin(angle);
        points.push(`${x},${y}`);
      });
      gridGroup
        .append('polygon')
        .attr('points', points.join(' '))
        .attr('fill', 'none')
        .attr('stroke', 'rgba(62, 39, 35, 0.1)')
        .attr('stroke-dasharray', '4 4');
    }

    const axisGroup = svg.append('g').attr('class', 'radar-axis').attr('transform', `translate(${centerX}, ${centerY})`);

    dimensions.forEach((dimension, index) => {
      const angle = index * angleSlice - Math.PI / 2;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);

      axisGroup
        .append('line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', x)
        .attr('y2', y)
        .attr('stroke', 'rgba(62, 39, 35, 0.15)');

      const labelRadius = radius + 20;
      const labelX = labelRadius * Math.cos(angle);
      const labelY = labelRadius * Math.sin(angle);

      axisGroup
        .append('text')
        .attr('x', labelX)
        .attr('y', labelY)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('class', 'radar-dimension-label')
        .attr('fill', highlightedDimension === dimension ? '#D4AF37' : '#6D4C41')
        .attr('font-weight', highlightedDimension === dimension ? '600' : 'normal')
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
        angle,
      };
    });

    const lineGenerator = d3
      .line<{ x: number; y: number }>()
      .x((d) => d.x)
      .y((d) => d.y)
      .curve(d3.curveLinearClosed);

    const chartGroup = svg.append('g').attr('transform', `translate(${centerX}, ${centerY})`);

    chartGroup
      .append('path')
      .datum(dataPoints)
      .attr('class', 'radar-area')
      .attr('d', lineGenerator)
      .attr('fill', `url(#${gradientId})`)
      .attr('fill-opacity', 0.35)
      .attr('stroke', color)
      .attr('stroke-width', 2.5);

    const pointsGroup = chartGroup.append('g').attr('class', 'radar-points');

    dataPoints.forEach((point, index) => {
      const pointEl = pointsGroup
        .append('circle')
        .attr('class', `radar-point ${highlightedDimension === point.dimension ? 'highlighted' : ''}`)
        .attr('cx', point.x)
        .attr('cy', point.y)
        .attr('r', highlightedDimension === point.dimension ? 7 : 5)
        .attr('fill', highlightedDimension === point.dimension ? '#D4AF37' : color)
        .attr('stroke', 'white')
        .attr('stroke-width', 2)
        .style('cursor', 'pointer')
        .on('mouseenter', function (event) {
          d3.select(this).transition().duration(150).attr('r', 7);
          setTooltip({
            visible: true,
            x: event.clientX,
            y: event.clientY,
            label: point.dimension,
            value: point.score,
          });
          if (onDimensionHover) {
            onDimensionHover(point.dimension);
          }
        })
        .on('mousemove', function (event) {
          setTooltip((prev) => ({
            ...prev,
            x: event.clientX,
            y: event.clientY,
          }));
        })
        .on('mouseleave', function () {
          d3.select(this)
            .transition()
            .duration(150)
            .attr('r', highlightedDimension === point.dimension ? 7 : 5);
          setTooltip((prev) => ({ ...prev, visible: false }));
          if (onDimensionHover) {
            onDimensionHover(null);
          }
        });

      const invisibleHitArea = pointsGroup
        .append('circle')
        .attr('cx', point.x)
        .attr('cy', point.y)
        .attr('r', 20)
        .attr('fill', 'transparent')
        .style('cursor', 'pointer')
        .on('mouseenter', function (event) {
          pointEl.dispatch('mouseenter');
          setTooltip({
            visible: true,
            x: event.clientX,
            y: event.clientY,
            label: point.dimension,
            value: point.score,
          });
          if (onDimensionHover) {
            onDimensionHover(point.dimension);
          }
        })
        .on('mousemove', function (event) {
          setTooltip((prev) => ({
            ...prev,
            x: event.clientX,
            y: event.clientY,
          }));
        })
        .on('mouseleave', function () {
          pointEl.dispatch('mouseleave');
          setTooltip((prev) => ({ ...prev, visible: false }));
          if (onDimensionHover) {
            onDimensionHover(null);
          }
        });
    });

    chartGroup
      .on('mouseenter', function () {})
      .on('mouseleave', function () {
        setTooltip((prev) => ({ ...prev, visible: false }));
        if (onDimensionHover) {
          onDimensionHover(null);
        }
      });
  }, [flavorScores, size, highlightedDimension, color, gradientId, onDimensionHover]);

  useEffect(() => {
    if (tooltipRef.current && tooltip.visible) {
      const rect = tooltipRef.current.getBoundingClientRect();
      tooltipRef.current.style.left = `${tooltip.x + 12}px`;
      tooltipRef.current.style.top = `${tooltip.y - 30}px`;
    }
  }, [tooltip]);

  return (
    <>
      <svg ref={svgRef} width={size} height={size} className="radar-chart" />
      <div
        ref={tooltipRef}
        className={`radar-tooltip ${tooltip.visible ? 'visible' : ''}`}
        style={{ position: 'fixed' }}
      >
        <div style={{ fontWeight: 600, marginBottom: 2 }}>{tooltip.label}</div>
        <div style={{ fontSize: 12, opacity: 0.9 }}>得分: {tooltip.value.toFixed(1)}</div>
      </div>
    </>
  );
};

export default FlavorChart;
