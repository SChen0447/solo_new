import React, { useState } from 'react';
import UploadPanel from './UploadPanel';
import ReportViewer from './ReportViewer';

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

const App: React.FC = () => {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [sessionId, setSessionId] = useState<string>('');

  const handleAnalysisComplete = (analysisResult: AnalysisResult, sid: string) => {
    setResult(analysisResult);
    setSessionId(sid);
  };

  const handleResultUpdate = (newResult: AnalysisResult) => {
    setResult(newResult);
  };

  const handleReset = () => {
    setResult(null);
    setSessionId('');
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">🔍 代码注释质量审查工具</h1>
          <p className="app-subtitle">自动分析注释覆盖率、准确度和冗余度，提供智能改进建议</p>
        </div>
        {result && (
          <button className="reset-btn" onClick={handleReset}>
            ← 返回上传
          </button>
        )}
      </header>

      <main className="app-main">
        {!result ? (
          <div className="upload-view">
            <UploadPanel onAnalysisComplete={handleAnalysisComplete} />
          </div>
        ) : (
          <div className="report-view">
            <ReportViewer
              result={result}
              sessionId={sessionId}
              onResultUpdate={handleResultUpdate}
            />
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>基于 AST 解析 · 支持 JavaScript / TypeScript · 智能注释分析</p>
      </footer>
    </div>
  );
};

export default App;
