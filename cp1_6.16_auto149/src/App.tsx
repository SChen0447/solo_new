import { useState, useMemo } from 'react'
import { StrategyConfig, BacktestResult, DEFAULT_WEIGHTS } from './types'
import { runBacktest } from './backtest'
import StrategyPanel from './components/StrategyPanel'
import ResultPanel from './components/ResultPanel'

function createDefaultStrategy(index: number): StrategyConfig {
  return {
    id: crypto.randomUUID(),
    name: `策略 ${index}`,
    weights: { ...DEFAULT_WEIGHTS },
    rebalanceFrequency: 'monthly',
    feeEnabled: true,
  }
}

export default function App() {
  const [strategies, setStrategies] = useState<StrategyConfig[]>([
    createDefaultStrategy(1),
    createDefaultStrategy(2),
  ])

  const results: BacktestResult[] = useMemo(() => {
    return strategies.map(s => runBacktest(s))
  }, [strategies])

  return (
    <div style={styles.page}>
      <nav style={styles.nav}>
        <h1 style={styles.navTitle}>资产配置策略回测对比工具</h1>
      </nav>
      <main style={styles.main}>
        <div style={styles.left}>
          <StrategyPanel
            strategies={strategies}
            onStrategiesChange={setStrategies}
          />
        </div>
        <div style={styles.right}>
          <ResultPanel strategies={strategies} results={results} />
        </div>
      </main>
    </div>
  )
}

const styles: Record<string, any> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  nav: {
    height: '60px',
    backgroundColor: '#1A252F',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  },
  navTitle: {
    color: '#FFF',
    fontSize: '22px',
    fontWeight: 700,
    margin: 0,
    letterSpacing: '1px',
  },
  main: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  left: {
    width: '40%',
    minWidth: 0,
    borderRight: '1px solid #DEE2E6',
    overflowY: 'auto',
    backgroundColor: '#FFF',
  },
  right: {
    width: '60%',
    minWidth: 0,
    overflowY: 'auto',
    backgroundColor: '#FFF',
  },
}
