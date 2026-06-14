import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import type { Vendor, Patrol, VendorStatus, VendorCategory } from '../src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const DATA_DIR = path.join(__dirname, '..', 'src', 'data');
const VENDORS_FILE = path.join(DATA_DIR, 'vendors.json');
const PATROLS_FILE = path.join(DATA_DIR, 'patrols.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readVendors(): Vendor[] {
  if (!fs.existsSync(VENDORS_FILE)) return [];
  const data = fs.readFileSync(VENDORS_FILE, 'utf-8');
  return JSON.parse(data);
}

function writeVendors(vendors: Vendor[]): void {
  fs.writeFileSync(VENDORS_FILE, JSON.stringify(vendors, null, 2), 'utf-8');
}

function readPatrols(): Patrol[] {
  if (!fs.existsSync(PATROLS_FILE)) return [];
  const data = fs.readFileSync(PATROLS_FILE, 'utf-8');
  return JSON.parse(data);
}

function writePatrols(patrols: Patrol[]): void {
  fs.writeFileSync(PATROLS_FILE, JSON.stringify(patrols, null, 2), 'utf-8');
}

function updateVendorStatuses(): void {
  const vendors = readVendors();
  const now = new Date();
  let changed = false;
  vendors.forEach(v => {
    if (v.status === '有效') {
      const endDate = new Date(v.endDate);
      if (endDate < now) {
        v.status = '过期';
        v.updatedAt = now.toISOString();
        changed = true;
      }
    }
  });
  if (changed) writeVendors(vendors);
}

app.get('/api/vendors', (req, res) => {
  updateVendorStatuses();
  let vendors = readVendors();
  const { keyword, category, status, stallNumber } = req.query;

  if (keyword && typeof keyword === 'string') {
    const kw = keyword.toLowerCase();
    vendors = vendors.filter(v =>
      v.name.toLowerCase().includes(kw) ||
      v.idCard.includes(kw) ||
      v.phone.includes(kw)
    );
  }

  if (category && typeof category === 'string' && category !== '') {
    vendors = vendors.filter(v => v.category === category);
  }

  if (status && typeof status === 'string' && status !== '') {
    vendors = vendors.filter(v => v.status === status);
  }

  if (stallNumber && typeof stallNumber === 'string') {
    vendors = vendors.filter(v => v.stallNumber.includes(stallNumber));
  }

  vendors.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(vendors);
});

app.get('/api/vendors/:id', (req, res) => {
  updateVendorStatuses();
  const vendors = readVendors();
  const vendor = vendors.find(v => v.id === req.params.id);
  if (!vendor) return res.status(404).json({ error: '摊贩不存在' });
  res.json(vendor);
});

app.post('/api/vendors', (req, res) => {
  const vendors = readVendors();
  const now = new Date();
  const startDate = new Date(req.body.startDate || now.toISOString());
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 30);

  const colors = ['#FF9F43', '#F57C00', '#FFBE76', '#9C7E5A', '#7D5E3D', '#E65100'];

  const newVendor: Vendor = {
    id: uuidv4(),
    name: req.body.name,
    idCard: req.body.idCard,
    phone: req.body.phone,
    category: req.body.category,
    stallNumber: req.body.stallNumber || `TF-${String(vendors.length + 1).padStart(4, '0')}`,
    location: req.body.location || { lat: 39.9042, lng: 116.4074 },
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    status: '有效',
    avatarColor: colors[Math.floor(Math.random() * colors.length)],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  vendors.push(newVendor);
  writeVendors(vendors);
  res.status(201).json(newVendor);
});

app.put('/api/vendors/:id', (req, res) => {
  const vendors = readVendors();
  const idx = vendors.findIndex(v => v.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '摊贩不存在' });

  vendors[idx] = {
    ...vendors[idx],
    ...req.body,
    updatedAt: new Date().toISOString(),
  };

  writeVendors(vendors);
  res.json(vendors[idx]);
});

app.delete('/api/vendors/:id', (req, res) => {
  const vendors = readVendors();
  const filtered = vendors.filter(v => v.id !== req.params.id);
  if (filtered.length === vendors.length) {
    return res.status(404).json({ error: '摊贩不存在' });
  }
  writeVendors(filtered);
  res.json({ message: '删除成功' });
});

app.get('/api/vendors/expiring/:days', (req, res) => {
  updateVendorStatuses();
  const vendors = readVendors();
  const days = parseInt(req.params.days) || 7;
  const now = new Date();
  const limit = new Date();
  limit.setDate(limit.getDate() + days);

  const expiring = vendors.filter(v => {
    if (v.status !== '有效') return false;
    const endDate = new Date(v.endDate);
    return endDate >= now && endDate <= limit;
  });

  res.json(expiring);
});

