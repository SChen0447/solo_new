import * as csstree from 'css-tree';
import { WeightResult, SelectorNode } from './types';

const PSEUDO_ELEMENTS = [
  '::before', '::after', '::first-line', '::first-letter',
  '::selection', '::placeholder', '::marker', '::backdrop',
  '::cue', '::slotted',
  ':before', ':after', ':first-line', ':first-letter'
];

const PSEUDO_CLASSES_NO_WEIGHT = [':not', ':is', ':where', ':has', ':matches'];

export class WeightCalculator {
  private generateId(): string {
    return 'node-' + Math.random().toString(36).substring(2, 11);
  }

  calculateSingleSelector(selector: string): WeightResult {
    let idCount = 0;
    let classCount = 0;
    let tagCount = 0;

    if (!selector || !selector.trim()) {
      return { idCount: 0, classCount: 0, tagCount: 0, specificity: '0-0-0', numericValue: 0 };
    }

    try {
      const ast = csstree.parse(selector, { context: 'selector' });
      csstree.walk(ast, (node: any) => {
        switch (node.type) {
          case 'IdSelector':
            idCount++;
            break;
          case 'ClassSelector':
            classCount++;
            break;
          case 'TypeSelector':
            tagCount++;
            break;
          case 'PseudoClassSelector': {
            const name = ':' + (node.name || '');
            if (PSEUDO_CLASSES_NO_WEIGHT.includes(name)) {
              if (node.children) {
                const innerSelector = csstree.generate(node.children);
                const innerWeight = this.calculateSingleSelector(innerSelector);
                idCount += innerWeight.idCount;
                classCount += innerWeight.classCount;
                tagCount += innerWeight.tagCount;
              }
            } else {
              classCount++;
            }
            break;
          }
          case 'PseudoElementSelector':
            tagCount++;
            break;
          case 'AttributeSelector':
            classCount++;
            break;
          case 'Nth':
            if (node.selector) {
              const nthSelector = csstree.generate(node.selector);
              const innerWeight = this.calculateSingleSelector(nthSelector);
              idCount += innerWeight.idCount;
              classCount += innerWeight.classCount;
              tagCount += innerWeight.tagCount;
            }
            break;
        }
      });
    } catch (e) {
      const simpleResult = this.fallbackCalculate(selector);
      idCount = simpleResult.idCount;
      classCount = simpleResult.classCount;
      tagCount = simpleResult.tagCount;
    }

    const numericValue = idCount * 10000 + classCount * 100 + tagCount;

    return {
      idCount,
      classCount,
      tagCount,
      specificity: `${idCount}-${classCount}-${tagCount}`,
      numericValue,
    };
  }

  calculateRule(selector: string): { total: WeightResult; perSelector: { selector: string; weight: WeightResult }[] } {
    const selectors = this.splitSelectorList(selector);
    let maxWeight: WeightResult = { idCount: 0, classCount: 0, tagCount: 0, specificity: '0-0-0', numericValue: 0 };
    const perSelector: { selector: string; weight: WeightResult }[] = [];

    for (const sel of selectors) {
      const weight = this.calculateSingleSelector(sel.trim());
      perSelector.push({ selector: sel.trim(), weight });
      if (weight.numericValue > maxWeight.numericValue) {
        maxWeight = weight;
      }
    }

    return { total: maxWeight, perSelector };
  }

  private fallbackCalculate(selector: string): { idCount: number; classCount: number; tagCount: number } {
    let idCount = 0;
    let classCount = 0;
    let tagCount = 0;

    const tokens = selector.match(/#[\w-]+|\.[\w-]+|\[[^\]]+\]|::[\w-]+|:(?:not|is|where|has|matches)\([^)]+\)|:[\w-]+(?:\([^)]*\))?|[\w-]+|[>+~ ]/g) || [];

    let inNot = 0;
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.startsWith('#')) {
        idCount++;
      } else if (token.startsWith('.') || token.startsWith('[')) {
        classCount++;
      } else if (token.startsWith('::')) {
        tagCount++;
      } else if (token.startsWith(':not(') || token.startsWith(':is(') || token.startsWith(':where(') || token.startsWith(':has(') || token.startsWith(':matches(')) {
        inNot++;
        const inner = token.replace(/^:(?:not|is|where|has|matches)\((.*)\)$/, '$1');
        const innerResult = this.fallbackCalculate(inner);
        idCount += innerResult.idCount;
        classCount += innerResult.classCount;
        tagCount += innerResult.tagCount;
      } else if (token.startsWith(':')) {
        classCount++;
      } else if (/^[\w-]+$/.test(token)) {
        tagCount++;
      }
    }

