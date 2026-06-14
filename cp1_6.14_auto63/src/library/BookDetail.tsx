import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAppStore } from '../store';
import type { Book, BookStatus, ProgressUpdate } from '../types';

interface BookDetailProps {
  bookId: string;
  onClose: () => void;
}

export default function BookDetail({ bookId, onClose }: BookDetailProps) {
  const { members, fetchMembers } = useAppStore();
  const [book, setBook] = useState<Book | null>(null);
  const [progressList, setProgressList] = useState<ProgressUpdate[]>([]);
  const [editHolder, setEditHolder] = useState('');
  const [editStatus, setEditStatus] = useState<BookStatus>('待借出');
  const [showProgressForm, setShowProgressForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [notes, setNotes] = useState('');
  const { currentMember } = useAppStore();

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  useEffect(() => {
    axios.get(`/api/books/${bookId}`).then((res) => {
      setBook(res.data);
      setProgressList(res.data.progress || []);
      setEditHolder(res.data.currentHolder || '');
      setEditStatus(res.data.status);
    });
  }, [bookId]);

  if (!book) return null;

  const handleSave = async () => {
    await axios.put(`/api/books/${bookId}`, {
      currentHolder: editHolder || null,
      status: editStatus,
    });
    const res = await axios.get(`/api/books/${bookId}`);
    setBook(res.data);
  };

  const handleProgressUpdate = async () => {
    if (!currentMember) return;
    await axios.put('/api/progress', {
      bookId,
      memberId: currentMember.id,
      currentPage,
      totalPages: book.totalPages,
      notes,
    });
    const res = await axios.get(`/api/books/${bookId}`);
    setBook(res.data);
    setProgressList(res.data.progress || []);
    setShowProgressForm(false);
    setCurrentPage(0);
    setNotes('');
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

  const latestProgress = progressList.length > 0
    ? progressList.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]
    : null;

  const progressPercent = latestProgress ? getProgressPercent(latestProgress.currentPage, latestProgress.totalPages) : 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 700 }}>{book.title}</h3>
          <button className="btn btn-secondary" onClick={onClose} style={{ padding: '4px 12px' }}>✕</button>
        </div>

        {book.coverUrl && (
          <div style={{ width: '100%', height: '200px', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px', background: '#f0f0f0' }}>
            <img src={book.coverUrl} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div><span style={{ color: '#888', fontSize: '13px' }}>作者</span><div style={{ fontWeight: 500 }}>{book.author}</div></div>
          <div><span style={{ color: '#888', fontSize: '13px' }}>ISBN</span><div style={{ fontWeight: 500, fontSize: '13px' }}>{book.isbn}</div></div>
          <div><span style={{ color: '#888', fontSize: '13px' }}>类别</span><div style={{ fontWeight: 500 }}>{book.category}</div></div>
          <div><span style={{ color: '#888', fontSize: '13px' }}>总页数</span><div style={{ fontWeight: 500 }}>{book.totalPages}页</div></div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '14px', fontWeight: 500 }}>阅读进度</span>
            <span style={{ fontSize: '13px', color: '#888' }}>{progressPercent}%</span>
          </div>
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${progressPercent}%`, background: `linear-gradient(to right, #e74c3c, ${getProgressColor(progressPercent)})` }} />
          </div>
          {latestProgress && (
            <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
              已读 {latestProgress.currentPage}/{latestProgress.totalPages} 页
              {latestProgress.notes && ` · "${latestProgress.notes}"`}
            </div>
          )}
        </div>

        {currentMember && (
          <div style={{ marginBottom: '20px' }}>
            {!showProgressForm ? (
              <button className="btn btn-primary" onClick={() => setShowProgressForm(true)} style={{ width: '100%' }}>
                📖 更新进度
              </button>
            ) : (
              <div style={{ background: '#f9f9f9', borderRadius: '8px', padding: '12px' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="number"
                    placeholder="已读页数"
                    value={currentPage || ''}
                    onChange={(e) => setCurrentPage(Number(e.target.value))}
                    style={{ flex: 1 }}
                    min={0}
                    max={book.totalPages}
                  />
                  <span style={{ lineHeight: '38px', color: '#888', fontSize: '13px' }}>/ {book.totalPages}</span>
                </div>
                <textarea
                  placeholder="简短笔记（最多100字）"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value.slice(0, 100))}
                  maxLength={100}
                  rows={2}
                  style={{ width: '100%', resize: 'none', marginBottom: '8px' }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-secondary" onClick={() => setShowProgressForm(false)} style={{ flex: 1 }}>取消</button>
                  <button className="btn btn-primary" onClick={handleProgressUpdate} style={{ flex: 1 }}>提交</button>
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ borderTop: '1px solid #eee', paddingTop: '16px', marginBottom: '16px' }}>
          <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>编辑持有者与状态</h4>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <select value={editHolder} onChange={(e) => setEditHolder(e.target.value)} style={{ flex: 1, minWidth: '120px' }}>
              <option value="">无持有者</option>
              {members.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
            </select>
            <select value={editStatus} onChange={(e) => setEditStatus(e.target.value as BookStatus)} style={{ flex: 1, minWidth: '120px' }}>
              <option value="待借出">待借出</option>
              <option value="流转中">流转中</option>
              <option value="已完成">已完成</option>
            </select>
            <button className="btn btn-primary" onClick={handleSave}>保存</button>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #eee', paddingTop: '16px' }}>
          <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>流转日志</h4>
          {book.circulationLog.length === 0 ? (
            <p style={{ color: '#aaa', fontSize: '13px' }}>暂无流转记录</p>
          ) : (
            <div className="timeline">
              {book.circulationLog.map((log, i) => (
                <div key={i} className="timeline-item">
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>{log.holder} {log.action}</div>
                  <div style={{ fontSize: '12px', color: '#888' }}>{log.date}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {progressList.length > 0 && (
          <div style={{ borderTop: '1px solid #eee', paddingTop: '16px', marginTop: '16px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>进度历史</h4>
            <div className="timeline">
              {progressList
                .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                .map((p) => (
                  <div key={p.id} className="timeline-item">
                    <div style={{ fontSize: '13px', fontWeight: 500 }}>
                      {members.find((m) => m.id === p.memberId)?.name || '未知'} · 第{p.currentPage}/{p.totalPages}页
                    </div>
                    {p.notes && <div style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>"{p.notes}"</div>}
                    <div style={{ fontSize: '12px', color: '#888' }}>{new Date(p.updatedAt).toLocaleString('zh-CN')}</div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