app.get('/api/patrols', (req, res) => {
  let patrols = readPatrols();
  const { vendorId, date } = req.query;

  if (vendorId && typeof vendorId === 'string') {
    patrols = patrols.filter(p => p.vendorId === vendorId);
  }

  if (date && typeof date === 'string') {
    patrols = patrols.filter(p => p.patrolTime.startsWith(date));
  }

  patrols.sort((a, b) => new Date(b.patrolTime).getTime() - new Date(a.patrolTime).getTime());
  res.json(patrols);
});

app.get('/api/patrols/:id', (req, res) => {
  const patrols = readPatrols();
  const patrol = patrols.find(p => p.id === req.params.id);
  if (!patrol) return res.status(404).json({ error: '巡查记录不存在' });
  res.json(patrol);
});

app.post('/api/patrols', (req, res) => {
  const patrols = readPatrols();
  const vendors = readVendors();
  const now = new Date();

  const newPatrol: Patrol = {
    id: uuidv4(),
    vendorId: req.body.vendorId,
    patrolTime: req.body.patrolTime || now.toISOString(),
    inspectorName: req.body.inspectorName || '',
    photos: req.body.photos || [],
    status: req.body.status,
    violationDesc: req.body.violationDesc,
    rectificationReq: req.body.rectificationReq,
    hasRevoked: false,
    createdAt: now.toISOString(),
  };

  if (req.body.revokeVendor === true && req.body.status === '严重违规') {
    const idx = vendors.findIndex(v => v.id === req.body.vendorId);
    if (idx !== -1) {
      vendors[idx].status = '吊销' as VendorStatus;
      vendors[idx].updatedAt = now.toISOString();
      writeVendors(vendors);
      newPatrol.hasRevoked = true;
    }
  }

  patrols.push(newPatrol);
  writePatrols(patrols);
  res.status(201).json(newPatrol);
});

app.get('/api/stats/summary', (_req, res) => {
  updateVendorStatuses();
  const vendors = readVendors();
  const patrols = readPatrols();

  const today = new Date().toISOString().split('T')[0];
  const todayPatrols = patrols.filter(p => p.patrolTime.startsWith(today));
  const todayViolations = todayPatrols.filter(p => p.status !== '正常');
  const activeVendors = vendors.filter(v => v.status === '有效');

  const categories: Record<string, number> = {};
  vendors.forEach(v => {
    categories[v.category] = (categories[v.category] || 0) + 1;
  });

  const trendData: { date: string; violations: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().split('T')[0];
    const dayViolations = patrols.filter(
      p => p.patrolTime.startsWith(ds) && p.status !== '正常'
    ).length;
    trendData.push({ date: ds.slice(5), violations: dayViolations });
  }

  res.json({
    todayPatrols: todayPatrols.length,
    todayViolations: todayViolations.length,
    activeVendors: activeVendors.length,
    totalVendors: vendors.length,
    categories,
    trendData,
  });
});

