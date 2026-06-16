import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Note,
  NoteDuration,
  MIN_PITCH,
  MAX_PITCH,
  MAX_COLUMNS,
  DURATION_TO_EIGHTHS,
  isBlackKey,
} from './ScoreData';

interface NoteEditorProps {
  notes: Note[];
  selectedDuration: NoteDuration;
  currentColumn: number;
  onAddNote: (pitch: number, startTime: number) => void;
  onRemoveNote: (noteId: string) => void;
  onMoveNote: (noteId: string, newPitch: number) => void;
}

const PADDING_LEFT = 70;
const PADDING_TOP = 40;
const PADDING_BOTTOM = 30;
const COL_WIDTH = 24;
const ROW_HEIGHT = 10;
const STAFF_LINE_COUNT = 5;
const MIDDLE_C_PITCH = 60;
const TOP_STAFF_PITCH = 71;
const BOTTOM_STAFF_PITCH = 59;

const SVG_WIDTH = PADDING_LEFT + MAX_COLUMNS * COL_WIDTH + 30;
const SVG_HEIGHT =
  PADDING_TOP +
  (MAX_PITCH - MIN_PITCH + 1) * ROW_HEIGHT +
  PADDING_BOTTOM;

const NOTE_HEAD_WIDTH = 18;
const NOTE_HEAD_HEIGHT = 12;

const TrebleClef: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <text
    x={x}
    y={y}
    fill="#E0E0E0"
    fontSize="90"
    fontFamily="serif"
    style={{ userSelect: 'none' }}
  >
    𝄞
  </text>
);

interface NoteHeadProps {
  note: Note;
  x: number;
  y: number;
  isDragging: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onClick: (e: React.MouseEvent) => void;
}

const NoteHead: React.FC<NoteHeadProps> = ({
  note,
  x,
  y,
  isDragging,
  onMouseDown,
  onClick,
}) => {
  const color = isDragging ? '#FF7043' : '#F9A825';
  const durationEighths = DURATION_TO_EIGHTHS[note.duration];
  const width = NOTE_HEAD_WIDTH + Math.min((durationEighths - 1) * 4, 20);

  return (
    <g
      className="note-head"
      style={{
        cursor: 'pointer',
        transition: isDragging ? 'none' : 'transform 0.2s ease',
      }}
      onMouseDown={onMouseDown}
      onClick={onClick}
    >
      <ellipse
        cx={x + width / 2}
        cy={y}
        rx={width / 2}
        ry={NOTE_HEAD_HEIGHT / 2}
        fill={color}
        style={{
          animation: 'notePopIn 0.2s ease-out',
          filter: isDragging
            ? 'drop-shadow(0 0 6px rgba(255,112,67,0.6))'
            : 'drop-shadow(0 0 3px rgba(249,168,37,0.4))',
        }}
      />
    </g>
  );
};

