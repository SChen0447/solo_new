import type { AuditIssue, FixSuggestion } from '@/types';
import { eventBus } from '../ui-render/EventBus';
import { suggestionCache } from './SuggestionCache';

const generateId = () => Math.random().toString(36).substring(2, 11);

interface SuggestionTemplate {
  type: string;
  generate: (issue: AuditIssue) => FixSuggestion[];
}

const suggestionTemplates: SuggestionTemplate[] = [
  {
    type: 'IMAGE_MISSING_ALT',
    generate: (issue) => [
      {
        id: generateId(),
        issueId: issue.id,
        title: '添加描述性alt属性',
        codeSnippet: issue.elementHTML
          ? issue.elementHTML.replace(/^<img/i, '<img alt="描述图片内容的文字"').replace(/\/?>$/, '>')
          : '<img src="..." alt="描述图片内容的文字">',
        explanation: 'alt属性应简洁准确地描述图片内容和目的，装饰性图片使用alt=""。',
      },
      {
        id: generateId(),
        issueId: issue.id,
        title: '标记为装饰性图片（如无实际意义）',
        codeSnippet: issue.elementHTML
          ? issue.elementHTML.replace(/^<img/i, '<img alt="" role="presentation"').replace(/\/?>$/, '>')
          : '<img src="..." alt="" role="presentation">',
        explanation: '纯装饰性图片应使用空alt+role="presentation"，告知屏幕阅读器可跳过。',
      },
    ],
  },
  {
    type: 'FORM_MISSING_LABEL',
    generate: (issue) => [
      {
        id: generateId(),
        issueId: issue.id,
        title: '使用label标签关联（for=id）',
        codeSnippet: `<label for="field-${issue.id.substring(0, 4)}">请输入字段说明</label>\n${
          issue.elementHTML
            ? issue.elementHTML.replace(/^<(\w+)/, `<$1 id="field-${issue.id.substring(0, 4)}"`).replace(/\/?>$/, '>')
            : '<input type="text" id="field-id">'
        }`,
        explanation: '将label的for属性与input的id绑定，点击label也能聚焦输入框，可访问性最佳。',
      },
      {
        id: generateId(),
        issueId: issue.id,
        title: '添加aria-label内联标签',
        codeSnippet: issue.elementHTML
          ? issue.elementHTML.replace(/^<(\w+)/, '<$1 aria-label="请输入字段说明"').replace(/\/?>$/, '>')
          : '<input type="text" aria-label="请输入字段说明">',
        explanation: '当视觉上无法显示label标签时，使用aria-label属性，仅对屏幕阅读器可见。',
      },
    ],
  },
  {
    type: 'COLOR_CONTRAST_LOW',
    generate: (issue) => [
      {
        id: generateId(),
        issueId: issue.id,
        title: '加深文字颜色以提高对比度',
        codeSnippet: '/* 原颜色对比度不足 */\ncolor: #333; /* 替代 #666 */\nbackground-color: #fff;',
        explanation: '普通文本需至少4.5:1对比度，大文本（18pt+或14pt加粗）需3:1。',
      },
      {
        id: generateId(),
        issueId: issue.id,
        title: '调浅背景色增加对比度',
        codeSnippet: '/* 替代低对比度背景 */\nbackground-color: #ffffff; /* 替代 #f0f0f0 */\ncolor: #000000;',
        explanation: '可使用在线对比度检查工具如 WebAIM Contrast Checker 验证。',
      },
    ],
  },
  {
    type: 'FOCUS_ORDER_DISRUPTED',
    generate: (issue) => [
      {
        id: generateId(),
        issueId: issue.id,
        title: '移除正数tabindex，依赖DOM自然顺序',
        codeSnippet: issue.elementHTML
          ? issue.elementHTML.replace(/\s*tabindex="[^"]*"/g, '').replace(/\s*tabindex='[^']*'/g, '')
          : '<div>使用DOM自然顺序</div>',
        explanation: '正数tabindex(1,2,3...)会打乱焦点流，几乎总是造成可访问性问题。',
      },
      {
        id: generateId(),
        issueId: issue.id,
        title: '改用tabindex="0"加入自然焦点顺序',
        codeSnippet: issue.elementHTML
          ? issue.elementHTML.replace(/tabindex="[^"]*"/, 'tabindex="0"').replace(/tabindex='[^']*'/, 'tabindex="0"')
          : '<div tabindex="0">可聚焦元素</div>',
        explanation: 'tabindex="0"让可聚焦元素按DOM位置参与Tab顺序，-1仅用于JS聚焦。',
      },
    ],
  },
  {
    type: 'ARIA_SEMANTIC_CONFLICT',
    generate: (issue) => [
      {
        id: generateId(),
        issueId: issue.id,
        title: '移除冗余的role属性，使用语义标签本身',
        codeSnippet: issue.elementHTML
          ? issue.elementHTML.replace(/\s*role="[^"]*"/g, '').replace(/\s*role='[^']*'/g, '')
          : '<button>原生语义</button>',
        explanation: '原生语义标签如<button>已自带隐式role，无需重复声明，避免混淆。',
      },
    ],
  },
  {
    type: 'MISSING_LANG_ATTR',
    generate: (issue) => [
      {
        id: generateId(),
        issueId: issue.id,
        title: '在html标签设置页面语言',
        codeSnippet: '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>...</head>\n<body>...</body>\n</html>',
        explanation: 'lang属性帮助屏幕阅读器切换正确的发音语言，是最基本的国际化无障碍设置。',
      },
    ],
  },
  {
    type: 'DUPLICATE_ID',
    generate: (issue) => [
      {
        id: generateId(),
        issueId: issue.id,
        title: '重命名重复的ID，确保全局唯一',
        codeSnippet: '<!-- 原重复ID修改为唯一值 -->\n<div id="user-profile-1">...</div>\n<div id="user-profile-2">...</div>',
        explanation: 'ID重复会导致ARIA引用失效、label关联错误、锚点跳转异常和getElementById结果不确定。',
      },
      {
        id: generateId(),
        issueId: issue.id,
        title: '改用class属性（如需样式选择器）',
        codeSnippet: '<!-- 使用class代替重复的id -->\n<div class="user-card">卡片1</div>\n<div class="user-card">卡片2</div>',
        explanation: '如果只是为了CSS或JS批量选择，应使用class而非id。',
      },
    ],
  },
  {
    type: 'HEADING_LEVEL_SKIP',
    generate: (issue) => [
      {
        id: generateId(),
        issueId: issue.id,
        title: '按顺序使用下一级标题，不要跳级',
        codeSnippet: '<h1>页面主标题</h1>\n<h2>章节标题</h2>\n<h3>小节标题</h3>\n<!-- 避免 h1 → h3 直接跳过 -->',
        explanation: '标题层级结构如文档大纲，屏幕阅读器用户依赖它理解页面结构和导航。',
      },
    ],
  },
  {
    type: 'MISSING_ACCESSIBLE_NAME',
    generate: (issue) => [
      {
        id: generateId(),
        issueId: issue.id,
        title: '添加文字内容作为可访问名称',
        codeSnippet: issue.tagName === 'a'
          ? '<a href="/settings">⚙️ 设置</a>'
          : '<button type="submit">📤 提交表单</button>',
        explanation: '按钮和链接应包含可见的文字内容，是可访问名称的首选方式。',
      },
      {
        id: generateId(),
        issueId: issue.id,
        title: '使用aria-label提供屏幕阅读器名称',
        codeSnippet: issue.tagName === 'a'
          ? '<a href="/close" aria-label="关闭当前窗口">✕</a>'
          : '<button aria-label="删除当前项目">🗑️</button>',
        explanation: '纯图标按钮/链接必须有aria-label，否则屏幕阅读器只能读出"按钮"或"链接"。',
      },
    ],
  },
  {
    type: 'NON_BUTTON_ONCLICK',
    generate: (issue) => [
      {
        id: generateId(),
        issueId: issue.id,
        title: '改用原生<button>元素（推荐方案）',
        codeSnippet: '<!-- 替换前 -->\n<div onclick="handleClick()">点我</div>\n\n<!-- 替换后 -->\n<button type="button" onclick="handleClick()">点我</button>',
        explanation: '<button>自带所有可访问性：键盘操作、焦点、语义，是最推荐的方案。',
      },
      {
        id: generateId(),
        issueId: issue.id,
        title: '添加role+tabindex+键盘事件三件套',
        codeSnippet: `<div\n  role="button"\n  tabindex="0"\n  onclick="handleClick()"\n  onkeydown="if(event.key==='Enter'||event.key===' ')handleClick(event)"\n>\n  点我\n</div>`,
        explanation: '如果必须使用div/span，需补全role、tabindex和Enter/Space键盘事件处理。',
      },
    ],
  },
];

