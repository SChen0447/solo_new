import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useTransactionStore } from '../store/transactionStore';
import { CATEGORY_COLORS, CATEGORIES } from '../types';
import type { Budget, FinanceReport } from '../types';

type TimeDimension = 'week' | 'month' | 'quarter';

function HealthScoreRing({ score }: { score: number }) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 1200;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      start = Math.round(score * eased);
      setAnimatedScore(start);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [score]);

  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedScore / 100) * circumference;
  const hue = (animatedScore / 100) * 120;
  const color = `hsl(${hue}, 70%, 45%)`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width="180" height="180" viewBox="0 0 180 180">
        <circle
          cx="90" cy="90" r={radius}
          fill="none" stroke="#eee" strokeWidth="12"
        />
        <circle
          cx="90" cy="90" r={radius}
          fill="none" stroke={color} strokeWidth="12"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 90 90)"
          style={{ transition: 'stroke 0.3s ease' }}
        />
        <text x="90" y="82" textAnchor="middle" style={{ fontSize: 36, fontWeight: 700, fill: color }}>
          {animatedScore}
        </text>
        <text x="90" y="105" textAnchor="middle" style={{ fontSize: 13, fill: '#999' }}>
          财务健康评分
        </text>
      </svg>
    </div>
  );
}

function BudgetProgress({ budgets, transactions }: { budgets: Budget[]; transactions: any[] }) {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthExpenses = transactions.filter((t) => t.type === 'expense' && t.date.startsWith(monthKey));
  const categorySpend = new Map<string, number>();
  for (const t of monthExpenses) {
    categorySpend.set(t.category, (categorySpend.get(t.category) || 0) + t.amount);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {budgets.filter((b) => b.amount > 0).map((b) => {
        const spent = categorySpend.get(b.category) || 0;
        const pct = Math.min((spent / b.amount) * 100, 100);
        const barColor = pct > 80 ? '#e74c3c' : pct > 50 ? '#f39c12' : '#2ecc71';
        return (
          <div key={b.category}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
              <span style={{ fontWeight: 500 }}>{b.category}</span>
              <span style={{ color: '#999' }}>¥{spent.toFixed(0)} / ¥{b.amount.toFixed(0)}</span>
            </div>
            <div style={{ background: '#eee', borderRadius: 6, height: 8, overflow: 'hidden' }}>
              <div style={{
                width: `${pct}%`,
                height: '100%',
                background: barColor,
                borderRadius: 6,
                transition: 'width 0.6s ease, background 0.3s ease',
              }} />
            </div>
          </div>
        );
      })}
      {budgets.filter((b) => b.amount > 0).length === 0 && (
        <div style={{ color: '#999', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
          暂未设置预算，请前往预算设置
        </div>
      )}
    </div>
  );
}

function BudgetEditor({ budgets, onUpdate }: { budgets: Budget[]; onUpdate: (b: Budget[]) => void }) {
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const v: Record<string, string> = {};
    for (const b of budgets) {
      v[b.category] = String(b.amount);
    }
    setValues(v);
  }, [budgets]);

  const handleSave = () => {
    const updated = CATEGORIES.map((c) => ({
      category: c,
      amount: Number(values[c] || 0),
    }));
    onUpdate(updated);
    setEditing(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600 }}>预算进度</h3>
        <button
          className={editing ? 'btn-primary' : 'btn-secondary'}
          style={{ fontSize: 12, padding: '6px 14px' }}
          onClick={editing ? handleSave : () => setEditing(true)}
        >
          {editing ? '保存预算' : '设置预算'}
        </button>
      </div>
      {editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {CATEGORIES.map((c) => (
            <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 60, fontSize: 13, fontWeight: 500, color: CATEGORY_COLORS[c] || '#666' }}>{c}</span>
              <input
                type="number"
                placeholder="0"
                value={values[c] || ''}
                onChange={(e) => setValues({ ...values, [c]: e.target.value })}
                style={{ flex: 1, padding: '6px 10px', fontSize: 13 }}
              />
              <span style={{ fontSize: 12, color: '#999' }}>元/月</span>
            </div>
          ))}
        </div>
      ) : (
        <BudgetProgress budgets={budgets} transactions={useTransactionStore.getState().transactions} />
      )}
    </div>
  );
}

