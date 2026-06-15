import React, { useRef, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { useStore, LayoutCandidate, ImageFeature } from './store';
import { generateLayouts } from './engine/layoutEngine';
import Toolbar from './components/Toolbar';
import Canvas from './components/Canvas';

const App: React.FC = () => {
  const images = useStore((s) => s.images);
  const cells = useStore((s) => s.cells);
  const layoutCandidates = useStore((s) => s.layoutCandidates);
  const inviteCode = useStore((s) => s.inviteCode);
  const collaborators = useStore((s) => s.collaborators);
  const addImages = useStore((s) => s.addImages);
  const setLayoutCandidates = useStore((s) => s.setLayoutCandidates);
  const applyLayout = useStore((s) => s.applyLayout);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const setInviteCode = useStore((s) => s.setInviteCode);
  const addCollaborator = useStore((s) => s.addCollaborator);
  const removeCollaborator = useStore((s) => s.removeCollaborator);
  const updateCursor = useStore((s) => s.updateCursor);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showLayoutModal, setShowLayoutModal] = useState(false);
  const [inviteInput, setInviteInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [userId] = useState(() => localStorage.getItem('comic_user_id') || (() => {
    const id = uuidv4().slice(0, 8);
    localStorage.setItem('comic_user_id', id);
    return id;
  })());
  const [userName] = useState(() => localStorage.getItem('comic_user_name') || (() => {
    const name = '用户' + uuidv4().slice(0, 4);
    localStorage.setItem('comic_user_name', name);
    return name;
  })());

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:3001/ws`;
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'join', userId, userName }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'cursor') {
            updateCursor(data.userId, data.cursor);
          } else if (data.type === 'join') {
            addCollaborator({
              id: data.userId,
              name: data.userName,
              color: data.color || '#8b5cf6',
            });
          } else if (data.type === 'leave') {
            removeCollaborator(data.userId);
          }
        } catch {}
      };

      ws.onclose = () => {};
      ws.onerror = () => {};
    } catch {}

    return () => {
      wsRef.current?.close();
    };
  }, [userId, userName, addCollaborator, removeCollaborator, updateCursor]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
      const rect = canvasContainerRef.current?.getBoundingClientRect();
      if (!rect) return;
      wsRef.current.send(
        JSON.stringify({
          type: 'cursor',
          userId,
          cursor: { x: e.clientX - rect.left, y: e.clientY - rect.top },
        })
      );
    },
    [userId]
  );

  const handleUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const remaining = 12 - images.length;
      const toUpload = Array.from(files).slice(0, remaining);

      setIsUploading(true);

      try {
        const formData = new FormData();
        toUpload.forEach((file) => {
          if (file.size <= 5 * 1024 * 1024) {
            formData.append('images', file);
          }
        });

        const response = await axios.post('/api/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        const newFeatures: ImageFeature[] = response.data.features.map(
          (f: any) => ({
            id: f.id,
            filename: f.filename,
            url: `/uploads/${f.filename}`,
            width: f.width,
            height: f.height,
            visualCenter: f.visualCenter,
            subjectRatio: f.subjectRatio,
          })
        );

        addImages(newFeatures);
      } catch (err) {
        console.error('Upload failed:', err);
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [images.length, addImages]
  );

  const handleAutoLayout = useCallback(() => {
    if (images.length === 0) return;

    const canvasEl = canvasContainerRef.current;
    const canvasWidth = canvasEl?.clientWidth || 800;
    const canvasHeight = canvasEl?.clientHeight || 600;

    const candidates = generateLayouts(images, canvasWidth, canvasHeight);
    setLayoutCandidates(candidates);
    setShowLayoutModal(true);
  }, [images, setLayoutCandidates]);

  const handleApplyLayout = useCallback(
    (candidate: LayoutCandidate) => {
      applyLayout(candidate);
      setShowLayoutModal(false);
    },
    [applyLayout]
  );

  const handleUndo = useCallback(() => {
    undo();
  }, [undo]);

  const handleRedo = useCallback(() => {
    redo();
  }, [redo]);

  const handleExport = useCallback(async () => {
    try {
      const response = await axios.post(
        '/api/export',
        {
          cells: cells,
          images: images.map((img) => ({
            id: img.id,
            url: img.url,
            width: img.width,
            height: img.height,
          })),
        },
        { responseType: 'blob' }
      );
      const url = URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'comic-layout.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  }, [cells, images]);

  const handleInviteGenerate = useCallback(async () => {
    try {
      const response = await axios.post('/api/invite', { userId });
      setInviteCode(response.data.code);
    } catch (err) {
      const code = Math.random().toString(36).slice(2, 8).toUpperCase();
      setInviteCode(code);
    }
  }, [userId, setInviteCode]);

  const handleInviteJoin = useCallback(async () => {
    if (!inviteInput.trim()) return;
    try {
      await axios.post('/api/invite/join', { code: inviteInput, userId, userName });
    } catch {}
    setInviteInput('');
  }, [inviteInput, userId, userName]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#f43f5e';
  };

  const strategyLabel: Record<string, string> = {
    waterfall: '瀑布流',
    grid: '网状',
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#1a1a2e',
      }}
    >
      <header
        style={{
          height: 56,
          background: '#2d2d44',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          flexShrink: 0,
          borderBottom: '1px solid #3d3d55',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: 'linear-gradient(135deg, #646cff, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
          </div>
          <span style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>
            漫画分镜智能排版
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {collaborators.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: -4 }}>
              {collaborators.slice(0, 5).map((c) => (
                <div
                  key={c.id}
                  title={c.name}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: c.color,
                    border: '2px solid #2d2d44',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    color: '#fff',
                    fontWeight: 600,
                    marginLeft: -4,
                  }}
                >
                  {c.name[0]}
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              value={inviteInput}
              onChange={(e) => setInviteInput(e.target.value)}
              placeholder="输入邀请码"
              style={{
                width: 100,
                height: 30,
                borderRadius: 6,
                border: '1px solid #555',
                background: 'rgba(255,255,255,0.08)',
                color: '#fff',
                fontSize: 12,
                padding: '0 8px',
                outline: 'none',
              }}
            />
            <button
              onClick={handleInviteJoin}
              style={{
                height: 30,
                padding: '0 10px',
                borderRadius: 6,
                border: 'none',
                background: 'rgba(100,108,255,0.2)',
                color: '#646cff',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              加入
            </button>
          </div>

          <button
            onClick={() => {
              setShowInviteModal(true);
              handleInviteGenerate();
            }}
            style={{
              height: 30,
              padding: '0 12px',
              borderRadius: 6,
              border: 'none',
              background: '#646cff',
              color: '#fff',
              fontSize: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#535bf2')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#646cff')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            邀请
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <Toolbar
          onUpload={handleUpload}
          onAutoLayout={handleAutoLayout}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onExport={handleExport}
        />

        <div
          ref={canvasContainerRef}
          onMouseMove={handleMouseMove}
          style={{ flex: 1, display: 'flex', minHeight: 0 }}
        >
          <Canvas />
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {isUploading && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(15px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: 'rgba(45,45,68,0.95)',
              borderRadius: 16,
              padding: 32,
              textAlign: 'center',
              color: '#fff',
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                border: '3px solid #646cff30',
                borderTopColor: '#646cff',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 16px',
              }}
            />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <div>正在分析分镜图片...</div>
          </div>
        </div>
      )}

      {showLayoutModal && layoutCandidates.length > 0 && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(15px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowLayoutModal(false)}
        >
          <div
            style={{
              background: 'rgba(45,45,68,0.95)',
              borderRadius: 16,
              padding: 28,
              width: 680,
              maxWidth: '90vw',
              animation: 'fadeIn 0.2s ease',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                color: '#fff',
                fontSize: 16,
                fontWeight: 600,
                marginBottom: 20,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>智能排版推荐</span>
              <button
                onClick={() => setShowLayoutModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#999',
                  fontSize: 18,
                  cursor: 'pointer',
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', gap: 16 }}>
              {layoutCandidates.map((candidate, ci) => (
                <div
                  key={ci}
                  onClick={() => handleApplyLayout(candidate)}
                  style={{
                    flex: 1,
                    background: 'rgba(255,255,255,0.06)',
                    borderRadius: 12,
                    padding: 16,
                    cursor: 'pointer',
                    border: '1px solid rgba(255,255,255,0.08)',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#646cff';
                    e.currentTarget.style.background = 'rgba(100,108,255,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                  }}
                >
                  <div
                    style={{
                      color: '#ccc',
                      fontSize: 12,
                      marginBottom: 8,
                      fontWeight: 500,
                    }}
                  >
                    方案 {ci + 1} · {strategyLabel[candidate.strategy] || candidate.strategy}
                  </div>

                  <div
                    style={{
                      width: '100%',
                      height: 140,
                      background: '#f0f0f0',
                      borderRadius: 8,
                      position: 'relative',
                      overflow: 'hidden',
                      marginBottom: 10,
                    }}
                  >
                    {candidate.cells.map((cell, j) => {
                      const scaleX = 1 / 3;
                      const scaleY = 140 / 600;
                      return (
                        <div
                          key={j}
                          style={{
                            position: 'absolute',
                            left: cell.x * scaleX,
                            top: cell.y * scaleY,
                            width: cell.width * scaleX,
                            height: cell.height * scaleY,
                            background: `hsl(${ci * 120 + j * 30}, 50%, 70%)`,
                            borderRadius: 2,
                            border: '1px solid rgba(0,0,0,0.1)',
                          }}
                        />
                      );
                    })}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        height: 6,
                        borderRadius: 3,
                        background: '#333',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${candidate.score}%`,
                          borderRadius: 3,
                          background: `linear-gradient(90deg, ${getScoreColor(candidate.score)}, ${getScoreColor(candidate.score)}88)`,
                          transition: 'width 0.5s ease',
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: getScoreColor(candidate.score),
                        minWidth: 32,
                        textAlign: 'right',
                      }}
                    >
                      {candidate.score}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showInviteModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(15px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowInviteModal(false)}
        >
          <div
            style={{
              background: 'rgba(45,45,68,0.95)',
              borderRadius: 16,
              padding: 28,
              width: 360,
              maxWidth: '90vw',
              animation: 'fadeIn 0.2s ease',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                color: '#fff',
                fontSize: 16,
                fontWeight: 600,
                marginBottom: 20,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>邀请协作</span>
              <button
                onClick={() => setShowInviteModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#999',
                  fontSize: 18,
                  cursor: 'pointer',
                }}
              >
                ×
              </button>
            </div>

            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ color: '#999', fontSize: 13, marginBottom: 8 }}>
                将以下邀请码分享给协作者
              </div>
              <div
                style={{
                  background: 'rgba(100,108,255,0.12)',
                  border: '1px dashed #646cff',
                  borderRadius: 10,
                  padding: '14px 20px',
                  fontSize: 28,
                  fontWeight: 700,
                  letterSpacing: 6,
                  color: '#646cff',
                  fontFamily: 'monospace',
                }}
              >
                {inviteCode || '------'}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(inviteCode);
                }}
                style={{
                  marginTop: 14,
                  padding: '8px 24px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#646cff',
                  color: '#fff',
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#535bf2')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#646cff')}
              >
                复制邀请码
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
