import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useStore } from './store';
import { THEME_COLORS, CITIES } from './types';
import BookShelf from './BookShelf';
import SearchPage from './SearchPage';
import axios from 'axios';
import type { User } from './types';

export default function App() {
  const {
    user, setUser, notifications, removeNotification,
    connectWs, disconnectWs, wsConnected,
  } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [showMsgPanel, setShowMsgPanel] = useState(false);
  const { reservations, loadReservations, messages, loadMessages, addMessage } = useStore();
  const [activeResId, setActiveResId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('drifting_user');
    if (saved) {
      try {
        const u: User = JSON.parse(saved);
        setUser(u);
      } catch (e) { /* ignore */ }
    }
  }, [setUser]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('drifting_user', JSON.stringify(user));
      connectWs(user.id);
      loadReservations();
    } else {
      localStorage.removeItem('drifting_user');
      disconnectWs();
    }
    return () => {};
  }, [user, connectWs, disconnectWs, loadReservations]);

  if (!user) return <LoginPage />;

  const isBrowse = location.pathname.startsWith('/browse');
  const isShelf = location.pathname.startsWith('/shelf');

  const openChat = (resId: string) => {
    setActiveResId(resId);
    loadMessages(resId);
  };

  const sendChat = async () => {
    if (!activeResId || !chatInput.trim()) return;
    try {
      await axios.post('/api/message', {
        reservationId: activeResId,
        senderId: user.id,
        content: chatInput.trim(),
      });
      setChatInput('');
    } catch (e) { /* ignore */ }
  };

  const activeChatMessages = activeResId ? messages[activeResId] || [] : [];
  const activeReservation = reservations.find(r => r.id === activeResId);

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.brand} onClick={() => navigate('/shelf')}>
          <span style={styles.logo}>📚</span>
          <span style={styles.brandText}>流浪书架</span>
          <span style={styles.tagline}>Drifting Bookshelf</span>
        </div>
        <nav style={styles.nav}>
          <button
            style={{ ...styles.navBtn, ...(isShelf ? styles.navBtnActive : {}) }}
            onClick={() => navigate('/shelf')}
          >
            🏠 我的书架
          </button>
          <button
            style={{ ...styles.navBtn, ...(isBrowse ? styles.navBtnActive : {}) }}
            onClick={() => navigate('/browse')}
          >
            🔍 同城浏览
          </button>
        </nav>
        <div style={styles.headerRight}>
          <span style={styles.wsStatus} title={wsConnected ? 'WebSocket已连接' : '离线'}>
            {wsConnected ? '🟢' : '🔴'}
          </span>
          <div style={styles.cityBadge}>📍 {user.city}</div>
          <div style={styles.userInfo}>
            <div style={styles.avatar}>
              {user.nickname.slice(0, 1)}
            </div>
            <div style={styles.userText}>
              <div style={styles.nickname}>{user.nickname}</div>
              <div style={styles.logout} onClick={() => setUser(null)}>退出登录</div>
            </div>
          </div>
          <button style={styles.msgBtn} onClick={() => setShowMsgPanel(v => !v)}>
            💬 {reservations.filter(r => r.status === 'pending' && r.ownerId === user.id).length > 0 && (
              <span style={styles.badge}>{reservations.filter(r => r.status === 'pending' && r.ownerId === user.id).length}</span>
            )}
          </button>
        </div>
      </header>

      <div style={styles.notifications}>
        {notifications.map((m, i) => (
          <div key={i} style={styles.notificationItem} onClick={() => removeNotification(i)}>
            {m}
          </div>
        ))}
      </div>

      <main style={styles.main}>
        <Routes>
          <Route path="/" element={<Navigate to="/shelf" replace />} />
          <Route path="/shelf" element={<BookShelf />} />
          <Route path="/browse" element={<SearchPage />} />
          <Route path="*" element={<Navigate to="/shelf" replace />} />
        </Routes>
      </main>

      {showMsgPanel && (
        <div style={styles.msgPanel}>
          <div style={styles.msgPanelHeader}>
            <span>📬 预约消息</span>
            <button style={styles.closeBtn} onClick={() => setShowMsgPanel(false)}>✕</button>
          </div>
          <div style={styles.msgPanelBody}>
            {activeResId ? (
              <>
                <div style={styles.backBtn} onClick={() => setActiveResId(null)}>← 返回列表</div>
                <div style={styles.chatHeader}>
                  <div style={{ fontWeight: 600 }}>
                    《{activeReservation?.book?.title}》
                  </div>
                  <div style={{ fontSize: 12, color: '#8d6e63' }}>
                    {activeReservation?.status === 'pending' ? '⏳ 待确认' :
                     activeReservation?.status === 'confirmed' ? '✅ 已确认' :
                     activeReservation?.status === 'completed' ? '🎉 已完成' : '❌ 已拒绝'}
                  </div>
                </div>
                <div style={styles.chatMessages}>
                  {activeChatMessages.length === 0 && (
                    <div style={styles.emptyMsg}>还没有消息，快打个招呼吧～</div>
                  )}
                  {activeChatMessages.map(msg => (
                    <div
                      key={msg.id}
                      style={{
                        ...styles.chatBubble,
                        ...(msg.senderId === user.id ? styles.chatBubbleRight : styles.chatBubbleLeft),
                      }}
                    >
                      {msg.content}
                    </div>
                  ))}
                </div>
                <div style={styles.chatInputRow}>
                  <input
                    style={styles.chatInput}
                    placeholder="输入消息..."
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendChat()}
                  />
                  <button style={styles.sendBtn} onClick={sendChat}>发送</button>
                </div>
              </>
            ) : (
              <div style={styles.resList}>
                {reservations.length === 0 && (
                  <div style={styles.emptyMsg}>暂无预约记录～</div>
                )}
                {reservations.map(r => (
                  <div key={r.id} style={styles.resItem} onClick={() => openChat(r.id)}>
                    <img src={r.book?.cover} alt="" style={styles.resCover} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={styles.resTitle}>《{r.book?.title}》</div>
                      <div style={styles.resSub}>
                        {r.ownerId === user.id ? `来自 ${r.requesterNickname}` : `发给 ${r.ownerNickname}`}
                        <span style={{ marginLeft: 8, color: r.status === 'pending' ? '#f57c00' : r.status === 'confirmed' ? '#388e3c' : '#757575' }}>
                          {r.status === 'pending' ? '待确认' :
                           r.status === 'confirmed' ? '已确认' :
                           r.status === 'completed' ? '已完成' : '已拒绝'}
                        </span>
                      </div>
                      <div style={styles.resMsg}>"{r.message}"</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{globalStyles}</style>
    </div>
  );
}

function LoginPage() {
  const [nickname, setNickname] = useState('');
  const [city, setCity] = useState('北京');
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const { setUser } = useStore();

  const tryLocate = () => {
    setLocating(true);
    if (!navigator.geolocation) {
      setTimeout(() => setLocating(false), 300);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => setTimeout(() => setLocating(false), 500),
      () => setTimeout(() => setLocating(false), 500),
      { timeout: 3000 },
    );
  };

  const submit = async () => {
    if (!nickname.trim()) return;
    setLoading(true);
    try {
      const { data } = await axios.post('/api/user/login', { nickname: nickname.trim(), city });
      setUser(data);
    } catch (e) {
      alert('登录失败，请重试');
    }
    setLoading(false);
  };

  return (
    <div style={styles.loginWrap}>
      <div style={styles.loginDecor}>
        {Array.from({ length: 30 }).map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: 6 + Math.random() * 10,
            height: 6 + Math.random() * 10,
            left: `${Math.random() * 100}%`,
            top: `${-Math.random() * 30}%`,
            background: THEME_COLORS[i % THEME_COLORS.length].color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            transform: `rotate(${Math.random() * 360}deg)`,
            animation: `confetti-fall ${6 + Math.random() * 8}s linear ${Math.random() * 6}s infinite`,
            opacity: 0.7,
          }} />
        ))}
      </div>
      <div style={styles.loginCard}>
        <div style={styles.loginLogo}>📚</div>
        <h1 style={styles.loginTitle}>流浪书架</h1>
        <div style={styles.loginSub}>让闲置书籍在城市中自由漂流</div>

        <div style={styles.loginForm}>
          <label style={styles.label}>取个昵称</label>
          <input
            style={styles.input}
            placeholder="你希望大家怎么称呼你？"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            maxLength={12}
          />

          <div style={styles.row}>
            <label style={styles.label}>所在城市</label>
            <button style={styles.locateBtn} onClick={tryLocate}>
              {locating ? '📍 定位中...' : '📍 自动定位'}
            </button>
          </div>
          <div style={styles.cityChips}>
            {CITIES.map(c => (
              <button
                key={c}
                style={{ ...styles.cityChip, ...(city === c ? styles.cityChipActive : {}) }}
                onClick={() => setCity(c)}
              >
                {c}
              </button>
            ))}
          </div>

          <button
            style={{ ...styles.loginBtn, opacity: nickname.trim() ? 1 : 0.5 }}
            disabled={!nickname.trim() || loading}
            onClick={submit}
          >
            {loading ? '登录中...' : '进入书架'}
          </button>
        </div>
      </div>
      <style>{globalStyles}</style>
    </div>
  );
}

