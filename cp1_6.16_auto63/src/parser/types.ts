export interface BoxModel {
  content: { width: number; height: number }
  padding: { top: number; right: number; bottom: number; left: number }
  border: { top: number; right: number; bottom: number; left: number }
  margin: { top: number; right: number; bottom: number; left: number }
}

export interface DomNode {
  id: string
  tagName: string
  className?: string
  textContent?: string
  children: DomNode[]
  parentId?: string
  depth: number
  width: number
  height: number
  offsetLeft: number
  offsetTop: number
  scrollTop: number
  scrollLeft: number
  boxModel: BoxModel
  computedStyles: Record<string, string>
  zIndex?: number
  hasStackingContext: boolean
  isInteractive: boolean
  xpath?: string
}

export interface PerformanceData {
  elementId: string
  recalcStyleCount: number
  recalcStyleDuration: number
  layoutCount: number
  layoutDuration: number
  paintCount: number
  paintDuration: number
  totalDuration: number
}

export interface PerformanceSummary {
  totalLayouts: number
  totalLayoutDuration: number
  maxLayoutDuration: number
  totalRecalcStyles: number
  totalRecalcStyleDuration: number
  avgFps: number
  elements: Map<string, PerformanceData>
}

export type ImpactLevel = 'high' | 'medium' | 'low'

export interface OptimizationSuggestionItem {
  id: string
  elementId: string
  description: string
  impactLevel: ImpactLevel
  codeSnippet: string
  suggestion: string
  category: string
}

export interface ViewConfig {
  id: string
  name: string
  html: string
  css: string
  zoom: number
  scrollTop: number
  scrollLeft: number
  heatmapEnabled: boolean
  domTree?: DomNode[]
  performanceData?: PerformanceSummary
  suggestions?: OptimizationSuggestionItem[]
}

export interface AppState {
  views: ViewConfig[]
  activeViewId: string
  selectedNodeId: string | null
  highlightedNodeId: string | null
  leftPanelCollapsed: boolean
  rightPanelCollapsed: boolean
  syncViews: boolean
  globalZoom: number
}
