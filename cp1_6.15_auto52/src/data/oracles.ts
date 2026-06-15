export type Theme = 'astrology' | 'witchcraft';

export type ZodiacSign =
  | 'aries'
  | 'taurus'
  | 'gemini'
  | 'cancer'
  | 'leo'
  | 'virgo'
  | 'libra'
  | 'scorpio'
  | 'sagittarius'
  | 'capricorn'
  | 'aquarius'
  | 'pisces';

export type FortuneCategory =
  | 'career'
  | 'love'
  | 'health'
  | 'wealth'
  | 'family'
  | 'friendship'
  | 'travel'
  | 'wisdom';

export interface Oracle {
  id: number;
  category: FortuneCategory;
  text: string;
  luckyNumbers: number[];
  compatibleSigns: ZodiacSign[];
}

export interface DivinationResult {
  id: string;
  timestamp: number;
  birthday: string;
  zodiacSign: ZodiacSign;
  category: FortuneCategory;
  sectorIndex: number;
  oracle: Oracle;
  fortuneScore: number;
  theme: Theme;
}

export const categoryNames: Record<FortuneCategory, string> = {
  career: '事业',
  love: '爱情',
  health: '健康',
  wealth: '财富',
  family: '家庭',
  friendship: '友情',
  travel: '旅行',
  wisdom: '智慧',
};

export const zodiacNames: Record<ZodiacSign, string> = {
  aries: '白羊座',
  taurus: '金牛座',
  gemini: '双子座',
  cancer: '巨蟹座',
  leo: '狮子座',
  virgo: '处女座',
  libra: '天秤座',
  scorpio: '天蝎座',
  sagittarius: '射手座',
  capricorn: '摩羯座',
  aquarius: '水瓶座',
  pisces: '双鱼座',
};

export const sectorColors: Record<FortuneCategory, { start: string; end: string }> = {
  career: { start: 'rgba(255, 193, 7, 0.6)', end: 'rgba(255, 152, 0, 0.3)' },
  love: { start: 'rgba(233, 30, 99, 0.6)', end: 'rgba(156, 39, 176, 0.3)' },
  health: { start: 'rgba(76, 175, 80, 0.6)', end: 'rgba(0, 150, 136, 0.3)' },
  wealth: { start: 'rgba(255, 215, 0, 0.7)', end: 'rgba(255, 193, 7, 0.3)' },
  family: { start: 'rgba(156, 39, 176, 0.6)', end: 'rgba(103, 58, 183, 0.3)' },
  friendship: { start: 'rgba(33, 150, 243, 0.6)', end: 'rgba(3, 169, 244, 0.3)' },
  travel: { start: 'rgba(0, 188, 212, 0.6)', end: 'rgba(0, 150, 136, 0.3)' },
  wisdom: { start: 'rgba(63, 81, 181, 0.6)', end: 'rgba(33, 150, 243, 0.3)' },
};

export const categories: FortuneCategory[] = [
  'career',
  'love',
  'health',
  'wealth',
  'family',
  'friendship',
  'travel',
  'wisdom',
];

