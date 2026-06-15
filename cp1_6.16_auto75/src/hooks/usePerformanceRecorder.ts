import { useRef, useCallback, useEffect } from 'react';
import type { FrameData, JankData } from '@/types';
import { ReflowDetector } from '@/utils/reflow';
import { getAnimatedElements, captureStyleSnapshot, getElementPath } from '@/utils/dom';
import { parseCallStack } from '@/utils/stack';

interface UsePerformanceRecorderOptions {
  onFrame: (frame: FrameData) => void;
  onJank: (jank: JankData) => void;
  onReflow: (elementPath: string, duration: number) => void;
}

export function usePerformanceRecorder({ onFrame, onJank, onReflow }: UsePerformanceRecorderOptions) {
  const isRecordingRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const frameCountRef = useRef(0);
  const startTimeRef = useRef<number>(0);
  const reflowDetectorRef = useRef<ReflowDetector | null>(null);
  const jankIdRef = useRef(0);
  const pendingReflowsRef = useRef<Set<string>>(new Set());

  const captureFrame = useCallback(() => {
    if (!isRecordingRef.current) return;

    const now = performance.now();
    const frameDuration = now - lastFrameTimeRef.current;
    const fps = frameDuration > 0 ? Math.min(60, 1000 / frameDuration) : 60;
    const hasLongTask = frameDuration > 50;
    const longTaskDuration = hasLongTask ? frameDuration : 0;

    if (frameDuration > 100) {
      try {
        const error = new Error();
        const { functionName, stackTrace } = parseCallStack(error);
        const jank: JankData = {
          id: jankIdRef.current++,
          timestamp: now,
          duration: frameDuration,
          functionName,
          stackTrace,
        };
        onJank(jank);
      } catch (e) {
        // Ignore stack parse errors
      }
    }

    const reflowElements = Array.from(pendingReflowsRef.current);
    pendingReflowsRef.current.clear();

    const animatedElements = getAnimatedElements();
    const styleSnapshot = animatedElements.map((el) => ({
      elementPath: getElementPath(el),
      styles: captureStyleSnapshot(el),
    }));

    const frame: FrameData = {
      id: frameCountRef.current++,
      timestamp: now,
      fps,
      duration: frameDuration,
      hasLongTask,
      longTaskDuration,
      reflowElements,
      styleSnapshot,
    };

    onFrame(frame);
    lastFrameTimeRef.current = now;
    animationFrameRef.current = requestAnimationFrame(captureFrame);
  }, [onFrame, onJank]);

  const handleReflow = useCallback(
    (elementPath: string, duration: number) => {
      pendingReflowsRef.current.add(elementPath);
      onReflow(elementPath, duration);
    },
    [onReflow]
  );

  const startRecording = useCallback(() => {
    if (isRecordingRef.current) return;

    isRecordingRef.current = true;
    frameCountRef.current = 0;
    jankIdRef.current = 0;
    startTimeRef.current = performance.now();
    lastFrameTimeRef.current = performance.now();
    pendingReflowsRef.current.clear();

    reflowDetectorRef.current = new ReflowDetector(handleReflow);
    reflowDetectorRef.current.start();

    animationFrameRef.current = requestAnimationFrame(captureFrame);
  }, [captureFrame, handleReflow]);

  const stopRecording = useCallback(() => {
    isRecordingRef.current = false;

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (reflowDetectorRef.current) {
      reflowDetectorRef.current.stop();
      reflowDetectorRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, [stopRecording]);

  return {
    startRecording,
    stopRecording,
    isRecording: () => isRecordingRef.current,
  };
}
