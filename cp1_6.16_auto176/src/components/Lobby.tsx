import { useState, useEffect } from 'react';
import { createRoom, joinRoom, fetchRooms } from '../api';
import type { Room, RoomListItem } from '../types';

interface LobbyProps {
  onRoomJoined: (room: Room, playerId: string) => void;
  currentRoom: Room | null;
  playerId: string | null;
}

export default function Lobby({ onRoomJoined, currentRoom, playerId }: LobbyProps) {
  const [rooms, setRooms] = useState<RoomListItem[]>([]);
  const [createForm, setCreateForm] = useState({
    roomName: '',
    nickname: '',
    questionCount: 10,
    timeLimit: 15
  });
  const [joinForm, setJoinForm] = useState({
    roomCode: '',
    nickname: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');

  useEffect(() => {
    loadRooms();
    const interval = setInterval(loadRooms, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadRooms = async () => {
    try {
      const data = await fetchRooms();
      setRooms(data);
    } catch (e) {
      // Silent fail
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await createRoom(createForm);
      onRoomJoined(response.room, response.playerId);
    } catch (e: any) {
      setError(e.response?.data?.error || '创建房间失败');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await joinRoom(joinForm);
      onRoomJoined(response.room, response.playerId);
    } catch (e: any) {
      setError(e.response?.data?.error || '加入房间失败');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickJoin = (room: RoomListItem) => {
    if (room.status !== 'waiting') {
      setError('该房间游戏已开始');
      return;
    }
    setJoinForm(prev => ({ ...prev, roomCode: room.code }));
    setActiveTab('join');
  };

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-6xl mx-auto">
      <header className="text-center mb-12 pt-8">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-[#1E88E5] to-[#64B5F6] bg-clip-text text-transparent">
          知识抢答竞赛
        </h1>
        <p className="text-gray-400 text-lg">创建或加入房间，与好友一决高下！</p>
      </header>

      {error && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-300 text-center">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-[#212121]/80 backdrop-blur rounded-2xl p-6 shadow-xl">
          <div className="flex mb-6 bg-[#121212] rounded-xl p-1">
            <button
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                activeTab === 'create'
                  ? 'bg-[#1E88E5] text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
              onClick={() => setActiveTab('create')}
            >
              创建房间
            </button>
            <button
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                activeTab === 'join'
                  ? 'bg-[#1E88E5] text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
              onClick={() => setActiveTab('join')}
            >
              加入房间
            </button>
          </div>

          {activeTab === 'create' ? (
            <form onSubmit={handleCreateRoom} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">房间名称</label>
                <input
                  type="text"
                  value={createForm.roomName}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, roomName: e.target.value }))}
                  className="w-full px-4 py-3 bg-[#121212] border border-gray-700 rounded-xl focus:border-[#1E88E5] focus:ring-2 focus:ring-[#1E88E5]/30 outline-none transition-all text-white placeholder-gray-500"
                  placeholder="请输入房间名称"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">你的昵称</label>
                <input
                  type="text"
                  value={createForm.nickname}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, nickname: e.target.value }))}
                  className="w-full px-4 py-3 bg-[#121212] border border-gray-700 rounded-xl focus:border-[#1E88E5] focus:ring-2 focus:ring-[#1E88E5]/30 outline-none transition-all text-white placeholder-gray-500"
                  placeholder="请输入你的昵称"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  题目数量：{createForm.questionCount} 题
                </label>
                <input
                  type="range"
                  min="5"
                  max="15"
                  value={createForm.questionCount}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, questionCount: parseInt(e.target.value) }))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#1E88E5]"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>5题</span>
                  <span>15题</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  答题时限：{createForm.timeLimit} 秒
                </label>
                <input
                  type="range"
                  min="10"
                  max="30"
                  step="5"
                  value={createForm.timeLimit}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, timeLimit: parseInt(e.target.value) }))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#1E88E5]"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>10秒</span>
                  <span>30秒</span>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-[#1E88E5] to-[#1565C0] hover:from-[#1976D2] hover:to-[#0D47A1] text-white font-bold rounded-xl shadow-lg hover:shadow-[#1E88E5]/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02]"
              >
                {loading ? '创建中...' : '创建房间'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoinRoom} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">房间码</label>
                <input
                  type="text"
                  value={joinForm.roomCode}
                  onChange={(e) => setJoinForm(prev => ({ ...prev, roomCode: e.target.value.toUpperCase() }))}
                  className="w-full px-4 py-3 bg-[#121212] border border-gray-700 rounded-xl focus:border-[#1E88E5] focus:ring-2 focus:ring-[#1E88E5]/30 outline-none transition-all text-white placeholder-gray-500 uppercase tracking-widest text-center text-2xl font-mono"
                  placeholder="XXXXXX"
                  maxLength={6}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">你的昵称</label>
                <input
                  type="text"
                  value={joinForm.nickname}
                  onChange={(e) => setJoinForm(prev => ({ ...prev, nickname: e.target.value }))}
                  className="w-full px-4 py-3 bg-[#121212] border border-gray-700 rounded-xl focus:border-[#1E88E5] focus:ring-2 focus:ring-[#1E88E5]/30 outline-none transition-all text-white placeholder-gray-500"
                  placeholder="请输入你的昵称"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-[#1E88E5] to-[#1565C0] hover:from-[#1976D2] hover:to-[#0D47A1] text-white font-bold rounded-xl shadow-lg hover:shadow-[#1E88E5]/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02]"
              >
                {loading ? '加入中...' : '加入房间'}
              </button>
            </form>
          )}
        </div>

        <div className="bg-[#212121]/80 backdrop-blur rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <span className="text-2xl">🏠</span> 房间列表
          </h2>
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {rooms.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-5xl mb-4">🎮</div>
                <p>暂无房间，创建一个吧！</p>
              </div>
            ) : (
              rooms.map(room => (
                <div
                  key={room.code}
                  onClick={() => handleQuickJoin(room)}
                  className="p-4 bg-[#121212]/50 rounded-xl border border-gray-700/50 hover:border-[#1E88E5]/50 hover:shadow-lg hover:shadow-[#1E88E5]/10 transition-all duration-200 cursor-pointer group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg group-hover:text-[#1E88E5] transition-colors">
                      {room.name}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      room.status === 'waiting'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {room.status === 'waiting' ? '等待中' : '进行中'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-400">
                    <div className="flex items-center gap-4">
                      <span>👥 {room.playerCount} 人</span>
                      <span>🏆 {room.creatorNickname}</span>
                    </div>
                    <span className="font-mono text-[#1E88E5] tracking-wider">
                      {room.code}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <footer className="mt-12 text-center text-gray-500 text-sm">
        <p>知识抢答竞赛 - 考验你的知识储备与反应速度</p>
      </footer>
    </div>
  );
}
