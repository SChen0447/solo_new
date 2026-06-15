import React, { useState, useMemo } from 'react';
import { useTransactionStore } from '../store/transactionStore';
import { CATEGORY_COLORS, CATEGORIES } from '../types';
import type { Transaction } from '../types';

function TransactionCard({ tx, onEdit, onDelete }: { tx: Transaction; onEdit: (tx: Transaction) => void; onDelete: (id: string) => void }) {
  const [hovered, setHovered] = useState(false);
  const color = CATEGORY_COLORS[tx.category] || '#95a5a6';

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        overflow: 'hidden',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        transform: hovered ? 'translateY(-2px)' : 'none',
        cursor: 'default',
      }}
    >
      <div style={{
        width: 4,
        alignSelf: 'stretch',
        background: color,
        borderRadius: '4px 0 0 4px',
      }} />

      <div style={{ flex: 1, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#fff',
              background: color,
              padding: '2px 8px',
              borderRadius: 4,
            }}>
              {tx.category}
            </span>
            <span style={{ fontSize: 14, fontWeight: 500, color: '#2c3e50' }}>
              {tx.note || '无备注'}
            </span>
          </div>
          <span style={{ fontSize: 12, color: '#999' }}>
            {tx.date}
          </span>
        </div>
        <span style={{
          fontSize: 16,
          fontWeight: 700,
          color: tx.type === 'expense' ? '#e74c3c' : '#2ecc71',
        }}>
          {tx.type === 'expense' ? '-' : '+'}¥{tx.amount.toFixed(2)}
        </span>
      </div>

      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 4,
        right: 0,
        display: 'flex',
        justifyContent: 'flex-end',
        gap: 6,
        padding: '6px 12px',
        background: 'linear-gradient(transparent, rgba(255,255,255,0.95) 30%)',
        opacity: hovered ? 1 : 0,
        transition: 'opacity 0.2s ease',
      }}>
        <button
          className="btn-secondary"
          style={{ fontSize: 11, padding: '4px 10px' }}
          onClick={() => onEdit(tx)}
        >
          编辑
        </button>
        <button
          style={{
            fontSize: 11, padding: '4px 10px', border: '1px solid #e74c3c',
            background: '#fff', color: '#e74c3c', borderRadius: 6, cursor: 'pointer',
            transition: 'transform 0.2s ease',
          }}
          onClick={() => onDelete(tx.id)}
        >
          删除
        </button>
      </div>
    </div>
  );
}

function EditModal({ tx, onSave, onClose }: { tx: Transaction; onSave: (id: string, data: Partial<Transaction>) => void; onClose: () => void }) {
  const [form, setForm] = useState({
    amount: String(tx.amount),
    date: tx.date,
    category: tx.category,
    note: tx.note,
    type: tx.type,
  });

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.4)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }} onClick={onClose}>
      <div className="card" style={{ width: 400, padding: 24 }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>编辑交易</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="number"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            placeholder="金额"
          />
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input
            type="text"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder="备注"
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className={form.type === 'expense' ? 'btn-primary' : 'btn-secondary'}
              style={{ flex: 1 }}
              onClick={() => setForm({ ...form, type: 'expense' })}
            >
              支出
            </button>
            <button
              className={form.type === 'income' ? 'btn-primary' : 'btn-secondary'}
              style={{ flex: 1, ...(form.type === 'income' ? { background: '#3498db' } : {}) }}
              onClick={() => setForm({ ...form, type: 'income' })}
            >
              收入
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-primary" style={{ flex: 1 }} onClick={() => onSave(tx.id, {
              amount: Number(form.amount),
              date: form.date,
              category: form.category,
              note: form.note,
              type: form.type as 'expense' | 'income',
            })}>
              保存
            </button>
            <button className="btn-secondary" style={{ flex: 1 }} onClick={onClose}>
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TransactionList() {
  const { transactions, updateTransaction, deleteTransaction } = useTransactionStore();
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterType, setFilterType] = useState<'' | 'expense' | 'income'>('');
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  const filtered = useMemo(() => {
    return transactions
      .filter((t) => {
        if (search && !t.note.includes(search) && !t.category.includes(search) && !t.date.includes(search)) return false;
        if (filterCategory && t.category !== filterCategory) return false;
        if (filterType && t.type !== filterType) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, search, filterCategory, filterType]);

  const totalExpense = filtered.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalIncome = filtered.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);

  const handleEdit = (tx: Transaction) => {
    setEditingTx(tx);
  };

  const handleSave = async (id: string, data: Partial<Transaction>) => {
    await updateTransaction(id, data);
    setEditingTx(null);
  };

  const handleDelete = async (id: string) => {
    await deleteTransaction(id);
  };

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>📝 交易记录</h1>

      <div className="card" style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="搜索备注、类别..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 180 }}
          />
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} style={{ minWidth: 120 }}>
            <option value="">全部类别</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value as '' | 'expense' | 'income')} style={{ minWidth: 100 }}>
            <option value="">全部类型</option>
            <option value="expense">支出</option>
            <option value="income">收入</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 20, marginTop: 12, fontSize: 13 }}>
          <span>筛选结果：<strong>{filtered.length}</strong> 条</span>
          <span>支出合计：<strong style={{ color: '#e74c3c' }}>¥{totalExpense.toFixed(2)}</strong></span>
          <span>收入合计：<strong style={{ color: '#2ecc71' }}>¥{totalIncome.toFixed(2)}</strong></span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 40, color: '#999' }}>
            暂无交易记录，点击左侧「记一笔」开始记账吧
          </div>
        ) : (
          filtered.map((tx) => (
            <TransactionCard
              key={tx.id}
              tx={tx}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      {editingTx && (
        <EditModal
          tx={editingTx}
          onSave={handleSave}
          onClose={() => setEditingTx(null)}
        />
      )}
    </div>
  );
}
