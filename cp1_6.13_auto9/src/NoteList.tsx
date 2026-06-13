import { useRef, useState } from 'react';
import { Trash2, FolderOpen } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { Note } from '@/types';

export default function NoteList() {
  const notes = useAppStore((s) => s.notes);
  const activeNoteId = useAppStore((s) => s.activeNoteId);
  const loadNote = useAppStore((s) => s.loadNote);
  const deleteNote = useAppStore((s) => s.deleteNote);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTargetRef = useRef<string | null>(null);

  const handleLongPressStart = (noteId: string) => {
    longPressTargetRef.current = noteId;
    longPressTimerRef.current = window.setTimeout(() => {
      if (longPressTargetRef.current === noteId) {
        setDeleteConfirmId(noteId);
      }
    }, 800);
  };

  const handleLongPressEnd = () => {
    if (longPressTimerRef.current !== null) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressTargetRef.current = null;
  };

  const handleClick = (note: Note) => {
    if (longPressTimerRef.current !== null) {
      handleLongPressEnd();
      if (longPressTargetRef.current === note.id) {
        loadNote(note.id);
      }
    } else {
      loadNote(note.id);
    }
  };

  const confirmDelete = (noteId: string) => {
    deleteNote(noteId);
    setDeleteConfirmId(null);
  };

  return (
    <aside className="hidden md:flex w-[220px] shrink-0 flex-col bg-white border-r border-gray-100 h-full">
      <div className="px-4 py-5 border-b border-gray-100">
        <h1
          className="text-[24px] leading-none"
          style={{
            fontFamily: "'Caveat', cursive",
            color: '#2C3E50',
            fontWeight: 700,
          }}
        >
          智慧笔迹
        </h1>
        <p className="text-xs text-gray-400 mt-1.5">Smart Handwriting Notes</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-3 gap-2">
          {notes.length === 0 && (
            <div className="col-span-3 py-12 text-center">
              <FolderOpen size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-xs text-gray-400">暂无笔记</p>
              <p className="text-[10px] text-gray-300 mt-1">点击保存创建第一个笔记</p>
            </div>
          )}

          {notes.map((note) => (
            <div
              key={note.id}
              onClick={() => handleClick(note)}
              onMouseDown={() => handleLongPressStart(note.id)}
              onMouseUp={handleLongPressEnd}
              onMouseLeave={handleLongPressEnd}
              onTouchStart={() => handleLongPressStart(note.id)}
              onTouchEnd={handleLongPressEnd}
              onTouchCancel={handleLongPressEnd}
              className={`note-card group relative aspect-[4/3] rounded-lg overflow-hidden cursor-pointer border-2 transition-all duration-200 animate-noteFadeIn select-none ${
                activeNoteId === note.id
                  ? 'border-blue-400 shadow-md'
                  : 'border-gray-100 hover:border-gray-300 hover:shadow'
              }`}
              title={note.name}
            >
              <img
                src={note.thumbnail}
                alt={note.name}
                className="w-full h-full object-cover animate-fadeIn"
                draggable={false}
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 py-1">
                <p className="text-[10px] text-white truncate leading-tight">{note.name}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteConfirmId(note.id);
                }}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600"
              >
                <Trash2 size={10} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl p-5 w-72 animate-scaleIn">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 size={20} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-800">删除笔记</h3>
                <p className="text-xs text-gray-500">删除后不可恢复</p>
              </div>
            </div>
            <p className="text-xs text-gray-600 mb-4 bg-gray-50 rounded-lg p-2">
              确定要删除「{notes.find((n) => n.id === deleteConfirmId)?.name ?? ''}」吗？
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                取消
              </button>
              <button
                onClick={() => confirmDelete(deleteConfirmId)}
                className="px-3 py-1.5 text-xs text-white rounded-lg bg-red-500 hover:bg-red-600 transition"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
