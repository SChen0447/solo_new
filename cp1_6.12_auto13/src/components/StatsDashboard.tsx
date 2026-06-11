import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { StatsData } from '../types';

interface StatsDashboardProps {
  stats: StatsData | null;
}

const PIE_COLORS = ['#4A90D9', '#50C878', '#F5C542', '#9B59B6', '#E67E22'];

function BarGradient({ id, index }: { id: string; index: number }) {
  const hueStart = 30;
  const hueEnd = 0;
  const satStart = 100;
  const satEnd = 86;
  const lightStart = 60;
  const lightEnd = 52;
  const offset = (index * 10) % 30;

  const color1 = `hsl(${hueStart - offset}, ${satStart}%, ${lightStart}%)`;
  const color2 = `hsl(${hueEnd - offset}, ${satEnd}%, ${lightEnd}%)`;

  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color1} />
        <stop offset="100%" stopColor={color2} />
      </linearGradient>
    </defs>
  );
}

function StatsDashboard({ stats }: StatsDashboardProps) {
  if (!stats || stats.totalAnswers === 0) {
    return (
      <div className="stats-dashboard card">
        <div className="no-data">
          <p>暂无答题数据，等待学员提交答案后显示统计。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="stats-dashboard">
      <div className="stats-overview">
        <div className="stat-card card">
          <div className="stat-value">{stats.totalAnswers}</div>
          <div className="stat-label">总作答次数</div>
        </div>
        <div className="stat-card card">
          <div className="stat-value">{stats.totalCorrect}</div>
          <div className="stat-label">正确次数</div>
        </div>
        <div className="stat-card card">
          <div className="stat-value">{stats.overallRate}%</div>
          <div className="stat-label">整体正确率</div>
        </div>
      </div>

      <div className="stats-chart card">
        <h3>各题正确率走势</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={stats.correctRateTrend}>
            <defs>
              <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#0ea5e9" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis dataKey="questionTitle" tick={{ fontSize: 13 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 13 }} unit="%" />
            <Tooltip formatter={(value: number) => [`${value}%`, '正确率']} />
            <Legend />
            <ReferenceLine y={60} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: '及格线', position: 'insideTopRight', fontSize: 12, fill: '#f59e0b' }} />
            <Line
              type="monotone"
              dataKey="correctRate"
              stroke="url(#lineGradient)"
              strokeWidth={3}
              dot={{ fill: '#0ea5e9', r: 5, strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 7, fill: '#10b981' }}
              name="正确率"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {stats.questionStats.map((qs) => {
        const barData = qs.options.map((opt, i) => ({
          name: `${String.fromCharCode(65 + i)}. ${opt.length > 10 ? opt.slice(0, 10) + '…' : opt}`,
          fullName: opt,
          count: qs.optionDistribution[i] || 0,
        }));

        const totalForPie = Object.values(qs.optionDistribution).reduce((a, b) => a + b, 0);
        const pieData = qs.options
          .map((opt, i) => ({
            name: `${String.fromCharCode(65 + i)}`,
            value: qs.optionDistribution[i] || 0,
            label: opt,
          }))
          .filter((d) => d.value > 0);

        return (
          <div key={qs.questionId} className="stats-chart card">
            <h3>
              第{qs.questionIndex + 1}题：{qs.questionTitle}
            </h3>
            <div className="chart-stats-row">
              <span className="chart-stat">
                作答人数：<strong>{qs.totalAnswers}</strong>
              </span>
              <span className="chart-stat">
                正确率：
                <strong className={qs.correctRate >= 60 ? 'text-green' : 'text-red'}>
                  {qs.correctRate}%
                </strong>
              </span>
            </div>
            <div className="charts-row">
              <div className="chart-half">
                <h4>选项分布（柱状图）</h4>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={barData} barCategoryGap="30%">
                    {barData.map((_, i) => (
                      <BarGradient key={i} id={`barGrad-${qs.questionId}-${i}`} index={i} />
                    ))}
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value: number, _name: string, props: { payload: { fullName: string } }) => [
                        value,
                        props.payload.fullName,
                      ]}
                    />
                    <Bar dataKey="count" name="选择人数" radius={[6, 6, 0, 0]}>
                      {barData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={`url(#barGrad-${qs.questionId}-${index})`}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {totalForPie > 0 && (
                <div className="chart-half">
                  <h4>选项占比（饼图）</h4>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        outerRadius={78}
                        innerRadius={36}
                        dataKey="value"
                        label={({ name, value, percent }) =>
                          `${name} ${value}人 (${(percent * 100).toFixed(0)}%)`
                        }
                        labelLine={{ strokeWidth: 1, stroke: '#94a3b8' }}
                        stroke="#ffffff"
                        strokeWidth={2}
                        paddingAngle={2}
                      >
                        {pieData.map((_, index) => (
                          <Cell key={`pie-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number, _name: string, props: { payload: { label: string } }) => [
                          `${value}人`,
                          props.payload.label,
                        ]}
                      />
                      <Legend
                        formatter={(value, entry: { payload?: { label?: string } }) => {
                          const label = entry?.payload?.label || value;
                          return `${value}: ${label.length > 6 ? label.slice(0, 6) + '…' : label}`;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default StatsDashboard;
