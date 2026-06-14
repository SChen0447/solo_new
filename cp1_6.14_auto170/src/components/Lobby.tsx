import React, { useState } from 'react';
import { useAppStore } from '../store';
import { RoomManager } from '../room/RoomManager';

export const Lobby: React.FC = () => {
  const [nickname, setNickname] = useState('');
  const [roomId, setRoomId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'create' | 'join'>('create');

  const handleCreate = async () => {
    if (!nickname.trim()) {
      setError('请输入昵称');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await RoomManager.createRoom(nickname.trim());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!nickname.trim()) {
      setError('请输入昵称');
      return;
    }
    if (!roomId.trim()) {
      setError('请输入房间号');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await RoomManager.joinRoom(roomId.trim().toUpperCase(), nickname.trim());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (mode === 'create') handleCreate();
      else handleJoin();
    }
  };

  return (
    <div className="lobby-card">
      <div className="lobby-tabs">
        <button
          className={`lobby-tab ${mode === 'create' ? 'active' : ''}`}
          onClick={() => { setMode('create'); setError(''); }}
        >
          创建房间
        </button>
        <button
          className={`lobby-tab ${mode === 'join' ? 'active' : ''}`}
          onClick={() => { setMode('join'); setError(''); }}
        >
          加入房间
        </button>
      </div>

      <div className="lobby-form">
        <input
          className="lobby-input"
          type="text"
          placeholder="输入你的昵称"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={20}
        />

        {mode === 'join' && (
          <input
            className="lobby-input"
            type="text"
            placeholder="输入房间号 (6位)"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            maxLength={6}
          />
        )}

        {error && <div className="lobby-error">{error}</div>}

        <button
          className="lobby-btn"
          onClick={mode === 'create' ? handleCreate : handleJoin}
          disabled={loading}
        >
          {loading ? '处理中...' : mode === 'create' ? '创建房间' : '加入房间'}
        </button>
      </div>

      <div className="lobby-hint">
        <p>💡 提示：创建房间后邀请朋友输入房间号即可加入</p>
        <p>📝 每人轮流写一句歌词，最终组成一首完整的歌</p>
      </div>
    </div>
  );
};
