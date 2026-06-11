import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { useSocket } from '../hooks/useSocket';

function LandingPage() {
  const navigate = useNavigate();
  const connect = useStore((s) => s.connect);
  const socket = useStore((s) => s.socket);
  const { emitCreateRoom } = useSocket();

  const [userName, setUserName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  const handleCreateRoom = async () => {
    const name = userName.trim();
    if (!name) return;
    setCreating(true);
    connect('', name);
    await new Promise<void>((resolve) => {
      const check = () => {
        const s = useStore.getState().socket;
        if (s?.connected) {
          resolve();
        } else {
          s?.once('connect', () => resolve());
          if (!s) setTimeout(check, 50);
        }
      };
      check();
    });
    const newRoomId = await emitCreateRoom();
    navigate(`/room/${newRoomId}`);
  };

  const handleJoinRoom = () => {
    const name = userName.trim();
    const rid = roomId.trim();
    if (!name || !rid) return;
    setJoining(true);
    connect(rid, name);
    navigate(`/room/${rid}`);
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen overflow-hidden">
      <div className="absolute w-72 h-72 bg-purple-500/20 rounded-full -top-20 -left-20 blur-3xl" />
      <div className="absolute w-96 h-96 bg-indigo-500/15 rounded-full -bottom-32 -right-24 blur-3xl" />
      <div className="absolute w-56 h-56 bg-violet-400/10 rounded-full top-1/4 right-1/4 blur-2xl" />
      <div className="absolute w-40 h-40 bg-fuchsia-500/10 rounded-full bottom-1/3 left-1/3 blur-2xl" />
      <div className="absolute w-24 h-24 bg-indigo-300/10 rounded-full top-1/2 left-1/6 blur-xl" />

      <div className="glass-strong relative z-10 w-full max-w-md mx-4 rounded-3xl p-10 flex flex-col items-center gap-6 animate-fade-in">
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-5xl font-display font-bold text-white tracking-tight">
            BrainSync
          </h1>
          <p className="text-lg font-body text-white/60">
            远程团队协作白板
          </p>
        </div>

        <div className="w-full flex flex-col gap-3">
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="你的昵称"
            className="w-full px-5 py-3 rounded-xl bg-white/8 border border-white/12 text-white placeholder-white/40 outline-none focus:border-indigo-400/50 focus:bg-white/12 transition-all duration-150 font-body text-sm"
          />
        </div>

        <button
          onClick={handleCreateRoom}
          disabled={creating || !userName.trim()}
          className="btn-glass w-full py-3.5 rounded-xl bg-gradient-to-r from-[#4F46E5] to-[#A78BFA] text-white font-body font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
        >
          {creating ? '创建中...' : '创建房间'}
        </button>

        <div className="w-full h-px bg-white/10" />

        <div className="w-full flex flex-col gap-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="房间 ID"
              className="flex-1 px-5 py-3 rounded-xl bg-white/8 border border-white/12 text-white placeholder-white/40 outline-none focus:border-indigo-400/50 focus:bg-white/12 transition-all duration-150 font-body text-sm"
            />
            <button
              onClick={handleJoinRoom}
              disabled={joining || !userName.trim() || !roomId.trim()}
              className="btn-glass px-6 py-3 rounded-xl bg-white/10 border border-white/15 text-white font-body font-semibold text-sm hover:bg-white/15 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 whitespace-nowrap"
            >
              {joining ? '加入中...' : '加入房间'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;
