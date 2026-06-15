import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Work, Message, CATEGORIES, CreateWorkPayload } from './types';
import { useNavigate } from 'react-router-dom';

const TOKEN_KEY = 'portfolio_admin_token';

const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const [isAuthed, setIsAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState<'works' | 'messages'>('works');

  const [works, setWorks] = useState<Work[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Work['category']>('UI设计');
  const [projectUrl, setProjectUrl] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const authHeader = () => {
    const token = localStorage.getItem(TOKEN_KEY);
    return { Authorization: `Bearer ${token}` };
  };

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      setIsAuthed(true);
      fetchData(token);
    }
  }, []);

  const fetchData = async (token: string) => {
    try {
      const [worksRes, messagesRes] = await Promise.all([
        axios.get<Work[]>('/api/works'),
        axios.get<Message[]>('/api/messages', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      setWorks(worksRes.data);
      setMessages(messagesRes.data);
    } catch (error: any) {
      if (error.response?.status === 401) {
        handleLogout();
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await axios.post('/api/auth/login', { password });
      localStorage.setItem(TOKEN_KEY, res.data.token);
      setIsAuthed(true);
      fetchData(res.data.token);
    } catch (error: any) {
      setLoginError(error.response?.data?.error || '登录失败');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setIsAuthed(false);
    setPassword('');
  };

  const handleCreateWork = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!title.trim() || !imageUrl.trim() || !description.trim()) {
      setFormError('请填写所有必填字段');
      return;
    }
    if (description.length > 300) {
      setFormError('描述不能超过300字');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateWorkPayload = {
        title: title.trim(),
        image_url: imageUrl.trim(),
        description: description.trim(),
        category,
        project_url: projectUrl.trim() || undefined,
      };
      const res = await axios.post<Work>('/api/works', payload, {
        headers: authHeader(),
      });
      setWorks([res.data, ...works]);
      setTitle('');
      setImageUrl('');
      setDescription('');
      setCategory('UI设计');
      setProjectUrl('');
      alert('作品创建成功！');
    } catch (error: any) {
      if (error.response?.status === 401) {
        handleLogout();
      } else {
        setFormError(error.response?.data?.error || '创建失败');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      const res = await axios.put<Message>(
        `/api/messages/${id}/read`,
        {},
        { headers: authHeader() }
      );
      setMessages(
        messages.map((m) => (m.id === id ? res.data : m))
      );
    } catch (error: any) {
      if (error.response?.status === 401) {
        handleLogout();
      }
    }
  };

  const handleDeleteWork = async (id: string) => {
    if (!confirm('确定要删除这个作品吗？')) return;
    try {
      await axios.delete(`/api/works/${id}`, { headers: authHeader() });
      setWorks(works.filter((w) => w.id !== id));
    } catch (error: any) {
      if (error.response?.status === 401) {
        handleLogout();
      } else {
        alert('删除失败');
      }
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isAuthed) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginCard}>
          <h1 style={styles.loginTitle}>管理后台登录</h1>
          <p style={styles.loginSubtitle}>请输入管理员密码访问后台</p>
          <form onSubmit={handleLogin} style={styles.loginForm}>
            <div style={styles.formGroup}>
              <label style={styles.label}>管理员密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                placeholder="请输入密码"
                autoFocus
              />
            </div>
            {loginError && <p style={styles.errorText}>{loginError}</p>}
            <button type="submit" style={styles.loginButton}>
              登录
            </button>
          </form>
          <button
            onClick={() => navigate('/')}
            style={styles.backLink}
          >
            ← 返回首页
          </button>
        </div>
      </div>
    );
  }

  const unreadCount = messages.filter((m) => m.is_read === 0).length;

  return (
    <div style={styles.adminContainer}>
      <header style={styles.adminHeader}>
        <div style={styles.headerLeft}>
          <h1 style={styles.adminTitle}>管理后台</h1>
          <button
            onClick={() => navigate('/')}
            style={styles.viewSiteLink}
          >
            查看网站
          </button>
        </div>
        <button onClick={handleLogout} style={styles.logoutButton}>
          退出登录
        </button>
      </header>

      <div style={styles.tabBar}>
        <button
          style={{
            ...styles.tabButton,
            ...(activeTab === 'works' ? styles.tabButtonActive : {}),
          }}
          onClick={() => setActiveTab('works')}
        >
          作品管理
          <span style={styles.tabCount}>{works.length}</span>
        </button>
        <button
          style={{
            ...styles.tabButton,
            ...(activeTab === 'messages' ? styles.tabButtonActive : {}),
          }}
          onClick={() => setActiveTab('messages')}
        >
          消息管理
          {unreadCount > 0 && (
            <span style={styles.unreadBadge}>{unreadCount}</span>
          )}
        </button>
      </div>

      <main style={styles.adminContent}>
        {activeTab === 'works' ? (
          <div style={styles.worksSection}>
            <div style={styles.formCard}>
              <h2 style={styles.sectionTitle}>上传新作品</h2>
              <form onSubmit={handleCreateWork} style={styles.createForm}>
                <div style={styles.formRow}>
                  <div style={{ ...styles.formGroup, flex: 2 }}>
                    <label style={styles.label}>
                      作品标题 <span style={styles.required}>*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      style={styles.input}
                      placeholder="输入作品标题"
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      分类 <span style={styles.required}>*</span>
                    </label>
                    <select
                      value={category}
                      onChange={(e) =>
                        setCategory(e.target.value as Work['category'])
                      }
                      style={styles.input}
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    封面图片URL <span style={styles.required}>*</span>
                  </label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    style={styles.input}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    项目链接（可选）
                  </label>
                  <input
                    type="url"
                    value={projectUrl}
                    onChange={(e) => setProjectUrl(e.target.value)}
                    style={styles.input}
                    placeholder="https://example.com/project"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    描述 <span style={styles.required}>*</span>
                    <span style={styles.charCountHint}>
                      ({description.length}/300)
                    </span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    style={styles.textarea}
                    rows={5}
                    maxLength={300}
                    placeholder="描述作品内容（最多300字）"
                  />
                </div>

                {formError && <p style={styles.errorText}>{formError}</p>}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    ...styles.submitButton,
                    opacity: isSubmitting ? 0.7 : 1,
                  }}
                >
                  {isSubmitting ? '提交中...' : '上传作品'}
                </button>
              </form>
            </div>

            <div style={styles.worksList}>
              <h2 style={styles.sectionTitle}>已有作品 ({works.length})</h2>
              {works.length === 0 ? (
                <p style={styles.emptyText}>暂无作品</p>
              ) : (
                <div style={styles.worksTable}>
                  {works.map((work) => (
                    <div key={work.id} style={styles.workRow}>
                      <img
                        src={work.image_url}
                        alt={work.title}
                        style={styles.workThumb}
                      />
                      <div style={styles.workInfo}>
                        <h4 style={styles.workTitle}>{work.title}</h4>
                        <p style={styles.workMeta}>
                          <span style={styles.workCategory}>
                            {work.category}
                          </span>
                          {work.created_at && (
                            <span style={styles.workDate}>
                              创建于 {formatDate(work.created_at)}
                            </span>
                          )}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteWork(work.id)}
                        style={styles.deleteButton}
                      >
                        删除
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={styles.messagesSection}>
            <h2 style={styles.sectionTitle}>
              来访消息 ({messages.length})
            </h2>
            {messages.length === 0 ? (
              <p style={styles.emptyText}>暂无消息</p>
            ) : (
              <div style={styles.messagesTable}>
                <div style={styles.messageHeaderRow}>
                  <span style={{ ...styles.messageCell, flex: 1.2 }}>姓名</span>
                  <span style={{ ...styles.messageCell, flex: 1.5 }}>邮箱</span>
                  <span style={{ ...styles.messageCell, flex: 1.2 }}>关联作品</span>
                  <span style={{ ...styles.messageCell, flex: 1.2 }}>时间</span>
                  <span style={{ ...styles.messageCell, flex: 0.8, textAlign: 'right' }}>操作</span>
                </div>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      ...styles.messageRow,
                      opacity: msg.is_read === 1 ? 0.5 : 1,
                    }}
                  >
                    <span style={{ ...styles.messageCell, flex: 1.2, fontWeight: msg.is_read === 0 ? 600 : 400 }}>
                      {msg.name}
                    </span>
                    <span style={{ ...styles.messageCell, flex: 1.5, fontSize: '13px' }}>
                      {msg.email}
                    </span>
                    <span style={{ ...styles.messageCell, flex: 1.2, fontSize: '13px', color: '#6b7280' }}>
                      {msg.work_title || '-'}
                    </span>
                    <span style={{ ...styles.messageCell, flex: 1.2, fontSize: '13px', color: '#6b7280' }}>
                      {formatDate(msg.created_at)}
                    </span>
                    <span style={{ ...styles.messageCell, flex: 0.8, textAlign: 'right' }}>
                      {msg.is_read === 0 ? (
                        <button
                          onClick={() => handleMarkRead(msg.id)}
                          style={styles.markReadButton}
                        >
                          标记已读
                        </button>
                      ) : (
                        <span style={{ ...styles.readBadge }}>已读</span>
                      )}
                    </span>
                    {!msg.is_read && (
                      <div style={styles.messagePreview}>
                        {msg.content}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  loginContainer: {
    minHeight: '100vh',
    backgroundColor: '#1a2332',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  loginCard: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '48px 40px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
    textAlign: 'center',
  },
  loginTitle: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#1a2332',
    margin: '0 0 8px',
  },
  loginSubtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0 0 32px',
  },
  loginForm: {
    textAlign: 'left',
  },
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '8px',
  },
  required: {
    color: '#ef4444',
  },
  charCountHint: {
    fontSize: '12px',
    color: '#9ca3af',
    fontWeight: 400,
    marginLeft: '8px',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '10px',
    border: '2px solid #e5e7eb',
    fontSize: '15px',
    outline: 'none',
    transition: 'all 0.3s ease',
    boxSizing: 'border-box',
    backgroundColor: '#fafafa',
  },
  textarea: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '10px',
    border: '2px solid #e5e7eb',
    fontSize: '15px',
    outline: 'none',
    resize: 'vertical',
    minHeight: '120px',
    transition: 'all 0.3s ease',
    boxSizing: 'border-box',
    backgroundColor: '#fafafa',
    fontFamily: 'inherit',
    lineHeight: 1.6,
  },
  errorText: {
    fontSize: '13px',
    color: '#ef4444',
    margin: '0 0 16px',
  },
  loginButton: {
    width: '100%',
    padding: '14px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: '#1a2332',
    color: 'white',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    marginTop: '8px',
  },
  backLink: {
    marginTop: '20px',
    background: 'none',
    border: 'none',
    color: '#6b7280',
    fontSize: '14px',
    cursor: 'pointer',
  },
  adminContainer: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f0',
  },
  adminHeader: {
    backgroundColor: '#1a2332',
    color: 'white',
    padding: '20px 32px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  adminTitle: {
    fontSize: '22px',
    fontWeight: 700,
    margin: 0,
  },
  viewSiteLink: {
    padding: '8px 16px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '8px',
    color: 'white',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  logoutButton: {
    padding: '10px 20px',
    backgroundColor: '#ef4444',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  tabBar: {
    backgroundColor: 'white',
    borderBottom: '1px solid #e5e7eb',
    padding: '0 32px',
    display: 'flex',
    gap: '0',
  },
  tabButton: {
    padding: '16px 24px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#6b7280',
    fontSize: '15px',
    fontWeight: 500,
    cursor: 'pointer',
    borderBottom: '3px solid transparent',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.3s ease',
  },
  tabButtonActive: {
    color: '#1a2332',
    borderBottomColor: '#1a2332',
  },
  tabCount: {
    backgroundColor: '#e5e7eb',
    color: '#6b7280',
    fontSize: '12px',
    padding: '2px 8px',
    borderRadius: '10px',
  },
  unreadBadge: {
    backgroundColor: '#ef4444',
    color: 'white',
    fontSize: '12px',
    padding: '2px 8px',
    borderRadius: '10px',
    fontWeight: 600,
  },
  adminContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '32px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#1a2332',
    margin: '0 0 20px',
  },
  worksSection: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '28px',
  },
  formCard: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '28px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  createForm: {},
  formRow: {
    display: 'flex',
    gap: '16px',
    marginBottom: '4px',
  },
  submitButton: {
    width: '100%',
    padding: '14px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: '#1a2332',
    color: 'white',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    marginTop: '8px',
  },
  worksList: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '28px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  emptyText: {
    color: '#9ca3af',
    textAlign: 'center',
    padding: '40px 0',
  },
  worksTable: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  workRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '12px',
    borderRadius: '12px',
    backgroundColor: '#fafafa',
  },
  workThumb: {
    width: '72px',
    height: '54px',
    objectFit: 'cover',
    borderRadius: '8px',
  },
  workInfo: {
    flex: 1,
    minWidth: 0,
  },
  workTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#1a2332',
    margin: '0 0 4px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  workMeta: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    fontSize: '12px',
    color: '#6b7280',
    margin: 0,
  },
  workCategory: {
    backgroundColor: '#e5e7eb',
    padding: '2px 10px',
    borderRadius: '10px',
    fontSize: '11px',
  },
  workDate: {},
  deleteButton: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    flexShrink: 0,
  },
  messagesSection: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '28px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  messagesTable: {
    display: 'flex',
    flexDirection: 'column',
  },
  messageHeaderRow: {
    display: 'flex',
    padding: '12px 16px',
    borderBottom: '2px solid #e5e7eb',
    fontSize: '13px',
    fontWeight: 600,
    color: '#6b7280',
  },
  messageRow: {
    display: 'flex',
    flexWrap: 'wrap',
    padding: '16px',
    borderBottom: '1px solid #f3f4f6',
    alignItems: 'center',
    transition: 'opacity 0.3s ease',
    gap: '0',
  },
  messageCell: {
    display: 'block',
    padding: '0 8px',
    fontSize: '14px',
    color: '#1a2332',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  messagePreview: {
    width: '100%',
    padding: '12px 8px 0',
    fontSize: '13px',
    color: '#4b5563',
    lineHeight: 1.6,
    borderTop: '1px dashed #e5e7eb',
    marginTop: '12px',
    whiteSpace: 'pre-wrap',
  },
  markReadButton: {
    padding: '6px 14px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#1a2332',
    color: 'white',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  readBadge: {
    fontSize: '12px',
    color: '#9ca3af',
  },
};

export default AdminPage;
