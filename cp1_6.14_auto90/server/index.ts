import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuid } from 'uuid';
import { createJsonStore } from './utils/jsonStore';
import type {
  RecordItem,
  Style,
  SortMode,
  PurchaseChannel,
  Stats,
  RatingPayload,
  NewRecordPayload,
} from '../src/shared/types';
import { ALL_STYLES, ALL_CHANNELS } from '../src/shared/types';

const PORT = Number(process.env.PORT) || 3001;

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const store = createJsonStore<RecordItem[]>('data/records.json', []);

function getAverageStars(ratings: { stars: number }[]): number {
  if (!ratings.length) return 0;
  return ratings.reduce((a, r) => a + r.stars, 0) / ratings.length;
}

function formatMonth(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function buildStats(records: RecordItem[]): Stats {
  const channelCounts = ALL_CHANNELS.reduce(
    (acc, c) => ({ ...acc, [c]: 0 }),
  ) as Record<PurchaseChannel, number>;

  const styleCounts = ALL_STYLES.reduce(
    (acc, s) => ({ ...acc, [s]: 0 }),
  ) as Record<Style, number>;

  records.forEach((r) => {
    if (ALL_CHANNELS.includes(r.channel)) {
      channelCounts[r.channel] += 1;
    }
    r.styles.forEach((s) => {
      if (ALL_STYLES.includes(s)) styleCounts[s] += 1;
    });
  });

  const now = new Date();
  const months: { month: string; count: number }[] = [];
  for (let i = 2; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ month: formatMonth(d), count: 0 });
  }
  records.forEach((r) => {
    const created = new Date(r.createdAt);
    const key = formatMonth(created);
    const slot = months.find((m) => m.month === key);
    if (slot) slot.count += 1;
  });

  return { channelCounts, styleCounts, recentMonthly: months };
}

function parseStylesParam(raw: unknown): Style[] | null {
  if (!raw) return null;
  if (Array.isArray(raw)) {
    return raw.filter((x): x is Style => ALL_STYLES.includes(x as Style));
  }
  if (typeof raw === 'string') {
    const parts = raw
      .split(',')
      .map((s) => s.trim())
      .filter((x): x is Style => ALL_STYLES.includes(x as Style));
    return parts.length ? parts : null;
  }
  return null;
}

app.get('/api/records', (req: Request, res: Response) => {
  try {
    const all = store.read();

    const styleFilter = parseStylesParam(req.query.style);
    const sort = req.query.sort as SortMode | undefined;
    const yearGte = req.query.yearGte ? Number(req.query.yearGte) : null;
    const yearLte = req.query.yearLte ? Number(req.query.yearLte) : null;
    const rating = req.query.rating ? Number(req.query.rating) : null;

    let list = [...all];

    if (styleFilter && styleFilter.length) {
      list = list.filter((r) => r.styles.some((s) => styleFilter.includes(s)));
    }

    if (Number.isFinite(yearGte)) {
      list = list.filter((r) => r.year >= (yearGte as number));
    }
    if (Number.isFinite(yearLte)) {
      list = list.filter((r) => r.year <= (yearLte as number));
    }

    if (Number.isFinite(rating) && rating !== null) {
      list = list.filter((r) => {
        if (!r.ratings.length) return false;
        return Math.round(getAverageStars(r.ratings)) === (rating as number);
      });
    }

    if (sort === 'rating') {
      list.sort(
        (a, b) => getAverageStars(b.ratings) - getAverageStars(a.ratings),
      );
    } else if (sort === 'oldest') {
      list.sort((a, b) => a.year - b.year);
    } else {
      list.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }

    return res.status(200).json(list);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to load records' });
  }
});

app.post('/api/records', (req: Request, res: Response) => {
  try {
    const body = req.body as Partial<NewRecordPayload>;
    if (
      !body.title ||
      !body.artist ||
      !body.year ||
      !body.styles ||
      !body.styles.length ||
      !body.label ||
      typeof body.price !== 'number' ||
      !body.channel
    ) {
      return res.status(400).json({ error: '缺少必填字段' });
    }

    const record: RecordItem = {
      id: uuid(),
      title: String(body.title),
      artist: String(body.artist),
      year: Number(body.year),
      styles: body.styles,
      label: String(body.label),
      price: Number(body.price),
      channel: body.channel,
      ratings: [],
      createdAt: new Date().toISOString(),
    };

    const all = store.read();
    all.unshift(record);
    store.write(all);

    return res.status(201).json(record);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create record' });
  }
});

app.get('/api/records/:id', (req: Request, res: Response) => {
  try {
    const all = store.read();
    const record = all.find((r) => r.id === req.params.id);
    if (!record) return res.status(404).json({ error: '未找到唱片' });
    return res.status(200).json(record);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to get record' });
  }
});

app.put('/api/records/:id/rating', (req: Request, res: Response) => {
  try {
    const body = req.body as Partial<RatingPayload>;
    const stars = Number(body?.stars);
    if (!Number.isFinite(stars) || stars < 1 || stars > 5) {
      return res.status(400).json({ error: '评分必须在 1 到 5 之间' });
    }
    const note = typeof body.note === 'string' ? body.note.slice(0, 200) : '';
    const moods = Array.isArray(body.moods)
      ? body.moods.slice(0, 3)
      : [];

    const all = store.read();
    const idx = all.findIndex((r) => r.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: '未找到唱片' });

    all[idx] = {
      ...all[idx],
      ratings: [
        ...all[idx].ratings,
        {
          stars,
          note,
          moods,
          createdAt: new Date().toISOString(),
        },
      ],
    };
    store.write(all);
    return res.status(200).json(all[idx]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to save rating' });
  }
});

app.get('/api/stats', (_req: Request, res: Response) => {
  try {
    const all = store.read();
    return res.status(200).json(buildStats(all));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to load stats' });
  }
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`[vinyl-server] 运行在 http://localhost:${PORT}/api`);
});
