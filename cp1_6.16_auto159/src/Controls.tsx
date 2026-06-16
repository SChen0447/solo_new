import React, { useEffect } from 'react';
import { NoteDuration, DURATION_LABELS } from './ScoreData';
import { PlaybackState } from './MusicEngine';

interface ControlsProps {
  selectedDuration: NoteDuration;
  onDurationChange: (duration: NoteDuration) => void;
  bpm: number;
  onBpmChange: (bpm: number) => void;
  playbackState: PlaybackState;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onClear: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const DURATIONS: NoteDuration[] = ['sixteenth', 'eighth', 'quarter', 'half', 'whole'];

const Controls: React.FC<ControlsProps> = ({
  selectedDuration,
  onDurationChange,
  bpm,
  onBpmChange,
  playbackState,
  onPlay,
  onPause,
  onStop,
  onClear,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          onUndo();
        } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
          e.preventDefault();
          onRedo();
        }
      }
      if (e.code === 'Space') {
        e.preventDefault();
        if (playbackState === 'playing') {
          onPause();
        } else {
          onPlay();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playbackState, onPlay, onPause, onUndo, onRedo]);

  const buttonStyle = (isSelected: boolean): React.CSSProperties => ({
    padding: '8px 16px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    backgroundColor: isSelected ? '#64B5F6' : '#3A3A50',
    color: isSelected ? '#FFFFFF' : '#E0E0E0',
    fontSize: '13px',
    fontWeight: isSelected ? 600 : 400,
    transition: 'all 0.3s ease',
    outline: 'none',
  });

  const controlButtonStyle = (active?: boolean): React.CSSProperties => ({
    padding: '10px 20px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    backgroundColor: active ? '#64B5F6' : '#3A3A50',
    color: active ? '#FFFFFF' : '#E0E0E0',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    outline: 'none',
  });

  const iconButtonStyle = (enabled: boolean): React.CSSProperties => ({
    padding: '10px 14px',
    border: 'none',
    borderRadius: '6px',
    cursor: enabled ? 'pointer' : 'not-allowed',
    backgroundColor: enabled ? '#3A3A50' : '#2A2A3E',
    color: enabled ? '#E0E0E0' : '#555566',
    fontSize: '14px',
    transition: 'all 0.2s ease',
    outline: 'none',
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '20px',
        backgroundColor: '#2A2A3E',
        borderRadius: '8px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            color: '#E0E0E0',
            fontSize: '13px',
            fontWeight: 500,
            marginRight: '4px',
          }}
        >
          时值选择:
        </span>
        {DURATIONS.map((dur) => (
          <button
            key={dur}
            style={buttonStyle(selectedDuration === dur)}
            onClick={() => onDurationChange(dur)}
            onMouseEnter={(e) => {
              if (selectedDuration !== dur) {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                  '#4A4A65';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedDuration !== dur) {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                  '#3A3A50';
              }
            }}
          >
            {DURATION_LABELS[dur]}
          </button>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '8px',
          }}
        >
          <button
            style={{
              ...controlButtonStyle(playbackState !== 'playing'),
              backgroundColor:
                playbackState !== 'playing' ? '#7E57C2' : '#3A3A50',
              minWidth: '90px',
              justifyContent: 'center',
            }}
            onClick={onPlay}
            disabled={playbackState === 'playing'}
            onMouseEnter={(e) => {
              if (playbackState !== 'playing') {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                  '#9575CD';
              }
            }}
            onMouseLeave={(e) => {
              if (playbackState !== 'playing') {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                  '#7E57C2';
              }
            }}
          >
            ▶ 播放
          </button>
          <button
            style={{
              ...controlButtonStyle(),
              minWidth: '90px',
              justifyContent: 'center',
            }}
            onClick={onPause}
            disabled={playbackState !== 'playing'}
            onMouseEnter={(e) => {
              if (playbackState === 'playing') {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                  '#4A4A65';
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                '#3A3A50';
            }}
          >
            ⏸ 暂停
          </button>
          <button
            style={{
              ...controlButtonStyle(),
              minWidth: '90px',
              justifyContent: 'center',
            }}
            onClick={onStop}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                '#4A4A65';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                '#3A3A50';
            }}
          >
            ⏹ 停止
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <span
            style={{
              color: '#E0E0E0',
              fontSize: '13px',
              fontWeight: 500,
              whiteSpace: 'nowrap',
            }}
          >
            BPM:
          </span>
          <input
            type="range"
            min={40}
            max={240}
            step={5}
            value={bpm}
            onChange={(e) => onBpmChange(parseInt(e.target.value))}
            style={{
              width: '180px',
              height: '6px',
              WebkitAppearance: 'none',
              appearance: 'none',
              backgroundColor: '#444466',
              borderRadius: '3px',
              outline: 'none',
              cursor: 'pointer',
            }}
          />
          <span
            style={{
              color: '#E0E0E0',
              fontSize: '14px',
              fontWeight: 600,
              minWidth: '45px',
              textAlign: 'center',
              backgroundColor: '#3A3A50',
              padding: '4px 10px',
              borderRadius: '4px',
            }}
          >
            {bpm}
          </span>
        </div>

        <div style={{ flex: 1 }} />

        <button
          style={iconButtonStyle(canUndo)}
          onClick={onUndo}
          disabled={!canUndo}
          title="撤销 (Ctrl+Z)"
        >
          ↶ 撤销
        </button>
        <button
          style={iconButtonStyle(canRedo)}
          onClick={onRedo}
          disabled={!canRedo}
          title="重做 (Ctrl+Y)"
        >
          ↷ 重做
        </button>
        <button
          style={{
            ...iconButtonStyle(true),
            backgroundColor: '#C62828',
            color: '#FFFFFF',
          }}
          onClick={onClear}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              '#D32F2F';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              '#C62828';
          }}
        >
          🗑 清空
        </button>
      </div>

      <style>{`
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #7E57C2;
          cursor: pointer;
          border: 2px solid #9575CD;
          transition: background 0.2s ease, transform 0.1s ease;
        }
        input[type='range']::-webkit-slider-thumb:hover {
          background: #9575CD;
          transform: scale(1.1);
        }
        input[type='range']::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #7E57C2;
          cursor: pointer;
          border: 2px solid #9575CD;
          transition: background 0.2s ease;
        }
        input[type='range']::-moz-range-thumb:hover {
          background: #9575CD;
        }
        button:disabled {
          opacity: 0.5;
          cursor: not-allowed !important;
        }
      `}</style>
    </div>
  );
};

export default Controls;
