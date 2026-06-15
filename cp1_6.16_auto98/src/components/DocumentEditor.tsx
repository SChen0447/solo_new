import { useEffect, useCallback, useRef, useState } from 'react';
import useStore from '@/store';

const COLLABORATOR_COLORS = ['#1976D2', '#388E3C', '#F57C00', '#7B1FA2', '#C62828'];
const COLLABORATOR_NAMES = ['张明', '李华', '王芳', '赵强', '刘洋'];

export default function DocumentEditor() {
  const document = useStore((s) => s.document);
  const setDocument = useStore((s) => s.setDocument);
  const setVersions = useStore((s) => s.setVersions);
  const setActiveVersionId = useStore((s) => s.setActiveVersionId);
  const setVersionsPage = useStore((s) => s.setVersionsPage);
  const setLastSavedTime = useStore((s) => s.setLastSavedTime);
  const setSaveNotification = useStore((s) => s.setSaveNotification);
  const saveNotification = useStore((s) => s.saveNotification);
  const lastSavedTime = useStore((s) => s.lastSavedTime);
  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [onlineCount] = useState(() => Math.floor(Math.random() * 5) + 1);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const el = document?.id;
      void el;
    }, 10000);
    return () => clearInterval(interval);
  }, [document?.id]);

  const saveContent = useCallback(async () => {
    if (!document || !editorRef.current) return;
    const content = editorRef.current.innerText;
    try {
      await fetch(`/api/documents/${document.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      await fetch(`/api/documents/${document.id}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      const listRes = await fetch(`/api/documents/${document.id}/versions?page=1&limit=20`);
      const listData = await listRes.json();
      setVersions(listData.versions, listData.total, listData.hasMore);
      setVersionsPage(1);
      setActiveVersionId(null);

      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      setLastSavedTime(timeStr);
      setSaveNotification(true);
      setTimeout(() => setSaveNotification(false), 2000);
    } catch (e) {
      console.error('保存失败', e);
    }
  }, [document, setDocument, setVersions, setVersionsPage, setActiveVersionId, setLastSavedTime, setSaveNotification]);

  const handleInput = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setIsEditing(true);
    if (editingTimerRef.current) clearTimeout(editingTimerRef.current);
    editingTimerRef.current = setTimeout(() => {
      setIsEditing(false);
    }, 2000);
    saveTimerRef.current = setTimeout(() => {
      saveContent();
    }, 5000);
  }, [saveContent]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (editingTimerRef.current) clearTimeout(editingTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (editorRef.current && document && editorRef.current.innerText !== document.content) {
      editorRef.current.innerText = document.content;
    }
  }, [document?.id, document?.content]);

  if (!document) return <div className="flex items-center justify-center h-full text-gray-400">加载中...</div>;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">在线协作</span>
          <div className="flex -space-x-2">
            {Array.from({ length: onlineCount }).map((_, i) => (
              <div
                key={i}
                className={`collaborator-avatar w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium ${isEditing && i === 0 ? 'editing-pulse' : ''}`}
                style={{
                  backgroundColor: COLLABORATOR_COLORS[i % COLLABORATOR_COLORS.length],
                  border: isEditing && i === 0 ? '2px solid #FFC107' : '2px solid #fff',
                }}
                title={COLLABORATOR_NAMES[i % COLLABORATOR_NAMES.length]}
              >
                {COLLABORATOR_NAMES[i % COLLABORATOR_NAMES.length][0]}
              </div>
            ))}
          </div>
        </div>
        {saveNotification && (
          <div className="save-notification text-green-600 text-sm font-medium">已保存</div>
        )}
      </div>
      <div className="flex-1 overflow-auto relative">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          className="editor-content w-full h-full p-6 outline-none"
          style={{ backgroundColor: '#F5F5F5', color: '#333', fontSize: '14px', lineHeight: '1.6' }}
        />
      </div>
      {lastSavedTime && (
        <div className="text-right px-4 py-1 text-xs" style={{ color: '#9E9E9E' }}>
          最后保存: {lastSavedTime}
        </div>
      )}
    </div>
  );
}
