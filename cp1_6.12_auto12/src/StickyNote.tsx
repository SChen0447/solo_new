import React, { useCallback, useRef, useEffect, useState } from 'react';
import { GripVertical, Type, Vote, PenLine } from 'lucide-react';
import type { StickyNote, TextNote, VoteNote, AnnotationNote, FontSize } from '@/types';
import { FONT_SIZE_MAP, NOTE_COLORS } from '@/types';
import { useBrainstormStore } from '@/store';

interface StickyNoteProps {
  note: StickyNote;
  scale: number;
  onSelect: (id: string) => void;
}

const StickyNoteComponent: React.FC<StickyNoteProps> = React.memo(({ note, scale, onSelect }) => {
  const { moveNote, updateNote, voteNote, userId } = useBrainstormStore();
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [voteAnim, setVoteAnim] = useState(false);
  const noteRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('[data-no-drag]')) return;
      e.preventDefault();
      e.stopPropagation();
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setIsDragging(true);
    },
    []
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const { viewport } = useBrainstormStore.getState();
        const newX = (e.clientX - dragOffset.x - viewport.x) / viewport.scale;
        const newY = (e.clientY - dragOffset.y - viewport.y) / viewport.scale;
        moveNote(note.id, newX, newY);
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isDragging, dragOffset, note.id, moveNote]);

  const handleVoteClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      voteNote(note.id);
      setVoteAnim(true);
      setTimeout(() => setVoteAnim(false), 300);
    },
    [note.id, voteNote]
  );

  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateNote(note.id, { content: e.target.value } as Partial<TextNote>);
    },
    [note.id, updateNote]
  );

  const handleFontSizeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNote(note.id, { fontSize: e.target.value as FontSize } as Partial<TextNote>);
    },
    [note.id, updateNote]
  );

  const handleColorChange = useCallback(
    (color: string) => {
      updateNote(note.id, { color });
    },
    [note.id, updateNote]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
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
      className="absolute sticky-note-shadow animate-bounce-in"
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
        {isVoteNote && renderVoteNote(note as VoteNote, handleVoteClick, handleContentChange, voteAnim, userId)}
        {isAnnotationNote && renderAnnotationNote(note as AnnotationNote, handleContentChange)}
      </div>
    </div>
  );
});

function renderTextNote(
  note: TextNote,
  onContentChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void,
  onFontSizeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void,
  onColorChange: (color: string) => void
) {
  return (
    <div className="p-3 flex flex-col gap-2">
      <textarea
        className="w-full bg-transparent resize-none outline-none placeholder-black/30"
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
          className="text-xs bg-white/50 rounded px-1.5 py-0.5 outline-none cursor-pointer"
        >
          <option value="small">小</option>
          <option value="medium">中</option>
          <option value="large">大</option>
        </select>
        <div className="flex gap-1">
          {NOTE_COLORS.text.slice(0, 4).map((c) => (
            <button
              key={c}
              className="w-4 h-4 rounded-full border-2 transition-transform btn-press"
              style={{
                backgroundColor: c + '44',
                borderColor: note.color === c ? c : 'transparent',
                transform: note.color === c ? 'scale(1.2)' : 'scale(1)',
              }}
              onClick={() => onColorChange(c)}
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
  voteAnim: boolean,
  userId: string
) {
  const hasVoted = note.votes.includes(userId);
  return (
    <div className="p-3 flex flex-col gap-2">
      <textarea
        className={`w-full bg-transparent resize-none outline-none placeholder-black/30 ${FONT_SIZE_MAP.medium}`}
        style={{ color: '#2D2D2D' }}
        placeholder="输入投票主题..."
        value={note.content}
        onChange={onContentChange}
        data-no-drag
        rows={2}
      />
      <div className="flex items-center justify-between" data-no-drag>
        <button
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all btn-press ${
            hasVoted
              ? 'bg-fog text-white shadow-md'
              : 'bg-white/60 text-fog-dark hover:bg-fog/20'
          }`}
          onClick={onVote}
        >
          <Vote size={14} />
          <span className={voteAnim ? 'animate-vote-pop' : ''}>{note.votes.length}</span>
        </button>
        <span className="text-xs text-black/30">
          {note.votes.length} 人投票
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
        className="border-2 border-dashed rounded-b-xl mx-3 mb-3"
        style={{
          borderColor: note.color + '66',
          backgroundColor: note.color + '11',
          minHeight: 60,
        }}
      />
      <div className="px-3 pb-3" data-no-drag>
        <textarea
          className="w-full bg-transparent resize-none outline-none placeholder-black/30 text-xs"
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
