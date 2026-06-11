import React, { useState, useCallback, useRef } from 'react';
import { Plus, Type, Vote, PenLine, Trash2, Download, ChevronDown } from 'lucide-react';
import { useBrainstormStore } from './store';
import type { NoteType } from './types';

interface ToolbarProps {
  onExportPNG: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ onExportPNG }) => {
  const { addNote, clearCanvas } = useBrainstormStore();
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [exporting, setExporting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleAdd = useCallback(
    (type: NoteType) => {
      addNote(type);
      setShowAddMenu(false);
    },
    [addNote]
  );

  const handleClear = useCallback(() => {
    clearCanvas();
    setShowClearConfirm(false);
  }, [clearCanvas]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      await onExportPNG();
    } finally {
      setTimeout(() => setExporting(false), 500);
    }
  }, [onExportPNG]);

  const noteTypes: { type: NoteType; icon: React.ReactNode; label: string; desc: string }[] = [
    { type: 'text', icon: <Type size={16} />, label: '文字便签', desc: '记录想法与灵感' },
    { type: 'vote', icon: <Vote size={16} />, label: '投票便签', desc: '收集团队投票' },
    { type: 'annotation', icon: <PenLine size={16} />, label: '标注便签', desc: '框选区域说明' },
  ];

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2" ref={menuRef}>
      <div className="glass-panel rounded-2xl p-2 flex flex-col gap-1 shadow-lg">
        <div className="relative">
          <button
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-coral text-white hover:bg-coral-dark transition-all btn-press w-full"
            onClick={() => setShowAddMenu(!showAddMenu)}
          >
            <Plus size={16} />
            <span>添加便签</span>
            <ChevronDown
              size={14}
              className={`ml-auto transition-transform ${showAddMenu ? 'rotate-180' : ''}`}
            />
          </button>

          {showAddMenu && (
            <div className="absolute top-full right-0 mt-1 glass-panel rounded-xl p-1 shadow-lg min-w-[180px] animate-fade-scale-in">
              {noteTypes.map(({ type, icon, label, desc }) => (
                <button
                  key={type}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm w-full text-left hover:bg-black/5 transition-colors btn-press"
                  onClick={() => handleAdd(type)}
                >
                  <span className="text-coral">{icon}</span>
                  <div>
                    <div className="font-medium text-black/80">{label}</div>
                    <div className="text-xs text-black/40">{desc}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="h-px bg-black/5 mx-1" />

        <button
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-black/60 hover:bg-black/5 transition-all btn-press w-full"
          onClick={() => setShowClearConfirm(true)}
        >
          <Trash2 size={16} />
          <span>清空画布</span>
        </button>

        <button
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-black/60 hover:bg-black/5 transition-all btn-press w-full"
          onClick={handleExport}
          disabled={exporting}
        >
          <Download size={16} />
          <span>{exporting ? '导出中...' : '导出PNG'}</span>
        </button>
      </div>

      {showAddMenu && (
        <div
          className="fixed inset-0 z-[-1]"
          onClick={() => setShowAddMenu(false)}
        />
      )}

      {showClearConfirm && (
        <div className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center" onClick={() => setShowClearConfirm(false)}>
          <div
            className="glass-panel rounded-2xl p-6 shadow-2xl max-w-xs animate-fade-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-black/80 mb-2">确认清空</h3>
            <p className="text-sm text-black/50 mb-4">此操作将删除画布上所有便签，无法恢复。</p>
            <div className="flex gap-2 justify-end">
              <button
                className="px-4 py-1.5 rounded-lg text-sm text-black/50 hover:bg-black/5 transition-colors btn-press"
                onClick={() => setShowClearConfirm(false)}
              >
                取消
              </button>
              <button
                className="px-4 py-1.5 rounded-lg text-sm bg-coral text-white hover:bg-coral-dark transition-colors btn-press"
                onClick={handleClear}
              >
                清空
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Toolbar;
