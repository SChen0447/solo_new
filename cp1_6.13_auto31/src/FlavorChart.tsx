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

interface DataPoint {
  x: number;
  y: number;
  dimension: string;
  score: number;
  angle: number;
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
  const isInitialized = useRef(false);
  const dataPointsRef = useRef<DataPoint[]>([]);
  const elementsRef = useRef<{
    points: d3.Selection<SVGCircleElement, DataPoint, SVGGElement, unknown> | null;
    labels: d3.Selection<SVGTextElement, string, SVGGElement, unknown> | null;
    area: d3.Selection<SVGPathElement, DataPoint[], SVGGElement, unknown> | null;
  }>({ points: null, labels: null, area: null });

  const [tooltip, setTooltip] = useState<{ visible: boolean; x: number; y: number; label: string; value: number }>({
    visible: false,
    x: 0,
    y: 0,
    label: '',
    value: 0,
  });

  const handlePointHover = useCallback(
    (dimension: string | null, event?: MouseEvent, score?: number) => {
      if (dimension && event && score !== undefined) {
        setTooltip({
          visible: true,
          x: event.clientX,
          y: event.clientY,
          label: dimension,
          value: score,
        });
      } else {
        setTooltip((prev) => ({ ...prev, visible: false }));
      }
      if (onDimensionHover) {
        onDimensionHover(dimension);
      }
    },
    [onDimensionHover]
  );

  const updateHighlight = useCallback(() => {
    const { points, labels } = elementsRef.current;
    if (!points || !labels) return;

    points
      .transition()
      .duration(150)
      .attr('r', (d) => (highlightedDimension === d.dimension ? 7 : 5))
      .attr('fill', (d) => (highlightedDimension === d.dimension ? '#D4AF37' : color));

    labels
      .transition()
      .duration(150)
      .attr('fill', (d) => (highlightedDimension === d ? '#D4AF37' : '#6D4C41'))
      .attr('font-weight', (d) => (highlightedDimension === d ? '600' : 'normal'));
  }, [highlightedDimension, color]);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 40;
    const levels = 5;
    const maxValue = 10;

    const dimensions = flavorScores.map((d) => d.dimension);
    const angleSlice = (Math.PI * 2) / dimensions.length;

    if (!isInitialized.current) {
      svg.selectAll('*').remove();

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

      const gridGroup = svg
        .append('g')
        .attr('class', 'radar-grid')
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
        gridGroup
          .append('polygon')
          .attr('points', points.join(' '))
          .attr('fill', 'none')
          .attr('stroke', 'rgba(62, 39, 35, 0.1)')
          .attr('stroke-dasharray', '4 4');
      }

