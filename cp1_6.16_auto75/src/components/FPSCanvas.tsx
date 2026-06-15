import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import confetti from 'canvas-confetti';

export interface FPSCanvasHandle {
  setFps: (fps: number) => void;
}

interface FPSCanvasProps {
  size?: number;
}

export const FPSCanvas = forwardRef<FPSCanvasHandle, FPSCanvasProps>(({ size = 80 }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentFpsRef = useRef(60);
  const targetFpsRef = useRef(60);
  const glowIntensityRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const confettiCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const confettiInstanceRef = useRef<ReturnType<typeof confetti.create> | null>(null);

  useImperativeHandle(ref, () => ({
    setFps: (fps: number) => {
      targetFpsRef.current = Math.max(0, Math.min(60, fps));
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const center = size / 2;
    const radius = size / 2 - 6;

    const confettiCanvas = document.createElement('canvas');
    confettiCanvas.width = size * dpr;
    confettiCanvas.height = size * dpr;
    confettiCanvas.style.position = 'absolute';
    confettiCanvas.style.top = '0';
    confettiCanvas.style.left = '0';
    confettiCanvas.style.pointerEvents = 'none';
    confettiCanvasRef.current = confettiCanvas;

    const parent = canvas.parentElement;
    if (parent) {
      parent.style.position = 'relative';
      parent.appendChild(confettiCanvas);
    }

    confettiInstanceRef.current = confetti.create(confettiCanvas, {
      resize: true,
      useWorker: false,
    });

    const draw = () => {
      const currentFps = currentFpsRef.current;
      const targetFps = targetFpsRef.current;

      currentFpsRef.current += (targetFps - currentFps) * 0.1;

      const fps = currentFpsRef.current;
      const isLowFps = fps < 30;

      if (isLowFps) {
        glowIntensityRef.current = 0.5 + 0.5 * Math.sin(performance.now() / 250);
      } else {
        glowIntensityRef.current *= 0.95;
      }

      ctx.clearRect(0, 0, size, size);

      if (glowIntensityRef.current > 0.01) {
        const gradient = ctx.createRadialGradient(center, center, radius * 0.8, center, center, radius * 1.2);
        gradient.addColorStop(0, `rgba(244, 67, 54, ${glowIntensityRef.current * 0.5})`);
        gradient.addColorStop(1, 'rgba(244, 67, 54, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(center, center, radius * 1.2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#333';
      ctx.fill();
      ctx.strokeStyle = isLowFps ? '#F44336' : '#555';
      ctx.lineWidth = 2;
      ctx.stroke();

      const startAngle = Math.PI * 0.75;
      const endAngle = Math.PI * 2.25;
      const angleRange = endAngle - startAngle;

      ctx.lineWidth = 2;
      for (let i = 0; i <= 12; i++) {
        const angle = startAngle + (i / 12) * angleRange;
        const isMajor = i % 3 === 0;
        const innerR = radius - (isMajor ? 10 : 6);
        const outerR = radius - 2;

        const x1 = center + Math.cos(angle) * innerR;
        const y1 = center + Math.sin(angle) * innerR;
        const x2 = center + Math.cos(angle) * outerR;
        const y2 = center + Math.sin(angle) * outerR;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = '#FFF';
        ctx.stroke();

        if (isMajor) {
          const labelR = radius - 16;
          const labelX = center + Math.cos(angle) * labelR;
          const labelY = center + Math.sin(angle) * labelR;
          ctx.fillStyle = '#FFF';
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${i * 5}`, labelX, labelY);
        }
      }

      const normalizedFps = Math.max(0, Math.min(60, fps)) / 60;
      const needleAngle = startAngle + normalizedFps * angleRange;
      const needleLength = radius - 14;

      const needleX = center + Math.cos(needleAngle) * needleLength;
      const needleY = center + Math.sin(needleAngle) * needleLength;

      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.lineTo(needleX, needleY);
      ctx.strokeStyle = isLowFps ? '#F44336' : '#64B5F6';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(center, center, 4, 0, Math.PI * 2);
      ctx.fillStyle = isLowFps ? '#F44336' : '#64B5F6';
      ctx.fill();

      ctx.fillStyle = '#FFF';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${Math.round(fps)}`, center, center + radius * 0.4);

      ctx.fillStyle = '#888';
      ctx.font = '8px monospace';
      ctx.fillText('FPS', center, center + radius * 0.6);

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (confettiCanvas && confettiCanvas.parentElement) {
        confettiCanvas.parentElement.removeChild(confettiCanvas);
      }
    };
  }, [size]);

  useEffect(() => {
    const triggerConfetti = () => {
      if (confettiInstanceRef.current && targetFpsRef.current >= 60 && currentFpsRef.current >= 55) {
        confettiInstanceRef.current({
          particleCount: 5,
          startVelocity: 15,
          ticks: 20,
          origin: { x: 0.5, y: 0.5 },
          colors: ['#64B5F6', '#4CAF50', '#FFC107'],
        });
      }
    };

    const interval = setInterval(triggerConfetti, 2000);
    return () => clearInterval(interval);
  }, []);

  return <canvas ref={canvasRef} style={{ borderRadius: '50%' }} />;
});

FPSCanvas.displayName = 'FPSCanvas';
