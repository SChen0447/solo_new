export interface CapsuleContent {
  id: string;
  text: string;
  tags: string[];
}

export interface Capsule {
  id: string;
  title: string;
  contents: CapsuleContent[];
  images: string[];
  openDate: string;
  coverColor: CoverColor;
  createdAt: string;
  isOpened: boolean;
  clues: string[];
}

export type CoverColor = {
  name: string;
  from: string;
  to: string;
};

export const COVER_COLORS: CoverColor[] = [
  { name: '薰衣草', from: '#E0BBE4', to: '#957DAD' },
  { name: '樱花粉', from: '#FFDFD3', to: '#FEC8D8' },
  { name: '薄荷绿', from: '#D2E9E9', to: '#A8E6CF' },
  { name: '奶油黄', from: '#FFF3B0', to: '#FFD9A0' },
  { name: '天空蓝', from: '#B8E0F2', to: '#91C8E4' },
  { name: '蜜桃橙', from: '#FFDAC1', to: '#FFB7B2' },
];
