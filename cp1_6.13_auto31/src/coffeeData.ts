export interface FlavorScore {
  dimension: string;
  score: number;
}

export interface RoastPoint {
  time: number;
  temperature: number;
}

export interface CoffeeBean {
  id: string;
  name: string;
  origin: string;
  region: string;
  roastLevel: 'light' | 'medium' | 'dark';
  roastLevelLabel: string;
  flavorScores: FlavorScore[];
  roastCurve: RoastPoint[];
  tastingNotes: string;
  colorStart: string;
  colorEnd: string;
}

export const flavorDimensions = ['酸度', '苦度', '甜度', '醇厚度', '果香', '坚果香'];

export const coffeeBeans: CoffeeBean[] = [
  {
    id: 'ethiopia-yirgacheffe',
    name: '埃塞俄比亚 耶加雪菲',
    origin: '埃塞俄比亚',
    region: '非洲',
    roastLevel: 'light',
    roastLevelLabel: '浅烘',
    flavorScores: [
      { dimension: '酸度', score: 8.5 },
      { dimension: '苦度', score: 3.0 },
      { dimension: '甜度', score: 7.5 },
      { dimension: '醇厚度', score: 5.0 },
      { dimension: '果香', score: 9.0 },
      { dimension: '坚果香', score: 4.0 },
    ],
    roastCurve: [
      { time: 0, temperature: 180 },
      { time: 2, temperature: 195 },
      { time: 4, temperature: 205 },
      { time: 6, temperature: 210 },
      { time: 8, temperature: 215 },
      { time: 10, temperature: 218 },
      { time: 12, temperature: 220 },
    ],
    tastingNotes:
      '耶加雪菲以其明亮的柑橘酸质和茉莉花香气闻名。入口时能感受到柠檬和橙花的清新，中段带有蜂蜜般的甜感，余韵悠长，带有茶感。适合手冲和爱乐压，能充分展现其复杂的花果香调。',
    colorStart: '#D4A574',
    colorEnd: '#8B5A2B',
  },
  {
    id: 'kenya-aa',
    name: '肯尼亚 AA',
    origin: '肯尼亚',
    region: '非洲',
    roastLevel: 'medium',
    roastLevelLabel: '中烘',
    flavorScores: [
      { dimension: '酸度', score: 9.0 },
      { dimension: '苦度', score: 4.5 },
      { dimension: '甜度', score: 7.0 },
      { dimension: '醇厚度', score: 6.5 },
      { dimension: '果香', score: 8.5 },
      { dimension: '坚果香', score: 5.0 },
    ],
    roastCurve: [
      { time: 0, temperature: 180 },
      { time: 3, temperature: 200 },
      { time: 6, temperature: 210 },
      { time: 9, temperature: 218 },
      { time: 12, temperature: 225 },
      { time: 14, temperature: 230 },
    ],
    tastingNotes:
      '肯尼亚 AA 拥有强烈的黑醋栗和番茄般的明亮酸质，酒体饱满，口感丰富。带有葡萄柚、黑加仑的果香，以及红糖的甜感。余味干净，带有莓果的清新感。适合法压壶和虹吸壶。',
    colorStart: '#B87333',
    colorEnd: '#5C3317',
  },
  {
    id: 'colombia-huila',
    name: '哥伦比亚 慧兰',
    origin: '哥伦比亚',
    region: '中南美',
    roastLevel: 'medium',
    roastLevelLabel: '中烘',
    flavorScores: [
      { dimension: '酸度', score: 6.5 },
      { dimension: '苦度', score: 5.5 },
      { dimension: '甜度', score: 8.0 },
      { dimension: '醇厚度', score: 7.0 },
      { dimension: '果香', score: 6.0 },
      { dimension: '坚果香', score: 7.5 },
    ],
    roastCurve: [
      { time: 0, temperature: 180 },
      { time: 3, temperature: 198 },
      { time: 6, temperature: 208 },
      { time: 9, temperature: 216 },
      { time: 12, temperature: 222 },
      { time: 14, temperature: 228 },
    ],
    tastingNotes:
      '哥伦比亚慧兰产区的咖啡以平衡著称，带有焦糖和坚果的甜感，柔和的柑橘酸质，以及巧克力般的醇厚口感。入口顺滑，余味带有红糖和榛子的香气。适合各种冲煮方式，是入门精品咖啡的佳选。',
    colorStart: '#C4876A',
    colorEnd: '#6B4423',
  },
  {
    id: 'guatemala-antigua',
    name: '危地马拉 安提瓜',
    origin: '危地马拉',
    region: '中南美',
    roastLevel: 'medium',
    roastLevelLabel: '中烘',
    flavorScores: [
      { dimension: '酸度', score: 7.0 },
      { dimension: '苦度', score: 6.0 },
      { dimension: '甜度', score: 7.5 },
      { dimension: '醇厚度', score: 7.5 },
      { dimension: '果香', score: 5.5 },
      { dimension: '坚果香', score: 8.0 },
    ],
    roastCurve: [
      { time: 0, temperature: 180 },
      { time: 3, temperature: 196 },
      { time: 6, temperature: 206 },
      { time: 9, temperature: 214 },
      { time: 12, temperature: 220 },
      { time: 14, temperature: 226 },
    ],
    tastingNotes:
      '危地马拉安提瓜咖啡以其巧克力般的醇厚和烟熏气息闻名。带有可可、焦糖和坚果的风味，柔和的酸质与饱满的酒体完美平衡。余韵悠长，带有淡淡的香料气息。适合浓缩和手冲。',
    colorStart: '#A0522D',
    colorEnd: '#4A2C17',
  },
  {
    id: 'sumatra-mandheling',
    name: '苏门答腊 曼特宁',
    origin: '印度尼西亚',
    region: '亚洲',
    roastLevel: 'dark',
    roastLevelLabel: '深烘',
    flavorScores: [
      { dimension: '酸度', score: 3.0 },
      { dimension: '苦度', score: 8.5 },
      { dimension: '甜度', score: 5.0 },
      { dimension: '醇厚度', score: 9.5 },
      { dimension: '果香', score: 3.5 },
      { dimension: '坚果香', score: 7.0 },
    ],
    roastCurve: [
      { time: 0, temperature: 180 },
      { time: 4, temperature: 200 },
      { time: 8, temperature: 215 },
      { time: 12, temperature: 225 },
      { time: 15, temperature: 235 },
      { time: 18, temperature: 240 },
    ],
    tastingNotes:
      '曼特宁咖啡以其厚重的酒体和低沉的酸质著称。带有草本、泥土和香料的复杂风味，以及黑巧克力和雪松的余韵。口感浓郁顺滑，是喜欢重口味咖啡者的最爱。适合法式压滤壶和浓缩咖啡。',
    colorStart: '#6B4226',
    colorEnd: '#2F1810',
  },
  {
    id: 'brazil-santos',
    name: '巴西 桑托斯',
    origin: '巴西',
    region: '中南美',
    roastLevel: 'medium',
    roastLevelLabel: '中烘',
    flavorScores: [
      { dimension: '酸度', score: 4.5 },
      { dimension: '苦度', score: 6.0 },
      { dimension: '甜度', score: 8.5 },
      { dimension: '醇厚度', score: 7.0 },
      { dimension: '果香', score: 4.5 },
      { dimension: '坚果香', score: 8.5 },
    ],
    roastCurve: [
      { time: 0, temperature: 180 },
      { time: 3, temperature: 196 },
      { time: 6, temperature: 205 },
      { time: 9, temperature: 212 },
      { time: 12, temperature: 218 },
      { time: 14, temperature: 224 },
    ],
    tastingNotes:
      '巴西桑托斯咖啡以其坚果巧克力风味和甜感著称。低酸醇厚，带有榛子、牛奶巧克力和焦糖的甜美风味。口感顺滑圆润，是意式拼配咖啡的基石。适合浓缩咖啡、卡布奇诺和拿铁。',
    colorStart: '#CD853F',
    colorEnd: '#654321',
  },
  {
    id: 'yemen-mocha',
    name: '也门 摩卡',
    origin: '也门',
    region: '非洲',
    roastLevel: 'light',
    roastLevelLabel: '浅烘',
    flavorScores: [
      { dimension: '酸度', score: 7.5 },
      { dimension: '苦度', score: 5.0 },
      { dimension: '甜度', score: 8.0 },
      { dimension: '醇厚度', score: 6.5 },
      { dimension: '果香', score: 9.5 },
      { dimension: '坚果香', score: 5.5 },
    ],
    roastCurve: [
      { time: 0, temperature: 180 },
      { time: 2, temperature: 193 },
      { time: 4, temperature: 203 },
      { time: 6, temperature: 208 },
      { time: 8, temperature: 212 },
      { time: 10, temperature: 216 },
      { time: 12, temperature: 219 },
    ],
    tastingNotes:
      '也门摩卡是世界上最古老的咖啡品种之一，以其浓郁的水果风味闻名。带有蓝莓、草莓和葡萄干的甜香，以及淡淡的香料和巧克力气息。酸质明亮活泼，口感丰富复杂。适合手冲，能充分展现其独特的果香。',
    colorStart: '#DEB887',
    colorEnd: '#8B4513',
  },
  {
    id: 'kona-hawaii',
    name: '夏威夷 科纳',
    origin: '美国夏威夷',
    region: '亚洲',
    roastLevel: 'medium',
    roastLevelLabel: '中烘',
    flavorScores: [
      { dimension: '酸度', score: 6.0 },
      { dimension: '苦度', score: 5.0 },
      { dimension: '甜度', score: 9.0 },
      { dimension: '醇厚度', score: 6.0 },
      { dimension: '果香', score: 7.0 },
      { dimension: '坚果香', score: 7.0 },
    ],
    roastCurve: [
      { time: 0, temperature: 180 },
      { time: 3, temperature: 195 },
      { time: 6, temperature: 204 },
      { time: 9, temperature: 210 },
      { time: 12, temperature: 216 },
      { time: 14, temperature: 220 },
    ],
    tastingNotes:
      '夏威夷科纳咖啡生长在火山土壤上，拥有独特的甜感和水果风味。带有菠萝、芒果等热带水果的香气，以及焦糖和坚果的甜感。酸质柔和，口感干净清爽。适合手冲和冷萃，能带来阳光般的愉悦感受。',
    colorStart: '#D2B48C',
    colorEnd: '#704214',
  },
];

export const regions = ['非洲', '中南美', '亚洲'];
export const roastLevels = [
  { value: 'light', label: '浅烘' },
  { value: 'medium', label: '中烘' },
  { value: 'dark', label: '深烘' },
];
