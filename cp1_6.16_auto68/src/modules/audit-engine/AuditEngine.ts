import type { AuditIssue, AuditReport } from '@/types';
import { eventBus } from '../ui-render/EventBus';
import { ALL_RULES, type RuleContext } from './Rules';

export class AuditEngine {
  private static instance: AuditEngine | null = null;
  private parser: DOMParser;

  static getInstance(): AuditEngine {
    if (!AuditEngine.instance) {
      AuditEngine.instance = new AuditEngine();
    }
    return AuditEngine.instance;
  }

  constructor() {
    this.parser = new DOMParser();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    eventBus.on('code-change', ({ tabId, html }) => {
      this.audit(html, tabId);
    });

    eventBus.on('export-report', ({ tabId }) => {
      // handled by UI
    });
  }

  audit(html: string, tabId: string): AuditIssue[] {
    eventBus.emit('audit-start', { tabId });

    let doc: Document;
    try {
      const wrappedHtml = this.ensureDocumentStructure(html);
      doc = this.parser.parseFromString(wrappedHtml, 'text/html');
      
      const parseError = doc.querySelector('parsererror');
      if (parseError) {
        console.warn('[AuditEngine] HTML parse warning, continuing with partial parse');
      }
    } catch (err) {
      console.error('[AuditEngine] Failed to parse HTML:', err);
      const issues: AuditIssue[] = [];
      eventBus.emit('audit-result', { tabId, issues });
      return issues;
    }

    const ctx: RuleContext = {
      tabId,
      domOrder: 0,
      rootDocument: doc,
      idMap: new Map(),
      headingLevels: [],
    };

    const issues: AuditIssue[] = [];

    const htmlElement = doc.documentElement;
    if (htmlElement) {
      this.processNode(htmlElement, ctx, issues);
    }

    const finalIssues = issues.filter((issue, index, self) =>
      index === self.findIndex((i) => 
        i.type === issue.type && i.selector === issue.selector
      )
    );

    finalIssues.sort((a, b) => a.domOrder - b.domOrder);

    eventBus.emit('audit-result', { tabId, issues: finalIssues });

    return finalIssues;
  }

  private ensureDocumentStructure(html: string): string {
    const trimmed = html.trim();
    
    if (/^<!doctype html>/i.test(trimmed) || /^<html/i.test(trimmed)) {
      return trimmed;
    }

    if (/^<body/i.test(trimmed) || /^<head/i.test(trimmed)) {
      return `<!DOCTYPE html><html>${trimmed}</html>`;
    }

    if (/^<(meta|title|link|script|style)/i.test(trimmed)) {
      return `<!DOCTYPE html><html><head>${trimmed}</head><body></body></html>`;
    }

    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Preview</title></head><body>${trimmed}</body></html>`;
  }

  private processNode(node: Element, ctx: RuleContext, issues: AuditIssue[]): void {
    ctx.domOrder++;

    for (const rule of ALL_RULES) {
      try {
        const result = rule(node, ctx);
        if (result.issues && result.issues.length > 0) {
          for (const partialIssue of result.issues) {
            if (partialIssue.id) {
              issues.push(partialIssue as AuditIssue);
            }
          }
        }
      } catch (err) {
        console.warn('[AuditEngine] Rule execution error:', rule.name, err);
      }
    }

    let child = node.firstElementChild;
    while (child) {
      this.processNode(child, ctx, issues);
      child = child.nextElementSibling;
    }
  }

  generateReport(tabId: string, issues: AuditIssue[], html: string): AuditReport {
    const unfixedIssues = issues.filter((i) => !i.fixed);
    
    return {
      timestamp: new Date().toISOString(),
      htmlSummary: html.substring(0, 200),
      totalIssues: unfixedIssues.length,
      issues: unfixedIssues.map((issue) => ({
        selector: issue.selector,
        errorType: issue.type,
        wcagCriterion: `${issue.wcagCriterion} (Level ${issue.wcagLevel})`,
        currentValue: issue.currentValue,
        suggestedValue: this.getSuggestedValue(issue),
        severity: issue.severity,
      })),
    };
  }

  private getSuggestedValue(issue: AuditIssue): string | undefined {
    switch (issue.type) {
      case 'IMAGE_MISSING_ALT':
        return 'alt="描述图片内容的文字"';
      case 'FORM_MISSING_LABEL':
        return '<label for="input-id">标签文字</label> 或 aria-label="标签文字"';
      case 'COLOR_CONTRAST_LOW':
        return '使用对比度≥4.5:1的前景/背景色组合';
      case 'FOCUS_ORDER_DISRUPTED':
        return 'tabindex="0" 或 tabindex="-1"';
      case 'ARIA_SEMANTIC_CONFLICT':
        return '移除冗余的role属性，使用语义标签本身';
      case 'MISSING_LANG_ATTR':
        return '<html lang="zh-CN">';
      case 'DUPLICATE_ID':
        return '确保每个ID在文档中唯一';
      case 'HEADING_LEVEL_SKIP':
        return '依次使用h1→h2→h3层级，不要跳级';
      case 'MISSING_ACCESSIBLE_NAME':
        return '添加文字内容或aria-label="描述文字"';
      case 'NON_BUTTON_ONCLICK':
        return '改用<button>或添加role="button" tabindex="0" 和键盘事件';
      default:
        return undefined;
    }
  }

  static downloadReport(report: AuditReport): void {
    const timestamp = report.timestamp.replace(/[:.]/g, '-');
    const filename = `access-audit-report-${timestamp}.json`;
    const content = JSON.stringify(report, null, 2);
    
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }

  destroy(): void {
    AuditEngine.instance = null;
  }
}

export const auditEngine = AuditEngine.getInstance();
export default auditEngine;
