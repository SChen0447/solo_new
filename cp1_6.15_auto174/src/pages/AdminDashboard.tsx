import { useEffect, useState, useRef, useCallback } from 'react';
import { Library, Users, BookMarked, MessageSquare } from 'lucide-react';
import axios from 'axios';
import type { AdminStats, BorrowTrendItem } from '@/types';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  return (
    <div className="flex h-[140px] w-[220px] flex-col items-center justify-center rounded-card bg-surface-white shadow-stat transition-shadow duration-200 hover:shadow-card-hover">
      <div
        className={`flex h-[44px] w-[44px] items-center justify-center rounded-full ${color}`}
      >
        {icon}
      </div>
      <p className="mt-3 text-2xl font-bold text-gray-800">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

function TrendChart({ data }: { data: BorrowTrendItem[] }) {
  if (data.length === 0) return null;

  const width = 600;
  const height = 320;
  const padding = { top: 20, right: 20, bottom: 40, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  const points = data.map((d, i) => ({
    x: padding.left + (i / (data.length - 1 || 1)) * chartW,
    y: padding.top + chartH - (d.count / maxCount) * chartH,
  }));

  const linePath = points
    .map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`))
    .join(' ');

  const areaPath =
    linePath +
    ` L${points[points.length - 1].x},${padding.top + chartH} L${points[0].x},${padding.top + chartH} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[320px]">
      {Array.from({ length: 5 }, (_, i) => {
        const y = padding.top + (i / 4) * chartH;
        return (
          <line
            key={`grid-${i}`}
            x1={padding.left}
            y1={y}
            x2={padding.left + chartW}
            y2={y}
            stroke="#ddd"
            strokeOpacity={0.3}
          />
        );
      })}
      <line
        x1={padding.left}
        y1={padding.top + chartH}
        x2={padding.left + chartW}
        y2={padding.top + chartH}
        stroke="#ddd"
      />
      <line
        x1={padding.left}
        y1={padding.top}
        x2={padding.left}
        y2={padding.top + chartH}
        stroke="#ddd"
      />
      {maxCount > 0 &&
        Array.from({ length: 5 }, (_, i) => {
          const y = padding.top + (i / 4) * chartH;
          const val = Math.round(maxCount * (1 - i / 4));
          return (
            <text
              key={`label-${i}`}
              x={padding.left - 8}
              y={y + 4}
              textAnchor="end"
              fontSize={11}
              fill="#999"
            >
              {val}
            </text>
          );
        })}
      {data.map((d, i) => {
        const x = padding.left + (i / (data.length - 1 || 1)) * chartW;
        return (
          <text
            key={`date-${i}`}
            x={x}
            y={padding.top + chartH + 20}
            textAnchor="middle"
            fontSize={11}
            fill="#999"
          >
            {d.date.slice(-5)}
          </text>
        );
      })}
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#667eea" stopOpacity={0.3} />
          <stop offset="100%" stopColor="#667eea" stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#areaGrad)" />
      <path
        d={linePath}
        fill="none"
        stroke="#667eea"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((p, i) => (
        <circle
          key={`dot-${i}`}
          cx={p.x}
          cy={p.y}
          r={4}
          fill="#667eea"
          stroke="#fff"
          strokeWidth={2}
        />
      ))}
    </svg>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats>({
    totalBooks: 0,
    totalMembers: 0,
    monthlyBorrows: 0,
    pendingReviews: 0,
  });
  const [trend, setTrend] = useState<BorrowTrendItem[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, trendRes] = await Promise.all([
        axios.get('/api/admin/stats'),
        axios.get('/api/admin/borrow-trend'),
      ]);
      setStats(statsRes.data);
      setTrend(trendRes.data ?? []);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchData();
    timerRef.current = setInterval(fetchData, 10000);
    return () => clearInterval(timerRef.current);
  }, [fetchData]);

  return (
    <div className="mx-auto max-w-[1100px] px-6 pt-[84px] pb-12 animate-fadeIn">
      <h1 className="mb-6 text-xl font-bold text-gray-800">管理看板</h1>
      <div className="mb-8 flex flex-wrap gap-5">
        <StatCard
          icon={<Library className="h-5 w-5 text-primary-light" />}
          label="总藏书量"
          value={stats.totalBooks}
          color="bg-primary-light/15"
        />
        <StatCard
          icon={<Users className="h-5 w-5 text-status-available" />}
          label="总会员数"
          value={stats.totalMembers}
          color="bg-status-available/15"
        />
        <StatCard
          icon={<BookMarked className="h-5 w-5 text-status-borrowed" />}
          label="本月借出量"
          value={stats.monthlyBorrows}
          color="bg-status-borrowed/15"
        />
        <StatCard
          icon={<MessageSquare className="h-5 w-5 text-review-pending" />}
          label="待审核书评"
          value={stats.pendingReviews}
          color="bg-review-pending/15"
        />
      </div>
      <div className="rounded-card bg-surface-white p-6 shadow-stat">
        <h2 className="mb-4 text-base font-semibold text-gray-800">最近7天借阅趋势</h2>
        <TrendChart data={trend} />
      </div>
    </div>
  );
}
