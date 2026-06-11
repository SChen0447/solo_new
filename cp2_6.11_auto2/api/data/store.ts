import { v4 as uuidv4 } from 'uuid';

export interface Card {
  id: string;
  question: string;
  answer: string;
}

export interface Deck {
  id: string;
  name: string;
  description: string;
  cards: Card[];
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  creator: string;
  members: string[];
  deckId: string;
  progress: number;
}

export interface QuizResult {
  id: string;
  score: number;
  total: number;
  deckId: string;
  timestamp: string;
}

export interface WeeklyStat {
  date: string;
  minutes: number;
}

const deck1Id = uuidv4();
const deck2Id = uuidv4();

const decks: Deck[] = [
  {
    id: deck1Id,
    name: '英语词汇',
    description: '常用英语词汇学习卡片',
    cards: [
      { id: uuidv4(), question: 'abandon', answer: '放弃；遗弃' },
      { id: uuidv4(), question: 'brilliant', answer: '杰出的；辉煌的' },
      { id: uuidv4(), question: 'consequence', answer: '结果；后果' },
      { id: uuidv4(), question: 'diligent', answer: '勤奋的；刻苦的' },
      { id: uuidv4(), question: 'eloquent', answer: '雄辩的；有说服力的' },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: deck2Id,
    name: 'JavaScript基础',
    description: 'JavaScript基础知识卡片',
    cards: [
      { id: uuidv4(), question: '什么是闭包？', answer: '闭包是指函数能够访问其词法作用域中的变量，即使该函数在其词法作用域之外执行' },
      { id: uuidv4(), question: 'let 和 var 的区别？', answer: 'let 有块级作用域，var 有函数作用域；let 不会变量提升' },
      { id: uuidv4(), question: 'Promise 的三种状态？', answer: 'pending（等待）、fulfilled（已完成）、rejected（已拒绝）' },
      { id: uuidv4(), question: '== 和 === 的区别？', answer: '== 会进行类型转换后比较，=== 不会类型转换，严格比较' },
      { id: uuidv4(), question: '什么是事件循环？', answer: '事件循环是 JavaScript 的执行机制，负责执行代码、收集和处理事件以及执行队列中的子任务' },
    ],
    createdAt: new Date().toISOString(),
  },
];

const groups: Group[] = [
  {
    id: uuidv4(),
    name: '英语角',
    creator: 'Alice',
    members: ['Alice', 'Bob'],
    deckId: deck1Id,
    progress: 60,
  },
  {
    id: uuidv4(),
    name: '前端学习组',
    creator: 'Charlie',
    members: ['Charlie', 'Diana', 'Eve'],
    deckId: deck2Id,
    progress: 40,
  },
];

const now = Date.now();
const weeklyStats: WeeklyStat[] = Array.from({ length: 7 }, (_, i) => {
  const date = new Date(now - (6 - i) * 24 * 60 * 60 * 1000);
  return {
    date: date.toISOString().split('T')[0],
    minutes: Math.floor(Math.random() * 76) + 15,
  };
});

const quizResults: QuizResult[] = Array.from({ length: 10 }, (_, i) => ({
  id: uuidv4(),
  score: Math.floor(Math.random() * 41) + 60,
  total: 100,
  deckId: i % 2 === 0 ? deck1Id : deck2Id,
  timestamp: new Date(now - Math.floor(Math.random() * 2 * 24 * 60 * 60 * 1000)).toISOString(),
}));

export function getDecks(): Deck[] {
  return decks;
}

export function getDeckById(id: string): Deck | undefined {
  return decks.find((d) => d.id === id);
}

export function createDeck(name: string, description: string): Deck {
  const deck: Deck = {
    id: uuidv4(),
    name,
    description,
    cards: [],
    createdAt: new Date().toISOString(),
  };
  decks.push(deck);
  return deck;
}

export function deleteDeck(id: string): boolean {
  const index = decks.findIndex((d) => d.id === id);
  if (index === -1) return false;
  decks.splice(index, 1);
  return true;
}

export function addCard(deckId: string, question: string, answer: string): Card | null {
  const deck = decks.find((d) => d.id === deckId);
  if (!deck) return null;
  const card: Card = { id: uuidv4(), question, answer };
  deck.cards.push(card);
  return card;
}

export function deleteCard(deckId: string, cardId: string): boolean {
  const deck = decks.find((d) => d.id === deckId);
  if (!deck) return false;
  const index = deck.cards.findIndex((c) => c.id === cardId);
  if (index === -1) return false;
  deck.cards.splice(index, 1);
  return true;
}

export function reorderCards(deckId: string, cardIds: string[]): boolean {
  const deck = decks.find((d) => d.id === deckId);
  if (!deck) return false;
  const cardMap = new Map(deck.cards.map((c) => [c.id, c]));
  const reordered: Card[] = [];
  for (const id of cardIds) {
    const card = cardMap.get(id);
    if (!card) return false;
    reordered.push(card);
  }
  deck.cards = reordered;
  return true;
}

export function getGroups(): Group[] {
  return groups;
}

export function getGroupById(id: string): Group | undefined {
  return groups.find((g) => g.id === id);
}

export function createGroup(name: string, creator: string, deckId: string): Group {
  const group: Group = {
    id: uuidv4(),
    name,
    creator,
    members: [creator],
    deckId,
    progress: 0,
  };
  groups.push(group);
  return group;
}

export function joinGroup(groupId: string, userId: string): Group | null {
  const group = groups.find((g) => g.id === groupId);
  if (!group) return null;
  if (!group.members.includes(userId)) {
    group.members.push(userId);
  }
  return group;
}

export function leaveGroup(groupId: string, userId: string): Group | null {
  const group = groups.find((g) => g.id === groupId);
  if (!group) return null;
  const index = group.members.indexOf(userId);
  if (index !== -1) {
    group.members.splice(index, 1);
  }
  return group;
}

export function getRandomCards(deckId: string, count: number): Card[] {
  const deck = decks.find((d) => d.id === deckId);
  if (!deck) return [];
  const shuffled = [...deck.cards].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function addQuizResult(score: number, total: number, deckId: string): QuizResult {
  const result: QuizResult = {
    id: uuidv4(),
    score,
    total,
    deckId,
    timestamp: new Date().toISOString(),
  };
  quizResults.push(result);
  return result;
}

export function getRecentResults(limit: number = 10): QuizResult[] {
  return quizResults.slice(-limit).reverse();
}

export function getWeeklyStats(): WeeklyStat[] {
  return weeklyStats;
}

export function getDashboardData() {
  const totalCards = decks.reduce((sum, d) => sum + d.cards.length, 0);
  const totalGroups = groups.length;
  const recent = quizResults.slice(-10);
  const avgScore =
    recent.length > 0
      ? Math.round(recent.reduce((sum, r) => sum + r.score, 0) / recent.length)
      : 0;
  return {
    totalCards,
    totalGroups,
    avgScore,
    weeklyStats,
  };
}
