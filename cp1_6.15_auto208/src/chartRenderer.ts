import * as d3 from 'd3';
import type { ChartType, AxisMapping, DetailCardData } from './store';
import { isNumericField } from './dataParser';

const ACCENT_COLOR = '#1e88e5';
const COLOR_PALETTE = [
  '#1e88e5', '#e53935', '#43a047', '#fb8c00',
  '#8e24aa', '#00acc1', '#f4511e', '#3949ab',
  '#7cb342', '#c0ca33', '#6d4c41', '#546e7a',
];
const MARGIN = { top: 40, right: 40, bottom: 60, left: 60 };
const MIN_RADIUS = 8;
const MAX_RADIUS = 20;

interface RenderConfig {
  chartType: ChartType;
  axisMapping: AxisMapping;
  rows: Record<string, string | number>[];
  fields: string[];
  container: SVGSVGElement | null;
  onDetailCard: (data: DetailCardData | null) => void;
  width: number;
  height: number;
}

function getNumericValues(
  rows: Record<string, string | number>[],
  field: string
): number[] {
  return rows
    .map((r) => r[field])
    .filter((v): v is number => typeof v === 'number' && !isNaN(v));
}

function getStringValues(
  rows: Record<string, string | number>[],
  field: string
): string[] {
  return rows.map((r) => String(r[field] ?? ''));
}

function getXValues(
  rows: Record<string, string | number>[],
  field: string,
  numeric: boolean
) {
  if (numeric) return getNumericValues(rows, field);
  return getStringValues(rows, field);
}