function generateMockData(): void {
  if (fs.existsSync(VENDORS_FILE) && fs.existsSync(PATROLS_FILE)) {
    const vCount = readVendors().length;
    const pCount = readPatrols().length;
    if (vCount >= 50 && pCount >= 100) return;
  }

  const categories: VendorCategory[] = ['小吃', '水果', '日用品', '工艺品'];
  const lastNames = ['张', '王', '李', '赵', '刘', '陈', '杨', '黄', '周', '吴', '徐', '孙', '马', '朱', '胡', '郭', '何', '高', '林', '罗'];
  const firstNames = ['伟', '芳', '娜', '敏', '静', '秀英', '丽', '强', '磊', '洋', '艳', '勇', '军', '杰', '娟', '涛', '明', '超', '平', '刚'];
  const inspectors = ['李建国', '王志强', '赵明辉', '刘文华', '陈晓东', '周大伟', '吴志远', '孙文博'];
  const colors = ['#FF9F43', '#F57C00', '#FFBE76', '#9C7E5A', '#7D5E3D', '#E65100', '#FF8C28', '#B8A07E'];
  const statuses: Patrol['status'][] = ['正常', '正常', '正常', '正常', '正常', '轻微违规', '轻微违规', '严重违规'];
  const minorViolations = [
    '摊位超出划定范围',
    '垃圾未及时清理',
    '未佩戴健康证',
    '占道经营',
    '招牌摆放不规范',
  ];
  const majorViolations = [
    '使用过期食材',
    '拒绝配合检查',
    '多次违规屡教不改',
    '食品安全隐患严重',
    '伪造备案信息',
  ];
  const rectifications = [
    '请于3日内整改完毕，将进行复查',
    '请立即清理现场，恢复正常经营秩序',
    '请及时补办相关证件',
    '请调整摊位位置至划定区域内',
  ];
  const addresses = [
    '中山路与人民路交叉口东北角',
    '解放路步行街西段',
    '文化广场南侧',
    '建设路与和平路交叉口',
    '火车站广场东侧',
    '老城区美食街12号',
    '市民公园西门',
    '开发区商业街中段',
  ];

  const vendors: Vendor[] = [];
  const now = new Date();

  for (let i = 0; i < 100; i++) {
    const nameIdx = Math.floor(Math.random() * lastNames.length);
    const firstNameIdx = Math.floor(Math.random() * firstNames.length);
    const startOffset = Math.floor(Math.random() * 60) - 15;
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() + startOffset);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 30);

    let status: VendorStatus = '有效';
    if (endDate < now) status = '过期';
    if (i % 13 === 0) status = '吊销';

    const idPrefix = '110101';
    const birthYear = 1970 + Math.floor(Math.random() * 35);
    const birthMonth = String(1 + Math.floor(Math.random() * 12)).padStart(2, '0');
    const birthDay = String(1 + Math.floor(Math.random() * 28)).padStart(2, '0');
    const seq = String(1000 + i).slice(-4);

    vendors.push({
      id: uuidv4(),
      name: lastNames[nameIdx] + firstNames[firstNameIdx],
      idCard: `${idPrefix}${birthYear}${birthMonth}${birthDay}${seq}`,
      phone: `13${Math.floor(100000000 + Math.random() * 899999999)}`,
      category: categories[Math.floor(Math.random() * categories.length)],
      stallNumber: `TF-${String(i + 1).padStart(4, '0')}`,
      location: {
        lat: 39.9 + Math.random() * 0.1 - 0.05,
        lng: 116.4 + Math.random() * 0.1 - 0.05,
        address: addresses[Math.floor(Math.random() * addresses.length)],
      },
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      status,
      avatarColor: colors[Math.floor(Math.random() * colors.length)],
      createdAt: new Date(startDate.getTime() - Math.random() * 86400000 * 3).toISOString(),
      updatedAt: now.toISOString(),
    });
  }

  writeVendors(vendors);

  const patrols: Patrol[] = [];

  for (let i = 0; i < 500; i++) {
    const vendorIdx = Math.floor(Math.random() * vendors.length);
    const vendor = vendors[vendorIdx];
    const daysAgo = Math.floor(Math.random() * 60);
    const patrolTime = new Date(now);
    patrolTime.setDate(patrolTime.getDate() - daysAgo);
    patrolTime.setHours(8 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60));

    const pStatus = statuses[Math.floor(Math.random() * statuses.length)];
    const hasPhotos = Math.random() > 0.3;
    const photos: Patrol['photos'] = [];

    if (hasPhotos) {
      const numPhotos = 1 + Math.floor(Math.random() * 3);
      for (let j = 0; j < numPhotos; j++) {
        photos.push({
          id: uuidv4(),
          url: `https://picsum.photos/seed/patrol${i}-${j}/400/300`,
          name: `现场照片${j + 1}.jpg`,
        });
      }
    }

    const patrol: Patrol = {
      id: uuidv4(),
      vendorId: vendor.id,
      patrolTime: patrolTime.toISOString(),
      inspectorName: inspectors[Math.floor(Math.random() * inspectors.length)],
      photos,
      status: pStatus,
      createdAt: patrolTime.toISOString(),
    };

    if (pStatus === '轻微违规') {
      patrol.violationDesc = minorViolations[Math.floor(Math.random() * minorViolations.length)];
      patrol.rectificationReq = rectifications[Math.floor(Math.random() * rectifications.length)];
    } else if (pStatus === '严重违规') {
      patrol.violationDesc = majorViolations[Math.floor(Math.random() * majorViolations.length)];
      patrol.rectificationReq = '请立即停止经营，接受进一步处理';
      patrol.hasRevoked = Math.random() > 0.4;
    }

    patrols.push(patrol);
  }

  writePatrols(patrols);
  console.log('Mock data generated: 100 vendors, 500 patrols');
}

generateMockData();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
