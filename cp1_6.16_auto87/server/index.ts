import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import type {
  Account,
  Transaction,
  AssetAllocation,
  AccountSummary,
  ApiResponse,
  AssetClass,
} from '../src/types';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

let accounts: Account[] = [
  {
    id: '1',
    name: '华泰证券账户',
    category: '股票',
    parentId: null,
    initialPrincipal: 100000,
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: '2',
    name: '支付宝基金',
    category: '基金',
    parentId: null,
    initialPrincipal: 50000,
    createdAt: '2024-02-01T00:00:00.000Z',
  },
  {
    id: '3',
    name: 'A股持仓',
    category: '股票',
    parentId: '1',
    initialPrincipal: 80000,
    createdAt: '2024-01-15T00:00:00.000Z',
  },
];

let transactions: Transaction[] = [
  {
    id: 't1',
    accountId: '1',
    date: '2024-01-10',
    type: '买入',
    assetClass: '股票',
    amount: 50000,
    note: '买入贵州茅台',
    createdAt: '2024-01-10T00:00:00.000Z',
  },
  {
    id: 't2',
    accountId: '1',
    date: '2024-02-15',
    type: '买入',
    assetClass: '股票',
    amount: 30000,
    note: '买入招商银行',
    createdAt: '2024-02-15T00:00:00.000Z',
  },
  {
    id: 't3',
    accountId: '1',
    date: '2024-03-20',
    type: '卖出',
    assetClass: '股票',
    amount: 10000,
    note: '减持部分仓位',
    createdAt: '2024-03-20T00:00:00.000Z',
  },
  {
    id: 't4',
    accountId: '2',
    date: '2024-02-05',
    type: '买入',
    assetClass: '基金',
    amount: 30000,
    note: '易方达蓝筹精选',
    createdAt: '2024-02-05T00:00:00.000Z',
  },
  {
    id: 't5',
    accountId: '2',
    date: '2024-03-10',
    type: '买入',
    assetClass: '基金',
    amount: 20000,
    note: '华夏沪深300',
    createdAt: '2024-03-10T00:00:00.000Z',
  },
  {
    id: 't6',
    accountId: '3',
    date: '2024-01-20',
    type: '买入',
    assetClass: '股票',
    amount: 60000,
    note: '买入宁德时代',
    createdAt: '2024-01-20T00:00:00.000Z',
  },
  {
    id: 't7',
    accountId: '3',
    date: '2024-04-01',
    type: '买入',
    assetClass: '现金',
    amount: 20000,
    note: '闲置资金',
    createdAt: '2024-04-01T00:00:00.000Z',
  },
];

function sendSuccess<T>(res: Response, data: T): void {
  res.json({ success: true, data } as ApiResponse<T>);
}

function sendError(res: Response, error: string, status: number = 400): void {
  res.status(status).json({ success: false, error } as ApiResponse<never>);
}

