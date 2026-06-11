import { useMemo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, ResponsiveContainer, Area } from 'recharts';
import type { DailySummary, ComparisonItem, CumulativePoint } from '@/types';

interface StatsPanelProps {
  distribution: DailySummary[];
  comparison: ComparisonItem[];
  cumulative: CumulativePoint[];
}

const PIE_COLORS = ['#3498DB', '#E67E22', '#2ECC71', '#9B59B6', '#E74C3C', '#1ABC9C'];

export default function StatsPanel({ distribution, comparison, cumulative }: StatsPanelProps) {
  const pieData = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const day of distribution) {
      for (const [name, hours] of Object.entries(day.byAssignee)) {
        totals[name] = (totals[name] ?? 0) + hours;
      }
    }
    return Object.entries(totals).map(([name, value]) => ({ name, value }));
  }, [distribution]);

  const isEmpty = pieData.length === 0 && comparison.length === 0 && cumulative.length === 0;

  const Skeleton = () => (
    <div className="h-[300px] w-full animate-pulse bg-gray-100 rounded-lg" />
  );

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="font-display text-lg font-semibold text-primary mb-1">
            Work Hours Distribution
          </h3>
          <p className="text-sm text-gray-500 mb-4">Total hours worked per team member</p>
          {isEmpty ? (
            <Skeleton />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, _name, { payload }) => {
                    const total = pieData.reduce((sum, d) => sum + d.value, 0);
                    const percent = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                    return [`${value.toFixed(1)}h (${percent}%)`, payload.name];
                  }}
                  contentStyle={{
                    backgroundColor: 'white',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                    borderRadius: '0.5rem',
                    padding: '0.5rem',
                    fontSize: '0.75rem',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="font-display text-lg font-semibold text-primary mb-1">
            Estimated vs Actual Hours
          </h3>
          <p className="text-sm text-gray-500 mb-4">Task-by-task comparison of estimates</p>
          {isEmpty ? (
            <Skeleton />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={comparison} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="taskName"
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  tick={{ fontSize: 11 }}
                  interval={0}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number, name) => [
                    `${value.toFixed(1)}h`,
                    name === 'estimated' ? 'Estimated' : 'Actual'
                  ]}
                  contentStyle={{
                    backgroundColor: 'white',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                    borderRadius: '0.5rem',
                    padding: '0.5rem',
                    fontSize: '0.75rem',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '0.75rem', paddingTop: '1rem' }} />
                <Bar dataKey="estimated" fill="#3498DB" name="Estimated" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" fill="#E67E22" name="Actual" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="font-display text-lg font-semibold text-primary mb-1">
          Cumulative Hours Over Time
        </h3>
        <p className="text-sm text-gray-500 mb-4">Running total of hours worked across all tasks</p>
        {isEmpty ? (
          <Skeleton />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={cumulative} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <defs>
                <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3498DB" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3498DB" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(1)}h`, 'Cumulative Total']}
                labelFormatter={(label) => `Date: ${label}`}
                contentStyle={{
                  backgroundColor: 'white',
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                  borderRadius: '0.5rem',
                  padding: '0.5rem',
                  fontSize: '0.75rem',
                }}
              />
              <Area
                type="monotone"
                dataKey="cumulativeHours"
                stroke="#3498DB"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorCumulative)"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
