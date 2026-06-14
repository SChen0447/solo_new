import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../store';
import { LyricEngine } from '../lyric/LyricEngine';
import { apiClient } from '../api/apiClient';

export const Replay: React.FC = () => {
  const room = useAppStore((s) => s.room);
  const setView = useAppStore((s) => s.setView);
  const [replayIndex, setReplayIndex] = useState(-1);
  const [isReplaying, setIsReplaying] = useState(false);
  const [bgColor, setBgColor] = useState('transparent');
  const [exportProgress, setExportProgress] = useState(-1);
  const [showFade, setShowFade] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lyrics = room ? LyricEngine.getReplaySequence() : [];

  const startReplay = useCallback(() => {
    setReplayIndex(0);
    setIsReplaying(true);
    setShowFade(true);
  }, []);

  useEffect(() => {
    if (!isReplaying || replayIndex < 0 || replayIndex >= lyrics.length) return;

    const lyric = lyrics[replayIndex];
    const sentiment = LyricEngine.analyzeSentiment(lyric.content);
    setBgColor(LyricEngine.getSentimentColor(sentiment));
    setShowFade(true);

    timerRef.current = setTimeout(() => {
      setShowFade(false);
      setTimeout(() => {
        if (replayIndex + 1 < lyrics.length) {
          setReplayIndex(replayIndex + 1);
        } else {
          setIsReplaying(false);
        }
      }, 250);
    }, 1750);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isReplaying, replayIndex, lyrics]);

  const handleExport = async (format: 'text' | 'html') => {
    if (!room) return;
    setExportProgress(0);
    const url = apiClient.exportRoom(room.id, format);
    const progressTimer = setInterval(() => {
      setExportProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressTimer);
          return 90;
        }
        return prev + Math.random() * 15 + 5;
      });
    }, 200);

    try {
      const response = await fetch(url);
      const blob = await response.blob();
      clearInterval(progressTimer);
      setExportProgress(100);

      setTimeout(() => {
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `lyric-chain-${room.id}.${format === 'html' ? 'html' : 'txt'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
        setTimeout(() => setExportProgress(-1), 800);
      }, 300);
    } catch {
      clearInterval(progressTimer);
      setExportProgress(-1);
    }
  };

  const handleBack = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsReplaying(false);
    setReplayIndex(-1);
    setBgColor('transparent');
    setView('room');
  };

  if (!room) return null;

  return (
    <div className="replay-container" style={{ backgroundColor: bgColor }}>
      <div className="replay-header">
        <button className="back-btn" onClick={handleBack}>
          ← 返回房间
        </button>
        <h2 className="replay-title">🎵 歌词回放</h2>
      </div>

      <div className="replay-stage">
        {!isReplaying && replayIndex === -1 && lyrics.length > 0 && (
          <div className="replay-ready">
            <p>共 {lyrics.length} 句歌词，准备好回放了吗？</p>
            <button className="action-btn replay-start-btn" onClick={startReplay}>
              ▶ 开始回放
            </button>
          </div>
        )}

        {isReplaying && replayIndex >= 0 && replayIndex < lyrics.length && (
          <div className={`replay-lyric-card ${showFade ? 'fade-in' : 'fade-out'}`}>
            <div className="replay-lyric-number">#{replayIndex + 1}</div>
            <div className="replay-lyric-content">{lyrics[replayIndex].content}</div>
            <div className="replay-lyric-author">— {lyrics[replayIndex].memberNickname}</div>
            {lyrics[replayIndex].keyword && (
              <div className="replay-lyric-keyword">灵感: {lyrics[replayIndex].keyword}</div>
            )}
          </div>
        )}

        {!isReplaying && replayIndex >= 0 && replayIndex >= lyrics.length - 1 && (
          <div className="replay-done">
            <p>✨ 回放结束</p>
            <div className="replay-actions">
              <button className="action-btn" onClick={startReplay}>
                🔄 重新回放
              </button>
              <button className="action-btn export-btn" onClick={() => handleExport('text')}>
                📄 导出文本
              </button>
              <button className="action-btn export-btn" onClick={() => handleExport('html')}>
                🌐 导出HTML
              </button>
            </div>
          </div>
        )}
      </div>

      {exportProgress >= 0 && (
        <div className="export-progress-container">
          <div className="export-progress-bar" style={{ width: `${Math.min(exportProgress, 100)}%` }} />
          <span className="export-progress-text">{Math.round(Math.min(exportProgress, 100))}%</span>
        </div>
      )}
    </div>
  );
};
