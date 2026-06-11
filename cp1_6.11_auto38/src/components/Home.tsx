import { useState } from 'react';
import { User } from '../../shared/types';
import * as api from '../utils/api';
import '../styles/Home.css';

interface Props {
  user: User;
  onCreateRoom: (code: string) => void;
  onJoinRoom: (code: string) => void;
}

export default function Home({ user, onCreateRoom, onJoinRoom }: Props) {
  const [joinCode, setJoinCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const handleCreate = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const { code } = await api.createRoom();
      onCreateRoom(code);
    } catch (err: any) {
      showToast(err.message || '创建失败');
      setCreating(false);
    }
  };

  const handleJoin = async () => {
    if (joining) return;
    const code = joinCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code)) {
      showToast('请输入有效的6位房间码');
      return;
    }
    setJoining(true);
    try {
      await api.getRoom(code);
      onJoinRoom(code);
    } catch (err: any) {
      showToast(err.message || '房间不存在');
      setJoining(false);
    }
  };

  return (
    <div className="home-wrapper">
      <div className="home-bg"></div>
      <div className="home-content">
        <div className="hero-section">
          <div className="hero-badge">✨ 团队协作工具</div>
          <h1 className="hero-title">
            团队<span className="accent">脑暴</span>投票平台
          </h1>
          <p className="hero-desc">
            匿名提交想法 · 实时投票排序 · 一键导出报告
          </p>
          <div className="user-card">
            <span className="user-avatar-lg">{user.avatar}</span>
            <div>
              <div className="user-label">你的匿名身份</div>
              <div className="user-name-lg">{user.nickname}</div>
            </div>
          </div>
        </div>

        <div className="action-card">
          <div className="action-block create-block">
            <div className="action-icon">🚀</div>
            <h2>创建新房间</h2>
            <p>生成专属房间码，分享给团队成员开启脑暴</p>
            <button
              className={`btn-primary ${creating ? 'loading' : ''}`}
              onClick={handleCreate}
              disabled={creating}
            >
              {creating ? '创建中...' : '创建房间'}
            </button>
          </div>

          <div className="divider-line">
            <span>或</span>
          </div>

          <div className="action-block join-block">
            <div className="action-icon">🔗</div>
            <h2>加入已有房间</h2>
            <p>输入成员分享的6位房间码</p>
            <div className="join-input-wrap">
              <input
                type="text"
                className="join-input"
                placeholder="请输入房间码（如：AB3X7K）"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                onKeyDown={e => { if (e.key === 'Enter') handleJoin(); }}
                maxLength={6}
              />
              <button
                className={`btn-secondary ${joining ? 'loading' : ''}`}
                onClick={handleJoin}
                disabled={joining || joinCode.length !== 6}
              >
                {joining ? '进入中...' : '加入'}
              </button>
            </div>
          </div>
        </div>

        <div className="features">
          <div className="feature-item">
            <span className="feature-emoji">🎭</span>
            <span>完全匿名</span>
          </div>
          <div className="feature-item">
            <span className="feature-emoji">⚡</span>
            <span>实时同步</span>
          </div>
          <div className="feature-item">
            <span className="feature-emoji">📊</span>
            <span>可视化统计</span>
          </div>
          <div className="feature-item">
            <span className="feature-emoji">📥</span>
            <span>一键导出</span>
          </div>
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
