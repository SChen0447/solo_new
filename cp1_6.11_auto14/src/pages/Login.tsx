import axios from 'axios';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, UserPlus, ChefHat } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const url = isLoginMode ? '/api/login' : '/api/register';
      const res = await axios.post(url, { username, password });
      localStorage.setItem('user', JSON.stringify(res.data));
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || (isLoginMode ? '登录失败' : '注册失败'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: '#fafafa',
      padding: '1rem'
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '12px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        padding: '2.5rem',
        width: '100%',
        maxWidth: '400px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <ChefHat size={48} style={{ color: '#e65100', marginBottom: '0.5rem' }} />
          <h1 style={{
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '1.8rem',
            margin: 0,
            color: '#333'
          }}>
            味觉笔记
          </h1>
        </div>

        <div style={{ display: 'flex', marginBottom: '1.5rem', borderBottom: '2px solid #eee' }}>
          <button
            onClick={() => { setIsLoginMode(true); setError(''); }}
            style={{
              flex: 1,
              padding: '0.6rem 0',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: '1rem',
              color: isLoginMode ? '#e65100' : '#999',
              borderBottom: isLoginMode ? '2px solid #e65100' : '2px solid transparent',
              marginBottom: '-2px',
              fontWeight: isLoginMode ? 600 : 400,
              transition: 'all 0.2s'
            }}
          >
            <LogIn size={16} style={{ verticalAlign: 'middle', marginRight: '0.3rem' }} />
            登录
          </button>
          <button
            onClick={() => { setIsLoginMode(false); setError(''); }}
            style={{
              flex: 1,
              padding: '0.6rem 0',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: '1rem',
              color: !isLoginMode ? '#e65100' : '#999',
              borderBottom: !isLoginMode ? '2px solid #e65100' : '2px solid transparent',
              marginBottom: '-2px',
              fontWeight: !isLoginMode ? 600 : 400,
              transition: 'all 0.2s'
            }}
          >
            <UserPlus size={16} style={{ verticalAlign: 'middle', marginRight: '0.3rem' }} />
            注册
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            className="input"
            type="text"
            placeholder="用户名"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            style={{ width: '100%', marginBottom: '1rem', boxSizing: 'border-box' }}
          />
          <input
            className="input"
            type="password"
            placeholder="密码"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{ width: '100%', marginBottom: '0.5rem', boxSizing: 'border-box' }}
          />

          {error && (
            <p style={{ color: '#e53935', fontSize: '0.85rem', margin: '0.5rem 0' }}>{error}</p>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            style={{
              width: '100%',
              marginTop: '1rem',
              opacity: submitting ? 0.7 : 1,
              cursor: submitting ? 'not-allowed' : 'pointer'
            }}
          >
            {isLoginMode ? '登录' : '注册'}
          </button>
        </form>
      </div>
    </div>
  );
}
