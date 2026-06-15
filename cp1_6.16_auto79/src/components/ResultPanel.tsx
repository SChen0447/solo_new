import React, { useState, useEffect, useMemo } from 'react';
import { eventBus } from '../core/EventBus';
import { ParsedCSSRule, WeightResult, SelectorNode, TracedStyle } from '../core/types';

const ResultPanel: React.FC = () => {
  const [selectedRule, setSelectedRule] = useState<ParsedCSSRule | null>(null);
  const [currentWeight, setCurrentWeight] = useState<WeightResult | null>(null);
  const [selectorTree, setSelectorTree] = useState<SelectorNode[]>([]);
  const [tracedStyles, setTracedStyles] = useState<TracedStyle[]>([]);
  const [matchedRules, setMatchedRules] = useState<ParsedCSSRule[]>([]);
  const [traceTarget, setTraceTarget] = useState<string>('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'weight' | 'trace'>('weight');

  useEffect(() => {
    const unsub1 = eventBus.on('rule:weight-calculated', ({ rule, weight, tree }) => {
      setSelectedRule(rule);
      setCurrentWeight(weight);
      setSelectorTree(tree);
      setExpandedNodes(new Set([tree[0]?.id || '']));
      setActiveTab('weight');
    });

    const unsub2 = eventBus.on('selector:traced', ({ styles, matchedRules: mr }) => {
      setTracedStyles(styles);
      setMatchedRules(mr);
      setActiveTab('trace');
    });

    const unsub3 = eventBus.on('selector:trace', ({ selector }) => {
      setTraceTarget(selector);
    });

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, []);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const handleNodeClick = (node: SelectorNode, e: React.MouseEvent) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).style.transform = 'scale(0.95)';
    (e.currentTarget as HTMLElement).style.backgroundColor = '#383838';
    setTimeout(() => {
      (e.currentTarget as HTMLElement).style.transform = '';
      (e.currentTarget as HTMLElement).style.backgroundColor = '';
    }, 200);

    if (node.ruleId) {
      eventBus.emit('node:click', { ruleId: node.ruleId });
    }
    if (node.children && node.children.length > 0) {
      toggleNode(node.id);
    }
  };

  const getNodeColor = (type: SelectorNode['type']): string => {
    switch (type) {
      case 'id':
        return '#FF8C00';
      case 'class':
      case 'pseudo-class':
      case 'attribute':
        return '#2196F3';
      case 'tag':
      case 'pseudo-element':
        return '#4CAF50';
      case 'combinator':
        return '#888';
      default:
        return '#999';
    }
  };

  const getNodeTypeName = (type: SelectorNode['type']): string => {
    switch (type) {
      case 'id':
        return 'ID';
      case 'class':
        return '类';
      case 'pseudo-class':
        return '伪类';
      case 'pseudo-element':
        return '伪元素';
      case 'attribute':
        return '属性';
      case 'tag':
        return '标签';
      case 'combinator':
        return '关系符';
      default:
        return '未知';
    }
  };

  const renderTreeNode = (node: SelectorNode, depth: number = 0): React.ReactNode => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);

    return (
      <div key={node.id} className="tree-node-wrapper" style={{ paddingLeft: depth * 20 }}>
        <div
          className={`tree-node ${hasChildren ? 'has-children' : ''} ${isExpanded ? 'expanded' : ''}`}
          onClick={(e) => handleNodeClick(node, e)}
          title={node.ruleId ? `点击跳转至规则` : node.value}
        >
          {hasChildren && <span className="tree-toggle">{isExpanded ? '▼' : '▶'}</span>}
          <span className="tree-node-type-indicator" style={{ backgroundColor: getNodeColor(node.type) }} />
          <span className="tree-node-value">{node.value}</span>
          <span className="tree-node-type-badge" style={{ borderColor: getNodeColor(node.type), color: getNodeColor(node.type) }}>
            {getNodeTypeName(node.type)}
          </span>
          {node.weight.numericValue > 0 && (
            <span className="tree-node-weight">[{node.weight.specificity}]</span>
          )}
        </div>
        {hasChildren && isExpanded && (
          <div className="tree-children">
            {node.children!.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const groupedStyles = useMemo(() => {
    const groups = new Map<string, TracedStyle[]>();
    for (const style of tracedStyles) {
      if (!groups.has(style.property)) groups.set(style.property, []);
      groups.get(style.property)!.push(style);
    }
    return groups;
  }, [tracedStyles]);

  const renderWeightVisualization = () => {
    if (!currentWeight || !selectedRule) {
      return <div className="empty-state">请选择一条规则查看权重详情</div>;
    }

    const total = Math.max(currentWeight.idCount + currentWeight.classCount + currentWeight.tagCount, 1);
    const idPct = (currentWeight.idCount / total) * 100;
    const classPct = (currentWeight.classCount / total) * 100;
    const tagPct = (currentWeight.tagCount / total) * 100;

    return (
      <div className="weight-detail">
        <div className="weight-header">
          <div className="rule-selector-preview" title={selectedRule.selector}>
            {selectedRule.selector}
          </div>
          <div className="specificity-display">
            <span className="specificity-number">特异性: {currentWeight.specificity}</span>
            <span className="numeric-value">数值: {currentWeight.numericValue}</span>
          </div>
        </div>

        <div className="weight-bar-chart">
          <div className="weight-bar">
            {idPct > 0 && (
              <div className="weight-bar-segment id-segment" style={{ width: `${idPct}%` }} title={`ID: ${currentWeight.idCount} (${idPct.toFixed(0)}%)`}>
                {currentWeight.idCount > 0 && <span>{currentWeight.idCount}</span>}
              </div>
            )}
            {classPct > 0 && (
              <div className="weight-bar-segment class-segment" style={{ width: `${classPct}%` }} title={`类/属性: ${currentWeight.classCount} (${classPct.toFixed(0)}%)`}>
                {currentWeight.classCount > 0 && <span>{currentWeight.classCount}</span>}
              </div>
            )}
            {tagPct > 0 && (
              <div className="weight-bar-segment tag-segment" style={{ width: `${tagPct}%` }} title={`标签: ${currentWeight.tagCount} (${tagPct.toFixed(0)}%)`}>
                {currentWeight.tagCount > 0 && <span>{currentWeight.tagCount}</span>}
              </div>
            )}
          </div>
          <div className="weight-bar-legend">
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#FF8C00' }} />
              <span className="legend-label">ID 选择器</span>
              <span className="legend-count">{currentWeight.idCount}</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#2196F3' }} />
              <span className="legend-label">类/伪类/属性</span>
              <span className="legend-count">{currentWeight.classCount}</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#4CAF50' }} />
              <span className="legend-label">标签/伪元素</span>
              <span className="legend-count">{currentWeight.tagCount}</span>
            </div>
          </div>
        </div>

        <div className="selector-tree-section">
          <h4 className="section-subtitle">选择器解析树</h4>
          <div className="selector-tree">
            {selectorTree.map((node) => renderTreeNode(node))}
          </div>
        </div>

        <div className="declarations-section">
          <h4 className="section-subtitle">样式声明 ({selectedRule.declarations.length})</h4>
          <div className="declarations-list">
            {selectedRule.declarations.map((decl, idx) => (
              <div key={idx} className="declaration-row">
                <span className="decl-property">{decl.property}:</span>
                <span className="decl-value">{decl.value}</span>
                {decl.important && <span className="decl-important">!important</span>}
                <span className="decl-semi">;</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderTraceResult = () => {
    if (tracedStyles.length === 0) {
      return <div className="empty-state">请输入元素选择器并点击溯源按钮</div>;
    }

    const winnerCount = tracedStyles.filter((s) => s.isWinner).length;

    return (
      <div className="trace-detail">
        <div className="trace-header">
          <div className="trace-target">
            <span className="trace-label">目标元素:</span>
            <code className="trace-selector">{traceTarget}</code>
          </div>
          <div className="trace-summary">
            匹配 <strong>{matchedRules.length}</strong> 条规则 ·
            影响 <strong>{groupedStyles.size}</strong> 个属性 ·
            <strong className="winner-highlight"> {winnerCount}</strong> 个胜出声明
          </div>
        </div>

        <div className="matched-rules-section">
          <h4 className="section-subtitle">匹配规则列表</h4>
          <div className="matched-rules-list">
            {matchedRules.map((rule, idx) => (
              <div key={rule.id} className="matched-rule-item">
                <span className="match-index">#{idx + 1}</span>
                <code className="match-selector" title={rule.selector}>{rule.selector}</code>
                <span className="match-decl-count">{rule.declarations.length} 声明</span>
              </div>
            ))}
          </div>
        </div>

        <div className="styles-section">
          <h4 className="section-subtitle">样式声明明细（高亮为最终应用）</h4>
          <div className="styles-group-list">
            {Array.from(groupedStyles.entries()).map(([prop, styles]) => (
              <div key={prop} className="style-group">
                <div className="style-group-header">
                  <span className="style-property">{prop}</span>
                </div>
                <div className="style-items">
                  {styles.map((style, idx) => (
                    <div
                      key={`${style.ruleId}-${idx}`}
                      className={`style-item ${style.isWinner ? 'winner' : ''}`}
                    >
                      {style.isWinner && <span className="winner-badge">★ 胜出</span>}
                      <div className="style-item-main">
                        <span className="style-property-name">{prop}:</span>
                        <span className="style-property-value">{style.value}</span>
                        <span className="style-semi">;</span>
                      </div>
                      <div className="style-item-meta">
                        <span className={`source-badge source-${style.source}`}>
                          {style.source === 'user' ? '用户定义' : style.source === 'browser' ? '浏览器默认' : '继承'}
                        </span>
                        {style.important && <span className="important-badge">!important</span>}
                        <span className="specificity-badge-mini">[{style.specificity}]</span>
                        <code className="style-selector-mini" title={style.selector}>{style.selector}</code>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="result-panel">
      <div className="result-tabs">
        <button
          className={`tab-btn ${activeTab === 'weight' ? 'active' : ''}`}
          onClick={() => setActiveTab('weight')}
        >
          权重详情
        </button>
        <button
          className={`tab-btn ${activeTab === 'trace' ? 'active' : ''}`}
          onClick={() => setActiveTab('trace')}
        >
          样式溯源
          {tracedStyles.length > 0 && <span className="tab-badge">{groupedStyles.size}</span>}
        </button>
      </div>

      <div className="result-content">
        {activeTab === 'weight' ? renderWeightVisualization() : renderTraceResult()}
      </div>
    </div>
  );
};

export default ResultPanel;
