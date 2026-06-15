import React, { useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import type { AssetClass, TransactionType } from '../types';
import { ASSET_CLASSES } from '../types';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
}) => {
  const selectedAccountId = useFinanceStore(
    (state) => state.selectedAccountId
  );
  const addTransaction = useFinanceStore((state) => state.addTransaction);

  const [date, setDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [type, setType] = useState<TransactionType>('买入');
  const [assetClass, setAssetClass] = useState<AssetClass>('股票');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  if (!isOpen || !selectedAccountId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;

    await addTransaction({
      accountId: selectedAccountId,
      date,
      type,
      assetClass,
      amount: parseFloat(amount),
      note: note.trim() || undefined,
    });

    setDate(new Date().toISOString().split('T')[0]);
    setType('买入');
    setAssetClass('股票');
    setAmount('');
    setNote('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">添加交易记录</h3>
          <button className="icon-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">交易日期</label>
                <input
                  type="date"
                  className="form-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">交易类型</label>
                <select
                  className="form-select"
                  value={type}
                  onChange={(e) => setType(e.target.value as TransactionType)}
                >
                  <option value="买入">买入</option>
                  <option value="卖出">卖出</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">资产类别</label>
                <select
                  className="form-select"
                  value={assetClass}
                  onChange={(e) => setAssetClass(e.target.value as AssetClass)}
                >
                  {ASSET_CLASSES.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">金额</label>
                <input
                  type="number"
                  className="form-input"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0.01"
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">备注（可选）</label>
              <input
                type="text"
                className="form-input"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="输入备注信息"
                maxLength={100}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              取消
            </button>
            <button type="submit" className="btn btn-primary">
              添加
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
