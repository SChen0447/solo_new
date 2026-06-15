import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Note, PRESET_COLORS, MERGE_DISTANCE, NOTE_SIZE } from '../types';
import wsManager from '../utils/websocket';

interface StickyNoteProps {
  note: Note;
  onDragStart?: (id: string) => void;
  onDragEnd?: (id: string, x: number, y: number, nearbyNoteId: string | null) => void;
  onMergeRequest?: (sourceId: string, targetId: string) => void;
  isNearby?: boolean;
  isShaking?: boolean;
  rank?: number | null;
}

const StickyNote: React.FC<StickyNoteProps> = ({
  note,
  onDragStart,
  onDragEnd,
  onMergeRequest,
  isNearby = false,
  isShaking = false,
  rank = null,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [localText, setLocalText] = useState(note.text);
  const noteRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setLocalText(note.text);
  }, [note.text]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isEditing) return;
      e.preventDefault();

      const rect = noteRef.current?.getBoundingClientRect();
      if (rect) {
        dragOffset.current = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };
      }

      setIsDragging(true);
      onDragStart?.(note.id);

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!noteRef.current) return;
        const board = noteRef.current.parentElement;
        if (!board) return;

        const boardRect = board.getBoundingClientRect();
        const newX = moveEvent.clientX - boardRect.left - dragOffset.current.x;
        const newY = moveEvent.clientY - boardRect.top - dragOffset.current.y;

        noteRef.current.style.left = `${Math.max(0, newX)}px`;
        noteRef.current.style.top = `${Math.max(0, newY)}px`;
      };

      const handleMouseUp = (upEvent: MouseEvent) => {
        setIsDragging(false);

        const board = noteRef.current?.parentElement;
        if (board && noteRef.current) {
          const boardRect = board.getBoundingClientRect();
          const finalX = Math.max(0, upEvent.clientX - boardRect.left - dragOffset.current.x);
          const finalY = Math.max(0, upEvent.clientY - boardRect.top - dragOffset.current.y);

          wsManager.moveNote(note.id, finalX, finalY);
          onDragEnd?.(note.id, finalX, finalY, null);
        }

        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [note.id, isEditing, onDragStart, onDragEnd]
  );

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.select();
    }, 0);
  }, []);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    setShowColorPicker(false);
    if (localText !== note.text) {
      wsManager.updateNote(note.id, { text: localText });
    }
  }, [note.id, note.text, localText]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLocalText(note.text);
        setIsEditing(false);
      }
    },
    [note.text]
  );

  const handleColorChange = useCallback(
    (color: string) => {
      wsManager.updateNote(note.id, { color });
      setShowColorPicker(false);
    },
    [note.id]
  );

  const getRankBorderClass = () => {
    if (rank === 1) return 'rank-gold';
    if (rank === 2) return 'rank-silver';
    if (rank === 3) return 'rank-bronze';
    return '';
  };

  return (
    <div
      ref={noteRef}
      className={`sticky-note ${isDragging ? 'dragging' : ''} ${isNearby ? 'nearby' : ''} ${isShaking ? 'shaking' : ''} ${getRankBorderClass()}`}
      style={{
        left: note.x,
        top: note.y,
        backgroundColor: note.color,
        borderColor: note.color,
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      <div className="note-header">
        <button
          className="color-picker-toggle"
          onClick={(e) => {
            e.stopPropagation();
            setShowColorPicker(!showColorPicker);
          }}
          style={{ backgroundColor: note.color }}
          title="更改颜色"
        />
        <div className="note-votes">
          <span className="vote-count up">+{note.upvotes}</span>
          <span className="vote-count down">-{note.downvotes}</span>
        </div>
      </div>

      {showColorPicker && (
        <div className="color-picker" onClick={(e) => e.stopPropagation()}>
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              className={`color-dot ${note.color === color ? 'active' : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => handleColorChange(color)}
              title={color}
            />
          ))}
        </div>
      )}

      {isEditing ? (
        <textarea
          ref={textareaRef}
          className="note-textarea"
          value={localText}
          onChange={(e) => setLocalText(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onMouseDown={(e) => e.stopPropagation()}
        />
      ) : (
        <div className="note-content">
          {note.text.split('\n').map((line, index) => (
            <div key={index} className="note-line">
              {line || '\u00A0'}
            </div>
          ))}
        </div>
      )}

      {rank && rank <= 3 && (
        <div className="rank-badge rank-badge-gold" style={{
          background: rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : '#CD7F32'
        }}>
          #{rank}
        </div>
      )}
    </div>
  );
};

export default StickyNote;