function calculateAssetAllocations(accountTransactions: Transaction[]): AssetAllocation[] {
  const classValues: Record<AssetClass, number> = {
    '股票': 0,
    '基金': 0,
    '加密货币': 0,
    '现金': 0,
  };

  accountTransactions.forEach((tx) => {
    const sign = tx.type === '买入' ? 1 : -1;
    classValues[tx.assetClass] += sign * tx.amount;
  });

  const totalAssets = Object.values(classValues).reduce((sum, val) => sum + Math.max(0, val), 0);

  const allocations: AssetAllocation[] = Object.entries(classValues)
    .filter(([, value]) => value > 0)
    .map(([assetClass, value]) => ({
      assetClass: assetClass as AssetClass,
      value: Math.round(value * 100) / 100,
      percentage: totalAssets > 0 ? Math.round((value / totalAssets) * 10000) / 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);

  return allocations;
}

function calculateAccountSummary(accountId: string): AccountSummary | null {
  const account = accounts.find((a) => a.id === accountId);
  if (!account) return null;

  const accountTransactions = transactions.filter((t) => t.accountId === accountId);
  const allocations = calculateAssetAllocations(accountTransactions);
  const totalAssets = allocations.reduce((sum, a) => sum + a.value, 0);
  const totalProfit = Math.round((totalAssets - account.initialPrincipal) * 100) / 100;
  const profitRate = account.initialPrincipal > 0
    ? Math.round((totalProfit / account.initialPrincipal) * 10000) / 100
    : 0;

  return {
    account,
    totalAssets: Math.round(totalAssets * 100) / 100,
    totalProfit,
    profitRate,
    allocations,
  };
}

app.get('/api/accounts', (_req: Request, res: Response) => {
  sendSuccess(res, accounts);
});

app.post('/api/accounts', (req: Request, res: Response) => {
  const { name, category, parentId = null, initialPrincipal = 0 } = req.body;

  if (!name || !category) {
    return sendError(res, '账户名称和类别不能为空');
  }

  const newAccount: Account = {
    id: uuidv4(),
    name,
    category,
    parentId,
    initialPrincipal: Number(initialPrincipal) || 0,
    createdAt: new Date().toISOString(),
  };

  accounts.push(newAccount);
  sendSuccess(res, newAccount);
});

app.put('/api/accounts/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, category, initialPrincipal } = req.body;

  const index = accounts.findIndex((a) => a.id === id);
  if (index === -1) {
    return sendError(res, '账户不存在', 404);
  }

  accounts[index] = {
    ...accounts[index],
    ...(name && { name }),
    ...(category && { category }),
    ...(initialPrincipal !== undefined && { initialPrincipal: Number(initialPrincipal) }),
  };

  sendSuccess(res, accounts[index]);
});

app.delete('/api/accounts/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  const index = accounts.findIndex((a) => a.id === id);
  if (index === -1) {
    return sendError(res, '账户不存在', 404);
  }

  const childAccountIds = new Set<string>();
  function findChildren(parentId: string) {
    accounts
      .filter((a) => a.parentId === parentId)
      .forEach((child) => {
        childAccountIds.add(child.id);
        findChildren(child.id);
      });
  }
  findChildren(id);
  childAccountIds.add(id);

  accounts = accounts.filter((a) => !childAccountIds.has(a.id));
  transactions = transactions.filter((t) => !childAccountIds.has(t.accountId));

  sendSuccess(res, { deleted: true });
});

app.get('/api/accounts/:id/summary', (req: Request, res: Response) => {
  const { id } = req.params;
  const summary = calculateAccountSummary(id);

  if (!summary) {
    return sendError(res, '账户不存在', 404);
  }

  sendSuccess(res, summary);
});

app.get('/api/transactions', (req: Request, res: Response) => {
  const { accountId } = req.query;

  let filteredTransactions = transactions;
  if (accountId) {
    filteredTransactions = transactions.filter((t) => t.accountId === accountId);
  }

  filteredTransactions.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  sendSuccess(res, filteredTransactions);
});

app.post('/api/transactions', (req: Request, res: Response) => {
  const { accountId, date, type, assetClass, amount, note } = req.body;

  if (!accountId || !date || !type || !assetClass || !amount) {
    return sendError(res, '请填写完整的交易信息');
  }

  const account = accounts.find((a) => a.id === accountId);
  if (!account) {
    return sendError(res, '账户不存在', 404);
  }

  const newTransaction: Transaction = {
    id: uuidv4(),
    accountId,
    date,
    type,
    assetClass,
    amount: Number(amount),
    note,
    createdAt: new Date().toISOString(),
  };

  transactions.push(newTransaction);
  sendSuccess(res, newTransaction);
});

app.put('/api/transactions/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { date, type, assetClass, amount, note } = req.body;

  const index = transactions.findIndex((t) => t.id === id);
  if (index === -1) {
    return sendError(res, '交易记录不存在', 404);
  }

  transactions[index] = {
    ...transactions[index],
    ...(date && { date }),
    ...(type && { type }),
    ...(assetClass && { assetClass }),
    ...(amount !== undefined && { amount: Number(amount) }),
    ...(note !== undefined && { note }),
  };

  sendSuccess(res, transactions[index]);
});

app.delete('/api/transactions/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  const index = transactions.findIndex((t) => t.id === id);
  if (index === -1) {
    return sendError(res, '交易记录不存在', 404);
  }

  transactions.splice(index, 1);
  sendSuccess(res, { deleted: true });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
