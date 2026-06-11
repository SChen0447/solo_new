import { ChartEngine } from './chartEngine';
import { InteractionHandler } from './interaction';
import { generateKlineData, formatPrice } from './dataFetcher';
import type { Candle } from './dataFetcher';

let engine: ChartEngine | null = null;
let interaction: InteractionHandler | null = null;
let resizeObserver: ResizeObserver | null = null;

function updateHeaderPrice(data: Candle[]): void {
  const priceEl = document.getElementById('currentPrice');
  const changeEl = document.getElementById('priceChange');
  if (!priceEl || !changeEl || data.length < 2) return;

  const last = data[data.length - 1];
  const first = data[0];
  const chg = last.close - first.close;
  const chgPct = (chg / first.close) * 100;
  const isUp = chg >= 0;

  priceEl.textContent = formatPrice(last.close);
  priceEl.className = `price ${isUp ? 'up' : 'down'}`;

  const sign = isUp ? '+' : '';
  changeEl.textContent = `${sign}${formatPrice(Math.abs(chg))} (${sign}${chgPct.toFixed(2)}%)`;
  changeEl.className = `change ${isUp ? 'up' : 'down'}`;
}

function init(): void {
  const canvas = document.getElementById('chartCanvas') as HTMLCanvasElement | null;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  canvas.style.cursor = 'crosshair';

  const data = generateKlineData(500);

  engine = new ChartEngine(canvas);
  engine.setData(data);
  engine.startRenderLoop();

  interaction = new InteractionHandler(canvas, engine);

  resizeObserver = new ResizeObserver(() => {
    engine?.resize();
  });
  resizeObserver.observe(canvas);

  requestAnimationFrame(() => {
    engine?.resize();
  });

  updateHeaderPrice(data);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

window.addEventListener('beforeunload', () => {
  resizeObserver?.disconnect();
  interaction?.destroy();
  engine?.stopRenderLoop();
});
