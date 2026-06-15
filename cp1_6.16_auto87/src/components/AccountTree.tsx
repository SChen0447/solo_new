import React, { useMemo, useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import type { Account } from '../types';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { AddAccountModal } from './AddAccountModal';

interface AccountNodeProps {
  account: Account;
  level: number;
  childAccounts: Account[];
}

const AccountNode: React.FC<AccountNodeProps> = ({
  account,
  level,
  childAccounts,
}) => {
  const {
    selectedAccountId,
    selectAccount,
    calculateTotalAssets,
    calculateProfitRate,
    removingAccountIds,
    addingAccountIds,
  } = useFinanceStore();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddSubModal, setShowAddSubModal] = useState(false);

  const totalAssets = useMemo(
    () => calculateTotalAssets(account.id),
    [account.id, calculateTotalAssets]
  );

  const profitRate = useMemo(
    () => calculateProfitRate(account.id),
    [account.id, calculateProfitRate]
  );

  const isSelected = selectedAccountId === account.id;
  const isRemoving = removingAccountIds.has(account.id);
  const isAdding = addingAccountIds.has(account.id);

  const handleClick = () => {
    selectAccount(account.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteModal(true);
  };

  const handleAddSub = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowAddSubModal(true);
  };

  const nodeClasses = [
    'account-node',
    isSelected ? 'selected' : '',
    isRemoving ? 'removing' : '',
    isAdding ? 'adding' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const profitClass = profitRate >= 0 ? 'profit-positive' : 'profit-negative';
  const profitSign = profitRate >= 0 ? '+' : '';

  return (
    <div style={{ marginLeft: level > 0 ? 20 : 0 }}>
      <div className={nodeClasses} onClick={handleClick}>
        <div className="account-info">
          <div className="account-name">{account.name}</div>
          <div className="account-assets">
            ¥{totalAssets.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span className={`account-profit-rate ${profitClass}`} key={profitRate}>
              {profitSign}{profitRate.toFixed(2)}%
            </span>
          </div>
        </div>
        <div className="account-actions">
          <button
            className="icon-btn"
            onClick={handleAddSub}
            title="添加子账户"
          >
            +
          </button>
          <button
            className="icon-btn danger"
            onClick={handleDelete}
            title="删除账户"
          >
            ✕
          </button>
        </div>
      </div>

      {childAccounts.length > 0 && (
        <div className="tree-children">
          {childAccounts.map((child) => (
            <AccountNodeWrapper key={child.id} account={child} level={level + 1} />
          ))}
        </div>
      )}

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        title="确认删除账户"
        message={`确定要删除"${account.name}"吗？该账户及其所有子账户和交易记录都将被永久删除，此操作不可恢复。`}
        onConfirm={() => {
          useFinanceStore.getState().deleteAccount(account.id);
          setShowDeleteModal(false);
        }}
        onCancel={() => setShowDeleteModal(false)}
      />

      <AddAccountModal
        isOpen={showAddSubModal}
        onClose={() => setShowAddSubModal(false)}
        parentId={account.id}
      />
    </div>
  );
};

const AccountNodeWrapper: React.FC<{ account: Account; level: number }> = ({
  account,
  level,
}) => {
  const accounts = useFinanceStore((state) => state.accounts);
  const childAccounts = useMemo(
    () => accounts.filter((a) => a.parentId === account.id),
    [accounts, account.id]
  );

  return (
    <AccountNode
      account={account}
      level={level}
      childAccounts={childAccounts}
    />
  );
};

export const AccountTree: React.FC = () => {
  const accounts = useFinanceStore((state) => state.accounts);
  const [showAddModal, setShowAddModal] = useState(false);

  const rootAccounts = useMemo(
    () => accounts.filter((a) => a.parentId === null),
    [accounts]
  );

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">账户列表</span>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => setShowAddModal(true)}
        >
          + 添加
        </button>
      </div>
      <div className="account-tree">
        {rootAccounts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <p>暂无账户，点击上方按钮添加</p>
          </div>
        ) : (
          rootAccounts.map((account) => (
            <AccountNodeWrapper key={account.id} account={account} level={0} />
          ))
        )}
      </div>

      <AddAccountModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
    </div>
  );
};
