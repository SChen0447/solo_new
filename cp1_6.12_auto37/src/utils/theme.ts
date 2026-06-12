export const coverSchemes = [
  { name: '落日陶土', grad: 'linear-gradient(135deg, #E27D60 0%, #C38D9E 50%, #E8A87C 100%)' },
  { name: '橄榄晨光', grad: 'linear-gradient(135deg, #A8B676 0%, #7D8C53 50%, #D4C07A 100%)' },
  { name: '蜜糖杏橘', grad: 'linear-gradient(135deg, #F4A261 0%, #E76F51 50%, #FFCD7C 100%)' },
  { name: '抹茶奶霜', grad: 'linear-gradient(135deg, #B5C99A 0%, #84956D 50%, #E5D7B0 100%)' },
  { name: '莓果花园', grad: 'linear-gradient(135deg, #D86887 0%, #A56A8D 50%, #F0A6B5 100%)' },
  { name: '海盐焦糖', grad: 'linear-gradient(135deg, #9BB3C4 0%, #C9A488 50%, #E5D4C0 100%)' },
  { name: '薰衣草梦', grad: 'linear-gradient(135deg, #B19CD9 0%, #8E7DB8 50%, #F0DDF0 100%)' },
  { name: '柚香清茶', grad: 'linear-gradient(135deg, #8FBFAD 0%, #6FA08E 50%, #D5E4C6 100%)' },
];

export const difficultyMeta: Record<string, { label: string; color: string; bg: string; border: string }> = {
  easy: { label: '简单', color: '#4A7C46', bg: '#E8F2E6', border: '#B8D5B2' },
  medium: { label: '中等', color: '#8A6D1E', bg: '#FFF4D6', border: '#E8D084' },
  hard: { label: '困难', color: '#A34848', bg: '#FBE5E5', border: '#E9B5B5' },
};
