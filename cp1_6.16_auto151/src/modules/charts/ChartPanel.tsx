import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { format, startOfWeek, endOfWeek, eachWeekOfInterval, subWeeks } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { DiaryEntry, EmotionType, TimeRangeType, WeeklyData, PieDataItem } from '../../types';
import { EMOTIONS, EMOTION_TYPES } from '../../constants';
import EmotionTimeline from './EmotionTimeline';

interface ChartPanelProps {
  diaries: DiaryEntry[];
}

const BarTooltip: React.FC<any> = ({ active, payload, label }) => {
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
              borderRadius: '2px',
              background: entry.color,
            }}
          />
          {entry.name}: {entry.value?.toFixed(1) || '-'}
        </p>
      ))}
    </div>
  );
};

const PieTooltip: React.FC<any> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E0E0E0',
        borderRadius: '8px',
        padding: '8px 12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      }}
    >
      <p style={{ fontSize: '13px', margin: 0 }}>
        <span style={{ color: payload[0].payload.color }}>{payload[0].name}</span>
        : {payload[0].value} ({payload[0].payload.percentage}%)
      </p>
    </div>
  );
};

const ChartPanel: React.FC<ChartPanelProps> = ({ diaries }) => {
  const [timeRange, setTimeRange] = useState<TimeRangeType>(7);
  const [highlightedEmotion, setHighlightedEmotion] = useState<EmotionType | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<WeeklyData | null>(null);

  const weeklyData = useMemo(() => {
    const now = new Date();
    const twelveWeeksAgo = subWeeks(now, 11);
    const weekStarts = eachWeekOfInterval({
      start: startOfWeek(twelveWeeksAgo, { weekStartsOn: 1 }),
      end: endOfWeek(now, { weekStartsOn: 1 }),
    }, { weekStartsOn: 1 });

    const weeks: WeeklyData[] = weekStarts.map((weekStart) => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const weekEntries = diaries.filter((entry) => {
        const entryDate = new Date(entry.date);
        return entryDate >= weekStart && entryDate <= weekEnd;
      });

      const averages = {} as Record<EmotionType, number>;
      EMOTION_TYPES.forEach((emotion) => {
        const emotionEntries = weekEntries.filter((e) => e.emotion === emotion);
        if (emotionEntries.length > 0) {
          const sum = emotionEntries.reduce((acc, e) => acc + e.intensity, 0);
          averages[emotion] = sum / emotionEntries.length;
        } else {
          averages[emotion] = 0;
        }
      });

      return {
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        label: `${format(weekStart, 'MM/dd', { locale: zhCN })} - ${format(weekEnd, 'MM/dd', { locale: zhCN })}`,
        averages,
        entries: weekEntries,
      };
    }).filter((w) => w.entries.length > 0);

    return weeks;
  }, [diaries]);

  const barChartData = useMemo(() => {
    return weeklyData.map((week) => ({
      label: week.label,
      ...week.averages,
      weekData: week,
    }));
  }, [weeklyData]);

  const pieData = useMemo((): PieDataItem[] => {
    if (!selectedWeek) return [];

    const emotionCounts: Record<EmotionType, number> = {} as Record<EmotionType, number>;
    EMOTION_TYPES.forEach((e) => { emotionCounts[e] = 0; });

    selectedWeek.entries.forEach((entry) => {
      emotionCounts[entry.emotion]++;
    });

    const total = selectedWeek.entries.length;
    return EMOTION_TYPES
      .filter((e) => emotionCounts[e] > 0)
      .map((e) => ({
        name: EMOTIONS[e].name,
        value: emotionCounts[e],
        color: EMOTIONS[e].color,
        percentage: total > 0 ? Math.round((emotionCounts[e] / total) * 100) : 0,
      }));
  }, [selectedWeek]);

  const handleBarClick = (data: any) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const emotion = data.activePayload[0].dataKey as EmotionType;
      setHighlightedEmotion(emotion === highlightedEmotion ? null : emotion);
      setSelectedWeek(data.activeLabel ? data.payload.weekData : null);
    }
  };

  const handleTimeRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTimeRange(Number(e.target.value) as TimeRangeType);
  };

  return (
    <div>
      <div className="chart-controls">
        <h2 className="section-title" style={{ marginBottom: 0 }}>情绪分析</h2>
        <select
          className="time-range-select"
          value={timeRange}
          onChange={handleTimeRangeChange}
        >
          <option value={7}>最近7天</option>
          <option value={30}>最近30天</option>
          <option value={90}>最近90天</option>
        </select>
      </div>

      <EmotionTimeline diaries={diaries} timeRange={timeRange} />

      {barChartData.length > 0 ? (
        <div className="chart-container">
          <h3 className="chart-title">每周情绪均值</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={barChartData}
              margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
              onClick={handleBarClick}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#9E9E9E' }}
                axisLine={{ stroke: '#E0E0E0' }}
                tickLine={{ stroke: '#E0E0E0' }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                domain={[0, 10]}
                tick={{ fontSize: 12, fill: '#9E9E9E' }}
                axisLine={{ stroke: '#E0E0E0' }}
                tickLine={{ stroke: '#E0E0E0' }}
                tickCount={6}
              />
              <Tooltip content={<BarTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="rect"
                formatter={(value) => (
                  <span style={{ fontSize: '12px', color: '#616161' }}>{value}</span>
                )}
              />
              {EMOTION_TYPES.map((emotion) => (
                <Bar
                  key={emotion}
                  dataKey={emotion}
                  name={EMOTIONS[emotion].name}
                  fill={EMOTIONS[emotion].color}
                  radius={[4, 4, 0, 0]}
                  barSize={12}
                  className={highlightedEmotion === emotion ? 'highlight-bar' : ''}
                  opacity={highlightedEmotion && highlightedEmotion !== emotion ? 0.3 : 1}
                  isAnimationActive={diaries.length < 50}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="chart-container">
          <h3 className="chart-title">每周情绪均值</h3>
          <div className="empty-state" style={{ padding: '40px 20px' }}>
            <div className="empty-emoji">📈</div>
            <div className="empty-text">暂无足够数据显示周均值</div>
          </div>
        </div>
      )}

      {selectedWeek && pieData.length > 0 && (
        <div
          className="modal-overlay"
          onClick={() => {
            setSelectedWeek(null);
            setHighlightedEmotion(null);
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '450px' }}
          >
            <h3 className="modal-title">
              {selectedWeek.label} 情绪占比
            </h3>
            <p style={{ fontSize: '13px', color: '#9E9E9E', marginBottom: '16px' }}>
              共 {selectedWeek.entries.length} 条记录
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  isAnimationActive={true}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
                <Legend
                  formatter={(value, entry: any) => (
                    <span style={{ fontSize: '12px', color: '#616161' }}>
                      {value} ({entry.payload.percentage}%)
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="modal-actions">
              <button
                className="btn btn-primary"
                onClick={() => {
                  setSelectedWeek(null);
                  setHighlightedEmotion(null);
                }}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChartPanel;
