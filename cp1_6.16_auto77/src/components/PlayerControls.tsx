import React, { useEffect, useRef, useCallback } from 'react';
import { useStore, playNote, getEffectiveVolume, TRACK_COLORS } from '../store/useStore';

const GRID = 8;
const BEATS_PER_MEASURE = 4;
const PX_PER_GRID = 12;
const TICKS_PER_PX = GRID / PX_PER_GRID;
const PITCH_HEIGHT = 16;
const PITCH_RANGE = 48;
const MIN_PITCH = 36;
const TRACK_ROW_HEIGHT = PITCH_RANGE * PITCH_HEIGHT + 40;

const PlayerControls: React.FC = () => {
  const isPlaying = useStore((s) => s.isPlaying);
  const setIsPlaying = useStore((s) => s.setIsPlaying);
  const playhead = useStore((s) => s.playhead);
  const setPlayhead = useStore((s) => s.setPlayhead);
  const totalDuration = useStore((s) => s.totalDuration);
  const tracks = useStore((s) => s.tracks);
  const notes = useStore((s) => s.notes);
  const highlightNote = useStore((s) => s.highlightNote);
  const clearHighlight = useStore((s) => s.clearHighlight);
  const exportMIDI = useStore((s) => s.exportMIDI);
  const roomId = useStore((s) => s.roomId);
  const users = useStore((s) => s.users);

  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const startPlayheadRef = useRef<number>(0);
  const lastTickRef = useRef<number>(-1);
  const scheduledNotesRef = useRef<Set<string>>(new Set());

  const TICKS_PER_SECOND = 128;

  const playLoop = useCallback(
    (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
        startPlayheadRef.current = playhead;
      }
      const elapsedSec = (timestamp - startTimeRef.current) / 1000;
      const newPlayhead = startPlayheadRef.current + elapsedSec * TICKS_PER_SECOND;

      if (newPlayhead >= totalDuration) {
        setPlayhead(totalDuration);
        setIsPlaying(false);
        return;
      }

      const currentTick = Math.floor(newPlayhead / GRID) * GRID;
      if (currentTick !== lastTickRef.current) {
        lastTickRef.current = currentTick;

        tracks.forEach((track) => {
          const effVol = getEffectiveVolume(track, tracks);
          if (effVol <= 0) return;

          notes.forEach((note) => {
            if (note.trackId !== track.id) return;
            if (note.start === currentTick && !scheduledNotesRef.current.has(note.id)) {
              scheduledNotesRef.current.add(note.id);
              playNote(note.pitch, effVol, track.type);
              highlightNote(note.id);
              setTimeout(() => clearHighlight(note.id), 100);
            }
          });
        });
      }

      setPlayhead(newPlayhead);
      rafRef.current = requestAnimationFrame(playLoop);
    },
    [playhead, totalDuration, tracks, notes, setPlayhead, setIsPlaying, highlightNote, clearHighlight],
  );

  useEffect(() => {
    if (isPlaying) {
      startTimeRef.current = 0;
      startPlayheadRef.current = 0;
      lastTickRef.current = -1;
      scheduledNotesRef.current = new Set();
      rafRef.current = requestAnimationFrame(playLoop);
    } else if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, playLoop]);

  const handlePlayPause = () => {
    if (!isPlaying && playhead >= totalDuration - 1) {
      setPlayhead(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleStop = () => {
    setIsPlaying(false);
    setPlayhead(0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlayhead(parseFloat(e.target.value));
  };

  const handleExport = () => {
    exportMIDI();
  };

  const formatTime = (ticks: number) => {
    const seconds = ticks / TICKS_PER_SECOND;
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      style={{
        background: 'rgba(42, 42, 62, 0.85)',
        backdropFilter: 'blur(8px)',
        borderTop: '1px solid #3D3D5C',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 20,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={handleStop}
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            border: '1px solid #3D3D5C',
            background: '#2A2A3E',
            color: '#E0E0E0',
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="停止"
        >
          ■
        </button>
        <button
          onClick={handlePlayPause}
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            border: 'none',
            background: isPlaying ? '#FFB74D' : '#64B5F6',
            color: '#1E1E2E',
            fontSize: 18,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 4px 16px ${isPlaying ? '#FFB74D44' : '#64B5F644'}`,
          }}
          title={isPlaying ? '暂停' : '播放'}
        >
          {isPlaying ? '❚❚' : '▶'}
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span
          style={{
            fontSize: 13,
            fontVariantNumeric: 'tabular-nums',
            color: '#9090B0',
            minWidth: 50,
          }}
        >
          {formatTime(playhead)}
        </span>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            type="range"
            min={0}
            max={totalDuration}
            step={0.1}
            value={playhead}
            onChange={handleSeek}
            style={{ width: '100%' }}
          />
        </div>
        <span
          style={{
            fontSize: 13,
            fontVariantNumeric: 'tabular-nums',
            color: '#9090B0',
            minWidth: 50,
            textAlign: 'right',
          }}
        >
          {formatTime(totalDuration)}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={handleExport}
          style={{
            padding: '10px 16px',
            borderRadius: 10,
            border: '1px solid #4ECDC4',
            background: 'rgba(78, 205, 196, 0.15)',
            color: '#4ECDC4',
            fontSize: 12,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
          title="导出 MIDI 文件"
        >
          ↓ 导出 MIDI
        </button>
      </div>

      {roomId && (
        <div
          style={{
            padding: '8px 14px',
            borderRadius: 10,
            background: 'rgba(100, 181, 246, 0.15)',
            border: '1px solid #64B5F633',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div style={{ fontSize: 11, color: '#9090B0' }}>房间码</div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: 2,
              color: '#64B5F6',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {roomId}
          </div>
          <div
            style={{
              width: 1,
              height: 20,
              background: '#3D3D5C',
            }}
          />
          <div style={{ display: 'flex', gap: 4 }}>
            {users.map((u) => (
              <div
                key={u.id}
                title={u.name}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: u.color,
                  border: '2px solid #2A2A3E',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#1E1E2E',
                }}
              >
                {u.name.slice(0, 1)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerControls;
