import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { DiaryEntry, EmotionType, TimeRangeType } from '../../types';
import { EMOTIONS, EMOTION_TYPES } from '../../constants';

interface EmotionTimelineProps {
  diaries: DiaryEntry[];
  timeRange: TimeRangeType;
}

interface TimelineDataPoint {
  date: string;
  displayDate: string;
  timestamp: number;
}

type FullTimelineData = TimelineDataPoint & Partial<Record<EmotionType, number>>;

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E0E0E0',
        borderRadius: '8px',
        padding: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      }}
    >
      <p style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#212121' }}>
        {label}
      </p>
      {payload.map((entry: any, index: number) => (
        <p
          key={index}
          style={{
            fontSize: '13px',
            color: entry.color,
            margin: '4px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: entry.color,
            }}
          />
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
};

const EmotionTimeline: React.FC<EmotionTimelineProps> = ({ diaries, timeRange }) => {
  const chartData = useMemo(() => {
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - timeRange + 1);
    startDate.setHours(0, 0, 0, 0);

    const dateMap = new Map<string, FullTimelineData>();

    for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
      const dateStr = format(d, 'yyyy-MM-dd');
      const displayDate = format(d, 'MM/dd', { locale: zhCN });
      dateMap.set(dateStr, {
        date: dateStr,
        displayDate,
        timestamp: d.getTime(),
      });
    }

    diaries.forEach((entry) => {
      const entryDate = new Date(entry.date);
      if (entryDate < startDate) return;

      const dateStr = format(entryDate, 'yyyy-MM-dd');
      const existing = dateMap.get(dateStr);
      if (existing) {
        const currentValue = existing[entry.emotion] || 0;
        existing[entry.emotion] = Math.max(currentValue, entry.intensity);
      }
    });

    return Array.from(dateMap.values()).sort((a, b) => a.timestamp - b.timestamp);
  }, [diaries, timeRange]);

  const hasData = chartData.some((point) =>
    EMOTION_TYPES.some((emotion) => point[emotion] !== undefined)
  );

  if (!hasData) {
    return (
      <div className="chart-container">
        <h3 className="chart-title">情绪变化趋势</h3>
        <div className="empty-state" style={{ padding: '40px 20px' }}>
          <div className="empty-emoji">📊</div>
          <div className="empty-text">暂无足够数据显示趋势图</div>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <h3 className="chart-title">情绪变化趋势 · 最近{timeRange}天</h3>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
          <XAxis
            dataKey="displayDate"
            tick={{ fontSize: 12, fill: '#9E9E9E' }}
            axisLine={{ stroke: '#E0E0E0' }}
            tickLine={{ stroke: '#E0E0E0' }}
          />
          <YAxis
            domain={[0, 10]}
            tick={{ fontSize: 12, fill: '#9E9E9E' }}
            axisLine={{ stroke: '#E0E0E0' }}
            tickLine={{ stroke: '#E0E0E0' }}
            tickCount={6}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="circle"
            formatter={(value) => (
              <span style={{ fontSize: '12px', color: '#616161' }}>{value}</span>
            )}
          />
          {EMOTION_TYPES.map((emotion) => (
            <Line
              key={emotion}
              type="monotone"
              dataKey={emotion}
              name={EMOTIONS[emotion].name}
              stroke={EMOTIONS[emotion].color}
              strokeWidth={2}
              dot={{ r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6, strokeWidth: 2, stroke: '#FFFFFF' }}
              connectNulls
              isAnimationActive={diaries.length < 50}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default EmotionTimeline;
