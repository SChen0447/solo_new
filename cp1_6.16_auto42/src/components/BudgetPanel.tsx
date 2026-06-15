import React, { useState, useEffect } from 'react';
import { useDataStore } from '../dataStore';
import { BUDGET_CATEGORIES, CATEGORY_COLORS, BudgetCategory } from '../types';

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#16213e',
    borderRadius: '4px',
    border: '1px solid rgba(255,255,255,0.1)',
    overflow: 'hidden'
  },
  header: {
    padding: '16px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    userSelect: 'none'
  },
  headerTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#e0e0e0'
  },
  arrow: {
    fontSize: '14px',
    color: '#888',
    transition: 'transform 0.3s ease'
  },
  arrowExpanded: {
    transform: 'rotate(180deg)'
  },
  content: {
    overflow: 'hidden',
    transition: 'max-height 0.3s ease-in-out'
  },
  contentInner: {
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  },
  budgetItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  budgetHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  categoryName: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#e0e0e0'
  },
  categoryDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%'
  },
  budgetInfo: {
    fontSize: '13px',
    color: '#888'
  },
  progressBar: {
    height: '8px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.5s ease, background-color 0.3s'
  },
  budgetInput: {
    width: '100px',
    padding: '4px 8px',
    backgroundColor: '#0f3460',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '4px',
    color: '#e0e0e0',
    fontSize: '13px',
    outline: 'none',
    textAlign: 'right' as const
  },
  inputRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px'
  },
  inputLabel: {
    fontSize: '12px',
    color: '#888'
  }
};

function getProgressColor(percentage: number): string {
  if (percentage >= 100) return '#e94560';
  if (percentage >= 80) return '#ffa502';
  if (percentage >= 50) return '#ffd93d';
  return '#2ecc71';
}

interface BudgetItemProps {
  category: BudgetCategory;
  budgetAmount: number;
  spent: number;
  onBudgetChange: (amount: number) => void;
  isOverBudget: boolean;
  shakeKey: number;
}

function BudgetItem({ category, budgetAmount, spent, onBudgetChange, isOverBudget, shakeKey }: BudgetItemProps) {
  const percentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;
  const displayPercentage = Math.min(percentage, 100);
  const color = getProgressColor(percentage);

  return (
    <div
      style={styles.budgetItem}
      data-shake={isOverBudget ? shakeKey : undefined}
    >
      <div style={styles.budgetHeader}>
        <div style={styles.categoryName}>
          <span style={{ ...styles.categoryDot, backgroundColor: CATEGORY_COLORS[category] }} />
          {category}
        </div>
        <div style={{
          ...styles.budgetInfo,
          color: isOverBudget ? '#e94560' : '#888',
          fontWeight: isOverBudget ? 600 : 'normal',
          transition: 'color 0.3s'
        }}>
          ¥{spent.toFixed(0)} / ¥{budgetAmount.toFixed(0)} ({percentage.toFixed(0)}%)
        </div>
      </div>
      <div
        style={{
          ...styles.progressBar,
          boxShadow: isOverBudget ? '0 0 8px rgba(233, 69, 96, 0.5)' : 'none',
          transition: 'box-shadow 0.3s'
        }}
      >
        <div
          style={{
            ...styles.progressFill,
            width: `${displayPercentage}%`,
            backgroundColor: color,
            boxShadow: isOverBudget ? '0 0 10px rgba(233, 69, 96, 0.8)' : 'none'
          }}
        />
      </div>
      <div style={styles.inputRow}>
        <span style={styles.inputLabel}>设置预算</span>
        <input
          type="number"
          min="0"
          value={budgetAmount}
          onChange={(e) => onBudgetChange(parseFloat(e.target.value) || 0)}
          style={styles.budgetInput}
        />
      </div>
    </div>
  );
}

export default function BudgetPanel() {
  const { budgets, updateBudget, getCategorySpent, getOverBudgetCategories } = useDataStore();
  const [isExpanded, setIsExpanded] = useState(true);
  const [shakeKey, setShakeKey] = useState(0);
  const overBudgetCategories = getOverBudgetCategories();

  useEffect(() => {
    if (overBudgetCategories.length > 0) {
      setShakeKey(prev => prev + 1);
    }
  }, [overBudgetCategories.length]);

  useEffect(() => {
    if (overBudgetCategories.length > 0) {
      const styleId = 'budget-shake-style';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          @keyframes budgetShake {
            0%, 100% { transform: translateX(0); }
            20% { transform: translateX(-3px); }
            40% { transform: translateX(3px); }
            60% { transform: translateX(-3px); }
            80% { transform: translateX(3px); }
          }
          [data-shake] {
            animation: budgetShake 0.5s ease-in-out;
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, [overBudgetCategories.length]);

  const getBudgetAmount = (category: BudgetCategory) => {
    const budget = budgets.find(b => b.category === category);
    return budget ? budget.amount : 0;
  };

  return (
    <div style={styles.container}>
      <div
        style={styles.header}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span style={styles.headerTitle}>预算设置与监控</span>
        <span
          style={{
            ...styles.arrow,
            ...(isExpanded ? styles.arrowExpanded : {})
          }}
        >
          ▼
        </span>
      </div>
      <div
        style={{
          ...styles.content,
          maxHeight: isExpanded ? '1000px' : '0'
        }}
      >
        <div style={styles.contentInner}>
          {BUDGET_CATEGORIES.map(category => (
            <BudgetItem
              key={category}
              category={category}
              budgetAmount={getBudgetAmount(category)}
              spent={getCategorySpent(category)}
              onBudgetChange={(amount) => updateBudget(category, amount)}
              isOverBudget={overBudgetCategories.includes(category)}
              shakeKey={shakeKey}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
