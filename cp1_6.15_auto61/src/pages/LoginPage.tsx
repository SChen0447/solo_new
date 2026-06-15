import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { Mail, Lock, User, Zap } from 'lucide-react';

type Mode = 'login' | 'register';

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuthStore();
  const navigate = useNavigate();

  const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const validatePassword = (v: string) => v.length >= 6;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateEmail(email)) {
      setError('请输入有效的邮箱地址');
      return;
    }
    if (!validatePassword(password)) {
      setError('密码至少需要6个字符');
      return;
    }
    if (mode === 'register' && !nickname.trim()) {
      setError('请输入昵称');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, nickname.trim());
      }
      navigate('/arena');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || '操作失败，请重试';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode((m) => (m === 'login' ? 'register' : 'login'));
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div
        className="absolute inset-0 animate-gradient"
        style={{
          background:
            'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 25%, #16213e 50%, #0f0f23 75%, #1a1a2e 100%)',
          backgroundSize: '400% 400%',
        }}
      />

      <div className="glass-strong w-full max-w-md p-8 relative z-10">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Zap className="w-8 h-8 text-arena-accent" />
            <h1 className="font-display text-4xl font-bold text-arena-accent tracking-wider">
              CODEARENA
            </h1>
          </div>
          <p className="text-arena-muted text-sm">
            {mode === 'login' ? '登录进入竞技场' : '注册成为战士'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-arena-danger/10 border border-arena-danger/30 text-arena-danger text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-arena-muted" />
            <input
              type="email"
              placeholder="邮箱"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-arena-bg/80 border border-arena-border rounded-lg text-white placeholder-arena-muted focus:outline-none focus:border-arena-accent transition-colors"
            />
          </div>

          {mode === 'register' && (
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-arena-muted" />
              <input
                type="text"
                placeholder="昵称"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-arena-bg/80 border border-arena-border rounded-lg text-white placeholder-arena-muted focus:outline-none focus:border-arena-accent transition-colors"
              />
            </div>
          )}

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-arena-muted" />
            <input
              type="password"
              placeholder="密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-arena-bg/80 border border-arena-border rounded-lg text-white placeholder-arena-muted focus:outline-none focus:border-arena-accent transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg font-semibold text-arena-bg bg-gradient-to-r from-arena-accent to-cyan-400 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? '处理中...' : mode === 'login' ? '登录' : '注册'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-arena-muted">
            {mode === 'login' ? '还没有账号？' : '已有账号？'}
          </span>
          <button
            onClick={toggleMode}
            className="ml-1 text-arena-accent hover:underline"
          >
            {mode === 'login' ? '立即注册' : '立即登录'}
          </button>
        </div>
      </div>
    </div>
  );
}
