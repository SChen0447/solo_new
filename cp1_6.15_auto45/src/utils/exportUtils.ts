import type { PatternItem, GenerateOptions } from './patternEngine';

function drawShape(
  ctx: CanvasRenderingContext2D,
  pattern: PatternItem,
  _options: GenerateOptions
) {
  ctx.save();
  ctx.translate(pattern.x, pattern.y);
  ctx.rotate((pattern.rotation * Math.PI) / 180);

  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, pattern.size);
  gradient.addColorStop(0, pattern.color1);
  gradient.addColorStop(1, pattern.color2);
  ctx.fillStyle = gradient;
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 1;
  ctx.shadowColor = 'rgba(255,255,255,0.3)';
  ctx.shadowBlur = 3;

  const s = pattern.size / 2;
  ctx.beginPath();

  switch (pattern.shape) {
    case 'circle':
      ctx.arc(0, 0, s, 0, Math.PI * 2);
      break;
    case 'triangle':
      ctx.moveTo(0, -s);
      ctx.lineTo(-s * 0.866, s * 0.5);
      ctx.lineTo(s * 0.866, s * 0.5);
      ctx.closePath();
      break;
    case 'hexagon':
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        const px = s * Math.cos(angle);
        const py = s * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    case 'spiral': {
      const turns = 3;
      const totalAngle = turns * Math.PI * 2;
      const steps = 60;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const angle = t * totalAngle;
        const r = t * s;
        const px = r * Math.cos(angle);
        const py = r * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
      return;
    }
    case 'diamond':
      ctx.moveTo(0, -s);
      ctx.lineTo(s * 0.6, 0);
      ctx.lineTo(0, s);
      ctx.lineTo(-s * 0.6, 0);
      ctx.closePath();
      break;
    case 'ripple':
      for (let ring = 3; ring >= 1; ring--) {
        const r = (s * ring) / 3;
        ctx.moveTo(r, 0);
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        if (ring > 1) {
          ctx.moveTo(r - 1, 0);
        }
      }
      break;
    case 'star': {
      const points = 5;
      const inner = s * 0.4;
      for (let i = 0; i < points * 2; i++) {
        const angle = (Math.PI / points) * i - Math.PI / 2;
        const r = i % 2 === 0 ? s : inner;
        const px = r * Math.cos(angle);
        const py = r * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    }
    case 'irregularPolygon': {
      const sides = 5 + Math.floor(Math.abs(hashCode(pattern.id)) % 4);
      for (let i = 0; i < sides; i++) {
        const angle = (Math.PI * 2 * i) / sides;
        const r = s * (0.7 + 0.3 * Math.sin(i * 2.5));
        const px = r * Math.cos(angle);
        const py = r * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    }
    case 'cross':
      ctx.moveTo(-s * 0.3, -s);
      ctx.lineTo(s * 0.3, -s);
      ctx.lineTo(s * 0.3, -s * 0.3);
      ctx.lineTo(s, -s * 0.3);
      ctx.lineTo(s, s * 0.3);
      ctx.lineTo(s * 0.3, s * 0.3);
      ctx.lineTo(s * 0.3, s);
      ctx.lineTo(-s * 0.3, s);
      ctx.lineTo(-s * 0.3, s * 0.3);
      ctx.lineTo(-s, s * 0.3);
      ctx.lineTo(-s, -s * 0.3);
      ctx.lineTo(-s * 0.3, -s * 0.3);
      ctx.closePath();
      break;
    case 'arc':
      ctx.arc(0, 0, s, 0, Math.PI * 1.5);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
      return;
    case 'parallelogram':
      ctx.moveTo(-s * 0.5, -s * 0.6);
      ctx.lineTo(s * 0.8, -s * 0.6);
      ctx.lineTo(s * 0.5, s * 0.6);
      ctx.lineTo(-s * 0.8, s * 0.6);
      ctx.closePath();
      break;
    case 'pentagon':
      for (let i = 0; i < 5; i++) {
        const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
        const px = s * Math.cos(angle);
        const py = s * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    case 'semicircle':
      ctx.arc(0, 0, s, Math.PI, 0);
      ctx.closePath();
      break;
    case 'zigzag': {
      const segs = 6;
      for (let i = 0; i <= segs; i++) {
        const px = -s + (2 * s * i) / segs;
        const py = i % 2 === 0 ? -s * 0.5 : s * 0.5;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
      return;
    }
    case 'petal': {
      const petals = 5;
      for (let i = 0; i < petals; i++) {
        const angle = (Math.PI * 2 * i) / petals;
        ctx.save();
        ctx.rotate(angle);
        ctx.ellipse(0, -s * 0.5, s * 0.25, s * 0.55, 0, 0, Math.PI * 2);
        ctx.restore();
      }
      break;
    }
  }

  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function renderToCanvas(
  patterns: PatternItem[],
  options: GenerateOptions,
  width: number = 1920,
  height: number = 1080
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, width, height);

  const scaleX = width / 800;
  const scaleY = height / 600;

  ctx.save();
  ctx.scale(scaleX, scaleY);

  for (const p of patterns) {
    drawShape(ctx, p, options);
  }

  ctx.restore();
  return canvas;
}

export function exportPNG(
  patterns: PatternItem[],
  options: GenerateOptions
): Blob {
  const canvas = renderToCanvas(patterns, options, 1920, 1080);
  return new Promise<Blob>((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/png');
  }) as unknown as Blob;
}

export function exportPNGAsync(
  patterns: PatternItem[],
  options: GenerateOptions
): Promise<Blob> {
  const canvas = renderToCanvas(patterns, options, 1920, 1080);
  return new Promise<Blob>((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/png');
  });
}

function shapeToSVGPath(pattern: PatternItem): string {
  const s = pattern.size / 2;
  switch (pattern.shape) {
    case 'circle':
      return `<circle cx="0" cy="0" r="${s}" />`;
    case 'triangle':
      return `<polygon points="0,${-s} ${-s * 0.866},${s * 0.5} ${s * 0.866},${s * 0.5}" />`;
    case 'hexagon': {
      const pts = Array.from({ length: 6 }, (_, i) => {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        return `${s * Math.cos(angle)},${s * Math.sin(angle)}`;
      });
      return `<polygon points="${pts.join(' ')}" />`;
    }
    case 'diamond':
      return `<polygon points="0,${-s} ${s * 0.6},0 0,${s} ${-s * 0.6},0" />`;
    case 'star': {
      const points = 5;
      const inner = s * 0.4;
      const pts = Array.from({ length: points * 2 }, (_, i) => {
        const angle = (Math.PI / points) * i - Math.PI / 2;
        const r = i % 2 === 0 ? s : inner;
        return `${r * Math.cos(angle)},${r * Math.sin(angle)}`;
      });
      return `<polygon points="${pts.join(' ')}" />`;
    }
    case 'pentagon': {
      const pts = Array.from({ length: 5 }, (_, i) => {
        const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
        return `${s * Math.cos(angle)},${s * Math.sin(angle)}`;
      });
      return `<polygon points="${pts.join(' ')}" />`;
    }
    case 'cross': {
      const w = s * 0.3;
      return `<polygon points="${-w},${-s} ${w},${-s} ${w},${-w} ${s},${-w} ${s},${w} ${w},${w} ${w},${s} ${-w},${s} ${-w},${w} ${-s},${w} ${-s},${-w} ${-w},${-w}" />`;
    }
    case 'parallelogram':
      return `<polygon points="${-s * 0.5},${-s * 0.6} ${s * 0.8},${-s * 0.6} ${s * 0.5},${s * 0.6} ${-s * 0.8},${s * 0.6}" />`;
    case 'semicircle':
      return `<path d="M ${-s} 0 A ${s} ${s} 0 0 1 ${s} 0 Z" />`;
    case 'spiral': {
      const steps = 60;
      const turns = 3;
      const totalAngle = turns * Math.PI * 2;
      const d = Array.from({ length: steps + 1 }, (_, i) => {
        const t = i / steps;
        const angle = t * totalAngle;
        const r = t * s;
        return `${i === 0 ? 'M' : 'L'} ${(r * Math.cos(angle)).toFixed(1)} ${(r * Math.sin(angle)).toFixed(1)}`;
      }).join(' ');
      return `<path d="${d}" fill="none" stroke="url(#grad-${pattern.id})" stroke-width="2" />`;
    }
    case 'ripple': {
      return [3, 2, 1]
        .map((ring) => {
          const r = (s * ring) / 3;
          return `<circle cx="0" cy="0" r="${r}" fill="none" />`;
        })
        .join('');
    }
    case 'arc':
      return `<path d="M ${s} 0 A ${s} ${s} 0 1 1 0 ${-s}" fill="none" stroke="url(#grad-${pattern.id})" stroke-width="3" />`;
    case 'zigzag': {
      const segs = 6;
      const d = Array.from({ length: segs + 1 }, (_, i) => {
        const px = -s + (2 * s * i) / segs;
        const py = i % 2 === 0 ? -s * 0.5 : s * 0.5;
        return `${i === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`;
      }).join(' ');
      return `<path d="${d}" fill="none" stroke="url(#grad-${pattern.id})" stroke-width="3" />`;
    }
    case 'irregularPolygon': {
      const sides = 5 + (Math.abs(hashCode(pattern.id)) % 4);
      const pts = Array.from({ length: sides }, (_, i) => {
        const angle = (Math.PI * 2 * i) / sides;
        const r = s * (0.7 + 0.3 * Math.sin(i * 2.5));
        return `${(r * Math.cos(angle)).toFixed(1)} ${(r * Math.sin(angle)).toFixed(1)}`;
      });
      return `<polygon points="${pts.join(' ')}" />`;
    }
    case 'petal': {
      const petals = 5;
      return Array.from({ length: petals }, (_, i) => {
        const angle = (Math.PI * 2 * i) / petals;
        const deg = (angle * 180) / Math.PI;
        return `<ellipse cx="0" cy="${-s * 0.5}" rx="${s * 0.25}" ry="${s * 0.55}" transform="rotate(${deg})" />`;
      }).join('');
    }
    default:
      return `<circle cx="0" cy="0" r="${s}" />`;
  }
}

export function exportSVG(
  patterns: PatternItem[],
  options: GenerateOptions
): Blob {
  const width = 1920;
  const height = 1080;
  const scaleX = width / 800;
  const scaleY = height / 600;

  const defs = patterns
    .map(
      (p) => `
    <radialGradient id="grad-${p.id}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${p.color1}" />
      <stop offset="100%" stop-color="${p.color2}" />
    </radialGradient>`
    )
    .join('');

  const shapes = patterns
    .map((p) => {
      const tx = p.x * scaleX;
      const ty = p.y * scaleY;
      const rot = p.rotation;
      return `<g transform="translate(${tx.toFixed(1)},${ty.toFixed(1)}) rotate(${rot})" fill="url(#grad-${p.id})" stroke="rgba(255,255,255,0.3)" stroke-width="1">
      ${shapeToSVGPath(p)}
    </g>`;
    })
    .join('\n');

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>${defs}</defs>
  ${shapes}
</svg>`;

  return new Blob([svg], { type: 'image/svg+xml' });
}
