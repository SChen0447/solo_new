import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X, TrendingUp, TrendingDown, GripVertical } from 'lucide-react';
import { StockForm } from '../StockForm';
import { useStockStore } from '../store/useStockStore';
import { formatPrice, formatChangePercent } from '../utils';

export const Sidebar: React.FC = () => {
  const {
    stocks,
    isSidebarCollapsed,
    toggleSidebar,
    removeStock,
  } = useStockStore();

  const [mobileOpen, setMobileOpen] = useState(false);

  const handleMobileClose = () => {
    setMobileOpen(false);
  };

  const sidebarContent = (
    <div className="sidebar-content">
      <div className="sidebar-header">
        <div className="sidebar-title-area">
          <h2 className="sidebar-title">股票列表</h2>
          {!isSidebarCollapsed && (
            <button
              className="collapse-btn"
              onClick={toggleSidebar}
              title="收起侧边栏"
            >
              <ChevronLeft size={18} />
            </button>
          )}
        </div>
      </div>

      {!isSidebarCollapsed && (
        <>
          <div className="sidebar-form-section">
            <StockForm />
          </div>

          <div className="sidebar-stock-list">
            <div className="stock-list-header">
              <span>已添加股票</span>
              <span className="stock-list-count">{stocks.length}</span>
            </div>

            {stocks.length === 0 ? (
              <div className="stock-list-empty">
                <span>暂无股票</span>
              </div>
            ) : (
              <div className="stock-list-items">
                {stocks.map((stock, index) => {
                  const isUp = stock.changePercent >= 0;
                  return (
                    <div
                      key={stock.id}
                      className={`stock-list-item ${isUp ? 'up' : 'down'}`}
                    >
                      <div className="list-item-drag-handle">
                        <GripVertical size={14} />
                      </div>
                      <div className="list-item-info">
                        <div className="list-item-top">
                          <span className="list-item-symbol">{stock.symbol}</span>
                          <span className="list-item-order">#{index + 1}</span>
                        </div>
                        <span className="list-item-price">
                          ${formatPrice(stock.currentPrice)}
                        </span>
                      </div>
                      <div className="list-item-change">
                        {isUp ? (
                          <TrendingUp size={14} />
                        ) : (
                          <TrendingDown size={14} />
                        )}
                        <span className={isUp ? 'up' : 'down'}>
                          {formatChangePercent(stock.changePercent)}
                        </span>
                      </div>
                      <button
                        className="list-item-delete"
                        onClick={() => removeStock(stock.id)}
                        title="删除"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {isSidebarCollapsed && (
        <div className="sidebar-collapsed-stocks">
          {stocks.length === 0 ? (
            <div className="collapsed-empty">+</div>
          ) : (
            stocks.slice(0, 8).map((stock) => {
              const isUp = stock.changePercent >= 0;
              return (
                <div
                  key={stock.id}
                  className={`collapsed-stock-dot ${isUp ? 'up' : 'down'}`}
                  title={`${stock.symbol}: ${formatChangePercent(stock.changePercent)}`}
                >
                  {stock.symbol.charAt(0)}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      <aside
        className={`sidebar desktop-sidebar ${
          isSidebarCollapsed ? 'collapsed' : ''
        }`}
      >
        {isSidebarCollapsed && (
          <button
            className="sidebar-expand-btn"
            onClick={toggleSidebar}
            title="展开侧边栏"
          >
            <ChevronRight size={18} />
          </button>
        )}
        {sidebarContent}
      </aside>

      <button
        className="mobile-fab"
        onClick={() => setMobileOpen(true)}
        title="打开股票列表"
      >
        <ChevronRight size={20} />
      </button>

      {mobileOpen && (
        <div className="mobile-sidebar-overlay" onClick={handleMobileClose}>
          <aside
            className="sidebar mobile-sidebar"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="mobile-close-btn"
              onClick={handleMobileClose}
              title="关闭"
            >
              <X size={20} />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};
