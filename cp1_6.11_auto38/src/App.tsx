import { useState, useEffect } from 'react';
import RoomView from './components/RoomView';
import { User } from '../shared/types';
import * as api from './utils/api';
import './styles/Home.css';

const USER_KEY = 'brainstorm_user_v1';
const parseRoute = (): { name: string; code?: string } => {
  const hash = window.location.hash.replace(/^#\/?/, '');
  const match = hash.match(/^room\/([A-Z0-9]{6})$/);
  if (match) return { name: 'room', code: match[1] };
  return { name: 'home' };
};

export default function App() {
  const [route, setRoute] = useState(parseRoute());
  const [user, setUser] = useState<User | null>(null);
  const [inputCode, setInputCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    const onHashChange = () => {
      setRoute(parseRoute());
      setErr('');
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(USER_KEY);
    if (saved) {
      try { setUser(JSON.parse(saved)); return; } catch {}
    }
    api.generateUser().then(u => {
      setUser(u);
      localStorage.setItem(USER_KEY, JSON.stringify(u));
    });
  }, []);

  const gotoRoom = (code: string) => {
    window.location.hash = `/room/${code}`;
  };

  const handleCreate = async () => {
    setLoading(true); setErr('');
    try {
      const { code } = await api.createRoom();
      gotoRoom(code);
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  };

  const handleJoin = () => {
    const code = inputCode.trim().toUpperCase();
    if (code.length !== 6) { setErr('请输入6位房间码'); return; }
    setErr('');
    gotoRoom(code);
  };

  if (route.name === 'room' && user) {
    return <RoomView roomCode={route.code!} user={user} onBack={() => { window.location.hash = ''; }} />;
  }

  return (
    <div className="home">
      <div className="home-bg" />
      <div className="home-content">
        <div className="brand">
          <div className="brand-logo">💡</div>
          <h1>团队脑暴投票平台</h1>
          <p className="slogan">匿名协作 · 实时投票 · 高效决策</p>
        </div>

        <div className="action-card">
          <div className="action-section">
            <button className="primary-btn" onClick={handleCreate} disabled={loading}>
              {loading ? '创建中...' : '＋ 创建脑暴房间'}
            </button>
            <p className="tip">生成唯一房间码，分享给团队成员</p>
          </div>

          <div className="divider"><span>或</span></div>

          <div className="action-section">
            <div className="join-row">
              <input
                type="text"
                className="code-input"
                placeholder="输入6位房间码"
                value={inputCode}
                onChange={e => setInputCode(e.target.value.slice(0, 6).toUpperCase())}
                onKeyDown={e => { if (e.key === 'Enter') handleJoin(); }}
                maxLength={6}
              />
              <button className="secondary-btn" onClick={handleJoin}>加入房间</button>
            </div>
            {err && <p className="err">{err}</p>}
          </div>
        </div>

        {user && (
          <div className="user-preview">
            <span className="up-avatar">{user.avatar}</span>
            <div>
              <div className="up-label">你的匿名身份</div>
              <div className="up-name">{user.nickname}</div>
            </div>
          </div>
        )}

        <footer className="home-footer">
          <div className="feature-list">
            <span>🔒 匿名提交</span>
            <span>⚡ 实时同步</span>
            <span>📊 可视化统计</span>
            <span>📥 导出报告</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
