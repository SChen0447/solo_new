import { useEffect, useRef, useCallback } from 'react';
import { usePianoStore } from '@/store/usePianoStore';
import { SONGS } from '@/data/songs';
import type { SongNote } from '@/data/songs';
import './SheetMusic.css';

const JIANPU_MAP: Record<string, string> = {
  C: '1', 'C#': '#1', D: '2', 'D#': '#2', E: '3',
  F: '4', 'F#': '#4', G: '5', 'G#': '#5', A: '6', 'A#': '#6', B: '7',
};

interface SheetMusicProps {
  notes: SongNote[];
  currentIndex: number;
  isPlaying: boolean;
  feedback: 'correct' | 'wrong' | null;
}

export default function SheetMusic({ notes, currentIndex, isPlaying, feedback }: SheetMusicProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const scrollXRef = useRef(0);
  const targetXRef = useRef(0);
  const theme = usePianoStore((s) => s.theme);

  const getThemeColors = useCallback(() => {
    if (theme === 'cosmic') {
      return {
        bg1: 'rgba(13, 13, 43, 0.85)', bg2: 'rgba(8, 8, 30, 0.85)',
        staff: 'rgba(123, 104, 238, 0.3)', note: 'rgba(200, 200, 255, 0.9)',
        highlight: '#7b68ee', text: 'rgba(200, 200, 255, 0.6)',
        correct: '#4ade80', wrong: '#f87171',
      };
    }
    if (theme === 'sunset') {
      return {
        bg1: 'rgba(45, 27, 18, 0.85)', bg2: 'rgba(30, 18, 10, 0.85)',
        staff: 'rgba(255, 140, 66, 0.3)', note: 'rgba(255, 220, 180, 0.9)',
        highlight: '#ff8c42', text: 'rgba(255, 200, 160, 0.6)',
        correct: '#4ade80', wrong: '#f87171',
      };
    }
    return {
      bg1: 'rgba(30, 30, 60, 0.8)', bg2: 'rgba(20, 20, 40, 0.8)',
      staff: 'rgba(200, 200, 230, 0.35)', note: 'rgba(220, 220, 240, 0.9)',
      highlight: '#7b68ee', text: 'rgba(180, 180, 210, 0.6)',
      correct: '#4ade80', wrong: '#f87171',
    };
  }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const resizeCanvas = () => {
      const cssW = canvas!.offsetWidth;
      const cssH = canvas!.offsetHeight;
      canvas!.width = cssW * dpr;
      canvas!.height = cssH * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resizeCanvas();

    const NOTE_GAP = 60;
    const HIGHLIGHT_ANCHOR = 0.3;

    const draw = () => {
      if (!canvas || !ctx) return;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      const colors = getThemeColors();

      ctx.clearRect(0, 0, w, h);

      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, colors.bg1);
      bgGrad.addColorStop(1, colors.bg2);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      const rowH = h / 3;
      for (let row = 0; row < 3; row++) {
        const y0 = row * rowH;
        ctx.strokeStyle = colors.staff;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, y0 + rowH / 2);
        ctx.lineTo(w, y0 + rowH / 2);
        ctx.stroke();

        ctx.fillStyle = colors.text;
        ctx.font = '12px -apple-system, Segoe UI, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('♩', 8, y0 + rowH / 2 + 4);
      }

      if (notes.length === 0) {
        ctx.fillStyle = colors.text;
        ctx.font = '14px -apple-system, Segoe UI, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('选择歌曲开始学习', w / 2, h / 2 + 5);
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      const anchorX = w * HIGHLIGHT_ANCHOR;
      const target = anchorX - currentIndex * NOTE_GAP;
      targetXRef.current = target;
      scrollXRef.current += (targetXRef.current - scrollXRef.current) * 0.1;

      for (let i = 0; i < notes.length; i++) {
        const note = notes[i];
        const x = scrollXRef.current + i * NOTE_GAP + NOTE_GAP / 2;
        if (x < -80 || x > w + 80) continue;

        const match = note.note.match(/^([A-G]#?)(\d)$/);
        if (!match) continue;
        const [, pitch] = match;
        const octave = parseInt(match[2], 10);
        const jianpu = JIANPU_MAP[pitch] || pitch;
        const isCurrent = i === currentIndex;
        const row = Math.floor(i / Math.max(1, Math.floor(w / NOTE_GAP)));
        const yBase = Math.min(row, 2) * rowH + rowH / 2;
        const yOff = (octave - 4) * 14;
        const y = yBase - yOff;

        if (isCurrent) {
          let color = colors.highlight;
          if (feedback === 'correct') color = colors.correct;
          if (feedback === 'wrong') color = colors.wrong;

          ctx.save();
          ctx.shadowColor = color;
          ctx.shadowBlur = 24;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(x, y, 16, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          ctx.save();
          ctx.strokeStyle = color;
          ctx.globalAlpha = 0.3;
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
          ctx.stroke();
          ctx.restore();
        } else {
          ctx.fillStyle = colors.note;
          ctx.beginPath();
          ctx.arc(x, y, 12, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = isCurrent ? '#fff' : colors.text;
        ctx.font = isCurrent ? 'bold 13px -apple-system, sans-serif' : '12px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(jianpu, x, y);

        if (octave < 4) {
          ctx.fillStyle = isCurrent ? 'rgba(255,255,255,0.7)' : colors.text;
          ctx.font = '9px -apple-system, sans-serif';
          ctx.fillText('·', x, y + 14);
        } else if (octave > 4) {
          ctx.fillStyle = isCurrent ? 'rgba(255,255,255,0.7)' : colors.text;
          ctx.font = '9px -apple-system, sans-serif';
          ctx.fillText('·', x, y - 14);
        }

        if (note.duration >= 2) {
          ctx.strokeStyle = isCurrent ? 'rgba(255,255,255,0.5)' : 'rgba(200,200,220,0.3)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x + 12, y - 10);
          ctx.lineTo(x + 12, y + 10);
          ctx.stroke();
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    const handleResize = () => resizeCanvas();
    window.addEventListener('resize', handleResize);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [notes, currentIndex, isPlaying, feedback, getThemeColors]);

  return (
    <div className="sheet-music-wrapper">
      <canvas ref={canvasRef} className="sheet-music-canvas" />
    </div>
  );
}
