import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../App';
import {
  getRandomColorScheme,
  getRoleGradient,
  AVATAR_COLORS,
  ROLE_DESCRIPTIONS,
  type Player,
} from '../utils/gameLogic';
import { wsClient } from '../utils/websocket';
import type { WebSocketMessage } from '../utils/websocket';

interface ChatMsg {
  id: string;
  playerId: string;
  playerName: string;
  avatarIndex: number;
  content: string;
  timestamp: number;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
}

export default function Lobby() {
  const { roomId: urlRoomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { gameState, playerId, playerName, setPlayerInfo, setGameState } = useAppContext();

  const [colorScheme] = useState(() => getRandomColorScheme());
  const [playerNameInput, setPlayerNameInput] = useState('');
  const [roomIdInput, setRoomIdInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'players' | 'chat'>('players');
  const [showJoinForm, setShowJoinForm] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const rippleIdRef = useRef(0);

  const inRoom = !!gameState && !!playerId;

  useEffect(() => {
    if (!inRoom) return;

    const cleanup = wsClient.onMessage((message: WebSocketMessage) => {
      if (message.type === 'chat' && message.content && message.player_id && message.player_name) {
        const newMsg: ChatMsg = {
          id: `${message.player_id}-${Date.now()}-${Math.random()}`,
          playerId: message.player_id,
          playerName: message.player_name,
          avatarIndex: message.avatar_index ?? 0,
          content: message.content,
          timestamp: Date.now(),
        };
        setChatMessages(prev => [...prev, newMsg]);
      }
    });

    return cleanup;
  }, [inRoom]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const createRipple = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = rippleIdRef.current++;

    setRipples(prev => [...prev, { id, x, y }]);

    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== id));
    }, 300);
  }, []);

  const playFlipSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.15);

      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
    } catch (e) {
      console.log('Audio not supported');
    }
  }, []);

  const handleCreateRoom = async (e: React.MouseEvent) => {
    createRipple(e);
    if (!playerNameInput.trim()) {
      alert('请输入你的名字');
      return;
    }

    try {
      const response = await fetch('/api/rooms', { method: 'POST' });
      const data = await response.json();
      const roomId = data.room_id;

      const joinResponse = await fetch(`/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: playerNameInput.trim() }),
      });
      const joinData = await joinResponse.json();

      setPlayerInfo(playerNameInput.trim(), joinData.player_id, roomId);
      navigate(`/room/${roomId}`);
    } catch (error) {
      console.error('Failed to create room:', error);
      alert('创建房间失败，请检查后端服务是否启动');
    }
  };

  const handleJoinRoom = async (e: React.MouseEvent) => {
    createRipple(e);
    if (!playerNameInput.trim()) {
      alert('请输入你的名字');
      return;
    }
    if (!roomIdInput.trim()) {
      alert('请输入房间号');
      return;
    }

    const roomId = roomIdInput.trim().toUpperCase();

    try {
      const joinResponse = await fetch(`/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: playerNameInput.trim() }),
      });

      if (!joinResponse.ok) {
        const error = await joinResponse.json();
        alert(error.detail || '加入房间失败');
        return;
      }

      const joinData = await joinResponse.json();
      setPlayerInfo(playerNameInput.trim(), joinData.player_id, roomId);
      navigate(`/room/${roomId}`);
    } catch (error) {
      console.error('Failed to join room:', error);
      alert('加入房间失败，请检查房间号是否正确');
    }
  };

  const handleStartGame = () => {
    wsClient.startGame();
  };

  const handleCardClick = (player: Player) => {
    if (player.id !== playerId) return;

    if (Math.random() > 0.3) {
      playFlipSound();
      setFlippedCards(prev => {
        const next = new Set(prev);
        if (next.has(player.id)) {
          next.delete(player.id);
        } else {
          next.add(player.id);
        }
        return next;
      });
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    wsClient.sendChatMessage(chatInput.trim());
    setChatInput('');
  };

  const handleVote = (targetId: string) => {
    wsClient.vote(targetId);
  };

  const handleCopyRoomId = () => {
    if (gameState) {
      navigator.clipboard.writeText(gameState.room_id);
      alert('房间号已复制到剪贴板');
    }
  };

  if (!inRoom) {
    return (
      <div className="home-page" style={{ '--primary': colorScheme.primary, '--secondary': colorScheme.secondary, '--accent': colorScheme.accent } as React.CSSProperties}>
        <div className="bg-decoration">
          <div className="glow-orb orb-1" style={{ background: colorScheme.primary }} />
          <div className="glow-orb orb-2" style={{ background: colorScheme.secondary }} />
          <div className="glow-orb orb-3" style={{ background: colorScheme.accent }} />
        </div>

        <div className="home-container">
          <div className="logo-section">
            <h1 className="game-title">桌游集结号</h1>
            <p className="game-subtitle">和朋友们来一场刺激的狼人杀吧</p>
          </div>

          <div className="auth-card glass">
            <div className="input-group">
              <label>你的名字</label>
              <input
                type="text"
                placeholder="请输入昵称"
                value={playerNameInput}
                onChange={e => setPlayerNameInput(e.target.value)}
                maxLength={12}
              />
            </div>

            {!showJoinForm ? (
              <div className="button-group">
                <button
                  className="btn btn-primary ripple-btn"
                  onClick={handleCreateRoom}
                >
                  创建房间
                  {ripples.map(ripple => (
                    <span
                      key={ripple.id}
                      className="ripple"
                      style={{ left: ripple.x, top: ripple.y }}
                    />
                  ))}
                </button>

                <button
                  className="btn btn-secondary"
                  onClick={() => setShowJoinForm(true)}
                >
                  加入房间
                </button>
              </div>
            ) : (
              <div className="join-form">
                <div className="input-group">
                  <label>房间号</label>
                  <input
                    type="text"
                    placeholder="输入6位房间号"
                    value={roomIdInput}
                    onChange={e => setRoomIdInput(e.target.value.toUpperCase())}
                    maxLength={6}
                    className="room-id-input"
                  />
                </div>

                <div className="button-group">
                  <button
                    className="btn btn-primary ripple-btn"
                    onClick={handleJoinRoom}
                  >
                    加入
                    {ripples.map(ripple => (
                      <span
                        key={ripple.id}
                        className="ripple"
                        style={{ left: ripple.x, top: ripple.y }}
                      />
                    ))}
                  </button>

                  <button
                    className="btn btn-outline"
                    onClick={() => setShowJoinForm(false)}
                  >
                    返回
                  </button>
                </div>
              </div>
            )}
          </div>

          <p className="footer-text">最多支持 8 人同时在线游戏</p>
        </div>
      </div>
    );
  }

  return (
    <div className="room-page">
      <div className="bg-decoration">
        <div className="glow-orb orb-1" />
        <div className="glow-orb orb-2" />
        <div className="glow-orb orb-3" />
      </div>

      <div className="room-header glass">
        <div className="room-info">
          <h2>房间号: {gameState?.room_id}</h2>
          <button className="btn-copy" onClick={handleCopyRoomId}>复制</button>
        </div>
        <div className="game-status">
          <span className={`status-badge phase-${gameState?.phase}`}>
            {gameState?.phase === 'waiting' && '等待开始'}
            {gameState?.phase === 'day' && `第${gameState?.day_count}天 - 白天`}
            {gameState?.phase === 'night' && `第${gameState?.day_count}天 - 夜晚`}
          </span>
        </div>
      </div>

      <div className="room-content">
        <div className="player-sidebar glass desktop-only">
          <h3>玩家列表 ({gameState?.players.length || 0}/8)</h3>
          <div className="player-list">
            {gameState?.players.map(player => (
              <div
                key={player.id}
                className={`player-item ${player.is_alive ? '' : 'dead'} ${player.id === playerId ? 'is-me' : ''}`}
                onClick={() => gameState?.phase === 'day' && gameState.game_state === 'playing' && player.is_alive && player.id !== playerId && handleVote(player.id)}
              >
                <div className="player-avatar" style={{ background: AVATAR_COLORS[player.avatar_index] }}>
                  {player.name.charAt(0)}
                  <span className={`status-dot ${player.is_online ? 'online' : 'offline'}`} />
                </div>
                <div className="player-info">
                  <span className="player-name">{player.name}</span>
                  {player.role && player.id === playerId && (
                    <span className="player-role">{player.role}</span>
                  )}
                  {!player.is_alive && <span className="player-status">已出局</span>}
                </div>
              </div>
            ))}
          </div>

          {gameState?.game_state === 'waiting' && gameState?.players && gameState.players.length >= 4 && (
            <button className="btn btn-primary start-btn" onClick={handleStartGame}>
              开始游戏
            </button>
          )}
        </div>

        <div className="game-area">
          <div className="cards-container">
            {gameState?.players.map(player => (
              <div
                key={player.id}
                className={`card-wrapper ${flippedCards.has(player.id) ? 'flipped' : ''} ${!player.is_alive ? 'card-dead' : ''}`}
                onClick={() => handleCardClick(player)}
              >
                <div className="card-inner">
                  <div className="card-back">
                    <div className="card-pattern" />
                    <div className="card-glow" />
                  </div>
                  <div className="card-front">
                    <div
                      className="card-role"
                      style={{ background: getRoleGradient(player.role || null) }}
                    >
                      {player.role || '?'}
                    </div>
                    <div className="card-player-name">{player.name}</div>
                    {player.role && (
                      <div className="card-desc">
                        {ROLE_DESCRIPTIONS[player.role] || ''}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {gameState?.winner && (
            <div className="winner-overlay">
              <div className="winner-card glass">
                <h2>
                  {gameState.winner === 'wolves_win' ? '🐺 狼人获胜！' : '🎉 好人阵营获胜！'}
                </h2>
                <button className="btn btn-primary" onClick={() => navigate('/')}>
                  返回首页
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="chat-section glass">
        <div className="chat-header">
          <h3>聊天</h3>
          <span className="chat-count">{chatMessages.length} 条消息</span>
        </div>
        <div className="chat-messages">
          {chatMessages.length === 0 ? (
            <div className="chat-empty">暂无消息，说点什么吧~</div>
          ) : (
            chatMessages.map(msg => (
              <div
                key={msg.id}
                className={`chat-bubble ${msg.playerId === playerId ? 'is-mine' : ''}`}
                style={{ '--bubble-color': AVATAR_COLORS[msg.avatarIndex] } as React.CSSProperties}
              >
                <div className="chat-avatar" style={{ background: AVATAR_COLORS[msg.avatarIndex] }}>
                  {msg.playerName.charAt(0)}
                </div>
                <div className="chat-content">
                  <div className="chat-name">{msg.playerName}</div>
                  <div className="chat-text">{msg.content}</div>
                </div>
              </div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>
        <form className="chat-input-area" onSubmit={handleSendChat}>
          <input
            type="text"
            placeholder="输入消息..."
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            maxLength={200}
          />
          <button type="submit" className="btn btn-primary send-btn">
            发送
          </button>
        </form>
      </div>

      <div className="mobile-tab-bar mobile-only">
        <button
          className={`tab-btn ${activeTab === 'players' ? 'active' : ''}`}
          onClick={() => setActiveTab('players')}
        >
          <span className="tab-icon">👥</span>
          <span>玩家</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          <span className="tab-icon">💬</span>
          <span>聊天</span>
        </button>
      </div>

      {activeTab === 'players' && (
        <div className="mobile-drawer mobile-only">
          <div className="player-sidebar mobile">
            <h3>玩家列表 ({gameState?.players.length || 0}/8)</h3>
            <div className="player-list">
              {gameState?.players.map(player => (
                <div
                  key={player.id}
                  className={`player-item ${player.is_alive ? '' : 'dead'} ${player.id === playerId ? 'is-me' : ''}`}
                >
                  <div className="player-avatar" style={{ background: AVATAR_COLORS[player.avatar_index] }}>
                    {player.name.charAt(0)}
                    <span className={`status-dot ${player.is_online ? 'online' : 'offline'}`} />
                  </div>
                  <div className="player-info">
                    <span className="player-name">{player.name}</span>
                    {player.role && player.id === playerId && (
                      <span className="player-role">{player.role}</span>
                    )}
                    {!player.is_alive && <span className="player-status">已出局</span>}
                  </div>
                </div>
              ))}
            </div>

            {gameState?.game_state === 'waiting' && gameState?.players && gameState.players.length >= 4 && (
              <button className="btn btn-primary start-btn" onClick={handleStartGame}>
                开始游戏
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
