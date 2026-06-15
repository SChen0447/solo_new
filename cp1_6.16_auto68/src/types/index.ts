export type Severity = 'critical' | 'medium' | 'low';

export type WcagLevel = 'A' | 'AA' | 'AAA';

export interface AuditIssue {
  id: string;
  type: string;
  description: string;
  selector: string;
  severity: Severity;
  wcagCriterion: string;
  wcagLevel: WcagLevel;
  domOrder: number;
  elementHTML?: string;
  currentValue?: string;
  tagName?: string;
  tabId: string;
  fixed?: boolean;
}

export interface FixSuggestion {
  id: string;
  issueId: string;
  title: string;
  codeSnippet: string;
  explanation: string;
  isApplied?: boolean;
}

export interface FilterState {
  severities: Severity[];
  tagNames: string[];
  wcagCriteria: string[];
}

export interface AuditSession {
  id: string;
  title: string;
  htmlCode: string;
  issues: AuditIssue[];
  suggestions: Record<string, FixSuggestion[]>;
  filterState: FilterState;
  createdAt: number;
}

export interface AuditReport {
  timestamp: string;
  htmlSummary: string;
  totalIssues: number;
  issues: {
    selector: string;
    errorType: string;
    wcagCriterion: string;
    currentValue?: string;
    suggestedValue?: string;
    severity: Severity;
  }[];
}

export type EventMap = {
  'code-change': { tabId: string; html: string };
  'audit-start': { tabId: string };
  'audit-result': { tabId: string; issues: AuditIssue[] };
  'fix-recommendations': { tabId: string; suggestions: Record<string, FixSuggestion[]> };
  'highlight-click': { tabId: string; issueId: string; selector: string };
  'copy-success': { tabId: string; suggestionId: string };
  'export-report': { tabId: string };
  'issue-fixed': { tabId: string; issueId: string };
};
