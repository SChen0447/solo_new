import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(express.json());

interface Question {
  id: string;
  type: 'single' | 'multiple' | 'boolean';
  title: string;
  options: string[];
  correctAnswer: number | number[];
  explanation: string;
}

interface AnswerRecord {
  questionId: string;
  selectedOptions: number[];
  isCorrect: boolean;
  timestamp: number;
}

const initialQuestions: Question[] = [
  {
    id: uuidv4(),
    type: 'single',
    title: 'React中，用于管理组件副作用的Hook是哪个？',
    options: ['useState', 'useEffect', 'useContext', 'useReducer'],
    correctAnswer: 1,
    explanation: 'useEffect是React中用于处理副作用的Hook，可以在组件渲染后执行数据获取、订阅等操作。',
  },
  {
    id: uuidv4(),
    type: 'multiple',
    title: '以下哪些是JavaScript的基本数据类型？（多选）',
    options: ['string', 'object', 'number', 'boolean', 'array'],
    correctAnswer: [0, 2, 3],
    explanation: 'string、number、boolean是基本数据类型；object和array是引用类型。',
  },
  {
    id: uuidv4(),
    type: 'boolean',
    title: 'TypeScript中，interface和type完全相同，可以互换使用。',
    options: ['正确', '错误'],
    correctAnswer: 1,
    explanation: 'interface和type有诸多区别：interface可以被extends和implements，支持声明合并；type支持联合类型、交叉类型等更复杂的类型操作。',
  },
  {
    id: uuidv4(),
    type: 'single',
    title: 'HTTP状态码404表示什么？',
    options: ['服务器内部错误', '请求成功', '资源未找到', '请求被拒绝'],
    correctAnswer: 2,
    explanation: '404 Not Found表示服务器无法找到请求的资源，是最常见的客户端错误状态码之一。',
  },
  {
    id: uuidv4(),
    type: 'boolean',
    title: 'Express中间件的执行顺序是按照注册顺序从下到上。',
    options: ['正确', '错误'],
    correctAnswer: 1,
    explanation: 'Express中间件按照注册顺序从上到下执行，先注册的中间件先执行，通过next()将控制权传递给下一个中间件。',
  },
];

let questions: Question[] = [...initialQuestions];
let currentQuestionIndex = 0;
let answers: AnswerRecord[] = [];

function checkAnswer(question: Question, selected: number[]): boolean {
  if (question.type === 'multiple') {
    const correct = (question.correctAnswer as number[]).slice().sort();
    const sel = selected.slice().sort();
    return correct.length === sel.length && correct.every((v, i) => v === sel[i]);
  }
  return selected.length === 1 && selected[0] === question.correctAnswer;
}

app.get('/api/questions', (_req, res) => {
  res.json({ questions, currentIndex: currentQuestionIndex });
});

app.get('/api/questions/current', (_req, res) => {
  if (questions.length === 0) {
    res.json({ question: null, index: -1 });
    return;
  }
  res.json({ question: questions[currentQuestionIndex], index: currentQuestionIndex });
});

app.post('/api/questions', (req, res) => {
  const { type, title, options, correctAnswer, explanation } = req.body;
  if (!type || !title || !options || correctAnswer === undefined) {
    res.status(400).json({ error: '缺少必要字段' });
    return;
  }
  const newQuestion: Question = {
    id: uuidv4(),
    type,
    title,
    options,
    correctAnswer,
    explanation: explanation || '',
  };
  questions.push(newQuestion);
  res.json({ question: newQuestion });
});

app.post('/api/questions/next', (_req, res) => {
  if (currentQuestionIndex < questions.length - 1) {
    currentQuestionIndex++;
    res.json({ currentIndex: currentQuestionIndex, question: questions[currentQuestionIndex] });
  } else {
    res.json({ currentIndex: currentQuestionIndex, question: questions[currentQuestionIndex], message: '已经是最后一题' });
  }
});

app.post('/api/questions/prev', (_req, res) => {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    res.json({ currentIndex: currentQuestionIndex, question: questions[currentQuestionIndex] });
  } else {
    res.json({ currentIndex: currentQuestionIndex, question: questions[currentQuestionIndex], message: '已经是第一题' });
  }
});

app.post('/api/questions/goto', (req, res) => {
  const { index } = req.body;
  if (typeof index === 'number' && index >= 0 && index < questions.length) {
    currentQuestionIndex = index;
    res.json({ currentIndex: currentQuestionIndex, question: questions[currentQuestionIndex] });
  } else {
    res.status(400).json({ error: '无效的题目索引' });
  }
});

app.post('/api/answers', (req, res) => {
  const { questionId, selectedOptions } = req.body;
  const question = questions.find((q) => q.id === questionId);
  if (!question) {
    res.status(404).json({ error: '题目不存在' });
    return;
  }
  const isCorrect = checkAnswer(question, selectedOptions);
  const record: AnswerRecord = {
    questionId,
    selectedOptions,
    isCorrect,
    timestamp: Date.now(),
  };
  answers.push(record);
  res.json({ isCorrect, explanation: question.explanation, correctAnswer: question.correctAnswer });
});

app.get('/api/stats', (_req, res) => {
  const questionStats = questions.map((q, index) => {
    const qAnswers = answers.filter((a) => a.questionId === q.id);
    const correctCount = qAnswers.filter((a) => a.isCorrect).length;
    const optionDistribution: Record<number, number> = {};
    q.options.forEach((_, i) => {
      optionDistribution[i] = 0;
    });
    qAnswers.forEach((a) => {
      a.selectedOptions.forEach((opt) => {
        optionDistribution[opt] = (optionDistribution[opt] || 0) + 1;
      });
    });
    return {
      questionId: q.id,
      questionIndex: index,
      questionTitle: q.title,
      type: q.type,
      options: q.options,
      totalAnswers: qAnswers.length,
      correctCount,
      correctRate: qAnswers.length > 0 ? Math.round((correctCount / qAnswers.length) * 100) : 0,
      optionDistribution,
    };
  });

  const totalAnswers = answers.length;
  const totalCorrect = answers.filter((a) => a.isCorrect).length;
  const overallRate = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0;

  const correctRateTrend = questions
    .map((q, index) => {
      const qAnswers = answers.filter((a) => a.questionId === q.id);
      const correctCount = qAnswers.filter((a) => a.isCorrect).length;
      return {
        questionIndex: index + 1,
        questionTitle: `第${index + 1}题`,
        correctRate: qAnswers.length > 0 ? Math.round((correctCount / qAnswers.length) * 100) : 0,
      };
    });

  res.json({
    questionStats,
    totalAnswers,
    totalCorrect,
    overallRate,
    correctRateTrend,
  });
});

app.delete('/api/reset', (_req, res) => {
  answers = [];
  currentQuestionIndex = 0;
  res.json({ message: '数据已重置' });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
