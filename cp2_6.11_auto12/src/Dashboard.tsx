import React, { useEffect, useRef, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { RefreshCw, Clock } from 'lucide-react';
import { useStockStore } from './store/useStockStore';
import { StockCard } from './components/StockCard';
import { REFRESH_OPTIONS } from './types/stock';

export const Dashboard: React.FC = () => {
  const {
    stocks,
    reorderStocks,
    refreshAll,
    refreshInterval,
    setRefreshInterval,
    isLoading,
  } = useStockStore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = stocks.findIndex((s) => s.id === active.id);
      const newIndex = stocks.findIndex((s) => s.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        reorderStocks(oldIndex, newIndex);
        // 同时更新store中的顺序（通过arrayMove返回新数组）
        const newStocks = arrayMove(stocks, oldIndex, newIndex);
        useStockStore.setState({ stocks: newStocks });
      }
    }
  };

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    await refreshAll();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleRefreshIntervalChange = (value: string) => {
    const interval = value === 'null' ? null : parseInt(value, 10);
    setRefreshInterval(interval);
  };

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setCountdown(null);

    if (refreshInterval !== null) {
      intervalRef.current = setInterval(() => {
        refreshAll();
        if (refreshInterval) {
          setCountdown(Math.floor(refreshInterval / 1000));
        }
      }, refreshInterval);

      countdownRef.current = setInterval(() => {
        setCountdown((prev) => (prev !== null && prev > 0 ? prev - 1 : null));
      }, 1000);

      setCountdown(Math.floor(refreshInterval / 1000));
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, [refreshInterval, refreshAll]);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="dashboard-title-section">
          <h1 className="dashboard-title">市场仪表盘</h1>
          <span className="stock-count">{stocks.length} 只股票</span>
        </div>
        <div className="dashboard-controls">
          <div className="refresh-control">
            <Clock size={16} />
            <select
              value={refreshInterval?.toString() ?? 'null'}
              onChange={(e) => handleRefreshIntervalChange(e.target.value)}
              className="interval-select"
              title="自动刷新间隔"
            >
              {REFRESH_OPTIONS.map((opt) => (
                <option
                  key={opt.label}
                  value={opt.value?.toString() ?? 'null'}
                >
                  {opt.label}
                </option>
              ))}
            </select>
            {countdown !== null && refreshInterval !== null && countdown > 0 && (
              <span className="countdown-badge">{countdown}s</span>
            )}
          </div>
          <button
            className="refresh-all-btn"
            onClick={handleRefreshAll}
            disabled={isRefreshing || isLoading}
            title="刷新全部数据"
          >
            <RefreshCw
              size={16}
              className={isRefreshing || isLoading ? 'spin' : ''}
            />
            刷新全部
          </button>
        </div>
      </div>

      {stocks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📈</div>
          <h3 className="empty-state-title">暂无股票</h3>
          <p className="empty-state-desc">
            请在左侧输入股票代码添加，如 AAPL、GOOGL
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={stocks.map((s) => s.id)} strategy={rectSortingStrategy}>
            <div className="stock-grid">
              {stocks.map((stock) => (
                <StockCard key={stock.id} stock={stock} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
};
