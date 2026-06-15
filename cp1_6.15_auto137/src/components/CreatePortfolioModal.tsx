import React, { useState, useRef, useCallback } from 'react';
import { X } from 'lucide-react';

interface CreatePortfolioModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string, stocks: { code: string; buyPrice: number; quantity: number }[]) => void;
}

export default function CreatePortfolioModal({ open, onClose, onSubmit }: CreatePortfolioModalProps) {
  const [name, setName] = useState('');
  const [stockInput, setStockInput] = useState('');
  const [nameFocused, setNameFocused] = useState(false);
  const [stockFocused, setStockFocused] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const parseStocks = useCallback((input: string): { code: string; buyPrice: number; quantity: number }[] => {
    const lines = input.trim().split('\n').filter((l) => l.trim());
    return lines.map((line) => {
      const parts = line.trim().split(/[\s,;]+/);
      const code = parts[0] || 'UNKNOWN';
      const buyPrice = parseFloat(parts[1]) || 100;
      const quantity = parseInt(parts[2]) || 10;
      return { code: code.toUpperCase(), buyPrice, quantity };
    });
  }, []);

  const handleSubmit = useCallback(() => {
    if (!name.trim()) return;
    const stocks = parseStocks(stockInput);
    if (stocks.length === 0) return;
    onSubmit(name.trim(), stocks);
    setName('');
    setStockInput('');
    onClose();
  }, [name, stockInput, onSubmit, onClose, parseStocks]);

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (formRef.current && !formRef.current.contains(e.target as Node)) {
      onClose();
    }
  }, [onClose]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={handleOverlayClick}
    >
      <div
        ref={formRef}
        style={{
          width: 420,
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
          padding: 32,
          animation: 'slideUp 0.3s ease-out',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#1a1a2e' }}>新建投资组合</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#999',
              padding: 4,
              borderRadius: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, color: '#666', marginBottom: 6, fontWeight: 500 }}>
            组合名称
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onFocus={() => setNameFocused(true)}
            onBlur={() => setNameFocused(false)}
            placeholder="输入组合名称"
            style={{
              width: '100%',
              padding: '10px 12px',
              border: 'none',
              borderBottom: `2px solid ${nameFocused ? '#4CAF50' : '#ddd'}`,
              outline: 'none',
              fontSize: 14,
              transition: 'border-color 0.3s',
              background: '#fafafa',
              borderRadius: '4px 4px 0 0',
            }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 13, color: '#666', marginBottom: 6, fontWeight: 500 }}>
            添加股票（每行一个：代码 买入价 数量）
          </label>
          <textarea
            value={stockInput}
            onChange={(e) => setStockInput(e.target.value)}
            onFocus={() => setStockFocused(true)}
            onBlur={() => setStockFocused(false)}
            placeholder={"AAPL 180 10\nGOOG 140 5\nTSLA 250 8"}
            rows={4}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: 'none',
              borderBottom: `2px solid ${stockFocused ? '#4CAF50' : '#ddd'}`,
              outline: 'none',
              fontSize: 13,
              fontFamily: 'Inter, monospace',
              transition: 'border-color 0.3s',
              background: '#fafafa',
              borderRadius: '4px 4px 0 0',
              resize: 'vertical',
            }}
          />
          <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
            格式：股票代码 买入价 持仓数量，用空格或逗号分隔
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px',
              border: '1px solid #ddd',
              borderRadius: 8,
              background: '#fff',
              color: '#666',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || !stockInput.trim()}
            style={{
              padding: '8px 24px',
              border: 'none',
              borderRadius: 8,
              background: name.trim() && stockInput.trim() ? '#4CAF50' : '#ccc',
              color: '#fff',
              cursor: name.trim() && stockInput.trim() ? 'pointer' : 'not-allowed',
              fontSize: 14,
              fontWeight: 500,
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              transition: 'background 0.2s',
            }}
          >
            创建
          </button>
        </div>
      </div>
    </div>
  );
}