      const axisGroup = svg
        .append('g')
        .attr('class', 'radar-axis')
        .attr('transform', `translate(${centerX}, ${centerY})`);

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
      });

      const labelGroup = svg
        .append('g')
        .attr('class', 'radar-labels')
        .attr('transform', `translate(${centerX}, ${centerY})`);

      elementsRef.current.labels = labelGroup
        .selectAll('text.dim-label')
        .data(dimensions)
        .enter()
        .append('text')
        .attr('class', 'dim-label radar-dimension-label')
        .attr('x', (_, i) => {
          const angle = i * angleSlice - Math.PI / 2;
          const labelRadius = radius + 20;
          return labelRadius * Math.cos(angle);
        })
        .attr('y', (_, i) => {
          const angle = i * angleSlice - Math.PI / 2;
          const labelRadius = radius + 20;
          return labelRadius * Math.sin(angle);
        })
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', '#6D4C41')
        .text((d) => d);

      const chartGroup = svg
        .append('g')
        .attr('class', 'radar-chart-group')
        .attr('transform', `translate(${centerX}, ${centerY})`);

      elementsRef.current.area = chartGroup
        .append('path')
        .attr('class', 'radar-area')
        .attr('fill', `url(#${gradientId})`)
        .attr('fill-opacity', 0.35)
        .attr('stroke', color)
        .attr('stroke-width', 2.5);

      elementsRef.current.points = chartGroup
        .append('g')
        .attr('class', 'radar-points')
        .selectAll('circle.radar-point')
        .data([] as DataPoint[])
        .enter()
        .append('circle')
        .attr('class', 'radar-point')
        .attr('stroke', 'white')
        .attr('stroke-width', 2)
        .style('cursor', 'pointer');

      isInitialized.current = true;
    }

    const dataPoints: DataPoint[] = flavorScores.map((d, index) => {
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
    dataPointsRef.current = dataPoints;

    const lineGenerator = d3
      .line<DataPoint>()
      .x((d) => d.x)
      .y((d) => d.y)
      .curve(d3.curveLinearClosed);

    if (elementsRef.current.area) {
      elementsRef.current.area.datum(dataPoints).attr('d', lineGenerator).attr('stroke', color);
    }

    if (elementsRef.current.points) {
      const pointsSelection = elementsRef.current.points.data(dataPoints, (d) => d.dimension);

      pointsSelection.exit().remove();

      const newPoints = pointsSelection.enter().append('circle').attr('class', 'radar-point').attr('stroke', 'white').attr('stroke-width', 2).style('cursor', 'pointer');

      const mergedPoints = newPoints.merge(pointsSelection as d3.Selection<SVGCircleElement, DataPoint, SVGGElement, unknown>);

      mergedPoints
        .attr('cx', (d) => d.x)
        .attr('cy', (d) => d.y)
        .attr('r', 5)
        .attr('fill', color)
        .on('mouseenter', function (event, d) {
          d3.select(this).transition().duration(150).attr('r', 7);
          handlePointHover(d.dimension, event as MouseEvent, d.score);
        })
        .on('mousemove', function (event, d) {
          setTooltip((prev) => ({
            ...prev,
            x: (event as MouseEvent).clientX,
            y: (event as MouseEvent).clientY,
          }));
        })
        .on('mouseleave', function () {
          d3.select(this)
            .transition()
            .duration(150)
            .attr('r', highlightedDimension === (d3.select(this).datum() as DataPoint).dimension ? 7 : 5);
          handlePointHover(null);
        });

      const pointsGroup = d3.select(svgRef.current).select('g.radar-points');
      const hitAreas = pointsGroup.selectAll('circle.hit-area').data(dataPoints, (d) => d.dimension);

      hitAreas.exit().remove();

      hitAreas
        .enter()
        .append('circle')
        .attr('class', 'hit-area')
        .attr('fill', 'transparent')
        .attr('r', 20)
        .style('cursor', 'pointer')
        .merge(hitAreas as d3.Selection<SVGCircleElement, DataPoint, SVGGElement, unknown>)
        .attr('cx', (d) => d.x)
        .attr('cy', (d) => d.y)
        .on('mouseenter', function (event, d) {
          const point = d3.select(svgRef.current).selectAll('circle.radar-point').filter((p) => (p as DataPoint).dimension === d.dimension);
          point.transition().duration(150).attr('r', 7);
          handlePointHover(d.dimension, event as MouseEvent, d.score);
        })
        .on('mousemove', function (event) {
          setTooltip((prev) => ({
            ...prev,
            x: (event as MouseEvent).clientX,
            y: (event as MouseEvent).clientY,
          }));
        })
        .on('mouseleave', function (event, d) {
          const point = d3.select(svgRef.current).selectAll('circle.radar-point').filter((p) => (p as DataPoint).dimension === d.dimension);
          point
            .transition()
            .duration(150)
            .attr('r', highlightedDimension === d.dimension ? 7 : 5);
          handlePointHover(null);
        });

      elementsRef.current.points = mergedPoints;
    }

    updateHighlight();
  }, [flavorScores, size, color, gradientId, handlePointHover, updateHighlight]);

  useEffect(() => {
    updateHighlight();
  }, [highlightedDimension, updateHighlight]);

  useEffect(() => {
    if (tooltipRef.current && tooltip.visible) {
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
