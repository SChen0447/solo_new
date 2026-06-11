import React, { useState } from 'react';
import { Trash2, RefreshCw, GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Stock } from '../types/stock';
import { formatPrice, formatVolume, formatChangePercent } from '../utils';
import { CandlestickChart } from './CandlestickChart';
import { VolumeChart } from './VolumeChart';
import { useStockStore } from '../store/useStockStore';

interface StockCardProps {
  stock: Stock;
}

export const StockCard: React.FC<StockCardProps> = ({ stock }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshStock = useStockStore(state => state.refreshStock);
  const removeStock = useStockStore(state => state.removeStock);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stock.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isUp = stock.changePercent >= 0;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshStock(stock.id);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleRemove = () => {
    removeStock(stock.id);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`stock-card ${isUp ? 'border-up' : 'border-down'}`}
    >
      <div className="stock-card-header">
        <div className="stock-card-left">
          <button
            className="drag-handle"
            {...attributes}
            {...listeners}
            title="拖拽排序"
          >
            <GripVertical size={16} />
          </button>
          <div className="stock-info">
            <h3 className="stock-symbol">{stock.symbol}</h3>
            <span className="stock-name">{stock.name}</span>
          </div>
        </div>
        <div className="stock-card-right">
          <button
            className="icon-btn refresh-btn"
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="刷新数据"
          >
            <RefreshCw size={16} className={isRefreshing ? 'spin' : ''} />
          </button>
          <button
            className="icon-btn delete-btn"
            onClick={handleRemove}
            title="删除股票"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="stock-price-row">
        <div className="stock-price">
          <span className="price-label">当前价格</span>
          <span className={`price-value ${isUp ? 'up' : 'down'}`}>
            ${formatPrice(stock.currentPrice)}
          </span>
        </div>
        <div className="stock-change">
          <span className="change-label">涨跌幅</span>
          <span className={`change-value ${isUp ? 'up' : 'down'}`}>
            {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)} ({formatChangePercent(stock.changePercent)})
          </span>
        </div>
        <div className="stock-volume">
          <span className="volume-label">成交量</span>
          <span className="volume-value">{formatVolume(stock.totalVolume)}</span>
        </div>
      </div>

      <div className="stock-charts">
        <CandlestickChart stock={stock} height={220} />
        <VolumeChart stock={stock} height={80} />
      </div>
    </div>
  );
};
