import * as csstree from 'css-tree';
import { ParsedCSSRule, CSSDeclaration, ParseError, ParseResult } from './types';

export class CSSParser {
  private generateId(): string {
    return 'rule-' + Math.random().toString(36).substring(2, 11);
  }

  private getLineNumber(css: string, offset: number): number {
    return css.substring(0, offset).split('\n').length;
  }

  private getColumnNumber(css: string, offset: number): number {
    const before = css.substring(0, offset);
    const lastNewline = before.lastIndexOf('\n');
    return lastNewline === -1 ? offset + 1 : offset - lastNewline;
  }

  parse(css: string): ParseResult {
    const rules: ParsedCSSRule[] = [];
    const errors: ParseError[] = [];

    if (!css || !css.trim()) {
      return { rules, errors };
    }

    try {
      const ast = csstree.parse(css, {
        positions: true,
        onParseError: (error: any) => {
          const line = this.getLineNumber(css, error.offset || 0);
          const column = this.getColumnNumber(css, error.offset || 0);
          errors.push({
            line,
            column,
            message: this.formatErrorMessage(error.message || error.rawMessage || '未知语法错误'),
            rawMessage: error.message || error.rawMessage || '',
          });
        },
      });

      csstree.walk(ast, {
        visit: 'Rule',
        enter: (node: any) => {
          try {
            if (!node.prelude || node.prelude.type !== 'SelectorList') return;

            const selector = csstree.generate(node.prelude);
            if (!selector.trim()) return;

            const declarations: CSSDeclaration[] = [];
            let ruleStart = node.prelude.loc ? node.prelude.loc.end.offset : 0;
            const block = node.block;

            if (block && block.children) {
              block.children.forEach((child: any) => {
                if (child.type === 'Declaration') {
                  const property = child.property;
                  let value = '';
                  let important = false;

                  if (child.value) {
                    value = csstree.generate(child.value);
                    if (value.endsWith('!important')) {
                      important = true;
                      value = value.replace(/\s*!important\s*$/, '').trim();
                    }
                  }

                  if (child.important) {
                    important = true;
                  }

                  declarations.push({ property, value, important });
                }
              });
            }

            const raw = csstree.generate(node);
            const line = node.loc ? node.loc.start.line : 1;

            rules.push({
              id: this.generateId(),
              selector: selector.trim(),
              declarations,
              line,
              raw,
            });
          } catch (e) {
            // Skip invalid rules
          }
        },
      });
    } catch (err: any) {
      errors.push({
        line: 1,
        column: 1,
        message: this.formatErrorMessage(err.message || 'CSS解析失败'),
        rawMessage: err.message || '',
      });
    }

    return { rules, errors };
  }

  private formatErrorMessage(msg: string): string {
    if (msg.includes('missing') && (msg.includes(';') || msg.includes('semicolon'))) {
      return '缺少分号';
    }
    if (msg.includes('missing') && msg.includes('}')) {
      return '缺少闭合大括号';
    }
    if (msg.includes('missing') && msg.includes('{')) {
      return '缺少开括号';
    }
    if (msg.includes('Unexpected')) {
      return '意外的字符或关键字';
    }
    if (msg.includes('Invalid')) {
      return '无效的语法';
    }
    return msg.length > 50 ? msg.substring(0, 50) + '...' : msg;
  }

  validate(css: string): ParseError[] {
    const errors: ParseError[] = [];

    try {
      csstree.parse(css, {
        positions: true,
        onParseError: (error: any) => {
          const line = this.getLineNumber(css, error.offset || 0);
          const column = this.getColumnNumber(css, error.offset || 0);
          errors.push({
            line,
            column,
            message: this.formatErrorMessage(error.message || error.rawMessage || '未知语法错误'),
            rawMessage: error.message || error.rawMessage || '',
          });
        },
      });
    } catch (err: any) {
      errors.push({
        line: 1,
        column: 1,
        message: this.formatErrorMessage(err.message || 'CSS解析失败'),
        rawMessage: err.message || '',
      });
    }

    return errors;
  }
}

export default CSSParser;
