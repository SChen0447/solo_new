import React, { useReducer, useEffect, useCallback, useRef, useState } from 'react';
import WaterfallGrid from './components/WaterfallGrid';
import Lightbox from './components/Lightbox';
import TrendingPanel from './components/TrendingPanel';

export interface Work {
  id: string;
  title: string;
  username: string;
  thumbnailUrl: string;
  imageUrl: string;
  likes: number;
  liked: boolean;
  comments: Comment[];
  createdAt: string;
  height: number;
}

export interface Comment {
  id: string;
  username: string;
  text: string;
  createdAt: string;
}

interface AppState {
  works: Work[];
  lightboxIndex: number | null;
  user: { username: string } | null;
  uploadProgress: number;
  isUploading: boolean;
}

type Action =
  | { type: 'SET_WORKS'; payload: Work[] }
  | { type: 'LIKE_WORK'; payload: string }
  | { type: 'UNLIKE_WORK'; payload: string }
  | { type: 'ADD_COMMENT'; payload: { workId: string; comment: Comment } }
  | { type: 'OPEN_LIGHTBOX'; payload: number }
  | { type: 'CLOSE_LIGHTBOX' }
  | { type: 'SET_USER'; payload: { username: string } | null }
  | { type: 'SET_UPLOAD_PROGRESS'; payload: number }
  | { type: 'SET_UPLOADING'; payload: boolean }
  | { type: 'ADD_WORK'; payload: Work };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_WORKS':
      return { ...state, works: action.payload };
    case 'LIKE_WORK':
      return {
        ...state,
        works: state.works.map((w) =>
          w.id === action.payload
            ? { ...w, likes: w.likes + 1, liked: true }
            : w
        ),
      };
    case 'UNLIKE_WORK':
      return {
        ...state,
        works: state.works.map((w) =>
          w.id === action.payload
            ? { ...w, likes: Math.max(0, w.likes - 1), liked: false }
            : w
        ),
      };
    case 'ADD_COMMENT':
      return {
        ...state,
        works: state.works.map((w) =>
          w.id === action.payload.workId
            ? { ...w, comments: [...w.comments, action.payload.comment] }
            : w
        ),
      };
    case 'OPEN_LIGHTBOX':
      return { ...state, lightboxIndex: action.payload };
    case 'CLOSE_LIGHTBOX':
      return { ...state, lightboxIndex: null };
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_UPLOAD_PROGRESS':
      return { ...state, uploadProgress: action.payload };
    case 'SET_UPLOADING':
      return { ...state, isUploading: action.payload };
    case 'ADD_WORK':
      return { ...state, works: [action.payload, ...state.works] };
    default:
      return state;
  }
}

