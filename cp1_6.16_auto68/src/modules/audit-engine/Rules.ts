import type { AuditIssue, Severity, WcagLevel } from '@/types';

export interface RuleContext {
  tabId: string;
  domOrder: number;
  rootDocument: Document;
  idMap: Map<string, number>;
  headingLevels: number[];
}

export interface RuleResult {
  issues: Partial<AuditIssue>[];
}

export type RuleFunction = (node: Element, ctx: RuleContext) => RuleResult;

const generateId = () => Math.random().toString(36).substring(2, 11);

const createIssue = (
  partial: Partial<AuditIssue> & {
    type: string;
    description: string;
    selector: string;
    severity: Severity;
    wcagCriterion: string;
    wcagLevel: WcagLevel;
  },
  node: Element,
  ctx: RuleContext
): AuditIssue => ({
  id: generateId(),
  type: partial.type,
  description: partial.description,
  selector: partial.selector,
  severity: partial.severity,
  wcagCriterion: partial.wcagCriterion,
  wcagLevel: partial.wcagLevel,
  domOrder: ctx.domOrder,
  tagName: node.tagName.toLowerCase(),
  elementHTML: node.outerHTML.substring(0, 200),
  currentValue: partial.currentValue,
  tabId: ctx.tabId,
});

function getUniqueSelector(el: Element): string {
  if (el.id) return `#${CSS.escape(el.id)}`;
  
  const parts: string[] = [];
  let current: Element | null = el;
  
  while (current && current.nodeType === 1 && parts.length < 5) {
    let part = current.tagName.toLowerCase();
    
    if (current.id) {
      part += `#${CSS.escape(current.id)}`;
      parts.unshift(part);
      break;
    }
    
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (c) => c.tagName === current!.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        part += `:nth-of-type(${index})`;
      }
    }
    
    parts.unshift(part);
    current = current.parentElement;
  }
  
  return parts.join(' > ');
}

export const imageMissingAltRule: RuleFunction = (node, ctx) => {
  const issues: AuditIssue[] = [];
  if (node.tagName === 'IMG') {
    const alt = node.getAttribute('alt');
    const src = node.getAttribute('src') || '';
    const isDecorative = node.hasAttribute('role') && node.getAttribute('role') === 'presentation';
    
    if ((alt === null || alt.trim() === '') && !isDecorative && !src.includes('data:image')) {
      issues.push(
        createIssue(
          {
            type: 'IMAGE_MISSING_ALT',
            description: '图片缺少描述性alt属性，屏幕阅读器无法传达图像内容',
            selector: getUniqueSelector(node),
            severity: 'critical',
            wcagCriterion: '1.1.1',
            wcagLevel: 'A',
            currentValue: `alt="${alt === null ? '(未设置)' : alt}"`,
          },
          node,
          ctx
        )
      );
    }
  }
  return { issues };
};

export const formMissingLabelRule: RuleFunction = (node, ctx) => {
  const issues: AuditIssue[] = [];
  const formTags = ['INPUT', 'SELECT', 'TEXTAREA'];
  
  if (formTags.includes(node.tagName)) {
    const type = node.getAttribute('type');
    if (type === 'hidden' || type === 'submit' || type === 'button' || type === 'reset') {
      return { issues };
    }
    
    const id = node.getAttribute('id');
    const hasAriaLabel = node.hasAttribute('aria-label');
    const hasAriaLabelledby = node.hasAttribute('aria-labelledby');
    let hasLabel = false;
    
    if (id) {
      const label = ctx.rootDocument.querySelector(`label[for="${CSS.escape(id)}"]`);
      if (label) hasLabel = true;
    }
    
    if (!hasLabel) {
      let parent = node.parentElement;
      while (parent && parent.tagName !== 'FORM') {
        if (parent.tagName === 'LABEL') {
          hasLabel = true;
          break;
        }
        parent = parent.parentElement;
      }
    }
    
    if (!hasLabel && !hasAriaLabel && !hasAriaLabelledby) {
      issues.push(
        createIssue(
          {
            type: 'FORM_MISSING_LABEL',
            description: `${node.tagName.toLowerCase()}表单控件缺少关联的label标签或aria-label`,
            selector: getUniqueSelector(node),
            severity: 'critical',
            wcagCriterion: '3.3.2',
            wcagLevel: 'A',
            currentValue: `<${node.tagName.toLowerCase()}> 无label关联`,
          },
          node,
          ctx
        )
      );
    }
  }
  return { issues };
};

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = hex.replace('#', '').match(/^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!match) return null;
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
  };
}

function rgbToLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(color1: string, color2: string): number | null {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  if (!rgb1 || !rgb2) return null;
  const l1 = rgbToLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = rgbToLuminance(rgb2.r, rgb2.g, rgb2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export const colorContrastRule: RuleFunction = (node, ctx) => {
  const issues: AuditIssue[] = [];
  const style = window.getComputedStyle(node);
  const color = style.color;
  const bgColor = style.backgroundColor;
  
  const hexMatch = (c: string) => {
    const rgbMatch = c.match(/rgb\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbMatch) {
      return '#' + [1, 2, 3].map((i) => parseInt(rgbMatch[i]).toString(16).padStart(2, '0')).join('');
    }
    return c;
  };
  
  const textContent = node.textContent?.trim() || '';
  if (textContent.length === 0) return { issues };
  if (node.tagName === 'HTML' || node.tagName === 'BODY') return { issues };
  if (node.children.length > 0 && node.children.length < 50) return { issues };
  
  const fg = hexMatch(color);
  const bg = hexMatch(bgColor);
  
  if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
    const ratio = getContrastRatio(fg, bg);
    if (ratio !== null && ratio < 4.5) {
      issues.push(
        createIssue(
          {
            type: 'COLOR_CONTRAST_LOW',
            description: `文字颜色对比度仅为${ratio.toFixed(2)}:1，低于WCAG AA要求的4.5:1`,
            selector: getUniqueSelector(node),
            severity: 'medium',
            wcagCriterion: '1.4.3',
            wcagLevel: 'AA',
            currentValue: `对比度 ${ratio.toFixed(2)}:1`,
          },
          node,
          ctx
        )
      );
    }
  }
  
  return { issues };
};

export const focusOrderRule: RuleFunction = (node, ctx) => {
  const issues: AuditIssue[] = [];
  const tabindex = node.getAttribute('tabindex');
  
  if (tabindex !== null) {
    const tabindexNum = parseInt(tabindex);
    if (!isNaN(tabindexNum) && tabindexNum > 0) {
      issues.push(
        createIssue(
          {
            type: 'FOCUS_ORDER_DISRUPTED',
            description: `tabindex="${tabindex}"会打乱DOM顺序的自然焦点流，建议使用0或-1`,
            selector: getUniqueSelector(node),
            severity: 'critical',
            wcagCriterion: '2.4.3',
            wcagLevel: 'A',
            currentValue: `tabindex="${tabindex}"`,
          },
          node,
          ctx
        )
      );
    }
  }
  
  return { issues };
};

const semanticRoleConflicts: Record<string, string[]> = {
  BUTTON: ['heading', 'link', 'listitem', 'article', 'banner', 'complementary', 'contentinfo', 'main', 'navigation', 'region'],
  A: ['button', 'heading', 'article', 'banner', 'complementary', 'contentinfo', 'main', 'navigation'],
  H1: ['button', 'link', 'article', 'banner', 'main', 'navigation'],
  H2: ['button', 'link', 'article', 'banner', 'main', 'navigation'],
  H3: ['button', 'link', 'article', 'banner', 'main', 'navigation'],
  INPUT: ['heading', 'article', 'banner', 'complementary', 'contentinfo', 'main', 'navigation', 'region'],
  NAV: ['banner', 'contentinfo', 'main', 'article'],
  MAIN: ['banner', 'contentinfo', 'navigation', 'article', 'complementary', 'region'],
  HEADER: ['banner', 'article', 'main', 'contentinfo', 'navigation'],
  FOOTER: ['banner', 'article', 'main', 'navigation', 'complementary'],
  ARTICLE: ['banner', 'contentinfo', 'main', 'navigation'],
};

export const ariaSemanticConflictRule: RuleFunction = (node, ctx) => {
  const issues: AuditIssue[] = [];
  const role = node.getAttribute('role');
  
  if (role) {
    const tagName = node.tagName;
    const conflicts = semanticRoleConflicts[tagName];
    
    if (conflicts && conflicts.includes(role.toLowerCase())) {
      issues.push(
        createIssue(
          {
            type: 'ARIA_SEMANTIC_CONFLICT',
            description: `<${tagName.toLowerCase()}>与role="${role}"存在语义冲突，重复声明可能造成混淆`,
            selector: getUniqueSelector(node),
            severity: 'medium',
            wcagCriterion: '1.3.1',
            wcagLevel: 'A',
            currentValue: `<${tagName.toLowerCase()} role="${role}">`,
          },
          node,
          ctx
        )
      );
    }
  }
  
  return { issues };
};

export const missingLangRule: RuleFunction = (node, ctx) => {
  const issues: AuditIssue[] = [];
  
  if (node.tagName === 'HTML') {
    const lang = node.getAttribute('lang');
    if (!lang || lang.trim() === '') {
      issues.push(
        createIssue(
          {
            type: 'MISSING_LANG_ATTR',
            description: '<html>元素缺少lang属性，屏幕阅读器无法正确切换语言',
            selector: 'html',
            severity: 'low',
            wcagCriterion: '3.1.1',
            wcagLevel: 'A',
            currentValue: '<html> 无lang属性',
          },
          node,
          ctx
        )
      );
    }
  }
  
  return { issues };
};

export const duplicateIdRule: RuleFunction = (node, ctx) => {
  const issues: AuditIssue[] = [];
  const id = node.getAttribute('id');
  
  if (id && id.trim() !== '') {
    const count = (ctx.idMap.get(id) || 0) + 1;
    ctx.idMap.set(id, count);
    
    if (count === 2) {
      issues.push(
        createIssue(
          {
            type: 'DUPLICATE_ID',
            description: `ID "${id}" 在页面中重复出现，会造成ARIA引用失效和样式冲突`,
            selector: `#${CSS.escape(id)}`,
            severity: 'medium',
            wcagCriterion: '4.1.1',
            wcagLevel: 'A',
            currentValue: `id="${id}" 出现${count}次`,
          },
          node,
          ctx
        )
      );
    } else if (count > 2) {
      const existingIssue = issues.find((i) => i.type === 'DUPLICATE_ID' && i.selector.includes(id));
      if (existingIssue) {
        existingIssue.currentValue = `id="${id}" 出现${count}次`;
      }
    }
  }
  
  return { issues };
};

export const headingLevelSkipRule: RuleFunction = (node, ctx) => {
  const issues: AuditIssue[] = [];
  const headingMatch = node.tagName.match(/^H([1-6])$/);
  
  if (headingMatch) {
    const level = parseInt(headingMatch[1]);
    ctx.headingLevels.push(level);
    
    if (ctx.headingLevels.length > 1) {
      const prevLevel = ctx.headingLevels[ctx.headingLevels.length - 2];
      if (level > prevLevel + 1 && prevLevel > 0) {
        issues.push(
          createIssue(
            {
              type: 'HEADING_LEVEL_SKIP',
              description: `标题层级从<h${prevLevel}>跳到<h${level}>，跳过了<h${prevLevel + 1}>`,
              selector: getUniqueSelector(node),
              severity: 'medium',
              wcagCriterion: '1.3.1',
              wcagLevel: 'A',
              currentValue: `<h${prevLevel}> → <h${level}>`,
            },
            node,
            ctx
          )
        );
      }
    }
  }
  
  return { issues };
};

export const missingAccessibleNameRule: RuleFunction = (node, ctx) => {
  const issues: AuditIssue[] = [];
  const interactiveTags = ['BUTTON', 'A'];
  
  if (interactiveTags.includes(node.tagName)) {
    const text = node.textContent?.trim() || '';
    const hasAriaLabel = node.hasAttribute('aria-label');
    const hasAriaLabelledby = node.hasAttribute('aria-labelledby');
    const hasTitle = node.hasAttribute('title');
    const hasImageAlt = node.querySelector('img[alt]:not([alt=""])') !== null;
    
    const isEmptyLink = node.tagName === 'A' && text.length === 0;
    const isEmptyButton = node.tagName === 'BUTTON' && text.length === 0;
    
    if ((isEmptyLink || isEmptyButton) && !hasAriaLabel && !hasAriaLabelledby && !hasTitle && !hasImageAlt) {
      const tag = node.tagName.toLowerCase();
      issues.push(
        createIssue(
          {
            type: 'MISSING_ACCESSIBLE_NAME',
            description: `<${tag}>元素缺少可访问名称（文字内容/aria-label/title）`,
            selector: getUniqueSelector(node),
            severity: 'critical',
            wcagCriterion: '4.1.2',
            wcagLevel: 'A',
            currentValue: `<${tag}> 无内容且无aria-label`,
          },
          node,
          ctx
        )
      );
    }
  }
  
  return { issues };
};

export const nonButtonOnclickRule: RuleFunction = (node, ctx) => {
  const issues: AuditIssue[] = [];
  const nonInteractiveTags = ['DIV', 'SPAN', 'P', 'DIVISION', 'LI', 'TD', 'TH', 'TR', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER'];
  
  if (nonInteractiveTags.includes(node.tagName)) {
    const hasOnclick = node.hasAttribute('onclick');
    
    if (hasOnclick) {
      const hasRole = node.getAttribute('role');
      const isButtonLike = hasRole === 'button' || hasRole === 'link';
      const hasTabindex = node.hasAttribute('tabindex');
      const hasKeydown = node.hasAttribute('onkeydown') || node.hasAttribute('onkeyup');
      
      if (!isButtonLike || !hasTabindex || !hasKeydown) {
        const problems: string[] = [];
        if (!isButtonLike) problems.push('缺少role="button"');
        if (!hasTabindex) problems.push('缺少tabindex');
        if (!hasKeydown) problems.push('缺少键盘事件(Enter/Space)');
        
        issues.push(
          createIssue(
            {
              type: 'NON_BUTTON_ONCLICK',
              description: `<${node.tagName.toLowerCase()}>绑定了onclick但不完全具备按钮可访问性：${problems.join('、')}`,
              selector: getUniqueSelector(node),
              severity: 'medium',
              wcagCriterion: '2.1.1',
              wcagLevel: 'A',
              currentValue: `<${node.tagName.toLowerCase()} onclick> ${problems.join(' + ')}缺失`,
            },
            node,
            ctx
          )
        );
      }
    }
  }
  
  return { issues };
};

export const ALL_RULES: RuleFunction[] = [
  imageMissingAltRule,
  formMissingLabelRule,
  focusOrderRule,
  ariaSemanticConflictRule,
  missingLangRule,
  duplicateIdRule,
  headingLevelSkipRule,
  missingAccessibleNameRule,
  nonButtonOnclickRule,
  colorContrastRule,
];

export default ALL_RULES;
