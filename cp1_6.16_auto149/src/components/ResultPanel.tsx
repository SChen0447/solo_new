import { useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { BacktestResult, StrategyConfig, STRATEGY_COLORS } from '../types'

interface ResultPanelProps {
  strategies: StrategyConfig[]
  results: BacktestResult[]
}

const METRICS = [
  { key: 'cumulativeReturn', label: '累计收益率 (%)' },
  { key: 'annualizedReturn', label: '年化收益率 (%)' },
  { key: 'annualizedVolatility', label: '年化波动率 (%)' },
  { key: 'maxDrawdown', label: '最大回撤 (%)' },
  { key: 'sharpeRatio', label: '夏普比率' },
] as const

const ALL_DATES: string[] = []
for (let y = 2021; y <= 2023; y++) {
  for (let m = 1; m <= 12; m++) {
    ALL_DATES.push(`${y}-${String(m).padStart(2, '0')}`)
  }
}

interface ChartDataPoint {
  date: string
  [key: string]: string | number
}

function buildChartData(results: BacktestResult[]): ChartDataPoint[] {
  return ALL_DATES.map(date => {
    const point: ChartDataPoint = { date }
    results.forEach(r => {
      const found = r.cumulativeReturns.find(c => c.date === date)
      point[r.strategyId] = found ? found.value : 0
    })
    return point
  })
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null
  return (
    <div style={{
      backgroundColor: '#333',
      color: '#FFF',
      borderRadius: '4px',
      padding: '8px 12px',
      fontSize: '12px',
      lineHeight: '1.6',
    }}>
      <div style={{ marginBottom: '4px', fontWeight: 600 }}>{label}</div>
      {payload.map((entry: any, i: number) => (
        <div key={i}>
          <span style={{ color: entry.color }}>●</span>{' '}
          {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}%
        </div>
      ))}
    </div>
  )
}

export default function ResultPanel({ strategies, results }: ResultPanelProps) {
  const [fadeKey, setFadeKey] = useState(0)
  const [opacity, setOpacity] = useState(1)

  useEffect(() => {
    setOpacity(0)
    const timer = setTimeout(() => {
      setFadeKey(k => k + 1)
      setOpacity(1)
    }, 50)
    return () => clearTimeout(timer)
  }, [strategies.map(s => s.id + JSON.stringify(s.weights) + s.rebalanceFrequency + s.feeEnabled).join(',')])

  const chartData = buildChartData(results)

  return (
    <div style={styles.container}>
      <div style={styles.tableSection}>
        <h2 style={styles.title}>回测指标对比</h2>
        {results.length === 0 ? (
          <div style={styles.empty}>请添加策略以查看回测结果</div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.thFirst}>指标</th>
                  {results.map((r, i) => (
                    <th key={r.strategyId} style={styles.th}>
                      <span style={styles.colorDot(STRATEGY_COLORS[i % STRATEGY_COLORS.length])} />
                      {strategies.find(s => s.id === r.strategyId)?.name || r.strategyId}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {METRICS.map((metric, rowIdx) => (
                  <tr key={metric.key}>
                    <td style={styles.tdLabel}>{metric.label}</td>
                    {results.map((r) => (
                      <td key={r.strategyId} style={styles.td(rowIdx % 2 === 0)}>
                        {(r as any)[metric.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={styles.chartSection}>
        <h2 style={styles.title}>累计收益率走势</h2>
        {results.length === 0 ? (
          <div style={styles.empty}>请添加策略以查看走势图</div>
        ) : (
          <div
            key={fadeKey}
            style={{
              ...styles.chartWrapper,
              opacity,
              transition: 'opacity 0.3s ease-in-out',
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E9ECEF" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#7F8C8D' }}
                  interval={2}
                  tickFormatter={(v: string) => v}
                />
                <YAxis
                  domain={[-30, 50]}
                  tick={{ fontSize: 11, fill: '#7F8C8D' }}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  formatter={(value: string) => {
                    const s = strategies.find(s => s.id === value)
                    return s?.name || value
                  }}
                />
                {results.map((r, i) => (
                  <Line
                    key={r.strategyId}
                    type="monotone"
                    dataKey={r.strategyId}
                    stroke={STRATEGY_COLORS[i % STRATEGY_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                    name={r.strategyId}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, any> = {
  container: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    boxSizing: 'border-box',
  },
  title: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#2C3E50',
    margin: '0 0 12px 0',
  },
  tableSection: {
    flex: '0 0 40%',
    marginBottom: '16px',
  },
  chartSection: {
    flex: '0 0 60%',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '13px',
  },
  thFirst: {
    backgroundColor: '#2C3E50',
    color: '#FFF',
    padding: '10px 12px',
    textAlign: 'left' as const,
    fontWeight: 600,
    position: 'sticky' as const,
    left: 0,
    zIndex: 1,
  },
  th: {
    backgroundColor: '#2C3E50',
    color: '#FFF',
    padding: '10px 12px',
    textAlign: 'center' as const,
    fontWeight: 600,
    whiteSpace: 'nowrap' as const,
  },
  tdLabel: {
    padding: '8px 12px',
    fontWeight: 500,
    color: '#2C3E50',
    backgroundColor: '#F8F9FA',
    textAlign: 'left' as const,
    borderBottom: '1px solid #E9ECEF',
  },
  td: (even: boolean) => ({
    padding: '8px 12px',
    textAlign: 'center' as const,
    color: '#2C3E50',
    backgroundColor: even ? '#F8F9FA' : '#E9ECEF',
    borderBottom: '1px solid #DEE2E6',
    fontWeight: 500,
  }),
  colorDot: (color: string) => ({
    display: 'inline-block',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: color,
    marginRight: '6px',
    verticalAlign: 'middle',
  }),
  empty: {
    color: '#95A5A6',
    fontSize: '14px',
    padding: '40px 0',
    textAlign: 'center' as const,
  },
  chartWrapper: {
    flex: 1,
    minHeight: '260px',
  },
}
