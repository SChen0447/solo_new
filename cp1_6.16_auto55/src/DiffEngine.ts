import { DiffResult, HighlightMap, CompareResult, DiffType } from './types';

function getXPath(element: Node, root: Node = element.ownerDocument?.documentElement || element): string {
  if (element === root) return '/';
  if (!element.parentNode) return '';

  const parts: string[] = [];
  let current: Node | null = element;

  while (current && current !== root) {
    if (current.nodeType === Node.ELEMENT_NODE) {
      const el = current as Element;
      const tagName = el.tagName.toLowerCase();
      let index = 1;
      let sibling = el.previousSibling;

      while (sibling) {
        if (sibling.nodeType === Node.ELEMENT_NODE && 
            (sibling as Element).tagName.toLowerCase() === tagName) {
          index++;
        }
        sibling = sibling.previousSibling;
      }

      parts.unshift(`${tagName}[${index}]`);
    } else if (current.nodeType === Node.TEXT_NODE) {
      let index = 1;
      let sibling = current.previousSibling;

      while (sibling) {
        if (sibling.nodeType === Node.TEXT_NODE) {
          index++;
        }
        sibling = sibling.previousSibling;
      }

      parts.unshift(`text()[${index}]`);
    }
    current = current.parentNode;
  }

  return '/' + parts.join('/');
}

function generateXPathToElementMap(root: Node): Map<string, Node> {
  const map = new Map<string, Node>();
  const xpathCache = new Map<Node, string>();

  function traverse(node: Node) {
    if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
      if (node.textContent && node.textContent.trim()) {
        const xpath = getXPath(node, root);
        xpathCache.set(node, xpath);
        map.set(xpath, node);
      }
    }

    let child = node.firstChild;
    while (child) {
      traverse(child);
      child = child.nextSibling;
    }
  }

  traverse(root);
  return map;
}

function nodesAreEqual(left: Node, right: Node): boolean {
  if (left.nodeType !== right.nodeType) return false;

  if (left.nodeType === Node.ELEMENT_NODE) {
    const leftEl = left as Element;
    const rightEl = right as Element;

    if (leftEl.tagName !== rightEl.tagName) return false;

    const leftAttrs = Array.from(leftEl.attributes).sort((a, b) => a.name.localeCompare(b.name));
    const rightAttrs = Array.from(rightEl.attributes).sort((a, b) => a.name.localeCompare(b.name));

    if (leftAttrs.length !== rightAttrs.length) return false;

    for (let i = 0; i < leftAttrs.length; i++) {
      if (leftAttrs[i].name !== rightAttrs[i].name || 
          leftAttrs[i].value !== rightAttrs[i].value) {
        return false;
      }
    }

    return true;
  }

  if (left.nodeType === Node.TEXT_NODE) {
    return (left.textContent || '').trim() === (right.textContent || '').trim();
  }

  return true;
}

function getElementAttributes(element: Element): string {
  const attrs = Array.from(element.attributes)
    .map(attr => `${attr.name}="${attr.value}"`)
    .join(' ');
  return attrs ? `(${attrs})` : '';
}

function compareAttributes(left: Element, right: Element): string[] {
  const differences: string[] = [];
  const leftAttrs = new Map(Array.from(left.attributes).map((a: Attr) => [a.name, a.value]));
  const rightAttrs = new Map(Array.from(right.attributes).map((a: Attr) => [a.name, a.value]));

  for (const [name, value] of leftAttrs) {
    if (!rightAttrs.has(name)) {
      differences.push(`属性 ${name} 仅在左侧存在（值: ${value}）`);
    } else if (rightAttrs.get(name) !== value) {
      differences.push(`属性 ${name} 不同：左侧="${value}"，右侧="${rightAttrs.get(name)}"`);
    }
  }

  for (const [name, value] of rightAttrs) {
    if (!leftAttrs.has(name)) {
      differences.push(`属性 ${name} 仅在右侧存在（值: ${value}）`);
    }
  }

  return differences;
}

