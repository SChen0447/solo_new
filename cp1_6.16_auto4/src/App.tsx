import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchCategories, fetchExpenses, Category, Expense } from './api';
import CategoryPieChart from './CategoryPieChart';
import ExpenseTable from './ExpenseTable';

const App: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [chartAnimationKey, setChartAnimationKey] = useState(0);
  const [cardsVisible, setCardsVisible] = useState(false);

  const currentMonthDate = useMemo(() => {
    const [year, month] = currentMonth.split('-').map(Number);
    return new Date(year, month - 1, 1);
  }, [currentMonth]);

  const today = new Date();
  const isCurrentMonth = currentMonthDate.getFullYear() === today.getFullYear() && 
                         currentMonthDate.getMonth() === today.getMonth();

  const loadData = useCallback(async (month: string) => {
    try {
      setIsLoading(true);
      const [cats, exps] = await Promise.all([
        fetchCategories(),
        fetchExpenses(month)
      ]);
      setCategories(cats);
      setExpenses(exps);
      setIsLoading(false);
      setTimeout(() => {
        setIsVisible(true);
        setTimeout(() => {
          setCardsVisible(true);
        }, 100);
      }, 50);
    } catch (error) {
      console.error('Failed to load data:', error);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(currentMonth);
  }, []);

  const handleMonthChange = (direction: 'prev' | 'next') => {
    if (isTransitioning) return;
    
    const newDate = new Date(currentMonthDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      if (isCurrentMonth) return;
      newDate.setMonth(newDate.getMonth() + 1);
    }
    
    const newMonth = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`;
    
    setIsTransitioning(true);
    setCardsVisible(false);
    setIsVisible(false);
    
    setTimeout(async () => {
      try {
        const exps = await fetchExpenses(newMonth);
        setExpenses(exps);
        setCurrentMonth(newMonth);
        setChartAnimationKey(prev => prev + 1);
        
        setTimeout(() => {
          setIsVisible(true);
          setIsTransitioning(false);
          setTimeout(() => {
            setCardsVisible(true);
          }, 100);
        }, 100);
      } catch (error) {
        console.error('Failed to load data:', error);
        setIsTransitioning(false);
      }
    }, 400);
  };

  const summaryData = useMemo(() => {
    const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    const categoryTotals = new Map<string, number>();
    expenses.forEach(exp => {
      const current = categoryTotals.get(exp.categoryId) || 0;
      categoryTotals.set(exp.categoryId, current + exp.amount);
    });
    
    let maxCategoryId = '';
    let maxAmount = 0;
    categoryTotals.forEach((amount, catId) => {
      if (amount > maxAmount) {
        maxAmount = amount;
        maxCategoryId = catId;
      }
    });
    
    const maxCategory = categories.find(c => c.id === maxCategoryId);
    
    return {
      totalAmount,
      maxCategoryName: maxCategory?.name || '-',
      maxCategoryAmount: maxAmount,
      recordCount: expenses.length,
    };
  }, [expenses, categories]);

  const formatMonthDisplay = (month: string): string => {
    const [year, m] = month.split('-');
    return `${year}年${parseInt(m)}月`;
  };

  const formatCurrency = (amount: number): string => {
    return `¥${amount.toFixed(2)}`;
  };

  return (
    <div className="app">
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <div className="loading-text">加载中...</div>
        </div>
      )}

      <div 
        className={`dashboard ${isVisible ? 'visible' : ''} ${isTransitioning ? 'transitioning' : ''}`}
      >
        <div className="dashboard-header">
          <h1 className="app-title">家庭账单管理仪表盘</h1>
          <div className="month-nav">
            <button 
              className="nav-btn"
              onClick={() => handleMonthChange('prev')}
              disabled={isTransitioning}
            >
              ← 上月
            </button>
            <span className="month-display">{formatMonthDisplay(currentMonth)}</span>
            <button 
              className="nav-btn"
              onClick={() => handleMonthChange('next')}
              disabled={isCurrentMonth || isTransitioning}
            >
              下月 →
            </button>
          </div>
        </div>

        <div className="summary-cards">
          <div className={`summary-card ${cardsVisible ? 'card-visible' : ''}`} style={{ animationDelay: '0s' }}>
            <div className="card-label">当月总消费</div>
            <div className="card-value total">{formatCurrency(summaryData.totalAmount)}</div>
          </div>
          <div className={`summary-card ${cardsVisible ? 'card-visible' : ''}`} style={{ animationDelay: '0.2s' }}>
            <div className="card-label">最大单笔分类</div>
            <div className="card-value category">{summaryData.maxCategoryName}</div>
            <div className="card-subvalue">{formatCurrency(summaryData.maxCategoryAmount)}</div>
          </div>
          <div className={`summary-card ${cardsVisible ? 'card-visible' : ''}`} style={{ animationDelay: '0.4s' }}>
            <div className="card-label">记录总数</div>
            <div className="card-value count">{summaryData.recordCount}</div>
          </div>
        </div>

        <div className="main-content">
          <div className="chart-section">
            <h2 className="section-title">支出分类占比</h2>
            <CategoryPieChart 
              categories={categories} 
              expenses={expenses}
              animationKey={chartAnimationKey}
            />
          </div>
          <div className="table-section">
            <h2 className="section-title">开销明细</h2>
            <ExpenseTable expenses={expenses} categories={categories} />
          </div>
        </div>
      </div>

      <style>{globalStyles}</style>
    </div>
  );
};

const globalStyles = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    background-color: #F0F2F5;
    color: #333;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  .app {
    min-height: 100vh;
    background-color: #F0F2F5;
  }

  .loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: #F0F2F5;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .loading-spinner {
    width: 60px;
    height: 60px;
    border: 4px solid transparent;
    border-top-color: #4A90D9;
    border-right-color: #50E3C2;
    border-bottom-color: #F5A623;
    border-left-color: #7B68EE;
    border-radius: 50%;
    animation: spin 2s linear infinite;
  }

  .loading-text {
    margin-top: 20px;
    font-size: 16px;
    color: #666;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .dashboard {
    max-width: 1200px;
    margin: 0 auto;
    padding: 30px 2%;
    opacity: 0;
    transition: opacity 0.5s ease;
  }

  .dashboard.visible {
    opacity: 1;
  }

  .dashboard.transitioning {
    opacity: 0;
    transition: opacity 0.4s ease;
  }

  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
    flex-wrap: wrap;
    gap: 20px;
  }

  .app-title {
    font-size: 28px;
    font-weight: 700;
    color: #2C3E50;
  }

  .month-nav {
    display: flex;
    align-items: center;
    gap: 15px;
  }

  .nav-btn {
    padding: 10px 20px;
    background-color: #4A90D9;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    min-height: 44px;
  }

  .nav-btn:hover:not(:disabled) {
    background-color: #3A7BC8;
    transform: scale(0.99);
  }

  .nav-btn:disabled {
    background-color: #BDC3C7;
    cursor: not-allowed;
    transform: none;
  }

  .month-display {
    font-size: 18px;
    font-weight: 600;
    color: #2C3E50;
    min-width: 100px;
    text-align: center;
  }

  .summary-cards {
    display: flex;
    gap: 20px;
    margin-bottom: 30px;
    flex-wrap: wrap;
  }

  .summary-card {
    flex: 1;
    min-width: 250px;
    background-color: white;
    padding: 24px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    transition: all 0.3s ease;
    opacity: 0;
    transform: translateY(20px);
  }

  .summary-card.card-visible {
    animation: fadeInUp 0.5s ease forwards;
  }

  @keyframes fadeInUp {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .summary-card:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    transform: translateY(-2px);
  }

  .card-label {
    font-size: 14px;
    color: #7F8C8D;
    margin-bottom: 8px;
  }

  .card-value {
    font-size: 28px;
    font-weight: 700;
    margin-bottom: 4px;
  }

  .card-value.total {
    color: #E74C3C;
  }

  .card-value.category {
    color: #4A90D9;
  }

  .card-value.count {
    color: #27AE60;
  }

  .card-subvalue {
    font-size: 16px;
    color: #E74C3C;
    font-weight: 600;
  }

  .main-content {
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
  }

  .chart-section {
    flex: 0 0 40%;
    min-width: 300px;
    background-color: white;
    padding: 24px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  .table-section {
    flex: 1;
    min-width: 400px;
  }

  .section-title {
    font-size: 18px;
    font-weight: 600;
    color: #2C3E50;
    margin-bottom: 20px;
  }

  @media (max-width: 768px) {
    .dashboard {
      padding: 20px 2%;
    }

    .dashboard-header {
      flex-direction: column;
      align-items: flex-start;
    }

    .app-title {
      font-size: 22px;
    }

    .month-nav {
      width: 100%;
      justify-content: space-between;
    }

    .summary-cards {
      flex-direction: column;
    }

    .summary-card {
      min-width: 100%;
    }

    .main-content {
      flex-direction: column;
    }

    .chart-section,
    .table-section {
      flex: 1 1 100%;
      min-width: 100%;
    }

    .card-value {
      font-size: 24px;
    }
  }
`;

export default App;