export const oracles: Oracle[] = [
  { id: 1, category: 'career', text: '龙马精神，事业如日中天。贵人相助，前程似锦。', luckyNumbers: [3, 8, 15], compatibleSigns: ['aries', 'leo', 'sagittarius'] },
  { id: 2, category: 'career', text: '稳扎稳打，厚积薄发。耐心等待时机，一鸣惊人。', luckyNumbers: [5, 12, 23], compatibleSigns: ['taurus', 'virgo', 'capricorn'] },
  { id: 3, category: 'career', text: '变通求新，开拓进取。打破陈规，方能脱颖而出。', luckyNumbers: [7, 14, 28], compatibleSigns: ['gemini', 'libra', 'aquarius'] },
  { id: 4, category: 'career', text: '团队协作，众志成城。众人拾柴火焰高，事业更上一层楼。', luckyNumbers: [2, 9, 18], compatibleSigns: ['cancer', 'scorpio', 'pisces'] },
  { id: 5, category: 'career', text: '韬光养晦，厚积薄发。今日的沉淀是明日的腾飞。', luckyNumbers: [4, 11, 22], compatibleSigns: ['capricorn', 'virgo', 'taurus'] },
  { id: 6, category: 'career', text: '把握机遇，乘势而上。风口之上，猪也能飞翔。', luckyNumbers: [1, 6, 13], compatibleSigns: ['leo', 'aries', 'sagittarius'] },
  { id: 7, category: 'career', text: '精益求精，追求卓越。细节决定成败，态度决定高度。', luckyNumbers: [6, 16, 26], compatibleSigns: ['virgo', 'capricorn', 'taurus'] },
  { id: 8, category: 'career', text: '广结善缘，人脉即财脉。多一个朋友多一条路。', luckyNumbers: [9, 19, 29], compatibleSigns: ['libra', 'gemini', 'aquarius'] },

  { id: 9, category: 'love', text: '缘分天注定，千里共婵娟。有情人终成眷属。', luckyNumbers: [2, 12, 22], compatibleSigns: ['libra', 'taurus', 'pisces'] },
  { id: 10, category: 'love', text: '心有灵犀一点通，彼此相知相守。珍惜眼前人。', luckyNumbers: [7, 17, 27], compatibleSigns: ['cancer', 'scorpio', 'pisces'] },
  { id: 11, category: 'love', text: '热情似火，爱意浓浓。勇敢表达，莫负韶华。', luckyNumbers: [1, 11, 21], compatibleSigns: ['leo', 'aries', 'sagittarius'] },
  { id: 12, category: 'love', text: '细水长流，情深意重。平平淡淡才是真。', luckyNumbers: [4, 14, 24], compatibleSigns: ['taurus', 'virgo', 'capricorn'] },
  { id: 13, category: 'love', text: '转角遇到爱，缘分不期而至。保持开放的心。', luckyNumbers: [5, 15, 25], compatibleSigns: ['gemini', 'libra', 'aquarius'] },
  { id: 14, category: 'love', text: '破镜重圆，旧情复燃。好好珍惜，莫再错过。', luckyNumbers: [8, 18, 28], compatibleSigns: ['scorpio', 'cancer', 'pisces'] },
  { id: 15, category: 'love', text: '桃花朵朵开，魅力四射。择优而从，切勿花心。', luckyNumbers: [3, 13, 23], compatibleSigns: ['libra', 'gemini', 'leo'] },
  { id: 16, category: 'love', text: '相濡以沫，白头偕老。执子之手，与子偕老。', luckyNumbers: [6, 16, 26], compatibleSigns: ['cancer', 'taurus', 'virgo'] },

  { id: 17, category: 'health', text: '身强体健，精神焕发。运动是最好的良药。', luckyNumbers: [3, 13, 23], compatibleSigns: ['aries', 'leo', 'sagittarius'] },
  { id: 18, category: 'health', text: '劳逸结合，张弛有度。身体是革命的本钱。', luckyNumbers: [5, 15, 25], compatibleSigns: ['taurus', 'virgo', 'capricorn'] },
  { id: 19, category: 'health', text: '心情舒畅，百病不侵。笑一笑十年少。', luckyNumbers: [7, 17, 27], compatibleSigns: ['gemini', 'libra', 'aquarius'] },
  { id: 20, category: 'health', text: '饮食有节，起居有常。养生之道在于自律。', luckyNumbers: [2, 12, 22], compatibleSigns: ['cancer', 'scorpio', 'pisces'] },
  { id: 21, category: 'health', text: '气血调和，身心安泰。动静结合，相得益彰。', luckyNumbers: [4, 14, 24], compatibleSigns: ['virgo', 'taurus', 'capricorn'] },
  { id: 22, category: 'health', text: '精力充沛，活力满满。拥抱阳光，拥抱健康。', luckyNumbers: [1, 11, 21], compatibleSigns: ['leo', 'aries', 'sagittarius'] },
  { id: 23, category: 'health', text: '释放压力，轻松前行。心宽体胖，健康自来。', luckyNumbers: [6, 16, 26], compatibleSigns: ['libra', 'gemini', 'aquarius'] },
  { id: 24, category: 'health', text: '早睡早起，身体好。规律作息，远离疾病。', luckyNumbers: [8, 18, 28], compatibleSigns: ['capricorn', 'virgo', 'cancer'] },

  { id: 25, category: 'wealth', text: '财源广进，金玉满堂。正财偏财皆旺。', luckyNumbers: [8, 18, 28], compatibleSigns: ['taurus', 'leo', 'capricorn'] },
  { id: 26, category: 'wealth', text: '积少成多，聚沙成塔。勤俭持家，财富自来。', luckyNumbers: [4, 14, 24], compatibleSigns: ['virgo', 'capricorn', 'taurus'] },
  { id: 27, category: 'wealth', text: '投资有道，眼光独到。慧眼识珠，收获颇丰。', luckyNumbers: [6, 16, 26], compatibleSigns: ['gemini', 'libra', 'aquarius'] },
  { id: 28, category: 'wealth', text: '贵人相助，财运亨通。得道多助，失道寡助。', luckyNumbers: [3, 13, 23], compatibleSigns: ['leo', 'aries', 'sagittarius'] },
  { id: 29, category: 'wealth', text: '知足常乐，内心富足。财富不止于金钱。', luckyNumbers: [2, 12, 22], compatibleSigns: ['libra', 'pisces', 'cancer'] },
  { id: 30, category: 'wealth', text: '机会来临，果断出手。富贵险中求。', luckyNumbers: [1, 11, 21], compatibleSigns: ['aries', 'leo', 'scorpio'] },
  { id: 31, category: 'wealth', text: '稳健理财，细水长流。不贪不躁，财富稳增。', luckyNumbers: [5, 15, 25], compatibleSigns: ['taurus', 'capricorn', 'virgo'] },
  { id: 32, category: 'wealth', text: '开源节流，双管齐下。能赚会花，智慧人生。', luckyNumbers: [7, 17, 27], compatibleSigns: ['sagittarius', 'gemini', 'leo'] },

  { id: 33, category: 'family', text: '家和万事兴，亲情无价。珍惜天伦之乐。', luckyNumbers: [2, 12, 22], compatibleSigns: ['cancer', 'taurus', 'libra'] },
  { id: 34, category: 'family', text: '父慈子孝，兄友弟恭。其乐融融，幸福美满。', luckyNumbers: [4, 14, 24], compatibleSigns: ['cancer', 'virgo', 'pisces'] },
  { id: 35, category: 'family', text: '沟通是桥，理解是门。多些包容，少些争执。', luckyNumbers: [6, 16, 26], compatibleSigns: ['libra', 'gemini', 'aquarius'] },
  { id: 36, category: 'family', text: '血脉相连，骨肉情深。家人永远是你最坚强的后盾。', luckyNumbers: [3, 13, 23], compatibleSigns: ['cancer', 'scorpio', 'taurus'] },
  { id: 37, category: 'family', text: '常回家看看，陪伴是最长情的告白。', luckyNumbers: [5, 15, 25], compatibleSigns: ['capricorn', 'cancer', 'virgo'] },
  { id: 38, category: 'family', text: '家庭和睦，万事顺遂。家是温暖的港湾。', luckyNumbers: [7, 17, 27], compatibleSigns: ['libra', 'taurus', 'pisces'] },
  { id: 39, category: 'family', text: '同舟共济，患难与共。风雨过后见彩虹。', luckyNumbers: [1, 11, 21], compatibleSigns: ['scorpio', 'cancer', 'leo'] },
  { id: 40, category: 'family', text: '尊老爱幼，传统美德。传承良好家风。', luckyNumbers: [8, 18, 28], compatibleSigns: ['capricorn', 'virgo', 'cancer'] },

  { id: 41, category: 'friendship', text: '海内存知己，天涯若比邻。友谊地久天长。', luckyNumbers: [3, 13, 23], compatibleSigns: ['gemini', 'libra', 'aquarius'] },
  { id: 42, category: 'friendship', text: '君子之交淡如水，小人之交甘若醴。', luckyNumbers: [5, 15, 25], compatibleSigns: ['taurus', 'virgo', 'capricorn'] },
  { id: 43, category: 'friendship', text: '患难见真情，日久见人心。珍惜真正的朋友。', luckyNumbers: [7, 17, 27], compatibleSigns: ['scorpio', 'cancer', 'pisces'] },
  { id: 44, category: 'friendship', text: '广结良缘，高朋满座。朋友多了路好走。', luckyNumbers: [2, 12, 22], compatibleSigns: ['leo', 'aries', 'sagittarius'] },
  { id: 45, category: 'friendship', text: '肝胆相照，荣辱与共。真正的朋友经得起考验。', luckyNumbers: [4, 14, 24], compatibleSigns: ['aries', 'leo', 'scorpio'] },
  { id: 46, category: 'friendship', text: '近朱者赤，近墨者黑。择善而从之。', luckyNumbers: [6, 16, 26], compatibleSigns: ['virgo', 'capricorn', 'libra'] },
  { id: 47, category: 'friendship', text: '志同道合，相见恨晚。知音难觅，好好珍惜。', luckyNumbers: [1, 11, 21], compatibleSigns: ['sagittarius', 'aquarius', 'gemini'] },
  { id: 48, category: 'friendship', text: '互帮互助，共同成长。朋友是人生宝贵的财富。', luckyNumbers: [8, 18, 28], compatibleSigns: ['libra', 'gemini', 'leo'] },

  { id: 49, category: 'travel', text: '读万卷书，行万里路。旅途中遇见更好的自己。', luckyNumbers: [7, 17, 27], compatibleSigns: ['sagittarius', 'gemini', 'aquarius'] },
  { id: 50, category: 'travel', text: '说走就走，人生需要一次冲动的旅行。', luckyNumbers: [1, 11, 21], compatibleSigns: ['aries', 'sagittarius', 'leo'] },
  { id: 51, category: 'travel', text: '异域风情，尽收眼底。开阔眼界，增长见识。', luckyNumbers: [3, 13, 23], compatibleSigns: ['libra', 'gemini', 'pisces'] },
  { id: 52, category: 'travel', text: '山水之间，心旷神怡。回归自然，净化心灵。', luckyNumbers: [5, 15, 25], compatibleSigns: ['taurus', 'virgo', 'cancer'] },
  { id: 53, category: 'travel', text: '旅途平安，贵人相助。一路顺风，满载而归。', luckyNumbers: [2, 12, 22], compatibleSigns: ['cancer', 'libra', 'taurus'] },
  { id: 54, category: 'travel', text: '探索未知，发现惊喜。人生处处是风景。', luckyNumbers: [4, 14, 24], compatibleSigns: ['aquarius', 'sagittarius', 'aries'] },
  { id: 55, category: 'travel', text: '结伴而行，其乐融融。与志同道合的人一起看世界。', luckyNumbers: [6, 16, 26], compatibleSigns: ['gemini', 'libra', 'leo'] },
  { id: 56, category: 'travel', text: '慢行细品，感受生活。旅行不在乎终点，而在乎过程。', luckyNumbers: [8, 18, 28], compatibleSigns: ['taurus', 'pisces', 'virgo'] },

  { id: 57, category: 'wisdom', text: '学而不思则罔，思而不学则殆。学思结合。', luckyNumbers: [4, 14, 24], compatibleSigns: ['gemini', 'virgo', 'aquarius'] },
  { id: 58, category: 'wisdom', text: '知之为知之，不知为不知，是知也。', luckyNumbers: [6, 16, 26], compatibleSigns: ['capricorn', 'virgo', 'taurus'] },
  { id: 59, category: 'wisdom', text: '开卷有益，书香门第。知识就是力量。', luckyNumbers: [2, 12, 22], compatibleSigns: ['gemini', 'libra', 'pisces'] },
  { id: 60, category: 'wisdom', text: '大智若愚，难得糊涂。看透不说透，才是大智慧。', luckyNumbers: [8, 18, 28], compatibleSigns: ['scorpio', 'pisces', 'cancer'] },
  { id: 61, category: 'wisdom', text: '吾日三省吾身。反思中成长，总结中进步。', luckyNumbers: [3, 13, 23], compatibleSigns: ['virgo', 'capricorn', 'scorpio'] },
  { id: 62, category: 'wisdom', text: '博观而约取，厚积而薄发。沉淀是为了更好的爆发。', luckyNumbers: [5, 15, 25], compatibleSigns: ['sagittarius', 'leo', 'aries'] },
  { id: 63, category: 'wisdom', text: '灵感迸发，创意无限。打破思维定势，发现新世界。', luckyNumbers: [1, 11, 21], compatibleSigns: ['aquarius', 'gemini', 'sagittarius'] },
  { id: 64, category: 'wisdom', text: '活到老学到老。人生就是一场不断学习的修行。', luckyNumbers: [7, 17, 27], compatibleSigns: ['pisces', 'scorpio', 'libra'] },
];

