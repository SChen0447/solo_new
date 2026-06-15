import { useEffect, useRef } from 'react';
import { useAppStore } from './store';
import {
  PIXEL_WIDTH,
  PIXEL_HEIGHT,
  PIXEL_CELL_SIZE,
  PALETTE_COLORS,
} from './types';

export function PixelPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrames = useAppStore((s) => s.animationFrames);
  const currentFrameIndex = useAppStore((s) => s.currentFrameIndex);
  const pixelColorPicker = useAppStore((s) => s.pixelColorPicker);
  const setPixelColor = useAppStore((s) => s.setPixelColor);
  const openPixelColorPicker = useAppStore((s) => s.openPixelColorPicker);
  const closePixelColorPicker = useAppStore((s) => s.closePixelColorPicker);
  const viewMode = useAppStore((s) => s.viewMode);

  const DISPLAY_W = PIXEL_WIDTH * PIXEL_CELL_SIZE; // 576
  const DISPLAY_H = PIXEL_HEIGHT * PIXEL_CELL_SIZE; // 384

  // 渲染当前帧到canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const matrix = animationFrames[currentFrameIndex];
    if (!matrix) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, DISPLAY_W, DISPLAY_H);
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== DISPLAY_W * dpr) {
      canvas.width = DISPLAY_W * dpr;
      canvas.height = DISPLAY_H * dpr;
      canvas.style.width = `${DISPLAY_W}px`;
      canvas.style.height = `${DISPLAY_H}px`;
      ctx.scale(dpr, dpr);
    }

    // 白背景
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, DISPLAY_W, DISPLAY_H);

    // 绘制像素
    for (let y = 0; y < matrix.length; y++) {
      for (let x = 0; x < matrix[y].length; x++) {
        const c = matrix[y][x];
        if (c) {
          ctx.fillStyle = c;
          ctx.fillRect(
            x * PIXEL_CELL_SIZE,
            y * PIXEL_CELL_SIZE,
            PIXEL_CELL_SIZE,
            PIXEL_CELL_SIZE,
          );
        }
      }
    }

    // 网格线（仅像素编辑模式）
    if (viewMode === 'pixel-grid') {
      ctx.strokeStyle = 'rgba(150, 150, 150, 0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= PIXEL_WIDTH; x++) {
        const px = x * PIXEL_CELL_SIZE + 0.5;
        ctx.moveTo(px, 0);
        ctx.lineTo(px, DISPLAY_H);
      }
      for (let y = 0; y <= PIXEL_HEIGHT; y++) {
        const py = y * PIXEL_CELL_SIZE + 0.5;
        ctx.moveTo(0, py);
        ctx.lineTo(DISPLAY_W, py);
      }
      ctx.stroke();

      // 高亮被选中的像素格（如果color picker打开）
      if (pixelColorPicker) {
        ctx.strokeStyle = '#6c5ce7';
        ctx.lineWidth = 2;
        ctx.strokeRect(
          pixelColorPicker.pixelX * PIXEL_CELL_SIZE + 1,
          pixelColorPicker.pixelY * PIXEL_CELL_SIZE + 1,
          PIXEL_CELL_SIZE - 2,
          PIXEL_CELL_SIZE - 2,
        );
      }
    }
  }, [animationFrames, currentFrameIndex, viewMode, pixelColorPicker, DISPLAY_W, DISPLAY_H]);

  // 点击像素格，弹出颜色选择器
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (viewMode !== 'pixel-grid') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = Math.floor((e.clientX - rect.left) / PIXEL_CELL_SIZE);
    const py = Math.floor((e.clientY - rect.top) / PIXEL_CELL_SIZE);
    if (px < 0 || px >= PIXEL_WIDTH || py < 0 || py >= PIXEL_HEIGHT) return;
    openPixelColorPicker(e.clientX, e.clientY, px, py);
  };

  const handlePickColor = (color: string | null) => {
    if (!pixelColorPicker) return;
    setPixelColor(pixelColorPicker.pixelX, pixelColorPicker.pixelY, color);
    closePixelColorPicker();
  };

  if (animationFrames.length === 0) {
    return (
      <div className="canvas-wrapper" style={{ minHeight: 384 }}>
        <div
          style={{
            color: '#b2bec3',
            fontSize: 14,
            textAlign: 'center',
            padding: 48,
            lineHeight: 1.8,
          }}
        >
          <div style={{ fontSize: 42, marginBottom: 16 }}>🎨</div>
          在左侧画布绘制简笔画
          <br />
          点击"转换为像素动画"查看效果
        </div>
      </div>
    );
  }

  return (
    <div
      className="canvas-wrapper pixel-grid-container"
      style={{ minHeight: DISPLAY_H, padding: 0 }}
      onClick={(e) => {
        // 点击空白处关闭气泡
        if (e.target === e.currentTarget) closePixelColorPicker();
      }}
    >
      <canvas
        ref={canvasRef}
        className="pixel-grid"
        onClick={handleCanvasClick}
        style={{ display: 'block' }}
      />

      {pixelColorPicker && (
        <PixelColorPopup
          picker={pixelColorPicker}
          onPick={handlePickColor}
          onClose={closePixelColorPicker}
        />
      )}
    </div>
  );
}

function PixelColorPopup({
  picker,
  onPick,
  onClose,
}: {
  picker: { x: number; y: number; pixelX: number; pixelY: number };
  onPick: (c: string | null) => void;
  onClose: () => void;
}) {
  const popupRef = useRef<HTMLDivElement>(null);

  // 计算相对canvas-wrapper定位的位置，这里改为屏幕位置然后固定
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const el = popupRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // 转相对body的位置为fixed定位
  const top = picker.y + 12;
  const left = Math.max(12, Math.min(window.innerWidth - 210, picker.x - 20));

  return (
    <div
      ref={popupRef}
      className="pixel-color-popup"
      style={{
        position: 'fixed',
        top,
        left,
      }}
    >
      <div style={{ fontSize: 11, color: '#636e72', marginBottom: 2 }}>
        像素 ({picker.pixelX}, {picker.pixelY})
      </div>
      <div className="popup-colors">
        {PALETTE_COLORS.map((c) => (
          <div
            key={c}
            className="popup-swatch"
            style={{ backgroundColor: c }}
            onClick={() => onPick(c)}
            title={c}
          />
        ))}
      </div>
      <div className="popup-custom">
        <span className="popup-custom-label">自定义</span>
        <input
          type="color"
          className="popup-custom-input"
          onChange={(e) => onPick(e.target.value)}
          defaultValue="#6c5ce7"
        />
        <button className="popup-erase" onClick={() => onPick(null)}>
          🧹 擦除
        </button>
      </div>
    </div>
  );
}
