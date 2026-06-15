import React, { useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentId?: string | null;
}

export const AddAccountModal: React.FC<AddAccountModalProps> = ({
  isOpen,
  onClose,
  parentId = null,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('股票');
  const [initialPrincipal, setInitialPrincipal] = useState('');
  const addAccount = useFinanceStore((state) => state.addAccount);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await addAccount({
      name: name.trim(),
      category,
      parentId,
      initialPrincipal: parseFloat(initialPrincipal) || 0,
    });

    setName('');
    setCategory('股票');
    setInitialPrincipal('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">添加账户</h3>
          <button className="icon-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">账户名称</label>
              <input
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="请输入账户名称"
                autoFocus
                required
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">账户类别</label>
                <select
                  className="form-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="股票">股票</option>
                  <option value="基金">基金</option>
                  <option value="加密货币">加密货币</option>
                  <option value="现金">现金</option>
                  <option value="其他">其他</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">初始本金</label>
                <input
                  type="number"
                  className="form-input"
                  value={initialPrincipal}
                  onChange={(e) => setInitialPrincipal(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>
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