const globalStyles = `
  @keyframes confetti-fall {
    0% { transform: translateY(0) rotate(0deg); opacity: 0; }
    10% { opacity: 0.8; }
    90% { opacity: 0.6; }
    100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes slideInRight {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }
  * { box-sizing: border-box; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(141, 110, 99, 0.3); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(141, 110, 99, 0.5); }
`;

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    background: '#f5f0e8',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 28px',
    background: 'linear-gradient(180deg, #f5f0e8 0%, #ede3d3 100%)',
    borderBottom: '1px solid rgba(141, 110, 99, 0.2)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 1px 8px rgba(62, 39, 35, 0.06)',
  },
  brand: {
    display: 'flex',
    alignItems: 'baseline',
    cursor: 'pointer',
    userSelect: 'none',
  },
  logo: { fontSize: 28, marginRight: 10 },
  brandText: {
    fontSize: 22,
    fontWeight: 700,
    color: '#5d4037',
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 11,
    color: '#8d6e63',
    marginLeft: 10,
    letterSpacing: 2,
    fontStyle: 'italic',
  },
  nav: {
    display: 'flex',
    gap: 6,
    marginLeft: 36,
    flex: 1,
  },
  navBtn: {
    padding: '8px 18px',
    border: 'none',
    background: 'transparent',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
    color: '#5d4037',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
  },
  navBtnActive: {
    background: 'rgba(141, 110, 99, 0.15)',
    color: '#4e342e',
    fontWeight: 600,
    boxShadow: 'inset 0 -2px 0 #8d6e63',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  wsStatus: { fontSize: 16 },
  cityBadge: {
    fontSize: 13,
    padding: '4px 12px',
    background: 'rgba(66, 165, 245, 0.12)',
    color: '#1565c0',
    borderRadius: 12,
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #d4a373, #8d6e63)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 16,
    boxShadow: '0 2px 8px rgba(141, 110, 99, 0.3)',
  },
  userText: { lineHeight: 1.2 },
  nickname: {
    fontSize: 14,
    fontWeight: 600,
    color: '#3e2723',
  },
  logout: {
    fontSize: 11,
    color: '#8d6e63',
    cursor: 'pointer',
    marginTop: 2,
  },
  msgBtn: {
    position: 'relative',
    width: 40,
    height: 40,
    borderRadius: 8,
    border: '1px solid rgba(141, 110, 99, 0.3)',
    background: '#fff',
    cursor: 'pointer',
    fontSize: 18,
    transition: 'all 0.2s ease',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    background: '#e53935',
    color: '#fff',
    fontSize: 10,
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: 10,
    minWidth: 18,
    textAlign: 'center',
  },
  main: {
    flex: 1,
    padding: '28px',
    maxWidth: 1600,
    width: '100%',
    margin: '0 auto',
  },
  notifications: {
    position: 'fixed',
    top: 76,
    right: 24,
    zIndex: 200,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  notificationItem: {
    background: '#fff',
    padding: '12px 20px',
    borderRadius: 8,
    boxShadow: '0 4px 20px rgba(62, 39, 35, 0.15)',
    borderLeft: '4px solid #d4a373',
    fontSize: 14,
    cursor: 'pointer',
    animation: 'slideInRight 0.3s ease',
    maxWidth: 300,
  },
  msgPanel: {
    position: 'fixed',
    bottom: 24,
    right: 24,
    width: 380,
    height: 500,
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 8px 40px rgba(62, 39, 35, 0.2)',
    zIndex: 150,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    animation: 'fadeIn 0.3s ease',
  },
  msgPanelHeader: {
    padding: '14px 18px',
    background: 'linear-gradient(135deg, #8d6e63, #5d4037)',
    color: '#fff',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontWeight: 600,
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 16,
  },
  msgPanelBody: {
    flex: 1,
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
  },
  backBtn: {
    padding: '10px 16px',
    fontSize: 13,
    color: '#8d6e63',
    cursor: 'pointer',
    borderBottom: '1px solid #f5f0e8',
  },
  chatHeader: {
    padding: '12px 16px',
    borderBottom: '1px solid #f5f0e8',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatMessages: {
    flex: 1,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    overflow: 'auto',
    background: '#faf8f4',
  },
  chatBubble: {
    maxWidth: '75%',
    padding: '10px 14px',
    borderRadius: 12,
    fontSize: 14,
    lineHeight: 1.5,
    wordBreak: 'break-word',
  },
  chatBubbleLeft: {
    alignSelf: 'flex-start',
    background: '#fff',
    borderTopLeftRadius: 4,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  chatBubbleRight: {
    alignSelf: 'flex-end',
    background: 'linear-gradient(135deg, #d4a373, #8d6e63)',
    color: '#fff',
    borderTopRightRadius: 4,
  },
  chatInputRow: {
    display: 'flex',
    padding: 10,
    borderTop: '1px solid #f5f0e8',
    gap: 8,
  },
  chatInput: {
    flex: 1,
    padding: '10px 14px',
    border: '1px solid rgba(141, 110, 99, 0.3)',
    borderRadius: 8,
    fontFamily: 'inherit',
    fontSize: 14,
    outline: 'none',
  },
  sendBtn: {
    padding: '10px 18px',
    border: 'none',
    borderRadius: 8,
    background: '#8d6e63',
    color: '#fff',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontWeight: 600,
    transition: 'all 0.2s ease',
  },
  resList: {
    padding: 8,
  },
  resItem: {
    display: 'flex',
    gap: 12,
    padding: 12,
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  resCover: {
    width: 40,
    height: 56,
    objectFit: 'cover',
    borderRadius: 4,
    flexShrink: 0,
  },
  resTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#3e2723',
    marginBottom: 4,
  },
  resSub: {
    fontSize: 12,
    color: '#6d4c41',
    marginBottom: 4,
  },
  resMsg: {
    fontSize: 12,
    color: '#8d6e63',
    fontStyle: 'italic',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  emptyMsg: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#8d6e63',
    fontSize: 13,
    padding: 40,
    textAlign: 'center',
  },
  loginWrap: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  loginDecor: {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  loginCard: {
    width: 420,
    background: '#fff',
    borderRadius: 16,
    boxShadow: '0 20px 60px rgba(62, 39, 35, 0.15)',
    padding: 40,
    position: 'relative',
    zIndex: 1,
    animation: 'fadeIn 0.6s ease',
  },
  loginLogo: {
    fontSize: 56,
    textAlign: 'center',
    marginBottom: 10,
  },
  loginTitle: {
    textAlign: 'center',
    margin: 0,
    fontSize: 32,
    color: '#5d4037',
    letterSpacing: 4,
  },
  loginSub: {
    textAlign: 'center',
    color: '#8d6e63',
    marginTop: 8,
    marginBottom: 32,
    fontSize: 14,
  },
  loginForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: '#5d4037',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid rgba(141, 110, 99, 0.3)',
    borderRadius: 8,
    fontSize: 15,
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'all 0.2s ease',
    background: '#faf8f4',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  locateBtn: {
    padding: '6px 12px',
    border: '1px dashed rgba(66, 165, 245, 0.5)',
    background: 'rgba(66, 165, 245, 0.08)',
    color: '#1565c0',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 12,
    fontFamily: 'inherit',
  },
  cityChips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  cityChip: {
    padding: '6px 14px',
    border: '1px solid rgba(141, 110, 99, 0.25)',
    background: '#fff',
    borderRadius: 16,
    cursor: 'pointer',
    fontSize: 13,
    color: '#5d4037',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
  },
  cityChipActive: {
    background: '#8d6e63',
    borderColor: '#8d6e63',
    color: '#fff',
  },
  loginBtn: {
    marginTop: 16,
    padding: '14px 24px',
    background: 'linear-gradient(135deg, #d4a373, #8d6e63)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    letterSpacing: 2,
    boxShadow: '0 4px 16px rgba(141, 110, 99, 0.3)',
    transition: 'all 0.2s ease',
  },
};
