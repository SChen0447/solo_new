export type CardType = 'weather' | 'rss' | 'clock' | 'calendar' | 'chart'

export interface CardItem {
  id: string
  type: CardType
  instanceId: string
}

export interface WeatherConfig {
  city: string
}

export interface RssConfig {
  url: string
}

export interface ClockConfig {
  timezone: string
  showSeconds: boolean
}

export interface CalendarConfig {
  showHolidays: boolean
  firstDayOfWeek: number
}

export interface ChartConfig {
  title: string
  dataType: 'line' | 'bar' | 'pie'
}

export type CardConfig = WeatherConfig | RssConfig | ClockConfig | CalendarConfig | ChartConfig

export interface CardConfigMap {
  [instanceId: string]: CardConfig
}

export const CARD_TYPES: { type: CardType; label: string; icon: string }[] = [
  { type: 'weather', label: '天气卡片', icon: '☀️' },
  { type: 'rss', label: 'RSS新闻', icon: '📰' },
  { type: 'clock', label: '时钟卡片', icon: '⏰' },
  { type: 'calendar', label: '日历卡片', icon: '📅' },
  { type: 'chart', label: '统计图表', icon: '📊' }
]

export const DEFAULT_CONFIGS: Record<CardType, CardConfig> = {
  weather: { city: '北京' },
  rss: { url: 'https://rsshub.app/zhihu/hot' },
  clock: { timezone: 'Asia/Shanghai', showSeconds: true },
  calendar: { showHolidays: true, firstDayOfWeek: 1 },
  chart: { title: '数据统计', dataType: 'line' }
}