export function renderChart(config: RenderConfig): void {
  const {
    chartType,
    axisMapping,
    rows,
    container,
    onDetailCard,
    width,
    height,
  } = config;

  if (!container) return;
  if (!axisMapping.x || !axisMapping.y) return;
  if (rows.length === 0) return;

  const svg = d3.select(container);
  svg.selectAll('*').remove();

  const innerWidth = width - MARGIN.left - MARGIN.right;
  const innerHeight = height - MARGIN.top - MARGIN.bottom;

  const g = svg
    .append('g')
    .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

  const xField = axisMapping.x;
  const yField = axisMapping.y;
  const colorField = axisMapping.color;
  const sizeField = axisMapping.size;

  const xNumeric = isNumericField(rows, xField);
  const yNumeric = isNumericField(rows, yField);

  const xValues = getXValues(rows, xField, xNumeric);
  const yValues = getNumericValues(rows, yField);

  if (yValues.length === 0) return;

  let xScale: d3.ScaleLinear<number, number> | d3.ScalePoint<string>;
  if (xNumeric) {
    const xNumValues = xValues as number[];
    const xExtent = d3.extent(xNumValues) as [number, number];
    xScale = d3.scaleLinear()
      .domain([xExtent[0] * 1.05 - xExtent[0] * 0.05, xExtent[1] * 1.05])
      .range([0, innerWidth])
      .nice();
  } else {
    const uniqueX = [...new Set(xValues as string[])];
    xScale = d3.scalePoint<string>()
      .domain(uniqueX)
      .range([0, innerWidth])
      .padding(0.5);
  }

  const yExtent = d3.extent(yValues) as [number, number];
  const yScale = d3.scaleLinear()
    .domain([Math.min(yExtent[0] * 1.1, 0), yExtent[1] * 1.1])
    .range([innerHeight, 0])
    .nice();

  const colorCategories = colorField
    ? [...new Set(rows.map((r) => String(r[colorField] ?? '')))]
    : [];
  const colorScale = d3.scaleOrdinal<string>()
    .domain(colorCategories)
    .range(COLOR_PALETTE);

  const sizeValues = sizeField
    ? getNumericValues(rows, sizeField)
    : [];
  const sizeScale = d3.scaleLinear()
    .domain(sizeValues.length > 0 ? d3.extent(sizeValues) as [number, number] : [0, 1])
    .range([MIN_RADIUS, MAX_RADIUS]);

  const xAxis = d3.axisBottom(xScale as d3.AxisScale<number | string>)
    .ticks(8)
    .tickSize(-innerHeight)
    .tickFormat((d) => String(d));

  const yAxis = d3.axisLeft(yScale)
    .ticks(8)
    .tickSize(-innerWidth);

  g.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0,${innerHeight})`)
    .call(xAxis as any)
    .selectAll('text')
    .style('font-size', '11px')
    .style('fill', '#546e7a');

  g.append('g')
    .attr('class', 'y-axis')
    .call(yAxis)
    .selectAll('text')
    .style('font-size', '11px')
    .style('fill', '#546e7a');

  g.selectAll('.x-axis .domain').style('stroke', '#cfd8dc');
  g.selectAll('.y-axis .domain').style('stroke', '#cfd8dc');
  g.selectAll('.x-axis .tick line').style('stroke', '#e0e0e0');
  g.selectAll('.y-axis .tick line').style('stroke', '#e0e0e0');

  g.append('text')
    .attr('class', 'x-label')
    .attr('x', innerWidth / 2)
    .attr('y', innerHeight + 45)
    .attr('text-anchor', 'middle')
    .style('font-size', '12px')
    .style('fill', '#37474f')
    .style('font-weight', '600')
    .text(xField);

  g.append('text')
    .attr('class', 'y-label')
    .attr('transform', 'rotate(-90)')
    .attr('x', -innerHeight / 2)
    .attr('y', -45)
    .attr('text-anchor', 'middle')
    .style('font-size', '12px')
    .style('fill', '#37474f')
    .style('font-weight', '600')
    .text(yField);

  const getX = (d: Record<string, string | number>) => {
    const val = d[xField];
    if (xNumeric) return (xScale as d3.ScaleLinear<number, number>)(val as number);
    return (xScale as d3.ScalePoint<string>)(String(val));
  };

  const getY = (d: Record<string, string | number>) =>
    yScale(d[yField] as number);

  const getRadius = (d: Record<string, string | number>) => {
    if (!sizeField) return 8;
    const val = d[sizeField];
    if (typeof val !== 'number') return MIN_RADIUS;
    return sizeScale(val);
  };

  const getColor = (d: Record<string, string | number>) => {
    if (!colorField) return ACCENT_COLOR;
    return colorScale(String(d[colorField] ?? ''));
  };

  const validRows = rows.filter((d) => {
    const yVal = d[yField];
    if (typeof yVal !== 'number' || isNaN(yVal)) return false;
    if (xNumeric) {
      const xVal = d[xField];
      return typeof xVal === 'number' && !isNaN(xVal);
    }
    return true;
  });

  if (chartType === 'scatter') {
    renderScatter(g, validRows, getX, getY, getRadius, getColor, onDetailCard);
  } else if (chartType === 'line') {
    renderLine(g, validRows, getX, getY, getColor, onDetailCard, xNumeric);
  } else if (chartType === 'bar') {
    renderBar(g, validRows, getX, getY, getColor, onDetailCard, xNumeric, innerWidth, innerHeight);
  }

  const chartContent = g.node()?.parentElement;
  if (chartContent) {
    d3.select(chartContent)
      .transition()
      .duration(600)
      .ease(d3.easeCubicOut)
      .attr('opacity', 1);
  }
}

function addHoverBehavior(
  selection: d3.Selection<d3.BaseType, Record<string, string | number>, SVGGElement, unknown>
) {
  selection
    .on('mouseenter', function () {
      d3.select(this)
        .transition()
        .duration(150)
        .attr('transform', function () {
          const current = d3.select(this).attr('transform') || '';
          if (current.startsWith('translate')) return current;
          return current;
        })
        .style('filter', 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))')
        .attr('r', function () {
          const r = d3.select(this).attr('r');
          return r ? Number(r) * 1.2 : 10;
        });
    })
    .on('mouseleave', function () {
      d3.select(this)
        .transition()
        .duration(150)
        .style('filter', 'none')
        .attr('r', function (d) {
          const el = d3.select(this);
          return el.attr('data-original-r') || 8;
        });
    });
}

function addClickBehavior(
  selection: d3.Selection<d3.BaseType, Record<string, string | number>, SVGGElement, unknown>,
  svgEl: SVGSVGElement,
  onDetailCard: (data: DetailCardData | null) => void
) {
  selection.on('click', function (event: MouseEvent, d) {
    event.stopPropagation();
    const bbox = (this as SVGElement).getBoundingClientRect();
    const svgRect = svgEl.getBoundingClientRect();
    onDetailCard({
      row: d,
      x: bbox.left - svgRect.left + bbox.width / 2,
      y: bbox.top - svgRect.top,
    });
  });
}

function renderScatter(
  g: d3.Selection<SVGGElement, unknown, null, unknown>,
  rows: Record<string, string | number>[],
  getX: (d: Record<string, string | number>) => number,
  getY: (d: Record<string, string | number>) => number,
  getRadius: (d: Record<string, string | number>) => number,
  getColor: (d: Record<string, string | number>) => string,
  onDetailCard: (data: DetailCardData | null) => void
) {
  const svgEl = g.node()?.closest('svg') as SVGSVGElement;

  g.selectAll('.data-point')
    .data(rows)
    .join('circle')
    .attr('class', 'data-point')
    .attr('cx', (d) => getX(d))
    .attr('cy', (d) => getY(d))
    .attr('r', (d) => getRadius(d))
    .attr('fill', (d) => getColor(d))
    .attr('fill-opacity', 0.8)
    .attr('stroke', 'white')
    .attr('stroke-width', 1.5)
    .attr('data-original-r', (d) => getRadius(d))
    .style('cursor', 'pointer')
    .style('opacity', 0)
    .attr('transform', (d) => `translate(0, 20)`)
    .transition()
    .duration(400)
    .delay((_d, i) => i * 50)
    .ease(d3.easeCubicOut)
    .style('opacity', 1)
    .attr('transform', 'translate(0, 0)');

  const points = g.selectAll('.data-point');
  addHoverBehavior(points as d3.Selection<d3.BaseType, Record<string, string | number>, SVGGElement, unknown>);
  addClickBehavior(points as d3.Selection<d3.BaseType, Record<string, string | number>, SVGGElement, unknown>, svgEl, onDetailCard);
}

function renderLine(
  g: d3.Selection<SVGGElement, unknown, null, unknown>,
  rows: Record<string, string | number>[],
  getX: (d: Record<string, string | number>) => number,
  getY: (d: Record<string, string | number>) => number,
  getColor: (d: Record<string, string | number>) => string,
  onDetailCard: (data: DetailCardData | null) => void,
  xNumeric: boolean
) {
  const svgEl = g.node()?.closest('svg') as SVGSVGElement;

  const sorted = [...rows].sort((a, b) => {
    if (xNumeric) return (a[Object.keys(a)[0]] as number) - (b[Object.keys(b)[0]] as number);
    const xField = Object.keys(a)[0];
    return String(a[xField]).localeCompare(String(b[xField]));
  });

  const line = d3.line<Record<string, string | number>>()
    .x((d) => getX(d))
    .y((d) => getY(d))
    .curve(d3.curveMonotoneX);

  const path = g.append('path')
    .datum(sorted)
    .attr('fill', 'none')
    .attr('stroke', ACCENT_COLOR)
    .attr('stroke-width', 2)
    .attr('d', line);

  const totalLength = path.node()?.getTotalLength() ?? 0;
  path
    .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
    .attr('stroke-dashoffset', totalLength)
    .transition()
    .duration(800)
    .ease(d3.easeCubicOut)
    .attr('stroke-dashoffset', 0);

  g.selectAll('.data-point')
    .data(sorted)
    .join('circle')
    .attr('class', 'data-point')
    .attr('cx', (d) => getX(d))
    .attr('cy', (d) => getY(d))
    .attr('r', 5)
    .attr('fill', ACCENT_COLOR)
    .attr('stroke', 'white')
    .attr('stroke-width', 2)
    .attr('data-original-r', 5)
    .style('cursor', 'pointer')
    .style('opacity', 0)
    .transition()
    .duration(400)
    .delay((_d, i) => i * 50)
    .ease(d3.easeCubicOut)
    .style('opacity', 1);

  const points = g.selectAll('.data-point');
  addHoverBehavior(points as d3.Selection<d3.BaseType, Record<string, string | number>, SVGGElement, unknown>);
  addClickBehavior(points as d3.Selection<d3.BaseType, Record<string, string | number>, SVGGElement, unknown>, svgEl, onDetailCard);
}

function renderBar(
  g: d3.Selection<SVGGElement, unknown, null, unknown>,
  rows: Record<string, string | number>[],
  getX: (d: Record<string, string | number>) => number,
  getY: (d: Record<string, string | number>) => number,
  getColor: (d: Record<string, string | number>) => string,
  onDetailCard: (data: DetailCardData | null) => void,
  xNumeric: boolean,
  innerWidth: number,
  innerHeight: number
) {
  const svgEl = g.node()?.closest('svg') as SVGSVGElement;
  const barWidth = Math.max(4, Math.min(60, (innerWidth / rows.length) * 0.7));

  const yScale = d3.scaleLinear()
    .domain([0, d3.max(rows, (d) => d[Object.keys(d).find((k) => typeof d[k] === 'number') ?? ''] as number) ?? 0])
    .range([innerHeight, 0]);

  const actualGetY = getY;

  g.selectAll('.data-point')
    .data(rows)
    .join('rect')
    .attr('class', 'data-point')
    .attr('x', (d) => getX(d) - barWidth / 2)
    .attr('width', barWidth)
    .attr('y', innerHeight)
    .attr('height', 0)
    .attr('fill', (d) => getColor(d))
    .attr('fill-opacity', 0.85)
    .attr('rx', 2)
    .attr('data-original-r', 5)
    .style('cursor', 'pointer')
    .transition()
    .duration(400)
    .delay((_d, i) => i * 50)
    .ease(d3.easeCubicOut)
    .attr('y', (d) => actualGetY(d))
    .attr('height', (d) => innerHeight - actualGetY(d));

  const bars = g.selectAll('.data-point');
  bars
    .on('mouseenter', function () {
      d3.select(this)
        .transition()
        .duration(150)
        .style('filter', 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))')
        .attr('fill-opacity', 1);
    })
    .on('mouseleave', function () {
      d3.select(this)
        .transition()
        .duration(150)
        .style('filter', 'none')
        .attr('fill-opacity', 0.85);
    });

  addClickBehavior(bars as d3.Selection<d3.BaseType, Record<string, string | number>, SVGGElement, unknown>, svgEl, onDetailCard);
}

export function setupCanvasClick(
  container: SVGSVGElement | null,
  onDetailCard: (data: DetailCardData | null) => void
) {
  if (!container) return;
  d3.select(container).on('click', () => {
    onDetailCard(null);
  });
}
