import { v4 as uuidv4 } from 'uuid';

interface CopyTemplate {
  id: string;
  style: string;
  styleLabel: string;
  template: (product: string, audience: string, sellingPoints: string) => string;
}

export const copyTemplates: CopyTemplate[] = [
  {
    id: uuidv4(),
    style: 'rational',
    styleLabel: '理性数据型',
    template: (product, audience, sellingPoints) => 
      `【${product}】数据说话！${audience}首选，${sellingPoints}。经过严格测试验证，满意度高达98%，已有10万+用户选择。立即体验，用数据见证品质。`
  },
  {
    id: uuidv4(),
    style: 'emotional',
    styleLabel: '感性故事型',
    template: (product, audience, sellingPoints) => 
      `还记得第一次遇见${product}的那天吗？作为${audience}，我们都在寻找那份属于自己的美好。${sellingPoints}——不只是产品，更是生活中的小确幸，温暖每一个平凡的日子。`
  },
  {
    id: uuidv4(),
    style: 'humorous',
    styleLabel: '幽默吐槽型',
    template: (product, audience, sellingPoints) => 
      `警告：使用${product}后可能出现以下症状——${audience}们集体上头，${sellingPoints}，根本停不下来！别问我怎么知道的，我已经在补货了😂`
  },
  {
    id: uuidv4(),
    style: 'minimalist',
    styleLabel: '极简文艺型',
    template: (product, audience, sellingPoints) => 
      `${product}。\n${sellingPoints}。\n懂的人，自然懂。\n——致${audience}`
  },
  {
    id: uuidv4(),
    style: 'urgency',
    styleLabel: '紧迫促销型',
    template: (product, audience, sellingPoints) => 
      `🔥限时48小时！${product}疯狂秒杀！${audience}专属福利：${sellingPoints}。仅剩最后100件，手慢无！错过今天，再等一年！立即抢购👉`
  },
  {
    id: uuidv4(),
    style: 'testimonial',
    styleLabel: '用户证言型',
    template: (product, audience, sellingPoints) => 
      `「${product}彻底改变了我的生活！」——来自一位${audience}的真实反馈。${sellingPoints}，这些不是广告词，是上万用户的亲身体验。点击查看更多真实评价。`
  },
  {
    id: uuidv4(),
    style: 'question',
    styleLabel: '问题引导型',
    template: (product, audience, sellingPoints) => 
      `${audience}们，你还在为选择困难而烦恼吗？${product}来帮你！${sellingPoints}。一个好问题，胜过千言万语；一个好选择，改变一切。`
  },
  {
    id: uuidv4(),
    style: 'scenario',
    styleLabel: '场景描绘型',
    template: (product, audience, sellingPoints) => 
      `清晨7点的阳光里，${audience}的一天从${product}开始。${sellingPoints}，每一个细节都恰到好处。想象一下，这就是你明天的生活。`
  },
  {
    id: uuidv4(),
    style: 'contrast',
    styleLabel: '对比反差型',
    template: (product, audience, sellingPoints) => 
      `普通产品：${sellingPoints.split('，')[0]}。\n${product}：${sellingPoints}。\n${audience}的选择，高下立判。\n不是贵的就好，是对的才好。`
  },
  {
    id: uuidv4(),
    style: 'poetic',
    styleLabel: '诗意浪漫型',
    template: (product, audience, sellingPoints) => 
      `在时光的长河里，${product}如一颗明珠，为${audience}闪耀。${sellingPoints}，每一处都是匠心的印记。愿你拥有，愿你珍惜，愿这份美好与你常伴。`
  }
];

export function generateRandomCopies(
  productName: string,
  targetAudience: string,
  keySellingPoints: string,
  count: number = 4
) {
  const shuffled = [...copyTemplates].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count);
  
  return selected.map(template => ({
    id: uuidv4(),
    content: template.template(productName, targetAudience, keySellingPoints),
    style: template.style,
    styleLabel: template.styleLabel,
    comments: [],
    votes: 0
  }));
}

export const animalIcons = ['🐶', '🐱', '🐰', '🦊', '🐻', '🐼', '🐨', '🦁', '🐯', '🐮'];

export const authorColors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
];

export function getRandomAnimalIcon(): string {
  return animalIcons[Math.floor(Math.random() * animalIcons.length)];
}

export function getRandomAuthorColor(): string {
  return authorColors[Math.floor(Math.random() * authorColors.length)];
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
