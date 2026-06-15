import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { parse as csvParse } from 'csv-parse/sync';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = 3001;
const DATA_DIR = path.join(process.cwd(), 'data');
const TRANSACTIONS_FILE = path.join(DATA_DIR, 'transactions.json');
const BUDGETS_FILE = path.join(DATA_DIR, 'budgets.json');

app.use(cors());
app.use(express.json({ limit: '50mb' }));

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJSON<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data) as T;
    }
  } catch {
    // ignore parse errors
  }
  return fallback;
}

function writeJSON<T>(filePath: string, data: T): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

interface Transaction {
  id: string;
  amount: number;
  date: string;
  category: string;
  note: string;
  type: 'expense' | 'income';
}

interface Budget {
  category: string;
  amount: number;
}

const CATEGORIES = [
  '餐饮', '交通', '购物', '娱乐', '居住', '医疗',
  '教育', '通讯', '服饰', '美容', '运动', '旅行',
  '社交', '宠物', '其他'
];

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  '餐饮': ['餐', '食', '饭', '外卖', '奶茶', '咖啡', '超市', '水果', '零食', '麦当劳', '肯德基', '星巴克', '美团', '饿了么'],
  '交通': ['地铁', '公交', '出租', '滴滴', '加油', '停车', '高速', '火车', '机票', '航空', '铁路'],
  '购物': ['淘宝', '京东', '拼多多', '亚马逊', '商城', '百货'],
  '娱乐': ['电影', '游戏', '音乐', 'KTV', '酒吧', '演出'],
  '居住': ['房租', '物业', '水费', '电费', '燃气', '维修', '装修'],
  '医疗': ['医院', '药', '体检', '挂号', '诊所'],
  '教育': ['学费', '培训', '书', '课程', '考试'],
  '通讯': ['话费', '流量', '宽带', '会员'],
  '服饰': ['衣', '鞋', '包', '首饰', '眼镜'],
  '美容': ['理发', '美发', '护肤', '化妆', '美甲', 'SPA'],
  '运动': ['健身', '瑜伽', '游泳', '跑步', '球'],
  '旅行': ['酒店', '民宿', '景点', '签证', '机票'],
  '社交': ['红包', '礼金', '请客', '聚会'],
  '宠物': ['猫', '狗', '宠物', '兽医'],
  '其他': [],
};

function autoClassify(note: string): string {
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (note.includes(keyword)) {
        return category;
      }
    }
  }
  return '';
}

// GET /api/transactions
app.get('/api/transactions', (_req, res) => {
  const transactions = readJSON<Transaction[]>(TRANSACTIONS_FILE, []);
  res.json(transactions);
});

// POST /api/transactions
app.post('/api/transactions', (req, res) => {
  const transactions = readJSON<Transaction[]>(TRANSACTIONS_FILE, []);
  const newTx: Transaction = {
    id: uuidv4(),
    amount: Number(req.body.amount) || 0,
    date: req.body.date || new Date().toISOString().slice(0, 10),
    category: req.body.category || '其他',
    note: req.body.note || '',
    type: req.body.type || 'expense',
  };
  transactions.push(newTx);
  writeJSON(TRANSACTIONS_FILE, transactions);
  res.json(newTx);
});

// PUT /api/transactions/:id
app.put('/api/transactions/:id', (req, res) => {
  const transactions = readJSON<Transaction[]>(TRANSACTIONS_FILE, []);
  const idx = transactions.findIndex((t) => t.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Transaction not found' });
    return;
  }
  transactions[idx] = { ...transactions[idx], ...req.body, id: transactions[idx].id };
  writeJSON(TRANSACTIONS_FILE, transactions);
  res.json(transactions[idx]);
});

// DELETE /api/transactions/:id
app.delete('/api/transactions/:id', (req, res) => {
  let transactions = readJSON<Transaction[]>(TRANSACTIONS_FILE, []);
  const len = transactions.length;
  transactions = transactions.filter((t) => t.id !== req.params.id);
  if (transactions.length === len) {
    res.status(404).json({ error: 'Transaction not found' });
    return;
  }
  writeJSON(TRANSACTIONS_FILE, transactions);
  res.json({ success: true });
});

// POST /api/transactions/batch
app.post('/api/transactions/batch', (req, res) => {
  const transactions = readJSON<Transaction[]>(TRANSACTIONS_FILE, []);
  const items: Transaction[] = (req.body.transactions || []).map((t: Partial<Transaction>) => ({
    id: uuidv4(),
    amount: Number(t.amount) || 0,
    date: t.date || new Date().toISOString().slice(0, 10),
    category: t.category || '其他',
    note: t.note || '',
    type: t.type || 'expense',
  }));
  transactions.push(...items);
  writeJSON(TRANSACTIONS_FILE, transactions);
  res.json(items);
});

const upload = multer({ dest: path.join(DATA_DIR, 'uploads/') });

// POST /api/csv/upload
app.post('/api/csv/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  try {
    const fileContent = fs.readFileSync(req.file.path, 'utf-8');
    const records = csvParse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const transactions = readJSON<Transaction[]>(TRANSACTIONS_FILE, []);
    const parsed: Transaction[] = [];
    const unmatched: { index: number; row: Record<string, string> }[] = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i] as Record<string, string>;
      const amount = Math.abs(parseFloat(row['金额'] || row['amount'] || row['Amount'] || '0'));
      const date = row['日期'] || row['date'] || row['Date'] || new Date().toISOString().slice(0, 10);
      const note = row['备注'] || row['note'] || row['Description'] || row['描述'] || '';
      const type = amount > 0 && (row['类型'] || row['type'] || '').includes('收') ? 'income' : 'expense';

      const category = autoClassify(note);
      if (!category) {
        unmatched.push({ index: i, row });
      }

      const tx: Transaction = {
        id: uuidv4(),
        amount,
        date,
        category: category || '其他',
        note,
        type,
      };
      parsed.push(tx);
    }

    transactions.push(...parsed);
    writeJSON(TRANSACTIONS_FILE, transactions);

    fs.unlinkSync(req.file.path);

    res.json({
      total: records.length,
      imported: parsed.length,
      unmatched,
      transactions: parsed,
    });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'CSV parse failed', detail: (err as Error).message });
  }
});

