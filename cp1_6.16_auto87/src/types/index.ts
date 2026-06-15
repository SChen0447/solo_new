export type AssetClass = '股票' | '基金' | '加密货币' | '现金';

export type TransactionType = '买入' | '卖出';

export interface Account {
  id: string;
  name: string;
  category: string;
  parentId: string | null;
  initialPrincipal: number;
  createdAt: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  date: string;
  type: TransactionType;
  assetClass: AssetClass;
  amount: number;
  note?: string;
  createdAt: string;
}

export interface AssetAllocation {
  assetClass: AssetClass;
  value: number;
  percentage: number;
}

export interface AccountSummary {
  account: Account;
  totalAssets: number;
  totalProfit: number;
  profitRate: number;
  allocations: AssetAllocation[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export const ASSET_CLASS_COLORS: Record<AssetClass, string> = {
  '股票': '#4CAF50',
  '基金': '#FF9800',
  '加密货币': '#9C27B0',
  '现金': '#2196F3',
};

export const ASSET_CLASSES: AssetClass[] = ['股票', '基金', '加密货币', '现金'];
