import { useState, useRef, useEffect, useCallback } from 'react';
import type { AudioBuffer } from 'standardized-audio-context';
import { decodeAudioData, generateWaveformData, drawWaveform, drawSelection, xToTime } from '../utils/waveform';

interface UseWaveformOptions {
  duration: number;
  onSelectionComplete?: (startTime: number, endTime: number) => void;
}

interface UseWaveformReturn {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  waveformData: number[];
  isLoading: boolean;
  error: string | null;
  loadAudioFile: (file: File) => Promise<void>;
  loadFromAudioBuffer: (buffer: AudioBuffer) => void;
  redraw: () => void;
  clearSelection: () => void;
}

export function useWaveform({ duration, onSelectionComplete }: UseWaveformOptions): UseWaveformReturn {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragEndX = useRef(0);
  const selectionStartTime = useRef<number | null>(null);
  const selectionEndTime = useRef<number | null>(null);

  const loadFromAudioBuffer = useCallback((audioBuffer: AudioBuffer) => {
    try {
      const data = generateWaveformData(audioBuffer, 1500);
      setWaveformData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '波形解析失败');
    }
  }, []);

  const loadAudioFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    try {
      const audioBuffer = await decodeAudioData(file);
      loadFromAudioBuffer(audioBuffer as unknown as AudioBuffer);
    } catch (err) {
      setError(err instanceof Error ? err.message : '音频解析失败');
    } finally {
      setIsLoading(false);
    }
  }, [loadFromAudioBuffer]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || waveformData.length === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }

    drawWaveform(canvas, waveformData, {
      color: '#e94560',
      backgroundColor: '#16213e',
      barWidth: 2,
      gap: 1,
    });

    if (selectionStartTime.current !== null && selectionEndTime.current !== null) {
      drawSelection(
        canvas,
        selectionStartTime.current,
        selectionEndTime.current,
        duration,
        '#3498db66'
      );
    }
  }, [waveformData, duration]);

  const clearSelection = useCallback(() => {
    selectionStartTime.current = null;
    selectionEndTime.current = null;
    redraw();
  }, [redraw]);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    isDragging.current = true;
    dragStartX.current = e.clientX - rect.left;
    dragEndX.current = dragStartX.current;
    selectionStartTime.current = xToTime(dragStartX.current, duration, rect.width);
    selectionEndTime.current = selectionStartTime.current;
  }, [duration]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    dragEndX.current = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    
    const startX = Math.min(dragStartX.current, dragEndX.current);
    const endX = Math.max(dragStartX.current, dragEndX.current);
    
    selectionStartTime.current = xToTime(startX, duration, rect.width);
    selectionEndTime.current = xToTime(endX, duration, rect.width);
    
    redraw();
  }, [duration, redraw]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;

    if (
      selectionStartTime.current !== null &&
      selectionEndTime.current !== null &&
      selectionStartTime.current !== selectionEndTime.current &&
      onSelectionComplete
    ) {
      const startTime = Math.min(selectionStartTime.current, selectionEndTime.current);
      const endTime = Math.max(selectionStartTime.current, selectionEndTime.current);
      
      if (endTime - startTime > 0.1) {
        onSelectionComplete(startTime, endTime);
      } else {
        clearSelection();
      }
    }
  }, [onSelectionComplete, clearSelection]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseDown, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    if (waveformData.length > 0) {
      const timer = setTimeout(redraw, 50);
      return () => clearTimeout(timer);
    }
  }, [waveformData, redraw]);

  useEffect(() => {
    const handleResize = () => redraw();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [redraw]);

  return {
    canvasRef,
    waveformData,
    isLoading,
    error,
    loadAudioFile,
    loadFromAudioBuffer,
    redraw,
    clearSelection,
  };
}

export default useWaveform;
