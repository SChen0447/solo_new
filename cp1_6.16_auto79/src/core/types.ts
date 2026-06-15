export interface CSSDeclaration {
  property: string;
  value: string;
  important: boolean;
}

export interface ParsedCSSRule {
  id: string;
  selector: string;
  declarations: CSSDeclaration[];
  line: number;
  raw: string;
}

export interface WeightResult {
  idCount: number;
  classCount: number;
  tagCount: number;
  specificity: string;
  numericValue: number;
}

export interface SelectorNode {
  id: string;
  type: 'id' | 'class' | 'tag' | 'pseudo-class' | 'pseudo-element' | 'attribute' | 'combinator';
  value: string;
  weight: WeightResult;
  children?: SelectorNode[];
  ruleId?: string;
}

export interface TracedStyle {
  property: string;
  value: string;
  source: 'user' | 'browser' | 'inherit';
  selector: string;
  important: boolean;
  specificity: string;
  ruleId: string;
  isWinner: boolean;
}

export interface ParseError {
  line: number;
  column: number;
  message: string;
  rawMessage: string;
}

export interface ParseResult {
  rules: ParsedCSSRule[];
  errors: ParseError[];
}

export type EventType =
  | 'css:parse'
  | 'css:parsed'
  | 'rule:select'
  | 'rule:weight-calculated'
  | 'selector:trace'
  | 'selector:traced'
  | 'node:click'
  | 'rules:updated';

export interface EventPayloadMap {
  'css:parse': { css: string };
  'css:parsed': { result: ParseResult };
  'rule:select': { rule: ParsedCSSRule };
  'rule:weight-calculated': { rule: ParsedCSSRule; weight: WeightResult; tree: SelectorNode[] };
  'selector:trace': { selector: string; rules: ParsedCSSRule[] };
  'selector:traced': { styles: TracedStyle[]; matchedRules: ParsedCSSRule[] };
  'node:click': { ruleId: string };
  'rules:updated': { rules: ParsedCSSRule[] };
}
