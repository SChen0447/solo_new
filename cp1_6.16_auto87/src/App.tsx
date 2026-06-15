import React, { useState, useMemo } from 'react';
import { AccountTree } from './components/AccountTree';
import { PortfolioChart } from './components/PortfolioChart';
import { TransactionList } from './components/TransactionList';
import { useFinanceStore } from './store/useFinanceStore';

const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const {
    selectedAccountId,
    calculateTotalAssets,
    calculateProfitRate,
    getSelectedAccount,
  } = useFinanceStore();

  const selectedAccount = getSelectedAccount();

  const summaryStats = useMemo(() => {
    if (!selectedAccountId || !selectedAccount) return null;

    const totalAssets = calculateTotalAssets(selectedAccountId);
    const profitRate = calculateProfitRate(selectedAccountId);
    const totalProfit = totalAssets - selectedAccount.initialPrincipal;

    return [
      {
        label: '初始本金',
        value: selectedAccount.initialPrincipal,
        isMonetary: true,
      },
      {
        label: '当前总资产',
        value: totalAssets,
        isMonetary: true,
      },
      {
        label: '累计收益',
        value: totalProfit,
        isMonetary: true,
        showColor: true,
      },
      {
        label: '收益率',
        value: profitRate,
        isPercentage: true,
        showColor: true,
      },
    ];
  }, [selectedAccountId, selectedAccount, calculateTotalAssets, calculateProfitRate]);

  const formatValue = (
    value: number,
    isMonetary?: boolean,
    isPercentage?: boolean,
    showColor?: boolean
  ) => {
    if (isPercentage) {
      const sign = value >= 0 ? '+' : '';
      return `${sign}${value.toFixed(2)}%`;
    }
    if (isMonetary) {
      const sign = showColor && value > 0 ? '+' : '';
      return `${sign}¥${value.toLocaleString('zh-CN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }
    return String(value);
  };

  const getValueClass = (value: number, showColor?: boolean) => {
    if (!showColor) return '';
    return value >= 0 ? 'positive' : 'negative';
  };

  return (
    <div className="app-container">
      <nav className="navbar">
        <button
          className="menu-btn"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          ☰
        </button>
        <span className="navbar-title">📊 多账户资产配置可视化</span>
      </nav>

      <div className="main-layout">
        <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <AccountTree />
        </div>

        <main
          className="content-area"
          onClick={() => setSidebarOpen(false)}
        >
          {selectedAccount && summaryStats && (
            <div className="summary-stats">
              {summaryStats.map((stat, index) => (
                <div key={index} className="stat-card">
                  <div className="stat-label">{stat.label}</div>
                  <div
                    className={`stat-value ${getValueClass(
                      stat.value,
                      stat.showColor
                    )}`}
                  >
                    {formatValue(
                      stat.value,
                      stat.isMonetary,
                      stat.isPercentage,
                      stat.showColor
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <PortfolioChart />
          <TransactionList />
        </main>
      </div>
    </div>
  );
};

export default App;
