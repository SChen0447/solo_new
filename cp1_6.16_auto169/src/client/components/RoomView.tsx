import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Room } from '../types';
import DebatePanel from './DebatePanel';
import VotePanel from './VotePanel';

const RoomView = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nickname, setNickname] = useState('');
  const [memberId, setMemberId] = useState('');
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinNickname, setJoinNickname] = useState('');
  const [joinError, setJoinError] = useState('');

  useEffect(() => {
    if (!roomCode) return;

    const storedMemberId = localStorage.getItem(`member_${roomCode}`);
    const storedNickname = localStorage.getItem(`nickname_${roomCode}`);

    if (storedMemberId && storedNickname) {
      setMemberId(storedMemberId);
      setNickname(storedNickname);
    } else {
      setShowJoinForm(true);
    }

    fetchRoom();
    const interval = setInterval(fetchRoom, 1000);
    return () => clearInterval(interval);
  }, [roomCode]);

  const fetchRoom = async () => {
    if (!roomCode) return;

    try {
      const response = await axios.get(`/api/rooms/${roomCode}`);
      setRoom(response.data);
      setLoading(false);

      if (response.data.status === 'finished') {
        navigate(`/result/${roomCode}`);
      }
    } catch (err: unknown) {
      setLoading(false);
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setError('房间不存在');
      }
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError('');

    if (!joinNickname.trim()) {
      setJoinError('请输入昵称');
      return;
    }

    try {
      const response = await axios.post(`/api/rooms/${roomCode}/join`, {
        nickname: joinNickname.trim(),
      });

      const { memberId: newMemberId } = response.data;
      localStorage.setItem(`member_${roomCode!}`, newMemberId);
      localStorage.setItem(`nickname_${roomCode!}`, joinNickname.trim());
      setMemberId(newMemberId);
      setNickname(joinNickname.trim());
      setShowJoinForm(false);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response) {
        setJoinError(err.response.data.error || '加入失败');
      } else {
        setJoinError('加入失败');
      }
    }
  };

  const handleStartDebate = async () => {
    if (!room || !roomCode) return;

    try {
      await axios.post(`/api/rooms/${roomCode}/start`, {
        ownerId: memberId,
      });
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response) {
        setError(err.response.data.error || '开始失败');
      }
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ color: '#999', fontSize: '16px' }}>加载中...</div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', gap: '20px' }}>
        <div style={{ color: '#D32F2F', fontSize: '18px' }}>{error || '房间不存在'}</div>
        <button
          onClick={handleBack}
          style={{
            padding: '10px 24px',
            backgroundColor: '#1E88E5',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          返回首页
        </button>
      </div>
    );
  }

  if (showJoinForm && room.status === 'waiting') {
    return (
      <div style={{ maxWidth: '500px', margin: '100px auto', padding: '40px' }}>
        <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h2 style={{ color: '#1E88E5', marginBottom: '8px', textAlign: 'center' }}>加入辩论房间</h2>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
              辩题: <span style={{ color: '#333', fontWeight: 500 }}>{room.topic}</span>
            </div>
            <div style={{ fontSize: '13px', color: '#999' }}>
              房间码: <span style={{ fontFamily: 'monospace', color: '#1E88E5' }}>{room.roomCode}</span>
            </div>
          </div>
          <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#333' }}>
                您的昵称
              </label>
              <input
                type="text"
                value={joinNickname}
                onChange={(e) => setJoinNickname(e.target.value)}
                placeholder="请输入您的昵称"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
              />
            </div>
            {joinError && (
              <div style={{ color: '#D32F2F', fontSize: '14px', padding: '10px', backgroundColor: '#FFEBEE', borderRadius: '8px' }}>
                {joinError}
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={handleBack}
                style={{
                  flex: 1,
                  padding: '10px 20px',
                  backgroundColor: '#E0E0E0',
                  color: '#333',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                取消
              </button>
              <button
                type="submit"
                style={{
                  flex: 2,
                  padding: '10px 20px',
                  backgroundColor: '#1E88E5',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                加入房间
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (showJoinForm && room.status !== 'waiting') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', gap: '20px' }}>
        <div style={{ color: '#FF9800', fontSize: '18px' }}>辩论已开始，无法加入</div>
        <button
          onClick={handleBack}
          style={{
            padding: '10px 24px',
            backgroundColor: '#1E88E5',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          返回首页
        </button>
      </div>
    );
  }

  const isOwner = room.ownerId === memberId;
  const proCount = room.members.filter((m) => m.side === 'pro').length;
  const conCount = room.members.filter((m) => m.side === 'con').length;
  const canStart = proCount >= 1 && conCount >= 1;

  if (room.status === 'voting') {
    return <VotePanel room={room} memberId={memberId} nickname={nickname} />;
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <button
            onClick={handleBack}
            style={{
              padding: '8px 16px',
              backgroundColor: 'transparent',
              color: '#666',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              marginRight: '16px',
            }}
          >
            ← 返回
          </button>
          <span style={{ fontSize: '14px', color: '#999', fontFamily: 'monospace' }}>
            房间码: {room.roomCode}
          </span>
        </div>
        <div style={{ fontSize: '14px', color: '#666' }}>
          欢迎, <span style={{ fontWeight: 500, color: '#333' }}>{nickname}</span>
        </div>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
        <h2 style={{ color: '#1E88E5', fontSize: '22px', marginBottom: '8px' }}>{room.topic}</h2>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: '#1976D2', fontSize: '14px' }}>● {room.sides.pro}</span>
          <span style={{ color: '#999' }}>VS</span>
          <span style={{ color: '#D32F2F', fontSize: '14px' }}>● {room.sides.con}</span>
          <span style={{ marginLeft: 'auto', fontSize: '13px', color: '#999' }}>
            发言时限: {room.timeLimit}秒
          </span>
        </div>
      </div>

      {room.status === 'waiting' && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ backgroundColor: '#FFF3E0', padding: '16px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ color: '#E65100', fontSize: '14px', fontWeight: 500 }}>
                房间状态: 等待中
              </div>
              {!canStart && (
                <div style={{ fontSize: '13px', color: '#9E9E9E', marginTop: '4px' }}>
                  等待更多辩手加入
                </div>
              )}
            </div>
            {isOwner && (
              <button
                onClick={handleStartDebate}
                disabled={!canStart}
                style={{
                  padding: '10px 24px',
                  backgroundColor: canStart ? '#4CAF50' : '#BDBDBD',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: canStart ? 'pointer' : 'not-allowed',
                  transition: 'background-color 0.2s',
                }}
              >
                开始辩论
              </button>
            )}
          </div>
        </div>
      )}

      {room.status === 'debating' && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ backgroundColor: '#E8F5E9', padding: '12px 16px', borderRadius: '8px' }}>
            <span style={{ color: '#2E7D32', fontSize: '14px', fontWeight: 500 }}>
              房间状态: 辩论中
            </span>
            <span style={{ marginLeft: '16px', fontSize: '13px', color: '#666' }}>
              第 {room.currentRound} 轮 / 共 {room.totalRounds} 轮
            </span>
          </div>
        </div>
      )}

      <div style={{ flex: 1 }}>
        <DebatePanel room={room} memberId={memberId} onSpeechAdded={() => {}} />
      </div>
    </div>
  );
};

export default RoomView;
