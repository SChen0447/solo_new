import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { useRecipeStore, User, Timer, RecipeStep, Ingredient } from '../store/recipeStore';
import RecipeEditor from '../components/RecipeEditor';
import TimerGroup from '../components/TimerGroup';
import IngredientsPanel from '../components/IngredientsPanel';
import CollaboratorsList from '../components/CollaboratorsList';

const RecipePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const socketRef = useRef<Socket | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const {
    title,
    steps,
    isDarkMode,
    isIngredientsOpen,
    isLoading,
    error,
    setRecipeId,
    setRecipeData,
    setCurrentUser,
    setCurrentUserId,
    updateUsers,
    updateCursor,
    setUserEditing,
    setTimers,
    setLoading,
    setError,
    addStep,
    updateStep,
    toggleDarkMode,
    toggleIngredients,
    reset,
  } = useRecipeStore();

  useEffect(() => {
    if (!id) return;

    setRecipeId(id);
    setLoading(true);
    setNotFound(false);

    const socket = io({
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('join', { recipeId: id });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('user:joined', ({ userId, user }: { userId: string; user: User }) => {
      setCurrentUser(user);
      setCurrentUserId(userId);
    });

    socket.on('users:update', (usersList: User[]) => {
      updateUsers(usersList);
    });

    socket.on('recipe:data', (data: {
      id: string;
      title: string;
      content: string;
      steps: RecipeStep[];
      ingredients: Ingredient[];
      history: any[];
      timers: Timer[];
    }) => {
      setRecipeData({
        title: data.title,
        content: data.content,
        steps: data.steps,
        ingredients: data.ingredients,
        history: data.history,
      });
      setTimers(data.timers);
      setLoading(false);
    });

    socket.on('cursor:updated', ({ userId, position }: { userId: string; position: number }) => {
      updateCursor(userId, position);
    });

    socket.on('user:editing', ({ userId, isEditing }: { userId: string; isEditing: boolean }) => {
      setUserEditing(userId, isEditing);
    });

    socket.on('step:added', ({ step }: { step: RecipeStep }) => {
      addStep(step);
    });

    socket.on('step:updated', ({ stepId, content }: { stepId: string; content: string }) => {
      updateStep(stepId, content);
    });

    socket.on('connect_error', (err) => {
      setError(err.message);
      setLoading(false);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      reset();
    };
  }, [id, setRecipeId, setRecipeData, setCurrentUser, setCurrentUserId, updateUsers, updateCursor, setUserEditing, setTimers, setLoading, setError, addStep, updateStep, reset]);

  if (notFound) {
    return (
      <div className={`not-found-page ${isDarkMode ? 'dark' : ''}`}>
        <div className="not-found-content">
          <h1>404</h1>
          <h2>食谱未找到</h2>
          <p>抱歉，您访问的食谱不存在或已被删除。</p>
          <Link to="/" className="back-home-btn">
            返回首页
          </Link>
        </div>
        <style>{`
          .not-found-page {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: #fdf5e6;
          }

          .not-found-page.dark {
            background-color: #1a1a1a;
          }

          .not-found-content {
            text-align: center;
            padding: 40px;
          }

          .not-found-content h1 {
            font-size: 120px;
            margin: 0;
            color: #795548;
            font-weight: bold;
          }

          .dark .not-found-content h1 {
            color: #a1887f;
          }

          .not-found-content h2 {
            font-size: 28px;
            margin: 20px 0 10px;
            color: #5d4037;
          }

          .dark .not-found-content h2 {
            color: #e0e0e0;
          }

          .not-found-content p {
            font-size: 16px;
            color: #888;
            margin-bottom: 30px;
          }

          .back-home-btn {
            display: inline-block;
            padding: 12px 32px;
            background-color: #795548;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-size: 16px;
            transition: background-color 0.2s;
          }

          .back-home-btn:hover {
            background-color: #5d4037;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className={`recipe-page ${isDarkMode ? 'dark' : ''}`}>
      <header className="app-header">
        <div className="header-left">
          <Link to="/" className="logo-link">
            🍳 食谱协作
          </Link>
          <span className="recipe-title">{title}</span>
        </div>
        <div className="header-right">
          <div className="connection-status">
            <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`} />
            <span className="status-text">
              {isConnected ? '已连接' : '连接中...'}
            </span>
          </div>
          <CollaboratorsList />
          <button
            className="theme-toggle-btn"
            onClick={toggleDarkMode}
            title={isDarkMode ? '切换到亮色模式' : '切换到暗色模式'}
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <main className="main-content">
        <IngredientsPanel
          socket={socketRef.current}
          isOpen={isIngredientsOpen}
          onToggle={toggleIngredients}
        />

        <div className="content-area">
          {isLoading ? (
            <div className="loading-container">
              <div className="loading-spinner" />
              <p>加载中...</p>
            </div>
          ) : error ? (
            <div className="error-container">
              <p className="error-text">出错了：{error}</p>
            </div>
          ) : (
            <div className="editor-timer-wrapper">
              <div className="editor-section">
                <RecipeEditor socket={socketRef.current} />
              </div>
              <div className="timer-section">
                <TimerGroup socket={socketRef.current} steps={steps} />
              </div>
            </div>
          )}
        </div>
      </main>

      <style>{`
        .recipe-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background-color: #fdf5e6;
          transition: background-color 0.5s ease;
        }

        .recipe-page.dark {
          background-color: #1a1a1a;
        }

        .app-header {
          height: 56px;
          background-color: #795548;
          color: white;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          flex-shrink: 0;
          transition: background-color 0.5s ease;
        }

        .dark .app-header {
          background-color: #3e2723;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .logo-link {
          color: white;
          text-decoration: none;
          font-size: 20px;
          font-weight: bold;
        }

        .recipe-title {
          font-size: 16px;
          opacity: 0.9;
          padding-left: 16px;
          border-left: 1px solid rgba(255, 255, 255, 0.3);
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .connection-status {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .status-dot.connected {
          background-color: #4caf50;
        }

        .status-dot.disconnected {
          background-color: #f44336;
          animation: blink 1s ease-in-out infinite;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        .status-text {
          font-size: 12px;
        }

        .theme-toggle-btn {
          width: 36px;
          height: 36px;
          border: none;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.15);
          color: white;
          font-size: 18px;
          cursor: pointer;
          transition: background-color 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .theme-toggle-btn:hover {
          background: rgba(255, 255, 255, 0.25);
        }

        .main-content {
          flex: 1;
          display: flex;
          overflow: hidden;
        }

        .content-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .editor-timer-wrapper {
          flex: 1;
          display: flex;
          overflow: hidden;
        }

        .editor-section {
          flex: 7;
          display: flex;
          flex-direction: column;
          border-right: 1px solid #e0e0e0;
          overflow: hidden;
        }

        .dark .editor-section {
          border-right-color: #424242;
        }

        .timer-section {
          flex: 3;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .loading-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #d7ccc8;
          border-top-color: #795548;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .loading-container p {
          color: #888;
          font-size: 14px;
        }

        .error-container {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .error-text {
          color: #f44336;
          font-size: 14px;
        }

        @media (max-width: 1024px) {
          .editor-timer-wrapper {
            flex-direction: column;
          }

          .editor-section {
            flex: none;
            height: 50%;
            border-right: none;
            border-bottom: 1px solid #e0e0e0;
          }

          .dark .editor-section {
            border-bottom-color: #424242;
          }

          .timer-section {
            flex: none;
            height: 50%;
          }
        }

        @media (max-width: 768px) {
          .recipe-title {
            display: none;
          }

          .connection-status {
            display: none;
          }

          .header-right {
            gap: 8px;
          }

          .content-area {
            padding-bottom: 50vh;
          }

          .editor-timer-wrapper {
            flex-direction: column;
          }

          .editor-section {
            flex: none;
            height: auto;
            min-height: 300px;
          }

          .timer-section {
            flex: none;
            height: auto;
            min-height: 300px;
          }
        }
      `}</style>
    </div>
  );
};

export default RecipePage;
