import React, { useState } from 'react';
import { useDataStore } from '../dataStore';
import { BUDGET_CATEGORIES, CATEGORY_COLORS, BudgetCategory } from '../types';

const styles: Record<string, React.CSSProperties> = {
  form: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    padding: '20px',
    backgroundColor: '#16213e',
    borderRadius: '4px',
    border: '1px solid rgba(255,255,255,0.1)',
    marginBottom: '16px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: '1 1 140px',
    minWidth: '120px'
  },
  label: {
    fontSize: '13px',
    color: '#a0a0a0',
    fontWeight: 500
  },
  input: {
    padding: '8px 12px',
    backgroundColor: '#0f3460',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '4px',
    color: '#e0e0e0',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s'
  },
  select: {
    padding: '8px 12px',
    backgroundColor: '#0f3460',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '4px',
    color: '#e0e0e0',
    fontSize: '14px',
    outline: 'none',
    cursor: 'pointer'
  },
  categoryTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px'
  },
  categoryTag: {
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    cursor: 'pointer',
    border: '2px solid transparent',
    transition: 'all 0.2s',
    fontWeight: 500
  },
  button: {
    padding: '10px 24px',
    backgroundColor: '#0f3460',
    color: '#e0e0e0',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.2s',
    alignSelf: 'flex-end'
  },
  error: {
    color: '#e94560',
    fontSize: '12px',
    marginTop: '4px'
  },
  hint: {
    fontSize: '11px',
    color: '#888'
  }
};

export default function TransactionForm() {
  const { addTransaction } = useDataStore();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<BudgetCategory>('食品');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount === 0) {
      setError('请输入有效的金额（正数为收入，负数为支出）');
      return;
    }
    if (!date) {
      setError('请选择日期');
      return;
    }

    addTransaction({
      date,
      category,
      amount: numAmount,
      note: note.trim()
    });

    setAmount('');
    setNote('');
  };

  return (
    <form style={styles.form} onSubmit={handleSubmit}>
      <div style={styles.inputGroup}>
        <label style={styles.label}>日期</label>
        <input
          type="date"
          style={styles.input}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div style={{ ...styles.inputGroup, flex: '2 1 280px' }}>
        <label style={styles.label}>类别</label>
        <div style={styles.categoryTags}>
          {BUDGET_CATEGORIES.map(cat => (
            <span
              key={cat}
              onClick={() => setCategory(cat)}
              style={{
                ...styles.categoryTag,
                backgroundColor: category === cat ? CATEGORY_COLORS[cat] : 'rgba(255,255,255,0.05)',
                color: category === cat ? '#1a1a2e' : '#e0e0e0',
                borderColor: category === cat ? CATEGORY_COLORS[cat] : 'rgba(255,255,255,0.1)'
              }}
            >
              {cat}
            </span>
          ))}
        </div>
      </div>

      <div style={styles.inputGroup}>
        <label style={styles.label}>金额</label>
        <input
          type="number"
          step="0.01"
          style={styles.input}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="正数=收入, 负数=支出"
        />
        <span style={styles.hint}>正数为收入，负数为支出</span>
      </div>

      <div style={{ ...styles.inputGroup, flex: '2 1 200px' }}>
        <label style={styles.label}>备注</label>
        <input
          type="text"
          style={styles.input}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="可选备注信息"
        />
      </div>

      <div style={styles.inputGroup}>
        {error && <span style={styles.error}>{error}</span>}
        <button type="submit" style={styles.button}>
          添加记录
        </button>
      </div>
    </form>
  );
}
