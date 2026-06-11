import { v4 as uuidv4 } from 'uuid';
import type { Question, AnswerFeedback } from '../types';

export const initialQuestions: Question[] = [
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

export function processAnswer(
  question: Question,
  selectedOptions: number[]
): AnswerFeedback {
  const isCorrect = checkAnswer(question, selectedOptions);
  return {
    isCorrect,
    explanation: question.explanation,
    correctAnswer: question.correctAnswer,
  };
}

function checkAnswer(question: Question, selected: number[]): boolean {
  if (question.type === 'multiple') {
    const correct = (question.correctAnswer as number[]).slice().sort();
    const sel = selected.slice().sort();
    return correct.length === sel.length && correct.every((v, i) => v === sel[i]);
  }
  return selected.length === 1 && selected[0] === question.correctAnswer;
}