export default function Dashboard() {
  const { transactions, budgets, report, generateReport, exportPDF, updateBudgets } = useTransactionStore();
  const [timeDim, setTimeDim] = useState<TimeDimension>('month');
  const [drillCategory, setDrillCategory] = useState<string | null>(null);
  const [localReport, setLocalReport] = useState<FinanceReport | null>(null);

  useEffect(() => {
    generateReport();
  }, [generateReport]);

  useEffect(() => {
    if (report) setLocalReport(report);
  }, [report]);

  const trendData = useMemo(() => {
    const expenses = transactions.filter((t) => t.type === 'expense');
    const grouped = new Map<string, number>();

    for (const t of expenses) {
      let key: string;
      const d = new Date(t.date);
      if (timeDim === 'week') {
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        key = weekStart.toISOString().slice(0, 10);
      } else if (timeDim === 'quarter') {
        const quarter = Math.floor(d.getMonth() / 3) + 1;
        key = `${d.getFullYear()}-Q${quarter}`;
      } else {
        key = t.date.slice(0, 7);
      }
      grouped.set(key, (grouped.get(key) || 0) + t.amount);
    }

    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, total]) => ({ name: key, 总支出: Math.round(total) }));
  }, [transactions, timeDim]);

  const stackedData = useMemo(() => {
    const expenses = transactions.filter((t) => t.type === 'expense');
    const grouped = new Map<string, Map<string, number>>();

    for (const t of expenses) {
      let key: string;
      const d = new Date(t.date);
      if (timeDim === 'week') {
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        key = weekStart.toISOString().slice(0, 10);
      } else if (timeDim === 'quarter') {
        const quarter = Math.floor(d.getMonth() / 3) + 1;
        key = `${d.getFullYear()}-Q${quarter}`;
      } else {
        key = t.date.slice(0, 7);
      }

      if (!grouped.has(key)) grouped.set(key, new Map());
      const catMap = grouped.get(key)!;
      catMap.set(t.category, (catMap.get(t.category) || 0) + t.amount);
    }

    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, catMap]) => {
        const entry: Record<string, string | number> = { name: key };
        for (const [cat, amount] of catMap) {
          entry[cat] = Math.round(amount);
        }
        return entry;
      });
  }, [transactions, timeDim]);

  const drillTransactions = useMemo(() => {
    if (!drillCategory) return [];
    return transactions.filter((t) => t.category === drillCategory && t.type === 'expense');
  }, [drillCategory, transactions]);

  const handleBarClick = useCallback((data: any) => {
    if (data?.activePayload?.length) {
      const category = data.activePayload[0]?.dataKey;
      if (category && category !== 'name') {
        setDrillCategory(category);
      }
    }
  }, []);

  const handleExportPDF = useCallback(() => {
    if (!localReport) return;
    const html = `
      <html><head><style>
        body { font-family: 'Inter', sans-serif; padding: 20px; color: #2c3e50; }
        h1 { color: #2ecc71; } h2 { color: #34495e; margin-top: 24px; }
        .score { font-size: 48px; font-weight: 700; color: hsl(${localReport.score * 1.2}, 70%, 45%); }
        .metric { margin: 8px 0; font-size: 16px; }
        .suggestion { margin: 6px 0; padding: 8px 12px; background: #f8f9fa; border-radius: 8px; }
      </style></head><body>
        <h1>💰 个人财务健康报告</h1>
        <p>生成时间：${new Date(localReport.generatedAt).toLocaleString('zh-CN')}</p>
        <div class="score">${localReport.score} 分</div>
        <h2>关键指标</h2>
        <div class="metric">总支出：¥${localReport.totalExpense.toFixed(2)}</div>
        <div class="metric">总收入：¥${localReport.totalIncome.toFixed(2)}</div>
        <div class="metric">储蓄率：${localReport.savingsRate}%</div>
        <div class="metric">预算遵守率：${localReport.budgetAdherenceRate}%</div>
        <div class="metric">消费稳定性：${localReport.stabilityScore}%</div>
        <h2>个性化建议</h2>
        ${localReport.suggestions.map((s) => `<div class="suggestion">${s}</div>`).join('')}
      </body></html>
    `;
    exportPDF(html);
  }, [localReport, exportPDF]);

  const usedCategories = useMemo(() => {
    const cats = new Set<string>();
    for (const t of transactions.filter((t) => t.type === 'expense')) {
      cats.add(t.category);
    }
    return Array.from(cats);
  }, [transactions]);

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>📊 仪表盘</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <BudgetEditor budgets={budgets} onUpdate={updateBudgets} />
          </div>

          <div className="card" style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>财务健康评分</h3>
            <HealthScoreRing score={localReport?.score || 0} />
            {localReport && (
              <div style={{ marginTop: 16, textAlign: 'left', fontSize: 13 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ padding: '8px 12px', background: '#f8f9fa', borderRadius: 8 }}>
                    <div style={{ color: '#999' }}>储蓄率</div>
                    <div style={{ fontWeight: 600 }}>{localReport.savingsRate}%</div>
                  </div>
                  <div style={{ padding: '8px 12px', background: '#f8f9fa', borderRadius: 8 }}>
                    <div style={{ color: '#999' }}>预算遵守率</div>
                    <div style={{ fontWeight: 600 }}>{localReport.budgetAdherenceRate}%</div>
                  </div>
                  <div style={{ padding: '8px 12px', background: '#f8f9fa', borderRadius: 8 }}>
                    <div style={{ color: '#999' }}>消费稳定性</div>
                    <div style={{ fontWeight: 600 }}>{localReport.stabilityScore}%</div>
                  </div>
                  <div style={{ padding: '8px 12px', background: '#f8f9fa', borderRadius: 8 }}>
                    <div style={{ color: '#999' }}>总收入</div>
                    <div style={{ fontWeight: 600 }}>¥{localReport.totalIncome.toFixed(0)}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {localReport && localReport.suggestions.length > 0 && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600 }}>个性化建议</h3>
                <button className="btn-primary hover-lift" style={{ fontSize: 12, padding: '6px 14px' }} onClick={handleExportPDF}>
                  📄 导出PDF
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {localReport.suggestions.map((s, i) => (
                  <div key={i} style={{ padding: '10px 14px', background: '#f8f9fa', borderRadius: 8, fontSize: 13, lineHeight: 1.6 }}>
                    <span style={{ color: '#2ecc71', fontWeight: 600, marginRight: 6 }}>{i + 1}.</span>
                    {s}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>消费趋势</h3>
              <div style={{ display: 'flex', gap: 4 }}>
                {(['week', 'month', 'quarter'] as TimeDimension[]).map((dim) => (
                  <button
                    key={dim}
                    className={timeDim === dim ? 'btn-primary' : 'btn-secondary'}
                    style={{ fontSize: 12, padding: '4px 12px' }}
                    onClick={() => setTimeDim(dim)}
                  >
                    {dim === 'week' ? '周' : dim === 'month' ? '月' : '季度'}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number) => [`¥${value}`, '总支出']}
                  contentStyle={{ borderRadius: 8, border: '1px solid #eee' }}
                />
                <Line
                  type="monotone"
                  dataKey="总支出"
                  stroke="#2ecc71"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#2ecc71' }}
                  activeDot={{ r: 6 }}
                  animationDuration={800}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>分类占比</h3>
              {drillCategory && (
                <button className="btn-secondary" style={{ fontSize: 12, padding: '4px 12px' }} onClick={() => setDrillCategory(null)}>
                  ← 返回
                </button>
              )}
            </div>
            {!drillCategory ? (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={stackedData} onClick={handleBarClick}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #eee' }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {usedCategories.map((cat) => (
                    <Bar
                      key={cat}
                      dataKey={cat}
                      stackId="a"
                      fill={CATEGORY_COLORS[cat] || '#95a5a6'}
                      animationDuration={800}
                      style={{ cursor: 'pointer' }}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div>
                <div style={{ marginBottom: 12, fontSize: 14, fontWeight: 500 }}>
                  「{drillCategory}」分类交易明细
                </div>
                <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {drillTransactions.length === 0 ? (
                    <div style={{ color: '#999', textAlign: 'center', padding: 20 }}>暂无记录</div>
                  ) : (
                    drillTransactions.map((t) => (
                      <div key={t.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '8px 12px', background: '#f8f9fa', borderRadius: 8, fontSize: 13,
                      }}>
                        <div>
                          <span style={{ fontWeight: 500 }}>{t.note || '无备注'}</span>
                          <span style={{ color: '#999', marginLeft: 8 }}>{t.date}</span>
                        </div>
                        <span style={{ fontWeight: 600, color: '#e74c3c' }}>¥{t.amount.toFixed(2)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
