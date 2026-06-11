import React, { useState, useCallback, useEffect } from 'react';
import { X, Type, Vote, PenLine, Trash2, Users, Check } from 'lucide-react';
import { useBrainstormStore } from './store';
import type { StickyNote, TextNote, VoteNote, AnnotationNote } from './types';

interface NoteDetailModalProps {
  noteId: string | null;
  onClose: () => void;
}

const NoteDetailModal: React.FC<NoteDetailModalProps> = ({ noteId, onClose }) => {
  const { notes, deleteNote, voteNote, userId } = useBrainstormStore();
  const [closing, setClosing] = useState(false);
  const [showBackdrop, setShowBackdrop] = useState(true);

  const note = notes.find((n) => n.id === noteId);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, 200);
  }, [onClose]);

  const handleDelete = useCallback(() => {
    if (noteId) {
      deleteNote(noteId);
      handleClose();
    }
  }, [noteId, deleteNote, handleClose]);

  const handleVote = useCallback(() => {
    if (noteId) {
      voteNote(noteId);
    }
  }, [noteId, voteNote]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  if (!note) return null;

  const typeConfig = {
    text: { icon: <Type size={20} />, label: '文字便签', color: '#FF6B6B' },
    vote: { icon: <Vote size={20} />, label: '投票便签', color: '#74B9FF' },
    annotation: { icon: <PenLine size={20} />, label: '标注便签', color: '#B39DDB' },
  };

  const config = typeConfig[note.type];

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center transition-opacity duration-200 ${
        closing ? 'opacity-0' : 'opacity-100'
      }`}
      onClick={handleClose}
    >
      <div className="absolute inset-0 modal-backdrop" />

      <div
        className={`relative glass-panel rounded-2xl shadow-2xl w-[420px] max-h-[80vh] overflow-hidden transition-all duration-300 ease-out ${
          closing ? 'scale-90 opacity-0' : 'scale-100 opacity-100'
        }`}
        style={{ transformOrigin: 'center center' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ backgroundColor: config.color + '18' }}
        >
          <div className="flex items-center gap-2" style={{ color: config.color }}>
            {config.icon}
            <span className="font-semibold text-sm">{config.label}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              className="p-1.5 rounded-lg hover:bg-black/5 transition-colors btn-press text-black/30 hover:text-coral"
              onClick={handleDelete}
              title="删除便签"
            >
              <Trash2 size={16} />
            </button>
            <button
              className="p-1.5 rounded-lg hover:bg-black/5 transition-colors btn-press text-black/30 hover:text-black/60"
              onClick={handleClose}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="p-5 overflow-y-auto max-h-[60vh]">
          <div
            className="rounded-xl p-4 mb-4"
            style={{ backgroundColor: note.color + '15', border: `1px solid ${note.color}30` }}
          >
            {note.type === 'text' && renderTextDetail(note as TextNote)}
            {note.type === 'vote' && renderVoteDetail(note as VoteNote, userId, handleVote)}
            {note.type === 'annotation' && renderAnnotationDetail(note as AnnotationNote)}
          </div>

          <div className="flex items-center justify-between text-xs text-black/30">
            <span>创建于 {new Date(note.createdAt).toLocaleString('zh-CN')}</span>
            <span>
              位置 ({Math.round(note.x)}, {Math.round(note.y)})
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

function renderTextDetail(note: TextNote) {
  const fontSizeMap = { small: 'text-xs', medium: 'text-sm', large: 'text-base' };
  return (
    <div>
      <div className={`whitespace-pre-wrap break-words leading-relaxed ${fontSizeMap[note.fontSize]}`} style={{ color: '#2D2D2D' }}>
        {note.content || '(空内容)'}
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-black/40">
        <span>字号: {note.fontSize === 'small' ? '小' : note.fontSize === 'medium' ? '中' : '大'}</span>
        <span className="inline-block w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: note.color }} />
      </div>
    </div>
  );
}

function renderVoteDetail(note: VoteNote, userId: string, onVote: () => void) {
  const hasVoted = note.votes.includes(userId);
  return (
    <div>
      <div className="text-sm whitespace-pre-wrap break-words mb-4 leading-relaxed" style={{ color: '#2D2D2D' }}>
        {note.content || '(投票主题)'}
      </div>
      <div className="flex items-center gap-3 mb-4">
        <button
          className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all btn-press btn-hover ${
            hasVoted
              ? 'bg-fog text-white shadow-lg'
              : 'bg-white/70 text-fog-dark hover:bg-fog/20 border border-fog/30'
          }`}
          onClick={onVote}
        >
          <Vote size={16} />
          <span>{hasVoted ? '已投票' : '投票'}</span>
          {hasVoted && <Check size={14} />}
        </button>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold font-display text-fog-dark">{note.votes.length}</span>
          <span className="text-xs text-black/40">票</span>
        </div>
      </div>
      <div className="pt-4 border-t border-black/5">
        <div className="flex items-center gap-1.5 text-xs text-black/40 mb-2">
          <Users size={12} />
          <span>投票用户 ({note.votes.length})</span>
        </div>
        {note.votes.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {note.votes.map((voterId, i) => (
              <span
                key={voterId}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-fog/15 text-fog-dark"
              >
                <span className="w-4 h-4 rounded-full bg-fog/30 flex items-center justify-center text-[10px]">
                  {i + 1}
                </span>
                用户 {i + 1}
                {voterId === userId && <span className="text-fog">(我)</span>}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-black/25">暂无投票，快来投第一票吧！</p>
        )}
      </div>
    </div>
  );
}

function renderAnnotationDetail(note: AnnotationNote) {
  return (
    <div>
      <div
        className="rounded-lg border-2 border-dashed p-4 mb-3"
        style={{
          borderColor: note.color + '55',
          backgroundColor: note.color + '11',
          minHeight: 80,
        }}
      >
        <div className="text-xs text-black/30 flex items-center gap-1">
          <PenLine size={12} />
          标注区域
        </div>
      </div>
      <div className="text-sm whitespace-pre-wrap break-words leading-relaxed" style={{ color: '#2D2D2D' }}>
        {note.content || '(无标注说明)'}
      </div>
      <div className="mt-2 text-xs text-black/30">
        区域大小: {Math.round(note.regionWidth)} × {Math.round(note.regionHeight)}
      </div>
    </div>
  );
}

export default NoteDetailModal;
