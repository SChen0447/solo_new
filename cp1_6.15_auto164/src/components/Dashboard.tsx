import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, DashboardStats } from '../utils/api';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const wordCloudRef = useRef<HTMLCanvasElement>(null);
  const trendRef = useRef<HTMLCanvasElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const drawWordCloud = useCallback((canvas: HTMLCanvasElement, data: { word: string; count: number }[]) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    ctx.clearRect(0, 0, rect.width, rect.height);

    const maxCount = Math.max(...data.map(d => d.count), 1);
    const minSize = 8;
    const maxSize = 24;
    const startColor = { r: 79, g: 195, b: 247 };
    const endColor = { r: 124, g: 77, b: 255 };

    const placedWords: { x: number; y: number; width: number; height: number; rotation: number }[] = [];

    const checkCollision = (x: number, y: number, w: number, h: number, rot: number) => {
      for (const placed of placedWords) {
        const dx = x - placed.x;
        const dy = y - placed.y;
        const minDist = Math.max(w, h, placed.width, placed.height) / 2;
        if (Math.sqrt(dx * dx + dy * dy) < minDist) return true;
      }
      return false;
    };

    data.forEach((item, index) => {
      const size = minSize + ((item.count / maxCount) * (maxSize - minSize));
      const colorRatio = index / Math.max(data.length - 1, 1);
      const r = Math.round(startColor.r + (endColor.r - startColor.r) * colorRatio);
      const g = Math.round(startColor.g + (endColor.g - startColor.g) * colorRatio);
      const b = Math.round(startColor.b + (endColor.b - startColor.b) * colorRatio);

      ctx.font = `600 ${size}px 'Noto Sans SC', sans-serif`;
      const metrics = ctx.measureText(item.word);
      const wordWidth = metrics.width;
      const wordHeight = size;

      let x = 0, y = 0, rotation = 0, attempts = 0;
      const maxAttempts = 100;

      while (attempts < maxAttempts) {
        x = Math.random() * (rect.width - wordWidth - 40) + 20;
        y = Math.random() * (rect.height - wordHeight - 40) + 40;
        rotation = (Math.random() - 0.5) * 60;

        if (!checkCollision(x, y, wordWidth, wordHeight, rotation)) break;
        attempts++;
      }

      placedWords.push({ x, y, width: wordWidth, height: wordHeight, rotation });

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillText(item.word, -wordWidth / 2, wordHeight / 4);
      ctx.restore();
    });
  }, []);

  const drawTrendChart = useCallback((canvas: HTMLCanvasElement, data: { date: string; count: number }[]) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 20, right: 20, bottom: 40, left: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);

    if (data.length === 0) return;

    const maxCount = Math.max(...data.map(d => d.count), 1);
    const stepX = chartWidth / (data.length - 1);

    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, '#ff8a80');
    gradient.addColorStop(1, '#ff5252');

    ctx.strokeStyle = '#e8e0d8';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    ctx.fillStyle = '#8d6e63';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    data.forEach((d, i) => {
      const x = padding.left + stepX * i;
      const date = new Date(d.date);
      ctx.fillText(`${date.getMonth() + 1}/${date.getDate()}`, x, height - 15);
    });

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    data.forEach((d, i) => {
      const x = padding.left + stepX * i;
      const y = padding.top + chartHeight - (d.count / maxCount) * chartHeight;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    ctx.fillStyle = '#ff8a80';
    data.forEach((d, i) => {
      const x = padding.left + stepX * i;
      const y = padding.top + chartHeight - (d.count / maxCount) * chartHeight;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff8a80';
    });

    ctx.fillStyle = '#5d4037';
    ctx.textAlign = 'left';
    data.forEach((d, i) => {
      const x = padding.left + stepX * i;
      const y = padding.top + chartHeight - (d.count / maxCount) * chartHeight - 12;
      ctx.fillText(d.count.toString(), x - 6, y);
    });
  }, []);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await api.getDashboardStats();
        setStats(data);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  useEffect(() => {
    if (!stats) return;

    const drawAll = () => {
      if (wordCloudRef.current && stats.wordCloud.length > 0) {
        drawWordCloud(wordCloudRef.current, stats.wordCloud);
      }
      if (trendRef.current) {
        drawTrendChart(trendRef.current, stats.weeklyTrend);
      }
    };

    const timer = setTimeout(drawAll, 100);

    if (wordCloudRef.current || trendRef.current) {
      resizeObserverRef.current = new ResizeObserver(() => {
        requestAnimationFrame(drawAll);
      });
      if (wordCloudRef.current) resizeObserverRef.current.observe(wordCloudRef.current);
      if (trendRef.current) resizeObserverRef.current.observe(trendRef.current);
    }

    return () => {
      clearTimeout(timer);
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, [stats, drawWordCloud, drawTrendChart]);

  const getRankColor = (rank: number) => {
    const ratio = Math.min(rank / 5, 1);
    const startR = 255, startG = 82, startB = 82;
    const endR = 255, endG = 23, endB = 68;
    const r = Math.round(startR + (endR - startR) * ratio);
    const g = Math.round(startG + (endG - startG) * ratio);
    const b = Math.round(startB + (endB - startB) * ratio);
    return `rgb(${r}, ${g}, ${b})`;
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>加载中...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>加载失败</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backButton} onClick={() => navigate('/')}>← 返回菜单</button>
        <h1 style={styles.title}>店主仪表盘</h1>
      </div>

      <div style={styles.grid} className="dashboard-grid">
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>畅销饮品排行</h2>
          <div style={styles.rankList}>
            {stats.topDrinks.map((drink, index) => (
              <div key={drink.drinkId} style={styles.rankItem}>
                <span style={{ ...styles.rankNumber, backgroundColor: getRankColor(index) }}>
                  {index + 1}
                </span>
                <span style={styles.rankName}>{drink.name}</span>
                <span style={styles.rankCount}>{drink.count} 杯</span>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>笔记热词云</h2>
          <canvas ref={wordCloudRef} style={styles.wordCloudCanvas} />
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>平均心情评分</h2>
          <div style={styles.moodList}>
            {stats.moodAverages.filter(m => m.averageMood > 0).slice(0, 5).map((mood) => (
              <div key={mood.drinkId} style={styles.moodItem}>
                <span style={styles.moodName}>{mood.name}</span>
                <div style={styles.moodBar}>
                  <div 
                    style={{ 
                      ...styles.moodFill, 
                      width: `${(mood.averageMood / 5) * 100}%`,
                      backgroundColor: mood.averageMood >= 4 ? '#66bb6a' : mood.averageMood >= 3 ? '#ffa726' : '#ef5350'
                    }} 
                  />
                </div>
                <span style={styles.moodScore}>{mood.averageMood}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...styles.card, gridColumn: 'span 2' }}>
          <h2 style={styles.cardTitle}>近七日点单趋势</h2>
          <canvas ref={trendRef} style={styles.trendCanvas} />
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .dashboard-grid > * {
          animation: fadeInUp 0.5s ease forwards;
          opacity: 0;
        }
        .dashboard-grid > *:nth-child(1) { animation-delay: 0s; }
        .dashboard-grid > *:nth-child(2) { animation-delay: 0.1s; }
        .dashboard-grid > *:nth-child(3) { animation-delay: 0.2s; }
        .dashboard-grid > *:nth-child(4) { animation-delay: 0.3s; }
      `}</style>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f0eb',
    padding: '20px',
    fontFamily: "'Noto Sans SC', sans-serif"
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    marginBottom: '30px'
  },
  backButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#5d4037',
    fontSize: '14px',
    cursor: 'pointer',
    padding: '10px 15px',
    borderRadius: '6px',
    transition: 'background-color 0.2s ease'
  },
  title: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '32px',
    color: '#5d4037',
    margin: 0,
    fontWeight: 700
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
    maxWidth: '1400px',
    margin: '0 auto',
    '@media (max-width: 900px)': {
      gridTemplateColumns: '1fr'
    }
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  cardTitle: {
    fontSize: '18px',
    color: '#5d4037',
    margin: 0,
    fontWeight: 600,
    fontFamily: "'Playfair Display', serif"
  },
  rankList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  rankItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    borderRadius: '8px',
    transition: 'all 0.3s ease',
    cursor: 'default'
  },
  rankNumber: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 700,
    flexShrink: 0
  },
  rankName: {
    flex: 1,
    fontSize: '14px',
    color: '#5d4037',
    fontWeight: 500
  },
  rankCount: {
    fontSize: '13px',
    color: '#ff8a80',
    fontWeight: 600
  },
  wordCloudCanvas: {
    width: '100%',
    height: '280px',
    borderRadius: '8px',
    backgroundColor: '#fafafa'
  },
  moodList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  moodItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  moodName: {
    fontSize: '13px',
    color: '#5d4037',
    minWidth: '80px',
    fontWeight: 500
  },
  moodBar: {
    flex: 1,
    height: '8px',
    backgroundColor: '#e8e0d8',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  moodFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.5s ease'
  },
  moodScore: {
    fontSize: '13px',
    color: '#5d4037',
    fontWeight: 600,
    minWidth: '30px',
    textAlign: 'right'
  },
  trendCanvas: {
    width: '100%',
    height: '250px',
    borderRadius: '8px',
    backgroundColor: '#fafafa'
  },
  loading: {
    textAlign: 'center',
    padding: '100px 0',
    color: '#8d6e63',
    fontSize: '16px'
  },
  error: {
    textAlign: 'center',
    padding: '100px 0',
    color: '#e57373',
    fontSize: '16px'
  }
};

export default Dashboard;
