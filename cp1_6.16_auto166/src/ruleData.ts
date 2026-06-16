import type { SubstitutionRule } from './types'

export const substitutionRules: SubstitutionRule[] = [
  {
    id: 'rule-1',
    originalName: '牛奶',
    substituteName: '豆浆',
    ratio: '1:1',
    ratioValue: 1,
    tasteChange: { sweet: '减弱', salty: '不变', sour: '不变', bitter: '不变', spicy: '不变' },
    tasteDescription: '豆香更浓郁，奶香味减弱，甜度略降'
  },
  {
    id: 'rule-2',
    originalName: '中筋面粉',
    substituteName: '低筋面粉+玉米淀粉（4:1混合）',
    ratio: '1:1',
    ratioValue: 1,
    tasteChange: { sweet: '不变', salty: '不变', sour: '不变', bitter: '不变', spicy: '不变' },
    tasteDescription: '口感更松软，适合做蛋糕和饼干'
  },
  {
    id: 'rule-3',
    originalName: '黄油',
    substituteName: '橄榄油',
    ratio: '0.8:1',
    ratioValue: 0.8,
    tasteChange: { sweet: '减弱', salty: '不变', sour: '不变', bitter: '增强', spicy: '不变' },
    tasteDescription: '奶香味消失，带有橄榄油特有的清香和微苦'
  },
  {
    id: 'rule-4',
    originalName: '白砂糖',
    substituteName: '蜂蜜',
    ratio: '0.75:1',
    ratioValue: 0.75,
    tasteChange: { sweet: '增强', salty: '不变', sour: '微变', bitter: '不变', spicy: '不变' },
    tasteDescription: '甜度更高，带有蜂蜜特有的花香和微酸'
  },
  {
    id: 'rule-5',
    originalName: '鸡蛋',
    substituteName: '成熟香蕉泥',
    ratio: '1:1',
    ratioValue: 1,
    tasteChange: { sweet: '增强', salty: '不变', sour: '不变', bitter: '不变', spicy: '不变' },
    tasteDescription: '增加香蕉风味，甜度上升，适合甜品'
  },
  {
    id: 'rule-6',
    originalName: '白醋',
    substituteName: '柠檬汁',
    ratio: '1:1',
    ratioValue: 1,
    tasteChange: { sour: '增强', sweet: '增强', salty: '不变', bitter: '不变', spicy: '不变' },
    tasteDescription: '酸度更清爽，带有柠檬果香和清甜'
  },
  {
    id: 'rule-7',
    originalName: '淡奶油',
    substituteName: '椰浆',
    ratio: '1:1',
    ratioValue: 1,
    tasteChange: { sweet: '减弱', salty: '不变', sour: '不变', bitter: '不变', spicy: '不变' },
    tasteDescription: '奶香味变为椰香，甜度降低，口感更清爽'
  },
  {
    id: 'rule-8',
    originalName: '酱油',
    substituteName: '生抽',
    ratio: '1:1',
    ratioValue: 1,
    tasteChange: { salty: '增强', sweet: '不变', sour: '不变', bitter: '不变', spicy: '不变' },
    tasteDescription: '咸味更重，颜色较浅，酱香味略淡'
  },
  {
    id: 'rule-9',
    originalName: '味精',
    substituteName: '鸡精',
    ratio: '0.5:1',
    ratioValue: 0.5,
    tasteChange: { salty: '增强', sweet: '不变', sour: '不变', bitter: '不变', spicy: '不变' },
    tasteDescription: '带有鸡肉鲜味，需注意盐量以免过咸'
  },
  {
    id: 'rule-10',
    originalName: '料酒',
    substituteName: '黄酒',
    ratio: '1:1',
    ratioValue: 1,
    tasteChange: { sweet: '增强', salty: '不变', sour: '不变', bitter: '不变', spicy: '不变' },
    tasteDescription: '酒香更浓郁，略带甜味，去腥效果相当'
  },
  {
    id: 'rule-11',
    originalName: '花生油',
    substituteName: '玉米油',
    ratio: '1:1',
    ratioValue: 1,
    tasteChange: { sweet: '不变', salty: '不变', sour: '不变', bitter: '不变', spicy: '不变' },
    tasteDescription: '花生香味消失，味道更清淡中性'
  },
  {
    id: 'rule-12',
    originalName: '黑胡椒粉',
    substituteName: '白胡椒粉',
    ratio: '0.8:1',
    ratioValue: 0.8,
    tasteChange: { spicy: '减弱', bitter: '减弱', sweet: '不变', salty: '不变', sour: '不变' },
    tasteDescription: '辛辣味较温和，香味更细腻'
  },
  {
    id: 'rule-13',
    originalName: '白芝麻',
    substituteName: '亚麻籽（碾碎）',
    ratio: '1:1',
    ratioValue: 1,
    tasteChange: { bitter: '增强', sweet: '不变', salty: '不变', sour: '不变', spicy: '不变' },
    tasteDescription: '坚果香气更浓，略带微苦，增加营养'
  },
  {
    id: 'rule-14',
    originalName: '土豆淀粉',
    substituteName: '玉米淀粉',
    ratio: '1:1',
    ratioValue: 1,
    tasteChange: { sweet: '不变', salty: '不变', sour: '不变', bitter: '不变', spicy: '不变' },
    tasteDescription: '口感基本一致，玉米淀粉勾芡稍显透亮'
  },
  {
    id: 'rule-15',
    originalName: '炼乳',
    substituteName: '淡奶+白砂糖（10:3混合）',
    ratio: '1:1',
    ratioValue: 1,
    tasteChange: { sweet: '不变', salty: '不变', sour: '不变', bitter: '不变', spicy: '不变' },
    tasteDescription: '口感和甜度接近，奶香味稍淡'
  },
  {
    id: 'rule-16',
    originalName: '干酵母',
    substituteName: '泡打粉',
    ratio: '2:1',
    ratioValue: 2,
    tasteChange: { sour: '不变', sweet: '不变', salty: '不变', bitter: '增强', spicy: '不变' },
    tasteDescription: '发酵速度更快，无需等待，可能略带碱味'
  },
  {
    id: 'rule-17',
    originalName: '菠菜',
    substituteName: '油麦菜',
    ratio: '1:1',
    ratioValue: 1,
    tasteChange: { bitter: '减弱', sweet: '不变', salty: '不变', sour: '不变', spicy: '不变' },
    tasteDescription: '口感更脆嫩，涩味减少，颜色更翠绿'
  },
  {
    id: 'rule-18',
    originalName: '鸡胸肉',
    substituteName: '猪里脊肉',
    ratio: '1:1',
    ratioValue: 1,
    tasteChange: { sweet: '不变', salty: '不变', sour: '不变', bitter: '不变', spicy: '不变' },
    tasteDescription: '肉质更嫩，肉香味更浓，脂肪含量略高'
  },
  {
    id: 'rule-19',
    originalName: '牛肉',
    substituteName: '羊肉',
    ratio: '1:1',
    ratioValue: 1,
    tasteChange: { sweet: '不变', salty: '不变', sour: '不变', bitter: '不变', spicy: '不变' },
    tasteDescription: '带有特有的羊膻味，肉质更细嫩'
  },
  {
    id: 'rule-20',
    originalName: '新鲜番茄',
    substituteName: '番茄酱',
    ratio: '1.5:1',
    ratioValue: 1.5,
    tasteChange: { sour: '增强', sweet: '增强', salty: '不变', bitter: '不变', spicy: '不变' },
    tasteDescription: '味道更浓郁，酸甜感更突出，注意调整盐量'
  },
  {
    id: 'rule-21',
    originalName: '洋葱',
    substituteName: '大葱',
    ratio: '1:1',
    ratioValue: 1,
    tasteChange: { spicy: '减弱', sweet: '不变', salty: '不变', sour: '不变', bitter: '不变' },
    tasteDescription: '辛辣味更淡，带有葱香，适合爆炒'
  },
  {
    id: 'rule-22',
    originalName: '大蒜',
    substituteName: '蒜蓉酱',
    ratio: '0.5:1',
    ratioValue: 0.5,
    tasteChange: { salty: '增强', spicy: '减弱', sweet: '不变', sour: '不变', bitter: '不变' },
    tasteDescription: '蒜香更柔和，可能含盐分，需调整用盐量'
  }
]
