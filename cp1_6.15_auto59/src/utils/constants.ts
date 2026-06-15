export interface ParticleParams {
  hueShift: number;
  motionIntensity: number;
  aggregation: number;
}

export interface KeywordData {
  word: string;
  size: number;
  color: string;
}

export interface AnalysisResult {
  wordFrequencies: { word: string; count: number }[];
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number;
  keywords: KeywordData[];
}

export interface ExampleText {
  text: string;
  label: string;
}

export interface PresetStyle {
  name: string;
  color: string;
  params: ParticleParams;
  emotionIntensity: number;
  particleSize: number;
  backgroundBrightness: number;
}

export const POSITIVE_WORDS = [
  'joy', 'love', 'happy', 'bright', 'warm', 'sun', 'light', 'hope', 'dream', 'smile',
  'heart', 'gold', 'fire', 'dance', 'sing', 'beautiful', 'wonderful', 'amazing', 'great',
  'free', 'fly', 'sky', 'star', 'shine', 'glow', 'sweet', 'gentle', 'soft', 'peace',
  'calm', 'bliss', 'ecstasy', 'passion', 'desire', 'heaven', 'paradise', 'angel', 'blessed',
  'forever', 'always', 'together', 'unite', 'harmony', 'melody', 'symphony', 'magic'
];

export const NEGATIVE_WORDS = [
  'sad', 'dark', 'cold', 'pain', 'alone', 'lonely', 'tears', 'cry', 'hurt', 'sorrow',
  'grief', 'pain', 'suffer', 'empty', 'lost', 'broken', 'fade', 'die', 'death', 'night',
  'shadow', 'rain', 'storm', 'wind', 'silent', 'silence', 'ghost', 'haunt', 'fear',
  'afraid', 'tired', 'weary', 'wounded', 'scar', 'bleed', 'ashes', 'dust', 'void',
  'chaos', 'misery', 'despair', 'hopeless', 'abandon', 'betray', 'regret', 'guilt'
];

export const STOP_WORDS = [
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has',
  'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
  'can', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us',
  'them', 'my', 'your', 'his', 'its', 'our', 'their', 'this', 'that', 'these',
  'those', 'what', 'which', 'who', 'whom', 'where', 'when', 'why', 'how', 'all',
  'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
  'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'now',
  'as', 'if', 'then', 'up', 'down', 'out', 'about', 'into', 'through', 'during',
  'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further',
  'any', 'because', 'while', 'over', 'also'
];

export const EXAMPLE_TEXTS: ExampleText[] = [
  {
    text: "Here comes the sun, here comes the sun\nAnd I say it's all right\nLittle darling, it's been a long cold lonely winter\nLittle darling, it feels like years since it's been here\nSunshine, sunshine, it's all right",
    label: '欢快 Joyful'
  },
  {
    text: "Hello darkness, my old friend\nI've come to talk with you again\nBecause a vision softly creeping\nLeft its seeds while I was sleeping\nAnd the vision that was planted in my brain\nStill remains\nWithin the sound of silence",
    label: '忧伤 Melancholy'
  },
  {
    text: "We will rock you, we will rock you\nBuddy, you're a boy, make a big noise\nPlaying in the street, gonna be a big man someday\nYou got mud on your face, you big disgrace\nKicking your can all over the place\nWe will, we will rock you!",
    label: '激昂 Passionate'
  }
];

export const COLOR_PALETTE = [
  '#ff9f43', '#ff6b6b', '#ffd93d', '#0abde3', '#6c5ce7',
  '#00b894', '#fd79a8', '#a29bfe', '#81ecec', '#ffeaa7'
];
