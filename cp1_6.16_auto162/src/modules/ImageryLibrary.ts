export type ImageryTheme = 'landscape' | 'separation' | 'war' | 'love' | 'philosophy';

export interface ImageryWord {
  word: string;
  meaning: string;
  examples: string[];
}

interface ThemeCategory {
  name: string;
  themeKey: ImageryTheme;
  words: ImageryWord[];
}

const IMAGERY_THEMES: ThemeCategory[] = [
  {
    name: '山水',
    themeKey: 'landscape',
    words: [
      { word: '青山', meaning: '青翠的山峦', examples: ['青山遮不住', '青山依旧在'] },
      { word: '流水', meaning: '流动的水', examples: ['流水落花春去也', '小桥流水人家'] },
      { word: '明月', meaning: '明亮的月亮', examples: ['明月几时有', '明月松间照'] },
      { word: '清风', meaning: '清凉的风', examples: ['清风徐来', '清风明月'] },
      { word: '白云', meaning: '白色的云', examples: ['白云千载空悠悠', '白云深处有人家'] },
      { word: '落日', meaning: '夕阳', examples: ['落日余晖', '长河落日圆'] },
      { word: '孤帆', meaning: '孤独的船帆', examples: ['孤帆远影碧空尽', '孤帆一片日边来'] },
      { word: '翠竹', meaning: '翠绿的竹子', examples: ['翠竹摇风', '翠竹黄花皆佛性'] },
      { word: '清泉', meaning: '清澈的泉水', examples: ['清泉石上流', '明月松间照，清泉石上流'] },
      { word: '远峰', meaning: '远处的山峰', examples: ['远峰青霭', '远峰如黛'] },
    ],
  },
  {
    name: '离别',
    themeKey: 'separation',
    words: [
      { word: '折柳', meaning: '折柳送别', examples: ['此夜曲中闻折柳', '折柳赠君'] },
      { word: '长亭', meaning: '送别的亭子', examples: ['长亭外，古道边', '长亭更短亭'] },
      { word: '古道', meaning: '古老的道路', examples: ['古道西风瘦马', '古道无人独自行'] },
      { word: '西风', meaning: '秋风', examples: ['西风古道', '昨夜西风凋碧树'] },
      { word: '孤舟', meaning: '孤独的船', examples: ['孤舟蓑笠翁', '孤舟独钓寒江雪'] },
      { word: '鸿雁', meaning: '大雁', examples: ['鸿雁传书', '鸿雁几时到'] },
      { word: '别意', meaning: '离别的情意', examples: ['别意与之谁短长', '别意悠悠'] },
      { word: '离愁', meaning: '离别的忧愁', examples: ['离愁渐远渐无穷', '离愁别绪'] },
      { word: '断肠', meaning: '极度悲伤', examples: ['断肠人在天涯', '断肠春色'] },
      { word: '相望', meaning: '相互遥望', examples: ['相望不相闻', '相望天涯'] },
    ],
  },
  {
    name: '战争',
    themeKey: 'war',
    words: [
      { word: '金戈', meaning: '金属制的戈', examples: ['金戈铁马', '金戈入梦'] },
      { word: '铁马', meaning: '披甲的战马', examples: ['铁马冰河入梦来', '铁马秋风大散关'] },
      { word: '烽火', meaning: '战火', examples: ['烽火连三月', '烽火扬州路'] },
      { word: '沙场', meaning: '战场', examples: ['沙场秋点兵', '沙场征战苦'] },
      { word: '征人', meaning: '出征的人', examples: ['征人未还', '征人怨'] },
      { word: '狼烟', meaning: '报警的烽烟', examples: ['狼烟四起', '烽火狼烟'] },
      { word: '鼓角', meaning: '战鼓和号角', examples: ['鼓角齐鸣', '城头鼓角'] },
      { word: '旌旗', meaning: '旗帜', examples: ['旌旗蔽日', '旌旗十万斩阎罗'] },
      { word: '戍楼', meaning: '瞭望楼', examples: ['戍楼东望', '戍楼刁斗'] },
      { word: '剑影', meaning: '剑的影子', examples: ['刀光剑影', '剑影刀光'] },
    ],
  },
  {
    name: '爱情',
    themeKey: 'love',
    words: [
      { word: '相思', meaning: '互相思念', examples: ['相思相见知何日', '红豆生南国，春来发几枝'] },
      { word: '红豆', meaning: '相思豆', examples: ['红豆生南国', '红豆相思'] },
      { word: '鸳鸯', meaning: '鸳鸯鸟', examples: ['鸳鸯戏水', '只羡鸳鸯不羡仙'] },
      { word: '比翼', meaning: '比翼鸟', examples: ['在天愿作比翼鸟', '比翼双飞'] },
      { word: '连理', meaning: '连理枝', examples: ['在地愿为连理枝', '连理枝头'] },
      { word: '婵娟', meaning: '美人或月亮', examples: ['千里共婵娟', '但愿人长久，千里共婵娟'] },
      { word: '柔情', meaning: '温柔的感情', examples: ['柔情似水', '柔情蜜意'] },
      { word: '佳期', meaning: '美好的时光', examples: ['佳期如梦', '忍顾佳期'] },
      { word: '锦书', meaning: '情书', examples: ['云中谁寄锦书来', '锦书难托'] },
      { word: '心许', meaning: '心中相许', examples: ['心许故人知', '芳心暗许'] },
    ],
  },
  {
    name: '哲理',
    themeKey: 'philosophy',
    words: [
      { word: '人生', meaning: '人的一生', examples: ['人生如梦', '人生若只如初见'] },
      { word: '光阴', meaning: '时间', examples: ['光阴似箭', '一寸光阴一寸金'] },
      { word: '浮生', meaning: '虚幻的人生', examples: ['浮生若梦', '浮生半日闲'] },
      { word: '岁月', meaning: '年月', examples: ['岁月如梭', '岁月不待人'] },
      { word: '道心', meaning: '悟道之心', examples: ['道心惟微', '道心之中'] },
      { word: '禅意', meaning: '禅的意境', examples: ['禅意幽幽', '禅意人生'] },
      { word: '悟境', meaning: '觉悟的境界', examples: ['悟境方知', '悟境超然'] },
      { word: '虚空', meaning: '空无所有', examples: ['虚空粉碎', '虚空境界'] },
      { word: '因果', meaning: '原因和结果', examples: ['因果循环', '因果报应'] },
      { word: '自然', meaning: '天然、本来', examples: ['道法自然', '顺其自然'] },
    ],
  },
];

