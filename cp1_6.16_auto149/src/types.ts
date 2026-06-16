export enum AssetType {
  Stock = 'stock',
  Bond = 'bond',
  Gold = 'gold',
  Cash = 'cash',
}

export const ASSET_LABELS: Record<AssetType, string> = {
  [AssetType.Stock]: '股票',
  [AssetType.Bond]: '债券',
  [AssetType.Gold]: '黄金',
  [AssetType.Cash]: '现金',
}

export type RebalanceFrequency = 'monthly' | 'quarterly' | 'yearly'

export interface StrategyConfig {
  id: string
  name: string
  weights: Record<AssetType, number>
  rebalanceFrequency: RebalanceFrequency
  feeEnabled: boolean
}

export interface BacktestResult {
  strategyId: string
  cumulativeReturn: number
  annualizedReturn: number
  annualizedVolatility: number
  maxDrawdown: number
  sharpeRatio: number
  cumulativeReturns: { date: string; value: number }[]
}

export const STRATEGY_COLORS = ['#3498DB', '#E74C3C', '#2ECC71', '#F39C12', '#9B59B6']

export const DEFAULT_WEIGHTS: Record<AssetType, number> = {
  [AssetType.Stock]: 40,
  [AssetType.Bond]: 30,
  [AssetType.Gold]: 20,
  [AssetType.Cash]: 10,
}
