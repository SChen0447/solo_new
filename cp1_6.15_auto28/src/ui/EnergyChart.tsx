import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { useSimulationStore } from '../store/useSimulationStore';

export const EnergyChart: React.FC = () => {
  const { chartData } = useSimulationStore();

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            background: '#1a1a2e',
            border: '1px solid #333',
            borderRadius: '8px',
            padding: '12px',
            fontSize: '12px'
          }}
        >
          <p style={{ margin: '0 0 8px 0', color: '#888' }}>帧: {label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ margin: '4px 0', color: entry.color }}>
              {entry.name}: {entry.value.toFixed(4)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div
      style={{
        background: '#1a1a2e',
        borderRadius: '8px',
        padding: '16px',
        border: '1px solid #333'
      }}
    >
      <h3
        style={{
          margin: '0 0 16px 0',
          fontSize: '16px',
          color: '#ff6b35',
          textAlign: 'center'
        }}
      >
        能量波动图表
      </h3>
      <div style={{ width: '300px', height: '200px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis
              dataKey="frame"
              stroke="#666"
              tick={{ fill: '#888', fontSize: '10px' }}
              domain={[0, 200]}
              tickCount={5}
            />
            <YAxis
              stroke="#666"
              tick={{ fill: '#888', fontSize: '10px' }}
              domain={[0, 1]}
              tickCount={5}
            />
            <Tooltip content={customTooltip} />
            <Legend
              wrapperStyle={{ fontSize: '10px' }}
              formatter={(value) => <span style={{ color: '#ccc' }}>{value}</span>}
            />
            <Line
              type="monotone"
              dataKey="intensity"
              stroke="#ff4444"
              strokeWidth={2}
              dot={false}
              name="能量强度"
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="radius"
              stroke="#44ff44"
              strokeWidth={2}
              dot={false}
              name="释放半径"
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="duration"
              stroke="#4444ff"
              strokeWidth={2}
              dot={false}
              name="持续时间"
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
