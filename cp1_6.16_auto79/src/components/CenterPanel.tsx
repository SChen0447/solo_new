import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { eventBus } from '../core/EventBus';
import { CSSParser } from '../core/CSSParser';
import { WeightCalculator } from '../core/WeightCalculator';
import { ParsedCSSRule, ParseError, WeightResult } from '../core/types';

interface SortedRule {
  rule: ParsedCSSRule;
  weight: WeightResult;
}

const CenterPanel: React.FC = () => {
  const [css, setCss] = useState<string>(`body {
  margin: 0;
  padding: 0;
  font-family: Arial, sans-serif;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

#header {
  background: #333;
  color: #fff;
}

.navbar .nav-item {
  padding: 10px 20px;
}

div.container .item#header {
  font-weight: bold;
  color: #FF8C00;
}

.card.featured .card-title:hover {
  transform: scale(1.05);
}

div.wrapper p.text {
  font-size: 16px;
  line-height: 1.5;
  color: #2196F3;
}`);
  const [errors, setErrors] = useState<ParseError[]>([]);
  const [sortedRules, setSortedRules] = useState<SortedRule[]>([]);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null);
  const [traceSelector, setTraceSelector] = useState<string>('div.wrapper p.text');
  const [isParsing, setIsParsing] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const parserRef = useRef(new CSSParser());
  const weightCalcRef = useRef(new WeightCalculator());
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rankingRef = useRef<HTMLDivElement>(null);

  const parseCSS = useCallback((cssContent: string) => {
    const start = performance.now();
    const result = parserRef.current.parse(cssContent);
    const duration = performance.now() - start;

    if (duration > 200) {
      console.warn(`[CSSParser] 解析耗时 ${duration.toFixed(1)}ms，超过200ms目标`);
    }

    setErrors(result.errors);

    const weightStart = performance.now();
    const rulesForCalc = result.rules.map((r) => ({ id: r.id, selector: r.selector }));
    const weightResults = weightCalcRef.current.batchCalculate(rulesForCalc);
    const weightDuration = performance.now() - weightStart;

    if (result.rules.length > 0 && weightDuration > 50) {
      console.warn(`[WeightCalculator] 批量计算耗时 ${weightDuration.toFixed(1)}ms，超过50ms目标`);
    }

    const withWeight: SortedRule[] = result.rules
      .map((rule) => ({
        rule,
        weight: weightResults.get(rule.id) || { idCount: 0, classCount: 0, tagCount: 0, specificity: '0-0-0', numericValue: 0 },
      }))
      .sort((a, b) => b.weight.numericValue - a.weight.numericValue);

    setSortedRules(withWeight);
    eventBus.emit('css:parsed', { result });
    eventBus.emit('rules:updated', { rules: result.rules });
  }, []);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setIsParsing(true);
      parseCSS(css);
      setTimeout(() => setIsParsing(false), 50);
    }, 80);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [css, parseCSS]);

  useEffect(() => {
    const unsub = eventBus.on('node:click', ({ ruleId }) => {
      setSelectedRuleId(ruleId);
      setExpandedRuleId(ruleId);
      setTimeout(() => {
        const el = document.getElementById(`rule-item-${ruleId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    });
    return unsub;
  }, []);

  const handleRuleClick = useCallback((sorted: SortedRule) => {
    setSelectedRuleId(sorted.rule.id);
    const weight = sorted.weight;
    const tree = weightCalcRef.current.buildSelectorTree(sorted.rule.selector, sorted.rule.id);
    eventBus.emit('rule:select', { rule: sorted.rule });
    eventBus.emit('rule:weight-calculated', { rule: sorted.rule, weight, tree });
  }, []);

  const handleExpandClick = useCallback((ruleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedRuleId((prev) => (prev === ruleId ? null : ruleId));
  }, []);

  const handleTrace = useCallback(() => {
    if (!traceSelector.trim()) return;
    const allRules = sortedRules.map((sr) => sr.rule);
    eventBus.emit('selector:trace', { selector: traceSelector, rules: allRules });
  }, [traceSelector, sortedRules]);

  useEffect(() => {
    if (sortedRules.length > 0) {
      handleRuleClick(sortedRules[0]);
      if (traceSelector) {
        setTimeout(() => handleTrace(), 200);
      }
    }
  }, [sortedRules.length > 0]);

  const errorLineMap = useMemo(() => {
    const map = new Map<number, ParseError[]>();
    for (const err of errors) {
      if (!map.has(err.line)) map.set(err.line, []);
      map.get(err.line)!.push(err);
    }
    return map;
  }, [errors]);

  const lineNumbers = useMemo(() => {
    const lines = css.split('\n').length;
    return Array.from({ length: lines }, (_, i) => i + 1);
  }, [css]);

  const truncate = (str: string, len: number): string => {
    if (str.length <= len) return str;
    return str.substring(0, len) + '...';
  };

  const renderWeightDots = (weight: WeightResult, small = false) => {
    const dots: React.ReactNode[] = [];
    const size = small ? '6px' : '10px';
    const gap = small ? '2px' : '4px';

    for (let i = 0; i < weight.idCount; i++) {
      dots.push(
        <span
          key={`id-${i}`}
          className="weight-dot id-dot"
          style={{
            width: size,
            height: size,
            backgroundColor: '#FF8C00',
            borderRadius: '50%',
            display: 'inline-block',
          }}
          title={`ID:${weight.idCount}`}
        />
      );
    }
    for (let i = 0; i < weight.classCount; i++) {
      dots.push(
        <span
          key={`cls-${i}`}
          className="weight-dot class-dot"
          style={{
            width: size,
            height: size,
            backgroundColor: '#2196F3',
            borderRadius: '50%',
            display: 'inline-block',
          }}
          title={`类/属性:${weight.classCount}`}
        />
      );
    }
    for (let i = 0; i < weight.tagCount; i++) {
      dots.push(
        <span
          key={`tag-${i}`}
          className="weight-dot tag-dot"
          style={{
            width: size,
            height: size,
            backgroundColor: '#4CAF50',
            borderRadius: '50%',
            display: 'inline-block',
          }}
          title={`标签:${weight.tagCount}`}
        />
      );
    }

    if (dots.length === 0) {
      return <span className="no-weight">无权重</span>;
    }

    return (
      <div className="weight-dots" style={{ display: 'flex', gap, alignItems: 'center' }}>
        {dots}
      </div>
    );
  };

  return (
    <div className="center-panel">
      <div className="input-section">
        <div className="section-header">
          <h3>CSS 代码输入</h3>
          <div className="status-bar">
            {isParsing && <span className="parsing-indicator">解析中...</span>}
            {!isParsing && errors.length > 0 && <span className="error-count">⚠ {errors.length} 个错误</span>}
            {!isParsing && errors.length === 0 && sortedRules.length > 0 && (
              <span className="success-count">✓ 解析 {sortedRules.length} 条规则</span>
            )}
          </div>
        </div>

        <div className="css-input-container">
          <div className="line-numbers">
            {lineNumbers.map((num) => (
              <div
                key={num}
                className={`line-number ${errorLineMap.has(num) ? 'error-line' : ''}`}
                title={errorLineMap.has(num) ? errorLineMap.get(num)!.map((e) => e.message).join('; ') : undefined}
              >
                {num}
              </div>
            ))}
          </div>
          <textarea
            ref={textareaRef}
            className="css-textarea"
            value={css}
            onChange={(e) => setCss(e.target.value)}
            placeholder="在此粘贴CSS样式代码..."
            spellCheck={false}
          />
        </div>

        {errors.length > 0 && (
          <div className="errors-list">
            {errors.slice(0, 10).map((err, idx) => (
              <div key={idx} className="error-item">
                <span className="error-line-badge">L{err.line}:{err.column}</span>
                <span className="error-message">{err.message}</span>
              </div>
            ))}
            {errors.length > 10 && <div className="error-more">还有 {errors.length - 10} 个错误...</div>}
          </div>
        )}
      </div>

      <div className="rules-section">
        <div className="section-header">
          <h3>权重排行榜 ({sortedRules.length})</h3>
        </div>

        <div className="trace-input-row">
          <input
            type="text"
            className="trace-input"
            value={traceSelector}
            onChange={(e) => setTraceSelector(e.target.value)}
            placeholder="输入元素选择器进行样式溯源..."
            onKeyDown={(e) => e.key === 'Enter' && handleTrace()}
          />
          <button className="trace-btn" onClick={handleTrace}>
            溯源
          </button>
        </div>

        <div className="ranking-container" ref={rankingRef}>
          {sortedRules.length === 0 && (
            <div className="empty-state">暂无规则，请在上方粘贴CSS代码</div>
          )}

          {sortedRules.map((sorted, index) => {
            const isSelected = selectedRuleId === sorted.rule.id;
            const isExpanded = expandedRuleId === sorted.rule.id;

            return (
              <div
                key={sorted.rule.id}
                id={`rule-item-${sorted.rule.id}`}
                className={`ranking-item ${isSelected ? 'selected' : ''}`}
                onClick={() => handleRuleClick(sorted)}
              >
                <div className="ranking-arrow">{isSelected && '◀'}</div>
                <div className="ranking-index">#{index + 1}</div>
                <div className="ranking-content">
                  <div className="ranking-main">
                    <div className="ranking-selector" title={sorted.rule.selector}>
                      {truncate(sorted.rule.selector, 30)}
                    </div>
                    <div className="ranking-meta">
                      <span className="specificity-badge">[{sorted.weight.specificity}]</span>
                      {renderWeightDots(sorted.weight, true)}
                    </div>
                  </div>
                  <div className="ranking-sub">
                    <span className="line-info">L{sorted.rule.line}</span>
                    <span className="decl-count">{sorted.rule.declarations.length} 声明</span>
                    <button
                      className="expand-btn"
                      onClick={(e) => handleExpandClick(sorted.rule.id, e)}
                    >
                      {isExpanded ? '收起 ▲' : '展开 ▼'}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="expanded-declarations">
                      {sorted.rule.declarations.map((decl, dIdx) => (
                        <div key={dIdx} className="decl-item">
                          <span className="decl-property">{decl.property}:</span>
                          <span className="decl-value">{decl.value}</span>
                          {decl.important && <span className="decl-important">!important</span>}
                          <span className="decl-semi">;</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CenterPanel;
