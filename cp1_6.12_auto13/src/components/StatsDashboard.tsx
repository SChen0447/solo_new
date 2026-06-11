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
} from 'recharts';
import type { StatsData } from '../types';

interface StatsDashboardProps {
  stats: StatsData | null;
}

const BAR_COLORS = ['#FF6B35', '#F7931E', '#FF4444', '#CC3333'];
const PIE_COLORS = ['#4A90D9', '#50C878', '#F5C542', '#9B59B6', '#E67E22'];

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
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis dataKey="questionTitle" tick={{ fontSize: 13 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 13 }} unit="%" />
            <Tooltip formatter={(value: number) => [`${value}%`, '正确率']} />
            <Legend />
            <Line
              type="monotone"
              dataKey="correctRate"
              stroke="#4A90D9"
              strokeWidth={3}
              dot={{ fill: '#4A90D9', r: 5 }}
              activeDot={{ r: 7 }}
              name="正确率"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {stats.questionStats.map((qs) => {
        const barData = qs.options.map((opt, i) => ({
          name: `${String.fromCharCode(65 + i)}. ${opt.length > 8 ? opt.slice(0, 8) + '…' : opt}`,
          fullName: opt,
          count: qs.optionDistribution[i] || 0,
        }));

        const totalForPie = Object.values(qs.optionDistribution).reduce((a, b) => a + b, 0);
        const pieData = qs.options.map((opt, i) => ({
          name: `${String.fromCharCode(65 + i)}`,
          value: qs.optionDistribution[i] || 0,
        })).filter((d) => d.value > 0);

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
                正确率：<strong className={qs.correctRate >= 60 ? 'text-green' : 'text-red'}>{qs.correctRate}%</strong>
              </span>
            </div>
            <div className="charts-row">
              <div className="chart-half">
                <h4>选项分布（柱状图）</h4>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value: number, _name: string, props: { payload: { fullName: string } }) => [
                        value,
                        props.payload.fullName,
                      ]}
                    />
                    <Bar dataKey="count" name="选择人数" radius={[4, 4, 0, 0]}>
                      {barData.map((_, index) => (
                        <Cell key={index} fill={BAR_COLORS[index % BAR_COLORS.length]} />
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
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={{ strokeWidth: 1 }}
                      >
                        {pieData.map((_, index) => (
                          <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
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
