import { useState } from 'react'
import { AssetType, ASSET_LABELS, StrategyConfig, DEFAULT_WEIGHTS, STRATEGY_COLORS } from '../types'

interface StrategyPanelProps {
  strategies: StrategyConfig[]
  onStrategiesChange: (strategies: StrategyConfig[]) => void
}

const ASSET_TYPES = [AssetType.Stock, AssetType.Bond, AssetType.Gold, AssetType.Cash]
const STEP = 5

export default function StrategyPanel({ strategies, onStrategiesChange }: StrategyPanelProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const addStrategy = () => {
    if (strategies.length >= 5) return
    const id = crypto.randomUUID()
    const newStrategy: StrategyConfig = {
      id,
      name: `策略 ${strategies.length + 1}`,
      weights: { ...DEFAULT_WEIGHTS },
      rebalanceFrequency: 'monthly',
      feeEnabled: true,
    }
    onStrategiesChange([...strategies, newStrategy])
  }

  const removeStrategy = (id: string) => {
    onStrategiesChange(strategies.filter(s => s.id !== id))
  }

  const updateStrategy = (id: string, updates: Partial<StrategyConfig>) => {
    onStrategiesChange(strategies.map(s => s.id === id ? { ...s, ...updates } : s))
  }

  const updateWeight = (id: string, asset: AssetType, value: number) => {
    const strategy = strategies.find(s => s.id === id)
    if (!strategy) return
    const newWeights = { ...strategy.weights, [asset]: value }
    updateStrategy(id, { weights: newWeights })
  }

  const getTotalWeight = (strategy: StrategyConfig) => {
    return ASSET_TYPES.reduce((sum, a) => sum + strategy.weights[a], 0)
  }

  const toggleCollapse = (id: string) => {
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>策略配置</h2>
      <div style={styles.cardList}>
        {strategies.map((strategy, index) => {
          const total = getTotalWeight(strategy)
          const isValid = total === 100
          const isCollapsed = collapsed[strategy.id] || false
          const color = STRATEGY_COLORS[index % STRATEGY_COLORS.length]

          return (
            <div key={strategy.id} style={styles.card}>
              <div
                style={styles.cardHeader}
                onClick={() => toggleCollapse(strategy.id)}
              >
                <span style={styles.cardDot(color)} />
                <span style={styles.cardName}>{strategy.name}</span>
                <span style={styles.collapseIcon}>{isCollapsed ? '▶' : '▼'}</span>
                {strategies.length > 1 && (
                  <button
                    style={styles.deleteBtn}
                    onClick={(e) => { e.stopPropagation(); removeStrategy(strategy.id) }}
                    title="删除策略"
                  >
                    ✕
                  </button>
                )}
              </div>

              {!isCollapsed && (
                <div style={styles.cardBody}>
                  {ASSET_TYPES.map(asset => (
                    <div key={asset} style={styles.sliderRow}>
                      <label style={styles.sliderLabel}>{ASSET_LABELS[asset]}</label>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={STEP}
                        value={strategy.weights[asset]}
                        onChange={e => updateWeight(strategy.id, asset, Number(e.target.value))}
                        style={styles.slider}
                      />
                      <span style={styles.sliderValue}>{strategy.weights[asset]}%</span>
                    </div>
                  ))}

                  {!isValid && (
                    <div style={styles.errorText}>
                      权重总和为 {total}%，必须等于 100%
                    </div>
                  )}

                  <div style={styles.selectRow}>
                    <label style={styles.selectLabel}>再平衡频率</label>
                    <select
                      value={strategy.rebalanceFrequency}
                      onChange={e => updateStrategy(strategy.id, { rebalanceFrequency: e.target.value as StrategyConfig['rebalanceFrequency'] })}
                      style={styles.select}
                    >
                      <option value="monthly">每月</option>
                      <option value="quarterly">每季度</option>
                      <option value="yearly">每年</option>
                    </select>
                  </div>

                  <div style={styles.switchRow}>
                    <label style={styles.switchLabel}>扣除管理费 (0.1%)</label>
                    <button
                      style={styles.switchBtn(strategy.feeEnabled)}
                      onClick={() => updateStrategy(strategy.id, { feeEnabled: !strategy.feeEnabled })}
                    >
                      <span style={styles.switchKnob(strategy.feeEnabled)} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <button
        className="add-strategy-btn"
        style={styles.addBtn}
        onClick={addStrategy}
        disabled={strategies.length >= 5}
      >
        + 添加新策略
      </button>
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
    margin: '0 0 16px 0',
  },
  cardList: {
    flex: 1,
    overflowY: 'auto',
  },
  card: {
    borderRadius: '8px',
    backgroundColor: '#FFFFFF',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    marginBottom: '12px',
    overflow: 'hidden',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    cursor: 'pointer',
    borderBottom: '1px solid #E9ECEF',
    userSelect: 'none' as const,
  },
  cardDot: (color: string) => ({
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: color,
    marginRight: '10px',
    flexShrink: 0,
  }),
  cardName: {
    flex: 1,
    fontWeight: 600,
    fontSize: '14px',
    color: '#2C3E50',
  },
  collapseIcon: {
    fontSize: '12px',
    color: '#95A5A6',
    marginRight: '8px',
  },
  deleteBtn: {
    border: 'none',
    background: 'none',
    color: '#E74C3C',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  cardBody: {
    padding: '16px',
  },
  sliderRow: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '10px',
  },
  sliderLabel: {
    width: '50px',
    fontSize: '13px',
    color: '#555',
    flexShrink: 0,
  },
  slider: {
    flex: 1,
    margin: '0 10px',
    accentColor: '#3498DB',
    height: '6px',
  },
  sliderValue: {
    width: '45px',
    fontSize: '13px',
    fontWeight: 600,
    color: '#2C3E50',
    textAlign: 'right' as const,
    flexShrink: 0,
  },
  errorText: {
    color: '#E74C3C',
    fontSize: '12px',
    marginTop: '4px',
    marginBottom: '8px',
    fontWeight: 500,
  },
  selectRow: {
    display: 'flex',
    alignItems: 'center',
    marginTop: '12px',
    marginBottom: '8px',
  },
  selectLabel: {
    width: '100px',
    fontSize: '13px',
    color: '#555',
  },
  select: {
    flex: 1,
    padding: '6px 10px',
    borderRadius: '4px',
    border: '1px solid #CED4DA',
    fontSize: '13px',
    color: '#2C3E50',
    backgroundColor: '#FFF',
  },
  switchRow: {
    display: 'flex',
    alignItems: 'center',
    marginTop: '8px',
  },
  switchLabel: {
    width: '160px',
    fontSize: '13px',
    color: '#555',
  },
  switchBtn: (on: boolean) => ({
    width: '44px',
    height: '24px',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: on ? '#3498DB' : '#CED4DA',
    cursor: 'pointer',
    position: 'relative' as const,
    transition: 'background-color 0.2s',
    padding: 0,
  }),
  switchKnob: (on: boolean) => ({
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: '#FFF',
    position: 'absolute' as const,
    top: '2px',
    left: on ? '22px' : '2px',
    transition: 'left 0.2s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
  }),
  addBtn: {
    width: '100%',
    padding: '12px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#3498DB',
    color: '#FFF',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '12px',
    transition: 'background-color 0.2s',
  },
}
