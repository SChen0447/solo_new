export type BlockType = 'text' | 'code' | 'image';

export interface ExtractBlock {
  id: string;
  type: BlockType;
  content: string;
  metadata?: {
    language?: string;
    alt?: string;
    src?: string;
    tagName?: string;
  };
  layout?: {
    heightRatio?: number;
    widthRatio?: number;
  };
}

export interface FlyAnimationData {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

function generateId(): string {
  return `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function detectLanguage(code: string): string {
  const patterns: Record<string, RegExp[]> = {
    javascript: [/function\s+\w+\s*\(/, /const\s+\w+\s*=/, /=>\s*\{/],
    typescript: [/:s*\w+(\[\])?\s*=/, /interface\s+\w+/, /type\s+\w+\s*=/],
    python: [/def\s+\w+\s*\(/, /:\s*$/, /import\s+\w+/],
    html: [/<\w+[\s>]/, /<\/\w+>/, /<!DOCTYPE/],
    css: [/\{[\s\S]*\}/, /:\s*[^;]+;/, /@\w+/]
  };

  let maxScore = 0;
  let detectedLang = 'text';

  for (const [lang, regexPatterns] of Object.entries(patterns)) {
    let score = 0;
    for (const pattern of regexPatterns) {
      if (pattern.test(code)) {
        score++;
      }
    }
    if (score > maxScore) {
      maxScore = score;
      detectedLang = lang;
    }
  }

  return detectedLang;
}

export function parseElement(element: HTMLElement): ExtractBlock | null {
  if (!element) return null;

  const tagName = element.tagName.toLowerCase();

  if (tagName === 'img') {
    const img = element as HTMLImageElement;
    return {
      id: generateId(),
      type: 'image',
      content: img.src,
      metadata: {
        src: img.src,
        alt: img.alt,
        tagName
      },
      layout: {
        heightRatio: 1,
        widthRatio: 1
      }
    };
  }

  if (tagName === 'pre') {
    const codeEl = element.querySelector('code') || element;
    const text = codeEl.textContent || '';
    const language = detectLanguage(text);

    return {
      id: generateId(),
      type: 'code',
      content: text.trim(),
      metadata: {
        language,
        tagName
      },
      layout: {
        heightRatio: 1.5,
        widthRatio: 1
      }
    };
  }

  const textContent = element.textContent?.trim();
  if (textContent && textContent.length > 0) {
    return {
      id: generateId(),
      type: 'text',
      content: textContent,
      metadata: {
        tagName
      },
      layout: {
        heightRatio: textContent.length > 200 ? 2 : 1,
        widthRatio: 1
      }
    };
  }

  return null;
}

export function parseContainer(container: HTMLElement): ExtractBlock[] {
  const blocks: ExtractBlock[] = [];

  if (!container) return blocks;

  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_ELEMENT,
    {
      acceptNode: function (node: Node): number {
        const el = node as HTMLElement;
        const tag = el.tagName.toLowerCase();

        if (tag === 'script' || tag === 'style' || tag === 'noscript') {
          return NodeFilter.FILTER_REJECT;
        }

        if (tag === 'pre' || tag === 'img') {
          return NodeFilter.FILTER_ACCEPT;
        }

        if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'div'].includes(tag)) {
          const text = el.textContent?.trim();
          if (text && text.length > 20) {
            return NodeFilter.FILTER_ACCEPT;
          }
        }

        return NodeFilter.FILTER_SKIP;
      }
    }
  );

  let currentNode: Node | null = walker.nextNode();
  while (currentNode) {
    const block = parseElement(currentNode as HTMLElement);
    if (block) {
      blocks.push(block);
    }
    currentNode = walker.nextNode();
  }

  return blocks;
}

export function getFlyAnimation(
  clickedElement: HTMLElement,
  targetContainer: HTMLElement
): FlyAnimationData {
  const clickedRect = clickedElement.getBoundingClientRect();
  const targetRect = targetContainer.getBoundingClientRect();

  return {
    startX: clickedRect.left + clickedRect.width / 2,
    startY: clickedRect.top + clickedRect.height / 2,
    endX: targetRect.left + targetRect.width / 2,
    endY: targetRect.top + 100
  };
}

export function highlightElement(element: HTMLElement): () => void {
  const originalOutline = element.style.outline;
  const originalOutlineOffset = element.style.outlineOffset;
  const originalTransition = element.style.transition;

  element.style.outline = '2px solid #ff6b35';
  element.style.outlineOffset = '2px';
  element.style.transition = 'all 0.2s ease';

  return function removeHighlight(): void {
    element.style.outline = originalOutline;
    element.style.outlineOffset = originalOutlineOffset;
    element.style.transition = originalTransition;
  };
}

export function addHoverHighlight(element: HTMLElement): { onEnter: () => void; onLeave: () => void } {
  let originalStyle: Partial<CSSStyleDeclaration> | null = null;

  const onEnter = () => {
    originalStyle = {
      outline: element.style.outline,
      outlineOffset: element.style.outlineOffset,
      backgroundColor: element.style.backgroundColor
    };
    element.style.outline = '2px dashed #ff6b35';
    element.style.outlineOffset = '2px';
    element.style.backgroundColor = 'rgba(255, 107, 53, 0.1)';
    element.style.transition = 'all 0.2s ease';
  };

  const onLeave = () => {
    if (originalStyle && originalStyle.outline !== undefined) {
      element.style.outline = originalStyle.outline;
      element.style.outlineOffset = originalStyle.outlineOffset;
      element.style.backgroundColor = originalStyle.backgroundColor;
    }
  };

  return { onEnter, onLeave };
}
