import { useRef, useCallback, useEffect } from 'react';
import { saveAs } from 'file-saver';
import type { FontStyle } from '../store/posterStore';

const PIXEL_FONT: Record<string, number[][]> = {
  'A': [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],
  'B': [[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0]],
  'C': [[0,1,1,1,1],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[0,1,1,1,1]],
  'D': [[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0]],
  'E': [[1,1,1,1,1],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,0],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,1]],
  'F': [[1,1,1,1,1],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0]],
  'G': [[0,1,1,1,1],[1,0,0,0,0],[1,0,0,0,0],[1,0,1,1,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,1]],
  'H': [[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],
  'I': [[0,1,1,1,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,1,1,1,0]],
  'J': [[0,0,1,1,1],[0,0,0,1,0],[0,0,0,1,0],[0,0,0,1,0],[0,0,0,1,0],[1,0,0,1,0],[0,1,1,0,0]],
  'K': [[1,0,0,0,1],[1,0,0,1,0],[1,0,1,0,0],[1,1,0,0,0],[1,0,1,0,0],[1,0,0,1,0],[1,0,0,0,1]],
  'L': [[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,1]],
  'M': [[1,0,0,0,1],[1,1,0,1,1],[1,0,1,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],
  'N': [[1,0,0,0,1],[1,1,0,0,1],[1,0,1,0,1],[1,0,0,1,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],
  'O': [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  'P': [[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0]],
  'Q': [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,1,0,1],[1,0,0,1,0],[0,1,1,0,1]],
  'R': [[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0],[1,0,1,0,0],[1,0,0,1,0],[1,0,0,0,1]],
  'S': [[0,1,1,1,1],[1,0,0,0,0],[1,0,0,0,0],[0,1,1,1,0],[0,0,0,0,1],[0,0,0,0,1],[1,1,1,1,0]],
  'T': [[1,1,1,1,1],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],
  'U': [[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  'V': [[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0]],
  'W': [[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,1,0,1],[1,1,0,1,1],[1,0,0,0,1]],
  'X': [[1,0,0,0,1],[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0],[0,1,0,1,0],[1,0,0,0,1],[1,0,0,0,1]],
  'Y': [[1,0,0,0,1],[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],
  'Z': [[1,1,1,1,1],[0,0,0,0,1],[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0],[1,0,0,0,0],[1,1,1,1,1]],
  '0': [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,1,1],[1,0,1,0,1],[1,1,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  '1': [[0,0,1,0,0],[0,1,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,1,1,1,0]],
  '2': [[0,1,1,1,0],[1,0,0,0,1],[0,0,0,0,1],[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0],[1,1,1,1,1]],
  '3': [[0,1,1,1,0],[1,0,0,0,1],[0,0,0,0,1],[0,0,1,1,0],[0,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  '4': [[0,0,0,1,0],[0,0,1,1,0],[0,1,0,1,0],[1,0,0,1,0],[1,1,1,1,1],[0,0,0,1,0],[0,0,0,1,0]],
  '5': [[1,1,1,1,1],[1,0,0,0,0],[1,1,1,1,0],[0,0,0,0,1],[0,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  '6': [[0,0,1,1,0],[0,1,0,0,0],[1,0,0,0,0],[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  '7': [[1,1,1,1,1],[0,0,0,0,1],[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0],[0,1,0,0,0],[0,1,0,0,0]],
  '8': [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  '9': [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,1],[0,0,0,0,1],[0,0,0,1,0],[0,1,1,0,0]],
  ' ': [[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]],
  '!': [[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,0,0,0],[0,0,1,0,0]],
  '?': [[0,1,1,1,0],[1,0,0,0,1],[0,0,0,0,1],[0,0,0,1,0],[0,0,1,0,0],[0,0,0,0,0],[0,0,1,0,0]],
  '-': [[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,1,1,1,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]],
  '_': [[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,1,1,1,0]],
  '.': [[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,1,0,0]],
  ',': [[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,1,0,0],[0,1,0,0,0]],
  ':': [[0,0,0,0,0],[0,0,1,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,1,0,0],[0,0,0,0,0],[0,0,0,0,0]],
  ';': [[0,0,0,0,0],[0,0,1,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,1,0,0,0]],
  "'": [[0,0,1,0,0],[0,0,1,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]],
  '"': [[0,1,0,1,0],[0,1,0,1,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]],
  '/': [[0,0,0,0,1],[0,0,0,1,0],[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0],[0,1,0,0,0],[1,0,0,0,0]],
  '\\': [[1,0,0,0,0],[0,1,0,0,0],[0,1,0,0,0],[0,0,1,0,0],[0,0,0,1,0],[0,0,0,1,0],[0,0,0,0,1]],
  '(': [[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0],[0,1,0,0,0],[0,1,0,0,0],[0,0,1,0,0],[0,0,0,1,0]],
  ')': [[0,1,0,0,0],[0,0,1,0,0],[0,0,0,1,0],[0,0,0,1,0],[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0]],
  '*': [[0,0,0,0,0],[1,0,1,0,1],[0,1,1,1,0],[1,1,0,1,1],[0,1,1,1,0],[1,0,1,0,1],[0,0,0,0,0]],
  '+': [[0,0,0,0,0],[0,0,1,0,0],[0,0,1,0,0],[1,1,1,1,1],[0,0,1,0,0],[0,0,1,0,0],[0,0,0,0,0]],
  '=': [[0,0,0,0,0],[0,0,0,0,0],[0,1,1,1,0],[0,0,0,0,0],[0,1,1,1,0],[0,0,0,0,0],[0,0,0,0,0]],
  '<': [[0,0,0,0,1],[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0],[0,0,1,0,0],[0,0,0,1,0],[0,0,0,0,1]],
  '>': [[1,0,0,0,0],[0,1,0,0,0],[0,0,1,0,0],[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0],[1,0,0,0,0]],
  '#': [[0,1,0,1,0],[0,1,0,1,0],[1,1,1,1,1],[0,1,0,1,0],[1,1,1,1,1],[0,1,0,1,0],[0,1,0,1,0]],
  '@': [[0,1,1,1,0],[1,0,0,0,1],[1,0,1,1,1],[1,0,1,0,1],[1,0,1,1,1],[1,0,0,0,0],[0,1,1,1,0]],
  '&': [[0,1,1,0,0],[1,0,0,1,0],[1,0,0,1,0],[0,1,1,1,0],[1,0,1,0,0],[1,0,0,1,0],[0,1,1,0,1]],
  '[': [[0,1,1,1,0],[0,1,0,0,0],[0,1,0,0,0],[0,1,0,0,0],[0,1,0,0,0],[0,1,0,0,0],[0,1,1,1,0]],
  ']': [[0,1,1,1,0],[0,0,0,1,0],[0,0,0,1,0],[0,0,0,1,0],[0,0,0,1,0],[0,0,0,1,0],[0,1,1,1,0]],
  '{': [[0,0,0,1,0],[0,0,1,0,0],[0,0,1,0,0],[0,1,0,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,0,1,0]],
  '}': [[0,1,0,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,0,1,0],[0,0,1,0,0],[0,0,1,0,0],[0,1,0,0,0]],
  '|': [[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],
  '~': [[0,0,0,0,0],[0,1,1,0,1],[1,0,0,1,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]],
  '^': [[0,0,1,0,0],[0,1,0,1,0],[1,0,0,0,1],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]],
  '%': [[1,1,0,0,1],[1,1,0,1,0],[0,0,1,0,0],[0,1,0,1,1],[1,0,0,1,1],[0,0,0,0,0],[0,0,0,0,0]],
  '$': [[0,0,1,0,0],[0,1,1,1,1],[1,0,1,0,0],[0,1,1,1,0],[0,0,1,0,1],[1,1,1,1,0],[0,0,1,0,0]],
};

const CHAR_WIDTH = 5;
const CHAR_HEIGHT = 7;
const CHAR_SPACING = 4;

interface UseFontRendererOptions {
  text: string;
  fontStyle: FontStyle;
  fontSize: number;
  scale: number;
  offsetX: number;
  offsetY: number;
}

export function useFontRenderer(canvasRef: React.RefObject<HTMLCanvasElement>, options: UseFontRendererOptions) {
  const { text, fontStyle, fontSize, scale, offsetX, offsetY } = options;
  const opacityRef = useRef(1);
  const lastStyleRef = useRef<FontStyle>(fontStyle);
  const animationFrameRef = useRef<number | null>(null);
  const transitionStartTimeRef = useRef<number | null>(null);

  const getCharPattern = useCallback((char: string): number[][] => {
    const upperChar = char.toUpperCase();
    return PIXEL_FONT[upperChar] || PIXEL_FONT['?'];
  }, []);

  const getPixelSize = useCallback((fSize: number) => {
    return Math.max(2, Math.floor(fSize / CHAR_HEIGHT));
  }, []);

  const renderPixel = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    pixelSize: number,
    color: string,
    alpha: number,
    jitter: { x: number; y: number } | null
  ) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    const px = jitter ? x + jitter.x : x;
    const py = jitter ? y + jitter.y : y;
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(px), Math.round(py), pixelSize, pixelSize);
    ctx.restore();
  }, []);

  const renderChar = useCallback((
    ctx: CanvasRenderingContext2D,
    char: string,
    startX: number,
    startY: number,
    pixelSize: number,
    style: FontStyle,
    renderScale: number = 1
  ) => {
    const pattern = getCharPattern(char);
    const actualPixelSize = pixelSize * renderScale;
    const actualSpacing = 1 * renderScale;

    for (let row = 0; row < CHAR_HEIGHT; row++) {
      for (let col = 0; col < CHAR_WIDTH; col++) {
        if (pattern[row][col] === 1) {
          const x = startX + col * (actualPixelSize + actualSpacing);
          const y = startY + row * (actualPixelSize + actualSpacing);

          if (style === 'pixel') {
            renderPixel(ctx, x, y, actualPixelSize, '#00e5ff', 1, null);
          } else if (style === 'neon') {
            ctx.save();
            ctx.shadowColor = '#ff00ff';
            ctx.shadowBlur = 6 * renderScale;
            const gradient = ctx.createLinearGradient(0, y, 0, y + actualPixelSize);
            gradient.addColorStop(0, '#ff00ff');
            gradient.addColorStop(1, '#00e5ff');
            ctx.fillStyle = gradient;
            ctx.fillRect(Math.round(x), Math.round(y), actualPixelSize, actualPixelSize);
            ctx.restore();
          } else if (style === 'handwrite') {
            const jitterX = (Math.random() - 0.5) * 2 * renderScale;
            const jitterY = (Math.random() - 0.5) * 2 * renderScale;
            const alpha = 0.7 + Math.random() * 0.3;
            renderPixel(ctx, x, y, actualPixelSize, '#00e5ff', alpha, { x: jitterX, y: jitterY });
          }
        }
      }
    }
  }, [getCharPattern, renderPixel]);

  const calculateTextWidth = useCallback((txt: string, pixelSize: number, renderScale: number = 1) => {
    const actualPixelSize = pixelSize * renderScale;
    const actualSpacing = 1 * renderScale;
    const charWidth = CHAR_WIDTH * (actualPixelSize + actualSpacing);
    const spacingPx = CHAR_SPACING * renderScale;
    return txt.length * charWidth + Math.max(0, txt.length - 1) * spacingPx;
  }, []);

  const render = useCallback((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, renderScale: number = 1) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const pixelSize = getPixelSize(fontSize);
    const totalWidth = calculateTextWidth(text, pixelSize, renderScale);
    const actualPixelSize = pixelSize * renderScale;
    const actualSpacing = 1 * renderScale;
    const totalHeight = CHAR_HEIGHT * (actualPixelSize + actualSpacing);

    let startX: number;
    let startY: number;

    if (renderScale === 1) {
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      startX = centerX - totalWidth / 2 + offsetX * scale;
      startY = centerY - totalHeight / 2 + offsetY * scale;
    } else {
      startX = (canvas.width - totalWidth) / 2;
      startY = (canvas.height - totalHeight) / 2;
    }

    ctx.save();
    if (renderScale === 1) {
      ctx.globalAlpha = opacityRef.current;
    }

    let currentX = startX;
    const charPixelWidth = CHAR_WIDTH * (actualPixelSize + actualSpacing);
    const spacingPx = CHAR_SPACING * renderScale;

    for (let i = 0; i < text.length; i++) {
      renderChar(ctx, text[i], currentX, startY, pixelSize, fontStyle, renderScale);
      currentX += charPixelWidth + spacingPx;
    }

    ctx.restore();
  }, [text, fontStyle, fontSize, scale, offsetX, offsetY, getPixelSize, calculateTextWidth, renderChar]);

  const animate = useCallback((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    if (transitionStartTimeRef.current !== null) {
      const elapsed = performance.now() - transitionStartTimeRef.current;
      const duration = 400;
      const progress = Math.min(elapsed / duration, 1);
      const fadeProgress = progress < 0.5 ? progress * 2 : 2 - progress * 2;
      opacityRef.current = 1 - fadeProgress;

      if (progress >= 0.5 && lastStyleRef.current !== fontStyle) {
        lastStyleRef.current = fontStyle;
      }

      if (progress >= 1) {
        transitionStartTimeRef.current = null;
        opacityRef.current = 1;
      }
    }

    render(ctx, canvas);

    if (transitionStartTimeRef.current !== null) {
      animationFrameRef.current = requestAnimationFrame(() => animate(ctx, canvas));
    }
  }, [fontStyle, render]);

  const triggerRender = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (lastStyleRef.current !== fontStyle && transitionStartTimeRef.current === null) {
      transitionStartTimeRef.current = performance.now();
    }
    lastStyleRef.current = fontStyle;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animate(ctx, canvas);
  }, [canvasRef, fontStyle, animate]);

  useEffect(() => {
    triggerRender();
    const handlePosterResize = () => {
      triggerRender();
    };
    window.addEventListener('poster-resize', handlePosterResize);
    return () => {
      window.removeEventListener('poster-resize', handlePosterResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [triggerRender]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    render(ctx, canvas);
  });

  const exportPNG = useCallback(async () => {
    const pixelSize = getPixelSize(fontSize);
    const exportScale = 4;
    const totalWidth = calculateTextWidth(text, pixelSize, exportScale);
    const actualPixelSize = pixelSize * exportScale;
    const actualSpacing = 1 * exportScale;
    const totalHeight = CHAR_HEIGHT * (actualPixelSize + actualSpacing);

    const padding = 40 * exportScale;
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = Math.ceil(totalWidth + padding * 2);
    exportCanvas.height = Math.ceil(totalHeight + padding * 2);
    const exportCtx = exportCanvas.getContext('2d');
    if (!exportCtx) return;

    exportCtx.imageSmoothingEnabled = false;

    const startX = padding;
    const startY = padding;
    const charPixelWidth = CHAR_WIDTH * (actualPixelSize + actualSpacing);
    const spacingPx = CHAR_SPACING * exportScale;

    let currentX = startX;
    for (let i = 0; i < text.length; i++) {
      renderChar(exportCtx, text[i], currentX, startY, pixelSize, fontStyle, exportScale);
      currentX += charPixelWidth + spacingPx;
    }

    const dataURL = exportCanvas.toDataURL('image/png');
    const base64Data = dataURL.replace(/^data:image\/png;base64,/, '');
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/png' });
    saveAs(blob, `pixel-poster-${Date.now()}.png`);
  }, [text, fontStyle, fontSize, getPixelSize, calculateTextWidth, renderChar]);

  return { exportPNG, triggerRender };
}
