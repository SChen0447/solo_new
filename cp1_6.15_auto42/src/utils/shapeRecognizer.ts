import type { Point } from '@/store/useAppStore';

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RecognizeResult {
  type: 'rectangle' | 'circle' | 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
}

function distance(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function perpendicularDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return distance(point, lineStart);
  const t = Math.max(0, Math.min(1, ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lenSq));
  const proj: Point = { x: lineStart.x + t * dx, y: lineStart.y + t * dy };
  return distance(point, proj);
}

function simplifyPath(points: Point[], tolerance: number): Point[] {
  if (points.length <= 2) return points;
  let maxDist = 0;
  let maxIndex = 0;
  const first = points[0];
  const last = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], first, last);
    if (d > maxDist) {
      maxDist = d;
      maxIndex = i;
    }
  }
  if (maxDist > tolerance) {
    const left = simplifyPath(points.slice(0, maxIndex + 1), tolerance);
    const right = simplifyPath(points.slice(maxIndex), tolerance);
    return left.slice(0, -1).concat(right);
  }
  return [first, last];
}

function calculateBoundingBox(points: Point[]): BoundingBox {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function calculatePathLength(points: Point[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    len += distance(points[i - 1], points[i]);
  }
  return len;
}

function calculateArea(points: Point[]): number {
  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area) / 2;
}

function countCorners(simplified: Point[], angleThreshold: number): number {
  let corners = 0;
  for (let i = 1; i < simplified.length - 1; i++) {
    const v1x = simplified[i].x - simplified[i - 1].x;
    const v1y = simplified[i].y - simplified[i - 1].y;
    const v2x = simplified[i + 1].x - simplified[i].x;
    const v2y = simplified[i + 1].y - simplified[i].y;
    const dot = v1x * v2x + v1y * v2y;
    const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
    const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);
    if (mag1 === 0 || mag2 === 0) continue;
    const cosAngle = dot / (mag1 * mag2);
    const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
    if (angle < angleThreshold) {
      corners++;
    }
  }
  return corners;
}

export function recognizeShape(points: Point[]): RecognizeResult {
  if (points.length < 3) {
    return { type: 'text', x: points[0]?.x ?? 0, y: points[0]?.y ?? 0, width: 100, height: 30, text: 'Text' };
  }

  const bbox = calculateBoundingBox(points);
  const pathLen = calculatePathLength(points);
  const startEndDist = distance(points[0], points[points.length - 1]);
  const closure = pathLen > 0 ? 1 - startEndDist / pathLen : 0;
  const area = calculateArea(points);
  const bboxArea = bbox.width * bbox.height;
  const fillRatio = bboxArea > 0 ? area / bboxArea : 0;
  const circularity = pathLen > 0 ? (4 * Math.PI * area) / (pathLen * pathLen) : 0;

  const simplified = simplifyPath(points, 8);
  const corners = countCorners(simplified, Math.PI * 0.65);

  if (closure < 0.25 && bbox.height < 40 && bbox.width > bbox.height * 2) {
    return {
      type: 'text',
      x: bbox.x,
      y: bbox.y,
      width: Math.max(bbox.width, 80),
      height: Math.max(bbox.height, 30),
      text: 'Text',
    };
  }

  if (closure >= 0.25) {
    if (circularity > 0.55 && corners < 3) {
      return {
        type: 'circle',
        x: bbox.x,
        y: bbox.y,
        width: Math.max(bbox.width, 40),
        height: Math.max(bbox.height, 40),
      };
    }

    if (corners >= 3 || fillRatio > 0.5) {
      return {
        type: 'rectangle',
        x: bbox.x,
        y: bbox.y,
        width: Math.max(bbox.width, 40),
        height: Math.max(bbox.height, 30),
      };
    }
  }

  if (bbox.height < 50 && bbox.width > bbox.height * 1.5) {
    return {
      type: 'text',
      x: bbox.x,
      y: bbox.y,
      width: Math.max(bbox.width, 80),
      height: Math.max(bbox.height, 30),
      text: 'Text',
    };
  }

  return {
    type: 'rectangle',
    x: bbox.x,
    y: bbox.y,
    width: Math.max(bbox.width, 40),
    height: Math.max(bbox.height, 30),
  };
}

