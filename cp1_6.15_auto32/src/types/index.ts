export type FilterType =
  | 'none'
  | 'watercolor'
  | 'sketch'
  | 'oil'
  | 'pop'
  | 'ink'
  | 'pixel'

export type FrameSeries = 'classical' | 'modern' | 'minimal'

export type FrameType =
  | 'none'
  | 'classical-1'
  | 'classical-2'
  | 'classical-3'
  | 'classical-4'
  | 'modern-1'
  | 'modern-2'
  | 'modern-3'
  | 'modern-4'
  | 'minimal-1'
  | 'minimal-2'
  | 'minimal-3'
  | 'minimal-4'

export type WatermarkPosition = 'tl' | 'tr' | 'bl' | 'br' | 'center'

export interface FilterMeta {
  id: FilterType
  name: string
  description: string
}

export interface FrameMeta {
  id: FrameType
  name: string
  series: FrameSeries
}

export const FILTER_LIST: FilterMeta[] = [
  { id: 'none', name: '原图', description: '不应用滤镜' },
  { id: 'watercolor', name: '水彩', description: '柔和的水彩画效果' },
  { id: 'sketch', name: '素描', description: '铅笔素描效果' },
  { id: 'oil', name: '油画', description: '厚重油画笔刷效果' },
  { id: 'pop', name: '波普艺术', description: '高对比波普风格' },
  { id: 'ink', name: '水墨', description: '东方水墨意境' },
  { id: 'pixel', name: '像素风', description: '复古像素艺术' },
]

export const FRAME_LIST: FrameMeta[] = [
  { id: 'classical-1', name: '欧式雕花', series: 'classical' },
  { id: 'classical-2', name: '田园藤蔓', series: 'classical' },
  { id: 'classical-3', name: '复古金边', series: 'classical' },
  { id: 'classical-4', name: '宫廷纹样', series: 'classical' },
  { id: 'modern-1', name: '极简白', series: 'modern' },
  { id: 'modern-2', name: '磨砂黑', series: 'modern' },
  { id: 'modern-3', name: '金属银', series: 'modern' },
  { id: 'modern-4', name: '木质纹', series: 'modern' },
  { id: 'minimal-1', name: '细线框', series: 'minimal' },
  { id: 'minimal-2', name: '圆角框', series: 'minimal' },
  { id: 'minimal-3', name: '双线框', series: 'minimal' },
  { id: 'minimal-4', name: '投影框', series: 'minimal' },
]

export const WATERMARK_POSITIONS: { id: WatermarkPosition
  name: string
}[] = [
  { id: 'tl', name: '左上角' },
  { id: 'tr', name: '右上角' },
  { id: 'bl', name: '左下角' },
  { id: 'br', name: '右下角' },
  { id: 'center', name: '居中' },
]

export const MAX_FILE_SIZE = 10 * 1024 * 1024
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const EXPORT_SIZE = 2048
export const MAX_WATERMARK_CHARS = 20
