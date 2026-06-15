import * as csstree from 'css-tree';
import { ParsedCSSRule, TracedStyle, WeightResult } from './types';
import { WeightCalculator } from './WeightCalculator';

export class StyleTracer {
  private weightCalculator: WeightCalculator;
  private inheritedProperties = new Set([
    'color', 'font-family', 'font-size', 'font-style', 'font-weight',
    'font-variant', 'font-stretch', 'line-height', 'letter-spacing',
    'word-spacing', 'text-align', 'text-indent', 'text-transform',
    'white-space', 'direction', 'visibility', 'cursor', 'quotes',
    'list-style-type', 'list-style-position', 'list-style-image',
    'list-style', 'caption-side', 'border-collapse', 'border-spacing',
    'empty-cells', 'orphans', 'widows', 'page-break-inside',
  ]);

  constructor() {
    this.weightCalculator = new WeightCalculator();
  }

  trace(targetSelector: string, rules: ParsedCSSRule[]): { styles: TracedStyle[]; matchedRules: ParsedCSSRule[] } {
    const propertyMap = new Map<string, TracedStyle[]>();
    const matchedRules: ParsedCSSRule[] = [];

    try {
      const targetElements = this.parseTargetSelector(targetSelector);

      for (const rule of rules) {
        try {
          const ruleSelectors = this.weightCalculator.splitSelectorList(rule.selector);
          const ruleWeight = this.weightCalculator.calculateRule(rule.selector).total;

          for (const ruleSel of ruleSelectors) {
            if (this.doesMatch(ruleSel.trim(), targetElements, rule.line)) {
              matchedRules.push(rule);

              for (const decl of rule.declarations) {
                const traced: TracedStyle = {
                  property: decl.property,
                  value: decl.value,
                  source: 'user',
                  selector: ruleSel.trim(),
                  important: decl.important,
                  specificity: ruleWeight.specificity,
                  ruleId: rule.id,
                  isWinner: false,
                };

                if (!propertyMap.has(decl.property)) {
                  propertyMap.set(decl.property, []);
                }
                propertyMap.get(decl.property)!.push(traced);
              }
              break;
            }
          }
        } catch (e) {
          // Skip rules that cause errors
        }
      }

      const allStyles: TracedStyle[] = [];

      for (const [prop, styles] of propertyMap.entries()) {
        const sorted = styles.sort((a, b) => this.compareStylePriority(a, b));

        if (sorted.length > 0) {
          sorted[0].isWinner = true;
        }

        allStyles.push(...sorted);
      }

      return { styles: allStyles, matchedRules };
    } catch (e) {
      console.error('[StyleTracer] Trace error:', e);
      return { styles: [], matchedRules: [] };
    }
  }

  private parseTargetSelector(selector: string): Array<{ tags: string[]; classes: string[]; ids: string[] }> {
    const selectors = this.weightCalculator.splitSelectorList(selector);
    const result: Array<{ tags: string[]; classes: string[]; ids: string[] }> = [];

    for (const sel of selectors) {
      const parts = sel.trim().split(/\s+/).filter(Boolean);
      if (parts.length === 0) continue;

      const lastPart = parts[parts.length - 1];
      const element = this.parseSimpleSelector(lastPart);
      result.push(element);
    }

    return result.length > 0
      ? result
      : [{ tags: [], classes: [], ids: [] }];
  }

  private parseSimpleSelector(selector: string): { tags: string[]; classes: string[]; ids: string[] } {
    const tags: string[] = [];
    const classes: string[] = [];
    const ids: string[] = [];

    if (!selector) return { tags, classes, ids };

    try {
      const ast = csstree.parse(selector, { context: 'selector' });
      csstree.walk(ast, (node: any) => {
        if (node.type === 'TypeSelector') {
          tags.push(node.name || '');
        } else if (node.type === 'ClassSelector') {
          classes.push(node.name || '');
        } else if (node.type === 'IdSelector') {
          ids.push(node.name || '');
        }
      });
    } catch (e) {
      const tagMatch = selector.match(/^[\w-]+|\*/);
      if (tagMatch) tags.push(tagMatch[0]);

      const classMatches = selector.match(/\.([\w-]+)/g) || [];
      for (const m of classMatches) classes.push(m.slice(1));

      const idMatches = selector.match(/#([\w-]+)/g) || [];
      for (const m of idMatches) ids.push(m.slice(1));
    }

    return { tags, classes, ids };
  }

  private doesMatch(ruleSelector: string, targetElements: Array<{ tags: string[]; classes: string[]; ids: string[] }>, ruleLine: number): boolean {
    for (const target of targetElements) {
      if (this.simpleMatch(ruleSelector, target)) {
        return true;
      }
    }
    return false;
  }

  private simpleMatch(ruleSelector: string, target: { tags: string[]; classes: string[]; ids: string[] }): boolean {
    if (ruleSelector === '*') return true;
    if (ruleSelector === '') return false;

    const ruleParts = ruleSelector.split(/\s+(?![^(]*\))/).filter(Boolean);
    if (ruleParts.length === 0) return false;

    const lastRulePart = ruleParts[ruleParts.length - 1];
    const ruleElement = this.parseSimpleSelector(lastRulePart);

    if (ruleElement.tags.length > 0 && target.tags.length > 0) {
      const ruleTag = ruleElement.tags[0].toLowerCase();
      const targetTag = target.tags[0].toLowerCase();
      if (ruleTag !== '*' && ruleTag !== targetTag) {
        return false;
      }
    }

    for (const cls of ruleElement.classes) {
      if (!target.classes.includes(cls)) {
        return false;
      }
    }

    for (const id of ruleElement.ids) {
      if (!target.ids.includes(id)) {
        return false;
      }
    }

    return true;
  }

  private compareStylePriority(a: TracedStyle, b: TracedStyle): number {
    if (a.important !== b.important) {
      return a.important ? -1 : 1;
    }

    const aWeight = this.weightCalculator.calculateSingleSelector(a.selector);
    const bWeight = this.weightCalculator.calculateSingleSelector(b.selector);

    if (aWeight.idCount !== bWeight.idCount) return bWeight.idCount - aWeight.idCount;
    if (aWeight.classCount !== bWeight.classCount) return bWeight.classCount - aWeight.classCount;
    if (aWeight.tagCount !== bWeight.tagCount) return bWeight.tagCount - aWeight.tagCount;

    return 0;
  }

  sortRulesBySpecificity(rules: ParsedCSSRule[]): Array<{ rule: ParsedCSSRule; weight: WeightResult }> {
    const result: Array<{ rule: ParsedCSSRule; weight: WeightResult }> = [];

    for (const rule of rules) {
      const weight = this.weightCalculator.calculateRule(rule.selector).total;
      result.push({ rule, weight });
    }

    result.sort((a, b) => b.weight.numericValue - a.weight.numericValue);

    return result;
  }
}

export default StyleTracer;
