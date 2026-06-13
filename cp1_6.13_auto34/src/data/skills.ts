import type { Skill, ElementType } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface SkillTemplate {
  name: string;
  type: ElementType;
  power: number;
  accuracy: number;
  pp: number;
  description: string;
}

const skillTemplates: SkillTemplate[] = [
  { name: '火焰喷射', type: 'fire', power: 90, accuracy: 100, pp: 15, description: '喷出炽热的火焰攻击对手' },
  { name: '火焰旋涡', type: 'fire', power: 35, accuracy: 85, pp: 15, description: '将对手卷入火焰旋涡中造成持续伤害' },
  { name: '大字爆炎', type: 'fire', power: 110, accuracy: 85, pp: 5, description: '用巨大的火焰文字攻击对手' },
  { name: '水枪', type: 'water', power: 40, accuracy: 100, pp: 25, description: '喷射水柱攻击对手' },
  { name: '水炮', type: 'water', power: 110, accuracy: 80, pp: 5, description: '发射强力的水柱攻击对手' },
  { name: '冲浪', type: 'water', power: 90, accuracy: 100, pp: 15, description: '掀起巨大的海浪攻击对手' },
  { name: '藤鞭', type: 'grass', power: 45, accuracy: 100, pp: 25, description: '用细长的藤蔓抽打对手' },
  { name: '飞叶快刀', type: 'grass', power: 55, accuracy: 95, pp: 25, description: '用锋利的叶片切割对手' },
  { name: '阳光烈焰', type: 'grass', power: 120, accuracy: 100, pp: 10, description: '吸收阳光后发射强力光束' },
  { name: '电击', type: 'electric', power: 40, accuracy: 100, pp: 30, description: '释放电流攻击对手' },
  { name: '十万伏特', type: 'electric', power: 90, accuracy: 100, pp: 15, description: '释放强力的电流攻击对手' },
  { name: '雷电', type: 'electric', power: 110, accuracy: 70, pp: 10, description: '召唤雷电劈向对手' },
  { name: '冰冻光线', type: 'ice', power: 90, accuracy: 100, pp: 10, description: '发射冰冻光线攻击对手' },
  { name: '暴风雪', type: 'ice', power: 110, accuracy: 70, pp: 5, description: '召唤暴风雪攻击对手' },
  { name: '冰球', type: 'ice', power: 30, accuracy: 90, pp: 20, description: '连续5回合滚动冰球攻击' },
];

export const skillPool: Skill[] = skillTemplates.map((template) => ({
  ...template,
  id: uuidv4(),
  maxPp: template.pp,
}));

export const getSkillById = (id: string): Skill | undefined => {
  return skillPool.find((s) => s.id === id);
};
