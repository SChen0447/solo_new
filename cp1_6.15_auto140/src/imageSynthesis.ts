import { ANCIENT_COLORS, randomInt, randomFloat, getColorForKeyword, hexToRgb, AncientColorKey } from './utils';

export function synthesizeImage(
  keywords: string[],
  canvasId: string,
  width: number = 300,
  height: number = 200
): void {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
  if (!canvas) return;

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  drawBackground(ctx, width, height, keywords);
  drawBrushStrokes(ctx, width, height, keywords);
  addPaperTexture(ctx, width, height);
}

function drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number, keywords: string[]): void {
  const primaryColor = keywords.length > 0 ? getColorForKeyword(keywords[0]) : 'cyanine';
  const secondaryColor = keywords.length > 1 ? getColorForKeyword(keywords[1]) : 'paperWhite';

  const color1 = hexToRgb(ANCIENT_COLORS[primaryColor]);
  const color2 = hexToRgb(ANCIENT_COLORS.paperWhite);
  const color3 = hexToRgb(ANCIENT_COLORS[secondaryColor]);

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, `rgba(${color1.r}, ${color1.g}, ${color1.b}, 0.15)`);
  gradient.addColorStop(0.5, `rgba(${color2.r}, ${color2.g}, ${color2.b}, 0.9)`);
  gradient.addColorStop(1, `rgba(${color3.r}, ${color3.g}, ${color3.b}, 0.1)`);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const radialGradient = ctx.createRadialGradient(
    width / 2 + randomInt(-50, 50),
    height / 3 + randomInt(-30, 30),
    0,
    width / 2,
    height / 2,
    width / 2
  );
  radialGradient.addColorStop(0, 'rgba(255, 255, 240, 0.6)');
  radialGradient.addColorStop(1, 'rgba(255, 255, 240, 0)');

  ctx.fillStyle = radialGradient;
  ctx.fillRect(0, 0, width, height);
}

function drawBrushStrokes(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  keywords: string[]
): void {
  const strokeCount = randomInt(8, 15);
  const usedColors: AncientColorKey[] = ['inkBlack', 'inkGray', 'cyanine', 'ochre'];

  for (let i = 0; i < strokeCount; i++) {
    const colorKey = usedColors[randomInt(0, usedColors.length - 1)];
    const color = ANCIENT_COLORS[colorKey];

    if (keywords.length > 0 && i < keywords.length) {
      if (randomFloat(0, 1) > 0.3) {
        drawOrientedStroke(ctx, width, height, keywords[i], colorKey);
        continue;
      }
    }

    drawRandomStroke(ctx, width, height, color);
  }

  if (keywords.some((k) => k.includes('月') || k.includes('日'))) {
    drawCelestialBody(ctx, width, height);
  }

  if (keywords.some((k) => k.includes('山'))) {
    drawMountains(ctx, width, height);
  }
}

function drawOrientedStroke(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  _keyword: string,
  colorKey: AncientColorKey
): void {
  const color = ANCIENT_COLORS[colorKey];
  const rgb = hexToRgb(color);

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const startX = randomInt(0, width);
  const startY = randomInt(0, height);
  const endX = startX + randomInt(-80, 80);
  const endY = startY + randomInt(-60, 60);

  const cp1x = startX + randomInt(-30, 30);
  const cp1y = startY + randomInt(-30, 30);
  const cp2x = endX + randomInt(-30, 30);
  const cp2y = endY + randomInt(-30, 30);

  const baseWidth = randomInt(8, 25);

  for (let j = 0; j < 3; j++) {
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);

    ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${randomFloat(0.1, 0.4)})`;
    ctx.lineWidth = baseWidth + j * 3;
    ctx.stroke();
  }

  if (randomFloat(0, 1) > 0.6) {
    drawSplash(ctx, endX, endY, color);
  }
}

function drawRandomStroke(ctx: CanvasRenderingContext2D, width: number, height: number, color: string): void {
  const rgb = hexToRgb(color);

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const startX = randomInt(0, width);
  const startY = randomInt(0, height);
  const endX = startX + randomInt(-60, 60);
  const endY = startY + randomInt(-40, 40);

  const cp1x = startX + randomInt(-20, 20);
  const cp1y = startY + randomInt(-20, 20);
  const cp2x = endX + randomInt(-20, 20);
  const cp2y = endY + randomInt(-20, 20);

  for (let j = 0; j < 3; j++) {
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);

    ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${randomFloat(0.08, 0.3)})`;
    ctx.lineWidth = randomInt(5, 20) + j * 2;
    ctx.stroke();
  }
}

function drawSplash(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  const rgb = hexToRgb(color);
  const splashCount = randomInt(3, 8);

  for (let i = 0; i < splashCount; i++) {
    const angle = randomFloat(0, Math.PI * 2);
    const distance = randomInt(5, 20);
    const radius = randomFloat(1, 4);

    ctx.beginPath();
    ctx.arc(
      x + Math.cos(angle) * distance,
      y + Math.sin(angle) * distance,
      radius,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${randomFloat(0.2, 0.5)})`;
    ctx.fill();
  }
}

function drawCelestialBody(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const x = width * 0.75 + randomInt(-30, 30);
  const y = height * 0.25 + randomInt(-20, 20);
  const radius = randomInt(15, 25);

  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 2);
  gradient.addColorStop(0, 'rgba(255, 250, 230, 0.9)');
  gradient.addColorStop(0.5, 'rgba(255, 245, 200, 0.4)');
  gradient.addColorStop(1, 'rgba(255, 240, 180, 0)');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius * 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 250, 230, 0.95)';
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawMountains(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const baseY = height * 0.7;

  ctx.fillStyle = 'rgba(44, 95, 124, 0.25)';
  ctx.beginPath();
  ctx.moveTo(0, baseY);

  let x = 0;
  while (x < width) {
    const peakHeight = randomInt(30, 80);
    const peakWidth = randomInt(40, 100);
    ctx.lineTo(x + peakWidth / 2, baseY - peakHeight);
    ctx.lineTo(x + peakWidth, baseY);
    x += peakWidth;
  }

  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(44, 95, 124, 0.15)';
  ctx.beginPath();
  ctx.moveTo(0, baseY + 20);

  x = 0;
  while (x < width) {
    const peakHeight = randomInt(20, 50);
    const peakWidth = randomInt(30, 80);
    ctx.lineTo(x + peakWidth / 2, baseY + 20 - peakHeight);
    ctx.lineTo(x + peakWidth, baseY + 20);
    x += peakWidth;
  }

  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();
}

function addPaperTexture(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const noise = randomInt(-8, 8);
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
  }

  ctx.putImageData(imageData, 0, 0);

  const vignette = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width / 1.5);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(58, 50, 38, 0.1)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
}
