import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import SuggestionCard from './SuggestionCard';

interface CommentIssue {
  line: number;
  type: 'redundant' | 'inaccurate' | 'missing' | 'offensive' | 'commented-out';
  severity: 'low' | 'medium' | 'high';
  message: string;
  suggestion?: string;
  originalComment?: string;
}

interface FileResult {
  fileName: string;
  filePath: string;
  totalLines: number;
  codeLines: number;
  commentLines: number;
  blankLines: number;
  coverage: number;
  accuracyScore: number;
  issues: CommentIssue[];
  code: string;
  lines: string[];
}

interface OverallResult {
  totalFiles: number;
  totalLines: number;
  totalCodeLines: number;
  totalCommentLines: number;
  overallCoverage: number;
  averageAccuracy: number;
}

interface AnalysisResult {
  overall: OverallResult;
  files: FileResult[];
}

interface ReportViewerProps {
  result: AnalysisResult;
  sessionId: string;
  onResultUpdate: (newResult: AnalysisResult) => void;
}

const ReportViewer: React.FC<ReportViewerProps> = ({ result, sessionId, onResultUpdate }) => {
  const [selectedFile, setSelectedFile] = useState<string>(result.files[0]?.filePath || '');
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);
  const [appliedLines, setAppliedLines] = useState<Set<string>>(new Set());
  const [applyingLine, setApplyingLine] = useState<string | null>(null);
  const [codeFading, setCodeFading] = useState(false);
  const codeContainerRef = useRef<HTMLDivElement>(null);

  const currentFile = useMemo(() => {
    return result.files.find(f => f.filePath === selectedFile) || result.files[0];
  }, [result, selectedFile]);

  useEffect(() => {
    if (result.files.length > 0 && !selectedFile) {
      setSelectedFile(result.files[0].filePath);
    }
  }, [result, selectedFile]);

  const getCoverageColor = (coverage: number) => {
    if (coverage >= 40) return '#4CAF50';
    if (coverage >= 20) return '#FFC107';
    return '#F44336';
  };

  const pieData = useMemo(() => {
    const coverage = result.overall.overallCoverage;
    return [
      { name: '注释代码', value: coverage },
      { name: '无注释代码', value: Math.max(0, 100 - coverage) },
    ];
  }, [result.overall.overallCoverage]);

  const barData = useMemo(() => {
    return result.files.map(file => ({
      name: file.fileName.length > 20 ? file.fileName.substring(0, 17) + '...' : file.fileName,
      fullPath: file.filePath,
      覆盖率: file.coverage,
      fill: getCoverageColor(file.coverage),
    }));
  }, [result.files]);

  const lowAccuracyFiles = useMemo(() => {
    return result.files
      .filter(f => f.accuracyScore < 60)
      .sort((a, b) => a.accuracyScore - b.accuracyScore);
  }, [result.files]);

  const handleBarClick = useCallback((data: any) => {
    if (data && data.fullPath) {
      setSelectedFile(data.fullPath);
      setSelectedLine(null);
      setSidebarVisible(false);
    }
  }, []);

  const handleLineClick = useCallback((lineNumber: number) => {
    const issue = currentFile?.issues.find(i => i.line === lineNumber);
    if (issue) {
      setSelectedLine(lineNumber);
      setSidebarVisible(true);
    }
  }, [currentFile]);

  const getLineClass = (lineNumber: number) => {
    const classes: string[] = [];
    const line = currentFile?.lines[lineNumber - 1] || '';
    const trimmed = line.trim();

    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      classes.push('comment-line');
    }

    const issue = currentFile?.issues.find(i => i.line === lineNumber);
    if (issue) {
      classes.push('issue-line');
      classes.push(`issue-${issue.type}`);
      if (issue.severity === 'high') {
        classes.push('severity-high');
      } else if (issue.severity === 'medium') {
        classes.push('severity-medium');
      }
    }

    if (selectedLine === lineNumber) {
      classes.push('selected-line');
    }

    if (appliedLines.has(`${currentFile?.filePath}-${lineNumber}`)) {
      classes.push('applied-line');
    }

    return classes.join(' ');
  };

  const applySuggestion = async (issue: CommentIssue) => {
    const lineKey = `${currentFile?.filePath}-${issue.line}`;
    setApplyingLine(lineKey);

    try {
      const response = await fetch('/api/apply-suggestion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          filePath: currentFile?.filePath,
          lineNumber: issue.line,
          suggestion: issue.suggestion,
          action: 'apply',
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setCodeFading(true);
        setTimeout(() => {
          setAppliedLines(prev => new Set([...prev, lineKey]));
          if (data.fileResult && data.overall) {
            const newFiles = result.files.map(f =>
              f.filePath === currentFile?.filePath ? data.fileResult : f
            );
            onResultUpdate({
              overall: data.overall,
              files: newFiles,
            });
          }
          setCodeFading(false);
        }, 300);
      }
    } catch (err) {
      console.error('Apply suggestion failed:', err);
    }

    setApplyingLine(null);
  };

  const revertSuggestion = async (issue: CommentIssue) => {
    const lineKey = `${currentFile?.filePath}-${issue.line}`;
    setApplyingLine(lineKey);

    try {
      const response = await fetch('/api/apply-suggestion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          filePath: currentFile?.filePath,
          lineNumber: issue.line,
          suggestion: issue.suggestion,
          action: 'revert',
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setCodeFading(true);
        setTimeout(() => {
          setAppliedLines(prev => {
            const newSet = new Set(prev);
            newSet.delete(lineKey);
            return newSet;
          });
          if (data.fileResult && data.overall) {
            const newFiles = result.files.map(f =>
              f.filePath === currentFile?.filePath ? data.fileResult : f
            );
            onResultUpdate({
              overall: data.overall,
              files: newFiles,
            });
          }
          setCodeFading(false);
        }, 300);
      }
    } catch (err) {
      console.error('Revert suggestion failed:', err);
    }

    setApplyingLine(null);
  };

  const selectedIssue = useMemo(() => {
    if (!selectedLine || !currentFile) return null;
    return currentFile.issues.find(i => i.line === selectedLine);
  }, [selectedLine, currentFile]);

  const toggleIssueExpand = (key: string) => {
    setExpandedIssue(prev => (prev === key ? null : key));
  };

  const getSuggestedCode = (issue: CommentIssue) => {
    const line = currentFile?.lines[issue.line - 1] || '';
    if (issue.type === 'redundant') {
      const commentIndex = line.indexOf('//');
      if (commentIndex !== -1) {
        return line.substring(0, commentIndex).trimEnd();
      }
    }
    return line;
  };

  const CustomPieLabel = ({ cx, cy, percent }: any) => {
    return (
      <text x={cx} y={cy} fill="#D4D4D4" textAnchor="middle" dominantBaseline="middle">
        <tspan fontSize="24" fontWeight="bold">{`${(percent * 100).toFixed(1)}%`}</tspan>
      </text>
    );
  };

  const renderLineNumbers = () => {
    if (!currentFile) return null;
    return currentFile.lines.map((_, index) => (
      <div
        key={index}
        className={`line-number ${getLineClass(index + 1)}`}
        onClick={() => handleLineClick(index + 1)}
      >
        {index + 1}
      </div>
    ));
  };

  const renderCodeLines = () => {
    if (!currentFile) return null;

    const customStyle = {
      margin: 0,
      padding: 0,
      fontSize: '13px',
      lineHeight: '1.6',
      background: 'transparent',
    };

    const lineProps = (lineNumber: number) => ({
      className: `code-line ${getLineClass(lineNumber)}`,
      onClick: () => handleLineClick(lineNumber),
      style: { cursor: 'pointer' },
    });

    return (
      <SyntaxHighlighter
        language="typescript"
        style={vscDarkPlus}
        customStyle={customStyle}
        showLineNumbers={false}
        wrapLines={true}
        lineProps={lineProps as any}
      >
        {currentFile.code}
      </SyntaxHighlighter>
    );
  };

  return (
    <div className="report-viewer">
      <div className="report-header">
        <h2>📊 审查报告</h2>
        <div className="report-stats">
          <span className="stat-item">
            <span className="stat-label">文件数</span>
            <span className="stat-value">{result.overall.totalFiles}</span>
          </span>
          <span className="stat-item">
            <span className="stat-label">总行数</span>
            <span className="stat-value">{result.overall.totalLines}</span>
          </span>
          <span className="stat-item">
            <span className="stat-label">平均准确度</span>
            <span className="stat-value" style={{ color: getCoverageColor(result.overall.averageAccuracy / 1.5) }}>
              {result.overall.averageAccuracy}分
            </span>
          </span>
        </div>
      </div>

      <div className="charts-section">
        <div className="chart-card pie-chart-card">
          <h3>注释覆盖率</h3>
          <div className="pie-chart-container">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={0}
                  dataKey="value"
                  label={CustomPieLabel}
                  labelLine={false}
                >
                  <Cell fill={getCoverageColor(result.overall.overallCoverage)} />
                  <Cell fill="#3C3C3C" />
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#252526',
                    border: '1px solid #3C3C3C',
                    borderRadius: '4px',
                    color: '#D4D4D4',
                  }}
                  formatter={(value: number, name: string) => [
                    name === '注释代码'
                      ? `${value.toFixed(1)}% (${result.overall.totalCommentLines}行)`
                      : `${value.toFixed(1)}% (${result.overall.totalCodeLines - result.overall.totalCommentLines}行)`,
                    name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-legend">
            <span><span className="legend-dot" style={{ backgroundColor: getCoverageColor(result.overall.overallCoverage) }}></span>有注释</span>
            <span><span className="legend-dot" style={{ backgroundColor: '#3C3C3C' }}></span>无注释</span>
          </div>
        </div>

        <div className="chart-card bar-chart-card">
          <h3>各文件覆盖率对比</h3>
          <div className="bar-chart-container">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 30 }}>
                <XAxis type="number" domain={[0, 100]} tick={{ fill: '#888', fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: '#D4D4D4', fontSize: 11 }}
                  width={100}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#252526',
                    border: '1px solid #3C3C3C',
                    borderRadius: '4px',
                    color: '#D4D4D4',
                  }}
                  formatter={(value: number) => [`${value.toFixed(1)}%`, '覆盖率']}
                  labelFormatter={(label: string) => {
                    const item = barData.find(d => d.name === label);
                    return item?.fullPath || label;
                  }}
                />
                <Bar dataKey="覆盖率" cursor="pointer" onClick={handleBarClick}>
                  {barData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="chart-hint">点击柱条查看对应文件详情</p>
        </div>
      </div>

      {lowAccuracyFiles.length > 0 && (
        <div className="accuracy-section">
          <h3>⚠️ 低准确度文件 ({lowAccuracyFiles.length})</h3>
          <div className="accuracy-list">
            {lowAccuracyFiles.map((file, index) => {
              const key = `acc-${index}`;
              const isExpanded = expandedIssue === key;
              return (
                <div
                  key={key}
                  className={`accuracy-item ${isExpanded ? 'expanded' : ''}`}
                  onClick={() => {
                    toggleIssueExpand(key);
                    setSelectedFile(file.filePath);
                  }}
                >
                  <div className="accuracy-item-header">
                    <span className="accuracy-file-name">{file.fileName}</span>
                    <span className="accuracy-score" style={{ color: '#F44336' }}>
                      {file.accuracyScore}分
                    </span>
                  </div>
                  {isExpanded && (
                    <div className="accuracy-item-details">
                      <p>问题数量：{file.issues.length} 个</p>
                      <ul>
                        {file.issues.slice(0, 3).map((issue, i) => (
                          <li key={i}>
                            <span className="issue-type-tag" style={{ backgroundColor: issue.severity === 'high' ? '#F44336' : '#FFC107' }}>
                              {issue.severity === 'high' ? '高' : '中'}
                            </span>
                            第 {issue.line} 行：{issue.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="code-section">
        <div className="file-tabs">
          {result.files.map(file => (
            <button
              key={file.filePath}
              className={`file-tab ${selectedFile === file.filePath ? 'active' : ''}`}
              onClick={() => {
                setSelectedFile(file.filePath);
                setSelectedLine(null);
                setSidebarVisible(false);
              }}
            >
              {file.fileName}
            </button>
          ))}
        </div>

        <div className="code-preview-container">
          <div className={`code-view ${codeFading ? 'fade' : ''}`} ref={codeContainerRef}>
            {renderCodeLines()}
          </div>

          {sidebarVisible && selectedIssue && (
            <div className="suggestion-sidebar">
              <div className="sidebar-header">
                <h4>💡 改进建议</h4>
                <button className="close-btn" onClick={() => setSidebarVisible(false)}>×</button>
              </div>
              <div className="sidebar-content">
                <SuggestionCard
                  lineNumber={selectedIssue.line}
                  type={selectedIssue.type}
                  severity={selectedIssue.severity}
                  message={selectedIssue.message}
                  originalComment={selectedIssue.originalComment}
                  suggestion={selectedIssue.suggestion}
                  originalCode={currentFile?.lines[selectedIssue.line - 1] || ''}
                  suggestedCode={getSuggestedCode(selectedIssue)}
                  onApply={() => applySuggestion(selectedIssue)}
                  onRevert={() => revertSuggestion(selectedIssue)}
                  isApplied={appliedLines.has(`${currentFile?.filePath}-${selectedIssue.line}`)}
                  isApplying={applyingLine === `${currentFile?.filePath}-${selectedIssue.line}`}
                />

                <div className="all-issues-list">
                  <h5>本文件所有问题 ({currentFile?.issues.length || 0})</h5>
                  <div className="issues-mini-list">
                    {currentFile?.issues.map((issue, index) => (
                      <div
                        key={index}
                        className={`issue-mini-item ${selectedLine === issue.line ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedLine(issue.line);
                          if (codeContainerRef.current) {
                            const lineElement = codeContainerRef.current.querySelector(`.code-line:nth-child(${issue.line})`);
                            lineElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }
                        }}
                      >
                        <span className={`severity-dot severity-${issue.severity}`}></span>
                        <span className="issue-line-num">L{issue.line}</span>
                        <span className="issue-msg">{issue.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {!sidebarVisible && currentFile && currentFile.issues.length > 0 && (
          <div className="issues-summary">
            <p>
              本文件共检测到 <strong>{currentFile.issues.length}</strong> 个问题。
              点击代码中标记的行查看详细建议。
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportViewer;
