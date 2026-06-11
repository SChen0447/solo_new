import type { UIScheme, DiffPoint, DiffStats, ComparisonResult, DiffType } from '../types'

interface ParsedDOM {
  tagName: string
  attributes: Record<string, string>
  styles: Record<string, string>
  textContent: string
  children: ParsedDOM[]
  path: string
  className?: string
  id?: string
}

const generateId = (): string =>
  Math.random().toString(36).substring(2, 10) + Date.now().toString(36)

const parseStyles = (styleStr: string): Record<string, string> => {
  const styles: Record<string, string> = {}
  if (!styleStr) return styles
  styleStr.split(';').forEach((rule) => {
    const [key, value] = rule.split(':').map((s) => s.trim())
    if (key && value) {
      styles[key.toLowerCase()] = value
    }
  })
  return styles
}

const parseHTMLToDOM = (htmlContent: string): ParsedDOM | null => {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(htmlContent, 'text/html')
    const body = doc.body
    if (!body) return null
    return parseElement(body, 'body', 0)
  } catch {
    return null
  }
}

const parseElement = (
  el: Element,
  parentPath: string,
  index: number
): ParsedDOM => {
  const tagName = el.tagName.toLowerCase()
  const path = `${parentPath} > ${tagName}:nth-child(${index + 1})`

  const attributes: Record<string, string> = {}
  Array.from(el.attributes).forEach((attr) => {
    attributes[attr.name] = attr.value
  })

  const styles = parseStyles(attributes.style || '')

  let textContent = ''
  const childNodes = Array.from(el.childNodes)
  for (const node of childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      textContent += (node.textContent || '').trim()
    }
  }

  const children: ParsedDOM[] = []
  const childElements = Array.from(el.children)
  childElements.forEach((child, i) => {
    children.push(parseElement(child, path, i))
  })

  return {
    tagName,
    attributes,
    styles,
    textContent,
    children,
    path,
    className: attributes.class,
    id: attributes.id
  }
}

const getComponentName = (node: ParsedDOM): string => {
  if (node.className) {
    const firstClass = node.className.split(' ')[0]
    if (firstClass) {
      return `.${firstClass}`
    }
  }
  if (node.id) return `#${node.id}`
  return `<${node.tagName}>`
}

const compareObjects = (
  a: Record<string, string>,
  b: Record<string, string>
): { added: string[]; removed: string[]; changed: string[] } => {
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)
  const added: string[] = []
  const removed: string[] = []
  const changed: string[] = []

  keysB.forEach((key) => {
    if (!(key in a)) added.push(key)
    else if (a[key] !== b[key]) changed.push(key)
  })
  keysA.forEach((key) => {
    if (!(key in b)) removed.push(key)
  })

  return { added, removed, changed }
}

const collectStyleRules = (htmlContent: string): Record<string, Record<string, string>> => {
  const parser = new DOMParser()
  const doc = parser.parseFromString(htmlContent, 'text/html')
  const styleMap: Record<string, Record<string, string>> = {}
  const styleEls = doc.querySelectorAll('style')

  styleEls.forEach((styleEl) => {
    const cssText = styleEl.textContent || ''
    const ruleRegex = /([^{]+)\s*\{([^}]+)\}/g
    let match
    while ((match = ruleRegex.exec(cssText)) !== null) {
      const selector = match[1].trim()
      const declarations = match[2]
      if (selector.startsWith('.')) {
        const className = selector.substring(1).split(/[:\s,.]/)[0]
        if (className) {
          styleMap[className] = {
            ...styleMap[className],
            ...parseStyles(declarations)
          }
        }
      }
    }
  })

  return styleMap
}

const mergeStyles = (
  inlineStyles: Record<string, string>,
  className: string | undefined,
  classStyleMap: Record<string, Record<string, string>>
): Record<string, string> => {
  const merged: Record<string, string> = {}

  if (className) {
    className.split(' ').forEach((cls) => {
      if (classStyleMap[cls]) {
        Object.assign(merged, classStyleMap[cls])
      }
    })
  }

  Object.assign(merged, inlineStyles)
  return merged
}

