import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { ChevronDown, ChevronRight, Copy, Check, Download, Filter } from 'lucide-react';
import type { AuditIssue, FixSuggestion, Severity, FilterState } from '@/types';
import { eventBus } from './EventBus';

interface SidebarProps {
  tabId: string;
  issues: AuditIssue[];
  suggestions: Record<string, FixSuggestion[]>;
  filterState: FilterState;
  onFilterChange: (filter: FilterState) => void;
  onIssueFixedChange: (issueId: string, fixed: boolean) => void;
  htmlCode: string;
}

const severityInfo: Record<Severity, { color: string; label: string; icon: string; bgColor: string }> = {
  critical: { color: '#F44336', label: '严重', icon: '⛔', bgColor: 'rgba(244,67,54,0.08)' },
  medium: { color: '#FFC107', label: '中等', icon: '⚠️', bgColor: 'rgba(255,193,7,0.08)' },
  low: { color: '#2196F3', label: '低危', icon: 'ℹ️', bgColor: 'rgba(33,150,243,0.08)' },
};

const severityOrder: Record<Severity, number> = { critical: 0, medium: 1, low: 2 };

export const Sidebar: React.FC<SidebarProps> = ({
  tabId,
  issues,
  suggestions,
  filterState,
  onFilterChange,
  onIssueFixedChange,
  htmlCode,
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [customOrder, setCustomOrder] = useState<string[]>([]);
  const currentTabRef = useRef(tabId);

  useEffect(() => {
    currentTabRef.current = tabId;
  }, [tabId]);

  useEffect(() => {
    setExpandedIds(new Set());
    setCustomOrder([]);
  }, [tabId]);

  const availableSeverities = useMemo(
    () => Array.from(new Set(issues.map((i) => i.severity))).sort((a, b) => severityOrder[a] - severityOrder[b]),
    [issues]
  );

  const availableTagNames = useMemo(
    () => Array.from(new Set(issues.filter((i) => i.tagName).map((i) => i.tagName!))).sort(),
    [issues]
  );

  const availableWcag = useMemo(
    () => Array.from(new Set(issues.map((i) => i.wcagCriterion))).sort(),
    [issues]
  );

  const filteredIssues = useMemo(() => {
    let list = issues.filter((issue) => {
      if (filterState.severities.length > 0 && !filterState.severities.includes(issue.severity)) return false;
      if (filterState.tagNames.length > 0 && (!issue.tagName || !filterState.tagNames.includes(issue.tagName))) return false;
      if (filterState.wcagCriteria.length > 0 && !filterState.wcagCriteria.includes(issue.wcagCriterion)) return false;
      return true;
    });

    if (customOrder.length > 0) {
      list = [...list].sort((a, b) => {
        const idxA = customOrder.indexOf(a.id);
        const idxB = customOrder.indexOf(b.id);
        if (idxA === -1 && idxB === -1) {
          if (a.severity !== b.severity) return severityOrder[a.severity] - severityOrder[b.severity];
          return a.domOrder - b.domOrder;
        }
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        return idxA - idxB;
      });
    } else {
      list = [...list].sort((a, b) => {
        if (a.severity !== b.severity) return severityOrder[a.severity] - severityOrder[b.severity];
        return a.domOrder - b.domOrder;
      });
    }

    return list;
  }, [issues, filterState, customOrder]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        eventBus.emit('highlight-click', {
          tabId: currentTabRef.current,
          issueId: id,
          selector: issues.find((i) => i.id === id)?.selector || '',
        });
      }
      return next;
    });
  }, [issues]);

  const handleCopy = useCallback(async (suggestionId: string, code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(suggestionId);
      eventBus.emit('copy-success', { tabId: currentTabRef.current, suggestionId });
      setTimeout(() => setCopiedId(null), 500);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  }, []);

  const toggleFilter = useCallback(
    (key: 'severities' | 'tagNames' | 'wcagCriteria', value: string) => {
      onFilterChange({
        ...filterState,
        [key]: filterState[key].includes(value as Severity & string)
          ? filterState[key].filter((v) => v !== value)
          : [...filterState[key], value],
      });
    },
    [filterState, onFilterChange]
  );

  const clearFilters = useCallback(() => {
    onFilterChange({ severities: [], tagNames: [], wcagCriteria: [] });
  }, [onFilterChange]);

  const handleExport = useCallback(() => {
    if (isExporting) return;
    setIsExporting(true);
    setExportProgress(0);

    const unfixedIssues = issues.filter((i) => !i.fixed);
    const report = {
      timestamp: new Date().toISOString(),
      htmlSummary: htmlCode.substring(0, 200),
      totalIssues: unfixedIssues.length,
      issues: unfixedIssues.map((issue) => ({
        selector: issue.selector,
        errorType: issue.type,
        wcagCriterion: `${issue.wcagCriterion} (Level ${issue.wcagLevel})`,
        currentValue: issue.currentValue,
        severity: issue.severity,
      })),
    };

    const progressSteps = [10, 30, 55, 80, 100];
    let step = 0;
    const interval = setInterval(() => {
      if (step < progressSteps.length) {
        setExportProgress(progressSteps[step]);
        step++;
      } else {
        clearInterval(interval);
      }
    }, 60);

    setTimeout(() => {
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

      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
      }, 300);
    }, 350);

    eventBus.emit('export-report', { tabId: currentTabRef.current });
  }, [issues, htmlCode, isExporting]);

  const handleDragStart = useCallback((e: React.DragEvent, issueId: string) => {
    setDraggedId(issueId);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, issueId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (issueId !== draggedId && issueId !== dragOverId) {
      setDragOverId(issueId);
    }
  }, [draggedId, dragOverId]);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      if (draggedId && draggedId !== targetId) {
        const currentOrder = customOrder.length > 0
          ? customOrder.filter((id) => filteredIssues.some((i) => i.id === id))
          : filteredIssues.map((i) => i.id);

        const draggedIdx = currentOrder.indexOf(draggedId);
        const targetIdx = currentOrder.indexOf(targetId);
        if (draggedIdx !== -1 && targetIdx !== -1) {
          const newOrder = [...currentOrder];
          newOrder.splice(draggedIdx, 1);
          newOrder.splice(targetIdx, 0, draggedId);
          setCustomOrder(newOrder);
        }
      }
      setDraggedId(null);
      setDragOverId(null);
    },
    [draggedId, filteredIssues, customOrder]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
    setDragOverId(null);
  }, []);

  const stats = useMemo(() => ({
    critical: issues.filter((i) => i.severity === 'critical' && !i.fixed).length,
    medium: issues.filter((i) => i.severity === 'medium' && !i.fixed).length,
    low: issues.filter((i) => i.severity === 'low' && !i.fixed).length,
    fixed: issues.filter((i) => i.fixed).length,
  }), [issues]);

  const issueIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    issues.forEach((issue, idx) => map.set(issue.id, idx + 1));
    return map;
  }, [issues]);

  const filterCount = filterState.severities.length + filterState.tagNames.length + filterState.wcagCriteria.length;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#fff',
        borderLeft: '1px solid var(--color-border)',
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
        }}
      >
        <div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#333', marginBottom: '4px' }}>
            检测结果
          </div>
          <div style={{ display: 'flex', gap: '10px', fontSize: '12px', color: '#666' }}>
            <span style={{ color: severityInfo.critical.color }}>⛔ {stats.critical}</span>
            <span style={{ color: severityInfo.medium.color }}>⚠️ {stats.medium}</span>
            <span style={{ color: severityInfo.low.color }}>ℹ️ {stats.low}</span>
            {stats.fixed > 0 && <span style={{ color: '#4CAF50' }}>✓ {stats.fixed}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setShowFilters((v) => !v)}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              padding: '6px 10px',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              backgroundColor: filterCount > 0 ? 'var(--color-active-line)' : 'white',
              cursor: 'pointer',
              transition: 'all 0.3s ease-out',
              fontSize: '12px',
              color: '#666',
              gap: '4px',
            }}
            title="过滤"
          >
            <Filter size={14} />
            {filterCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-primary)',
                  color: 'white',
                  fontSize: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {filterCount}
              </span>
            )}
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '6px 12px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: isExporting ? '#90CAF9' : 'var(--color-primary)',
              color: 'white',
              cursor: isExporting ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.3s ease-out',
              fontSize: '12px',
              fontWeight: 500,
              gap: '4px',
            }}
            onMouseEnter={(e) => !isExporting && (e.currentTarget.style.backgroundColor = 'var(--color-primary-dark)')}
            onMouseLeave={(e) => !isExporting && (e.currentTarget.style.backgroundColor = 'var(--color-primary)')}
          >
            <Download size={14} />
            导出报告
          </button>
        </div>
      </div>

      {isExporting && (
        <div style={{ padding: '4px 16px', borderBottom: '1px solid var(--color-border)' }}>
          <div
            style={{
              height: '4px',
              backgroundColor: '#E8F5E9',
              borderRadius: '2px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${exportProgress}%`,
                backgroundColor: 'var(--color-success)',
                transition: 'width 0.1s linear',
              }}
            />
          </div>
        </div>
      )}

      {showFilters && (
        <div
          className="animate-[fade-in_0.2s_ease-out]"
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--color-border)',
            backgroundColor: '#fafafa',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {[
            { key: 'severities' as const, label: '严重等级', options: availableSeverities, format: (v: string) => `${severityInfo[v as Severity].icon} ${severityInfo[v as Severity].label}` },
            { key: 'tagNames' as const, label: '标签名', options: availableTagNames, format: (v: string) => `<${v}>` },
            { key: 'wcagCriteria' as const, label: 'WCAG准则', options: availableWcag, format: (v: string) => v },
          ].map(({ key, label, options, format }) => (
            <div key={key}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>{label}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {options.length === 0 ? (
                  <span style={{ fontSize: '12px', color: '#999' }}>无</span>
                ) : (
                  options.map((opt) => {
                    const selected = filterState[key].includes(opt as Severity & string);
                    return (
                      <button
                        key={opt}
                        onClick={() => toggleFilter(key, opt)}
                        style={{
                          padding: '3px 8px',
                          fontSize: '11px',
                          borderRadius: '4px',
                          border: `1px solid ${selected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                          backgroundColor: selected ? 'var(--color-active-line)' : 'white',
                          color: selected ? 'var(--color-primary)' : '#666',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease-out',
                        }}
                      >
                        {format(opt)}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          ))}
          {filterCount > 0 && (
            <button
              onClick={clearFilters}
              style={{
                alignSelf: 'flex-end',
                border: 'none',
                backgroundColor: 'transparent',
                color: 'var(--color-primary)',
                fontSize: '12px',
                cursor: 'pointer',
                padding: '2px 4px',
              }}
            >
              清除所有过滤
            </button>
          )}
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {filteredIssues.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#999',
              fontSize: '13px',
              gap: '8px',
            }}
          >
            <div style={{ fontSize: '36px' }}>🎯</div>
            <div>
              {issues.length === 0
                ? '暂无检测结果，粘贴HTML代码开始扫描'
                : '没有符合过滤条件的问题'}
            </div>
          </div>
        ) : (
          filteredIssues.map((issue) => {
            const info = severityInfo[issue.severity];
            const isExpanded = expandedIds.has(issue.id);
            const issueSuggestions = suggestions[issue.id] || [];
            const displayIndex = issueIndexMap.get(issue.id) || 0;
            const isDragging = draggedId === issue.id;
            const isDragOver = dragOverId === issue.id;

            return (
              <div
                key={issue.id}
                draggable
                onDragStart={(e) => handleDragStart(e, issue.id)}
                onDragOver={(e) => handleDragOver(e, issue.id)}
                onDrop={(e) => handleDrop(e, issue.id)}
                onDragEnd={handleDragEnd}
                className={`issue-card animate-[fade-in_0.2s_ease-out] ${isDragging ? 'dragging' : ''}`}
                style={{
                  marginBottom: '8px',
                  borderRadius: '6px',
                  border: `1px solid ${isDragOver ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  backgroundColor: issue.fixed ? '#F1F8E9' : isDragOver ? 'var(--color-drag-bg)' : 'white',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease-out',
                  cursor: isDragging ? 'grabbing' : 'grab',
                  opacity: isDragging ? 0.6 : 1,
                  transform: isDragging ? 'scale(1.02)' : undefined,
                }}
              >
                <div
                  onClick={() => toggleExpand(issue.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'stretch',
                    minHeight: '56px',
                    transition: 'background-color 0.3s ease-out',
                  }}
                  onMouseEnter={(e) => !issue.fixed && (e.currentTarget.style.backgroundColor = 'var(--color-sidebar-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div
                    style={{
                      width: '4px',
                      backgroundColor: issue.fixed ? '#4CAF50' : info.color,
                      flexShrink: 0,
                    }}
                  />
                  <div
                    style={{
                      flex: 1,
                      padding: '10px 10px 10px 12px',
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'flex-start',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '13px',
                          lineHeight: 1.4,
                          color: issue.fixed ? '#689F38' : '#333',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          textDecoration: issue.fixed ? 'line-through' : 'none',
                        }}
                      >
                        <span style={{ marginRight: '4px' }}>{info.icon}</span>
                        {issue.description}
                      </div>
                      <div
                        style={{
                          marginTop: '4px',
                          fontSize: '11px',
                          color: 'var(--color-text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontFamily: 'Monaco, Consolas, monospace',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <span
                          style={{
                            padding: '1px 6px',
                            backgroundColor: info.bgColor,
                            color: info.color,
                            borderRadius: '3px',
                            fontWeight: 500,
                          }}
                        >
                          WCAG {issue.wcagCriterion}
                        </span>
                        <span>{issue.selector}</span>
                      </div>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: '#999',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: '#f0f0f0',
                        }}
                      >
                        #{displayIndex}
                      </span>
                      {isExpanded ? (
                        <ChevronDown size={16} color="#999" />
                      ) : (
                        <ChevronRight size={16} color="#999" />
                      )}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div
                    className="animate-[fade-in_0.2s_ease-out]"
                    style={{
                      padding: '12px 12px 12px 26px',
                      borderTop: '1px solid var(--color-border)',
                      backgroundColor: '#fafafa',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        修复建议 ({issueSuggestions.length})
                      </div>
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '12px',
                          color: issue.fixed ? '#4CAF50' : '#666',
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={!!issue.fixed}
                          onChange={(e) => onIssueFixedChange(issue.id, e.target.checked)}
                          style={{ accentColor: 'var(--color-success)' }}
                        />
                        标记已修复
                      </label>
                    </div>

                    {issueSuggestions.length === 0 ? (
                      <div style={{ fontSize: '12px', color: '#999', padding: '8px 0' }}>
                        暂无修复建议
                      </div>
                    ) : (
                      issueSuggestions.map((suggestion) => (
                        <div
                          key={suggestion.id}
                          style={{
                            marginBottom: '10px',
                            padding: '10px',
                            borderRadius: '6px',
                            border: '1px solid var(--color-border)',
                            backgroundColor: 'white',
                          }}
                        >
                          <div style={{ fontSize: '12px', fontWeight: 500, color: '#333', marginBottom: '8px' }}>
                            💡 {suggestion.title}
                          </div>
                          <div
                            style={{
                              borderRadius: '4px',
                              overflow: 'hidden',
                              border: '1px solid var(--color-border)',
                            }}
                          >
                            <Editor
                              height="auto"
                              defaultLanguage="html"
                              value={suggestion.codeSnippet}
                              theme="vs-light"
                              options={{
                                fontSize: 12,
                                lineHeight: 18,
                                minimap: { enabled: false },
                                scrollBeyondLastLine: false,
                                readOnly: true,
                                lineNumbers: 'off',
                                glyphMargin: false,
                                folding: false,
                                renderLineHighlight: 'none',
                                wordWrap: 'on',
                                padding: { top: 8, bottom: 8 },
                              }}
                            />
                          </div>
                          <div style={{ fontSize: '11px', color: '#888', marginTop: '8px', lineHeight: 1.5 }}>
                            {suggestion.explanation}
                          </div>
                          <button
                            onClick={() => handleCopy(suggestion.id, suggestion.codeSnippet)}
                            className={copiedId === suggestion.id ? 'copy-btn-success' : ''}
                            style={{
                              marginTop: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '5px 10px',
                              fontSize: '11px',
                              borderRadius: '4px',
                              border: '1px solid var(--color-border)',
                              backgroundColor: copiedId === suggestion.id ? '#E8F5E9' : 'white',
                              color: copiedId === suggestion.id ? '#4CAF50' : '#666',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease-out',
                            }}
                          >
                            {copiedId === suggestion.id ? (
                              <>
                                <Check size={12} />
                                <span style={{ fontWeight: 500 }}>👍 已复制</span>
                              </>
                            ) : (
                              <>
                                <Copy size={12} />
                                复制代码
                              </>
                            )}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Sidebar;
