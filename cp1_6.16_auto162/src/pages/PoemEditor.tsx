import { useState, useRef, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { ReferencePanel } from './ReferencePanel';
import { timeRecorder, type HistoryItem, type RecordingSession } from '../modules/TimeRecorder';
import { timelinePlayer } from '../modules/TimelinePlayer';

export function PoemEditor() {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const [timelineSession, setTimelineSession] = useState<RecordingSession | null>(null);
  const [currentSnapshotIndex, setCurrentSnapshotIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [editCount, setEditCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);
  const [showEditBadge, setShowEditBadge] = useState(false);
  const [textAnimating, setTextAnimating] = useState(false);
  const [panelPosition, setPanelPosition] = useState<'right' | 'bottom'>('right');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const durationTimerRef = useRef<number | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkResponsive = () => {
      const width = window.innerWidth;
      if (width <= 768) {
        setPanelPosition('bottom');
      } else {
        setPanelPosition('right');
      }
    };

    checkResponsive();
    window.addEventListener('resize', checkResponsive);
    return () => window.removeEventListener('resize', checkResponsive);
  }, []);

  useEffect(() => {
    const updateHistory = () => {
      setHistory(timeRecorder.getHistory());
      setCurrentHistoryId(timeRecorder.getCurrentHistoryId());
    };

    updateHistory();
    const unsubscribe = timeRecorder.subscribe(updateHistory);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (isRecording) {
      durationTimerRef.current = window.setInterval(() => {
        setRecordingDuration(timeRecorder.getRecordingDuration());
      }, 100);
    } else {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
    }

    return () => {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
    };
  }, [isRecording]);

  useEffect(() => {
    setShowPanel(text.trim().length > 0);
  }, [text]);

  useEffect(() => {
    if (editCount > 0) {
      setShowEditBadge(true);
      const timer = setTimeout(() => setShowEditBadge(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [editCount]);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    const oldText = text;
    setText(newText);

    if (isRecording) {
      const cursorPos = e.target.selectionStart;
      let type: 'input' | 'delete' = 'input';
      if (newText.length < oldText.length) {
        type = 'delete';
      }
      timeRecorder.recordChange(newText, cursorPos, type);
    }

    timeRecorder.saveCurrentContent(newText);
  }, [text, isRecording]);

  const handleToggleRecording = () => {
    if (isRecording) {
      const session = timeRecorder.stopRecording();
      setIsRecording(false);
      if (session && session.snapshots.length > 1) {
        setTimelineSession(session);
        setShowTimeline(true);
        timelinePlayer.loadSession(session);
        setCurrentSnapshotIndex(0);
      }
    } else {
      const cursorPos = textareaRef.current?.selectionStart || 0;
      timeRecorder.startRecording(text, cursorPos);
      setIsRecording(true);
      setShowTimeline(false);
      setTimelineSession(null);
    }
  };

  const handleWordSelect = (word: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const newText = text.slice(0, start) + word + text.slice(end);
    setText(newText);

    setTextAnimating(true);
    setTimeout(() => setTextAnimating(false), 200);

    requestAnimationFrame(() => {
      textarea.focus();
      const newPos = start + word.length;
      textarea.setSelectionRange(newPos, newPos);
    });

    if (isRecording) {
      timeRecorder.recordChange(newText, start + word.length, 'input');
    }

    timeRecorder.saveCurrentContent(newText);
  };

  const formatDuration = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineSession || !timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const clampedPercent = Math.max(0, Math.min(1, percent));

    const index = timelinePlayer.getIndexAtPercent(clampedPercent);
    timelinePlayer.seekToIndex(index);
    setCurrentSnapshotIndex(index);

    const snapshot = timelinePlayer.getCurrentSnapshot();
    if (snapshot) {
      setText(snapshot.text);
    }
  };

  const handleTimelineSeek = (index: number) => {
    if (!timelineSession) return;
    timelinePlayer.seekToIndex(index);
    setCurrentSnapshotIndex(index);

    const snapshot = timelinePlayer.getCurrentSnapshot();
    if (snapshot) {
      setText(snapshot.text);
    }
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      timelinePlayer.pause();
      setIsPlaying(false);
    } else {
      timelinePlayer.play();
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    const handlePlayback = () => {
      const snapshot = timelinePlayer.getCurrentSnapshot();
      if (snapshot) {
        setText(snapshot.text);
        setCurrentSnapshotIndex(timelinePlayer.getStatus().currentIndex);
      }
    };

    const handleStateChange = (status: { state: string }) => {
      setIsPlaying(status.state === 'playing');
      if (status.state === 'idle') {
        setCurrentSnapshotIndex(0);
      }
    };

    timelinePlayer.setOnPlayback(handlePlayback);
    timelinePlayer.setOnStateChange(handleStateChange);

    return () => {
      timelinePlayer.setOnPlayback(null);
      timelinePlayer.setOnStateChange(null);
    };
  }, []);

  const handleLoadHistory = (item: HistoryItem) => {
    timeRecorder.loadHistoryItem(item.id);
    timeRecorder.incrementEditCount(item.id);
    setText(item.content);
    setEditCount(item.editCount + 1);
    setShowTimeline(false);
    setTimelineSession(null);
    setIsRecording(false);
  };

  const handleNewPoem = () => {
    timeRecorder.createNewHistory('');
    setText('');
    setShowTimeline(false);
    setTimelineSession(null);
    setEditCount(0);
    setIsRecording(false);
  };

  const snapshotCount = timelineSession?.snapshots.length || 0;
  const timelinePercent = snapshotCount > 1 ? (currentSnapshotIndex / (snapshotCount - 1)) * 100 : 0;

  return (
    <div className="poem-editor">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2 className="sidebar-title">创作历史</h2>
          <button className="new-btn" onClick={handleNewPoem}>
            新建
          </button>
        </div>
        <div className="history-list">
          {history.length === 0 ? (
            <div className="empty-history">暂无创作记录</div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className={`history-item ${item.id === currentHistoryId ? 'active' : ''}`}
                onClick={() => handleLoadHistory(item)}
              >
                <div className="history-date">
                  {format(item.updatedAt, 'yyyy-MM-dd')}
                </div>
                <div className="history-preview" title={item.content}>
                  {item.content.slice(0, 10) || '无题'}
                  {item.content.length > 10 ? '...' : ''}
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      <main className="editor-main">
        <div className="editor-container">
          <div className="editor-header">
            <h1 className="editor-title">诗词工坊</h1>
            <button
              className={`record-btn ${isRecording ? 'recording' : ''}`}
              onClick={handleToggleRecording}
              title={isRecording ? '停止录制' : '开始录制'}
            >
              <span className="record-icon" />
            </button>
          </div>

          <div className="editor-content">
            <div className="editor-wrapper">
              <textarea
                ref={textareaRef}
                className={`poem-textarea ${textAnimating ? 'animating' : ''}`}
                value={text}
                onChange={handleTextChange}
                placeholder="在此开始你的诗词创作..."
              />

              {isRecording && (
                <div className="recording-indicator">
                  <span className="recording-dot" />
                  <span className="recording-time">
                    {formatDuration(recordingDuration)}
                  </span>
                </div>
              )}

              <div className="char-count">{text.length} 字</div>

              {showEditBadge && editCount > 0 && (
                <div className="edit-badge">编辑 {editCount} 次</div>
              )}
            </div>

            {panelPosition === 'right' && (
              <ReferencePanel
                text={text}
                onWordSelect={handleWordSelect}
                isVisible={showPanel}
              />
            )}
          </div>

          {showTimeline && timelineSession && (
            <div className="timeline-container">
              <div className="timeline-controls">
                <button className="play-btn" onClick={handlePlayPause}>
                  {isPlaying ? '⏸' : '▶'}
                </button>
                <span className="timeline-label">
                  {formatDuration(timelinePlayer.getStatus().currentTime)} /{' '}
                  {formatDuration(timelinePlayer.getTotalDuration())}
                </span>
              </div>
              <div
                ref={timelineRef}
                className="timeline-bar"
                onClick={handleTimelineClick}
              >
                <div
                  className="timeline-progress"
                  style={{ width: `${timelinePercent}%` }}
                />
                <div
                  className="timeline-thumb"
                  style={{ left: `calc(${timelinePercent}% - 8px)` }}
                />
                <div className="timeline-ticks">
                  {timelineSession.snapshots.map((_, i) => (
                    <div
                      key={i}
                      className={`timeline-tick ${i <= currentSnapshotIndex ? 'active' : ''}`}
                      style={{
                        left: `${snapshotCount > 1 ? (i / (snapshotCount - 1)) * 100 : 0}%`,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTimelineSeek(i);
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {panelPosition === 'bottom' && showPanel && (
        <div className="mobile-panel">
          <ReferencePanel
            text={text}
            onWordSelect={handleWordSelect}
            isVisible={showPanel}
          />
        </div>
      )}
    </div>
  );
}
