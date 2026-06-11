import React, { useState, useEffect, useRef, useCallback } from 'react';
import Canvas from './Canvas';
import Toolbar from './Toolbar';
import socketClient from './socketClient';
import { v4 as uuidv4 } from 'uuid';
import type {
  ToolType,
  DrawElement,
  StickyNote,
  CanvasImage,
  UserCursor,
  HistoryVersion,
  ServerMessage,
  CanvasState,
} from '../shared/types';
import { validateImageFileWithMagic, precheckImageMemory } from '../backend/canvasStateManager';

const USER_COLORS = [
  '#ff6b35',
  '#2d6a4f',
  '#40916c',
  '#2196f3',
  '#9c27b0',
  '#e91e63',
  '#00bcd4',
  '#ff9800',
  '#673ab7',
  '#3f51b5',
];

const STICKY_COLORS = [
  '#fff9c4',
  '#ffe0b2',
  '#ffccbc',
  '#f8bbd0',
  '#e1bee7',
  '#d1c4e9',
  '#bbdefb',
  '#b3e5fc',
  '#b2dfdb',
  '#c8e6c9',
];

function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

const App: React.FC = () => {
  const [tool, setTool] = useState<ToolType>('pen');
  const [color, setColor] = useState('#000000');
  const [thickness, setThickness] = useState(4);
  const [userId, setUserId] = useState<string>('');
  const [userColor, setUserColor] = useState<string>('#ff6b35');
  const [drawings, setDrawings] = useState<DrawElement[]>([]);
  const [stickies, setStickies] = useState<StickyNote[]>([]);
  const [images, setImages] = useState<CanvasImage[]>([]);
  const [cursors, setCursors] = useState<Map<string, UserCursor>>(new Map());
  const [versions, setVersions] = useState<HistoryVersion[]>([]);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [connected, setConnected] = useState(false);
  const [userName, setUserName] = useState('我');
  const [currentStateVersion, setCurrentStateVersion] = useState<string | undefined>();
  const [pendingEditsCount, setPendingEditsCount] = useState(0);
  const [lastEditTime, setLastEditTime] = useState<number>(0);
  const [restoringVersionId, setRestoringVersionId] = useState<string | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const lastEditTimeRef = useRef(0);

  const trackLocalEdit = useCallback(() => {
    const now = Date.now();
    lastEditTimeRef.current = now;
    setLastEditTime(now);
    setPendingEditsCount((c) => c + 1);
  }, []);

  const resetPendingEdits = useCallback(() => {
    setPendingEditsCount(0);
    lastEditTimeRef.current = 0;
  }, []);

  const hasRecentEdits = useCallback(() => {
    const RECENT_EDIT_THRESHOLD = 30000;
    return pendingEditsCount > 0 && (Date.now() - lastEditTimeRef.current) < RECENT_EDIT_THRESHOLD;
  }, [pendingEditsCount]);

  const upsertElement = useCallback((element: DrawElement) => {
    setDrawings((prev) => {
      const idx = prev.findIndex((d) => d.id === element.id);
      if (idx === -1) return [...prev, element];
      const next = [...prev];
      next[idx] = element;
      return next;
    });
  }, []);

  const upsertSticky = useCallback((sticky: StickyNote) => {
    setStickies((prev) => {
      const idx = prev.findIndex((s) => s.id === sticky.id);
      if (idx === -1) return [...prev, sticky];
      const next = [...prev];
      next[idx] = sticky;
      return next;
    });
  }, []);

  const upsertImage = useCallback((img: CanvasImage) => {
    setImages((prev) => {
      const idx = prev.findIndex((i) => i.id === img.id);
      if (idx === -1) return [...prev, img];
      const next = [...prev];
      next[idx] = img;
      return next;
    });
  }, []);

  useEffect(() => {
    socketClient.connect().catch(console.error);

    const unsub = socketClient.on((msg: ServerMessage) => {
      switch (msg.type) {
        case 'init': {
          setUserId(msg.userId);
          setDrawings(msg.state.drawings || []);
          setStickies(msg.state.stickies || []);
          setImages(msg.state.images || []);
          setVersions(msg.versions || []);
          setCurrentStateVersion(msg.state.versionId);
          const c = USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
          setUserColor(c);
          setConnected(true);
          resetPendingEdits();
          break;
        }
        case 'draw':
        case 'draw-update':
        case 'draw-finish': {
          upsertElement(msg.element);
          if (msg.element.userId === userId) {
            trackLocalEdit();
          }
          break;
        }
        case 'sticky-add':
        case 'sticky-update': {
          upsertSticky(msg.sticky);
          if (msg.sticky.userId === userId) {
            trackLocalEdit();
          }
          break;
        }
        case 'sticky-delete': {
          setStickies((prev) => prev.filter((s) => s.id !== msg.id));
          break;
        }
        case 'image-add':
        case 'image-update': {
          upsertImage(msg.image);
          if (msg.image.userId === userId) {
            trackLocalEdit();
          }
          break;
        }
        case 'image-delete': {
          setImages((prev) => prev.filter((i) => i.id !== msg.id));
          break;
        }
        case 'cursor-move': {
          setCursors((prev) => {
            const next = new Map(prev);
            next.set(msg.cursor.userId, msg.cursor);
            return next;
          });
          break;
        }
        case 'cursor-leave':
        case 'user-left': {
          setCursors((prev) => {
            const next = new Map(prev);
            next.delete(msg.userId);
            return next;
          });
          break;
        }
        case 'version-saved': {
          setVersions((prev) => {
            const next = [...prev, msg.version];
            return next.slice(-50);
          });
          setCurrentStateVersion(msg.version.id);
          if (restoringVersionId !== msg.version.id) {
            resetPendingEdits();
          }
          break;
        }
        case 'versions-list': {
          setVersions(msg.versions);
          break;
        }
        case 'version-restore': {
          setDrawings(msg.state.drawings);
          setStickies(msg.state.stickies);
          setImages(msg.state.images);
          setCurrentStateVersion(msg.state.versionId);
          resetPendingEdits();
          if (msg.initiatorUserId !== userId) {
            const user = cursors.get(msg.initiatorUserId);
            const userName = user?.name || '其他用户';
            setTimeout(() => {
              alert(`画布已被 ${userName} 恢复到历史版本`);
            }, 100);
          } else {
            setRestoringVersionId(null);
          }
          break;
        }
        case 'version-restore-failed': {
          setRestoringVersionId(null);
          alert(msg.reason || '恢复版本失败，请重试');
          break;
        }
        case 'user-joined': {
          if (msg.userId === userId) {
            setUserName(msg.name);
          }
          break;
        }
        case 'clear-canvas': {
          setDrawings([]);
          setStickies([]);
          setImages([]);
          break;
        }
      }
    });

    return () => {
      unsub();
    };
  }, [upsertElement, upsertSticky, upsertImage, userId, resetPendingEdits, trackLocalEdit, restoringVersionId, cursors]);

  const handleDrawStart = (element: DrawElement) => {
    socketClient.send({ type: 'draw', element });
    upsertElement(element);
  };

  const handleDrawUpdate = (element: DrawElement) => {
    socketClient.send({ type: 'draw-update', element });
    upsertElement(element);
  };

  const handleDrawFinish = (element: DrawElement) => {
    socketClient.send({ type: 'draw-finish', element });
    upsertElement(element);
  };

  const handleStickyAdd = (sticky: StickyNote) => {
    socketClient.send({ type: 'sticky-add', sticky });
    upsertSticky(sticky);
  };

  const handleStickyUpdate = (sticky: StickyNote) => {
    socketClient.send({ type: 'sticky-update', sticky });
    upsertSticky(sticky);
  };

  const handleImageAdd = (img: CanvasImage) => {
    socketClient.send({ type: 'image-add', image: img });
    upsertImage(img);
  };

  const handleImageUpdate = (img: CanvasImage) => {
    socketClient.send({ type: 'image-update', image: img });
    upsertImage(img);
  };

  const handleCursorMove = (cursor: UserCursor) => {
    socketClient.send({ type: 'cursor-move', cursor });
    setCursors((prev) => {
      const next = new Map(prev);
      next.set(cursor.userId, cursor);
      return next;
    });
  };

  const createSticky = (x: number, y: number) => {
    const sticky: StickyNote = {
      id: uuidv4(),
      x,
      y,
      width: 180,
      height: 140,
      content: '',
      color: STICKY_COLORS[Math.floor(Math.random() * STICKY_COLORS.length)],
      borderColor: userColor,
      userId,
    };
    handleStickyAdd(sticky);
  };

  const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
  const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];

  const uploadImageAt = async (x: number, y: number, file: File) => {
    const memoryCheck = precheckImageMemory(file);
    if (!memoryCheck.safe) {
      alert(memoryCheck.error || '内存预检失败');
      return;
    }

    const typeCheck = ALLOWED_IMAGE_TYPES.includes(file.type);
    if (!typeCheck) {
      alert('仅支持 PNG 和 JPG 格式的图片');
      return;
    }

    try {
      const magicCheck = await validateImageFileWithMagic(file);
      if (!magicCheck.valid) {
        alert(magicCheck.error || '图片文件校验失败');
        return;
      }
    } catch (e) {
      alert('图片文件校验失败');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      const tmpImg = new Image();
      tmpImg.onload = () => {
        const maxW = 400;
        let w = tmpImg.width;
        let h = tmpImg.height;
        if (w > maxW) {
          h = (h * maxW) / w;
          w = maxW;
        }
        const img: CanvasImage = {
          id: uuidv4(),
          x,
          y,
          width: w,
          height: h,
          src,
          userId,
        };
        handleImageAdd(img);
      };
      tmpImg.src = src;
    };
    reader.readAsDataURL(file);
  };

  const handleToolbarSticky = () => {
    createSticky(100, 100);
  };

  const handleToolbarUpload = () => {
    if (imageInputRef.current) {
      imageInputRef.current.click();
    }
  };

  const handleImageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadImageAt(100, 100, file);
    }
    e.target.value = '';
  };

  const handleClearCanvas = () => {
    if (confirm('确定要清空画布吗？此操作会同步给所有人。')) {
      socketClient.send({ type: 'clear-canvas' });
      setDrawings([]);
      setStickies([]);
      setImages([]);
    }
  };

  const handleRestoreVersion = (versionId: string) => {
    const activeUsers = Array.from(cursors.keys()).filter((id) => id !== userId);
    const hasActiveEditors = activeUsers.length > 0;
    const hasUnsavedEdits = hasRecentEdits();

    let confirmMessage = '确定恢复到此版本吗？';
    const details: string[] = [];

    if (hasUnsavedEdits) {
      details.push(`您有 ${pendingEditsCount} 个本地编辑尚未自动保存`);
    }
    if (hasActiveEditors) {
      details.push(`当前有 ${activeUsers.length} 位其他用户在线编辑`);
    }
    if (!currentStateVersion) {
      details.push('未获取到当前状态版本号，无法检测冲突');
    }

    if (details.length > 0) {
      confirmMessage += '\n\n⚠️ 注意：\n' + details.map((d) => '• ' + d).join('\n');
      confirmMessage += '\n\n恢复操作会覆盖所有人的当前内容，确定继续吗？';
    } else {
      confirmMessage += ' 当前画布内容会被覆盖并同步给所有人。';
    }

    if (!confirm(confirmMessage)) {
      return;
    }

    setRestoringVersionId(versionId);
    socketClient.send({
      type: 'restore-version',
      versionId,
      expectedStateVersion: currentStateVersion,
    });

    setTimeout(() => {
      if (restoringVersionId === versionId) {
        setRestoringVersionId(null);
      }
    }, 5000);
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '8px 20px',
          background: 'white',
          borderRadius: 999,
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          zIndex: 100,
        }}
      >
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: connected ? '#2d6a4f' : '#e63946',
          }}
        />
        <span style={{ fontSize: 13, color: '#4a5568', fontWeight: 500 }}>
          {connected ? `已连接 · ${userName}` : '连接中...'}
        </span>
        <div style={{ width: 1, height: 16, background: '#e2e8f0' }} />
        <span style={{ fontSize: 12, color: '#8898aa' }}>
          {drawings.length + stickies.length + images.length} 个元素
        </span>
      </div>

      <Canvas
        tool={tool}
        color={color}
        thickness={thickness}
        userId={userId}
        userColor={userColor}
        drawings={drawings}
        stickies={stickies}
        images={images}
        cursors={cursors}
        onDrawStart={handleDrawStart}
        onDrawUpdate={handleDrawUpdate}
        onDrawFinish={handleDrawFinish}
        onStickyAdd={handleStickyAdd}
        onStickyUpdate={handleStickyUpdate}
        onImageAdd={handleImageAdd}
        onImageUpdate={handleImageUpdate}
        onCursorMove={handleCursorMove}
        onAddStickyAt={createSticky}
        onUploadImageAt={uploadImageAt}
      />

      <Toolbar
        tool={tool}
        color={color}
        thickness={thickness}
        onToolChange={setTool}
        onColorChange={setColor}
        onThicknessChange={setThickness}
        onAddSticky={handleToolbarSticky}
        onUploadImage={handleToolbarUpload}
        onClearCanvas={handleClearCanvas}
        imageInputRef={imageInputRef}
      />

      {imageInputRef.current && (
        <input
          ref={imageInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          style={{ display: 'none' }}
          onChange={handleImageInputChange}
        />
      )}

      <div
        className="history-panel"
        style={{
          position: 'absolute',
          right: historyOpen ? 16 : -280,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 280,
          maxHeight: '70vh',
          borderRadius: 12,
          boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
          zIndex: 100,
          transition: 'right 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2d6a4f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span style={{ fontWeight: 600, fontSize: 14, color: '#2d3748' }}>历史版本</span>
            <span style={{ fontSize: 11, color: '#8898aa', background: 'rgba(226,232,240,0.6)', padding: '2px 6px', borderRadius: 4 }}>
              {versions.length}
            </span>
          </div>
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              color: '#8898aa',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </div>

        <div style={{ padding: 8, overflowY: 'auto', flex: 1 }}>
          {versions.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#a0aec0', fontSize: 13 }}>
              <div style={{ marginBottom: 8 }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto', opacity: 0.5 }}>
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              暂无历史版本<br />
              每10秒自动保存
            </div>
          ) : (
            versions
              .slice()
              .reverse()
              .map((v, idx) => {
                const count = v.drawings.length + v.stickies.length + v.images.length;
                return (
                  <button
                    key={v.id}
                    onClick={() => handleRestoreVersion(v.id)}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '12px 14px',
                      marginBottom: 6,
                      background: 'rgba(255,255,255,0.7)',
                      border: '1px solid rgba(226,232,240,0.8)',
                      borderRadius: 10,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'white';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.7)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 13, color: '#2d3748' }}>
                        版本 {versions.length - idx}
                      </span>
                      <span style={{ fontSize: 11, color: '#ff6b35', fontWeight: 500 }}>
                        {formatTime(v.timestamp)}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#718096' }}>
                      {count} 个元素 · {v.drawings.length} 笔画 · {v.stickies.length} 便签 · {v.images.length} 图片
                    </div>
                  </button>
                );
              })
          )}
        </div>
      </div>

      {!historyOpen && (
        <button
          onClick={() => setHistoryOpen(true)}
          style={{
            position: 'absolute',
            right: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'white',
            border: 'none',
            borderTopLeftRadius: 10,
            borderBottomLeftRadius: 10,
            padding: '12px 6px',
            cursor: 'pointer',
            boxShadow: '-2px 0 8px rgba(0,0,0,0.08)',
            zIndex: 99,
            color: '#2d6a4f',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}

      <div
        style={{
          position: 'absolute',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '6px 14px',
          background: 'rgba(255,255,255,0.9)',
          borderRadius: 8,
          fontSize: 11,
          color: '#718096',
          zIndex: 100,
          backdropFilter: 'blur(8px)',
        }}
      >
        滚轮缩放 · Alt/中键拖动平移 · 每10秒自动保存
      </div>
    </div>
  );
};

export default App;
