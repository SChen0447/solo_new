import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

interface Question {
  id: string;
  type: 'quiz' | 'vote';
  prompt: string;
  options: string[];
  correctAnswer?: number;
}

interface Courseware {
  id: string;
  title: string;
  content: string;
  questions: Question[];
}

interface StudentAnswer {
  questionId: string;
  selectedOption: number;
}

interface QuizResult {
  questionId: string;
  optionCounts: Record<string, number>;
  totalAnswers: number;
}

interface CoursewareResults {
  coursewareId: string;
  title: string;
  results: QuizResult[];
  totalParticipants: number;
}

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

let coursewares: Courseware[] = [];
let answersMap: Map<string, StudentAnswer[][]> = new Map();

app.get('/api/courseware', (req, res) => {
  res.json(coursewares);
});

app.post('/api/courseware', (req, res) => {
  const { title, content, questions } = req.body;
  
  if (!title) {
    return res.status(400).json({ error: '标题不能为空' });
  }

  const id = uuidv4();
  const newCourseware: Courseware = {
    id,
    title: title || '未命名课件',
    content: content || '',
    questions: questions || []
  };

  coursewares.push(newCourseware);
  answersMap.set(id, []);
  
  res.status(201).json(newCourseware);
});

app.put('/api/courseware/:id', (req, res) => {
  const { id } = req.params;
  const { title, content, questions } = req.body;
  
  const index = coursewares.findIndex(c => c.id === id);
  
  if (index === -1) {
    return res.status(404).json({ error: '课件不存在' });
  }

  coursewares[index] = {
    ...coursewares[index],
    title: title ?? coursewares[index].title,
    content: content ?? coursewares[index].content,
    questions: questions ?? coursewares[index].questions
  };
  
  res.json(coursewares[index]);
});

app.delete('/api/courseware/:id', (req, res) => {
  const { id } = req.params;
  
  const index = coursewares.findIndex(c => c.id === id);
  
  if (index === -1) {
    return res.status(404).json({ error: '课件不存在' });
  }

  coursewares.splice(index, 1);
  answersMap.delete(id);
  
  res.json({ message: '删除成功' });
});

app.post('/api/answer', (req, res) => {
  const { coursewareId, answers } = req.body;
  
  if (!coursewareId || !answers || !Array.isArray(answers)) {
    return res.status(400).json({ error: '参数不完整' });
  }

  const courseware = coursewares.find(c => c.id === coursewareId);
  
  if (!courseware) {
    return res.status(404).json({ error: '课件不存在' });
  }

  if (!answersMap.has(coursewareId)) {
    answersMap.set(coursewareId, []);
  }
  
  const answersList = answersMap.get(coursewareId)!;
  answersList.push(answers);
  
  res.status(201).json({ message: '答案已提交' });
});

app.get('/api/results/:id', (req, res) => {
  const { id } = req.params;
  
  const courseware = coursewares.find(c => c.id === id);
  
  if (!courseware) {
    return res.status(404).json({ error: '课件不存在' });
  }

  const answersList = answersMap.get(id) || [];
  
  const results: QuizResult[] = courseware.questions.map(question => {
    const optionCounts: Record<string, number> = {};
    
    question.options.forEach((_, index) => {
      optionCounts[index.toString()] = 0;
    });
    
    answersList.forEach(answers => {
      const answer = answers.find(a => a.questionId === question.id);
      if (answer !== undefined) {
        const key = answer.selectedOption.toString();
        if (optionCounts[key] !== undefined) {
          optionCounts[key]++;
        }
      }
    });
    
    return {
      questionId: question.id,
      optionCounts,
      totalAnswers: answersList.length
    };
  });
  
  const coursewareResults: CoursewareResults = {
    coursewareId: id,
    title: courseware.title,
    results,
    totalParticipants: answersList.length
  };
  
  res.json(coursewareResults);
});

app.get('/api/export/:id', (req, res) => {
  const { id } = req.params;
  
  const courseware = coursewares.find(c => c.id === id);
  
  if (!courseware) {
    return res.status(404).json({ error: '课件不存在' });
  }

  const answersList = answersMap.get(id) || [];
  
  const results = courseware.questions.map(question => {
    const optionCounts: Record<string, number> = {};
    
    question.options.forEach((_, index) => {
      optionCounts[index.toString()] = 0;
    });
    
    answersList.forEach(answers => {
      const answer = answers.find(a => a.questionId === question.id);
      if (answer !== undefined) {
        const key = answer.selectedOption.toString();
        if (optionCounts[key] !== undefined) {
          optionCounts[key]++;
        }
      }
    });
    
    return {
      questionId: question.id,
      questionPrompt: question.prompt,
      questionType: question.type,
      options: question.options,
      optionCounts,
      correctAnswer: question.correctAnswer,
      totalAnswers: answersList.length
    };
  });
  
  const report = {
    coursewareId: id,
    title: courseware.title,
    totalParticipants: answersList.length,
    exportTime: new Date().toISOString(),
    questions: results
  };
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="report_${id}.json"`);
  res.json(report);
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
