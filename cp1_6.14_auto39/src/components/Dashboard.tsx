import { useMemo } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { useFigureStore } from '../store';

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const CHART_COLORS = [
  '#e94560', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'
];

const StatCard = ({
  label,
  value,
  subValue,
  color,
  icon
}: {
  label: string;
  value: string;
  subValue?: string;
  color: string;
  icon: string;
}) => (
  <div className="bg-[#16213e] rounded-xl p-5 border border-gray-700/50 hover:border-gray-600/50 transition-colors">
    <div className="flex items-start justify-between mb-3">
      <div>
        <div className="text-gray-400 text-sm">{label}</div>
        <div className="text-2xl font-bold text-white mt-1">{value}</div>
        {subValue && <div className="text-xs mt-1" style={{ color }}>{subValue}</div>}
      </div>
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
        style={{ backgroundColor: `${color}20` }}
      >
        {icon}
      </div>
    </div>
  </div>
);

export default function Dashboard() {
  const store = useFigureStore();

  const totalValue = store.getTotalValue();
  const totalPurchase = store.getTotalPurchase();
  const totalProfit = store.getTotalProfit();
  const profitRate = store.getProfitRate();
  const count = store.figures.length;

  const doughnutData = useMemo(() => {
    const dist = store.getManufacturerDistribution();
    return {
      labels: dist.labels,
      datasets: [{
        data: dist.data,
        backgroundColor: dist.colors,
        borderColor: '#16213e',
        borderWidth: 3,
        hoverOffset: 8
      }]
    };
  }, [store.figures]);

  const barData = useMemo(() => {
    const ranking = store.getSeriesValueRanking();
    return {
      labels: ranking.labels,
      datasets: [{
        label: '总价值 (¥)',
        data: ranking.data,
        backgroundColor: ranking.data.map((_, i) => CHART_COLORS[i % CHART_COLORS.length] + 'CC'),
        borderColor: ranking.data.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false
      }]
    };
  }, [store.figures]);

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: '#9ca3af',
          padding: 12,
          font: { size: 11 },
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        backgroundColor: '#16213e',
        titleColor: '#fff',
        bodyColor: '#9ca3af',
        borderColor: '#e94560',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (ctx: any) => `${ctx.label}: ${ctx.parsed} 件`
        }
      }
    },
    cutout: '65%'
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#16213e',
        titleColor: '#fff',
        bodyColor: '#9ca3af',
        borderColor: '#e94560',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (ctx: any) => `¥${ctx.parsed.x.toLocaleString()}`
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: {
          color: '#6b7280',
          callback: (v: any) => '¥' + Number(v).toLocaleString()
        }
      },
      y: {
        grid: { display: false },
        ticks: { color: '#9ca3af', font: { size: 11 } }
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="藏品总数"
          value={`${count} 件`}
          color="#e94560"
          icon="🎎"
        />
        <StatCard
          label="购入总额"
          value={`¥${totalPurchase.toLocaleString()}`}
          color="#3b82f6"
          icon="💰"
        />
        <StatCard
          label="当前总估值"
          value={`¥${totalValue.toLocaleString()}`}
          color="#10b981"
          icon="📈"
        />
        <StatCard
          label="总盈亏"
          value={`${totalProfit >= 0 ? '+' : ''}¥${totalProfit.toLocaleString()}`}
          subValue={`溢价率 ${profitRate >= 0 ? '+' : ''}${profitRate.toFixed(1)}%`}
          color={totalProfit >= 0 ? '#10b981' : '#ef4444'}
          icon={totalProfit >= 0 ? '📈' : '📉'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 bg-[#16213e] rounded-xl p-5 border border-gray-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">厂商收藏占比</h3>
            <span className="text-xs text-gray-500">数量分布</span>
          </div>
          <div className="h-64">
            {doughnutData.datasets[0].data.length > 0 ? (
              <Doughnut data={doughnutData} options={doughnutOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 text-sm">暂无数据</div>
            )}
          </div>
        </div>

        <div className="lg:col-span-3 bg-[#16213e] rounded-xl p-5 border border-gray-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">系列价值排行 TOP 10</h3>
            <span className="text-xs text-gray-500">按总估价降序</span>
          </div>
          <div className="h-64">
            {barData.datasets[0].data.length > 0 ? (
              <Bar data={barData} options={barOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 text-sm">暂无数据</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