// PUT /api/transactions/:id/category
app.put('/api/transactions/:id/category', (req, res) => {
  const transactions = readJSON<Transaction[]>(TRANSACTIONS_FILE, []);
  const idx = transactions.findIndex((t) => t.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Transaction not found' });
    return;
  }
  transactions[idx].category = req.body.category || '其他';
  writeJSON(TRANSACTIONS_FILE, transactions);
  res.json(transactions[idx]);
});

// GET /api/budgets
app.get('/api/budgets', (_req, res) => {
  const budgets = readJSON<Budget[]>(BUDGETS_FILE, CATEGORIES.map((c) => ({ category: c, amount: 0 })));
  res.json(budgets);
});

// PUT /api/budgets
app.put('/api/budgets', (req, res) => {
  const budgets: Budget[] = req.body.budgets;
  if (!Array.isArray(budgets)) {
    res.status(400).json({ error: 'Invalid budgets data' });
    return;
  }
  writeJSON(BUDGETS_FILE, budgets);
  res.json(budgets);
});

// GET /api/categories
app.get('/api/categories', (_req, res) => {
  res.json(CATEGORIES);
});

// POST /api/report/generate
app.post('/api/report/generate', (req, res) => {
  const transactions = readJSON<Transaction[]>(TRANSACTIONS_FILE, []);
  const budgets = readJSON<Budget[]>(BUDGETS_FILE, CATEGORIES.map((c) => ({ category: c, amount: 0 })));

  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const recentTx = transactions.filter((t) => new Date(t.date) >= threeMonthsAgo);

  const totalExpense = recentTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalIncome = recentTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

  const budgetMap = new Map(budgets.map((b) => [b.category, b.amount]));
  const categoryExpense = new Map<string, number>();
  for (const t of recentTx.filter((t) => t.type === 'expense')) {
    categoryExpense.set(t.category, (categoryExpense.get(t.category) || 0) + t.amount);
  }

  let budgetCompliance = 0;
  let budgetCount = 0;
  for (const [cat, spent] of categoryExpense) {
    const limit = budgetMap.get(cat) || 0;
    if (limit > 0) {
      budgetCount++;
      if (spent <= limit) budgetCompliance++;
    }
  }
  const budgetAdherenceRate = budgetCount > 0 ? (budgetCompliance / budgetCount) * 100 : 100;

  const monthlyExpenses = new Map<string, number>();
  for (const t of recentTx.filter((t) => t.type === 'expense')) {
    const key = t.date.slice(0, 7);
    monthlyExpenses.set(key, (monthlyExpenses.get(key) || 0) + t.amount);
  }
  const expenseValues = Array.from(monthlyExpenses.values());
  const avgExpense = expenseValues.length > 0 ? expenseValues.reduce((a, b) => a + b, 0) / expenseValues.length : 0;
  const variance = expenseValues.length > 1
    ? expenseValues.reduce((s, v) => s + Math.pow(v - avgExpense, 2), 0) / (expenseValues.length - 1)
    : 0;
  const stabilityScore = avgExpense > 0 ? Math.max(0, 100 - (Math.sqrt(variance) / avgExpense) * 100) : 50;

  const score = Math.round(
    Math.min(100, Math.max(0,
      savingsRate * 0.35 +
      budgetAdherenceRate * 0.3 +
      stabilityScore * 0.2 +
      (totalIncome > totalExpense ? 15 : 0)
    ))
  );

  const suggestions: string[] = [];
  if (savingsRate < 20) {
    suggestions.push('建议将储蓄率提高至20%以上，每月至少存下收入的五分之一。');
  }
  if (budgetAdherenceRate < 80) {
    suggestions.push('部分类别超支较多，建议重新审视预算设置或控制消费冲动。');
  }
  const topCategory = Array.from(categoryExpense.entries()).sort((a, b) => b[1] - a[1])[0];
  if (topCategory) {
    suggestions.push(`近3个月最大支出类别为「${topCategory[0]}」，建议关注是否有优化空间。`);
  }
  if (stabilityScore < 60) {
    suggestions.push('月度支出波动较大，建议建立应急基金以应对突发支出。');
  }
  if (suggestions.length < 5) {
    suggestions.push('坚持记账习惯，持续追踪财务状况是理财成功的第一步。');
  }

  const report = {
    score,
    totalExpense,
    totalIncome,
    savingsRate: Math.round(savingsRate * 10) / 10,
    budgetAdherenceRate: Math.round(budgetAdherenceRate * 10) / 10,
    stabilityScore: Math.round(stabilityScore * 10) / 10,
    categoryBreakdown: Object.fromEntries(categoryExpense),
    suggestions: suggestions.slice(0, 5),
    generatedAt: new Date().toISOString(),
  };

  res.json(report);
});

// POST /api/report/export-pdf
app.post('/api/report/export-pdf', async (req, res) => {
  try {
    const puppeteer = await import('puppeteer');
    const html = req.body.html;
    if (!html) {
      res.status(400).json({ error: 'No HTML content provided' });
      return;
    }

    const browser = await puppeteer.default.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
    });
    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=finance-report.pdf');
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ error: 'PDF generation failed', detail: (err as Error).message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
