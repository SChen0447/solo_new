import { AssetType, ASSET_LABELS } from './types'

export interface PricePoint {
  date: string
  prices: Record<AssetType, number>
}

const PRICE_DATA: PricePoint[] = [
  { date: '2021-01', prices: { [AssetType.Stock]: 100, [AssetType.Bond]: 100, [AssetType.Gold]: 100, [AssetType.Cash]: 100 } },
  { date: '2021-02', prices: { [AssetType.Stock]: 97,  [AssetType.Bond]: 101, [AssetType.Gold]: 99,  [AssetType.Cash]: 100 } },
  { date: '2021-03', prices: { [AssetType.Stock]: 103, [AssetType.Bond]: 102, [AssetType.Gold]: 98,  [AssetType.Cash]: 100 } },
  { date: '2021-04', prices: { [AssetType.Stock]: 108, [AssetType.Bond]: 101, [AssetType.Gold]: 100, [AssetType.Cash]: 100 } },
  { date: '2021-05', prices: { [AssetType.Stock]: 105, [AssetType.Bond]: 103, [AssetType.Gold]: 101, [AssetType.Cash]: 100 } },
  { date: '2021-06', prices: { [AssetType.Stock]: 110, [AssetType.Bond]: 104, [AssetType.Gold]: 99,  [AssetType.Cash]: 100 } },
  { date: '2021-07', prices: { [AssetType.Stock]: 112, [AssetType.Bond]: 105, [AssetType.Gold]: 100, [AssetType.Cash]: 100 } },
  { date: '2021-08', prices: { [AssetType.Stock]: 109, [AssetType.Bond]: 106, [AssetType.Gold]: 102, [AssetType.Cash]: 100 } },
  { date: '2021-09', prices: { [AssetType.Stock]: 106, [AssetType.Bond]: 107, [AssetType.Gold]: 103, [AssetType.Cash]: 100 } },
  { date: '2021-10', prices: { [AssetType.Stock]: 111, [AssetType.Bond]: 106, [AssetType.Gold]: 104, [AssetType.Cash]: 100 } },
  { date: '2021-11', prices: { [AssetType.Stock]: 115, [AssetType.Bond]: 107, [AssetType.Gold]: 103, [AssetType.Cash]: 100 } },
  { date: '2021-12', prices: { [AssetType.Stock]: 118, [AssetType.Bond]: 108, [AssetType.Gold]: 102, [AssetType.Cash]: 100 } },
  { date: '2022-01', prices: { [AssetType.Stock]: 113, [AssetType.Bond]: 107, [AssetType.Gold]: 103, [AssetType.Cash]: 100 } },
  { date: '2022-02', prices: { [AssetType.Stock]: 108, [AssetType.Bond]: 106, [AssetType.Gold]: 105, [AssetType.Cash]: 100 } },
  { date: '2022-03', prices: { [AssetType.Stock]: 104, [AssetType.Bond]: 105, [AssetType.Gold]: 108, [AssetType.Cash]: 100 } },
  { date: '2022-04', prices: { [AssetType.Stock]: 99,  [AssetType.Bond]: 104, [AssetType.Gold]: 110, [AssetType.Cash]: 100 } },
  { date: '2022-05', prices: { [AssetType.Stock]: 95,  [AssetType.Bond]: 105, [AssetType.Gold]: 109, [AssetType.Cash]: 100 } },
  { date: '2022-06', prices: { [AssetType.Stock]: 92,  [AssetType.Bond]: 106, [AssetType.Gold]: 108, [AssetType.Cash]: 100 } },
  { date: '2022-07', prices: { [AssetType.Stock]: 96,  [AssetType.Bond]: 107, [AssetType.Gold]: 107, [AssetType.Cash]: 100 } },
  { date: '2022-08', prices: { [AssetType.Stock]: 93,  [AssetType.Bond]: 108, [AssetType.Gold]: 106, [AssetType.Cash]: 100 } },
  { date: '2022-09', prices: { [AssetType.Stock]: 90,  [AssetType.Bond]: 109, [AssetType.Gold]: 108, [AssetType.Cash]: 100 } },
  { date: '2022-10', prices: { [AssetType.Stock]: 88,  [AssetType.Bond]: 110, [AssetType.Gold]: 110, [AssetType.Cash]: 100 } },
  { date: '2022-11', prices: { [AssetType.Stock]: 91,  [AssetType.Bond]: 111, [AssetType.Gold]: 112, [AssetType.Cash]: 100 } },
  { date: '2022-12', prices: { [AssetType.Stock]: 95,  [AssetType.Bond]: 112, [AssetType.Gold]: 114, [AssetType.Cash]: 100 } },
  { date: '2023-01', prices: { [AssetType.Stock]: 100, [AssetType.Bond]: 113, [AssetType.Gold]: 113, [AssetType.Cash]: 100 } },
  { date: '2023-02', prices: { [AssetType.Stock]: 104, [AssetType.Bond]: 112, [AssetType.Gold]: 111, [AssetType.Cash]: 100 } },
  { date: '2023-03', prices: { [AssetType.Stock]: 107, [AssetType.Bond]: 111, [AssetType.Gold]: 113, [AssetType.Cash]: 100 } },
  { date: '2023-04', prices: { [AssetType.Stock]: 112, [AssetType.Bond]: 110, [AssetType.Gold]: 115, [AssetType.Cash]: 100 } },
  { date: '2023-05', prices: { [AssetType.Stock]: 116, [AssetType.Bond]: 111, [AssetType.Gold]: 114, [AssetType.Cash]: 100 } },
  { date: '2023-06', prices: { [AssetType.Stock]: 120, [AssetType.Bond]: 112, [AssetType.Gold]: 112, [AssetType.Cash]: 100 } },
  { date: '2023-07', prices: { [AssetType.Stock]: 123, [AssetType.Bond]: 113, [AssetType.Gold]: 113, [AssetType.Cash]: 100 } },
  { date: '2023-08', prices: { [AssetType.Stock]: 119, [AssetType.Bond]: 114, [AssetType.Gold]: 114, [AssetType.Cash]: 100 } },
  { date: '2023-09', prices: { [AssetType.Stock]: 122, [AssetType.Bond]: 115, [AssetType.Gold]: 113, [AssetType.Cash]: 100 } },
  { date: '2023-10', prices: { [AssetType.Stock]: 126, [AssetType.Bond]: 114, [AssetType.Gold]: 115, [AssetType.Cash]: 100 } },
  { date: '2023-11', prices: { [AssetType.Stock]: 130, [AssetType.Bond]: 115, [AssetType.Gold]: 114, [AssetType.Cash]: 100 } },
  { date: '2023-12', prices: { [AssetType.Stock]: 135, [AssetType.Bond]: 116, [AssetType.Gold]: 116, [AssetType.Cash]: 100 } },
]

export function getPriceData(): PricePoint[] {
  return PRICE_DATA
}

export function getAssetNames(): Record<AssetType, string> {
  return ASSET_LABELS
}
