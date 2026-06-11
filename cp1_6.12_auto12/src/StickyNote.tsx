import React, { useCallback, useRef, useEffect, useState } from 'react';
import { GripVertical, Type, Vote, PenLine } from 'lucide-react';
import type { StickyNote, TextNote, VoteNote, AnnotationNote, FontSize } from './types';
import { FONT_SIZE_MAP, NOTE_COLORS } from './types';

interface StickyNoteProps {
  note: StickyNote;
  scale: number;
  onSelect: (id: string) => void;
  onPositionSync: (id: string, x: number, y: number) => void;
  onContentUpdate: (id: string, content: string) => void;
  onFontSizeChange: (id: string, size: FontSize) => void;
  onColorChange: (id: string, color: string) => void;
  onVote: (id: string) => void;
}

const StickyNoteComponent: React.FC<StickyNoteProps> = React.memo((props) => {
  const { note, scale, onSelect, onPositionSync, onContentUpdate, onFontSizeChange, onColorChange, onVote } = props;
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [voteAnim, setVoteAnim] = useState(false);
  const hasDraggedRef = useRef(false);
  const moveStartPosRef = useRef({ x: 0, y: 0 });
  const noteRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const lastPosRef = useRef({ x: note.x, y: note.y });
  const scaleRef = useRef(scale);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    lastPosRef.current = { x: note.x, y: note.y };
  }, [note.x, note.y]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('[data-no-drag]')) return;
      e.preventDefault();
      e.stopPropagation();
      hasDraggedRef.current = false;
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      moveStartPosRef.current = { x: e.clientX, y: e.clientY };
      setIsDragging(true);
    },
    []
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const start = moveStartPosRef.current;
      if (!hasDraggedRef.current) {
        const dist = Math.hypot(e.clientX - start.x, e.clientY - start.y);
        if (dist < 4) return;
        hasDraggedRef.current = true;
      }
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const parentRect = noteRef.current?.offsetParent?.getBoundingClientRect();
        if (!parentRect) return;
        const s = scaleRef.current;
        const newX = (e.clientX - parentRect.left - dragOffset.x - lastPosRef.x * s) / s;
        const newY = (e.clientY - parentRect.top - dragOffset.y - lastPosRef.y * s) / s;
        const finalX = lastPosRef.current.x + newX;
        const finalY = lastPosRef.current.y + newY;
        onPositionSync(note.id, finalX, finalY);
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isDragging, dragOffset, note.id, onPositionSync]);

  const handleVoteClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      onVote(note.id);
      setVoteAnim(true);
      setTimeout(() => setVoteAnim(false), 300);
    },
    [note.id, onVote]
  );

  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onContentUpdate(note.id, e.target.value);
    },
    [note.id, onContentUpdate]
  );

  const handleFontSizeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onFontSizeChange(note.id, e.target.value as FontSize);
    },
    [note.id, onFontSizeChange]
  );

  const handleColorChange = useCallback(
    (e: React.MouseEvent, color: string) => {
      e.stopPropagation();
      onColorChange(note.id, color);
    },
    [note.id, onColorChange]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (hasDraggedRef.current) {
        hasDraggedRef.current = false;
        return;
      }
      e.stopPropagation();
      onSelect(note.id);
    },
    [note.id, onSelect]
  );

  const isTextNote = note.type === 'text';
  const isVoteNote = note.type === 'vote';
  const isAnnotationNote = note.type === 'annotation';

  const typeIcon = isTextNote ? <Type size={14} /> : isVoteNote ? <Vote size={14} /> : <PenLine size={14} />;
  const typeLabel = isTextNote ? '文字' : isVoteNote ? '投票' : '标注';

  return (
    <div
      ref={noteRef}
      className="absolute sticky-note-shadow animate-bounce-in select-none"
      style={{
        left: note.x,
        top: note.y,
        width: note.width,
        height: note.type === 'annotation' ? 'auto' : note.height,
        transform: isDragging ? 'scale(1.04)' : 'scale(1)',
        transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease',
        zIndex: isDragging ? 1000 : 1,
        cursor: isDragging ? 'grabbing' : 'grab',
        minHeight: note.height,
      }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      <div
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: note.color + '22', border: `2px solid ${note.color}44` }}
      >
        <div
          className="flex items-center justify-between px-3 py-1.5"
          style={{ backgroundColor: note.color + '33' }}
        >
          <div className="flex items-center gap-1.5" style={{ color: note.color }}>
            {typeIcon}
            <span className="text-xs font-medium font-display">{typeLabel}</span>
          </div>
          <div
            className="flex items-center gap-1 cursor-grab opacity-40 hover:opacity-80 transition-opacity"
            data-no-drag
          >
            <GripVertical size={14} />
          </div>
        </div>

        {isTextNote && renderTextNote(note as TextNote, handleContentChange, handleFontSizeChange, handleColorChange)}
        {isVoteNote && renderVoteNote(note as VoteNote, handleVoteClick, handleContentChange, voteAnim)}
        {isAnnotationNote && renderAnnotationNote(note as AnnotationNote, handleContentChange)}
      </div>
    </div>
  );
});

