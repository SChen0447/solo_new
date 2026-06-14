import React, { useEffect, useRef, useCallback } from 'react';
import { useStoryboardStore } from '../store';

export const PreviewPanel: React.FC = React.memo(() => {
  const { currentStoryboard, preview, setPreviewProgress, finishPreview, pausePreview, resumePreview, jumpToScene, resetPreview } =
    useStoryboardStore();
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const pausedElapsedRef = useRef<number>(0);
  const currentSceneStartRef = useRef<number>(0);

  const scenes = currentStoryboard?.scenes ?? [];

  const tick = useCallback(
    (timestamp: number) => {
      if (!preview.isPlaying || preview.isPaused) return;

      if (startTimeRef.current === 0) {
        startTimeRef.current = timestamp - pausedElapsedRef.current;
      }

      const elapsed = timestamp - startTimeRef.current;
      const currentScene = scenes[preview.currentIndex];
      if (!currentScene) {
        finishPreview();
        return;
      }

      const sceneDuration = currentScene.duration * 1000;
      const sceneElapsed = elapsed - currentSceneStartRef.current;
      const progress = Math.min(sceneElapsed / sceneDuration, 1);

      setPreviewProgress(preview.currentIndex, progress);

      if (progress >= 1) {
        const nextIndex = preview.currentIndex + 1;
        if (nextIndex >= scenes.length) {
          finishPreview();
          return;
        }
        currentSceneStartRef.current = elapsed;
        setPreviewProgress(nextIndex, 0);
      }

      rafRef.current = requestAnimationFrame(tick);
    },
    [preview.isPlaying, preview.isPaused, preview.currentIndex, scenes, setPreviewProgress, finishPreview]
  );

  useEffect(() => {
    if (preview.isPlaying && !preview.isPaused && !preview.isFinished) {
      rafRef.current = requestAnimationFrame(tick);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [preview.isPlaying, preview.isPaused, preview.isFinished, tick]);

  useEffect(() => {
    if (preview.isPlaying && !preview.isPaused) {
      startTimeRef.current = 0;
      pausedElapsedRef.current = 0;
      currentSceneStartRef.current = 0;
    }
  }, [preview.isPlaying]);

  const handlePauseResume = useCallback(() => {
    if (preview.isPaused) {
      pausedElapsedRef.current = 0;
      resumePreview();
    } else {
      cancelAnimationFrame(rafRef.current);
      pausePreview();
    }
  }, [preview.isPaused, pausePreview, resumePreview]);

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const ratio = x / rect.width;
      const sceneIndex = Math.min(Math.floor(ratio * scenes.length), scenes.length - 1);
      if (sceneIndex >= 0 && sceneIndex < scenes.length) {
        currentSceneStartRef.current = 0;
        pausedElapsedRef.current = 0;
        startTimeRef.current = 0;
        jumpToScene(sceneIndex);
      }
    },
    [scenes, jumpToScene]
  );

  if (!preview.isPlaying && !preview.isFinished) return null;

  if (preview.isFinished) {
    return (
      <div className="preview-overlay">
        <div className="preview-finished">
          <h2>播放结束</h2>
          <button className="btn-primary" onClick={resetPreview}>
            返回编辑
          </button>
        </div>
      </div>
    );
  }

  const currentScene = scenes[preview.currentIndex];
  if (!currentScene) return null;

  const totalProgress =
    scenes.length > 0
      ? ((preview.currentIndex + preview.progress) / scenes.length) * 100
      : 0;

  return (
    <div className="preview-overlay">
      <div className="preview-content" style={{ backgroundColor: currentScene.color }}>
        <div className="preview-scene-info">
          <h2>{currentScene.name || '未命名场景'}</h2>
          <p>{currentScene.description}</p>
          <span className="preview-scene-counter">
            {preview.currentIndex + 1} / {scenes.length}
          </span>
        </div>
      </div>

      <div className="preview-controls">
        <div className="preview-progress-bar" onClick={handleProgressClick}>
          <div
            className="preview-progress-fill"
            style={{ width: `${totalProgress}%` }}
          />
          {scenes.map((_, i) => {
            const pos = ((i + 0.5) / scenes.length) * 100;
            return (
              <div
                key={i}
                className={`preview-progress-mark ${i === preview.currentIndex ? 'active' : ''}`}
                style={{ left: `${pos}%` }}
              />
            );
          })}
        </div>

        <div className="preview-btn-row">
          <button className="btn-primary" onClick={handlePauseResume}>
            {preview.isPaused ? '▶ 继续' : '⏸ 暂停'}
          </button>
          <button className="btn-secondary" onClick={resetPreview}>
            ✕ 退出
          </button>
        </div>
      </div>
    </div>
  );
});

PreviewPanel.displayName = 'PreviewPanel';