export class FixGenerator {
  private static instance: FixGenerator | null = null;

  static getInstance(): FixGenerator {
    if (!FixGenerator.instance) {
      FixGenerator.instance = new FixGenerator();
    }
    return FixGenerator.instance;
  }

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    eventBus.on('audit-result', ({ tabId, issues }) => {
      this.generateBatch(issues, tabId);
    });
  }

  generate(issue: AuditIssue): FixSuggestion[] {
    const cached = suggestionCache.get(issue.type, issue.selector, issue.currentValue);
    if (cached) {
      return cached.map((s) => ({ ...s, id: generateId(), issueId: issue.id }));
    }

    const template = suggestionTemplates.find((t) => t.type === issue.type);
    let suggestions: FixSuggestion[];

    if (template) {
      suggestions = template.generate(issue);
    } else {
      suggestions = [
        {
          id: generateId(),
          issueId: issue.id,
          title: '查阅WCAG文档了解修复方法',
          codeSnippet: `// 参考: WCAG ${issue.wcagCriterion} (${issue.wcagLevel})\n// 访问 https://www.w3.org/WAI/WCAG21/Understanding/${issue.wcagCriterion}.html`,
          explanation: '暂无特定修复模板，请参考WCAG官方文档。',
        },
      ];
    }

    suggestionCache.set(issue.type, issue.selector, suggestions, issue.currentValue);

    return suggestions;
  }

  generateBatch(issues: AuditIssue[], tabId: string): void {
    const allSuggestions: Record<string, FixSuggestion[]> = {};

    for (const issue of issues) {
      if (issue.fixed) continue;
      allSuggestions[issue.id] = this.generate(issue);
    }

    eventBus.emit('fix-recommendations', { tabId, suggestions: allSuggestions });
  }

  destroy(): void {
    FixGenerator.instance = null;
  }
}

export const fixGenerator = FixGenerator.getInstance();
export default fixGenerator;
