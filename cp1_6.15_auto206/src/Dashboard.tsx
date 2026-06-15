import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from './store';

const RingChart: React.FC<{ value: number; size?: number; strokeWidth?: number }> = ({
  value,
  size = 120,
  strokeWidth = 12,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 1000;
    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      setAnimatedValue(value * easeProgress);
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [value]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = (size - strokeWidth) / 2;
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (animatedValue / 100) * 2 * Math.PI;

    ctx.clearRect(0, 0, size, size);

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#a5d6a7';
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.stroke();

    if (animatedValue > 0) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.strokeStyle = '#ff8a65';
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    ctx.fillStyle = '#37474f';
    ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.round(animatedValue)}%`, centerX, centerY - 8);
    
    ctx.fillStyle = '#78909c';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('占用率', centerX, centerY + 12);
  }, [animatedValue, size, strokeWidth]);

  return <canvas ref={canvasRef} />;
};

const LineChart: React.FC<{ data: { date: string; count: number }[] }> = ({ data }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const width = 500;
  const height = 200;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      const value = Math.round(maxCount - (maxCount / 4) * i);
      ctx.fillStyle = '#78909c';
      ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(value.toString(), padding.left - 5, y);
    }

    const points = data.map((d, i) => ({
      x: padding.left + (chartWidth / (data.length - 1)) * i,
      y: padding.top + chartHeight - (d.count / maxCount) * chartHeight,
    }));

    ctx.beginPath();
    ctx.strokeStyle = '#42a5f5';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    points.forEach((point, i) => {
      if (i === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();

    points.forEach((point, i) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, hoverIndex === i ? 6 : 4, 0, 2 * Math.PI);
      ctx.fillStyle = hoverIndex === i ? '#1976d2' : '#42a5f5';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    ctx.fillStyle = '#78909c';
    ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    data.forEach((d, i) => {
      const x = padding.left + (chartWidth / (data.length - 1)) * i;
      ctx.fillText(formatDate(d.date), x, height - padding.bottom + 8);
    });
  }, [data, hoverIndex, maxCount, chartHeight, chartWidth]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const points = data.map((d, i) => ({
      x: padding.left + (chartWidth / (data.length - 1)) * i,
      y: padding.top + chartHeight - (d.count / maxCount) * chartHeight,
    }));

    let closestIndex: number | null = null;
    let minDist = Infinity;
    points.forEach((point, i) => {
      const dist = Math.sqrt(Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2));
      if (dist < 20 && dist < minDist) {
        minDist = dist;
        closestIndex = i;
      }
    });

    setHoverIndex(closestIndex);
    if (closestIndex !== null) {
      setHoverPos({ x: points[closestIndex].x, y: points[closestIndex].y });
    }
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  return (
    <div className="chart-container" ref={containerRef}>
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: 'crosshair' }}
      />
      {hoverIndex !== null && (
        <div
          className="chart-tooltip"
          style={{
            left: `${hoverPos.x}px`,
            top: `${hoverPos.y - 10}px`,
          }}
        >
          {data[hoverIndex].count} 人
        </div>
      )}
    </div>
  );
};

const BarChart: React.FC<{ data: { name: string; count: number }[] }> = ({ data }) => {
  const maxHeight = 80;
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="bar-chart-container">
      {data.map((item, index) => {
        const height = (item.count / maxCount) * maxHeight;
        return (
          <div key={index} className="bar-row">
            <span className="bar-label">{item.name}</span>
            <div className="bar-wrapper">
              <div
                className="bar-fill"
                style={{
                  height: `${height}px`,
                  background: `linear-gradient(to right, #64b5f6, #1e88e5)`,
                }}
              >
                <span className="bar-count">{item.count}</span>
              </div>
            </div>
          </div>
        );
      })}
      {data.length === 0 && (
        <p className="empty-text">暂无数据</p>
      )}
    </div>
  );
};

const Dashboard: React.FC = () => {
  const { dashboardData, fetchDashboard, loading } = useAppStore();

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading && !dashboardData) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <div className="dashboard-container">
      <h2 className="page-title">数据仪表盘</h2>
      
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3 className="card-title">今日工位占用率</h3>
          <div className="ring-chart-wrapper">
            <RingChart value={dashboardData?.workspaceOccupancy || 0} />
          </div>
          <div className="stats-row">
            <div className="stat-item">
              <span className="stat-color" style={{ background: '#ff8a65' }}></span>
              <span>已占用</span>
            </div>
            <div className="stat-item">
              <span className="stat-color" style={{ background: '#a5d6a7' }}></span>
              <span>空闲</span>
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <h3 className="card-title">近7天访客统计</h3>
          <LineChart data={dashboardData?.visitorStats || []} />
        </div>

        <div className="dashboard-card">
          <h3 className="card-title">设备预约排行</h3>
          <BarChart data={dashboardData?.deviceRanking || []} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
