import { useEffect, useRef } from 'react';

interface FontPreviewProps {
  title: string;
  body: string;
  titleFont: string;
  bodyFont: string;
  fontSize: number;
  lineHeight: number;
  bgColor: string;
  titleColor?: string;
  bodyColor?: string;
}

const SAMPLE_TEXTS = [
  {
    title: '光影之间',
    body: '在城市的喧嚣中寻找宁静的角落，每一束光都是故事的开始。摄影师用镜头捕捉瞬间，将平凡化为永恒。这是一场关于时间、光影与情感的对话。'
  },
  {
    title: '自然之美',
    body: '山川湖海，日月星辰。大自然以其最原始的姿态展现着无与伦比的美丽。我们在行走中感受，在定格中珍藏，让每一个画面都成为永恒的记忆。'
  },
  {
    title: '人像故事',
    body: '每一张面孔背后都有独特的故事。眼神中闪烁的光芒，嘴角边微扬的弧度，都是生命最真实的表达。摄影让我们看见彼此，也看见自己。'
  }
];

export const FontPreview = ({
  titleFont,
  bodyFont,
  fontSize,
  lineHeight,
  bgColor,
  titleColor = '#333333',
  bodyColor = '#555555'
}: FontPreviewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textIndexRef = useRef(Math.floor(Math.random() * SAMPLE_TEXTS.length));

  const sampleText = SAMPLE_TEXTS[textIndexRef.current];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = 600;
    const height = 400;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    const padding = 50;
    const titleSize = fontSize * 1.8;
    const bodySize = fontSize;

    ctx.fillStyle = titleColor;
    ctx.font = `700 ${titleSize}px "${titleFont}", serif`;
    ctx.textBaseline = 'top';

    const title = sampleText.title;
    ctx.fillText(title, padding, padding);

    ctx.fillStyle = bodyColor;
    ctx.font = `400 ${bodySize}px "${bodyFont}", sans-serif`;
    ctx.textBaseline = 'top';

    const maxWidth = width - padding * 2;
    const bodyY = padding + titleSize * 1.5;
    const lineHeightPx = bodySize * lineHeight;

    const words = sampleText.body.split('');
    let line = '';
    let y = bodyY;

    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && i > 0) {
        ctx.fillText(line, padding, y);
        line = words[i];
        y += lineHeightPx;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, padding, y);
  }, [titleFont, bodyFont, fontSize, lineHeight, bgColor, titleColor, bodyColor, sampleText]);

  return (
    <div className="font-preview-wrapper">
      <canvas
        ref={canvasRef}
        className="font-preview-canvas"
      />
      <style>{`
        .font-preview-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
        }
        .font-preview-canvas {
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          max-width: 100%;
          height: auto;
        }
      `}</style>
    </div>
  );
};
