export interface EmotionParams {
  cohesion: number;
  rotationSpeed: number;
  colorTemp: number;
  rhythm: number;
}

export interface EmotionPreset {
  name: string;
  keywords: string[];
  description: string;
  params: EmotionParams;
}

export const emotionPresets: EmotionPreset[] = [
  {
    name: '喜悦',
    keywords: ['喜悦', '开心', '快乐', '高兴', 'joy', 'happy'],
    description: '轻盈、明亮、上扬',
    params: { cohesion: 55, rotationSpeed: 130, colorTemp: 85, rhythm: 70 },
  },
  {
    name: '悲伤',
    keywords: ['悲伤', '难过', '伤心', '忧郁', 'sad', 'sorrow'],
    description: '沉重、灰暗、下沉',
    params: { cohesion: 40, rotationSpeed: 35, colorTemp: 15, rhythm: 25 },
  },
  {
    name: '愤怒',
    keywords: ['愤怒', '生气', '暴怒', '狂怒', 'anger', 'angry'],
    description: '激烈、躁动、爆发',
    params: { cohesion: 75, rotationSpeed: 190, colorTemp: 95, rhythm: 90 },
  },
  {
    name: '宁静',
    keywords: ['宁静', '平静', '安宁', '祥和', 'calm', 'peaceful'],
    description: '舒缓、柔和、安稳',
    params: { cohesion: 45, rotationSpeed: 25, colorTemp: 25, rhythm: 15 },
  },
  {
    name: '焦虑',
    keywords: ['焦虑', '紧张', '不安', '焦虑', 'anxious', 'nervous'],
    description: '急促、紊乱、紧绷',
    params: { cohesion: 60, rotationSpeed: 160, colorTemp: 60, rhythm: 85 },
  },
  {
    name: '希望',
    keywords: ['希望', '期待', '憧憬', '向往', 'hope', 'hopeful'],
    description: '明亮、向上、温暖',
    params: { cohesion: 50, rotationSpeed: 90, colorTemp: 75, rhythm: 60 },
  },
  {
    name: '孤独',
    keywords: ['孤独', '寂寞', '孤单', 'lonely', 'alone'],
    description: '疏离、冷寂、飘散',
    params: { cohesion: 20, rotationSpeed: 40, colorTemp: 20, rhythm: 30 },
  },
  {
    name: '兴奋',
    keywords: ['兴奋', '激动', '亢奋', '热情', 'excited', 'exciting'],
    description: '迸发、闪耀、跃动',
    params: { cohesion: 65, rotationSpeed: 170, colorTemp: 90, rhythm: 80 },
  },
  {
    name: '沉思',
    keywords: ['沉思', '思考', '冥想', '思索', 'thoughtful', 'meditation'],
    description: '深邃、内敛、缓慢',
    params: { cohesion: 55, rotationSpeed: 30, colorTemp: 35, rhythm: 20 },
  },
  {
    name: '浪漫',
    keywords: ['浪漫', '甜蜜', '柔情', '爱意', 'romantic', 'love'],
    description: '温柔、梦幻、缠绕',
    params: { cohesion: 60, rotationSpeed: 70, colorTemp: 70, rhythm: 55 },
  },
  {
    name: '恐惧',
    keywords: ['恐惧', '害怕', '惊恐', 'fear', 'afraid', 'scared'],
    description: '收缩、颤抖、阴冷',
    params: { cohesion: 80, rotationSpeed: 140, colorTemp: 25, rhythm: 75 },
  },
  {
    name: '厌恶',
    keywords: ['厌恶', '反感', '排斥', 'disgust', 'disgusted'],
    description: '排斥、扭曲、躁动',
    params: { cohesion: 30, rotationSpeed: 110, colorTemp: 55, rhythm: 65 },
  },
];

export function matchEmotion(keyword: string): EmotionPreset | null {
  const lower = keyword.toLowerCase().trim();
  if (!lower) return null;
  for (const preset of emotionPresets) {
    for (const kw of preset.keywords) {
      if (kw.toLowerCase() === lower) {
        return preset;
      }
    }
  }
  for (const preset of emotionPresets) {
    for (const kw of preset.keywords) {
      if (kw.toLowerCase().includes(lower) || lower.includes(kw.toLowerCase())) {
        return preset;
      }
    }
  }
  return null;
}

export function generateRandomParams(): EmotionParams {
  return {
    cohesion: Math.floor(Math.random() * 101),
    rotationSpeed: Math.floor(Math.random() * 201),
    colorTemp: Math.floor(Math.random() * 101),
    rhythm: Math.floor(Math.random() * 101),
  };
}

export function lerpParams(target: EmotionParams, current: EmotionParams, t: number): EmotionParams {
  const clampT = Math.max(0, Math.min(1, t));
  return {
    cohesion: current.cohesion + (target.cohesion - current.cohesion) * clampT,
    rotationSpeed: current.rotationSpeed + (target.rotationSpeed - current.rotationSpeed) * clampT,
    colorTemp: current.colorTemp + (target.colorTemp - current.colorTemp) * clampT,
    rhythm: current.rhythm + (target.rhythm - current.rhythm) * clampT,
  };
}
