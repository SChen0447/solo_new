import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '..', '..', 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const app = express();
const PORT = 3001;

app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const CustomFieldSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['text', 'select', 'multiselect', 'boolean']),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
});

const EventSchema = z.object({
  name: z.string().min(1, '活动名称不能为空'),
  date: z.string().min(1, '活动时间不能为空'),
  location: z.string().min(1, '活动地点不能为空'),
  maxParticipants: z.number().min(1, '最大人数必须大于0'),
  customFields: z.array(CustomFieldSchema).default([]),
  description: z.string().optional(),
});

const RegistrationSchema = z.object({
  eventId: z.string(),
  name: z.string().min(1, '姓名不能为空'),
  email: z.string().email('邮箱格式不正确').optional(),
  phone: z.string().optional(),
  customFields: z.record(z.any()).default({}),
  feedback: z.string().optional(),
  rating: z.number().min(1).max(5).optional(),
});

type CustomField = z.infer<typeof CustomFieldSchema>;
type Event = z.infer<typeof EventSchema> & { id: string; createdAt: string };
type Registration = z.infer<typeof RegistrationSchema> & {
  id: string;
  registeredAt: string;
  checkedIn: boolean;
  checkedInAt?: string;
};

function getEventFilePath(eventId: string): string {
  return path.join(dataDir, `${eventId}.json`);
}