const traverseAndCompare = (
  nodeA: ParsedDOM | null,
  nodeB: ParsedDOM | null,
  styleMapA: Record<string, Record<string, string>>,
  styleMapB: Record<string, Record<string, string>>,
  results: DiffPoint[]
): void => {
  if (!nodeA && !nodeB) return

  if (!nodeA && nodeB) {
    results.push({
      id: generateId(),
      componentName: getComponentName(nodeB),
      type: 'structure',
      path: nodeB.path,
      description: '方案B中新增元素',
      selectorB: nodeB.path
    })
    if (nodeB.children) {
      nodeB.children.forEach((child) => {
        traverseAndCompare(null, child, styleMapA, styleMapB, results)
      })
    }
    return
  }

  if (nodeA && !nodeB) {
    results.push({
      id: generateId(),
      componentName: getComponentName(nodeA),
      type: 'structure',
      path: nodeA.path,
      description: '方案A中存在但方案B中缺失的元素',
      selectorA: nodeA.path
    })
    if (nodeA.children) {
      nodeA.children.forEach((child) => {
        traverseAndCompare(child, null, styleMapA, styleMapB, results)
      })
    }
    return
  }

  if (!nodeA || !nodeB) return

  if (nodeA.tagName !== nodeB.tagName) {
    results.push({
      id: generateId(),
      componentName: `${getComponentName(nodeA)} → ${getComponentName(nodeB)}`,
      type: 'structure',
      path: nodeA.path,
      description: `标签不同: <${nodeA.tagName}> vs <${nodeB.tagName}>`,
      selectorA: nodeA.path,
      selectorB: nodeB.path
    })
  }

  const attrsCompare = compareObjects(nodeA.attributes, nodeB.attributes)
  if (
    attrsCompare.added.length > 0 ||
    attrsCompare.removed.length > 0 ||
    attrsCompare.changed.length > 0
  ) {
    const details: string[] = []
    if (attrsCompare.added.length)
      details.push(`新增属性: ${attrsCompare.added.join(', ')}`)
    if (attrsCompare.removed.length)
      details.push(`删除属性: ${attrsCompare.removed.join(', ')}`)
    if (attrsCompare.changed.length)
      details.push(`修改属性: ${attrsCompare.changed.join(', ')}`)

    results.push({
      id: generateId(),
      componentName: getComponentName(nodeA),
      type: 'structure',
      path: nodeA.path,
      description: `HTML属性差异 - ${details.join('; ')}`,
      selectorA: nodeA.path,
      selectorB: nodeB.path
    })
  }

  const stylesA = mergeStyles(nodeA.styles, nodeA.className, styleMapA)
  const stylesB = mergeStyles(nodeB.styles, nodeB.className, styleMapB)
  const stylesCompare = compareObjects(stylesA, stylesB)

  const importantStyleProps = new Set([
    'background',
    'background-color',
    'background-image',
    'color',
    'font-size',
    'font-weight',
    'font-family',
    'padding',
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
    'margin',
    'margin-top',
    'margin-right',
    'margin-bottom',
    'margin-left',
    'border',
    'border-radius',
    'box-shadow',
    'display',
    'flex-direction',
    'justify-content',
    'align-items',
    'grid-template-columns',
    'gap',
    'width',
    'height',
    'position',
    'top',
    'left',
    'opacity',
    'transform',
    'transition',
    'z-index'
  ])

  const styleChangedImportant = stylesCompare.changed.filter((s) =>
    importantStyleProps.has(s.toLowerCase())
  )
  const styleAddedImportant = stylesCompare.added.filter((s) =>
    importantStyleProps.has(s.toLowerCase())
  )
  const styleRemovedImportant = stylesCompare.removed.filter((s) =>
    importantStyleProps.has(s.toLowerCase())
  )

  if (
    styleAddedImportant.length > 0 ||
    styleRemovedImportant.length > 0 ||
    styleChangedImportant.length > 0
  ) {
    const styleDetails: string[] = []
    if (styleAddedImportant.length)
      styleDetails.push(`新增样式: ${styleAddedImportant.slice(0, 3).join(', ')}`)
    if (styleRemovedImportant.length)
      styleDetails.push(`删除样式: ${styleRemovedImportant.slice(0, 3).join(', ')}`)
    if (styleChangedImportant.length)
      styleDetails.push(`修改样式: ${styleChangedImportant.slice(0, 3).join(', ')}`)

    results.push({
      id: generateId(),
      componentName: getComponentName(nodeA),
      type: 'style',
      path: nodeA.path,
      description: `样式差异 - ${styleDetails.join('; ')}`,
      selectorA: nodeA.path,
      selectorB: nodeB.path
    })
  }

  const textA = nodeA.textContent.trim()
  const textB = nodeB.textContent.trim()
  if (
    textA &&
    textB &&
    textA !== textB &&
    nodeA.children.length === 0 &&
    nodeB.children.length === 0
  ) {
    results.push({
      id: generateId(),
      componentName: getComponentName(nodeA),
      type: 'content',
      path: nodeA.path,
      description: `文本内容不同: "${textA.substring(0, 30)}${textA.length > 30 ? '...' : ''}" vs "${textB.substring(0, 30)}${textB.length > 30 ? '...' : ''}"`,
      selectorA: nodeA.path,
      selectorB: nodeB.path
    })
  }

  const maxChildren = Math.max(nodeA.children.length, nodeB.children.length)
  for (let i = 0; i < maxChildren; i++) {
    traverseAndCompare(
      nodeA.children[i] || null,
      nodeB.children[i] || null,
      styleMapA,
      styleMapB,
      results
    )
  }
}

