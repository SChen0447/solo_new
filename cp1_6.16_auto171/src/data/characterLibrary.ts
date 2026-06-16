import { CharacterTemplate, CharacterType } from '../types';

export const CHARACTER_TEMPLATES: CharacterTemplate[] = [
  {
    type: 'boy',
    defaultName: '小男孩',
    colors: [
      { name: '蓝色', value: '#42A5F5' },
      { name: '绿色', value: '#66BB6A' },
      { name: '红色', value: '#EF5350' }
    ]
  },
  {
    type: 'girl',
    defaultName: '小女孩',
    colors: [
      { name: '粉色', value: '#F06292' },
      { name: '紫色', value: '#AB47BC' },
      { name: '黄色', value: '#FFD54F' }
    ]
  },
  {
    type: 'dog',
    defaultName: '小狗',
    colors: [
      { name: '棕色', value: '#8D6E63' },
      { name: '金色', value: '#FFB74D' },
      { name: '灰色', value: '#9E9E9E' }
    ]
  },
  {
    type: 'cat',
    defaultName: '小猫',
    colors: [
      { name: '橘色', value: '#FF8A65' },
      { name: '黑色', value: '#424242' },
      { name: '白色', value: '#E0E0E0' }
    ]
  },
  {
    type: 'rocket',
    defaultName: '火箭',
    colors: [
      { name: '红色', value: '#EF5350' },
      { name: '蓝色', value: '#42A5F5' },
      { name: '银色', value: '#B0BEC5' }
    ]
  },
  {
    type: 'star',
    defaultName: '星星',
    colors: [
      { name: '金色', value: '#FFD54F' },
      { name: '粉色', value: '#F48FB1' },
      { name: '青色', value: '#4DD0E1' }
    ]
  }
];

export function getTemplate(type: CharacterType): CharacterTemplate | undefined {
  return CHARACTER_TEMPLATES.find(t => t.type === type);
}