    return { idCount, classCount, tagCount };
  }

  buildSelectorTree(selector: string, ruleId?: string): SelectorNode[] {
    const selectors = this.splitSelectorList(selector);
    const trees: SelectorNode[] = [];

    for (const sel of selectors) {
      const tree = this.buildSingleTree(sel.trim(), ruleId);
      if (tree) trees.push(tree);
    }

    return trees;
  }

  private buildSingleTree(selector: string, ruleId?: string): SelectorNode | null {
    if (!selector.trim()) return null;

    const weight = this.calculateSingleSelector(selector);
    const tokens = this.tokenizeSelector(selector);

    if (tokens.length === 0) return null;

    const rootChildren: SelectorNode[] = [];
    let currentGroup: SelectorNode[] = [];

    for (const token of tokens) {
      if (token.type === 'combinator') {
        if (currentGroup.length > 0) {
          this.addGroupToTree(rootChildren, currentGroup, ruleId);
          currentGroup = [];
        }
        rootChildren.push({
          id: this.generateId(),
          type: 'combinator',
          value: token.value,
          weight: { idCount: 0, classCount: 0, tagCount: 0, specificity: '0-0-0', numericValue: 0 },
          ruleId,
        });
      } else {
        currentGroup.push({
          id: this.generateId(),
          type: token.type,
          value: token.value,
          weight: this.getNodeWeight(token.type),
          ruleId,
        });
      }
    }

    if (currentGroup.length > 0) {
      this.addGroupToTree(rootChildren, currentGroup, ruleId);
    }

    return {
      id: this.generateId(),
      type: 'tag',
      value: selector.substring(0, 30) + (selector.length > 30 ? '...' : ''),
      weight,
      children: rootChildren,
      ruleId,
    };
  }

  private addGroupToTree(parent: SelectorNode[], group: SelectorNode[], ruleId?: string): void {
    if (group.length === 0) return;

    if (group.length === 1) {
      parent.push(group[0]);
    } else {
      const combinedWeight: WeightResult = {
        idCount: group.reduce((sum, n) => sum + n.weight.idCount, 0),
        classCount: group.reduce((sum, n) => sum + n.weight.classCount, 0),
        tagCount: group.reduce((sum, n) => sum + n.weight.tagCount, 0),
        specificity: '',
        numericValue: 0,
      };
      combinedWeight.numericValue = combinedWeight.idCount * 10000 + combinedWeight.classCount * 100 + combinedWeight.tagCount;
      combinedWeight.specificity = `${combinedWeight.idCount}-${combinedWeight.classCount}-${combinedWeight.tagCount}`;

      parent.push({
        id: this.generateId(),
        type: 'tag',
        value: group.map((g) => g.value).join(''),
        weight: combinedWeight,
        children: [...group],
        ruleId,
      });
    }
  }

  private tokenizeSelector(selector: string): { type: SelectorNode['type']; value: string }[] {
    const tokens: { type: SelectorNode['type']; value: string }[] = [];
    let i = 0;

    while (i < selector.length) {
      const ch = selector[i];

      if (ch === ' ' || ch === '>' || ch === '+' || ch === '~') {
        if (ch !== ' ' || (i > 0 && selector[i - 1] !== ' ' && selector[i + 1] !== ' ')) {
          tokens.push({ type: 'combinator', value: ch.trim() || ' ' });
        }
        i++;
        continue;
      }

      if (ch === '#') {
        const match = selector.substring(i).match(/^#([\w-]+|\\[^\s])*/);
        if (match) {
          tokens.push({ type: 'id', value: match[0] });
          i += match[0].length;
          continue;
        }
      }

      if (ch === '.') {
        const match = selector.substring(i).match(/^\.([\w-]+|\\[^\s])*/);
        if (match) {
          tokens.push({ type: 'class', value: match[0] });
          i += match[0].length;
          continue;
        }
      }

      if (ch === '[') {
        let j = i + 1;
        let depth = 1;
        while (j < selector.length && depth > 0) {
          if (selector[j] === '[') depth++;
          if (selector[j] === ']') depth--;
          j++;
        }
        tokens.push({ type: 'attribute', value: selector.substring(i, j) });
        i = j;
        continue;
      }

      if (ch === ':' && selector[i + 1] === ':') {
        const match = selector.substring(i).match(/^::([\w-]+)(\([^)]*\))?/);
        if (match) {
          tokens.push({ type: 'pseudo-element', value: match[0] });
          i += match[0].length;
          continue;
        }
      }

      if (ch === ':') {
        const match = selector.substring(i).match(/^:([\w-]+)(\((?:[^()]*|\([^()]*\))*\))?/);
        if (match) {
          const name = ':' + match[1];
          if (PSEUDO_ELEMENTS.includes(name)) {
            tokens.push({ type: 'pseudo-element', value: match[0] });
          } else {
            tokens.push({ type: 'pseudo-class', value: match[0] });
          }
          i += match[0].length;
          continue;
        }
      }

      if (/[a-zA-Z*]/.test(ch) || (ch === '\\' && selector[i + 1])) {
        const match = selector.substring(i).match(/^((?:\\[^\s]|[a-zA-Z0-9_-])+|\*)/);
        if (match) {
          tokens.push({ type: 'tag', value: match[0] });
          i += match[0].length;
          continue;
        }
      }

      i++;
    }

    return tokens;
  }

  private getNodeWeight(type: SelectorNode['type']): WeightResult {
    switch (type) {
      case 'id':
        return { idCount: 1, classCount: 0, tagCount: 0, specificity: '1-0-0', numericValue: 10000 };
      case 'class':
      case 'pseudo-class':
      case 'attribute':
        return { idCount: 0, classCount: 1, tagCount: 0, specificity: '0-1-0', numericValue: 100 };
      case 'tag':
      case 'pseudo-element':
        return { idCount: 0, classCount: 0, tagCount: 1, specificity: '0-0-1', numericValue: 1 };
      case 'combinator':
      default:
        return { idCount: 0, classCount: 0, tagCount: 0, specificity: '0-0-0', numericValue: 0 };
    }
  }

  splitSelectorList(selector: string): string[] {
    const selectors: string[] = [];
    let current = '';
    let depth = 0;

    for (let i = 0; i < selector.length; i++) {
      const ch = selector[i];

      if (ch === '(') depth++;
      if (ch === ')') depth--;

      if (ch === ',' && depth === 0) {
        if (current.trim()) selectors.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }

    if (current.trim()) selectors.push(current.trim());
    return selectors.length > 0 ? selectors : [selector];
  }

  batchCalculate(rules: { id: string; selector: string }[]): Map<string, WeightResult> {
    const results = new Map<string, WeightResult>();
    for (const rule of rules) {
      const { total } = this.calculateRule(rule.selector);
      results.set(rule.id, total);
    }
    return results;
  }
}

export default WeightCalculator;
