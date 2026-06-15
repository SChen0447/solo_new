import type { DomNode, OptimizationSuggestionItem, PerformanceData } from './types'

function generateId(): string {
  return `suggestion-${Math.random().toString(36).substr(2, 9)}`
}

function checkAbsolutePositioning(
  node: DomNode,
  perfData?: PerformanceData
): OptimizationSuggestionItem | null {
  const position = node.computedStyles['position']
  const top = node.computedStyles['top']
  const left = node.computedStyles['left']

  if ((position === 'absolute' || position === 'fixed') && (top || left)) {
    const hasTransform = node.computedStyles['transform'] && node.computedStyles['transform'] !== 'none'
    if (!hasTransform) {
      return {
        id: generateId(),
        elementId: node.id,
        description: `元素 ${getNodeLabel(node)} 使用了 top/left 绝对定位，建议用 transform 替代以避免触发布局`,
        impactLevel: perfData && perfData.layoutDuration > 5 ? 'high' : 'medium',
        codeSnippet: `/* 不推荐 */
.element {
  position: absolute;
  top: 10px;
  left: 20px;
}

/* 推荐 */
.element {
  position: absolute;
  transform: translate(20px, 10px);
  will-change: transform;
}`,
        suggestion: '使用 transform: translate() 替代 top/left 定位，transform 属性不会触发布局重排，只会触发合成层更新，性能更好。',
        category: '定位',
      }
    }
  }

  return null
}

function checkBoxSizing(node: DomNode): OptimizationSuggestionItem | null {
  const boxSizing = node.computedStyles['box-sizing']
  const hasPadding =
    node.boxModel.padding.top > 0 ||
    node.boxModel.padding.right > 0 ||
    node.boxModel.padding.bottom > 0 ||
    node.boxModel.padding.left > 0
  const hasBorder =
    node.boxModel.border.top > 0 ||
    node.boxModel.border.right > 0 ||
    node.boxModel.border.bottom > 0 ||
    node.boxModel.border.left > 0

  if ((hasPadding || hasBorder) && boxSizing !== 'border-box') {
    return {
      id: generateId(),
      elementId: node.id,
      description: `元素 ${getNodeLabel(node)} 设置了 padding/border 但未使用 box-sizing: border-box，可能导致意外的布局偏移`,
      impactLevel: 'medium',
      codeSnippet: `/* 推荐 */
* {
  box-sizing: border-box;
}

/* 或针对特定元素 */
.element {
  box-sizing: border-box;
}`,
      suggestion: '添加 box-sizing: border-box 可让元素的宽高包含 padding 和 border，避免盒模型计算导致的布局偏移问题。',
      category: '盒模型',
    }
  }

  return null
}

function checkFloats(node: DomNode, perfData?: PerformanceData): OptimizationSuggestionItem | null {
  const float = node.computedStyles['float']
  if (float && float !== 'none') {
    return {
      id: generateId(),
      elementId: node.id,
      description: `元素 ${getNodeLabel(node)} 使用了 float 浮动布局，建议使用 Flexbox 或 Grid 替代`,
      impactLevel: perfData && perfData.layoutDuration > 3 ? 'high' : 'low',
      codeSnippet: `/* 不推荐 */
.item {
  float: left;
  margin-right: 10px;
}

/* 推荐 - Flexbox */
.container {
  display: flex;
  gap: 10px;
}`,
      suggestion: 'float 布局容易导致父元素高度塌陷和清除浮动等问题，使用 Flexbox 或 CSS Grid 可以更灵活、更高效地实现布局。',
      category: '布局方式',
    }
  }

  return null
}

function checkDeepNesting(
  node: DomNode,
  perfData?: PerformanceData
): OptimizationSuggestionItem | null {
  if (node.depth > 6 && node.children.length > 0) {
    return {
      id: generateId(),
      elementId: node.id,
      description: `元素 ${getNodeLabel(node)} 嵌套层级过深（${node.depth} 层），可能影响布局计算性能`,
      impactLevel: perfData && perfData.layoutDuration > 8 ? 'high' : 'medium',
      codeSnippet: `/* 减少不必要的包装元素 */
/* 不推荐 - 深层嵌套 */
<div class="wrapper">
  <div class="container">
    <div class="inner">
      <div class="content">
        <!-- 实际内容 -->
      </div>
    </div>
  </div>
</div>

/* 推荐 - 扁平结构 */
<div class="content-wrapper">
  <!-- 实际内容 -->
</div>`,
      suggestion: '过深的 DOM 嵌套会增加浏览器布局计算的复杂度，每次重排都需要遍历更多节点。建议减少不必要的包装元素，扁平化 DOM 结构。',
      category: 'DOM结构',
    }
  }

  return null
}

function checkInlineStyles(node: DomNode): OptimizationSuggestionItem | null {
  return null
}

function checkLargeDimensions(
  node: DomNode,
  perfData?: PerformanceData
): OptimizationSuggestionItem | null {
  if (node.width > 800 && node.height > 600 && node.children.length > 20) {
    return {
      id: generateId(),
      elementId: node.id,
      description: `元素 ${getNodeLabel(node)} 尺寸较大且子元素较多，建议考虑使用虚拟滚动或内容分片加载`,
      impactLevel: perfData && perfData.totalDuration > 10 ? 'high' : 'medium',
      codeSnippet: `/* 虚拟滚动示例 */
.list-container {
  overflow-y: auto;
  contain: strict;
  will-change: scroll-position;
}`,
      suggestion: '大尺寸容器配合大量子元素会显著增加布局计算量。对于长列表，建议使用虚拟滚动（Virtual Scrolling）只渲染可视区域内的内容。',
      category: '性能优化',
    }
  }

  return null
}

