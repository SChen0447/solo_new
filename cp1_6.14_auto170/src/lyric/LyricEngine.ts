import { apiClient, Lyric } from '../api/apiClient';
import { useAppStore } from '../store';

const KEYWORD_POOLS = [
  ['星空', '流浪', '吉他'],
  ['大海', '思念', '风铃'],
  ['月光', '远方', '口琴'],
  ['雨滴', '回忆', '钢琴'],
  ['晨曦', '奔跑', '鼓点'],
  ['落叶', '告别', '提琴'],
  ['烟火', '约定', '竖琴'],
  ['雪山', '孤独', '笛声'],
  ['黄昏', '等待', '手风琴'],
  ['彩虹', '冒险', '贝斯'],
  ['森林', '梦境', '排箫'],
  ['沙漠', '自由', '沙锤'],
];

function getRandomKeywords(): string[] {
  const pool = KEYWORD_POOLS[Math.floor(Math.random() * KEYWORD_POOLS.length)];
  return [...pool];
}

function analyzeSentiment(text: string): 'happy' | 'sad' | 'neutral' {
  const happyWords = ['欢', '笑', '乐', '喜', '光', '梦', '星', '暖', '阳', '花', '飞', '彩', '歌', '甜', '亮', '美'];
  const sadWords = ['泪', '伤', '痛', '别', '离', '孤', '冷', '暗', '愁', '悲', '哭', '散', '远', '忘', '断', '灰'];
  let happyScore = 0;
  let sadScore = 0;
  for (const ch of text) {
    if (happyWords.includes(ch)) happyScore++;
    if (sadWords.includes(ch)) sadScore++;
  }
  if (happyScore > sadScore + 1) return 'happy';
  if (sadScore > happyScore + 1) return 'sad';
  return 'neutral';
}

function validateLyric(content: string): { valid: boolean; error?: string } {
  if (!content || content.trim().length === 0) {
    return { valid: false, error: '歌词不能为空' };
  }
  if (content.trim().length > 200) {
    return { valid: false, error: '歌词不能超过200个字符' };
  }
  return { valid: true };
}

export const LyricEngine = {
  getRandomKeywords,

  analyzeSentiment,

  validateLyric,

  async submitLyric(content: string, keyword: string): Promise<{ success: boolean; error?: string }> {
    const validation = validateLyric(content);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }
    const { room, memberId } = useAppStore.getState();
    if (!room || !memberId) {
      return { success: false, error: '未加入房间' };
    }
    try {
      const data = await apiClient.submitLyric(room.id, memberId, content, keyword);
      useAppStore.getState().setRoom(data.room);
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  },

  getPreviousLyric(): Lyric | null {
    const { room } = useAppStore.getState();
    if (!room || room.lyrics.length === 0) return null;
    return room.lyrics[room.lyrics.length - 1];
  },

  async fetchLyrics(): Promise<Lyric[]> {
    const { room } = useAppStore.getState();
    if (!room) return [];
    const data = await apiClient.getLyrics(room.id);
    return data.lyrics;
  },

  getReplaySequence(): Lyric[] {
    const { room } = useAppStore.getState();
    if (!room) return [];
    return [...room.lyrics];
  },

  getSentimentColor(sentiment: 'happy' | 'sad' | 'neutral'): string {
    switch (sentiment) {
      case 'happy':
        return 'rgba(255, 235, 59, 0.15)';
      case 'sad':
        return 'rgba(13, 71, 161, 0.25)';
      default:
        return 'transparent';
    }
  },
};
