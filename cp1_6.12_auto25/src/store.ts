import { v4 as uuidv4 } from 'uuid';
import { Capsule, CapsuleContent, COVER_COLORS } from './types';

const STORAGE_KEY = 'time_capsules';

function getRandomColor() {
  const index = Math.floor(Math.random() * COVER_COLORS.length);
  return COVER_COLORS[index];
}

export function createCapsule(
  title: string,
  contents: Omit<CapsuleContent, 'id'>[],
  images: string[],
  openDate: string
): Capsule {
  const capsule: Capsule = {
    id: uuidv4(),
    title,
    contents: contents.map(c => ({ ...c, id: uuidv4() })),
    images,
    openDate,
    coverColor: getRandomColor(),
    createdAt: new Date().toISOString(),
    isOpened: false,
    clues: [],
  };

  const capsules = listCapsules();
  capsules.unshift(capsule);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(capsules));

  return capsule;
}

export function listCapsules(): Capsule[] {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    return [];
  }
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function openCapsule(id: string): Capsule | null {
  const capsules = listCapsules();
  const index = capsules.findIndex(c => c.id === id);
  if (index === -1) return null;

  capsules[index].isOpened = true;

  const allTags = capsules[index].contents.flatMap(c => c.tags);
  const uniqueTags = [...new Set(allTags)];
  const shuffled = uniqueTags.sort(() => Math.random() - 0.5);
  capsules[index].clues = shuffled.slice(0, Math.min(3, shuffled.length));

  localStorage.setItem(STORAGE_KEY, JSON.stringify(capsules));
  return capsules[index];
}

export function generateMockCapsules(count: number): Capsule[] {
  const mockCapsules: Capsule[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const daysOffset = Math.floor(Math.random() * 365) - 180;
    const openDate = new Date(now);
    openDate.setDate(openDate.getDate() + daysOffset);

    const isOpened = daysOffset < 0;

    const contents: Omit<CapsuleContent, 'id'>[] = [
      {
        text: `这是第 ${i + 1} 个胶囊的第一段回忆。今天的天气很好，我在公园散步时看到了很多美丽的花朵，心情特别愉快。想起了我们一起度过的那些美好时光。`,
        tags: ['回忆', '美好', '时光'],
      },
      {
        text: `第二个段落记录了一个特别的时刻。那天我们一起去看了日落，金色的阳光洒在海面上，美得像一幅画。希望未来的我还记得这份感动。`,
        tags: ['日落', '感动', '未来'],
      },
      {
        text: `最后一段想对未来说：无论遇到什么困难，都要保持微笑，勇敢地走下去。因为你值得拥有最美好的一切。`,
        tags: ['鼓励', '勇敢', '未来'],
      },
    ];

    const images = [
      `https://picsum.photos/seed/capsule${i}a/600/400`,
      `https://picsum.photos/seed/capsule${i}b/600/400`,
      `https://picsum.photos/seed/capsule${i}c/600/400`,
    ];

    mockCapsules.push({
      id: uuidv4(),
      title: `时光胶囊 #${i + 1}`,
      contents: contents.map(c => ({ ...c, id: uuidv4() })),
      images,
      openDate: openDate.toISOString().split('T')[0],
      coverColor: COVER_COLORS[i % COVER_COLORS.length],
      createdAt: new Date(now.getTime() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      isOpened,
      clues: isOpened ? ['回忆', '日落', '勇敢'] : [],
    });
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(mockCapsules));
  return mockCapsules;
}
