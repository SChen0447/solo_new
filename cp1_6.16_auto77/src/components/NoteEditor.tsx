import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import {
  useStore,
  TRACK_COLORS,
  playSnapClick,
  playNote,
  getEffectiveVolume,
} from '../store/useStore';

const GRID = 8;
const PX_PER_GRID = 12;
const PITCH_HEIGHT = 16;
const PITCH_RANGE = 48;
const MIN_PITCH = 36;
const TRACK_HEADER = 40;
const RULER_HEIGHT = 32;
const BEATS_PER_MEASURE = 4;

interface DragState {
  noteId: string;
  trackId: string;
  startPitch: number;
  startStart: number;
  startX: number;
  startY: number;
  lastSnapped: boolean;
}

const NoteEditor: React.FC = () => {
  const tracks = useStore((s) => s.tracks);
  const notes = useStore((s) => s.notes);
  const playhead = useStore((s) => s.playhead);
  const setPlayhead = useStore((s) => s.setPlayhead);
  const users = useStore((s) => s.users);
  const selfUserId = useStore((s) => s.selfUserId);
  const highlightedNoteIds = useStore((s) => s.highlightedNoteIds);
  const totalDuration = useStore((s) => s.totalDuration);

  const addNote = useStore((s) => s.addNote);
  const moveNote = useStore((s) => s.moveNote);
  const removeNote = useStore((s) => s.removeNote);

  const editorRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const scrollLeftRef = useRef(0);
  const scrollTopRef = useRef(0);

  const totalWidth = Math.max(totalDuration / GRID * PX_PER_GRID, 2000);
  const totalTrackHeight = tracks.length * (TRACK_HEADER + PITCH_RANGE * PITCH_HEIGHT);

  const snapToGrid = useCallback((val: number) => {
    return Math.round(val / GRID) * GRID;
  }, []);

  const handleRulerClick = (e: React.MouseEvent) => {
    if (!editorRef.current) return;
    const rect = editorRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + scrollLeftRef.current;
    const ticks = (x / PX_PER_GRID) * GRID;
    setPlayhead(Math.max(0, Math.min(ticks, totalDuration)));
  };

  const handleTrackClick = (e: React.MouseEvent, trackId: string) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('.note-block')) return;
    if (!editorRef.current) return;

    const track = tracks.find((t) => t.id === trackId);
    if (!track) return;
    const trackIndex = tracks.findIndex((t) => t.id === trackId);
    const trackY0 = trackIndex * (TRACK_HEADER + PITCH_RANGE * PITCH_HEIGHT) + TRACK_HEADER;

    const rect = editorRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + scrollLeftRef.current;
    const y = e.clientY - rect.top + scrollTopRef.current;

    const localY = y - trackY0;
    if (localY < 0 || localY >= PITCH_RANGE * PITCH_HEIGHT) return;

    const rawStart = (x / PX_PER_GRID) * GRID;
    const start = snapToGrid(rawStart);
    const pitch = MIN_PITCH + PITCH_RANGE - 1 - Math.floor(localY / PITCH_HEIGHT);

    if (pitch >= MIN_PITCH && pitch < MIN_PITCH + PITCH_RANGE) {
      playSnapClick();
      addNote(trackId, start, pitch, GRID * 2);
    }
  };

  const handleNoteMouseDown = (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;

    if (e.button === 2) {
      e.preventDefault();
      removeNote(noteId);
      return;
    }

    setDrag({
      noteId,
      trackId: note.trackId,
      startPitch: note.pitch,
      startStart: note.start,
      startX: e.clientX,
      startY: e.clientY,
      lastSnapped: true,
    });
    setDragPos({ x: 0, y: 0 });
  };

  useEffect(() => {
    if (!drag) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      setDragPos({ x: dx, y: dy });

      const deltaStart = (dx / PX_PER_GRID) * GRID;
      const deltaPitch = -Math.round(dy / PITCH_HEIGHT);

      const rawStart = drag.startStart + deltaStart;
      const rawPitch = drag.startPitch + deltaPitch;

      const startSnap = snapToGrid(rawStart);
      const pitchSnap = Math.max(MIN_PITCH, Math.min(MIN_PITCH + PITCH_RANGE - 1, rawPitch));

      if (!drag.lastSnapped && Math.abs(rawStart - startSnap) < 0.5) {
        playSnapClick();
        drag.lastSnapped = true;
      } else if (Math.abs(rawStart - startSnap) >= 0.5) {
        drag.lastSnapped = false;
      }

      moveNote(drag.noteId, Math.max(0, startSnap), pitchSnap);
    };

    const handleMouseUp = () => {
      const note = notes.find((n) => n.id === drag.noteId);
      if (note) {
        const finalStart = snapToGrid(note.start);
        const finalPitch = Math.max(MIN_PITCH, Math.min(MIN_PITCH + PITCH_RANGE - 1, note.pitch));
        if (finalStart !== note.start || finalPitch !== note.pitch) {
          moveNote(drag.noteId, finalStart, finalPitch);
        }
        playSnapClick();
      }
      setDrag(null);
      setDragPos(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [drag, snapToGrid, moveNote, notes]);

  const handlePlayheadDrag = useCallback(
    (e: React.MouseEvent) => {
      if (!editorRef.current) return;
      e.preventDefault();
      const rect = editorRef.current.getBoundingClientRect();

      const onMove = (ev: MouseEvent) => {
        const x = ev.clientX - rect.left + scrollLeftRef.current;
        const ticks = (x / PX_PER_GRID) * GRID;
        setPlayhead(Math.max(0, Math.min(ticks, totalDuration)));
      };
      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      onMove(e.nativeEvent);
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [setPlayhead, totalDuration],
  );

  const notesByTrack = useMemo(() => {
    const map = new Map<string, typeof notes>();
    tracks.forEach((t) => map.set(t.id, []));
    notes.forEach((n) => {
      const arr = map.get(n.trackId);
      if (arr) arr.push(n);
    });
    return map;
  }, [tracks, notes]);

  const pitchLabels = useMemo(() => {
    const labels: string[] = [];
    const noteNames = ['C', 'B', 'A#', 'A', 'G#', 'G', 'F#', 'F', 'E', 'D#', 'D', 'C#'];
    for (let i = PITCH_RANGE - 1; i >= 0; i--) {
      const pitch = MIN_PITCH + i;
      const octave = Math.floor(pitch / 12) - 1;
      const name = noteNames[pitch % 12];
      labels.push(`${name}${octave}`);
    }
    return labels;
  }, []);

  const isBlackKey = (pitch: number) => {
    const n = pitch % 12;
    return n === 1 || n === 3 || n === 6 || n === 8 || n === 10;
  };

  const renderRuler = () => {
    const beats = Math.ceil(totalDuration / (GRID * BEATS_PER_MEASURE)) + 1;
    const items = [];
    for (let i = 0; i < beats; i++) {
      const x = i * BEATS_PER_MEASURE * GRID * PX_PER_GRID / GRID;
      const measure = i + 1;
      items.push(
        <div
          key={`m-${i}`}
          style={{
            position: 'absolute',
            left: x,
            top: 0,
            bottom: 0,
            width: 1,
            background: 'rgba(255,255,255,0.1)',
          }}
        />,
      );
      items.push(
        <div
          key={`ml-${i}`}
          style={{
            position: 'absolute',
            left: x + 4,
            top: 8,
            fontSize: 10,
            color: '#606090',
            fontWeight: 600,
          }}
        >
          {measure}
        </div>,
      );
      for (let b = 1; b < BEATS_PER_MEASURE; b++) {
        const bx = x + b * GRID * PX_PER_GRID / GRID;
        items.push(
          <div
            key={`b-${i}-${b}`}
            style={{
              position: 'absolute',
              left: bx,
              top: 12,
              bottom: 0,
              width: 1,
              background: 'rgba(255,255,255,0.04)',
            }}
          />,
        );
      }
    }
    return items;
  };

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        background: '#1E1E2E',
      }}
      ref={editorRef}
    >
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          height: RULER_HEIGHT,
          background: 'rgba(42, 42, 62, 0.95)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid #3D3D5C',
          flexShrink: 0,
          overflow: 'hidden',
        }}
        onClick={handleRulerClick}
      >
        <div
          style={{
            position: 'relative',
            height: '100%',
            width: totalWidth,
            marginLeft: 44,
          }}
        >
          {renderRuler()}

          {users.map((u) => (
            <div
              key={`cursor-${u.id}`}
              style={{
                position: 'absolute',
                left: (u.cursor / GRID) * PX_PER_GRID - 8,
                top: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: u.color,
                  border: '2px solid #2A2A3E',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 8,
                  fontWeight: 800,
                  color: '#1E1E2E',
                  marginTop: 2,
                }}
              >
                {u.id === selfUserId ? '★' : u.name.slice(0, 1)}
              </div>
              {u.id !== selfUserId && (
                <div
                  style={{
                    fontSize: 9,
                    background: u.color,
                    color: '#1E1E2E',
                    padding: '1px 6px',
                    borderRadius: 4,
                    marginTop: -2,
                    whiteSpace: 'nowrap',
                    fontWeight: 600,
                  }}
                >
                  {u.name}
                </div>
              )}
              <div
                style={{
                  width: 2,
                  height: 2000,
                  background: u.color,
                  opacity: 0.3,
                  marginTop: -2,
                }}
              />
            </div>
          ))}

          <div
            onMouseDown={handlePlayheadDrag}
            style={{
              position: 'absolute',
              left: (playhead / GRID) * PX_PER_GRID - 8,
              top: -4,
              width: 16,
              height: RULER_HEIGHT + 8,
              cursor: 'col-resize',
              zIndex: 5,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                borderTop: '8px solid #FF5252',
                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))',
              }}
            />
          </div>
          <div
            style={{
              position: 'absolute',
              left: (playhead / GRID) * PX_PER_GRID,
              top: 0,
              width: 2,
              height: 2000,
              background: '#FF5252',
              pointerEvents: 'none',
              boxShadow: '0 0 8px rgba(255, 82, 82, 0.5)',
              zIndex: 4,
            }}
          />
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflow: 'auto',
          position: 'relative',
        }}
        onScroll={(e) => {
          scrollLeftRef.current = e.currentTarget.scrollLeft;
          scrollTopRef.current = e.currentTarget.scrollTop;
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div
          style={{
            position: 'relative',
            width: totalWidth + 44,
            minHeight: totalTrackHeight + RULER_HEIGHT,
          }}
        >
          {tracks.map((track, trackIdx) => {
            const trackY = trackIdx * (TRACK_HEADER + PITCH_RANGE * PITCH_HEIGHT);
            const trackNotes = notesByTrack.get(track.id) || [];
            const trackColor = TRACK_COLORS[track.type];

            return (
              <div
                key={track.id}
                onMouseDown={(e) => handleTrackClick(e, track.id)}
                style={{
                  position: 'absolute',
                  top: trackY,
                  left: 0,
                  right: 0,
                  width: totalWidth + 44,
                  userSelect: 'none',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: 44,
                    height: TRACK_HEADER,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderBottom: `2px solid ${trackColor}`,
                    background: 'rgba(42, 42, 62, 0.6)',
                  }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 4,
                      background: trackColor,
                    }}
                  />
                </div>

                <div
                  style={{
                    position: 'absolute',
                    left: 44,
                    top: 0,
                    height: TRACK_HEADER,
                    width: totalWidth,
                    borderBottom: `2px solid ${trackColor}55`,
                    background: `${trackColor}0A`,
                  }}
                />

                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: TRACK_HEADER,
                    width: 44,
                    height: PITCH_RANGE * PITCH_HEIGHT,
                    background: '#1A1A2A',
                    borderRight: '1px solid #2D2D4D',
                    overflow: 'hidden',
                  }}
                >
                  {pitchLabels.map((label, i) => (
                    <div
                      key={i}
                      style={{
                        position: 'absolute',
                        top: i * PITCH_HEIGHT,
                        height: PITCH_HEIGHT,
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        paddingRight: 6,
                        fontSize: 9,
                        color: isBlackKey(MIN_PITCH + PITCH_RANGE - 1 - i) ? '#505080' : '#7070A0',
                        fontWeight: 500,
                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                      }}
                    >
                      {label}
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    position: 'absolute',
                    left: 44,
                    top: TRACK_HEADER,
                    width: totalWidth,
                    height: PITCH_RANGE * PITCH_HEIGHT,
                  }}
                >
                  {Array.from({ length: PITCH_RANGE }).map((_, pi) => {
                    const pitch = MIN_PITCH + PITCH_RANGE - 1 - pi;
                    const isBlack = isBlackKey(pitch);
                    return (
                      <div
                        key={`pr-${pi}`}
                        style={{
                          position: 'absolute',
                          top: pi * PITCH_HEIGHT,
                          left: 0,
                          right: 0,
                          height: PITCH_HEIGHT,
                          background: isBlack ? 'rgba(0,0,0,0.12)' : 'transparent',
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                        }}
                      />
                    );
                  })}

                  {Array.from({ length: Math.ceil(totalDuration / (GRID * BEATS_PER_MEASURE)) + 1 }).map(
                    (_, i) => {
                      const x = i * BEATS_PER_MEASURE * GRID * PX_PER_GRID / GRID;
                      return (
                        <div
                          key={`vg-${i}`}
                          style={{
                            position: 'absolute',
                            left: x,
                            top: 0,
                            bottom: 0,
                            width: 1,
                            background: 'rgba(255,255,255,0.06)',
                          }}
                        />
                      );
                    },
                  )}

                  {trackNotes.map((note) => {
                    const px = (note.start / GRID) * PX_PER_GRID;
                    const pw = (note.duration / GRID) * PX_PER_GRID;
                    const py = (MIN_PITCH + PITCH_RANGE - 1 - note.pitch) * PITCH_HEIGHT;
                    const isHighlighted = highlightedNoteIds.has(note.id);
                    const isDragging = drag?.noteId === note.id;
                    const effVol = getEffectiveVolume(track, tracks);

                    return (
                      <div
                        key={note.id}
                        className="note-block"
                        onMouseDown={(e) => handleNoteMouseDown(e, note.id)}
                        onDoubleClick={() => {
                          playNote(note.pitch, effVol, track.type);
                        }}
                        style={{
                          position: 'absolute',
                          left: px,
                          top: py,
                          width: Math.max(pw, 6),
                          height: PITCH_HEIGHT - 2,
                          background: isHighlighted
                            ? '#FFF9C4'
                            : `${trackColor}${effVol === 0 ? '44' : 'DD'}`,
                          border: `1.5px solid ${isHighlighted ? '#FFD54F' : trackColor}`,
                          borderRadius: 4,
                          cursor: isDragging ? 'grabbing' : 'grab',
                          transform: isDragging && dragPos
                            ? `translate(${dragPos.x}px, ${dragPos.y}px)`
                            : 'none',
                          transition: isDragging ? 'none' : 'background 0.1s, box-shadow 0.1s',
                          boxShadow: isHighlighted
                            ? `0 0 12px #FFD54F88`
                            : isDragging
                            ? `0 4px 16px ${trackColor}55`
                            : `0 1px 3px rgba(0,0,0,0.3)`,
                          zIndex: isDragging ? 100 : 10,
                          opacity: effVol === 0 ? 0.3 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          paddingLeft: 4,
                          overflow: 'hidden',
                        }}
                        title="左键拖动 · 右键删除 · 双击试听"
                      >
                        <div
                          style={{
                            fontSize: 9,
                            color: isHighlighted ? '#5D4037' : '#1E1E2E',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                          }}
                        >
                          ♪
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 44 + (playhead / GRID) * PX_PER_GRID,
              width: 2,
              height: totalTrackHeight + RULER_HEIGHT,
              background: '#FF5252',
              pointerEvents: 'none',
              boxShadow: '0 0 8px rgba(255, 82, 82, 0.5)',
              zIndex: 20,
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default NoteEditor;
