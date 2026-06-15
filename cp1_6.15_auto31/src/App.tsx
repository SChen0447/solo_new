import React, { useState, useEffect, useCallback } from 'react';
import { useTransactionStore } from './store/transactionStore';
import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import { CATEGORIES, CATEGORY_COLORS } from './types';
import type { Transaction } from './types';

type Page = 'dashboard' | 'transactions' | 'add';

const navItems: { key: Page; label: string; icon: string }[] = [
  { key: 'dashboard', label: '仪表盘', icon: '📊' },
  { key: 'transactions', label: '交易记录', icon: '📝' },
  { key: 'add', label: '记一笔', icon: '➕' },
];

function Notification({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 6000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div style={{
      position: 'fixed',
      top: 20,
      right: 20,
      width: 320,
      padding: '14px 18px',
      background: '#fef9e7',
      border: '1px solid #f9e79f',
      borderRadius: 10,
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      zIndex: 1000,
      animation: 'slideIn 0.3s ease',
      fontSize: 14,
      color: '#7d6608',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <span>{message}</span>
      <button
        onClick={onClose}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#7d6608', marginLeft: 8 }}
      >
        ✕
      </button>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const [notifications, setNotifications] = useState<string[]>([]);
  const [newTx, setNewTx] = useState({ amount: '', date: new Date().toISOString().slice(0, 10), category: '餐饮', note: '', type: 'expense' as 'expense' | 'income' });

  const { transactions, budgets, fetchTransactions, fetchBudgets, addTransaction, uploadCSV, csvResult, clearCSVResult, loading } = useTransactionStore();

  useEffect(() => {
    fetchTransactions();
    fetchBudgets();
  }, [fetchTransactions, fetchBudgets]);

  useEffect(() => {
    if (budgets.length === 0) return;
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthExpenses = transactions.filter((t) => t.type === 'expense' && t.date.startsWith(monthStart));
    const categorySpend = new Map<string, number>();
    for (const t of monthExpenses) {
      categorySpend.set(t.category, (categorySpend.get(t.category) || 0) + t.amount);
    }
    for (const b of budgets) {
      if (b.amount <= 0) continue;
      const spent = categorySpend.get(b.category) || 0;
      if (spent >= b.amount * 0.8) {
        const msg = `「${b.category}」类别本月支出已达预算的${Math.round((spent / b.amount) * 100)}%，请注意控制！`;
        if (!notifications.includes(msg)) {
          setNotifications((prev) => [...prev, msg]);
        }
      }
    }
  }, [transactions, budgets]);

  const handleAddTransaction = useCallback(async () => {
    if (!newTx.amount || Number(newTx.amount) <= 0) return;
    await addTransaction({
      amount: Number(newTx.amount),
      date: newTx.date,
      category: newTx.category,
      note: newTx.note,
      type: newTx.type,
    });
    setNewTx({ amount: '', date: new Date().toISOString().slice(0, 10), category: '餐饮', note: '', type: 'expense' });
    setPage('transactions');
  }, [newTx, addTransaction]);

  const handleCSVUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadCSV(file);
    e.target.value = '';
  }, [uploadCSV]);

  const removeNotification = useCallback((msg: string) => {
    setNotifications((prev) => prev.filter((n) => n !== msg));
  }, []);

  return (
    <>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: #f8f9fa; color: #2c3e50; }
        .hover-lift { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .hover-lift:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.12); }
        .card { background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); padding: 20px; }
        .btn-primary { background: #2ecc71; color: #fff; border: none; border-radius: 8px; padding: 10px 20px; font-size: 14px; font-weight: 600; cursor: pointer; transition: transform 0.2s ease, background 0.2s ease; }
        .btn-primary:hover { background: #27ae60; transform: translateY(-2px); }
        .btn-secondary { background: #fff; color: #2c3e50; border: 1px solid #ddd; border-radius: 8px; padding: 10px 20px; font-size: 14px; font-weight: 500; cursor: pointer; transition: transform 0.2s ease, background 0.2s ease; }
        .btn-secondary:hover { background: #f0f0f0; transform: translateY(-2px); }
        input, select, textarea { border: 1px solid #ddd; border-radius: 8px; padding: 10px 12px; font-size: 14px; outline: none; transition: border 0.2s ease; font-family: inherit; }
        input:focus, select:focus, textarea:focus { border-color: #2ecc71; }
      `}</style>

      {notifications.map((msg, i) => (
        <Notification key={i} message={msg} onClose={() => removeNotification(msg)} />
      ))}

      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <nav style={{
          width: 220,
          background: '#fff',
          borderRight: '1px solid #eee',
          padding: '24px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          position: 'sticky',
          top: 0,
          height: '100vh',
        }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#2ecc71', marginBottom: 8, padding: '8px 12px' }}>
            💰 财务健康助手
          </div>
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setPage(item.key)}
              className="hover-lift"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 16px',
                borderRadius: 10,
                border: 'none',
                background: page === item.key ? '#e8f8f0' : 'transparent',
                color: page === item.key ? '#2ecc71' : '#666',
                fontWeight: page === item.key ? 600 : 400,
                cursor: 'pointer',
                fontSize: 15,
                textAlign: 'left',
                width: '100%',
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
          <div style={{ marginTop: 'auto', padding: '12px 16px' }}>
            <label className="btn-secondary hover-lift" style={{ display: 'inline-block', textAlign: 'center', width: '100%', cursor: 'pointer' }}>
              📂 导入CSV
              <input type="file" accept=".csv" onChange={handleCSVUpload} style={{ display: 'none' }} />
            </label>
          </div>
        </nav>

        <main style={{ flex: 1, padding: 24, maxWidth: 1200 }}>
          {loading && (
            <div style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(255,255,255,0.7)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', zIndex: 999,
            }}>
              <div style={{ fontSize: 18, color: '#2ecc71', fontWeight: 600 }}>加载中...</div>
            </div>
          )}

          {csvResult && (
            <div className="card" style={{ marginBottom: 16, background: '#e8f8f0', border: '1px solid #2ecc71' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>CSV导入完成</strong>：共 {csvResult.total} 条，成功导入 {csvResult.imported} 条
                  {csvResult.unmatched.length > 0 && `，${csvResult.unmatched.length} 条需手动归类`}
                </div>
                <button className="btn-secondary" onClick={clearCSVResult}>关闭</button>
              </div>
            </div>
          )}

          {page === 'dashboard' && <Dashboard />}
          {page === 'transactions' && <TransactionList />}
          {page === 'add' && (
            <div className="card" style={{ maxWidth: 520 }}>
              <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20 }}>记一笔</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className={`hover-lift ${newTx.type === 'expense' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setNewTx({ ...newTx, type: 'expense' })}
                    style={{ flex: 1 }}
                  >
                    支出
                  </button>
                  <button
                    className={`hover-lift ${newTx.type === 'income' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setNewTx({ ...newTx, type: 'income' })}
                    style={{ flex: 1, ...(newTx.type === 'income' ? { background: '#3498db' } : {}) }}
                  >
                    收入
                  </button>
                </div>
                <input
                  type="number"
                  placeholder="金额（元）"
                  value={newTx.amount}
                  onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
                  style={{ fontSize: 18, fontWeight: 600 }}
                />
                <input
                  type="date"
                  value={newTx.date}
                  onChange={(e) => setNewTx({ ...newTx, date: e.target.value })}
                />
                <select value={newTx.category} onChange={(e) => setNewTx({ ...newTx, category: e.target.value })}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="备注（选填）"
                  value={newTx.note}
                  onChange={(e) => setNewTx({ ...newTx, note: e.target.value })}
                />
                <button className="btn-primary hover-lift" onClick={handleAddTransaction} style={{ padding: '14px 0', fontSize: 16 }}>
                  保存
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
