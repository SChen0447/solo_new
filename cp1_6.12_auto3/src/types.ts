export interface Card {
  id: string;
  front: string;
  back: string;
  tags: string[];
  createdAt: number;
  reviewCount: number;
  correctCount: number;
}

export interface ReviewRecord {
  cardId: string;
  correct: boolean;
  timestamp: number;
}

export interface ReviewSession {
  id: string;
  records: ReviewRecord[];
  startTime: number;
  endTime: number;
}

export interface Classification {
  name: string;
  color: string;
  cardIds: string[];
}

export const TAG_PRESETS: Classification[] = [
  { name: '历史', color: '#E8734A', cardIds: [] },
  { name: '单词', color: '#4A90D9', cardIds: [] },
  { name: '公式', color: '#7B68EE', cardIds: [] },
  { name: '科学', color: '#2ECC71', cardIds: [] },
  { name: '文学', color: '#F39C12', cardIds: [] },
  { name: '其他', color: '#95A5A6', cardIds: [] },
];
