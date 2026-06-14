import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store';
import { RoomManager } from '../room/RoomManager';
import { LyricInput } from './LyricInput';

const MemberItem: React.FC<{
  member: { id: string; nickname: string; avatar: string; online: boolean };
  isCurrentTurn: boolean;
  isMe: boolean;
}> = ({ member, isCurrentTurn, isMe }) => {
  const [leaving, setLeaving] = useState(false);
  const prevOnlineRef = useRef(member.online);

  useEffect(() => {
    if (prevOnlineRef.current && !member.online) {
      setLeaving(true);
      const timer = setTimeout(() => setLeaving(false), 300);
      return () => clearTimeout(timer);
    }
    prevOnlineRef.current = member.online;
  }, [member.online]);

  return (
    <div className={`member-item ${isCurrentTurn ? 'current-turn' : ''} ${isMe ? 'is-me' : ''}`}>
      <div className={`member-avatar-wrapper ${isCurrentTurn ? 'gold-ring' : ''}`}>
        <div
          className="member-avatar"
          style={{ backgroundColor: member.avatar }}
        >
          {member.nickname.charAt(0).toUpperCase()}
        </div>
        <span
          className={`online-dot ${member.online ? 'online' : 'offline'} ${leaving ? 'leaving' : ''}`}
        />
      </div>
      <span className="member-name">
        {member.nickname}
        {isMe && <span className="me-tag">我</span>}
      </span>
    </div>
  );
};

const Countdown: React.FC<{ value: number }> = ({ value }) => {
  const [flip, setFlip] = useState(false);
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (prevValueRef.current !== value) {
      setFlip(true);
      const timer = setTimeout(() => setFlip(false), 300);
      prevValueRef.current = value;
      return () => clearTimeout(timer);
    }
  }, [value]);

  const isLastSecond = value === 1;

  return (
    <div className="countdown-overlay">
      <div className={`countdown-number ${flip ? 'flip' : ''} ${isLastSecond ? 'last-second' : ''}`}>
        {value}
      </div>
    </div>
  );
};

export const RoomView: React.FC = () => {
  const room = useAppStore((s) => s.room);
  const memberId = useAppStore((s) => s.memberId);
  const countdown = useAppStore((s) => s.countdown);
  const setCountdown = useAppStore((s) => s.setCountdown);
  const setView = useAppStore((s) => s.setView);
  const lyricsEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    pollRef.current = RoomManager.startPolling(2000);
    return () => {
      if (pollRef.current) RoomManager.stopPolling(pollRef.current);
    };
  }, []);

  useEffect(() => {
    if (lyricsEndRef.current) {
      lyricsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [room?.lyrics.length]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        const next = countdown - 1;
        setCountdown(next);
        if (next === 0) {
          RoomManager.confirmStart();
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown, setCountdown]);

  if (!room) return null;

  const isOwner = room.members.length > 0 && room.members[0].id === memberId;
  const canStart = isOwner && room.status === 'waiting' && room.members.filter((m) => m.online).length >= 2;
  const isPlaying = room.status === 'playing';
  const isFinished = room.status === 'finished';
  const isCountdown = countdown > 0;

  const handleStart = () => {
    RoomManager.startGame();
  };

  const handleLeave = async () => {
    if (pollRef.current) RoomManager.stopPolling(pollRef.current);
    await RoomManager.leaveRoom();
  };

  const handleReplay = () => {
    setView('replay');
  };

  const handleReset = async () => {
    await RoomManager.resetRoom();
  };

  return (
    <div className="room-container">
      {isCountdown && <Countdown value={countdown} />}

      <div className="room-header">
        <div className="room-id-display">
          房间号: <span className="room-id-code">{room.id}</span>
        </div>
        <button className="leave-btn" onClick={handleLeave}>
          离开房间
        </button>
      </div>

      <div className="room-body">
        <div className="members-panel">
          <h3 className="panel-title">成员 ({room.members.filter((m) => m.online).length} 在线)</h3>
          <div className="members-list">
            {room.members.map((member) => (
              <MemberItem
                key={member.id}
                member={member}
                isCurrentTurn={isPlaying && room.members[room.currentTurnIndex]?.id === member.id}
                isMe={member.id === memberId}
              />
            ))}
          </div>
          {canStart && (
            <button className="start-btn" onClick={handleStart}>
              🎤 开始接龙
            </button>
          )}
          {!canStart && room.status === 'waiting' && (
            <div className="waiting-hint">
              {room.members.filter((m) => m.online).length < 2
                ? '等待更多玩家加入... (至少2人)'
                : '等待房主开始游戏...'}
            </div>
          )}
        </div>

        <div className="lyrics-panel">
          <h3 className="panel-title">歌词流</h3>
          <div className="lyrics-flow">
            {room.lyrics.length === 0 && !isPlaying && (
              <div className="lyrics-empty">游戏开始后歌词将在这里显示</div>
            )}
            {room.lyrics.map((lyric, idx) => (
              <div key={lyric.id} className="lyric-card" style={{ animationDelay: '0s' }}>
                <div className="lyric-card-header">
                  <span className="lyric-author" style={{ color: room.members.find((m) => m.id === lyric.memberId)?.avatar || '#e94560' }}>
                    {lyric.memberNickname}
                  </span>
                  <span className="lyric-index">#{idx + 1}</span>
                </div>
                <div className="lyric-content">{lyric.content}</div>
                {lyric.keyword && <div className="lyric-keyword">灵感: {lyric.keyword}</div>}
              </div>
            ))}
            <div ref={lyricsEndRef} />
          </div>

          {isPlaying && (
            <LyricInput />
          )}

          {isFinished && (
            <div className="finished-actions">
              <div className="finished-badge">🎉 一轮接龙完成！</div>
              <button className="action-btn replay-btn" onClick={handleReplay}>
                📖 完整回放
              </button>
              <button className="action-btn reset-btn" onClick={handleReset}>
                🔄 再来一轮
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