const initialState: AppState = {
  works: [],
  lightboxIndex: null,
  user: null,
  uploadProgress: 0,
  isUploading: false,
};

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [showLogin, setShowLogin] = useState(false);
  const [loginUser, setLoginUser] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/works')
      .then((r) => r.json())
      .then((data) => dispatch({ type: 'SET_WORKS', payload: data }))
      .catch(console.error);
  }, []);

  const handleLogin = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (loginUser.trim()) {
        dispatch({ type: 'SET_USER', payload: { username: loginUser.trim() } });
        setShowLogin(false);
        setLoginUser('');
      }
    },
    [loginUser]
  );

  const handleLogout = useCallback(() => {
    dispatch({ type: 'SET_USER', payload: null });
  }, []);

  const handleLike = useCallback(
    async (workId: string) => {
      const work = state.works.find((w) => w.id === workId);
      if (!work) return;
      if (work.liked) {
        dispatch({ type: 'UNLIKE_WORK', payload: workId });
        fetch(`/api/works/${workId}/unlike`, { method: 'POST' }).catch(
          console.error
        );
      } else {
        dispatch({ type: 'LIKE_WORK', payload: workId });
        fetch(`/api/works/${workId}/like`, { method: 'POST' }).catch(
          console.error
        );
      }
    },
    [state.works]
  );

  const handleAddComment = useCallback(
    async (workId: string, text: string) => {
      if (!state.user || !text.trim()) return;
      const comment: Comment = {
        id: Date.now().toString(),
        username: state.user.username,
        text: text.trim(),
        createdAt: new Date().toISOString(),
      };
      dispatch({ type: 'ADD_COMMENT', payload: { workId, comment } });
      fetch(`/api/works/${workId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(comment),
      }).catch(console.error);
    },
    [state.user]
  );

  const uploadFile = useCallback(
    async (file: File) => {
      if (!state.user) {
        setShowLogin(true);
        return;
      }
      dispatch({ type: 'SET_UPLOADING', payload: true });
      dispatch({ type: 'SET_UPLOAD_PROGRESS', payload: 0 });
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', uploadTitle || file.name);
      formData.append('username', state.user.username);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/works');

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          dispatch({
            type: 'SET_UPLOAD_PROGRESS',
            payload: Math.round((e.loaded / e.total) * 100),
          });
        }
      };

      xhr.onload = () => {
        if (xhr.status === 201) {
          const work = JSON.parse(xhr.responseText);
          dispatch({ type: 'ADD_WORK', payload: work });
          setShowUpload(false);
          setUploadTitle('');
        }
        dispatch({ type: 'SET_UPLOADING', payload: false });
        dispatch({ type: 'SET_UPLOAD_PROGRESS', payload: 0 });
      };

      xhr.onerror = () => {
        dispatch({ type: 'SET_UPLOADING', payload: false });
      };

      xhr.send(formData);
    },
    [state.user, uploadTitle]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        uploadFile(file);
      }
    },
    [uploadFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        uploadFile(file);
      }
    },
    [uploadFile]
  );

  return (
    <div
      style={{
        background: '#1a1a2e',
        minHeight: '100vh',
        color: '#e0e0e0',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
          background: 'rgba(26, 26, 46, 0.72)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 1 }}>
          <span style={{ color: '#e94560' }}>●</span> 创意作品集
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {state.user ? (
            <>
              <button
                onClick={() => setShowUpload(true)}
                style={{
                  background: '#e94560',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 20px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                上传作品
              </button>
              <span style={{ fontSize: 14, color: '#aaa' }}>
                {state.user.username}
              </span>
              <button
                onClick={handleLogout}
                style={{
                  background: 'transparent',
                  color: '#aaa',
                  border: '1px solid #444',
                  borderRadius: 8,
                  padding: '6px 14px',
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                退出
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowLogin(true)}
              style={{
                background: '#e94560',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '8px 20px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              登录 / 注册
            </button>
          )}
        </div>
      </nav>

      {showLogin && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)',
          }}
          onClick={() => setShowLogin(false)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleLogin}
            style={{
              background: '#16213e',
              borderRadius: 16,
              padding: 32,
              width: 360,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <h2 style={{ margin: 0, color: '#fff', fontSize: 20 }}>
              登录 / 注册
            </h2>
            <input
              value={loginUser}
              onChange={(e) => setLoginUser(e.target.value)}
              placeholder="输入用户名"
              style={{
                background: '#1a1a2e',
                border: '1px solid #333',
                borderRadius: 8,
                padding: '10px 14px',
                color: '#fff',
                fontSize: 15,
                outline: 'none',
              }}
              autoFocus
            />
            <button
              type="submit"
              style={{
                background: '#e94560',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '10px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 15,
              }}
            >
              进入
            </button>
          </form>
        </div>
      )}

      {showUpload && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)',
          }}
          onClick={() => setShowUpload(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#16213e',
              borderRadius: 16,
              padding: 32,
              width: 480,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <h2 style={{ margin: 0, color: '#fff', fontSize: 20 }}>
              上传作品
            </h2>
            <input
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              placeholder="作品标题（可选）"
              style={{
                background: '#1a1a2e',
                border: '1px solid #333',
                borderRadius: 8,
                padding: '10px 14px',
                color: '#fff',
                fontSize: 15,
                outline: 'none',
              }}
            />
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? '#e94560' : '#444'}`,
                borderRadius: 12,
                padding: '40px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'border-color 0.2s',
                background: dragOver ? 'rgba(233,69,96,0.08)' : 'transparent',
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 8 }}>📁</div>
              <div style={{ color: '#aaa', fontSize: 14 }}>
                拖拽图片到此处，或点击选择文件
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </div>
            {state.isUploading && (
              <div>
                <div
                  style={{
                    height: 6,
                    background: '#333',
                    borderRadius: 3,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${state.uploadProgress}%`,
                      background: '#e94560',
                      borderRadius: 3,
                      transition: 'width 0.2s',
                    }}
                  />
                </div>
                <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>
                  上传中 {state.uploadProgress}%
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          paddingTop: 80,
          minHeight: '100vh',
        }}
      >
        <div style={{ flex: 1, paddingRight: 320 }}>
          <WaterfallGrid
            works={state.works}
            onWorkClick={(index) =>
              dispatch({ type: 'OPEN_LIGHTBOX', payload: index })
            }
            onLike={handleLike}
          />
        </div>
        <div
          style={{
            position: 'fixed',
            right: 0,
            top: 64,
            bottom: 0,
            width: 300,
            padding: 16,
            overflowY: 'auto',
          }}
        >
          <TrendingPanel works={state.works} onWorkClick={(id) => {
            const idx = state.works.findIndex(w => w.id === id);
            if (idx >= 0) dispatch({ type: 'OPEN_LIGHTBOX', payload: idx });
          }} />
        </div>
      </div>

      {state.lightboxIndex !== null && (
        <Lightbox
          works={state.works}
          currentIndex={state.lightboxIndex}
          onClose={() => dispatch({ type: 'CLOSE_LIGHTBOX' })}
          onLike={handleLike}
          onAddComment={handleAddComment}
          onPrev={() => {
            if (state.lightboxIndex! > 0)
              dispatch({
                type: 'OPEN_LIGHTBOX',
                payload: state.lightboxIndex! - 1,
              });
          }}
          onNext={() => {
            if (state.lightboxIndex! < state.works.length - 1)
              dispatch({
                type: 'OPEN_LIGHTBOX',
                payload: state.lightboxIndex! + 1,
              });
          }}
          user={state.user}
        />
      )}
    </div>
  );
}
