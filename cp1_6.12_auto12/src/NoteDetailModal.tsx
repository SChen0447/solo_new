import React, { useState, useCallback, useEffect, useRef } from 'react';
import { X, Type, Vote, PenLine, Trash2, Users, Check } from 'lucide-react';
import type { StickyNote, TextNote, VoteNote, AnnotationNote } from './types';

interface NoteDetailModalProps {
  note: StickyNote;
  onClose: () => void;
  onDelete: (id: string) => void;
  onVote: (id: string) => void;
  userId: string;
}

const NoteDetailModal: React.FC<NoteDetailModalProps> = ({ note, onClose, onDelete, onVote, userId }) => {
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false);

  const handleClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    setTimeout(() => {
      closingRef.current = false;
      setClosing(false);
      onClose();
    }, 220);
  }, [onClose]);

  const handleDelete = useCallback(() => {
    onDelete(note.id);
    handleClose();
  }, [note.id, onDelete, handleClose]);

  const handleVoteClick = useCallback(() => {
    onVote(note.id);
  }, [note.id, onVote]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  const typeConfig = {
    text: { icon: <Type size={18} />, label: '文字便签', color: '#FF6B6B' },
    vote: { icon: <Vote size={18} />, label: '投票便签', color: '#74B9FF' },
    annotation: { icon: <PenLine size={18} />, label: '标注便签', color: '#B39DDB' },
  } as const;

  const config = typeConfig[note.type];

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center transition-opacity duration-200 ${
        closing ? 'opacity-0' : 'opacity-100'
      }`}
      onClick={handleClose}
    >
      <div
        className={`absolute inset-0 transition-all duration-200 ${
          closing ? 'opacity-0' : 'opacity-100'
        }`}
        style={{
          backgroundColor: 'rgba(20, 15, 10, 0.22)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
      />

      <div
        className={`relative shadow-2xl w-[430px] max-h-[82vh] overflow-hidden transition-all duration-200 ease-out ${
          closing ? 'scale-90 opacity-0 -translate-y-2' : 'scale-100 opacity-100 translate-y-0'
        }`}
        style={{
          background: 'rgba(255, 252, 248, 0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.7)',
          borderRadius: '20px',
          transformOrigin: 'center center',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-5 py-3.5"
          style={{ backgroundColor: config.color + '18', borderBottom: `1px solid ${config.color}15` }}
        >
          <div className="flex items-center gap-2" style={{ color: config.color }}>
            <span
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: config.color + '25' }}
            >
              {config.icon}
            </span>
            <span className="font-semibold text-sm" style={{ color: config.color }}>
              {config.label}
            </span>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              className="p-2 rounded-xl hover:bg-coral/10 transition-colors btn-press text-black/30 hover:text-coral"
              onClick={handleDelete}
              title="删除便签"
            >
              <Trash2 size={15} />
            </button>
            <button
              className="p-2 rounded-xl hover:bg-black/5 transition-colors btn-press text-black/30 hover:text-black/60"
              onClick={handleClose}
              title="关闭"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="p-5 overflow-y-auto max-h-[65vh]">
          <div
            className="rounded-2xl p-4.5 mb-4"
            style={{
              backgroundColor: note.color + '14',
              border: `1px solid ${note.color}28`,
              padding: '18px',
            }}
          >
            {note.type === 'text' && renderTextDetail(note as TextNote, note.color)}
            {note.type === 'vote' && renderVoteDetail(note as VoteNote, userId, handleVoteClick, note.color)}
            {note.type === 'annotation' && renderAnnotationDetail(note as AnnotationNote, note.color)}
          </div>

          <div className="flex items-center justify-between text-xs text-black/35 font-medium">
            <span>创建于 {new Date(note.createdAt).toLocaleString('zh-CN')}</span>
            <span>
              ({Math.round(note.x)}, {Math.round(note.y)})
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

function renderTextDetail(note: TextNote, _color: string) {
  const fontSizeMap = { small: 'text-sm', medium: 'text-base', large: 'text-lg' } as const;
  return (
    <div>
      <div
        className={`whitespace-pre-wrap break-words leading-relaxed ${fontSizeMap[note.fontSize]}`}
        style={{ color: '#2D2D2D', minHeight: 48 }}
      >
        {note.content || <span className="text-black/20 italic">（空内容，点击便签文字区域编辑）</span>}
      </div>
      <div className="mt-4 flex items-center gap-3 text-xs text-black/40">
        <div className="flex items-center gap-1.5">
          <span>字号:</span>
          <span className="px-2 py-0.5 rounded-md bg-white/60 border border-black/5">
            {note.fontSize === 'small' ? '小' : note.fontSize === 'medium' ? '中' : '大'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>颜色:</span>
          <span
            className="w-5 h-5 rounded-full shadow-sm border-2 border-white"
            style={{ backgroundColor: note.color }}
          />
        </div>
      </div>
    </div>
  );
}

function renderVoteDetail(note: VoteNote, uid: string, onVote: () => void, color: string) {
  const hasVoted = note.votes.includes(uid);
  return (
    <div>
      <div
        className="text-base whitespace-pre-wrap break-words mb-4 leading-relaxed"
        style={{ color: '#2D2D2D', minHeight: 48 }}
      >
        {note.content || <span className="text-black/20 italic">（请编辑投票主题）</span>}
      </div>

      <div className="flex items-center gap-4 mb-4">
        <button
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all btn-press btn-hover ${
            hasVoted ? 'text-white shadow-md' : 'border'
          }`}
          style={{
            backgroundColor: hasVoted ? color : 'rgba(255,255,255,0.75)',
            color: hasVoted ? 'white' : color,
            borderColor: hasVoted ? 'transparent' : color + '55',
            boxShadow: hasVoted ? `0 4px 14px ${color}55` : 'none',
          }}
          onClick={onVote}
        >
          <Vote size={16} />
          <span>{hasVoted ? '已投票' : '参与投票'}</span>
          {hasVoted && <Check size={14} />}
        </button>
        <div className="flex items-baseline gap-1.5">
          <span
            className="text-4xl font-bold font-display"
            style={{ color }}
          >
            {note.votes.length}
          </span>
          <span className="text-sm text-black/40 font-medium">票</span>
        </div>
      </div>

      <div
        className="pt-4 mt-2"
        style={{ borderTop: `1px dashed ${color}25` }}
      >
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: color + 'bb' }}>
            <Users size={13} />
            <span>投票用户列表</span>
          </div>
          <span className="text-xs text-black/35">{note.votes.length} 人参与</span>
        </div>
        {note.votes.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {note.votes.map((voterId, i) => {
              const isMe = voterId === uid;
              const hue = (i * 53) % 360;
              const avatarColor = `hsl(${hue}, 65%, 62%)`;
              return (
                <span
                  key={voterId}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: isMe ? color + '18' : avatarColor + '18',
                    color: isMe ? color : avatarColor,
                    border: `1px solid ${isMe ? color : avatarColor}30`,
                  }}
                >
                  <span
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ backgroundColor: isMe ? color : avatarColor }}
                  >
                    {i + 1}
                  </span>
                  用户 {i + 1}
                  {isMe && <span className="opacity-70">(我)</span>}
                </span>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-black/25 py-3 text-center rounded-lg bg-white/40">
            暂无投票，快来投出第一票吧 ✨
          </p>
        )}
      </div>
    </div>
  );
}

function renderAnnotationDetail(note: AnnotationNote, color: string) {
  return (
    <div>
      <div
        className="rounded-xl border-2 border-dashed p-5 mb-4 flex flex-col items-center justify-center"
        style={{
          borderColor: color + '70',
          backgroundColor: color + '12',
          minHeight: 80,
        }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center mb-1"
          style={{ backgroundColor: color + '22' }}
        >
          <PenLine size={16} style={{ color }} />
        </div>
        <span className="text-xs font-medium" style={{ color: color + '99' }}>
          标注区域 · {Math.round(note.regionWidth)} × {Math.round(note.regionHeight)}
        </span>
      </div>
      <div
        className="text-sm whitespace-pre-wrap break-words leading-relaxed"
        style={{ color: '#2D2D2D', minHeight: 32 }}
      >
        {note.content || <span className="text-black/20 italic">（暂无标注说明，编辑下方文字框）</span>}
      </div>
    </div>
  );
}

export default NoteDetailModal;
