import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAvatarStore } from '../store/avatarStore';
import { login } from '../api/avatarApi';

export function LoginPage() {
  const navigate = useNavigate();
  const { setUser, setToken } = useAvatarStore();
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) {
      setError('请输入昵称');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await login(nickname.trim(), password);
      setToken(result.token);
      setUser(result.user);
      navigate('/');
    } catch {
      setError('登录失败，请重试');
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>🎭</div>
        <h1 style={styles.title}>Avatar Studio</h1>
        <p style={styles.subtitle}>虚拟形象定制社区</p>
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>昵称</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="输入你的昵称"
              style={styles.input}
              autoFocus
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="输入任意密码"
              style={styles.input}
            />
          </div>
          {error && <div style={styles.error}>{error}</div>}
          <button type="submit" disabled={loading} style={styles.submitBtn}>
            {loading ? '登录中...' : '登 录'}
          </button>
        </form>
        <p style={styles.hint}>输入任意昵称和密码即可注册/登录</p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(ellipse at center, #667eea 0%, #764ba2 100%)',
  },
  card: {
    width: 400,
    background: 'white',
    borderRadius: 16,
    padding: '40px 36px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
    textAlign: 'center',
  },
  logo: {
    fontSize: 56,
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: 700,
    color: '#1a1a2e',
    margin: 0,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 28,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  field: {
    textAlign: 'left',
  },
  label: {
    fontSize: 13,
    color: '#555',
    fontWeight: 500,
    marginBottom: 6,
    display: 'block',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #ddd',
    borderRadius: 8,
    fontSize: 14,
    color: '#333',
    outline: 'none',
    transition: 'border 0.2s',
    boxSizing: 'border-box',
  },
  error: {
    color: '#e74c3c',
    fontSize: 13,
    textAlign: 'left',
  },
  submitBtn: {
    width: '100%',
    padding: '12px',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    border: 'none',
    borderRadius: 8,
    color: 'white',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  hint: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 16,
  },
};