export function getAllThemes(): { name: string; themeKey: ImageryTheme }[] {
  return IMAGERY_THEMES.map(({ name, themeKey }) => ({ name, themeKey }));
}

export function getImageryByTheme(theme: ImageryTheme): ImageryWord[] {
  const category = IMAGERY_THEMES.find((t) => t.themeKey === theme);
  return category ? category.words : [];
}

export function getThemeName(theme: ImageryTheme): string {
  const category = IMAGERY_THEMES.find((t) => t.themeKey === theme);
  return category ? category.name : '';
}

export function getRelatedImagery(word: string, limit: number = 5): ImageryWord[] {
  const allWords: ImageryWord[] = [];
  for (const theme of IMAGERY_THEMES) {
    allWords.push(...theme.words);
  }

  const related: ImageryWord[] = [];
  const targetWord = word;

  for (const w of allWords) {
    if (w.word === targetWord) continue;

    let similarity = 0;
    if (w.word.includes(targetWord) || targetWord.includes(w.word)) {
      similarity = 0.8;
    } else {
        const commonChars = [...w.word].filter((c) => targetWord.includes(c)).length;
        const maxLen = Math.max(w.word.length, targetWord.length);
        similarity = commonChars / maxLen;
      }

    if (similarity > 0.3) {
      related.push(w);
    }
  }

  return related.slice(0, limit);
}

export function searchImagery(keyword: string): ImageryWord[] {
  const results: ImageryWord[] = [];
  for (const theme of IMAGERY_THEMES) {
    for (const word of theme.words) {
      if (
        word.word.includes(keyword) ||
        word.meaning.includes(keyword) ||
        word.examples.some((e) => e.includes(keyword))
      ) {
        results.push(word);
      }
    }
  }
  return results;
}
