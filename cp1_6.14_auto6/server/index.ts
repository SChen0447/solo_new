import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface KnowledgePoint {
  id: number;
  course: string;
  chapter: string;
  type: 'choice' | 'fill' | 'short';
  question: string;
  options?: string[];
  answer: string;
}

interface GenerateRequest {
  course: string;
  chapter: string;
}

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

function loadKnowledgeBase(): KnowledgePoint[] {
  const filePath = path.join(__dirname, 'knowledge-base.json');
  const rawData = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(rawData);
}

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function pickRandom<T>(array: T[], count: number): T[] {
  const shuffled = shuffleArray(array);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

app.post('/generate', (req, res) => {
  try {
    const { course, chapter }: GenerateRequest = req.body;

    if (!course || !chapter) {
      return res.status(400).json({ error: '课程名称和章节不能为空' });
    }

    const knowledgeBase = loadKnowledgeBase();

    const filtered = knowledgeBase.filter(
      (kp) =>
        kp.course.toLowerCase() === course.toLowerCase() &&
        kp.chapter.toLowerCase() === chapter.toLowerCase()
    );

    const totalCount = filtered.length;
    const insufficientCoverage = totalCount < 15;

    const choiceQuestions = filtered.filter((kp) => kp.type === 'choice');
    const fillQuestions = filtered.filter((kp) => kp.type === 'fill');
    const shortQuestions = filtered.filter((kp) => kp.type === 'short');

    const selectedChoice = pickRandom(choiceQuestions, Math.max(5, Math.ceil(totalCount / 3)));
    const selectedFill = pickRandom(fillQuestions, Math.max(5, Math.ceil(totalCount / 3)));
    const selectedShort = pickRandom(shortQuestions, Math.max(5, Math.ceil(totalCount / 3)));

    const reviewMaterial = {
      course,
      chapter,
      generatedAt: new Date().toISOString(),
      totalCount,
      insufficientCoverage,
      sections: [
        {
          type: 'choice' as const,
          title: '选择题',
          questions: selectedChoice.map((q, idx) => ({
            id: q.id,
            index: idx + 1,
            question: q.question,
            options: q.options || [],
            answer: q.answer
          }))
        },
        {
          type: 'fill' as const,
          title: '填空题',
          questions: selectedFill.map((q, idx) => ({
            id: q.id,
            index: idx + 1,
            question: q.question,
            answer: q.answer
          }))
        },
        {
          type: 'short' as const,
          title: '简答题',
          questions: selectedShort.map((q, idx) => ({
            id: q.id,
            index: idx + 1,
            question: q.question,
            answer: q.answer
          }))
        }
      ]
    };

    res.json(reviewMaterial);
  } catch (error) {
    console.error('生成复习资料出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`复习资料生成器后端服务已启动: http://localhost:${PORT}`);
});
