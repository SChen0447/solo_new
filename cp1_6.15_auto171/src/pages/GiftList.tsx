import { useEffect, useState } from 'react';
import { usePointsStore, Gift, Member } from '../store/pointsStore';

export default function GiftList() {
  const gifts = usePointsStore((s) => s.gifts);
  const members = usePointsStore((s) => s.members);
  const currentMember = usePointsStore((s) => s.currentMember);
  const loading = usePointsStore((s) => s.loading);
  const fetchGifts = usePointsStore((s) => s.fetchGifts);
  const fetchMembers = usePointsStore((s) => s.fetchMembers);
  const setCurrentMember = usePointsStore((s) => s.setCurrentMember);
  const redeemGift = usePointsStore((s) => s.redeemGift);

  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null);
  const [showMemberSelect, setShowMemberSelect] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');

  useEffect(() => {
    fetchGifts();
    fetchMembers();
  }, [fetchGifts, fetchMembers]);

  const openRedeemModal = (gift: Gift) => {
    setSelectedGift(gift);
    if (!currentMember) {
      setShowMemberSelect(true);
    } else {
      setShowRedeemModal(true);
    }
  };

  const handleSelectMember = (member: Member) => {
    setCurrentMember(member);
    setShowMemberSelect(false);
    setShowRedeemModal(true);
  };

  const handleConfirmRedeem = async () => {
    if (!currentMember || !selectedGift) return;
    const result = await redeemGift(currentMember.id, selectedGift.id);
    if (result) {
      setShowRedeemModal(false);
      setSelectedGift(null);
    }
  };

  const filteredMembers = members.filter(
    (m) =>
      m.phone.includes(memberSearch) ||
      m.name.includes(memberSearch)
  );

  const canRedeem = (gift: Gift) => {
    if (!currentMember) return true;
    return currentMember.totalPoints >= gift.requiredPoints && gift.stock > 0;
  };

  const getRedeemBtnText = (gift: Gift) => {
    if (gift.stock <= 0) return '已售罄';
    if (!currentMember) return '选择会员兑换';
    if (currentMember.totalPoints < gift.requiredPoints) return '积分不足';
    return '立即兑换';
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div className="page-header">
        <h1 className="page-title">🎁 礼品兑换</h1>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {currentMember ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 14px',
                backgroundColor: '#FFFFFF',
                borderRadius: 8,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
            >
              <div className="member-avatar" style={{ width: 32, height: 32, fontSize: 14 }}>
                {currentMember.name.charAt(0)}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{currentMember.name}</div>
                <div style={{ fontSize: 11, color: '#8B5E3C' }}>
                  {currentMember.totalPoints} 积分
                </div>
              </div>
              <button
                className="btn btn-secondary"
                style={{ height: 28, padding: '0 10px', fontSize: 12 }}
                onClick={() => setShowMemberSelect(true)}
              >
                切换
              </button>
            </div>
          ) : (
            <button className="btn btn-secondary" onClick={() => setShowMemberSelect(true)}>
              👤 选择会员
            </button>
          )}
        </div>
      </div>

      {loading && gifts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">⏳</div>
          <div className="empty-state-text">加载中...</div>
        </div>
      ) : gifts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📦</div>
          <div className="empty-state-text">暂无礼品</div>
        </div>
      ) : (
        <div className="card-grid">
          {gifts.map((gift) => (
            <div key={gift.id} className="card">
              <div className="gift-image">{gift.imageUrl || '🎁'}</div>
              <div className="gift-info">
                <div className="gift-name">{gift.name}</div>
                <div className="gift-points">{gift.requiredPoints} 积分</div>
                <div className="gift-stock">库存：{gift.stock} 件</div>
              </div>
              <button
                className="btn"
                style={{ width: '100%' }}
                onClick={() => openRedeemModal(gift)}
                disabled={gift.stock <= 0 || (currentMember && currentMember.totalPoints < gift.requiredPoints)}
              >
                {getRedeemBtnText(gift)}
              </button>
              {gift.stock > 0 && gift.stock < 3 && (
                <div className="stock-warning">⚠ 库存不足</div>
              )}
            </div>
          ))}
        </div>
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

      {showRedeemModal && selectedGift && currentMember && (
        <div className="modal-overlay" onClick={() => setShowRedeemModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">确认兑换</div>
              <button className="modal-close" onClick={() => setShowRedeemModal(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: 16,
                  backgroundColor: '#FAFAFA',
                  borderRadius: 12,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 12,
                    backgroundColor: '#F5E6D3',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 36,
                  }}
                >
                  {selectedGift.imageUrl || '🎁'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{selectedGift.name}</div>
                  <div style={{ marginTop: 4, fontSize: 13, color: '#8D6E63' }}>
                    库存：{selectedGift.stock} 件
                  </div>
                  <div style={{ marginTop: 4, fontSize: 14, color: '#8B5E3C', fontWeight: 600 }}>
                    所需积分：{selectedGift.requiredPoints}
                  </div>
                </div>
              </div>

              <div className="redeem-summary">
                <div className="summary-row">
                  <span>会员</span>
                  <span style={{ fontWeight: 600 }}>{currentMember.name}</span>
                </div>
                <div className="summary-row">
                  <span>当前积分</span>
                  <span>{currentMember.totalPoints}</span>
                </div>
                <div className="summary-row">
                  <span>消耗积分</span>
                  <span style={{ color: '#E53935', fontWeight: 600 }}>
                    -{selectedGift.requiredPoints}
                  </span>
                </div>
                <div className="summary-row total">
                  <span>兑换后剩余</span>
                  <span
                    style={{
                      color:
                        currentMember.totalPoints - selectedGift.requiredPoints >= 0
                          ? '#4CAF50'
                          : '#E53935',
                    }}
                  >
                    {currentMember.totalPoints - selectedGift.requiredPoints}
                  </span>
                </div>
              </div>

              {currentMember.totalPoints < selectedGift.requiredPoints && (
                <div
                  style={{
                    padding: 10,
                    backgroundColor: '#FFEBEE',
                    color: '#C62828',
                    borderRadius: 8,
                    fontSize: 13,
                    textAlign: 'center',
                  }}
                >
                  ⚠ 积分不足，无法兑换
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowRedeemModal(false)}>
                取消
              </button>
              <button
                className="btn"
                onClick={handleConfirmRedeem}
                disabled={
                  currentMember.totalPoints < selectedGift.requiredPoints || selectedGift.stock <= 0
                }
              >
                确认兑换
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