const calculateStats = (points: DiffPoint[]): DiffStats => {
  const stats: DiffStats = {
    total: points.length,
    structure: 0,
    style: 0,
    content: 0,
    byComponent: {}
  }

  points.forEach((p) => {
    stats[p.type]++
    stats.byComponent[p.componentName] = (stats.byComponent[p.componentName] || 0) + 1
  })

  return stats
}

export const compareSchemes = (
  schemeA: UIScheme,
  schemeB: UIScheme
): Promise<ComparisonResult> => {
  return new Promise((resolve) => {
    const startTime = performance.now()

    requestAnimationFrame(() => {
      try {
        const styleMapA = collectStyleRules(schemeA.content)
        const styleMapB = collectStyleRules(schemeB.content)

        const domA = parseHTMLToDOM(schemeA.content)
        const domB = parseHTMLToDOM(schemeB.content)

        const diffPoints: DiffPoint[] = []
        traverseAndCompare(domA, domB, styleMapA, styleMapB, diffPoints)

        const uniquePoints = Array.from(
          new Map(diffPoints.map((p) => [p.path + p.type, p])).values()
        )

        const result: ComparisonResult = {
          points: uniquePoints.slice(0, 200),
          stats: calculateStats(uniquePoints),
          duration: performance.now() - startTime
        }

        resolve(result)
      } catch (error) {
        console.error('Comparison error:', error)
        resolve({
          points: [],
          stats: { total: 0, structure: 0, style: 0, content: 0, byComponent: {} },
          duration: performance.now() - startTime
        })
      }
    })
  })
}

export const getDiffTypeLabel = (type: DiffType): string => {
  const labels: Record<DiffType, string> = {
    structure: '结构',
    style: '样式',
    content: '内容'
  }
  return labels[type]
}

export const getDiffTypeColor = (type: DiffType): string => {
  const colors: Record<DiffType, string> = {
    structure: '#ff6b6b',
    style: '#feca57',
    content: '#48dbfb'
  }
  return colors[type]
}
