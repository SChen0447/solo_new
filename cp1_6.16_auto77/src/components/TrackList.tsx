import React from 'react';
import { useStore, TRACK_COLORS, TRACK_TYPES, getEffectiveVolume } from '../store/useStore';

interface TrackListProps {
  onResize?: (width: number) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const typeNames: Record<string, string> = {
  melody: '旋律',
  chord: '和弦',
  percussion: '打击乐',
};

const TrackList: React.FC<TrackListProps> = ({ collapsed, onToggleCollapse }) => {
  const tracks = useStore((s) => s.tracks);
  const notes = useStore((s) => s.notes);
  const addTrack = useStore((s) => s.addTrack);
  const removeTrack = useStore((s) => s.removeTrack);
  const toggleMute = useStore((s) => s.toggleMute);
  const toggleSolo = useStore((s) => s.toggleSolo);
  const setVolume = useStore((s) => s.setVolume);

  if (collapsed) {
    return (
      <div
        style={{
          width: 48,
          background: 'rgba(42, 42, 62, 0.85)',
          backdropFilter: 'blur(8px)',
          borderRight: '1px solid #3D3D5C',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '12px 0',
          gap: 8,
        }}
      >
        <button
          onClick={onToggleCollapse}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: '#3D3D5C',
            border: 'none',
            color: '#E0E0E0',
            fontSize: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="展开音轨面板"
        >
          ‹
        </button>
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {tracks.map((t) => (
            <div
              key={t.id}
              title={t.name}
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: TRACK_COLORS[t.type],
                opacity: t.muted ? 0.3 : 1,
                border: t.solo ? '2px solid #fff' : '2px solid transparent',
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'rgba(42, 42, 62, 0.85)',
        backdropFilter: 'blur(8px)',
        borderRight: '1px solid #3D3D5C',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        height: '100%',
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #3D3D5C',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600, color: '#E0E0E0' }}>
          音轨 ({tracks.length}/8)
        </div>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            style={{
              width: 24,
              height: 24,
              borderRadius: 4,
              background: 'transparent',
              border: '1px solid #3D3D5C',
              color: '#9090B0',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="折叠"
          >
            ›
          </button>
        )}
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {tracks.map((track) => {
          const noteCount = notes.filter((n) => n.trackId === track.id).length;
          const effVolume = getEffectiveVolume(track, tracks);
          return (
            <div
              key={track.id}
              style={{
                background: 'rgba(30, 30, 46, 0.6)',
                borderRadius: 10,
                padding: 12,
                border: `2px solid ${TRACK_COLORS[track.type]}33`,
                borderLeft: `4px solid ${TRACK_COLORS[track.type]}`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 10,
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#E0E0E0' }}>
                    {track.name}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: '#9090B0',
                      marginTop: 2,
                      display: 'flex',
                      gap: 8,
                    }}
                  >
                    <span>{typeNames[track.type]}</span>
                    <span>·</span>
                    <span>{noteCount} 音符</span>
                  </div>
                </div>
                <button
                  onClick={() => removeTrack(track.id)}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    background: 'transparent',
                    border: '1px solid #4D4D7C',
                    color: '#9090B0',
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="删除音轨"
                >
                  ×
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <button
                  onClick={() => toggleMute(track.id)}
                  style={{
                    minWidth: 40,
                    padding: '4px 8px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    border: 'none',
                    background: track.muted ? '#FF5252' : '#3D3D5C',
                    color: track.muted ? '#fff' : '#E0E0E0',
                    transition: 'all 0.15s',
                  }}
                >
                  M
                </button>
                <button
                  onClick={() => toggleSolo(track.id)}
                  style={{
                    minWidth: 40,
                    padding: '4px 8px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    border: 'none',
                    background: track.solo ? '#FFB74D' : '#3D3D5C',
                    color: track.solo ? '#1E1E2E' : '#E0E0E0',
                    transition: 'all 0.15s',
                  }}
                >
                  S
                </button>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={track.volume}
                    onChange={(e) => setVolume(track.id, parseInt(e.target.value))}
                    style={{ flex: 1 }}
                  />
                  <span
                    style={{
                      fontSize: 11,
                      color: effVolume === 0 ? '#FF5252' : '#9090B0',
                      minWidth: 28,
                      textAlign: 'right',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {Math.round(effVolume)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          padding: 12,
          borderTop: '1px solid #3D3D5C',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div style={{ fontSize: 11, color: '#9090B0', marginBottom: 2 }}>添加音轨</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {TRACK_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => addTrack(type)}
              disabled={tracks.length >= 8}
              style={{
                flex: 1,
                padding: '8px 4px',
                borderRadius: 8,
                border: '1px solid #3D3D5C',
                background: `${TRACK_COLORS[type]}22`,
                color: TRACK_COLORS[type],
                fontSize: 11,
                fontWeight: 600,
                cursor: tracks.length >= 8 ? 'not-allowed' : 'pointer',
                opacity: tracks.length >= 8 ? 0.4 : 1,
                transition: 'all 0.15s',
              }}
            >
              +{typeNames[type]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TrackList;
