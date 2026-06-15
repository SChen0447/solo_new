import express from 'express';
import cors from 'cors';
import type { ProductInfo, CustomizationState, PriceRules, HardwareOption } from '../types';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const mockProduct: ProductInfo = {
  id: 'totebag-001',
  name: '经典托特包',
  description: '手工制作经典托特包，可自定义皮料、颜色与五金件',
  materials: [
    { id: 'leather-001', name: '头层牛皮', grade: 'basic', description: '耐用且易于保养的基础皮料' },
    { id: 'leather-002', name: '植鞣革', grade: 'mid', description: '随使用时间愈发美观的复古皮料' },
    { id: 'leather-003', name: '羊皮', grade: 'premium', description: '柔软细腻触感的高档皮料' },
    { id: 'leather-004', name: '鳄鱼纹牛皮', grade: 'mid', description: '纹理独特的压纹牛皮' },
    { id: 'leather-005', name: '油蜡皮', grade: 'premium', description: '复古油光效果的高档皮料' },
  ],
  colors: [
    { id: 'color-001', name: '经典黑', hex: '#1a1a1a', isCustom: false },
    { id: 'color-002', name: '深棕', hex: '#4a2c0a', isCustom: false },
    { id: 'color-003', name: '驼色', hex: '#c19a6b', isCustom: false },
    { id: 'color-004', name: '酒红', hex: '#722f37', isCustom: false },
    { id: 'color-005', name: '墨绿', hex: '#1a3a2a', isCustom: false },
    { id: 'color-006', name: '藏蓝', hex: '#1a2744', isCustom: false },
    { id: 'color-007', name: '米白', hex: '#f5f0e6', isCustom: false },
    { id: 'color-008', name: '浅灰', hex: '#a8a8a8', isCustom: false },
    { id: 'color-009', name: '橙色', hex: '#e65c00', isCustom: true },
    { id: 'color-010', name: '明黄', hex: '#ffd700', isCustom: true },
    { id: 'color-011', name: '粉色', hex: '#ffb6c1', isCustom: true },
    { id: 'color-012', name: '天蓝', hex: '#87ceeb', isCustom: true },
    { id: 'color-013', name: '紫色', hex: '#6b3fa0', isCustom: true },
    { id: 'color-014', name: '薄荷绿', hex: '#98ff98', isCustom: true },
    { id: 'color-015', name: '珊瑚红', hex: '#ff7f7f', isCustom: true },
    { id: 'color-016', name: '卡其', hex: '#c3b091', isCustom: false },
    { id: 'color-017', name: '橄榄', hex: '#556b2f', isCustom: false },
    { id: 'color-018', name: '勃艮第', hex: '#800020', isCustom: true },
    { id: 'color-019', name: '湖蓝', hex: '#008080', isCustom: true },
    { id: 'color-020', name: '巧克力', hex: '#3d1f0a', isCustom: false },
    { id: 'color-021', name: '沙色', hex: '#c2b280', isCustom: false },
    { id: 'color-022', name: '砖红', hex: '#b22222', isCustom: true },
    { id: 'color-023', name: '靛蓝', hex: '#4b0082', isCustom: true },
    { id: 'color-024', name: '军绿', hex: '#4b5320', isCustom: false },
  ],
  priceRules: {
    basePrice: 899,
    materialMultipliers: {
      'leather-001': 0.10,
      'leather-002': 0.30,
      'leather-003': 0.60,
      'leather-004': 0.30,
      'leather-005': 0.60,
    },
    customColorPremium: 0.05,
    goldHardwarePremium: 0.08,
  },
};

const shareCodes = new Map<string, CustomizationState>();

function generateShareCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

app.get('/api/products', (_req, res) => {
  res.json([mockProduct]);
});

app.get('/api/products/:id', (req, res) => {
  if (req.params.id === mockProduct.id) {
    res.json(mockProduct);
  } else {
    res.status(404).json({ error: 'Product not found' });
  }
});

app.get('/api/price-rules', (_req, res) => {
  res.json(mockProduct.priceRules);
});

app.post('/api/calculate-price', (req, res) => {
  const { materialId, colorId, hardware } = req.body as {
    materialId: string;
    colorId: string;
    hardware: HardwareOption;
  };

  const rules: PriceRules = mockProduct.priceRules;
  let price = rules.basePrice;

  const materialMultiplier = rules.materialMultipliers[materialId] || 0;
  price *= 1 + materialMultiplier;

  const color = mockProduct.colors.find((c) => c.id === colorId);
  if (color?.isCustom) {
    price *= 1 + rules.customColorPremium;
  }

  if (hardware.zipperColor === 'gold') {
    price *= 1 + rules.goldHardwarePremium;
  }

  res.json({ price: Math.round(price * 100) / 100 });
});

app.post('/api/share', (req, res) => {
  const state = req.body as CustomizationState;
  const code = generateShareCode();
  shareCodes.set(code, state);
  res.json({ code, url: `http://localhost:5173/share?code=${code}` });
});

app.get('/api/share/:code', (req, res) => {
  const state = shareCodes.get(req.params.code);
  if (state) {
    res.json(state);
  } else {
    res.status(404).json({ error: 'Share code not found' });
  }
});

app.listen(PORT, () => {
  console.log(`Leather Customizer API running on http://localhost:${PORT}`);
});
