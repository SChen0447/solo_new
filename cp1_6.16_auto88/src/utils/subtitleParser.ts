export interface SubtitleItem {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  translation?: string;
  isTranslated?: boolean;
}

export type ExportFormat = 'SRT' | 'ASS';

const pad = (num: number, len: number = 2): string => String(Math.floor(num)).padStart(len, '0');

export const formatTimeSRT = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds - Math.floor(seconds)) * 1000);
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)},${pad(ms, 3)}`;
};

export const formatTimeASS = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const cs = Math.floor((seconds - Math.floor(seconds)) * 100);
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}.${pad(cs, 2)}`;
};

export const formatTimeDisplay = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds - Math.floor(seconds)) * 1000);
  if (hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}.${pad(ms, 3)}`;
  }
  return `${pad(mins)}:${pad(secs)}.${pad(ms, 3)}`;
};

export const parseSRT = (content: string): SubtitleItem[] => {
  const subtitles: SubtitleItem[] = [];
  const blocks = content.trim().split(/\n\n+/);
  
  blocks.forEach((block, index) => {
    const lines = block.split('\n');
    if (lines.length >= 3) {
      const timeMatch = lines[1].match(/(\d+):(\d+):(\d+)[,.](\d+)\s*-->\s*(\d+):(\d+):(\d+)[,.](\d+)/);
      if (timeMatch) {
        const startTime = 
          parseInt(timeMatch[1]) * 3600 +
          parseInt(timeMatch[2]) * 60 +
          parseInt(timeMatch[3]) +
          parseInt(timeMatch[4]) / 1000;
        const endTime = 
          parseInt(timeMatch[5]) * 3600 +
          parseInt(timeMatch[6]) * 60 +
          parseInt(timeMatch[7]) +
          parseInt(timeMatch[8]) / 1000;
        const text = lines.slice(2).join('\n');
        subtitles.push({
          id: `sub-${index}-${Date.now()}`,
          startTime,
          endTime,
          text
        });
      }
    }
  });
  
  return subtitles;
};

export const exportToSRT = (subtitles: SubtitleItem[], useTranslation: boolean = false): string => {
  return subtitles
    .map((sub, index) => {
      const text = useTranslation && sub.translation ? sub.translation : sub.text;
      return `${index + 1}\n${formatTimeSRT(sub.startTime)} --> ${formatTimeSRT(sub.endTime)}\n${text}\n`;
    })
    .join('\n');
};

export const exportToASS = (subtitles: SubtitleItem[], useTranslation: boolean = false): string => {
  const header = `[Script Info]
Title: Subtitle Export
ScriptType: v4.00+
WrapStyle: 0
PlayResX: 384
PlayResY: 288
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,16,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,2,2,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const events = subtitles
    .map((sub) => {
      const text = useTranslation && sub.translation ? sub.translation : sub.text;
      const dialogueText = text.replace(/\n/g, '\\N');
      return `Dialogue: 0,${formatTimeASS(sub.startTime)},${formatTimeASS(sub.endTime)},Default,,0,0,0,,${dialogueText}`;
    })
    .join('\n');

  return header + events;
};

export const translateText = async (text: string, direction: 'zh2en' | 'en2zh' = 'zh2en'): Promise<string> => {
  await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
  
  if (direction === 'zh2en') {
    const zhChars = text.match(/[\u4e00-\u9fa5]/g);
    if (zhChars && zhChars.length > text.length / 2) {
      const mockTranslations: Record<string, string> = {
        '你好': 'Hello',
        '世界': 'world',
        '今天': 'today',
        '明天': 'tomorrow',
        '我们': 'we',
        '你们': 'you',
        '他们': 'they',
        '谢谢': 'thank you',
        '对不起': 'sorry',
        '再见': 'goodbye',
        '喜欢': 'like',
        '爱': 'love',
        '生活': 'life',
        '工作': 'work',
        '学习': 'study',
        '时间': 'time',
        '朋友': 'friend',
        '家人': 'family',
        '快乐': 'happy',
        '好的': 'okay',
        '是的': 'yes',
        '不是': 'no'
      };
      
      let result = text;
      for (const [key, value] of Object.entries(mockTranslations)) {
        result = result.split(key).join(value);
      }
      
      if (result === text) {
        result = `[EN] ${text}`;
      }
      return result;
    }
    return text;
  } else {
    const enWords = text.match(/[a-zA-Z]+/g);
    if (enWords && enWords.length > 0) {
      const mockTranslations: Record<string, string> = {
        'hello': '你好',
        'world': '世界',
        'today': '今天',
        'tomorrow': '明天',
        'we': '我们',
        'you': '你/你们',
        'they': '他们',
        'thank': '谢谢',
        'sorry': '对不起',
        'goodbye': '再见',
        'like': '喜欢',
        'love': '爱',
        'life': '生活',
        'work': '工作',
        'study': '学习',
        'time': '时间',
        'friend': '朋友',
        'family': '家人',
        'happy': '快乐',
        'okay': '好的',
        'yes': '是的',
        'no': '不是',
        'the': '',
        'a': '一个',
        'is': '是',
        'are': '是',
        'and': '和',
        'in': '在',
        'on': '在',
        'at': '在'
      };
      
      let result = text;
      for (const [key, value] of Object.entries(mockTranslations)) {
        const regex = new RegExp(`\\b${key}\\b`, 'gi');
        result = result.replace(regex, value);
      }
      
      if (result === text) {
        result = `[中] ${text}`;
      }
      return result;
    }
    return text;
  }
};

export const detectLanguageDirection = (text: string): 'zh2en' | 'en2zh' => {
  const zhChars = text.match(/[\u4e00-\u9fa5]/g) || [];
  const enChars = text.match(/[a-zA-Z]/g) || [];
  return zhChars.length >= enChars.length ? 'zh2en' : 'en2zh';
};

export const createSubtitleId = (): string => {
  return `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const roundToTenth = (num: number): number => {
  return Math.round(num * 10) / 10;
};
