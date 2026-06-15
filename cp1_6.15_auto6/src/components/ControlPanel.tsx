import React, { useState, useEffect } from 'react';
import { useStore, THEMES } from '../stores/useStore';
import { ThemeType } from '../types';
import { animationRecorder } from '../core/AnimationRecorder';

export const ControlPanel: React.FC = () => {
  const currentTheme = useStore((s) => s.currentTheme);
  const setTheme = useStore((s) => s.setTheme);
  const isRecording = useStore((s) => s.isRecording);
  const startRecording = useStore((s) => s.startRecording);
  const stopRecording = useStore((s) => s.stopRecording);
  const particles = useStore((s) => s.particles);

  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (!isRecording) {
      setElapsedTime(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsedTime(animationRecorder.elapsed);
    }, 100);

    return () => clearInterval(interval);
  }, [isRecording]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleThemeChange = (theme: ThemeType) => {
    setTheme(theme);
  };

  const handleToggleRecording = () => {
    if (isRecording) {
      stopRecording();
      setTimeout(() => {
        animationRecorder.downloadJSON();
      }, 100);
    } else {
      startRecording();
    }
  };

  const handleExport = () => {
    animationRecorder.downloadJSON();
  };

  return (
    <div className="control-panel">
      <div className="panel-title">
        <span className="title-icon">✦</span>
        <span>光迹沙盒</span>
      </div>

      <div className="panel-section">
        <div className="section-label">主题</div>
        <div className="theme-buttons">
          {(Object.keys(THEMES) as ThemeType[]).map((themeKey) => (
            <button
              key={themeKey}
              className={`theme-button ${currentTheme === themeKey ? 'active' : ''}`}
              onClick={() => handleThemeChange(themeKey)}
              style={currentTheme === themeKey ? {
                background: `linear-gradient(135deg, ${THEMES[themeKey].connectionGradient[0]}, ${THEMES[themeKey].connectionGradient[1]})`
              } : undefined}
            >
              {THEMES[themeKey].name}
            </button>
          ))}
        </div>
      </div>

      <div className="panel-section">
        <div className="section-label">录制</div>
        {isRecording && (
          <div className="recording-indicator">
            <span className="recording-dot" />
            <span>{formatTime(elapsedTime)} / 00:30</span>
          </div>
        )}
        <div className="record-buttons">
          <button
            className={`record-button ${isRecording ? 'recording' : ''}`}
            onClick={handleToggleRecording}
          >
            <span className="record-icon">{isRecording ? '■' : '●'}</span>
            <span>{isRecording ? '停止并导出' : '开始录制'}</span>
          </button>
          {!isRecording && particles.length > 0 && (
            <button className="export-button" onClick={handleExport}>
              导出JSON
            </button>
          )}
        </div>
      </div>

      <div className="panel-footer">
        <span>粒子数: {particles.length}</span>
      </div>
    </div>
  );
};
