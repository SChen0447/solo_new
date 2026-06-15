import React, { useState, useEffect, useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { useDataStore } from '../dataStore';
import { CATEGORY_COLORS, BudgetCategory } from '../types';

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  summaryCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px'
  },
  card: {
    backgroundColor: '#16213e',
    borderRadius: '4px',
    border: '1px solid rgba(255,255,255,0.1)',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  cardTitle: {
    fontSize: '13px',
    color: '#888',
    fontWeight: 500
  },
  cardValue: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#e0e0e0',
    transition: 'transform 0.5s ease'
  },
  cardValueGreen: {
    color: '#2ecc71'
  },
  cardValueRed: {
    color: '#e94560'
  },
  cardValueBlue: {
    color: '#3498db'
  },
  changeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px'
  },
  changeUp: {
    color: '#2ecc71'
  },
  changeDown: {
    color: '#e94560'
  },
  chartsRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1.5fr',
    gap: '16px'
  },
  chartCard: {
    backgroundColor: '#16213e',
    borderRadius: '4px',
    border: '1px solid rgba(255,255,255,0.1)',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    minHeight: '320px'
  },
  chartTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#e0e0e0'
  },
  chartContainer: {
    flex: 1,
    minHeight: '260px'
  },
  legendList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '12px',
    maxHeight: '180px',
    overflowY: 'auto' as const
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '13px',
    color: '#c0c0c0',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '4px',
    transition: 'background-color 0.2s'
  },
  legendDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    flexShrink: 0
  },
  legendName: {
    flex: 1
  },
  legendValue: {
    color: '#888',
    fontSize: '12px'
  },
  drilldownInfo: {
    fontSize: '12px',
    color: '#888',
    fontStyle: 'italic',
    marginTop: '8px'
  },
  mobileCategoryGrid: {
    display: 'none',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginTop: '12px'
  },
  mobileCategoryItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    color: '#c0c0c0',
    padding: '8px',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: '4px'
  },
  mobileCategoryIcon: {
    width: '8px',
    height: '8px',
    borderRadius: '50%'
  }
};

function SummaryCard({
  title,
  value,
  change,
  colorClass,
  animKey
}: {
  title: string;
  value: string;
  change: number;
  colorClass: string;
  animKey: number;
}) {
  const isPositive = change >= 0;

  return (
    <div style={styles.card}>
      <span style={styles.cardTitle}>{title}</span>
      <span
        key={animKey}
        style={{
          ...styles.cardValue,
          ...(colorClass === 'green' ? styles.cardValueGreen : {}),
          ...(colorClass === 'red' ? styles.cardValueRed : {}),
          ...(colorClass === 'blue' ? styles.cardValueBlue : {})
        }}
      >
        {value}
      </span>
      <div style={styles.changeRow}>
        <span style={isPositive ? styles.changeUp : styles.changeDown}>
          {isPositive ? '▲' : '▼'}
        </span>
        <span style={isPositive ? styles.changeUp : styles.changeDown}>
          {Math.abs(change).toFixed(1)}%
        </span>
        <span style={{ color: '#666', fontSize: '12px' }}>较上月</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { getMonthlySummary, getCategoryExpenses, getDailyTrends, transactions } = useDataStore();
  const [animKey, setAnimKey] = useState(0);
  const [drilldownCategory, setDrilldownCategory] = useState<BudgetCategory | null>(null);

  const summary = useMemo(() => getMonthlySummary(), [getMonthlySummary, transactions.length]);
  const categoryExpenses = useMemo(() => getCategoryExpenses(), [getCategoryExpenses, transactions.length]);
  const dailyTrends = useMemo(() => getDailyTrends(7), [getDailyTrends, transactions.length]);

  useEffect(() => {
    setAnimKey(prev => prev + 1);
  }, [summary.totalIncome, summary.totalExpense, summary.balance]);

  const pieData = categoryExpenses.map(c => ({
    name: c.category,
    value: c.amount,
    percentage: c.percentage
  }));

  const lineData = dailyTrends.map(d => ({
    date: d.date.slice(5),
    收入: d.income,
    支出: d.expense
  }));

  const handlePieClick = (entry: { name: string }) => {
    setDrilldownCategory(prev =>
      prev === entry.name ? null : (entry.name as BudgetCategory)
    );
  };

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: '#16213e',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '4px',
          padding: '10px 14px',
          color: '#e0e0e0',
          fontSize: '13px'
        }}>
          <p style={{ margin: '0 0 6px', fontWeight: 600 }}>{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ margin: '4px 0', color: entry.color }}>
              {entry.name}: ¥{entry.value.toFixed(2)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={styles.container}>
      <div style={styles.summaryCards} data-dashboard-summary>
        <SummaryCard
          title="本月总收入"
          value={`¥${summary.totalIncome.toFixed(2)}`}
          change={summary.incomeChange}
          colorClass="green"
          animKey={animKey}
        />
        <SummaryCard
          title="本月总支出"
          value={`¥${summary.totalExpense.toFixed(2)}`}
          change={summary.expenseChange}
          colorClass="red"
          animKey={animKey}
        />
        <SummaryCard
          title="本月结余"
          value={`¥${summary.balance.toFixed(2)}`}
          change={summary.balanceChange}
          colorClass="blue"
          animKey={animKey}
        />
      </div>

      <div style={styles.chartsRow} data-charts-row>
        <div style={styles.chartCard}>
          <span style={styles.chartTitle}>支出类别占比</span>
          <div style={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius="55%"
                  outerRadius="80%"
                  paddingAngle={2}
                  dataKey="value"
                  onClick={handlePieClick}
                  style={{ cursor: 'pointer' }}
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CATEGORY_COLORS[entry.name as BudgetCategory]}
                      opacity={drilldownCategory && drilldownCategory !== entry.name ? 0.4 : 1}
                    />
                  ))}
                </Pie>
                <Tooltip content={customTooltip} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div style={styles.legendList}>
            {pieData.map(item => (
              <div
                key={item.name}
                style={{
                  ...styles.legendItem,
                  backgroundColor: drilldownCategory === item.name ? 'rgba(255,255,255,0.08)' : undefined
                }}
                onClick={() => handlePieClick(item as any)}
              >
                <span
                  style={{
                    ...styles.legendDot,
                    backgroundColor: CATEGORY_COLORS[item.name as BudgetCategory]
                  }}
                />
                <span style={styles.legendName}>{item.name}</span>
                <span style={styles.legendValue}>
                  ¥{item.value.toFixed(0)} ({item.percentage.toFixed(1)}%)
                </span>
              </div>
            ))}
          </div>

          {drilldownCategory && (
            <p style={styles.drilldownInfo}>
              已选中「{drilldownCategory}」，再次点击取消筛选
            </p>
          )}
        </div>

        <div style={styles.chartCard}>
          <span style={styles.chartTitle}>最近7天收支趋势</span>
          <div style={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="date"
                  stroke="#666"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#666"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `¥${value}`}
                />
                <Tooltip content={customTooltip} />
                <Legend
                  wrapperStyle={{ fontSize: '13px', paddingTop: '10px' }}
                  iconType="circle"
                />
                <Line
                  type="monotone"
                  dataKey="收入"
                  stroke="#2ecc71"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#2ecc71' }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="支出"
                  stroke="#e94560"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#e94560' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