export function generateCode(shapes: { id: string; type: string; x: number; y: number; width: number; height: number; style: { backgroundColor: string; borderRadius: number }; text?: string }[]): string {
  if (shapes.length === 0) {
    return '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Sketch2Code</title>\n  <style>\n    * { margin: 0; padding: 0; box-sizing: border-box; }\n    body { min-width: 480px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }\n  </style>\n</head>\n<body>\n  <!-- No shapes detected -->\n</body>\n</html>';
  }

  const sorted = [...shapes].sort((a, b) => a.y - b.y || a.x - b.x);

  const rows: typeof shapes[] = [];
  let currentRow: typeof shapes = [];
  let rowBottom = 0;

  for (const shape of sorted) {
    if (currentRow.length === 0 || shape.y < rowBottom) {
      currentRow.push(shape);
      rowBottom = Math.max(rowBottom, shape.y + shape.height);
    } else {
      rows.push(currentRow);
      currentRow = [shape];
      rowBottom = shape.y + shape.height;
    }
  }
  if (currentRow.length > 0) rows.push(currentRow);

  let html = '';
  let css = '';

  css += `    * { margin: 0; padding: 0; box-sizing: border-box; }\n`;
  css += `    body {\n      min-width: 480px;\n      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;\n      padding: 20px;\n      background: #ffffff;\n    }\n`;
  css += `    .container {\n      display: flex;\n      flex-direction: column;\n      gap: 16px;\n      max-width: 1200px;\n      margin: 0 auto;\n    }\n`;
  css += `    .row {\n      display: flex;\n      gap: 12px;\n      flex-wrap: wrap;\n    }\n`;

  rows.forEach((row, ri) => {
    css += `    .row-${ri} { align-items: flex-start; }\n`;
    html += `    <div class="row row-${ri}">\n`;
    row.forEach((shape) => {
      const baseStyle = `width: ${Math.round(shape.width)}px; height: ${Math.round(shape.height)}px; background-color: ${shape.style.backgroundColor}; border-radius: ${shape.style.borderRadius}px;`;
      if (shape.type === 'circle') {
        css += `    .${shape.id} {\n      ${baseStyle} border-radius: 50%;\n    }\n`;
      } else if (shape.type === 'text') {
        css += `    .${shape.id} {\n      ${baseStyle} display: flex; align-items: center; justify-content: center; font-size: 14px; color: #2c3e50;\n    }\n`;
      } else {
        css += `    .${shape.id} {\n      ${baseStyle}\n    }\n`;
      }
      const textContent = shape.type === 'text' ? (shape.text ?? 'Text') : '';
      html += `      <div class="${shape.id}" data-shape-id="${shape.id}">${textContent}</div>\n`;
    });
    html += `    </div>\n`;
  });

  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sketch2Code</title>
  <style>
${css}  </style>
</head>
<body>
  <div class="container">
${html}  </div>
</body>
</html>`;

  return fullHtml;
}

export function highlightCode(code: string): string {
  const escaped = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  let result = escaped
    .replace(/(&lt;\/?)([\w-]+)/g, '$1<span class="hl-tag">$2</span>')
    .replace(/([\w-]+)(=)/g, '<span class="hl-attr">$1</span>$2')
    .replace(/"([^"]*)"/g, '"<span class="hl-val">$1</span>"')
    .replace(/\/\*[\s\S]*?\*\//g, '<span class="hl-comment">$&</span>')
    .replace(/&lt;!--[\s\S]*?--&gt;/g, '<span class="hl-comment">$&</span>');

  result = result.replace(
    /(\b(display|flex|direction|gap|max-width|margin|padding|background|background-color|border-radius|width|height|font-family|font-size|color|min-width|align-items|justify-content|box-sizing|flex-wrap)\b)(\s*:)/g,
    '<span class="hl-prop">$1</span>$3'
  );
  result = result.replace(
    /(:\s*)([\w-]+)(\s*[;{])/g,
    (match, before, value, after) => {
      if (value.match(/^(flex|column|row|wrap|center|start|end|border-box|none|auto|solid|dashed)$/)) {
        return `${before}<span class="hl-value">${value}</span>${after}`;
      }
      return match;
    }
  );

  return result;
}
