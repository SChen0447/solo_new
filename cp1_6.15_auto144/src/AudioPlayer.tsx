import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Podcast, Episode, Note } from './types';
import { PodcastManager } from './PodcastManager';

interface AudioPlayerProps {
  podcast: Podcast | null;
  episode: Episode | null;
  onProgressUpdate?: () => void;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ podcast, episode, onProgressUpdate }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showNoteBubble, setShowNoteBubble] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [notes, setNotes] = useState<Note[]>([]);
  const lastSavedTimeRef = useRef(0);
  const playbackRateRef = useRef(1);

  useEffect(() => {
    if (episode) {
      setNotes(PodcastManager.getNotesForEpisode(episode.id));
    } else {
      setNotes([]);
    }
  }, [episode?.id]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !episode) return;

    const savedProgress = PodcastManager.getProgress(episode.id);
    if (savedProgress > 0) {
      audio.currentTime = savedProgress;
      setCurrentTime(savedProgress);
    } else {
      setCurrentTime(0);
    }
    setDuration(0);
    setShowNoteBubble(false);
    setNoteText('');

    if (podcast && episode.audioUrl) {
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise.then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      }
    }
  }, [episode?.audioUrl]);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || isDragging) return;
    setCurrentTime(audio.currentTime);

    if (audio.currentTime - lastSavedTimeRef.current >= 5 && podcast && episode) {
      PodcastManager.saveProgress(episode.id, audio.currentTime);
      PodcastManager.saveListeningRecord(
        podcast,
        episode,
        audio.currentTime,
        audio.duration > 0 && audio.currentTime / audio.duration >= 0.9
      );
      lastSavedTimeRef.current = audio.currentTime;
      onProgressUpdate?.();
    }
  }, [isDragging, podcast, episode, onProgressUpdate]);

  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setDuration(audio.duration || 0);
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(duration || audioRef.current?.duration || 0);
    if (podcast && episode) {
      PodcastManager.saveProgress(episode.id, episode.duration || duration || 0);
      PodcastManager.markAsListened(episode.id, true);
      PodcastManager.saveListeningRecord(
        podcast,
        episode,
        episode.duration || duration || audioRef.current?.duration || 0,
        true
      );
      onProgressUpdate?.();
    }
  }, [duration, podcast, episode, onProgressUpdate]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, []);

  const seekTo = useCallback((clientX: number) => {
    const audio = audioRef.current;
    const track = progressRef.current;
    if (!audio || !track || !duration) return;
    const rect = track.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const newTime = pct * duration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  }, [duration]);

  const handleProgressMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    seekTo(e.clientX);

    const handleMouseMove = (ev: MouseEvent) => seekTo(ev.clientX);
    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [seekTo]);

  const handleProgressTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true);
    const touch = e.touches[0];
    seekTo(touch.clientX);

    const handleTouchMove = (ev: TouchEvent) => {
      if (ev.touches[0]) seekTo(ev.touches[0].clientX);
    };
    const handleTouchEnd = () => {
      setIsDragging(false);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
  }, [seekTo]);

  const skipBack = useCallback(() => {
    const audio = audioRef.current;
    if (audio) audio.currentTime = Math.max(0, audio.currentTime - 15);
  }, []);

  const skipForward = useCallback(() => {
    const audio = audioRef.current;
    if (audio) audio.currentTime = Math.min(duration || audio.duration || 0, audio.currentTime + 30);
  }, [duration]);

  const addNote = useCallback(() => {
    if (!podcast || !episode || !noteText.trim()) return;
    PodcastManager.addNote(podcast.id, episode.id, currentTime, noteText.trim());
    setNotes(PodcastManager.getNotesForEpisode(episode.id));
    setNoteText('');
  }, [podcast, episode, currentTime, noteText]);

  const deleteNote = useCallback((noteId: string) => {
    PodcastManager.deleteNote(noteId);
    if (episode) {
      setNotes(PodcastManager.getNotesForEpisode(episode.id));
    }
  }, [episode?.id]);

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!episode || !podcast) {
    return (
      <div className="audio-player">
        <div className="player-cover" style={{ background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontSize: 20 }}>
          ♪
        </div>
        <div className="player-info">
          <div className="player-title" style={{ color: '#888' }}>选择一期节目开始收听</div>
          <div className="player-podcast" style={{ color: '#666' }}>点击节目列表中的标题即可播放</div>
        </div>
        <div className="player-controls">
          <div className="player-buttons">
            <button className="play-btn" onClick={togglePlay} disabled>
              ▶
            </button>
          </div>
          <div className="progress-container">
            <span className="time-label">0:00</span>
            <div className="progress-wrapper">
              <div className="progress-track">
                <div className="progress-filled" style={{ width: '0%' }}>
                  <div className="progress-thumb" />
                </div>
              </div>
            </div>
            <span className="time-label">0:00</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <audio
        ref={audioRef}
        src={episode.audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        preload="metadata"
      />
      <div className="audio-player">
        <img
          className="player-cover"
          src={episode.cover || podcast.cover}
          alt={episode.title}
          onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }}
        />
        <div className="player-info">
          <div className="player-title" title={episode.title}>{episode.title}</div>
          <div className="player-podcast" title={podcast.title}>{podcast.title}</div>
        </div>
        <div className="player-controls">
          {showNoteBubble && (
            <div className="note-bubble" onClick={(e) => e.stopPropagation()}>
              <div className="note-bubble-header">
                <span className="note-bubble-title">📝 添加笔记</span>
                <span className="note-bubble-time">{formatTime(currentTime)}</span>
              </div>
              <textarea
                className="note-textarea"
                placeholder="记录你的想法、灵感或要点..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                autoFocus
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-sm" onClick={addNote} disabled={!noteText.trim()}>
                  保存
                </button>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => setShowNoteBubble(false)}
                >
                  取消
                </button>
              </div>
              {notes.length > 0 && (
                <div className="note-list">
                  <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>
                    本期笔记 ({notes.length})
                  </div>
                  {notes.map((n) => (
                    <div key={n.id} className="note-list-item">
                      <button className="note-delete" onClick={() => deleteNote(n.id)}>✕</button>
                      <div className="note-list-item-time">{formatTime(n.timestamp)}</div>
                      <div>{n.content}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            className="note-float-btn"
            onClick={(e) => {
              e.stopPropagation();
              setShowNoteBubble(!showNoteBubble);
            }}
            title="添加笔记"
          >
            {showNoteBubble ? '✕' : '✎'}
          </button>

          <div className="player-buttons">
            <button className="secondary-player-btn" onClick={skipBack} title="后退15秒">
              ⏪
            </button>
            <button className="play-btn" onClick={togglePlay} title={isPlaying ? '暂停' : '播放'}>
              {isPlaying ? '❚❚' : '▶'}
            </button>
            <button className="secondary-player-btn" onClick={skipForward} title="前进30秒">
              ⏩
            </button>
          </div>
          <div className="progress-container">
            <span className="time-label">{formatTime(currentTime)}</span>
            <div
              ref={progressRef}
              className={`progress-wrapper ${isDragging ? 'dragging' : ''}`}
              onMouseDown={handleProgressMouseDown}
              onTouchStart={handleProgressTouchStart}
            >
              <div className="progress-track">
                <div className="progress-filled" style={{ width: `${progressPct}%` }}>
                  <div className="progress-thumb" />
                </div>
              </div>
            </div>
            <span className="time-label">{formatTime(duration || episode.duration)}</span>
          </div>
        </div>
      </div>
    </>
  );
};
