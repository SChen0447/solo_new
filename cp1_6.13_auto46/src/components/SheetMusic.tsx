import { useEffect, useRef } from 'react';
import type { SongNote } from '@/data/songs';

interface SheetMusicProps {
  notes: SongNote[];
  currentIndex: number;
  isPlaying: boolean;
  feedback: 'correct' | 'wrong' | null;
}

const NOTE_Y_POSITIONS: Record<string, number> = {
  C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6,
};

function extractPitch(note: string): { pitch: string; octave: number; isSharp: boolean } {
  const match = note.match(/^([A-G])([#b]?)(\d)$/);
  if (!match) return { pitch: 'C', octave: 4, isSharp: false };
  const [, pitch, accidental] = match;
  return { pitch, octave: parseInt(match[3], 10), isSharp: accidental === '#' };
}

export default function SheetMusic({ notes, currentIndex, isPlaying, feedback }: SheetMusicProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const scrollXRef = useRef(0);
  const targetXRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvas.offsetWidth;
    const cssHeight = canvas.offsetHeight;
    canvas.width = cssWidth * dpr;
    canvas.height = cssHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const centerY = cssHeight / 2;
    const lineSpacing = 10;
    const staffTop = centerY - 2 * lineSpacing;
    const noteWidth = 56;
    const scrollSpeedPerBeat = noteWidth;

    const draw = () => {
      const w = cssWidth;
      const h = cssHeight;

      ctx.clearRect(0, 0, w, h);

      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, getCSSVar('--sheet-top', 'rgba(30, 30, 60, 0.8)'));
      bgGrad.addColorStop(1, getCSSVar('--sheet-bottom', 'rgba(20, 20, 40, 0.8)'));
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = getCSSVar('--staff-line', 'rgba(200, 200, 230, 0.35)');
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        const y = staffTop + i * lineSpacing;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      if (notes.length === 0) {
        ctx.fillStyle = getCSSVar('--sheet-text', 'rgba(200, 200, 230, 0.7)');
        ctx.font = '14px -apple-system, Segoe UI, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('选择歌曲开始学习', w / 2, h / 2 + 5);
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      const highlightX = w * 0.35;
      const targetHighlightIndex = Math.min(currentIndex, notes.length - 1);
      const target = highlightX - targetHighlightIndex * noteWidth;
      targetXRef.current = target;
      scrollXRef.current += (targetXRef.current - scrollXRef.current) * 0.12;

      for (let i = 0; i < notes.length; i++) {
        const note = notes[i];
        const x = scrollXRef.current + i * noteWidth + noteWidth / 2;
        if (x < -80 || x > w + 80) continue;

        const { pitch, octave, isSharp } = extractPitch(note.note);
        const baseY = NOTE_Y_POSITIONS[pitch] ?? 0;
        const centerNoteY = staffTop + 3 * lineSpacing;
        const y = centerNoteY - baseY * (lineSpacing / 2) - (octave - 4) * 3.5 * lineSpacing;

        const isCurrent = i === currentIndex;
        const circleR = 7;

        if (isCurrent) {
          ctx.save();
          let color = getCSSVar('--highlight-current', '#7b68ee');
          if (feedback === 'correct') color = '#4ade80';
          if (feedback === 'wrong') color = '#f87171';

          ctx.shadowColor = color;
          ctx.shadowBlur = 20;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(x, y, circleR + 1, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          ctx.save();
          ctx.strokeStyle = color;
          ctx.globalAlpha = 0.4;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
          ctx.stroke();
          ctx.restore();
        } else {
          ctx.fillStyle = getCSSVar('--note-color', 'rgba(220, 220, 240, 0.9)');
          ctx.beginPath();
          ctx.arc(x, y, circleR, 0, Math.PI * 2);
          ctx.fill();
        }

        if (isSharp) {
          ctx.fillStyle = getCSSVar('--note-color', 'rgba(220, 220, 240, 0.9)');
          ctx.font = 'bold 10px -apple-system, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('#', x - 12, y);
        }

        ctx.fillStyle = getCSSVar('--sheet-text', 'rgba(180, 180, 210, 0.5)');
        ctx.font = '9px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(note.note, x, y + circleR + 12);
      }

      if (isPlaying) {
        scrollXRef.current -= scrollSpeedPerBeat * 0.002;
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [notes, currentIndex, isPlaying, feedback]);

  return (
    <div className="sheet-music-wrapper">
      <canvas ref={canvasRef} className="sheet-music-canvas" />
    </div>
  );
}

function getCSSVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}
