import { useState, useEffect } from 'react';
import axios from 'axios';
import { Room } from '../types';
import RoomCard from './RoomCard';
import CreateRoomForm from './CreateRoomForm';

const RoomList = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinNickname, setJoinNickname] = useState('');
  const [joinError, setJoinError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 2000);
    return () => clearInterval(interval);
  }, []);

  const fetchRooms = async () => {
    try {
      const response = await axios.get('/api/rooms');
      setRooms(response.data);
    } catch {
      console.error('Failed to fetch rooms');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError('');

    if (!joinNickname.trim()) {
      setJoinError('请输入昵称');
      return;
    }
    if (!joinCode.trim()) {
      setJoinError('请输入房间码');
      return;
    }

    try {
      const response = await axios.post(`/api/rooms/${joinCode.toUpperCase()}/join`, {
        nickname: joinNickname.trim(),
      });

      const { memberId } = response.data;
      localStorage.setItem(`member_${joinCode.toUpperCase()}`, memberId);
      localStorage.setItem(`nickname_${joinCode.toUpperCase()}`, joinNickname.trim());

      window.location.href = `/room/${joinCode.toUpperCase()}`;
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response) {
        setJoinError(err.response.data.error || '加入失败');
      } else {
        setJoinError('加入失败');
      }
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '36px', color: '#1E88E5', marginBottom: '8px', fontWeight: 700 }}>
          云辩台
        </h1>
        <p style={{ color: '#666', fontSize: '16px' }}>在线分组辩论对抗赛平台</p>
      </div>

      <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          style={{
            padding: '12px 28px',
            backgroundColor: '#1E88E5',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#1976D2';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#1E88E5';
          }}
        >
          {showCreateForm ? '取消创建' : '+ 创建辩论房间'}
        </button>

        <form onSubmit={handleJoin} style={{ display: 'flex', gap: '10px', flex: 1, minWidth: '300px' }}>
          <input
            type="text"
            value={joinNickname}
            onChange={(e) => setJoinNickname(e.target.value)}
            placeholder="您的昵称"
            style={{
              flex: 1,
              padding: '10px 12px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '14px',
              minWidth: '120px',
            }}
          />
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="房间码"
            maxLength={6}
            style={{
              width: '120px',
              padding: '10px 12px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '14px',
              fontFamily: 'monospace',
              textTransform: 'uppercase',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '10px 20px',
              backgroundColor: '#4CAF50',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#388E3C';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#4CAF50';
            }}
          >
            加入
          </button>
        </form>
      </div>

      {joinError && (
        <div style={{ color: '#D32F2F', fontSize: '14px', padding: '10px', backgroundColor: '#FFEBEE', borderRadius: '8px', marginBottom: '20px' }}>
          {joinError}
        </div>
      )}

      {showCreateForm && (
        <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '30px' }}>
          <h2 style={{ fontSize: '20px', color: '#333', marginBottom: '20px' }}>创建新辩论房间</h2>
          <CreateRoomForm onSuccess={() => setShowCreateForm(false)} />
        </div>
      )}

      <h2 style={{ fontSize: '20px', color: '#333', marginBottom: '20px' }}>
        辩论房间列表
      </h2>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>加载中...</div>
      ) : rooms.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#999', backgroundColor: '#fff', borderRadius: '8px' }}>
          <p style={{ fontSize: '16px' }}>暂无辩论房间，点击上方按钮创建第一个房间吧！</p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '20px',
          }}
        >
          {rooms.map((room) => (
            <RoomCard key={room.roomCode} room={room} />
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          div[style*="grid-template-columns: repeat(3"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default RoomList;
