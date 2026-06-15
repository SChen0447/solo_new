import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 8000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const documents = new Map();
const versions = new Map();

function formatTime(date) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

const defaultDocId = uuidv4();
const now = Date.now();
documents.set(defaultDocId, {
  id: defaultDocId,
  title: '团队知识库文档',
  content: '欢迎使用团队知识库文档协作系统！\n\n在这里，您可以：\n- 实时编辑文档内容\n- 查看完整的版本历史\n- 对比不同版本之间的差异\n- 回滚到任意历史版本\n\n开始编辑您的文档吧！',
  createdAt: formatTime(now - 3600000 * 3),
  updatedAt: formatTime(now),
});

const initialContents = [
  '欢迎使用团队知识库文档协作系统！\n\n在这里，您可以：\n- 编辑文档内容\n- 查看版本历史\n\n开始编辑吧！',
  '欢迎使用团队知识库文档协作系统！\n\n在这里，您可以：\n- 实时编辑文档内容\n- 查看版本历史\n- 对比版本差异\n\n开始编辑吧！',
  '欢迎使用团队知识库文档协作系统！\n\n在这里，您可以：\n- 实时编辑文档内容\n- 查看完整的版本历史\n- 对比不同版本之间的差异\n- 回滚到任意历史版本\n\n开始编辑您的文档吧！',
];

initialContents.forEach((content, idx) => {
  const vId = uuidv4();
  versions.set(vId, {
    id: vId,
    documentId: defaultDocId,
    content,
    versionNumber: idx + 1,
    createdAt: formatTime(now - 3600000 * (3 - idx)),
  });
});

app.get('/api/documents', (req, res) => {
  const docs = Array.from(documents.values());
  res.json({ documents: docs });
});

app.get('/api/documents/:id', (req, res) => {
  const doc = documents.get(req.params.id);
  if (!doc) return res.status(404).json({ error: '文档不存在' });
  res.json({ document: doc });
});

app.post('/api/documents', (req, res) => {
  const { title, content } = req.body;
  const id = uuidv4();
  const now2 = new Date();
  const doc = { id, title: title || '未命名文档', content: content || '', createdAt: formatTime(now2), updatedAt: formatTime(now2) };
  documents.set(id, doc);
  res.json({ document: doc });
});

app.put('/api/documents/:id', (req, res) => {
  const doc = documents.get(req.params.id);
  if (!doc) return res.status(404).json({ error: '文档不存在' });
  const { title, content } = req.body;
  if (title !== undefined) doc.title = title;
  if (content !== undefined) doc.content = content;
  doc.updatedAt = formatTime(new Date());
  documents.set(req.params.id, doc);
  res.json({ document: doc });
});

app.get('/api/documents/:id/versions', (req, res) => {
  const { id } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const allVersions = Array.from(versions.values())
    .filter((v) => v.documentId === id)
    .sort((a, b) => b.versionNumber - a.versionNumber);
  const total = allVersions.length;
  const start = (page - 1) * limit;
  const paged = allVersions.slice(start, start + limit);
  res.json({ versions: paged, total, hasMore: start + limit < total });
});

app.get('/api/versions/:versionId', (req, res) => {
  const v = versions.get(req.params.versionId);
  if (!v) return res.status(404).json({ error: '版本不存在' });
  res.json({ version: v });
});

app.post('/api/documents/:id/versions', (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  const doc = documents.get(id);
  if (!doc) return res.status(404).json({ error: '文档不存在' });
  const allDocVersions = Array.from(versions.values()).filter((v) => v.documentId === id);
  const maxNum = allDocVersions.reduce((max, v) => Math.max(max, v.versionNumber), 0);
  const vId = uuidv4();
  const newVersion = { id: vId, documentId: id, content, versionNumber: maxNum + 1, createdAt: formatTime(new Date()) };
  versions.set(vId, newVersion);
  doc.content = content;
  doc.updatedAt = formatTime(new Date());
  documents.set(id, doc);
  res.json({ version: newVersion });
});

app.post('/api/versions/:versionId/rollback', (req, res) => {
  const targetVersion = versions.get(req.params.versionId);
  if (!targetVersion) return res.status(404).json({ error: '版本不存在' });
  const doc = documents.get(targetVersion.documentId);
  if (!doc) return res.status(404).json({ error: '文档不存在' });

  const backupId = uuidv4();
  const allDocVersions = Array.from(versions.values()).filter((v) => v.documentId === targetVersion.documentId);
  const maxNum = allDocVersions.reduce((max, v) => Math.max(max, v.versionNumber), 0);
  const backupVersion = {
    id: backupId,
    documentId: targetVersion.documentId,
    content: doc.content,
    versionNumber: maxNum + 1,
    createdAt: formatTime(new Date()),
  };
  versions.set(backupId, backupVersion);

  doc.content = targetVersion.content;
  doc.updatedAt = formatTime(new Date());
  documents.set(targetVersion.documentId, doc);

  res.json({ version: targetVersion, backupVersion });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