export function getOraclesByCategory(category: FortuneCategory): Oracle[] {
  return oracles.filter((o) => o.category === category);
}

export function getSectorIndexFromAngle(angle: number): number {
  const normalized = ((angle % 360) + 360) % 360;
  return Math.floor(normalized / 45);
}

export function selectOracle(
  category: FortuneCategory,
  zodiacSign: ZodiacSign,
  randomValue: number
): Oracle {
  const categoryOracles = getOraclesByCategory(category);
  const weighted = categoryOracles.map((oracle) => {
    const compatibility = oracle.compatibleSigns.includes(zodiacSign) ? 2 : 1;
    return { oracle, weight: compatibility };
  });
  const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
  let random = randomValue * totalWeight;
  for (const w of weighted) {
    random -= w.weight;
    if (random <= 0) return w.oracle;
  }
  return weighted[weighted.length - 1].oracle;
}

export function calculateFortuneScore(
  sectorIndex: number,
  zodiacSign: ZodiacSign,
  oracle: Oracle,
  randomValue: number
): number {
  const baseScore = 50;
  const sectorOffset = Math.floor((randomValue - 0.5) * 40);
  const compatibilityBonus = oracle.compatibleSigns.includes(zodiacSign) ? 15 : 0;
  const score = baseScore + sectorOffset + compatibilityBonus;
  return Math.max(0, Math.min(100, score));
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