const NoteEditor: React.FC<NoteEditorProps> = ({
  notes,
  selectedDuration,
  currentColumn,
  onAddNote,
  onRemoveNote,
  onMoveNote,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingNote, setDraggingNote] = useState<string | null>(null);
  const [dragY, setDragY] = useState<number | null>(null);
  const [newlyAddedIds, setNewlyAddedIds] = useState<Set<string>>(new Set());

  const pitchToY = useCallback((pitch: number): number => {
    return PADDING_TOP + (MAX_PITCH - pitch) * ROW_HEIGHT;
  }, []);

  const yToPitch = useCallback((y: number): number => {
    const rawPitch = MAX_PITCH - Math.round((y - PADDING_TOP) / ROW_HEIGHT);
    return Math.max(MIN_PITCH, Math.min(MAX_PITCH, rawPitch));
  }, []);

  const colToX = useCallback((col: number): number => {
    return PADDING_LEFT + col * COL_WIDTH + COL_WIDTH / 2 - NOTE_HEAD_WIDTH / 2;
  }, []);

  const xToCol = useCallback((x: number): number => {
    const rawCol = Math.floor((x - PADDING_LEFT) / COL_WIDTH);
    return Math.max(0, Math.min(MAX_COLUMNS - 1, rawCol));
  }, []);

  const getSvgCoords = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = SVG_WIDTH / rect.width;
    const scaleY = SVG_HEIGHT / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const handleGridClick = useCallback(
    (e: React.MouseEvent) => {
      if (draggingNote) return;
      const { x, y } = getSvgCoords(e);
      const col = xToCol(x);
      const pitch = yToPitch(y);

      const durationEighths = DURATION_TO_EIGHTHS[selectedDuration];
      const endCol = col + durationEighths;
      if (endCol > MAX_COLUMNS) return;

      const existingNote = notes.find((n) => {
        const nEnd = n.startTime + DURATION_TO_EIGHTHS[n.duration];
        return pitch === n.pitch && col < nEnd && n.startTime < endCol;
      });

      if (existingNote) {
        onRemoveNote(existingNote.id);
      } else {
        onAddNote(pitch, col);
      }
    },
    [draggingNote, notes, selectedDuration, getSvgCoords, xToCol, yToPitch, onAddNote, onRemoveNote]
  );

  const handleNoteMouseDown = useCallback(
    (e: React.MouseEvent, noteId: string) => {
      e.stopPropagation();
      setDraggingNote(noteId);
      const { y } = getSvgCoords(e);
      setDragY(y);
    },
    [getSvgCoords]
  );

  const handleNoteClick = useCallback(
    (e: React.MouseEvent, noteId: string) => {
      e.stopPropagation();
      if (!draggingNote) {
        onRemoveNote(noteId);
      }
    },
    [draggingNote, onRemoveNote]
  );

  useEffect(() => {
    if (!draggingNote) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { y } = getSvgCoords(e);
      setDragY(y);
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (draggingNote) {
        const { y } = getSvgCoords(e);
        const newPitch = yToPitch(y);
        onMoveNote(draggingNote, newPitch);
      }
      setDraggingNote(null);
      setDragY(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingNote, getSvgCoords, yToPitch, onMoveNote]);

  useEffect(() => {
    if (notes.length > 0) {
      const ids = new Set(notes.slice(-1).map((n) => n.id));
      setNewlyAddedIds(ids);
      const timer = setTimeout(() => setNewlyAddedIds(new Set()), 300);
      return () => clearTimeout(timer);
    }
  }, [notes.length]);

  const renderStaffLines = () => {
    const lines = [];
    for (let i = 0; i < STAFF_LINE_COUNT; i++) {
      const pitch = TOP_STAFF_PITCH - i * 2;
      const y = pitchToY(pitch);
      lines.push(
        <line
          key={`staff-${i}`}
          x1={PADDING_LEFT - 10}
          y1={y}
          x2={SVG_WIDTH - 10}
          y2={y}
          stroke="#A0A0B0"
          strokeWidth={1.5}
        />
      );
    }
    return lines;
  };

  const renderGrid = () => {
    const elements = [];
    for (let col = 0; col < MAX_COLUMNS; col++) {
      const x = PADDING_LEFT + col * COL_WIDTH;
      elements.push(
        <rect
          key={`grid-col-${col}`}
          x={x}
          y={PADDING_TOP}
          width={COL_WIDTH}
          height={(MAX_PITCH - MIN_PITCH + 1) * ROW_HEIGHT}
          fill={currentColumn === col ? '#BBDEFB' : 'transparent'}
          opacity={currentColumn === col ? 0.35 : 0}
          style={{
            transition: 'opacity 0.15s ease',
            animation: currentColumn === col ? 'columnPulse 0.5s ease' : undefined,
          }}
        />
      );
    }

    for (let pitch = MAX_PITCH; pitch >= MIN_PITCH; pitch--) {
      if (!isBlackKey(pitch)) {
        const y = pitchToY(pitch);
        const isStaffLine =
          pitch <= TOP_STAFF_PITCH &&
          pitch >= BOTTOM_STAFF_PITCH &&
          (TOP_STAFF_PITCH - pitch) % 2 === 0;
        if (!isStaffLine) {
          elements.push(
            <line
              key={`hline-${pitch}`}
              x1={PADDING_LEFT}
              y1={y}
              x2={SVG_WIDTH - 10}
              y2={y}
              stroke="#3A3A50"
              strokeWidth={0.5}
              strokeDasharray="4,4"
              opacity={0.5}
            />
          );
        }
      }
    }

    for (let col = 0; col <= MAX_COLUMNS; col++) {
      const x = PADDING_LEFT + col * COL_WIDTH;
      elements.push(
        <line
          key={`vline-${col}`}
          x1={x}
          y1={PADDING_TOP}
          x2={x}
          y2={PADDING_TOP + (MAX_PITCH - MIN_PITCH + 1) * ROW_HEIGHT}
          stroke="#3A3A50"
          strokeWidth={0.5}
          strokeDasharray="2,4"
          opacity={col % 4 === 0 ? 0.6 : 0.3}
        />
      );
    }

    for (let col = 0; col < MAX_COLUMNS; col += 8) {
      const x = PADDING_LEFT + col * COL_WIDTH;
      elements.push(
        <line
          key={`barline-${col}`}
          x1={x}
          y1={pitchToY(TOP_STAFF_PITCH)}
          x2={x}
          y2={pitchToY(BOTTOM_STAFF_PITCH)}
          stroke="#A0A0B0"
          strokeWidth={1.2}
        />
      );
    }

    elements.push(
      <line
        key="barline-end"
        x1={PADDING_LEFT + MAX_COLUMNS * COL_WIDTH}
        y1={pitchToY(TOP_STAFF_PITCH)}
        x2={PADDING_LEFT + MAX_COLUMNS * COL_WIDTH}
        y2={pitchToY(BOTTOM_STAFF_PITCH)}
        stroke="#A0A0B0"
        strokeWidth={2.5}
      />
    );

    return elements;
  };

  const renderLedgerLines = (pitch: number, centerX: number, y: number) => {
    const lines = [];
    const isAbove = pitch > TOP_STAFF_PITCH;
    const isBelow = pitch < BOTTOM_STAFF_PITCH;

    if (isAbove) {
      for (
        let p = TOP_STAFF_PITCH + 2;
        p <= pitch;
        p += 2
      ) {
        if (!isBlackKey(p)) {
          const ly = pitchToY(p);
          lines.push(
            <line
              key={`ledger-above-${pitch}-${p}`}
              x1={centerX - NOTE_HEAD_WIDTH / 2 - 3}
              y1={ly}
              x2={centerX + NOTE_HEAD_WIDTH / 2 + 3}
              y2={ly}
              stroke="#A0A0B0"
              strokeWidth={1.2}
            />
          );
        }
      }
    }

    if (isBelow) {
      for (
        let p = BOTTOM_STAFF_PITCH - 2;
        p >= pitch;
        p -= 2
      ) {
        if (!isBlackKey(p)) {
          const ly = pitchToY(p);
          lines.push(
            <line
              key={`ledger-below-${pitch}-${p}`}
              x1={centerX - NOTE_HEAD_WIDTH / 2 - 3}
              y1={ly}
              x2={centerX + NOTE_HEAD_WIDTH / 2 + 3}
              y2={ly}
              stroke="#A0A0B0"
              strokeWidth={1.2}
            />
          );
        }
      }
    }

    return lines;
  };

  const renderNotes = () => {
    return notes.map((note) => {
      const x = colToX(note.startTime);
      const isDragging = draggingNote === note.id;
      const currentY =
        isDragging && dragY !== null
          ? pitchToY(yToPitch(dragY))
          : pitchToY(note.pitch);
      const centerX = x + NOTE_HEAD_WIDTH / 2;

      return (
        <g key={note.id}>
          {renderLedgerLines(note.pitch, centerX, currentY)}
          <NoteHead
            note={note}
            x={x}
            y={currentY}
            isDragging={isDragging}
            onMouseDown={(e) => handleNoteMouseDown(e, note.id)}
            onClick={(e) => handleNoteClick(e, note.id)}
          />
          {isDragging && dragY !== null && (
            <line
              x1={PADDING_LEFT - 5}
              y1={dragY}
              x2={SVG_WIDTH - 10}
              y2={dragY}
              stroke="#FF7043"
              strokeWidth={1}
              strokeDasharray="4,4"
              opacity={0.7}
            />
          )}
        </g>
      );
    });
  };

  return (
    <div className="note-editor-wrapper">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
        }}
        onClick={handleGridClick}
      >
        <style>{`
          @keyframes notePopIn {
            0% { opacity: 0; transform: translateY(8px) scale(0.8); }
            60% { transform: translateY(-2px) scale(1.05); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes columnPulse {
            0% { opacity: 0.2; }
            50% { opacity: 0.5; }
            100% { opacity: 0.35; }
          }
          .note-head ellipse {
            transform-box: fill-box;
            transform-origin: center;
          }
        `}</style>

        <rect
          x={0}
          y={0}
          width={SVG_WIDTH}
          height={SVG_HEIGHT}
          fill="#2A2A3E"
          rx={8}
        />

        {renderStaffLines()}
        {renderGrid()}
        <TrebleClef x={10} y={pitchToY(67) + 25} />
        {renderNotes()}
      </svg>
    </div>
  );
};

export default NoteEditor;