function renderTextNote(
  note: TextNote,
  onContentChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void,
  onFontSizeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void,
  onColorChange: (e: React.MouseEvent, color: string) => void
) {
  return (
    <div className="p-3 flex flex-col gap-2">
      <textarea
        className="w-full bg-transparent resize-none outline-none placeholder-black/30 font-medium"
        style={{ color: '#2D2D2D' }}
        placeholder="输入内容..."
        value={note.content}
        onChange={onContentChange}
        data-no-drag
        rows={4}
      />
      <div className="flex items-center justify-between" data-no-drag>
        <select
          value={note.fontSize}
          onChange={onFontSizeChange}
          className="text-xs bg-white/50 rounded px-1.5 py-0.5 outline-none cursor-pointer text-black/60"
        >
          <option value="small">小</option>
          <option value="medium">中</option>
          <option value="large">大</option>
        </select>
        <div className="flex gap-1">
          {NOTE_COLORS.text.slice(0, 4).map((c) => (
            <button
              key={c}
              className="w-4 h-4 rounded-full border-2 transition-transform btn-press hover:scale-110"
              style={{
                backgroundColor: c + '55',
                borderColor: note.color === c ? c : 'transparent',
                transform: note.color === c ? 'scale(1.2)' : 'scale(1)',
              }}
              onClick={(e) => onColorChange(e, c)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function renderVoteNote(
  note: VoteNote,
  onVote: (e: React.MouseEvent) => void,
  onContentChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void,
  voteAnim: boolean
) {
  return (
    <div className="p-3 flex flex-col gap-2">
      <textarea
        className={`w-full bg-transparent resize-none outline-none placeholder-black/30 font-medium ${FONT_SIZE_MAP.medium}`}
        style={{ color: '#2D2D2D' }}
        placeholder="输入投票主题..."
        value={note.content}
        onChange={onContentChange}
        data-no-drag
        rows={2}
      />
      <div className="flex items-center justify-between" data-no-drag>
        <button
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all btn-press btn-hover`}
          style={{
            backgroundColor: note.votes.length > 0 ? note.color : 'rgba(255,255,255,0.6)',
            color: note.votes.length > 0 ? 'white' : note.color,
            boxShadow: note.votes.length > 0 ? `0 2px 8px ${note.color}55` : 'none',
            border: note.votes.length === 0 ? `1px solid ${note.color}55` : 'none',
          }}
          onClick={onVote}
        >
          <Vote size={14} />
          <span className={voteAnim ? 'animate-vote-pop inline-block' : 'inline-block'}>
            {note.votes.length}
          </span>
          <span className="ml-0.5">{note.votes.length > 0 ? '票' : '投票'}</span>
        </button>
        <span className="text-xs text-black/30 font-medium">
          {note.votes.length} 人参与
        </span>
      </div>
    </div>
  );
}

function renderAnnotationNote(
  note: AnnotationNote,
  onContentChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
) {
  return (
    <div className="flex flex-col">
      <div
        className="border-2 border-dashed rounded-lg mx-3 mt-3 flex items-center justify-center"
        style={{
          borderColor: note.color + '77',
          backgroundColor: note.color + '15',
          minHeight: 50,
        }}
      >
        <span className="text-[10px] font-medium" style={{ color: note.color + '99' }}>
          标注区域
        </span>
      </div>
      <div className="p-3" data-no-drag>
        <textarea
          className="w-full bg-transparent resize-none outline-none placeholder-black/30 text-xs font-medium"
          style={{ color: '#2D2D2D' }}
          placeholder="添加标注说明..."
          value={note.content}
          onChange={onContentChange}
          rows={2}
        />
      </div>
    </div>
  );
}

StickyNoteComponent.displayName = 'StickyNoteComponent';

export default StickyNoteComponent;
