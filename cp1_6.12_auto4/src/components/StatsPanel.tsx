import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Area,
} from 'recharts';
import type { DailySummary, ComparisonItem, CumulativePoint } from '@/types';

const PIE_COLORS = ['#3498DB', '#E67E22', '#2ECC71', '#9B59B6', '#E74C3C', '#1ABC9C'];

interface StatsPanelProps {
  distribution: DailySummary[];
  comparison: ComparisonItem[];
  cumulative: CumulativePoint[];
}

export default function StatsPanel({ distribution, comparison, cumulative }: StatsPanelProps) {
  const pieData = useMemo(() => {
    const byPerson = new Map<string, number>();
    for (const day of distribution) {
      for (const [name, hours] of Object.entries(day.byAssignee)) {
        byPerson.set(name, (byPerson.get(name) || 0) + hours);
      }
    }
    const total = Array.from(byPerson.values()).reduce((s, v) => s + v, 0);
    return Array.from(byPerson.entries()).map(([name, value]) => ({
      name,
      value,
      pct: total > 0 ? ((value / total) * 100).toFixed(1) : '0',
    }));
  }, [distribution]);

  const totalHours = useMemo(
    () => pieData.reduce((s, d) => s + d.value, 0),
    [pieData]
  );

  const isEmpty = pieData.length === 0 && comparison.length === 0 && cumulative.length === 0;

  if (isEmpty) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-md p-6">
              <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-4" />
              <div className="h-[300px] bg-gray-100 rounded-lg animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-white rounded-xl shadow-md p-4 md:p-6">
          <h3 className="font-display text-lg font-semibold text-primary mb-1">工时分布</h3>
          <p className="text-sm text-gray-500 mb-4">按负责人维度的工时占比</p>
          {pieData.length > 0 ? (
            <div className="relative">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="value"
                    stroke="#fff"
                    strokeWidth={2}
                    label={({ name, pct }) => `${name} ${pct}%`}
                    labelLine={true}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '12px',
                    }}
                    formatter={(value: number, _name: string, props: { payload: { pct: string; name: string } }) => [
                      `${value}h (${props.payload.pct}%)`,
                      props.payload.name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{totalHours.toFixed(1)}</div>
                  <div className="text-xs text-gray-500">总工时</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">
              暂无工时数据
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-md p-4 md:p-6">
          <h3 className="font-display text-lg font-semibold text-primary mb-1">工时对比</h3>
          <p className="text-sm text-gray-500 mb-4">每个任务的预估 vs 实际工时</p>
          {comparison.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={comparison} margin={{ top: 5, right: 20, bottom: 60, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="taskName"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  interval={0}
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [`${value}h`]}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="estimated" name="预估工时" fill="#3498DB" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" name="实际工时" fill="#E67E22" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">
              暂无任务数据
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-4 md:p-6">
        <h3 className="font-display text-lg font-semibold text-primary mb-1">累计工时趋势</h3>
        <p className="text-sm text-gray-500 mb-4">工时随日期的累计变化</p>
        {cumulative.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={cumulative} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <defs>
                <linearGradient id="cumulativeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3498DB" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#3498DB" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [`${value}h`, '累计工时']}
              />
              <Area
                type="monotone"
                dataKey="cumulativeHours"
                stroke="#3498DB"
                strokeWidth={2.5}
                fill="url(#cumulativeGradient)"
                name="累计工时"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">
            暂无累计数据
          </div>
        )}
      </div>
    </div>
  );
}
