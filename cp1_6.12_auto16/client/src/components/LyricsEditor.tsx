import { useState, useRef, useCallback, useEffect } from 'react';
import type { LyricLine, LyricsTrack } from '../types';
import { parseLRC, formatLRC } from '../utils/db';

interface LyricsEditorProps {
  track: LyricsTrack | null;
  onAddLine: (time: number, text: string) => void;
  onUpdateLine: (line: LyricLine) => void;
  onDeleteLine: (lineId: string) => void;
  onImportLRC: (lines: Omit<LyricLine, 'id' | 'trackId'>[]) => void;
}

export default function LyricsEditor({
  track,
  onAddLine,
  onUpdateLine,
  onDeleteLine,
  onImportLRC
}: LyricsEditorProps) {
  const [activeLineId, setActiveLineId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newLineTime, setNewLineTime] = useState('00:00.00');
  const [newLineText, setNewLineText] = useState('');
  const pendingUpdatesRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    return () => {
      pendingUpdatesRef.current.forEach(timeout => clearTimeout(timeout));
      pendingUpdatesRef.current.clear();
    };
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const parseTime = (timeStr: string): number => {
    const parts = timeStr.split(':');
    if (parts.length === 2) {
      const [mins, rest] = parts;
      const [secs, ms = '0'] = rest.split('.');
      const parsedMins = parseInt(mins) || 0;
      const parsedSecs = parseInt(secs) || 0;
      const parsedMs = parseInt((ms || '0').padEnd(3, '0')) || 0;
      return parsedMins * 60 + parsedSecs + parsedMs / 1000;
    }
    return 0;
  };

  const debouncedUpdate = useCallback((line: LyricLine) => {
    const existingTimeout = pendingUpdatesRef.current.get(line.id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    const timeout = window.setTimeout(() => {
      onUpdateLine(line);
      pendingUpdatesRef.current.delete(line.id);
    }, 200);
    pendingUpdatesRef.current.set(line.id, timeout);
  }, [onUpdateLine]);

  const handleTimeChange = useCallback((line: LyricLine, timeStr: string) => {
    const newTime = parseTime(timeStr);
    debouncedUpdate({ ...line, time: newTime });
  }, [debouncedUpdate]);

  const handleTextChange = useCallback((line: LyricLine, text: string) => {
    debouncedUpdate({ ...line, text });
  }, [debouncedUpdate]);

  const handleAddLine = useCallback(() => {
    if (!newLineText.trim()) return;
    const time = parseTime(newLineTime);
    onAddLine(time, newLineText.trim());
    setNewLineText('');
  }, [newLineTime, newLineText, onAddLine]);

  const handleFileImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parsedLines = parseLRC(content);
      if (parsedLines.length > 0) {
        onImportLRC(parsedLines);
      }
    };
    reader.readAsText(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onImportLRC]);

  const handleExportLRC = useCallback(() => {
    if (!track) return;
    const lrcContent = formatLRC(track.lines);
    const blob = new Blob([lrcContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${track.title || 'lyrics'}.lrc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [track]);

  const handleMoveUp = useCallback((index: number) => {
    if (!track || index <= 0) return;
    const lines = [...track.lines];
    const prevLine = { ...lines[index - 1], time: lines[index].time };
    const currLine = { ...lines[index], time: lines[index - 1].time };
    onUpdateLine(prevLine);
    onUpdateLine(currLine);
  }, [track, onUpdateLine]);

  const handleMoveDown = useCallback((index: number) => {
    if (!track || index >= track.lines.length - 1) return;
    const lines = [...track.lines];
    const nextLine = { ...lines[index + 1], time: lines[index].time };
    const currLine = { ...lines[index], time: lines[index + 1].time };
    onUpdateLine(nextLine);
    onUpdateLine(currLine);
  }, [track, onUpdateLine]);

  const handleDeleteWithConfirm = useCallback((lineId: string, text: string) => {
    if (confirm(`确定删除歌词 "${text}"？`)) {
      const existingTimeout = pendingUpdatesRef.current.get(lineId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        pendingUpdatesRef.current.delete(lineId);
      }
      onDeleteLine(lineId);
    }
  }, [onDeleteLine]);

  if (!track) {
    return (
      <div className="editor-view">
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <p>请先在播放器中选择一首歌曲</p>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-view">
      <div className="editor-header">
        <h2 className="editor-title">🎼 歌词编辑器 - {track.title}</h2>
        <div className="editor-actions">
          <input
            ref={fileInputRef}
            type="file"
            accept=".lrc,.txt"
            className="hidden-input"
            onChange={handleFileImport}
          />
          <button className="btn" onClick={() => fileInputRef.current?.click()}>
            📂 导入 LRC
          </button>
          <button className="btn" onClick={handleExportLRC}>
            💾 导出 LRC
          </button>
        </div>
      </div>

      <div className="lyric-editor-row" style={{ background: 'rgba(0, 255, 204, 0.08)', borderColor: 'rgba(0, 255, 204, 0.3)' }}>
        <input
          type="text"
          className="time-input"
          value={newLineTime}
          onChange={(e) => setNewLineTime(e.target.value)}
          placeholder="00:00.00"
        />
        <input
          type="text"
          className="text-input"
          value={newLineText}
          onChange={(e) => setNewLineText(e.target.value)}
          placeholder="输入歌词文本，按回车添加..."
          onKeyDown={(e) => e.key === 'Enter' && handleAddLine()}
        />
        <button className="btn btn-primary" onClick={handleAddLine}>
          + 添加
        </button>
      </div>

      <div className="lyrics-editor-list">
        {track.lines.map((line, index) => (
          <div
            key={line.id}
            className={`lyric-editor-row ${activeLineId === line.id ? 'active' : ''}`}
          >
            <input
              type="text"
              className="time-input"
              defaultValue={formatTime(line.time)}
              onChange={(e) => handleTimeChange(line, e.target.value)}
              onFocus={() => setActiveLineId(line.id)}
              onBlur={() => setActiveLineId(null)}
            />
            <input
              type="text"
              className="text-input"
              defaultValue={line.text}
              onChange={(e) => handleTextChange(line, e.target.value)}
              onFocus={() => setActiveLineId(line.id)}
              onBlur={() => setActiveLineId(null)}
              placeholder="歌词内容..."
            />
            <div className="row-actions">
              <button
                className="icon-btn"
                onClick={() => handleMoveUp(index)}
                disabled={index === 0}
                title="上移"
              >
                ↑
              </button>
              <button
                className="icon-btn"
                onClick={() => handleMoveDown(index)}
                disabled={index === track.lines.length - 1}
                title="下移"
              >
                ↓
              </button>
              <button
                className="icon-btn danger"
                onClick={() => handleDeleteWithConfirm(line.id, line.text)}
                title="删除"
              >
                ×
              </button>
            </div>
          </div>
        ))}

        {track.lines.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🎼</div>
            <p>暂无歌词</p>
            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
              点击上方添加新行或导入 LRC 文件
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