function readEventData(eventId: string): { event: Event; registrations: Registration[] } | null {
  const filePath = getEventFilePath(eventId);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

function writeEventData(eventId: string, data: { event: Event; registrations: Registration[] }): void {
  const filePath = getEventFilePath(eventId);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function getAllEvents(): Event[] {
  if (!fs.existsSync(dataDir)) {
    return [];
  }
  const files = fs.readdirSync(dataDir).filter((f) => f.endsWith('.json'));
  const events: Event[] = [];
  for (const file of files) {
    const content = fs.readFileSync(path.join(dataDir, file), 'utf-8');
    const data = JSON.parse(content);
    events.push(data.event);
  }
  return events.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

app.get('/api/events', (req, res) => {
  try {
    const events = getAllEvents();
    const eventsWithStats = events.map((event) => {
      const data = readEventData(event.id);
      return {
        ...event,
        registrationCount: data?.registrations.length || 0,
        checkinCount: data?.registrations.filter((r) => r.checkedIn).length || 0,
      };
    });
    res.json(eventsWithStats);
  } catch (error) {
    res.status(500).json({ error: '获取活动列表失败' });
  }
});

app.post('/api/events', (req, res) => {
  try {
    const validated = EventSchema.safeParse(req.body);
    if (!validated.success) {
      return res.status(400).json({ error: validated.error.issues.map((i) => i.message).join(', ') });
    }

    const event: Event = {
      ...validated.data,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };

    writeEventData(event.id, { event, registrations: [] });
    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ error: '创建活动失败' });
  }
});

app.get('/api/events/:id', (req, res) => {
  try {
    const data = readEventData(req.params.id);
    if (!data) {
      return res.status(404).json({ error: '活动不存在' });
    }
    res.json({
      ...data.event,
      registrationCount: data.registrations.length,
    });
  } catch (error) {
    res.status(500).json({ error: '获取活动详情失败' });
  }
});

app.post('/api/registrations', (req, res) => {
  try {
    const validated = RegistrationSchema.safeParse(req.body);
    if (!validated.success) {
      return res.status(400).json({ error: validated.error.issues.map((i) => i.message).join(', ') });
    }

    const eventData = readEventData(validated.data.eventId);
    if (!eventData) {
      return res.status(404).json({ error: '活动不存在' });
    }

    if (eventData.registrations.length >= eventData.event.maxParticipants) {
      return res.status(400).json({ error: '报名人数已满' });
    }

    const registration: Registration = {
      ...validated.data,
      id: uuidv4(),
      registeredAt: new Date().toISOString(),
      checkedIn: false,
    };

    eventData.registrations.push(registration);
    writeEventData(validated.data.eventId, eventData);

    res.status(201).json(registration);
  } catch (error) {
    res.status(500).json({ error: '报名失败' });
  }
});

app.get('/api/registrations/:id', (req, res) => {
  try {
    const registrationId = req.params.id;
    const files = fs.readdirSync(dataDir).filter((f) => f.endsWith('.json'));

    for (const file of files) {
      const content = fs.readFileSync(path.join(dataDir, file), 'utf-8');
      const data = JSON.parse(content);
      const registration = data.registrations.find((r: Registration) => r.id === registrationId);
      if (registration) {
        return res.json({
          registration,
          event: data.event,
        });
      }
    }

    res.status(404).json({ error: '报名记录不存在' });
  } catch (error) {
    res.status(500).json({ error: '查询报名记录失败' });
  }
});

app.post('/api/checkin', (req, res) => {
  try {
    const { registrationId } = req.body;
    if (!registrationId) {
      return res.status(400).json({ error: '缺少报名ID' });
    }

    const files = fs.readdirSync(dataDir).filter((f) => f.endsWith('.json'));

    for (const file of files) {
      const filePath = path.join(dataDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);
      const registration = data.registrations.find((r: Registration) => r.id === registrationId);

      if (registration) {
        if (registration.checkedIn) {
          return res.json({ success: false, message: '已签到', registration });
        }

        registration.checkedIn = true;
        registration.checkedInAt = new Date().toISOString();
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

        return res.json({ success: true, message: '签到成功', registration });
      }
    }

    res.status(404).json({ error: '报名记录不存在' });
  } catch (error) {
    res.status(500).json({ error: '签到失败' });
  }
});

app.get('/api/events/:id/report', (req, res) => {
  try {
    const eventData = readEventData(req.params.id);
    if (!eventData) {
      return res.status(404).json({ error: '活动不存在' });
    }

    const { event, registrations } = eventData;
    const totalRegistrations = registrations.length;
    const checkedInCount = registrations.filter((r) => r.checkedIn).length;
    const checkinRate = totalRegistrations > 0 ? (checkedInCount / totalRegistrations) * 100 : 0;

    const ratings = registrations.filter((r) => r.rating !== undefined).map((r) => r.rating as number);
    const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

    const ratingHistogram = [1, 2, 3, 4, 5].map((rating) => ({
      rating,
      count: ratings.filter((r) => r === rating).length,
    }));

    const checkinTimes = registrations
      .filter((r) => r.checkedIn && r.checkedInAt)
      .map((r) => new Date(r.checkedInAt!));

    const checkinTimeDistribution: { time: string; count: number }[] = [];
    if (checkinTimes.length > 0) {
      const sortedTimes = [...checkinTimes].sort((a, b) => a.getTime() - b.getTime());
      const earliest = new Date(sortedTimes[0]);
      earliest.setMinutes(0, 0, 0);
      const latest = new Date(sortedTimes[sortedTimes.length - 1]);
      latest.setMinutes(59, 59, 999);

      for (let h = earliest.getHours(); h <= latest.getHours(); h++) {
        const hourStr = `${h.toString().padStart(2, '0')}:00`;
        const count = sortedTimes.filter((t) => t.getHours() === h).length;
        checkinTimeDistribution.push({ time: hourStr, count });
      }
    }

    const customFieldSummary: Record<string, Record<string, number>> = {};
    for (const field of event.customFields) {
      customFieldSummary[field.id] = {};
      for (const reg of registrations) {
        const value = reg.customFields[field.id];
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            for (const v of value) {
              customFieldSummary[field.id][v] = (customFieldSummary[field.id][v] || 0) + 1;
            }
          } else {
            const key = String(value);
            customFieldSummary[field.id][key] = (customFieldSummary[field.id][key] || 0) + 1;
          }
        }
      }
    }

    res.json({
      event,
      totalRegistrations,
      checkedInCount,
      checkinRate,
      avgRating,
      ratingHistogram,
      checkinTimeDistribution,
      customFieldSummary,
      registrations,
    });
  } catch (error) {
    res.status(500).json({ error: '获取报告失败' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

export default app;
