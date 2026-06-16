import { AssetType, StrategyConfig, BacktestResult } from './types'
import { getPriceData } from './data'

const RISK_FREE_RATE = 0.02
const MANAGEMENT_FEE = 0.001

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function runBacktest(config: StrategyConfig): BacktestResult {
  const priceData = getPriceData()
  const totalMonths = priceData.length - 1

  const weights = config.weights
  const wStock = weights[AssetType.Stock] / 100
  const wBond = weights[AssetType.Bond] / 100
  const wGold = weights[AssetType.Gold] / 100
  const wCash = weights[AssetType.Cash] / 100

  let portfolioValue = 1.0
  const cumulativeReturns: { date: string; value: number }[] = [
    { date: priceData[0].date, value: 0 }
  ]

  const monthlyReturns: number[] = []
  let peak = 1.0
  let maxDrawdown = 0

  for (let i = 1; i < priceData.length; i++) {
    const prev = priceData[i - 1].prices
    const curr = priceData[i].prices

    const rStock = (curr[AssetType.Stock] - prev[AssetType.Stock]) / prev[AssetType.Stock]
    const rBond = (curr[AssetType.Bond] - prev[AssetType.Bond]) / prev[AssetType.Bond]
    const rGold = (curr[AssetType.Gold] - prev[AssetType.Gold]) / prev[AssetType.Gold]
    const rCash = (curr[AssetType.Cash] - prev[AssetType.Cash]) / prev[AssetType.Cash]

    let monthlyReturn = wStock * rStock + wBond * rBond + wGold * rGold + wCash * rCash

    const shouldRebalance =
      config.rebalanceFrequency === 'monthly' ||
      (config.rebalanceFrequency === 'quarterly' && i % 3 === 0) ||
      (config.rebalanceFrequency === 'yearly' && i % 12 === 0)

    if (config.feeEnabled && shouldRebalance) {
      monthlyReturn -= MANAGEMENT_FEE
    }

    monthlyReturns.push(monthlyReturn)
    portfolioValue *= (1 + monthlyReturn)

    const cumRet = (portfolioValue - 1) * 100
    cumulativeReturns.push({ date: priceData[i].date, value: round2(cumRet) })

    if (portfolioValue > peak) {
      peak = portfolioValue
    }
    const drawdown = (peak - portfolioValue) / peak
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown
    }
  }

  const cumulativeReturn = (portfolioValue - 1) * 100
  const annualizedReturn = (Math.pow(portfolioValue, 12 / totalMonths) - 1) * 100

  const mean = monthlyReturns.reduce((a, b) => a + b, 0) / monthlyReturns.length
  const variance = monthlyReturns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / monthlyReturns.length
  const monthlyStd = Math.sqrt(variance)
  const annualizedVolatility = monthlyStd * Math.sqrt(12) * 100

  const maxDrawdownPct = maxDrawdown * 100
  const sharpeRatio = annualizedVolatility > 0
    ? (annualizedReturn - RISK_FREE_RATE * 100) / annualizedVolatility
    : 0

  return {
    strategyId: config.id,
    cumulativeReturn: round2(cumulativeReturn),
    annualizedReturn: round2(annualizedReturn),
    annualizedVolatility: round2(annualizedVolatility),
    maxDrawdown: round2(maxDrawdownPct),
    sharpeRatio: round2(sharpeRatio),
    cumulativeReturns,
  }
}
