import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAppStore } from '../store';
import type { Book, ProgressUpdate } from '../types';

export default function MemberHome() {
  const { currentMember, members, fetchMembers } = useAppStore();
  const [heldBooks, setHeldBooks] = useState<Book[]>([]);
  const [progressUpdates, setProgressUpdates] = useState<ProgressUpdate[]>([]);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (members.length === 0) fetchMembers();
  }, [members, fetchMembers]);

  useEffect(() => {
    if (!currentMember) return;
    axios.get(`/api/members/${currentMember.id}`).then((res) => {
      setHeldBooks(res.data.heldBooks || []);
      setProgressUpdates(res.data.progressUpdates || []);
    });
  }, [currentMember]);

  if (!currentMember) {
    return (
      <div className="fade-in" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>👤</div>
        <p style={{ color: '#888', fontSize: '16px' }}>请先在右上角选择成员身份</p>
      </div>
    );
  }

  const handleProgressUpdate = async () => {
    if (!currentMember || !selectedBookId) return;
    const book = heldBooks.find((b) => b.id === selectedBookId);
    if (!book) return;
    await axios.put('/api/progress', {
      bookId: selectedBookId,
      memberId: currentMember.id,
      currentPage,
      totalPages: book.totalPages,
      notes,
    });
    axios.get(`/api/members/${currentMember.id}`).then((res) => {
      setProgressUpdates(res.data.progressUpdates || []);
    });
    setShowProgressModal(false);
    setCurrentPage(0);
    setNotes('');
    setSelectedBookId('');
  };

  const getProgressPercent = (page: number, total: number) => {
    if (total <= 0) return 0;
    return Math.min(100, Math.round((page / total) * 100));
  };

  const getProgressColor = (percent: number) => {
    const r = Math.round(255 * (1 - percent / 100));
    const g = Math.round(200 * (percent / 100));
    return `rgb(${r}, ${g}, 50)`;
  };

  const groupedByBook = progressUpdates.reduce((acc, p) => {
    if (!acc[p.bookId]) acc[p.bookId] = [];
    acc[p.bookId].push(p);
    return acc;
  }, {} as Record<string, ProgressUpdate[]>);

  return (
    <div className="fade-in">
      <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '20px' }}>👤 {currentMember.name} 的阅读主页</h2>

      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '17px', fontWeight: 600 }}>当前持有书籍</h3>
          {heldBooks.length > 0 && (
            <button className="btn btn-primary" onClick={() => { setSelectedBookId(heldBooks[0].id); setCurrentPage(0); setNotes(''); setShowProgressModal(true); }}>
              📖 更新进度
            </button>
          )}
        </div>

        {heldBooks.length === 0 ? (
          <div className="card" style={{ padding: '32px', textAlign: 'center', color: '#aaa' }}>
            当前没有持有任何书籍
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {heldBooks.map((book) => {
              const bookProgress = groupedByBook[book.id] || [];
              const latest = bookProgress.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
              const percent = latest ? getProgressPercent(latest.currentPage, latest.totalPages) : 0;
              return (
                <div key={book.id} className="card" style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span className="status-dot active" />
                    <span style={{ fontSize: '12px', color: '#888' }}>流转中</span>
                  </div>
                  <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>{book.title}</h4>
                  <p style={{ fontSize: '13px', color: '#888', marginBottom: '12px' }}>{book.author}</p>
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                      <span>阅读进度</span>
                      <span>{percent}%</span>
                    </div>
                    <div className="progress-bar-container">
                      <div className="progress-bar-fill" style={{ width: `${percent}%`, background: `linear-gradient(to right, #e74c3c, ${getProgressColor(percent)})` }} />
                    </div>
                    {latest && <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>已读 {latest.currentPage}/{latest.totalPages} 页</div>}
                  </div>
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', fontSize: '13px', padding: '6px' }}
                    onClick={() => { setSelectedBookId(book.id); setCurrentPage(latest?.currentPage || 0); setNotes(''); setShowProgressModal(true); }}
                  >
                    更新进度
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h3 style={{ fontSize: '17px', fontWeight: 600, marginBottom: '16px' }}>阅读记录时间线</h3>
        {progressUpdates.length === 0 ? (
          <div className="card" style={{ padding: '32px', textAlign: 'center', color: '#aaa' }}>
            暂无阅读记录
          </div>
        ) : (
          <div className="timeline">
            {progressUpdates
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .map((p) => {
                const bookName = heldBooks.find((b) => b.id === p.bookId)?.title || p.bookId;
                return (
                  <div key={p.id} className="timeline-item">
                    <div style={{ fontWeight: 500, fontSize: '14px' }}>{bookName}</div>
                    <div style={{ fontSize: '13px', color: 'var(--primary-color)' }}>
                      已读第 {p.currentPage}/{p.totalPages} 页
                    </div>
                    {p.notes && <div style={{ fontSize: '13px', color: '#666', fontStyle: 'italic', marginTop: '2px' }}>"{p.notes}"</div>}
                    <div style={{ fontSize: '12px', color: '#aaa', marginTop: '2px' }}>
                      {new Date(p.updatedAt).toLocaleString('zh-CN')}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {showProgressModal && (
        <div className="modal-overlay" onClick={() => setShowProgressModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>更新阅读进度</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <select
                value={selectedBookId}
                onChange={(e) => {
                  setSelectedBookId(e.target.value);
                  const book = heldBooks.find((b) => b.id === e.target.value);
                  if (book) {
                    const bookProgress = groupedByBook[book.id] || [];
                    const latest = bookProgress.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
                    setCurrentPage(latest?.currentPage || 0);
                  }
                }}
              >
                {heldBooks.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
              </select>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="number"
                  placeholder="已读页数"
                  value={currentPage || ''}
                  onChange={(e) => setCurrentPage(Number(e.target.value))}
                  style={{ flex: 1 }}
                  min={0}
                />
                <span style={{ color: '#888', fontSize: '13px' }}>/ {heldBooks.find((b) => b.id === selectedBookId)?.totalPages || 0} 页</span>
              </div>
              <textarea
                placeholder="简短笔记（最多100字）"
                value={notes}
                onChange={(e) => setNotes(e.target.value.slice(0, 100))}
                maxLength={100}
                rows={3}
                style={{ width: '100%', resize: 'none' }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-secondary" onClick={() => setShowProgressModal(false)} style={{ flex: 1 }}>取消</button>
                <button className="btn btn-primary" onClick={handleProgressUpdate} style={{ flex: 1 }}>提交</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
