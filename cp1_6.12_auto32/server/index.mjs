import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const defaultConfig = {
  base: { color: '#4a4a4a', material: 'matte' },
  pole: { color: '#c0c0c0', material: 'metal' },
  shade: { color: '#f5f5dc', material: 'glossy' },
  accessories: [],
};

const accessories = [
  {
    id: 'shade-flower',
    name: '花形灯罩',
    description: '优雅花瓣造型的灯罩，搭配装饰环效果更佳',
    attachTo: 'shade',
    compatibleWith: ['deco-ring'],
    incompatibleWith: [],
    position: [0, 2.85, 0],
  },
  {
    id: 'shade-cone',
    name: '锥形灯罩',
    description: '极简锥形灯罩，现代风格之选',
    attachTo: 'shade',
    compatibleWith: [],
    incompatibleWith: ['deco-ring'],
    position: [0, 2.85, 0],
  },
  {
    id: 'deco-ring',
    name: '装饰环',
    description: '精致金属装饰环，仅适配花形灯罩',
    attachTo: 'pole',
    compatibleWith: ['shade-flower'],
    incompatibleWith: ['shade-cone'],
    position: [0, 2.2, 0],
  },
  {
    id: 'base-extender',
    name: '底座加高垫',
    description: '加高底座垫片，提升台灯整体高度',
    attachTo: 'base',
    compatibleWith: ['shade-flower', 'shade-cone', 'deco-ring'],
    incompatibleWith: [],
    position: [0, 0.08, 0],
  },
];

const colorPalette = [
  '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71',
  '#1abc9c', '#3498db', '#9b59b6', '#e91e63',
  '#4a4a4a', '#c0c0c0', '#f5f5dc', '#ffffff',
];

const materialOptions = ['metal', 'plastic', 'matte', 'glossy'];

app.get('/api/product/default', (_req, res) => {
  res.json({ config: defaultConfig });
});

app.get('/api/accessories', (_req, res) => {
  res.json({ accessories });
});

app.get('/api/colors', (_req, res) => {
  res.json({ colors: colorPalette });
});

app.get('/api/materials', (_req, res) => {
  res.json({ materials: materialOptions });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
