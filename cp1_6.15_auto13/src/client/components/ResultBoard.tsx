import { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import { useVoteStore } from '../store/useVoteStore';
import type { Vote } from '../store/useVoteStore';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

interface ResultBoardProps {
  vote: Vote;
}

const COLORS = [
  'rgba(74, 144, 217, 0.85)',
  'rgba(123, 104, 238, 0.85)',
  'rgba(255, 159, 64, 0.85)',
  'rgba(75, 192, 192, 0.85)',
  'rgba(153, 102, 255, 0.85)',
  'rgba(255, 99, 132, 0.85)',
  'rgba(54, 162, 235, 0.85)',
  'rgba(255, 206, 86, 0.85)',
  'rgba(201, 203, 207, 0.85)',
  'rgba(60, 179, 113, 0.85)',
];

const BORDER_COLORS = [
  'rgba(74, 144, 217, 1)',
  'rgba(123, 104, 238, 1)',
  'rgba(255, 159, 64, 1)',
  'rgba(75, 192, 192, 1)',
  'rgba(153, 102, 255, 1)',
  'rgba(255, 99, 132, 1)',
  'rgba(54, 162, 235, 1)',
  'rgba(255, 206, 86, 1)',
  'rgba(201, 203, 207, 1)',
  'rgba(60, 179, 113, 1)',
];

function createGradient(ctx: CanvasRenderingContext2D, chartArea: { top: number; bottom: number }) {
  const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
  gradient.addColorStop(0, '#4A90D9');
  gradient.addColorStop(1, '#7B68EE');
  return gradient;
}

export default function ResultBoard({ vote }: ResultBoardProps) {
  const { selectedVote } = useVoteStore();
  const currentVote = selectedVote?.id === vote.id ? selectedVote : vote;
  const barChartRef = useRef<ChartJS<'bar'>>(null);
  const pieChartRef = useRef<ChartJS<'pie'>>(null);

  const totalVotes = currentVote.options.reduce((s, o) => s + o.count, 0);

  const labels = currentVote.options.map((o) => o.text);
  const data = currentVote.options.map((o) => o.count);

  const barData = {
    labels,
    datasets: [
      {
        label: '得票数',
        data,
        backgroundColor: (context: any) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return '#4A90D9';
          return createGradient(ctx, chartArea);
        },
        borderColor: BORDER_COLORS.slice(0, data.length),
        borderWidth: 1,
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  };

  const pieData = {
    labels,
    datasets: [
      {
        data,
        backgroundColor: COLORS.slice(0, data.length),
        borderColor: '#ffffff',
        borderWidth: 2,
        hoverOffset: 10,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 500,
      easing: 'easeOutCubic' as const,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const value = ctx.raw || 0;
            const percent = totalVotes > 0 ? ((value / totalVotes) * 100).toFixed(1) : '0';
            return ` ${value} 票 (${percent}%)`;
          },
        },
        backgroundColor: 'rgba(31, 41, 55, 0.95)',
        padding: 12,
        titleFont: { size: 13, weight: 600 as const },
        bodyFont: { size: 12 },
        cornerRadius: 8,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          color: '#6b7280',
          font: { size: 12 },
        },
        grid: {
          color: 'rgba(229, 231, 235, 0.6)',
        },
      },
      x: {
        ticks: {
          color: '#374151',
          font: { size: 12, weight: 500 as const },
        },
        grid: {
          display: false,
        },
      },
    },
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 400,
      easing: 'easeOutBack' as const,
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 16,
          usePointStyle: true,
          pointStyle: 'circle',
          color: '#374151',
          font: { size: 12, weight: 500 as const },
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const value = ctx.raw || 0;
            const percent = totalVotes > 0 ? ((value / totalVotes) * 100).toFixed(1) : '0';
            return ` ${ctx.label}: ${value} 票 (${percent}%)`;
          },
        },
        backgroundColor: 'rgba(31, 41, 55, 0.95)',
        padding: 12,
        titleFont: { size: 13, weight: 600 as const },
        bodyFont: { size: 12 },
        cornerRadius: 8,
      },
    },
  };

  useEffect(() => {
    if (barChartRef.current) {
      barChartRef.current.data = barData;
      barChartRef.current.update('active');
    }
    if (pieChartRef.current) {
      pieChartRef.current.data = pieData;
      pieChartRef.current.update('active');
    }
  }, [currentVote]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>{currentVote.title}</h2>
        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <span style={styles.statLabel}>总投票数</span>
            <span style={{ ...styles.statValue, color: '#4A90D9' }}>{totalVotes}</span>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statLabel}>选项数量</span>
            <span style={{ ...styles.statValue, color: '#7B68EE' }}>{currentVote.options.length}</span>
          </div>
        </div>
      </div>

      <div style={styles.chartsGrid}>
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>
            <span style={styles.chartIcon}>📊</span>
            柱状图统计
          </h3>
          <div style={styles.chartWrapper}>
            <Bar ref={barChartRef} data={barData} options={barOptions} />
          </div>
        </div>

        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>
            <span style={styles.chartIcon}>🥧</span>
            饼图分布
          </h3>
          <div style={{ ...styles.chartWrapper, height: '320px' }}>
            <Pie ref={pieChartRef} data={pieData} options={pieOptions} />
          </div>
        </div>
      </div>

      <div style={styles.detailCard}>
        <h3 style={styles.chartTitle}>
          <span style={styles.chartIcon}>📋</span>
          详细数据
        </h3>
        <div style={styles.detailList}>
          {currentVote.options.map((opt, idx) => {
            const percent = totalVotes > 0 ? (opt.count / totalVotes) * 100 : 0;
            return (
              <div key={opt.id} style={styles.detailRow}>
                <div style={styles.detailHeader}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: COLORS[idx % COLORS.length],
                      }}
                    />
                    <span style={styles.detailLabel}>{opt.text}</span>
                  </span>
                  <span style={styles.detailCount}>
                    <strong style={{ color: '#1f2937' }}>{opt.count}</strong>
                    <span style={{ color: '#6b7280' }}> 票 ({percent.toFixed(1)}%)</span>
                  </span>
                </div>
                <div style={styles.progressBg}>
                  <div
                    style={{
                      ...styles.progressBar,
                      width: `${percent}%`,
                      background: `linear-gradient(90deg, ${BORDER_COLORS[idx % BORDER_COLORS.length]} 0%, ${
                        COLORS[idx % COLORS.length]
                      } 100%)`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginTop: '16px',
  },
  header: {
    background: 'linear-gradient(135deg, #ffffff 0%, #f0f4ff 100%)',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    marginBottom: '20px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#1f2937',
    marginBottom: '16px',
    textAlign: 'center',
  },
  statsRow: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  statCard: {
    background: '#fff',
    padding: '12px 24px',
    borderRadius: '10px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    minWidth: '120px',
  },
  statLabel: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: 500,
  },
  statValue: {
    fontSize: '28px',
    fontWeight: 700,
  },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '20px',
    marginBottom: '20px',
  },
  chartCard: {
    background: '#ffffff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  chartTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  chartIcon: {
    fontSize: '16px',
  },
  chartWrapper: {
    height: '300px',
    position: 'relative',
  },
  detailCard: {
    background: '#ffffff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  detailList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  detailRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  detailHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#374151',
  },
  detailCount: {
    fontSize: '13px',
  },
  progressBg: {
    width: '100%',
    height: '8px',
    background: '#f3f4f6',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.5s ease-out',
  },
};
