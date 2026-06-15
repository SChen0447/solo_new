import React, { useState, useEffect, useMemo } from 'react';
import { useSalesStore } from '../../stores/salesStore';
import { useInventoryStore } from '../../stores/inventoryStore';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const PIE_COLORS = ['#c75b39', '#8d6e63', '#a1887f', '#d7ccc8', '#bcaaa4', '#795548', '#6d4c41', '#5d4037'];

const ReportModule: React.FC = () => {
  const { reportData, loading, fetchReport } = useSalesStore();
  const { items, fetchInventory } = useInventoryStore();

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [chartReady, setChartReady] = useState(false);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  useEffect(() => {
    if (useCustom && customStart && customEnd) {
      fetchReport(undefined, customStart, customEnd);
    } else {
      fetchReport(selectedMonth);
    }
    setChartReady(false);
    const timer = setTimeout(() => setChartReady(true), 500);
    return () => clearTimeout(timer);
  }, [selectedMonth, useCustom, customStart, customEnd, fetchReport]);

  const monthlyStats = useMemo(() => {
    if (!reportData) return null;
    return {
      totalSales: reportData.totalSales,
      totalCost: reportData.totalCost,
      totalProfit: reportData.totalProfit,
    };
  }, [reportData]);

  const topProducts = useMemo(() => {
    if (!reportData) return [];
    return reportData.topProducts || [];
  }, [reportData]);

  const materialRanking = useMemo(() => {
    if (!reportData) return [];
    return reportData.materialConsumption || [];
  }, [reportData]);

  const weeklyChartData = useMemo(() => {
    if (!reportData) return [];
    return (reportData.weeklySales || []).map((w) => ({
      name: w.week,
      销售额: w.total_sales,
    }));
  }, [reportData]);

  const pieChartData = useMemo(() => {
    if (!reportData) return [];
    return (reportData.materialConsumption || []).map((m) => ({
      name: m.material_name,
      value: m.total_consumed,
    }));
  }, [reportData]);

  const handleExportCSV = () => {
    if (!reportData) return;

    const header = '作品名称,售价,材料消耗明细,利润,创建时间\n';
    const rows = reportData.products.map((p) => {
      const pConsumptions = reportData.consumptions.filter((c) => c.product_id === p.id);
      const materialDetail = pConsumptions
        .map((c) => {
          const matItem = items.find((i) => i.id === c.inventory_id);
          return `${matItem?.name || c.inventory_id}×${c.quantity_consumed}`;
        })
        .join('; ');
      const cost = pConsumptions.reduce((sum, c) => {
        const matItem = items.find((i) => i.id === c.inventory_id);
        return sum + c.quantity_consumed * (matItem?.unit_cost || 0);
      }, 0);
      const profit = p.price - cost;
      return `"${p.name}",${p.price.toFixed(2)},"${materialDetail}",${profit.toFixed(2)},${new Date(p.created_at).toLocaleDateString('zh-CN')}`;
    });

    const csvContent = '\uFEFF' + header + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateRange = useCustom ? `${customStart}_${customEnd}` : selectedMonth;
    link.download = `销售报表_${dateRange}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const monthOptions = useMemo(() => {
    const opts = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      opts.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return opts;
  }, []);

  return (
    <div className="module-container fade-in">
      <div className="module-header">
        <h2>销售报表</h2>
        <button className="btn btn-primary" onClick={handleExportCSV} disabled={!reportData}>
          导出CSV
        </button>
      </div>

      <div className="filter-bar">
        <div className="filter-group">
          <label>
            <input
              type="radio"
              name="dateMode"
              checked={!useCustom}
              onChange={() => setUseCustom(false)}
            />{' '}
            按月份
          </label>
          <select
            className="input-field"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            disabled={useCustom}
          >
            {monthOptions.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>
            <input
              type="radio"
              name="dateMode"
              checked={useCustom}
              onChange={() => setUseCustom(true)}
            />{' '}
            自定义范围
          </label>
          <input
            type="date"
            className="input-field"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            disabled={!useCustom}
          />
          <span className="filter-sep">至</span>
          <input
            type="date"
            className="input-field"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            disabled={!useCustom}
          />
        </div>
      </div>

      {loading && <div className="loading-text">加载中...</div>}

      {monthlyStats && (
        <div className="stats-cards">
          <div className="stat-card card">
            <div className="stat-value">¥{monthlyStats.totalSales.toFixed(2)}</div>
            <div className="stat-label">销售总额</div>
          </div>
          <div className="stat-card card">
            <div className="stat-value">¥{monthlyStats.totalProfit.toFixed(2)}</div>
            <div className="stat-label">利润总额</div>
          </div>
          <div className="stat-card card">
            <div className="stat-value">¥{monthlyStats.totalCost.toFixed(2)}</div>
            <div className="stat-label">材料成本</div>
          </div>
        </div>
      )}

      <div className="report-tables">
        <div className="card table-card">
          <h3>销量前5作品</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>排名</th>
                <th>作品名称</th>
                <th>售价</th>
                <th>销量</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.length === 0 ? (
                <tr><td colSpan={4} className="empty-row">暂无数据</td></tr>
              ) : (
                topProducts.map((p, idx) => (
                  <tr key={idx} className={idx % 2 === 1 ? 'zebra-row' : ''}>
                    <td>{idx + 1}</td>
                    <td>{p.name}</td>
                    <td>¥{p.price.toFixed(2)}</td>
                    <td>{p.sales_count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="card table-card">
          <h3>材料消耗排行</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>排名</th>
                <th>材料名称</th>
                <th>消耗量</th>
                <th>单位</th>
              </tr>
            </thead>
            <tbody>
              {materialRanking.length === 0 ? (
                <tr><td colSpan={4} className="empty-row">暂无数据</td></tr>
              ) : (
                materialRanking.map((m, idx) => (
                  <tr key={idx} className={idx % 2 === 1 ? 'zebra-row' : ''}>
                    <td>{idx + 1}</td>
                    <td>{m.material_name}</td>
                    <td>{m.total_consumed.toFixed(2)}</td>
                    <td>{m.unit}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="charts-row">
        <div className="chart-container card">
          <h4>每周销售额</h4>
          {!chartReady ? (
            <div className="skeleton skeleton-bar" />
          ) : weeklyChartData.length === 0 ? (
            <div className="chart-placeholder">暂无数据</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0d5cc" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#8d6e63" />
                <YAxis tick={{ fontSize: 11 }} stroke="#8d6e63" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#faf0e6',
                    border: '1px solid #d7ccc8',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="销售额" fill="#c75b39" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="chart-container card">
          <h4>材料消耗比例</h4>
          {!chartReady ? (
            <div className="skeleton skeleton-pie" />
          ) : pieChartData.length === 0 ? (
            <div className="chart-placeholder">暂无数据</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {pieChartData.map((_entry, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#faf0e6',
                    border: '1px solid #d7ccc8',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportModule;
