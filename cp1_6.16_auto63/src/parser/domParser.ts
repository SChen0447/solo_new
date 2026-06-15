import type { DomNode, BoxModel } from './types'

const KEY_STYLE_PROPERTIES = [
  'font-size',
  'display',
  'position',
  'z-index',
  'width',
  'height',
  'margin',
  'padding',
  'border',
  'box-sizing',
  'float',
  'clear',
  'overflow',
  'flex-direction',
  'justify-content',
  'align-items',
  'grid-template-columns',
  'transform',
  'transition',
  'animation',
]

let nodeIdCounter = 0

function generateNodeId(): string {
  return `node-${++nodeIdCounter}`
}

function resetNodeIdCounter(): void {
  nodeIdCounter = 0
}

function parseBoxModel(element: HTMLElement, computedStyle: CSSStyleDeclaration): BoxModel {
  const getPxValue = (value: string): number => {
    const match = value.match(/^([\d.]+)px$/)
    return match ? parseFloat(match[1]) : 0
  }

  return {
    content: {
      width: element.clientWidth
        - getPxValue(computedStyle.paddingLeft)
        - getPxValue(computedStyle.paddingRight),
      height: element.clientHeight
        - getPxValue(computedStyle.paddingTop)
        - getPxValue(computedStyle.paddingBottom),
    },
    padding: {
      top: getPxValue(computedStyle.paddingTop),
      right: getPxValue(computedStyle.paddingRight),
      bottom: getPxValue(computedStyle.paddingBottom),
      left: getPxValue(computedStyle.paddingLeft),
    },
    border: {
      top: getPxValue(computedStyle.borderTopWidth),
      right: getPxValue(computedStyle.borderRightWidth),
      bottom: getPxValue(computedStyle.borderBottomWidth),
      left: getPxValue(computedStyle.borderLeftWidth),
    },
    margin: {
      top: getPxValue(computedStyle.marginTop),
      right: getPxValue(computedStyle.marginRight),
      bottom: getPxValue(computedStyle.marginBottom),
      left: getPxValue(computedStyle.marginLeft),
    },
  }
}

function extractComputedStyles(computedStyle: CSSStyleDeclaration): Record<string, string> {
  const styles: Record<string, string> = {}
  for (const prop of KEY_STYLE_PROPERTIES) {
    const value = computedStyle.getPropertyValue(prop)
    if (value) {
      styles[prop] = value.trim()
    }
  }
  return styles
}

function hasStackingContext(element: HTMLElement, computedStyle: CSSStyleDeclaration): boolean {
  const position = computedStyle.position
  const zIndex = computedStyle.zIndex
  const opacity = parseFloat(computedStyle.opacity)
  const transform = computedStyle.transform
  const filter = computedStyle.filter
  const mixBlendMode = computedStyle.mixBlendMode
  const isolation = computedStyle.isolation

  if (position !== 'static' && zIndex !== 'auto') return true
  if (opacity < 1) return true
  if (transform !== 'none') return true
  if (filter !== 'none') return true
  if (mixBlendMode !== 'normal') return true
  if (isolation === 'isolate') return true
  if (element instanceof HTMLCanvasElement) return true
  if (element.webkitMatchesSelector?.(':-webkit-full-screen') ?? false) return true

  return false
}

function isInteractiveElement(element: HTMLElement): boolean {
  const tag = element.tagName.toLowerCase()
  const interactiveTags = ['a', 'button', 'input', 'select', 'textarea', 'label', 'summary']
  if (interactiveTags.includes(tag)) return true

  const role = element.getAttribute('role')
  const interactiveRoles = ['button', 'link', 'checkbox', 'radio', 'menuitem', 'tab', 'switch']
  if (role && interactiveRoles.includes(role)) return true

  const tabIndex = element.getAttribute('tabindex')
  if (tabIndex !== null && parseInt(tabIndex) >= 0) return true

  const style = window.getComputedStyle(element)
  if (style.cursor === 'pointer') return true

  return false
}

function getElementXPath(element: HTMLElement): string {
  if (element.id) {
    return `//*[@id="${element.id}"]`
  }

  const parts: string[] = []
  let current: HTMLElement | null = element

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let index = 1
    let sibling: HTMLElement | null = current.previousElementSibling as HTMLElement | null

    while (sibling) {
      if (sibling.nodeName === current.nodeName) {
        index++
      }
      sibling = sibling.previousElementSibling as HTMLElement | null
    }

    const tagName = current.nodeName.toLowerCase()
    parts.unshift(`${tagName}[${index}]`)
    current = current.parentElement
  }

  return '/' + parts.join('/')
}

function parseElement(element: HTMLElement, parentId?: string, depth: number = 0): DomNode {
  const computedStyle = window.getComputedStyle(element)
  const id = generateNodeId()
  const className = element.className
    ? (typeof element.className === 'string' ? element.className : element.className.baseVal)
    : undefined

  const rect = element.getBoundingClientRect()
  const offsetParent = element.offsetParent as HTMLElement | null
  const offsetLeft = offsetParent ? element.offsetLeft : rect.left
  const offsetTop = offsetParent ? element.offsetTop : rect.top

  const children: DomNode[] = []
  for (let i = 0; i < element.children.length; i++) {
    const child = element.children[i] as HTMLElement
    if (child.nodeType === Node.ELEMENT_NODE) {
      children.push(parseElement(child, id, depth + 1))
    }
  }

  const zIndexValue = computedStyle.zIndex
  const zIndex = zIndexValue !== 'auto' ? parseInt(zIndexValue) : undefined

  return {
    id,
    tagName: element.tagName.toLowerCase(),
    className: className || undefined,
    children,
    parentId,
    depth,
    width: element.offsetWidth,
    height: element.offsetHeight,
    offsetLeft,
    offsetTop,
    scrollTop: element.scrollTop,
    scrollLeft: element.scrollLeft,
    boxModel: parseBoxModel(element, computedStyle),
    computedStyles: extractComputedStyles(computedStyle),
    zIndex,
    hasStackingContext: hasStackingContext(element, computedStyle),
    isInteractive: isInteractiveElement(element),
    xpath: getElementXPath(element),
  }
}

export function parseDOM(rootElement: HTMLElement | Document): DomNode[] {
  resetNodeIdCounter()

  const root = rootElement instanceof Document
    ? rootElement.body || rootElement.documentElement
    : rootElement

  if (!root) {
    return []
  }

  const result: DomNode[] = []

  for (let i = 0; i < root.children.length; i++) {
    const child = root.children[i] as HTMLElement
    if (child.nodeType === Node.ELEMENT_NODE) {
      result.push(parseElement(child, undefined, 0))
    }
  }

  return result
}

export function getComputedStyles(element: HTMLElement): Record<string, string> {
  const computedStyle = window.getComputedStyle(element)
  return extractComputedStyles(computedStyle)
}

export function findNodeById(nodes: DomNode[], id: string): DomNode | null {
  for (const node of nodes) {
    if (node.id === id) return node
    if (node.children.length > 0) {
      const found = findNodeById(node.children, id)
      if (found) return found
    }
  }
  return null
}

export function flattenDomTree(nodes: DomNode[]): DomNode[] {
  const result: DomNode[] = []
  const traverse = (nodeList: DomNode[]) => {
    for (const node of nodeList) {
      result.push(node)
      if (node.children.length > 0) {
        traverse(node.children)
      }
    }
  }
  traverse(nodes)
  return result
}

export default {
  parseDOM,
  getComputedStyles,
  findNodeById,
  flattenDomTree,
}
