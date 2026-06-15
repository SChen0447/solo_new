import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePointsStore, Member } from '../store/pointsStore';

export default function Members() {
  const navigate = useNavigate();
  const members = usePointsStore((s) => s.members);
  const currentMember = usePointsStore((s) => s.currentMember);
  const loading = usePointsStore((s) => s.loading);
  const fetchMembers = usePointsStore((s) => s.fetchMembers);
  const addMember = usePointsStore((s) => s.addMember);
  const setCurrentMember = usePointsStore((s) => s.setCurrentMember);
  const consume = usePointsStore((s) => s.consume);
  const activities = usePointsStore((s) => s.activities);
  const fetchActivities = usePointsStore((s) => s.fetchActivities);

  const [searchPhone, setSearchPhone] = useState('');
  const [searchName, setSearchName] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showConsumeModal, setShowConsumeModal] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newName, setNewName] = useState('');
  const [consumeAmount, setConsumeAmount] = useState('');

  useEffect(() => {
    fetchMembers();
    fetchActivities();
  }, [fetchMembers, fetchActivities]);

  const handleSearch = () => {
    fetchMembers(searchPhone || undefined, searchName || undefined);
  };

  const handleAddMember = async () => {
    if (!newPhone.trim() || !newName.trim()) return;
    const result = await addMember(newPhone.trim(), newName.trim());
    if (result) {
      setShowAddModal(false);
      setNewPhone('');
      setNewName('');
    }
  };

  const openConsumeModal = (member: Member) => {
    setCurrentMember(member);
    setConsumeAmount('');
    setShowConsumeModal(true);
  };

  const handleConsume = async () => {
    if (!currentMember || !consumeAmount) return;
    const amount = parseFloat(consumeAmount);
    if (isNaN(amount) || amount <= 0) return;
    const result = await consume(currentMember.id, amount);
    if (result) {
      setShowConsumeModal(false);
      setConsumeAmount('');
    }
  };

  const activeActivity = activities.find((a) => a.status === '进行中');

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div className="page-header">
        <h1 className="page-title">👤 会员管理</h1>
        <button className="btn" onClick={() => setShowAddModal(true)}>
          ＋ 新增会员
        </button>
      </div>

      <div className="member-select-panel">
        <div className="panel-title">🔍 搜索会员</div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">手机号</label>
            <input
              className="form-input"
              placeholder="请输入手机号"
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <div className="form-group">
            <label className="form-label">姓名</label>
            <input
              className="form-input"
              placeholder="请输入姓名"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <div className="form-group" style={{ justifyContent: 'flex-end', flex: '0 0 auto' }}>
            <label className="form-label">&nbsp;</label>
            <button className="btn" onClick={handleSearch}>
              搜索
            </button>
          </div>
        </div>
        {activeActivity && (
          <div
            style={{
              marginTop: 12,
              padding: '10px 14px',
              backgroundColor: '#E8F5E9',
              borderRadius: 8,
              color: '#2E7D32',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>🔥</span>
            <span>
              当前活动：<strong>{activeActivity.name}</strong>（{activeActivity.multiplier}倍积分）
            </span>
          </div>
        )}
      </div>

      {loading && members.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">⏳</div>
          <div className="empty-state-text">加载中...</div>
        </div>
      ) : members.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👥</div>
          <div className="empty-state-text">暂无会员，点击右上角新增</div>
        </div>
      ) : (
        <div className="card-grid">
          {members.map((m) => (
            <div key={m.id} className="card">
              <div className="member-card-header">
                <div className="member-avatar">{m.name.charAt(0)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: '#8D6E63', marginTop: 2 }}>{m.phone}</div>
                </div>
                <span className={`level-badge level-${m.level}`}>{m.level}</span>
              </div>
              <div className="points-display">
                <span className="points-value">{m.totalPoints}</span>
                <span className="points-label">积分</span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button
                  className="btn"
                  style={{ flex: 1 }}
                  onClick={() => openConsumeModal(m)}
                >
                  💰 消费积分
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setCurrentMember(m);
                    navigate('/points-history');
                  }}
                >
                  📋
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">新增会员</div>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">手机号 *</label>
                  <input
                    className="form-input"
                    placeholder="请输入手机号"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">姓名 *</label>
                  <input
                    className="form-input"
                    placeholder="请输入姓名"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                取消
              </button>
              <button className="btn" onClick={handleAddMember}>
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {showConsumeModal && currentMember && (
        <div className="modal-overlay" onClick={() => setShowConsumeModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">消费积分</div>
              <button className="modal-close" onClick={() => setShowConsumeModal(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 20,
                  padding: 16,
                  backgroundColor: '#FAFAFA',
                  borderRadius: 12,
                }}
              >
                <div className="member-avatar">{currentMember.name.charAt(0)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{currentMember.name}</div>
                  <div style={{ fontSize: 12, color: '#8D6E63' }}>{currentMember.phone}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: '#8D6E63' }}>当前积分</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#8B5E3C' }}>
                    {currentMember.totalPoints}
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">消费金额（元）*</label>
                  <input
                    className="form-input"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="请输入消费金额"
                    value={consumeAmount}
                    onChange={(e) => setConsumeAmount(e.target.value)}
                  />
                </div>
              </div>

              {consumeAmount && !isNaN(parseFloat(consumeAmount)) && parseFloat(consumeAmount) > 0 && (
                <div className="redeem-summary">
                  <div className="summary-row">
                    <span>消费金额</span>
                    <span>¥{parseFloat(consumeAmount).toFixed(2)}</span>
                  </div>
                  <div className="summary-row">
                    <span>基础积分（每10元1分）</span>
                    <span>+{Math.ceil(parseFloat(consumeAmount) / 10)}</span>
                  </div>
                  {activeActivity && (
                    <div className="summary-row">
                      <span>活动倍数</span>
                      <span style={{ color: '#E8A87C', fontWeight: 600 }}>
                        ×{activeActivity.multiplier}
                      </span>
                    </div>
                  )}
                  <div className="summary-row total">
                    <span>获得积分</span>
                    <span style={{ color: '#4CAF50' }}>
                      +{Math.ceil(parseFloat(consumeAmount) / 10) * (activeActivity?.multiplier || 1)}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowConsumeModal(false)}>
                取消
              </button>
              <button
                className="btn"
                onClick={handleConsume}
                disabled={!consumeAmount || isNaN(parseFloat(consumeAmount)) || parseFloat(consumeAmount) <= 0}
              >
                确认消费
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
