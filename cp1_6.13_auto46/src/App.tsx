import { useCallback, useEffect, useRef } from 'react';
import Piano from '@/components/Piano';
import SheetMusic from '@/components/SheetMusic';
import { usePianoStore } from '@/store/usePianoStore';
import { SONGS } from '@/data/songs';
import { useAudio } from '@/hooks/useAudio';
import './App.css';

export default function App() {
  const {
    learningMode, setLearningMode,
    currentSongIndex, setCurrentSongIndex,
    currentNoteIndex, feedbackType,
    isRecording, startRecording, stopRecording,
    recording, isPlayingBack, setPlayingBack,
    playbackSpeed, setPlaybackSpeed,
    theme, setTheme,
    addActiveNote, removeActiveNote,
  } = usePianoStore();

  const { playNote } = useAudio();
  const playbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playbackIdxRef = useRef(0);

  const currentSong = SONGS[currentSongIndex];
  const songNotes = currentSong?.notes ?? [];

  const handleStartLearning = useCallback(() => {
    setLearningMode(!learningMode);
  }, [learningMode, setLearningMode]);

  const handleRecord = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const handlePlayback = useCallback(() => {
    if (isPlayingBack) {
      if (playbackRef.current) clearTimeout(playbackRef.current);
      setPlayingBack(false);
      playbackIdxRef.current = 0;
      return;
    }

    if (recording.length === 0) return;
    setPlayingBack(true);
    playbackIdxRef.current = 0;

    const playNext = (idx: number) => {
      if (idx >= recording.length) {
        setPlayingBack(false);
        playbackIdxRef.current = 0;
        return;
      }
      const item = recording[idx];
      playNote(item.note);
      addActiveNote(item.note);

      const holdTime = 200;
      playbackRef.current = setTimeout(() => {
        removeActiveNote(item.note);
      }, holdTime / playbackSpeed);

      const nextTime = idx + 1 < recording.length
        ? (recording[idx + 1].timestamp - item.timestamp) / playbackSpeed
        : 500;

      playbackIdxRef.current = idx + 1;
      playbackRef.current = setTimeout(() => playNext(idx + 1), Math.max(nextTime, 50));
    };

    playNext(0);
  }, [isPlayingBack, recording, playNote, addActiveNote, removeActiveNote, setPlayingBack, playbackSpeed]);

  useEffect(() => {
    return () => {
      if (playbackRef.current) clearTimeout(playbackRef.current);
    };
  }, []);

  const themes: { key: typeof theme; label: string; icon: string }[] = [
    { key: 'classic', label: '经典', icon: '☽' },
    { key: 'cosmic', label: '星光', icon: '✦' },
    { key: 'sunset', label: '暖阳', icon: '☀' },
  ];

  return (
    <div className={`app-container theme-${theme}`}>
      <header className="app-header">
        <h1 className="app-title">指尖琴音</h1>
        <div className="theme-switcher">
          {themes.map((t) => (
            <button
              key={t.key}
              className={`theme-btn ${theme === t.key ? 'theme-active' : ''}`}
              onClick={() => setTheme(t.key)}
              title={t.label}
            >
              <span className="theme-icon">{t.icon}</span>
              <span className="theme-label">{t.label}</span>
            </button>
          ))}
        </div>
      </header>

      <main className="app-main">
        <div className="control-panel control-left">
          <div className="panel-section">
            <label className="panel-label">选择歌曲</label>
            <select
              className="song-select"
              value={currentSongIndex}
              onChange={(e) => setCurrentSongIndex(Number(e.target.value))}
            >
              {SONGS.map((s, i) => (
                <option key={i} value={i}>{s.name}</option>
              ))}
            </select>
          </div>
          <button
            className={`ctrl-btn ${learningMode ? 'ctrl-btn-active' : ''}`}
            onClick={handleStartLearning}
          >
            {learningMode ? '停止学习' : '开始学习'}
          </button>
          {learningMode && (
            <div className="learning-status">
              <span className="status-text">
                {feedbackType === 'correct' && '✓ 正确！'}
                {feedbackType === 'wrong' && '✗ 再试一次'}
                {!feedbackType && `第 ${currentNoteIndex + 1}/${songNotes.length} 个音符`}
              </span>
            </div>
          )}
        </div>

        <div className="center-area">
          <SheetMusic
            notes={songNotes}
            currentIndex={currentNoteIndex}
            isPlaying={learningMode}
            feedback={feedbackType}
          />
          <div className="separator" />
          <Piano />
        </div>

        <div className="control-panel control-right">
          <button
            className={`ctrl-btn ${isRecording ? 'ctrl-btn-recording' : ''}`}
            onClick={handleRecord}
          >
            {isRecording ? '■ 停止录音' : '● 录音'}
          </button>
          <button
            className="ctrl-btn"
            onClick={handlePlayback}
            disabled={recording.length === 0 && !isPlayingBack}
          >
            {isPlayingBack ? '■ 停止回放' : '▶ 回放'}
          </button>
          <div className="panel-section">
            <label className="panel-label">回放速度</label>
            <div className="speed-btns">
              {[0.5, 1, 2].map((s) => (
                <button
                  key={s}
                  className={`speed-btn ${playbackSpeed === s ? 'speed-active' : ''}`}
                  onClick={() => setPlaybackSpeed(s)}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
          {recording.length > 0 && !isRecording && (
            <div className="recording-info">
              已录制 {recording.length} 个音符
            </div>
          )}
        </div>
      </main>

      <div className="mobile-controls">
        <div className="mobile-row">
          <select
            className="song-select mobile"
            value={currentSongIndex}
            onChange={(e) => setCurrentSongIndex(Number(e.target.value))}
          >
            {SONGS.map((s, i) => (
              <option key={i} value={i}>{s.name}</option>
            ))}
          </select>
          <button
            className={`ctrl-btn mobile ${learningMode ? 'ctrl-btn-active' : ''}`}
            onClick={handleStartLearning}
          >
            {learningMode ? '停止' : '学习'}
          </button>
          <button
            className={`ctrl-btn mobile ${isRecording ? 'ctrl-btn-recording' : ''}`}
            onClick={handleRecord}
          >
            {isRecording ? '■' : '●'}
          </button>
          <button
            className="ctrl-btn mobile"
            onClick={handlePlayback}
            disabled={recording.length === 0 && !isPlayingBack}
          >
            {isPlayingBack ? '■' : '▶'}
          </button>
        </div>
        <div className="mobile-row speed-row">
          {[0.5, 1, 2].map((s) => (
            <button
              key={s}
              className={`speed-btn ${playbackSpeed === s ? 'speed-active' : ''}`}
              onClick={() => setPlaybackSpeed(s)}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
