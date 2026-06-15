import { useEffect, useMemo, useState } from 'react';
import { usePointsStore, Member } from '../store/pointsStore';

export default function PointsHistory() {
  const pointsRecords = usePointsStore((s) => s.pointsRecords);
  const pagination = usePointsStore((s) => s.pagination);
  const currentMember = usePointsStore((s) => s.currentMember);
  const members = usePointsStore((s) => s.members);
  const loading = usePointsStore((s) => s.loading);
  const fetchMembers = usePointsStore((s) => s.fetchMembers);
  const fetchPointsRecords = usePointsStore((s) => s.fetchPointsRecords);
  const setCurrentMember = usePointsStore((s) => s.setCurrentMember);

  const [selectedMonth, setSelectedMonth] = useState('');
  const [showMemberSelect, setShowMemberSelect] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const months = useMemo(() => {
    const result: string[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      result.push(ym);
    }
    return result;
  }, []);

  useEffect(() => {
    if (currentMember) {
      fetchPointsRecords(currentMember.id, selectedMonth || undefined, 1, 10);
    }
  }, [currentMember, selectedMonth, fetchPointsRecords]);

  const handleMonthChange = (value: string) => {
    setSelectedMonth(value);
    setDropdownOpen(false);
  };

  const handlePageChange = (page: number) => {
    if (!currentMember) return;
    fetchPointsRecords(currentMember.id, selectedMonth || undefined, page, 10);
  };

  const filteredMembers = members.filter(
    (m) => m.phone.includes(memberSearch) || m.name.includes(memberSearch)
  );

  const handleSelectMember = (member: Member) => {
    setCurrentMember(member);
    setShowMemberSelect(false);
  };

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(
      d.getMinutes()
    ).padStart(2, '0')}`;
  };

  const renderPagination = () => {
    const { page, totalPages } = pagination;
    if (totalPages <= 1) return null;

    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (page <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (page >= totalPages - 3) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', page - 1, page, page + 1, '...', totalPages);
      }
    }

    return (
      <div className="pagination">
        <button
          className="page-btn"
          onClick={() => handlePageChange(page - 1)}
          disabled={page <= 1}
        >
          ‹
        </button>
        {pages.map((p, idx) =>
          typeof p === 'number' ? (
            <button
              key={idx}
              className={`page-btn ${p === page ? 'active' : ''}`}
              onClick={() => handlePageChange(p)}
            >
              {p}
            </button>
          ) : (
            <span key={idx} style={{ padding: '0 4px', color: '#8D6E63' }}>
              …
            </span>
          )
        )}
        <button
          className="page-btn"
          onClick={() => handlePageChange(page + 1)}
          disabled={page >= totalPages}
        >
          ›
        </button>
        <span className="page-info">
          共 {pagination.total} 条，第 {page} / {totalPages} 页
        </span>
      </div>
    );
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div className="page-header">
        <h1 className="page-title">📋 积分历史</h1>
      </div>

      {!currentMember ? (
        <div className="empty-state">
          <div className="empty-state-icon">👤</div>
          <div className="empty-state-text" style={{ marginBottom: 16 }}>
            请先选择会员查看积分历史
          </div>
          <button className="btn" onClick={() => setShowMemberSelect(true)}>
            选择会员
          </button>
        </div>
      ) : (
        <>
          <div className="member-select-panel">
            <div className="panel-title">👤 当前会员</div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                <div className="member-avatar">{currentMember.name.charAt(0)}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{currentMember.name}</div>
                  <div style={{ fontSize: 12, color: '#8D6E63' }}>{currentMember.phone}</div>
                </div>
                <span className={`level-badge level-${currentMember.level}`} style={{ marginLeft: 8 }}>
                  {currentMember.level}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 24, fontWeight: 700, color: '#8B5E3C' }}>
                  {currentMember.totalPoints}
                </span>
                <span style={{ fontSize: 13, color: '#8D6E63' }}>当前积分</span>
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => setShowMemberSelect(true)}
              >
                切换会员
              </button>
            </div>
            <div
              className="form-row"
              style={{ marginTop: 16, marginBottom: 0, alignItems: 'flex-end' }}
            >
              <div className="form-group" style={{ flex: '0 0 200px' }}>
                <label className="form-label">按月份筛选</label>
                <div className={`dropdown ${dropdownOpen ? 'open' : ''}`}>
                  <div className="select-wrapper">
                    <select
                      className="form-select"
                      value={selectedMonth}
                      onChange={(e) => handleMonthChange(e.target.value)}
                      onFocus={() => setDropdownOpen(true)}
                      onBlur={() => setDropdownOpen(false)}
                    >
                      <option value="">全部月份</option>
                      {months.map((m) => (
                        <option key={m} value={m}>
                          {m.replace('-', '年')}月
                        </option>
                      ))}
                    </select>
                    <span className="select-arrow">▼</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 180 }}>时间</th>
                  <th style={{ width: 120 }}>变动类型</th>
                  <th style={{ width: 120 }}>变动积分</th>
                  <th style={{ width: 120 }}>变动后余额</th>
                  <th>备注</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: 40, color: '#8D6E63' }}>
                      ⏳ 加载中...
                    </td>
                  </tr>
                ) : pointsRecords.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: 40, color: '#8D6E63' }}>
                      📭 暂无积分记录
                    </td>
                  </tr>
                ) : (
                  pointsRecords.map((r) => (
                    <tr key={r.id}>
                      <td>{formatDateTime(r.createdAt)}</td>
                      <td>
                        <span
                          style={{
                            padding: '3px 10px',
                            borderRadius: 10,
                            fontSize: 12,
                            fontWeight: 600,
                            backgroundColor:
                              r.changeType === '消费'
                                ? '#E3F2FD'
                                : r.changeType === '兑换'
                                ? '#FFEBEE'
                                : '#FFF3E0',
                            color:
                              r.changeType === '消费'
                                ? '#1976D2'
                                : r.changeType === '兑换'
                                ? '#C62828'
                                : '#E65100',
                          }}
                        >
                          {r.changeType}
                        </span>
                      </td>
                      <td
                        className={r.changeAmount >= 0 ? 'points-positive' : 'points-negative'}
                      >
                        {r.changeAmount >= 0 ? '+' : ''}
                        {r.changeAmount}
                      </td>
                      <td style={{ fontWeight: 600 }}>{r.balanceAfter}</td>
                      <td style={{ color: '#5D4037' }}>{r.note || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {renderPagination()}
          </div>
        </>
      )}

      {showMemberSelect && (
        <div className="modal-overlay" onClick={() => setShowMemberSelect(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">选择会员</div>
              <button className="modal-close" onClick={() => setShowMemberSelect(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">搜索</label>
                  <input
                    className="form-input"
                    placeholder="手机号或姓名"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                  />
                </div>
              </div>
              <div
                style={{
                  maxHeight: 320,
                  overflowY: 'auto',
                  border: '1px solid #D7CCC8',
                  borderRadius: 8,
                }}
              >
                {filteredMembers.length === 0 ? (
                  <div className="empty-state" style={{ padding: 30 }}>
                    <div style={{ fontSize: 36, opacity: 0.5 }}>👤</div>
                    <div style={{ fontSize: 13, marginTop: 8 }}>暂无匹配会员</div>
                  </div>
                ) : (
                  filteredMembers.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => handleSelectMember(m)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '12px 16px',
                        cursor: 'pointer',
                        borderBottom: '1px solid #F5F5F5',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F5E6D3')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <div className="member-avatar" style={{ width: 36, height: 36, fontSize: 15 }}>
                        {m.name.charAt(0)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>{m.name}</div>
                        <div style={{ fontSize: 12, color: '#8D6E63' }}>{m.phone}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#8B5E3C' }}>
                          {m.totalPoints}
                        </div>
                        <div style={{ fontSize: 10, color: '#8D6E63' }}>积分</div>
                      </div>
                      <span className={`level-badge level-${m.level}`}>{m.level}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