function checkTableLayout(node: DomNode): OptimizationSuggestionItem | null {
  if (node.tagName === 'table') {
    const tableLayout = node.computedStyles['table-layout']
    if (!tableLayout || tableLayout === 'auto') {
      return {
        id: generateId(),
        elementId: node.id,
        description: `表格元素 ${getNodeLabel(node)} 使用自动布局算法，建议设置 table-layout: fixed 提升性能`,
        impactLevel: 'medium',
        codeSnippet: `/* 推荐 */
table {
  table-layout: fixed;
  width: 100%;
}

th, td {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}`,
        suggestion: 'table-layout: auto 需要多次遍历计算列宽，性能较差。设置 table-layout: fixed 可以让浏览器一次性计算表格布局，渲染速度更快。',
        category: '表格布局',
      }
    }
  }

  return null
}

function checkWillChange(node: DomNode, perfData?: PerformanceData): OptimizationSuggestionItem | null {
  const hasAnimation =
    node.computedStyles['animation'] && node.computedStyles['animation'] !== 'none'
  const hasTransition =
    node.computedStyles['transition'] && node.computedStyles['transition'] !== 'all 0s ease 0s'

  if ((hasAnimation || hasTransition) && perfData && perfData.totalDuration > 5) {
    const hasWillChange =
      node.computedStyles['will-change'] && node.computedStyles['will-change'] !== 'auto'

    if (!hasWillChange) {
      return {
        id: generateId(),
        elementId: node.id,
        description: `元素 ${getNodeLabel(node)} 有动画/过渡但未设置 will-change，建议添加以提升动画性能`,
        impactLevel: 'low',
        codeSnippet: `/* 推荐 */
.animated-element {
  will-change: transform, opacity;
}`,
        suggestion: 'will-change 属性可以提前告知浏览器哪些属性会变化，让浏览器预先做好优化准备。但不要过度使用，只给真正需要的元素添加。',
        category: '动画性能',
      }
    }
  }

  return null
}

function checkZIndexStacking(node: DomNode): OptimizationSuggestionItem | null {
  if (node.hasStackingContext && node.zIndex !== undefined) {
    const isDirectChildOfBody = node.parentId === undefined || node.depth === 0
    if (!isDirectChildOfBody && Math.abs(node.zIndex) > 100) {
      return {
        id: generateId(),
        elementId: node.id,
        description: `元素 ${getNodeLabel(node)} 的 z-index 值过大（${node.zIndex}），可能导致层叠上下文管理混乱`,
        impactLevel: 'low',
        codeSnippet: `/* 推荐使用层级变量管理 */
:root {
  --z-dropdown: 100;
  --z-modal: 200;
  --z-tooltip: 300;
  --z-notification: 400;
}

.element {
  z-index: var(--z-modal);
}`,
        suggestion: '过大的 z-index 值通常意味着层叠上下文管理不善。建议使用 CSS 变量统一管理 z-index 层级，避免 z-index 竞争和失控。',
        category: '层叠上下文',
      }
    }
  }

  return null
}

function getNodeLabel(node: DomNode): string {
  let label = node.tagName
  if (node.className) {
    label += `.${node.className.split(' ')[0]}`
  }
  return label
}

export function generateOptimizationSuggestions(
  domTree: DomNode[],
  performanceMap?: Map<string, PerformanceData>
): OptimizationSuggestionItem[] {
  const suggestions: OptimizationSuggestionItem[] = []
  const processedIds = new Set<string>()

  const traverse = (nodes: DomNode[]) => {
    for (const node of nodes) {
      if (processedIds.has(node.id)) continue
      processedIds.add(node.id)

      const perfData = performanceMap
        ? findPerfDataForNode(node, performanceMap)
        : undefined

      const checks = [
        checkAbsolutePositioning(node, perfData),
        checkBoxSizing(node),
        checkFloats(node, perfData),
        checkDeepNesting(node, perfData),
        checkInlineStyles(node),
        checkLargeDimensions(node, perfData),
        checkTableLayout(node),
        checkWillChange(node, perfData),
        checkZIndexStacking(node),
      ]

      for (const suggestion of checks) {
        if (suggestion) {
          suggestions.push(suggestion)
        }
      }

      if (node.children.length > 0) {
        traverse(node.children)
      }
    }
  }

  traverse(domTree)

  const impactOrder = { high: 0, medium: 1, low: 2 }
  suggestions.sort((a, b) => impactOrder[a.impactLevel] - impactOrder[b.impactLevel])

  return suggestions
}

function findPerfDataForNode(
  node: DomNode,
  perfMap: Map<string, PerformanceData>
): PerformanceData | undefined {
  const selector = buildSelector(node)
  return perfMap.get(selector)
}

function buildSelector(node: DomNode): string {
  let selector = node.tagName
  if (node.className) {
    selector += '.' + node.className.split(' ').join('.')
  }
  return selector
}

export default generateOptimizationSuggestions
