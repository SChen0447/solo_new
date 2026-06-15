export type Theme = 'career' | 'love' | 'opportunity';

export interface TarotCard {
  id: number;
  name: string;
  keyword: string;
  theme: Theme;
  fortuneScore: number;
  primaryColor: string;
  symbol: string;
  interpretation: {
    past: string;
    present: string;
    future: string;
  };
  description: string;
  isSpecial?: boolean;
}

const themes: Theme[] = ['career', 'love', 'opportunity'];

const cardDefinitions = [
  { name: '愚者', keyword: '启程', symbol: '✦', desc: '新的冒险正在等待，保持开放的心态迎接未知的可能性。' },
  { name: '魔术师', keyword: '创造', symbol: '∞', desc: '你拥有将想法化为现实的能力，一切资源尽在掌握。' },
  { name: '女祭司', keyword: '直觉', symbol: '☽', desc: '倾听内心的声音，智慧隐藏在平静的思考之中。' },
  { name: '女皇', keyword: '丰盛', symbol: '♀', desc: '创造力与滋养的能量环绕你，美好的事物正在生长。' },
  { name: '皇帝', keyword: '权威', symbol: '♚', desc: '秩序与结构带来稳定，你有能力掌控局面。' },
  { name: '教皇', keyword: '传承', symbol: '⛨', desc: '传统与智慧指引方向，寻求良师益友的建议。' },
  { name: '恋人', keyword: '结合', symbol: '♡', desc: '重要的抉择摆在面前，听从内心真正的渴望。' },
  { name: '战车', keyword: '胜利', symbol: '♞', desc: '意志力将带你冲破阻碍，胜利属于坚定的你。' },
  { name: '力量', keyword: '勇气', symbol: '♌', desc: '温柔的力量胜过暴力，内在的勇气能驯服一切。' },
  { name: '隐士', keyword: '内省', symbol: '⛯', desc: '独处的时光将带来答案，黑暗中寻找内心的光。' },
  { name: '命运之轮', keyword: '转折', symbol: '☸', desc: '命运的齿轮正在转动，变化是唯一的不变。' },
  { name: '正义', keyword: '公正', symbol: '⚖', desc: '因果循环，你的行动将带来相应的回报。' },
  { name: '倒吊人', keyword: '牺牲', symbol: '†', desc: '换个角度看世界，暂时的停顿会带来新的领悟。' },
  { name: '死神', keyword: '终结', symbol: '☠', desc: '旧的不去新的不来，结束是另一种形式的开始。' },
  { name: '节制', keyword: '平衡', symbol: '⏳', desc: '寻找中庸之道，调和对立的力量创造和谐。' },
  { name: '恶魔', keyword: '执念', symbol: '⛧', desc: '警惕欲望的枷锁，真正的自由来自内心的释放。' },
  { name: '塔', keyword: '颠覆', symbol: '⚡', desc: '突如其来的变化打破旧有结构，但废墟中蕴藏重生。' },
  { name: '星星', keyword: '希望', symbol: '★', desc: '黑暗之后必有光明，心怀希望的你不会迷失方向。' },
  { name: '月亮', keyword: '幻觉', symbol: '☾', desc: '事物并非表面所见，相信直觉穿越迷雾。' },
  { name: '太阳', keyword: '喜悦', symbol: '☀', desc: '光明、成功与活力，好运正在照耀着你。' },
  { name: '审判', keyword: '觉醒', symbol: '☍', desc: '是时候做出决断了，召唤内心深处真正的自己。' },
  { name: '世界', keyword: '圆满', symbol: '⊕', desc: '一个周期完满结束，你已准备好迎接新篇章。' },
];

const symbolPool = ['◇', '△', '○', '□', '☆', '◎', '⬡', '⬢', '✧', '◈'];
const colorPool = ['#6a0dad', '#8b5cf6', '#7c3aed', '#a855f7', '#d4a762', '#fbbf24', '#f59e0b', '#eab308'];

function generateDeck(): TarotCard[] {
  const deck: TarotCard[] = [];
  let id = 0;

  cardDefinitions.forEach((card) => {
    themes.forEach((theme) => {
      const baseScore = 40 + Math.floor(Math.random() * 51);
      const colorIndex = Math.floor(Math.random() * colorPool.length);
      deck.push({
        id: id++,
        name: card.name,
        keyword: card.keyword,
        theme,
        fortuneScore: Math.min(100, baseScore + Math.floor(Math.random() * 20)),
        primaryColor: colorPool[colorIndex],
        symbol: card.symbol,
        interpretation: {
          past: `在过去，${card.name}牌象征着${card.desc}这段经历在你内心留下了深刻的印记，塑造了今天的你。那些曾经的${card.keyword.toLowerCase()}时刻，成为了你人生旅途中重要的里程碑。`,
          present: `此刻，${card.name}牌的能量正在你身边流动。${card.desc}把握住当下的${card.keyword.toLowerCase()}能量，你将发现新的可能性正在向你敞开大门。`,
          future: `展望未来，${card.name}牌预示着${card.keyword.toLowerCase()}的主题将继续延展。${card.desc}保持信心，你正走在通往美好未来的道路上。`,
        },
        description: card.desc,
      });
    });
  });

  for (let i = 0; i < 2; i++) {
    deck.push({
      id: id++,
      name: i === 0 ? '命运' : '星辰',
      keyword: i === 0 ? '奇迹' : '指引',
      theme: themes[i % 3],
      fortuneScore: 90 + Math.floor(Math.random() * 11),
      primaryColor: '#d4a762',
      symbol: i === 0 ? '✵' : '✷',
      interpretation: {
        past: `特殊的命运之牌出现了！在过去，一场意想不到的奇迹改变了你的人生轨迹。宇宙以神秘的方式为你安排了这一切。`,
        present: `此刻，命运的力量正环绕着你。这是一张象征奇迹的特殊牌，你的每一个选择都在编织着独特的命运之网。`,
        future: `未来充满了无限可能！这张特殊的牌预示着星辰的力量将为你指引方向，勇敢前行，奇迹就在前方等待。`,
      },
      description: '这是一张蕴含神秘力量的特殊命运牌，象征着宇宙的特殊眷顾。',
      isSpecial: true,
    });
  }

  return deck;
}

export const createInitialDeck = (): TarotCard[] => {
  return generateDeck();
};

export const shuffleDeck = (deck: TarotCard[]): TarotCard[] => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const calculateLuckyScore = (cards: TarotCard[]): number => {
  if (cards.length !== 3) return 0;
  const weights = [0.3, 0.4, 0.3];
  const score = cards.reduce((acc, card, index) => {
    return acc + card.fortuneScore * weights[index];
  }, 0);
  return Math.round(score);
};
