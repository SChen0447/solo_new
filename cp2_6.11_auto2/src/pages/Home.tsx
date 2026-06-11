import { useEffect } from 'react';
import { Layers, Users, Trophy } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAppStore } from '../store';
import type { DashboardData } from '../store';

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}/${day}`;
}

function StatCardSkeleton({ delay }: { delay: string }) {
  return (
    <div
      className="bg-white rounded-2xl p-6 fade-in"
      style={{ animationDelay: delay }}
    >
      <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse mb-4" />
      <div className="h-8 bg-gray-200 rounded animate-pulse w-1/2 mb-2" />
      <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-6 fade-in" style={{ animationDelay: '0.4s' }}>
      <div className="h-6 bg-gray-200 rounded animate-pulse w-1/3 mb-4" />
      <div className="h-72 bg-gray-100 rounded-lg animate-pulse" />
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  delay: string;
}

function StatCard({ icon, value, label, delay }: StatCardProps) {
  return (
    <div
      className="bg-white rounded-2xl p-6 card-hover fade-in"
      style={{
        animationDelay: delay,
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      }}
    >
      <div className="text-accent mb-3" style={{ width: 32, height: 32 }}>
        {icon}
      </div>
      <div className="text-3xl font-bold text-primary">{value}</div>
      <div className="text-sm text-gray-500 mt-2">{label}</div>
    </div>
  );
}

interface ChartCardProps {
  weeklyStats: DashboardData['weeklyStats'];
}

function ChartCard({ weeklyStats }: ChartCardProps) {
  const chartData = weeklyStats.map((item) => ({
    ...item,
    formattedDate: formatDate(item.date),
  }));

  return (
    <div
      className="bg-white rounded-2xl p-6 card-hover fade-in"
      style={{
        animationDelay: '0.4s',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      }}
    >
      <h2 className="text-lg font-semibold mb-4 text-primary">近7天学习时长</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis
            dataKey="formattedDate"
            tick={{ fill: '#666', fontSize: 12 }}
            axisLine={{ stroke: '#e0e0e0' }}
          />
          <YAxis
            label={{ value: '分钟', angle: -90, position: 'insideLeft', fill: '#666', fontSize: 12 }}
            tick={{ fill: '#666', fontSize: 12 }}
            axisLine={{ stroke: '#e0e0e0' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            }}
            labelStyle={{ color: '#1a237e', fontWeight: 500 }}
            formatter={(value: number) => [`${value} 分钟`, '学习时长']}
          />
          <Line
            type="monotone"
            dataKey="minutes"
            stroke="#ff6f00"
            strokeWidth={3}
            dot={{ fill: '#1a237e', r: 5 }}
            activeDot={{ r: 7, fill: '#ff6f00' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function Home() {
  const { dashboard, loading, fetchDashboard } = useAppStore();

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const showSkeleton = loading || !dashboard;

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold text-primary mb-6">学习仪表盘</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {showSkeleton ? (
          <>
            <StatCardSkeleton delay="0.1s" />
            <StatCardSkeleton delay="0.2s" />
            <StatCardSkeleton delay="0.3s" />
          </>
        ) : (
          <>
            <StatCard
              icon={<Layers size={32} />}
              value={dashboard.totalCards}
              label="闪卡总数"
              delay="0.1s"
            />
            <StatCard
              icon={<Users size={32} />}
              value={dashboard.totalGroups}
              label="学习小组"
              delay="0.2s"
            />
            <StatCard
              icon={<Trophy size={32} />}
              value={`${dashboard.avgScore}分`}
              label="今日平均得分"
              delay="0.3s"
            />
          </>
        )}
      </div>

      {showSkeleton ? (
        <ChartSkeleton />
      ) : (
        <ChartCard weeklyStats={dashboard.weeklyStats} />
      )}
    </div>
  );
}
