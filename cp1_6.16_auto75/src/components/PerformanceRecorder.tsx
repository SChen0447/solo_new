import { useCallback } from 'react';
import { usePerformanceRecorder } from '@/hooks/usePerformanceRecorder';
import type { FrameData, JankData } from '@/types';

interface PerformanceRecorderProps {
  isRecording: boolean;
  onStart: () => void;
  onStop: () => void;
  onFrame: (frame: FrameData) => void;
  onJank: (jank: JankData) => void;
  onReflow: (elementPath: string, duration: number) => void;
  onFpsUpdate: (fps: number) => void;
}

export function PerformanceRecorder({
  isRecording,
  onStart,
  onStop,
  onFrame,
  onJank,
  onReflow,
  onFpsUpdate,
}: PerformanceRecorderProps) {
  const handleFrame = useCallback(
    (frame: FrameData) => {
      onFrame(frame);
      onFpsUpdate(frame.fps);
    },
    [onFrame, onFpsUpdate]
  );

  const { startRecording, stopRecording } = usePerformanceRecorder({
    onFrame: handleFrame,
    onJank,
    onReflow,
  });

  const handleToggle = useCallback(() => {
    if (isRecording) {
      stopRecording();
      onStop();
    } else {
      startRecording();
      onStart();
    }
  }, [isRecording, startRecording, stopRecording, onStart, onStop]);

  return (
    <div className="recorder-controls">
      <button
        className={`control-btn record-btn ${isRecording ? 'recording' : ''}`}
        onClick={handleToggle}
        title={isRecording ? '停止录制' : '开始录制'}
      >
        {isRecording ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="1" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="8" />
          </svg>
        )}
      </button>
      {isRecording && (
        <div className="recording-indicator">
          <span className="pulse-dot"></span>
          <span>录制中</span>
        </div>
      )}
    </div>
  );
}
