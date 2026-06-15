import React, { useEffect, useRef, useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { ASSET_CLASS_COLORS } from '../types';
import { AddTransactionModal } from './AddTransactionModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';

export const TransactionList: React.FC = () => {
  const {
    selectedAccountId,
    recentlyAddedTransactionId,
    clearRecentlyAddedTransaction,
    deleteTransaction,
    getSelectedAccount,
    getSelectedAccountTransactions,
  } = useFinanceStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const newRowRef = useRef<HTMLTableRowElement>(null);

  const selectedAccount = getSelectedAccount();
  const transactions = getSelectedAccountTransactions();

  useEffect(() => {
    if (recentlyAddedTransactionId && newRowRef.current) {
      newRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const timer = setTimeout(() => {
        clearRecentlyAddedTransaction();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [recentlyAddedTransactionId, clearRecentlyAddedTransaction]);

  if (!selectedAccount) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">交易记录</h3>
        </div>
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <p>请选择一个账户查看交易记录</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">交易记录 - {selectedAccount.name}</h3>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => setShowAddModal(true)}
        >
          + 添加交易
        </button>
      </div>

      {transactions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <p>该账户暂无交易记录，点击上方按钮添加</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>日期</th>
                <th>类型</th>
                <th>资产类别</th>
                <th>金额</th>
                <th>备注</th>
                <th style={{ width: 60 }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => {
                const isNewRow = tx.id === recentlyAddedTransactionId;
                return (
                  <tr
                    key={tx.id}
                    ref={isNewRow ? newRowRef : null}
                    className={isNewRow ? 'new-row' : ''}
                  >
                    <td>{tx.date}</td>
                    <td>
                      <span className={`type-badge ${tx.type === '买入' ? 'buy' : 'sell'}`}>
                        {tx.type}
                      </span>
                    </td>
                    <td>
                      <span
                        className="asset-class-tag"
                        style={{ backgroundColor: ASSET_CLASS_COLORS[tx.assetClass] }}
                      >
                        {tx.assetClass}
                      </span>
                    </td>
                    <td className="amount">
                      {tx.type === '买入' ? '+' : '-'}
                      ¥{tx.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {tx.note || '-'}
                    </td>
                    <td>
                      <button
                        className="icon-btn danger"
                        onClick={() => setDeleteId(tx.id)}
                        title="删除记录"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AddTransactionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />

      <DeleteConfirmModal
        isOpen={!!deleteId}
        title="确认删除交易记录"
        message="确定要删除这条交易记录吗？此操作不可恢复。"
        onConfirm={() => {
          if (deleteId) {
            deleteTransaction(deleteId);
          }
          setDeleteId(null);
        }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};
