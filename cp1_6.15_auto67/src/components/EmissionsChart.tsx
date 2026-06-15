import React, { useMemo } from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import useCarbonStore from '../store/carbonStore';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

const EmissionsChart: React.FC = () => {
  const dailyEmissions = useCarbonStore((s) => s.dailyEmissions);
  const categoryStats = useCarbonStore((s) => s.categoryStats);
  const totalEmission = useCarbonStore((s) => s.totalEmission);
  const viewMode = useCarbonStore((s) => s.viewMode);

  const lineData = useMemo(() => {
    const labels = Object.keys(dailyEmissions).map((d) => {
      const parts = d.split('-');
      return `${parts[1]}/${parts[2]}`;
    });
    const values = Object.values(dailyEmissions).map((v) => Math.round(v * 100) / 100);

    return {
      labels,
      datasets: [
        {
          label: viewMode === 'week' ? '每日碳排放' : '每日碳排放',
          data: values,
          borderColor: '#27ae60',
          backgroundColor: 'rgba(46, 204, 113, 0.15)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#2ecc71',
          pointBorderColor: '#27ae60',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
        },
      ],
    };
  }, [dailyEmissions, viewMode]);

  const lineOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 300,
      },
      interaction: {
        intersect: false,
        mode: 'index' as const,
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(22, 33, 62, 0.95)',
          titleColor: '#00ffad',
          bodyColor: '#e0e0e0',
          borderColor: '#0f3460',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12,
          callbacks: {
            label: (ctx: { parsed: { y: number | null } }) =>
              `${(ctx.parsed.y ?? 0).toFixed(2)} kg CO₂e`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: 'rgba(255,255,255,0.6)', font: { size: 12 } },
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: {
            color: 'rgba(255,255,255,0.6)',
            font: { size: 12 },
            callback: (value: string | number) => `${value} kg`,
          },
          beginAtZero: true,
        },
      },
    }),
    [],
  );

  const doughnutData = useMemo(() => {
    const { transport, diet, energy } = categoryStats;
    const hasData = transport > 0 || diet > 0 || energy > 0;

    return {
      labels: ['交通', '饮食', '能源'],
      datasets: [
        {
          data: hasData ? [transport, diet, energy] : [1, 1, 1],
          backgroundColor: hasData
            ? ['#e74c3c', '#f39c12', '#3498db']
            : ['rgba(231,76,60,0.2)', 'rgba(243,156,18,0.2)', 'rgba(52,152,219,0.2)'],
          borderColor: hasData
            ? ['rgba(231,76,60,0.8)', 'rgba(243,156,18,0.8)', 'rgba(52,152,219,0.8)']
            : ['rgba(231,76,60,0.1)', 'rgba(243,156,18,0.1)', 'rgba(52,152,219,0.1)'],
          borderWidth: 2,
          hoverBorderWidth: 3,
          hoverOffset: 8,
        },
      ],
    };
  }, [categoryStats]);

  const doughnutOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      animation: {
        duration: 300,
      },
      plugins: {
        legend: {
          position: 'bottom' as const,
          labels: {
            color: 'rgba(255,255,255,0.8)',
            padding: 16,
            font: { size: 13 },
            usePointStyle: true,
            pointStyleWidth: 12,
          },
        },
        tooltip: {
          backgroundColor: 'rgba(22, 33, 62, 0.95)',
          titleColor: '#00ffad',
          bodyColor: '#e0e0e0',
          borderColor: '#0f3460',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12,
          callbacks: {
            label: (ctx: { label: string; parsed: number; dataset: { data: number[] } }) => {
              const total = ctx.dataset.data.reduce((a: number, b: number) => a + b, 0);
              const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : '0';
              return `${ctx.label}: ${ctx.parsed.toFixed(2)} kg (${pct}%)`;
            },
          },
        },
      },
    }),
    [],
  );

  const centerTextPlugin = useMemo(
    () => ({
      id: 'centerText',
      afterDraw: (chart: { width: number; height: number; ctx: CanvasRenderingContext2D }) => {
        const { width, height, ctx: c } = chart;
        c.save();
        const centerX = width / 2;
        const centerY = height / 2 - 14;

        c.font = 'bold 22px "Segoe UI", sans-serif';
        c.fillStyle = '#00ffad';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(`${totalEmission.toFixed(1)}`, centerX, centerY);

        c.font = '12px "Segoe UI", sans-serif';
        c.fillStyle = 'rgba(255,255,255,0.6)';
        c.fillText('kg CO₂e', centerX, centerY + 22);

        c.restore();
      },
    }),
    [totalEmission],
  );

  return (
    <div className="emissions-chart">
      <div className="chart-section">
        <h3 className="chart-title">
          {viewMode === 'week' ? '过去7天' : '过去30天'}碳排放趋势
        </h3>
        <div className="chart-container line-chart-container">
          <Line data={lineData} options={lineOptions} />
        </div>
      </div>

      <div className="chart-section">
        <h3 className="chart-title">分类占比</h3>
        <div className="chart-container doughnut-chart-container">
          <Doughnut data={doughnutData} options={doughnutOptions} plugins={[centerTextPlugin]} />
        </div>
      </div>
    </div>
  );
};

export default EmissionsChart;
