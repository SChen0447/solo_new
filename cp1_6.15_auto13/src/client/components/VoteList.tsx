import { useEffect, useRef, useState } from 'react';
import { useVoteStore } from '../store/useVoteStore';
import type { Vote } from '../store/useVoteStore';

interface VoteListProps {
  onCreateClick: () => void;
  onSelectVote: (vote: Vote) => void;
}

export default function VoteList({ onCreateClick, onSelectVote }: VoteListProps) {
  const {
    getFilteredVotes,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    isAdmin,
    loginAdmin,
    logoutAdmin,
    deleteVote,
    resetVote,
    loading,
  } = useVoteStore();

  const [searchInput, setSearchInput] = useState(searchQuery);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [resetConfirm, setResetConfirm] = useState<string | null>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      setSearchQuery(searchInput);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput, setSearchQuery]);

  const filteredVotes = getFilteredVotes();

  const handleDelete = async () => {
    if (deleteConfirm) {
      await deleteVote(deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  const handleReset = async () => {
    if (resetConfirm) {
      await resetVote(resetConfirm);
      setResetConfirm(null);
    }
  };

  const handleAdminLogin = async () => {
    const success = await loginAdmin(adminPassword);
    if (success) {
      setShowAdminModal(false);
      setAdminPassword('');
    }
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
  };

  return (
    <div style={styles.container}>
      <div style={styles.toolbar}>
        <div style={styles.searchWrapper}>
          <svg
            style={styles.searchIcon}
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="搜索投票标题..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <div style={styles.rightActions}>
          <button
            style={styles.sortBtn}
            onClick={() => setSortBy(sortBy === 'time' ? 'count' : 'time')}
          >
            {sortBy === 'time' ? '按时间' : '按票数'}
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{
                marginLeft: '4px',
                transform: sortBy === 'count' ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s ease',
              }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={onCreateClick}>
            + 新建投票
          </button>

          {isAdmin ? (
            <button style={{ ...styles.btn, ...styles.btnOutline }} onClick={logoutAdmin}>
              退出管理
            </button>
          ) : (
            <button style={{ ...styles.btn, ...styles.btnOutline }} onClick={() => setShowAdminModal(true)}>
              管理员
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div style={styles.loading}>
          <div style={styles.spinner} />
        </div>
      )}

      <div style={styles.grid}>
        {filteredVotes.length === 0 && !loading && (
          <div style={styles.empty}>
            <p style={{ color: '#9ca3af' }}>暂无投票，点击上方按钮创建第一个投票吧</p>
          </div>
        )}

        {filteredVotes.map((vote, idx) => {
          const totalVotes = vote.options.reduce((s, o) => s + o.count, 0);
          return (
            <div
              key={vote.id}
              className="vote-card-item"
              style={{
                ...styles.voteCard,
                animationDelay: `${idx * 0.05}s`,
              }}
              onClick={() => onSelectVote(vote)}
            >
              {isAdmin && (
                <button
                  style={styles.deleteBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirm(vote.id);
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}

              <h3 style={styles.voteCardTitle}>{vote.title}</h3>

              <div style={styles.voteCardMeta}>
                <span style={styles.metaItem}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 11l3 3L22 4" />
                    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                  </svg>
                  {vote.options.length} 个选项
                </span>
                <span style={styles.metaItem}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                  </svg>
                  {totalVotes} 人已投
                </span>
                <span style={styles.metaItem}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  {formatDate(vote.createdAt)}
                </span>
              </div>

              {isAdmin && (
                <button
                  style={{ ...styles.resetBtn, marginTop: '12px' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setResetConfirm(vote.id);
                  }}
                >
                  重置数据
                </button>
              )}
            </div>
          );
        })}
      </div>

      {showAdminModal && (
        <div style={styles.modalOverlay} onClick={() => setShowAdminModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px 0' }}>管理员登录</h3>
            <input
              type="password"
              placeholder="请输入管理员密码"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              style={styles.input}
              onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
            />
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button
                style={{ ...styles.btn, ...styles.btnCancel }}
                onClick={() => setShowAdminModal(false)}
              >
                取消
              </button>
              <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={handleAdminLogin}>
                登录
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div style={styles.modalOverlay} onClick={() => setDeleteConfirm(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px 0' }}>确认删除</h3>
            <p style={{ margin: '0 0 20px 0', color: '#666' }}>确认删除此投票？此操作不可撤销。</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button style={{ ...styles.btn, ...styles.btnCancel }} onClick={() => setDeleteConfirm(null)}>
                取消
              </button>
              <button style={{ ...styles.btn, ...styles.btnDanger }} onClick={handleDelete}>
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {resetConfirm && (
        <div style={styles.modalOverlay} onClick={() => setResetConfirm(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px 0' }}>确认重置</h3>
            <p style={{ margin: '0 0 20px 0', color: '#666' }}>确认重置此投票的所有数据？</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button style={{ ...styles.btn, ...styles.btnCancel }} onClick={() => setResetConfirm(null)}>
                取消
              </button>
              <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={handleReset}>
                重置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
  },
  toolbar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    marginBottom: '24px',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchWrapper: {
    position: 'relative',
    flex: '1',
    minWidth: '200px',
    maxWidth: '400px',
  },
  searchIcon: {
    position: 'absolute',
    left: '16px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#9ca3af',
  },
  searchInput: {
    width: '100%',
    padding: '10px 16px 10px 44px',
    borderRadius: '20px',
    border: '1px solid #e5e7eb',
    background: '#fff',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  },
  rightActions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  sortBtn: {
    padding: '8px 16px',
    borderRadius: '8px',
    background: '#fff',
    border: '1px solid #e5e7eb',
    color: '#374151',
    fontSize: '13px',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s ease',
  },
  btn: {
    padding: '8px 20px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 500,
    transition: 'all 0.2s ease',
  },
  btnPrimary: {
    background: 'linear-gradient(135deg, #4A90D9 0%, #7B68EE 100%)',
    color: '#fff',
  },
  btnOutline: {
    background: '#fff',
    color: '#4A90D9',
    border: '1px solid #4A90D9',
  },
  btnCancel: {
    background: '#f3f4f6',
    color: '#6b7280',
  },
  btnDanger: {
    background: '#ef4444',
    color: '#fff',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '16px',
  },
  voteCard: {
    position: 'relative',
    background: '#ffffff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  voteCardTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: '12px',
    lineHeight: 1.5,
  },
  voteCardMeta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    color: '#6b7280',
  },
  deleteBtn: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: '#ef4444',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    zIndex: 10,
  },
  resetBtn: {
    padding: '6px 12px',
    borderRadius: '6px',
    background: '#fef3c7',
    color: '#92400e',
    fontSize: '12px',
    fontWeight: 500,
    border: 'none',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    padding: '40px',
  },
  spinner: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: '3px solid #e5e7eb',
    borderTopColor: '#4A90D9',
    animation: 'spin 0.8s linear infinite',
  },
  empty: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: '60px 20px',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#fff',
    borderRadius: '12px',
    padding: '24px',
    width: '90%',
    maxWidth: '400px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    fontSize: '14px',
    outline: 'none',
  },
};
