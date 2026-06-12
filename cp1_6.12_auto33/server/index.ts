import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { diffWords, Change } from 'diff';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export interface Version {
  id: string;
  content: string;
  label: string;
  comment: string;
  createdAt: number;
}

export interface VersionMeta {
  id: string;
  label: string;
  comment: string;
  createdAt: number;
}

export interface DiffSegment {
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  value: string;
  oldValue?: string;
}

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

const versionStore = new Map<string, Version>();
let versionCounter = 0;

const generateDefaultLabel = (): string => {
  versionCounter++;
  const now = new Date();
  const dateStr = format(now, 'yyyy-MM-dd HH:mm', { locale: zhCN });
  return `v${versionCounter} ${dateStr}`;
};

app.post('/api/versions', (req: Request, res: Response) => {
  const { content, label, comment } = req.body;
  
  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }

  const version: Version = {
    id: uuidv4(),
    content,
    label: label || generateDefaultLabel(),
    comment: comment || '',
    createdAt: Date.now(),
  };

  versionStore.set(version.id, version);
  res.json(version);
});

app.get('/api/versions', (_req: Request, res: Response) => {
  const versions: VersionMeta[] = Array.from(versionStore.values())
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(({ id, label, comment, createdAt }) => ({
      id,
      label,
      comment,
      createdAt,
    }));
  res.json(versions);
});

app.get('/api/versions/:id', (req: Request, res: Response) => {
  const version = versionStore.get(req.params.id);
  if (!version) {
    return res.status(404).json({ error: 'Version not found' });
  }
  res.json(version);
});

app.put('/api/versions/:id', (req: Request, res: Response) => {
  const version = versionStore.get(req.params.id);
  if (!version) {
    return res.status(404).json({ error: 'Version not found' });
  }

  const { label, comment } = req.body;
  if (label !== undefined) version.label = label;
  if (comment !== undefined) version.comment = comment;

  versionStore.set(version.id, version);
  res.json(version);
});

app.get('/api/diff', (req: Request, res: Response) => {
  const { oldId, newId } = req.query;

  if (!oldId || !newId) {
    return res.status(400).json({ error: 'Both oldId and newId are required' });
  }

  const oldVersion = versionStore.get(oldId as string);
  const newVersion = versionStore.get(newId as string);

  if (!oldVersion || !newVersion) {
    return res.status(404).json({ error: 'One or both versions not found' });
  }

  const differences: Change[] = diffWords(oldVersion.content, newVersion.content);
  const segments: DiffSegment[] = [];

  let i = 0;
  while (i < differences.length) {
    const diff = differences[i];

    if (diff.added) {
      if (i + 1 < differences.length && differences[i + 1].removed) {
        segments.push({
          type: 'modified',
          value: diff.value,
          oldValue: differences[i + 1].value,
        });
        i += 2;
        continue;
      }
      segments.push({ type: 'added', value: diff.value });
    } else if (diff.removed) {
      if (i + 1 < differences.length && differences[i + 1].added) {
        segments.push({
          type: 'modified',
          value: differences[i + 1].value,
          oldValue: diff.value,
        });
        i += 2;
        continue;
      }
      segments.push({ type: 'removed', value: diff.value });
    } else {
      segments.push({ type: 'unchanged', value: diff.value });
    }
    i++;
  }

  res.json({ segments });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
