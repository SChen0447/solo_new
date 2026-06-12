import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { getRelatedKeywords, buildTreeFromTemplate, keywordDatabase } from './generateEngine';
import { MindMapNode } from './types';

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

const generateNode = (text: string, depth: number = 0): MindMapNode => {
  const node: MindMapNode = {
    id: uuidv4(),
    text,
    children: [],
    collapsed: false,
  };

  if (depth < 3) {
    const childTexts = buildTreeFromTemplate(text, depth);
    node.children = childTexts.map((childText) =>
      generateNode(childText, depth + 1)
    );
  }

  return node;
};

app.post('/api/generate-mindmap', (req, res) => {
  const { topic } = req.body;

  if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
    return res.status(400).json({ error: '请输入有效的主题' });
  }

  const rootNode = generateNode(topic.trim(), 0);

  res.json({
    success: true,
    data: rootNode,
  });
});

app.get('/api/keywords', (_req, res) => {
  res.json({
    success: true,
    data: keywordDatabase.map((k) => k.word),
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

export default app;
