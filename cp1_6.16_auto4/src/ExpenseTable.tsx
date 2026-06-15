import React, { useState, useMemo } from 'react';
import { Category, Expense } from './api';

interface ExpenseTableProps {
  expenses: Expense[];
  categories: Category[];
}

const ExpenseTable: React.FC<ExpenseTableProps> = ({ expenses, categories }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach(cat => map.set(cat.id, cat));
    return map;
  }, [categories]);

  const sortedExpenses = useMemo(() => {
    return [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses]);

  const handleRowClick = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  if (sortedExpenses.length === 0) {
    return (
      <div className="table-container">
        <div className="no-data">暂无开销记录</div>
        <style>{tableStyles}</style>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="expense-table">
        <thead>
          <tr>
            <th>日期</th>
            <th>类别</th>
            <th>金额</th>
            <th>备注</th>
          </tr>
        </thead>
        <tbody>
          {sortedExpenses.map((expense, index) => {
            const category = categoryMap.get(expense.categoryId);
            const isExpanded = expandedId === expense.id;
            const isEven = index % 2 === 0;

            return (
              <React.Fragment key={expense.id}>
                <tr 
                  className={`expense-row ${isExpanded ? 'expanded' : ''}`}
                  style={{ backgroundColor: isEven ? '#FFFFFF' : '#F9F9F9' }}
                  onClick={() => handleRowClick(expense.id)}
                >
                  <td>{formatDate(expense.date)}</td>
                  <td>
                    {category && (
                      <span 
                        className="category-tag"
                        style={{ 
                          backgroundColor: category.color + '20',
                          color: category.color,
                          borderColor: category.color 
                        }}
                      >
                        {category.name}
                      </span>
                    )}
                  </td>
                  <td className="amount">¥{expense.amount.toFixed(2)}</td>
                  <td className="note">{expense.note}</td>
                </tr>
                <tr className="expandable-row">
                  <td colSpan={4}>
                    <div 
                      className="expandable-content"
                      style={{ maxHeight: isExpanded ? '80px' : '0px' }}
                    >
                      <div className="description">
                        <strong>详细描述：</strong>
                        {expense.description || '暂无详细描述'}
                      </div>
                    </div>
                  </td>
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
      <style>{tableStyles}</style>
    </div>
  );
};

const tableStyles = `
  .table-container {
    width: 100%;
    overflow-x: auto;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    background: white;
  }

  .expense-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }

  .expense-table thead th {
    background-color: #2C3E50;
    color: white;
    font-weight: bold;
    padding: 14px 16px;
    text-align: left;
    font-size: 14px;
    position: sticky;
    top: 0;
  }

  .expense-table thead th:first-child {
    border-top-left-radius: 8px;
  }

  .expense-table thead th:last-child {
    border-top-right-radius: 8px;
  }

  .expense-row {
    height: 45px;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .expense-row:hover {
    background-color: #E8F4FD !important;
  }

  .expense-row.expanded {
    background-color: #E8F4FD !important;
  }

  .expense-table td {
    padding: 0 16px;
    font-size: 14px;
    color: #333;
    border-bottom: 1px solid #EEE;
  }

  .category-tag {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
    border: 1px solid;
  }

  .amount {
    font-weight: 600;
    color: #E74C3C !important;
  }

  .note {
    color: #666;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .expandable-row td {
    padding: 0;
    border-bottom: 1px solid #EEE;
  }

  .expandable-content {
    overflow: hidden;
    transition: max-height 0.3s ease-out;
    background-color: #F8F9FA;
  }

  .description {
    padding: 16px;
    font-size: 13px;
    color: #555;
    line-height: 1.6;
  }

  .description strong {
    color: #2C3E50;
    margin-right: 8px;
  }

  .no-data {
    padding: 40px;
    text-align: center;
    color: #999;
    font-size: 16px;
  }

  @media (max-width: 768px) {
    .expense-table {
      font-size: 12px;
    }

    .expense-table thead th,
    .expense-table td {
      padding: 10px 8px;
    }

    .category-tag {
      padding: 2px 6px;
      font-size: 11px;
    }
  }
`;

export default React.memo(ExpenseTable);
