import React, { useState, useRef, useEffect } from 'react';
import { Plus, Type, Vote, PenLine, Trash2, Download, ChevronDown, X } from 'lucide-react';
import type { NoteType } from './types';

interface ToolbarProps {
  onAddNote: (type: NoteType) => void;
  onClearCanvas: () => void;
  onExportPNG: () => Promise<void> | void;
  exporting: boolean;
  notesCount: number;
}

const Toolbar: React.FC<ToolbarProps> = ({ onAddNote, onClearCanvas, onExportPNG, exporting, notesCount }) => {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowAddMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAdd = (type: NoteType) => {
    onAddNote(type);
    setShowAddMenu(false);
  };

  const noteTypes: { type: NoteType; icon: React.ReactNode; label: string; desc: string; color: string }[] = [
    { type: 'text', icon: <Type size={16} />, label: '文字便签', desc: '记录想法', color: '#FF6B6B' },
    { type: 'vote', icon: <Vote size={16} />, label: '投票便签', desc: '收集团队投票', color: '#74B9FF' },
    { type: 'annotation', icon: <PenLine size={16} />, label: '标注便签', desc: '区域标注说明', color: '#B39DDB' },
  ];

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2" ref={menuRef}>
      <div className="glass-panel rounded-2xl p-2 flex flex-col gap-1 shadow-lg border border-white/50">
        <div className="relative">
          <button
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold bg-coral text-white hover:bg-coral-dark transition-all btn-press w-full shadow-sm"
            onClick={() => setShowAddMenu((v) => !v)}
          >
            <Plus size={16} />
            <span>添加便签</span>
            <ChevronDown
              size={14}
              className={`ml-auto transition-transform duration-200 ${showAddMenu ? 'rotate-180' : ''}`}
            />
          </button>

          {showAddMenu && (
            <div className="absolute top-full right-0 mt-1.5 glass-panel rounded-xl p-1.5 shadow-xl min-w-[190px] animate-fade-scale-in border border-white/60">
              {noteTypes.map(({ type, icon, label, desc, color }) => (
                <button
                  key={type}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm w-full text-left hover:bg-black/5 transition-all btn-press"
                  onClick={() => handleAdd(type)}
                >
                  <span
                    className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: color + '20', color }}
                  >
                    {icon}
                  </span>
                  <div>
                    <div className="font-medium text-black/80">{label}</div>
                    <div className="text-xs text-black/40">{desc}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="h-px bg-black/5 mx-1 my-0.5" />

        <button
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-black/60 hover:bg-black/5 transition-all btn-press w-full disabled:opacity-50"
          onClick={() => notesCount > 0 && setShowClearConfirm(true)}
          disabled={notesCount === 0}
          title={notesCount === 0 ? '画布为空' : '清空画布'}
        >
          <Trash2 size={16} />
          <span>清空画布</span>
          {notesCount > 0 && <span className="ml-auto text-xs text-black/30">{notesCount}</span>}
        </button>

        <button
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-black/60 hover:bg-black/5 transition-all btn-press w-full disabled:opacity-50"
          onClick={() => void onExportPNG()}
          disabled={exporting || notesCount === 0}
          title={notesCount === 0 ? '画布为空' : '导出PNG图片'}
        >
          <Download size={16} />
          <span>{exporting ? '导出中...' : '导出PNG'}</span>
        </button>
      </div>

      {showClearConfirm && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center"
          onClick={() => setShowClearConfirm(false)}
        >
          <div className="absolute inset-0 modal-backdrop" />
          <div
            className="relative glass-panel rounded-2xl p-5 shadow-2xl max-w-xs w-[320px] animate-fade-scale-in border border-white/60"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-base font-semibold text-black/80">清空画布</h3>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="p-1 -mt-1 -mr-1 rounded-lg hover:bg-black/5 transition-colors text-black/30 hover:text-black/60"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-sm text-black/50 mb-4 leading-relaxed">
              即将删除画布上所有 <span className="font-semibold text-coral">{notesCount}</span> 个便签，此操作无法恢复。
            </p>
            <div className="flex gap-2 justify-end">
              <button
                className="px-4 py-1.5 rounded-lg text-sm font-medium text-black/50 hover:bg-black/5 transition-colors btn-press"
                onClick={() => setShowClearConfirm(false)}
              >
                取消
              </button>
              <button
                className="px-4 py-1.5 rounded-lg text-sm font-medium bg-coral text-white hover:bg-coral-dark transition-colors btn-press shadow-sm"
                onClick={() => {
                  onClearCanvas();
                  setShowClearConfirm(false);
                }}
              >
                确认清空
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Toolbar;
