import { useState, useRef, useCallback } from 'react';
import type { LyricLine, LyricsTrack } from '../types';
import { parseLRC } from '../utils/db';

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newLineTime, setNewLineTime] = useState('00:00.00');
  const [newLineText, setNewLineText] = useState('');

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
      return parseInt(mins) * 60 + parseInt(secs) + parseInt(ms.padEnd(3, '0')) / 1000;
    }
    return 0;
  };

  const handleTimeChange = useCallback((line: LyricLine, timeStr: string) => {
    const newTime = parseTime(timeStr);
    onUpdateLine({ ...line, time: newTime });
  }, [onUpdateLine]);

  const handleTextChange = useCallback((line: LyricLine, text: string) => {
    onUpdateLine({ ...line, text });
  }, [onUpdateLine]);

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

  const handleMoveUp = useCallback((index: number) => {
    if (!track || index <= 0) return;
    const lines = [...track.lines];
    const temp = { ...lines[index - 1] };
    lines[index - 1] = { ...lines[index], time: lines[index - 1].time };
    lines[index] = { ...temp, time: lines[index].time };
    onUpdateLine(lines[index - 1]);
    onUpdateLine(lines[index]);
  }, [track, onUpdateLine]);

  const handleMoveDown = useCallback((index: number) => {
    if (!track || index >= track.lines.length - 1) return;
    const lines = [...track.lines];
    const temp = { ...lines[index + 1] };
    lines[index + 1] = { ...lines[index], time: lines[index + 1].time };
    lines[index] = { ...temp, time: lines[index].time };
    onUpdateLine(lines[index + 1]);
    onUpdateLine(lines[index]);
  }, [track, onUpdateLine]);

  if (!track) {
    return (
      <div className="editor-view">
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <p>请先选择一首歌曲</p>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-view">
      <div className="editor-header">
        <h2 className="editor-title">歌词编辑器 - {track.title}</h2>
        <div className="editor-actions">
          <input
            ref={fileInputRef}
            type="file"
            accept=".lrc,.txt"
            className="hidden-input"
            onChange={handleFileImport}
          />
          <button className="btn" onClick={() => fileInputRef.current?.click()}>
            导入 LRC
          </button>
        </div>
      </div>

      <div className="lyric-editor-row" style={{ background: 'rgba(0, 255, 204, 0.05)' }}>
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
          placeholder="输入歌词文本..."
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
            className={`lyric-editor-row ${editingId === line.id ? 'active' : ''}`}
          >
            <input
              type="text"
              className="time-input"
              value={formatTime(line.time)}
              onChange={(e) => handleTimeChange(line, e.target.value)}
              onFocus={() => setEditingId(line.id)}
              onBlur={() => setEditingId(null)}
            />
            <input
              type="text"
              className="text-input"
              value={line.text}
              onChange={(e) => handleTextChange(line, e.target.value)}
              onFocus={() => setEditingId(line.id)}
              onBlur={() => setEditingId(null)}
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
                onClick={() => onDeleteLine(line.id)}
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