export function compareAndHighlight(leftRoot: Node, rightRoot: Node): CompareResult {
  const diffs: DiffResult[] = [];
  const highlightMap: HighlightMap = {
    left: new Set<string>(),
    right: new Set<string>()
  };

  const leftMap = generateXPathToElementMap(leftRoot);
  const rightMap = generateXPathToElementMap(rightRoot);

  const allXPaths = new Set([...leftMap.keys(), ...rightMap.keys()]);

  for (const xpath of allXPaths) {
    const leftNode = leftMap.get(xpath);
    const rightNode = rightMap.get(xpath);

    if (leftNode && !rightNode) {
      const tagName = leftNode.nodeType === Node.ELEMENT_NODE 
        ? (leftNode as Element).tagName.toLowerCase() 
        : 'text';
      diffs.push({
        type: 'removed' as DiffType,
        leftXPath: xpath,
        rightXPath: '-',
        description: `节点已删除：<${tagName}>${getElementAttributes(leftNode as Element)}`
      });
      highlightMap.left.add(xpath);
    } else if (!leftNode && rightNode) {
      const tagName = rightNode.nodeType === Node.ELEMENT_NODE 
        ? (rightNode as Element).tagName.toLowerCase() 
        : 'text';
      diffs.push({
        type: 'added' as DiffType,
        leftXPath: '-',
        rightXPath: xpath,
        description: `节点已新增：<${tagName}>${getElementAttributes(rightNode as Element)}`
      });
      highlightMap.right.add(xpath);
    } else if (leftNode && rightNode) {
      if (!nodesAreEqual(leftNode, rightNode)) {
        const attrDiffs = leftNode.nodeType === Node.ELEMENT_NODE && rightNode.nodeType === Node.ELEMENT_NODE
          ? compareAttributes(leftNode as Element, rightNode as Element)
          : [];

        let description = '';
        if (leftNode.nodeType === Node.TEXT_NODE) {
          description = `文本内容不同：左侧="${(leftNode.textContent || '').trim().slice(0, 30)}..."，右侧="${(rightNode.textContent || '').trim().slice(0, 30)}..."`;
        } else if (attrDiffs.length > 0) {
          description = attrDiffs.join('；');
        } else {
          const leftTag = (leftNode as Element).tagName.toLowerCase();
          const rightTag = (rightNode as Element).tagName.toLowerCase();
          description = `节点类型不同：左侧为<${leftTag}>，右侧为<${rightTag}>`;
        }

        diffs.push({
          type: 'modified' as DiffType,
          leftXPath: xpath,
          rightXPath: xpath,
          description
        });
        highlightMap.left.add(xpath);
        highlightMap.right.add(xpath);
      }
    }
  }

  return { diffs, highlightMap };
}

export function applyHighlights(
  doc: Document,
  highlightMap: Set<string>
): void {
  const highlightStyleId = 'diff-highlight-styles';
  let style = doc.getElementById(highlightStyleId) as HTMLStyleElement;
  
  if (!style) {
    style = doc.createElement('style');
    style.id = highlightStyleId;
    style.textContent = `
      .diff-highlight {
        border: 2px dashed #FFD700 !important;
        box-shadow: 0 0 10px rgba(255, 215, 0, 0.5) !important;
      }
    `;
    doc.head.appendChild(style);
  }

  doc.querySelectorAll('.diff-highlight').forEach(el => {
    el.classList.remove('diff-highlight');
  });

  for (const xpath of highlightMap) {
    try {
      const result = doc.evaluate(
        xpath,
        doc.body || doc.documentElement,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
      );

      for (let i = 0; i < result.snapshotLength; i++) {
        const node = result.snapshotItem(i);
        if (node && node.nodeType === Node.ELEMENT_NODE) {
          (node as Element).classList.add('diff-highlight');
        }
      }
    } catch (e) {
      console.warn(`XPath evaluation failed for ${xpath}:`, e);
    }
  }
}

export function clearHighlights(doc: Document): void {
  const style = doc.getElementById('diff-highlight-styles');
  if (style) {
    style.remove();
  }
  doc.querySelectorAll('.diff-highlight').forEach(el => {
    el.classList.remove('diff-highlight');
  });
}
