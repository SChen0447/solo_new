import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useStockStore } from './store/useStockStore';

export const StockForm: React.FC = () => {
  const [symbol, setSymbol] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const addStock = useStockStore(state => state.addStock);
  const stocks = useStockStore(state => state.stocks);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol.trim() || isAdding) return;

    const upperSymbol = symbol.toUpperCase().trim();
    const exists = stocks.some(s => s.symbol === upperSymbol);
    if (exists) {
      alert(`股票 ${upperSymbol} 已存在`);
      return;
    }

    setIsAdding(true);
    await addStock(upperSymbol);
    setSymbol('');
    setIsAdding(false);
  };

  const quickAddStocks = ['AMZN', 'TSLA', 'META', 'NVDA', 'NFLX'];
  const availableQuickAdd = quickAddStocks.filter(
    s => !stocks.some(stock => stock.symbol === s)
  );

  return (
    <div className="stock-form-container">
      <h3 className="form-title">添加股票</h3>
      <form onSubmit={handleSubmit} className="stock-form">
        <div className="input-group">
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="输入股票代码 (如 AAPL)"
            className="stock-input"
            maxLength={10}
            disabled={isAdding}
          />
          {symbol && (
            <button
              type="button"
              className="clear-btn"
              onClick={() => setSymbol('')}
            >
              <X size={14} />
            </button>
          )}
        </div>
        <button type="submit" className="add-btn" disabled={isAdding || !symbol.trim()}>
          <Plus size={18} />
          {isAdding ? '添加中...' : '添加'}
        </button>
      </form>

      {availableQuickAdd.length > 0 && (
        <div className="quick-add">
          <span className="quick-add-label">快速添加：</span>
          <div className="quick-add-buttons">
            {availableQuickAdd.map(s => (
              <button
                key={s}
                type="button"
                className="quick-add-btn"
                onClick={() => addStock(s)}
                disabled={isAdding}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
