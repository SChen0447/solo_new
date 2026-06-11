import React, { useState, useRef, useCallback, useMemo } from 'react';
import GraphView from './GraphView';
import SidePanel from './SidePanel';
import type { ModuleNode, DependencyType, AnalysisReport } from './utils/analyzer';
import {
  sampleDependencyData,
  generateAnalysisReport,
  reportToText,
  downloadReport
} from './utils/analyzer';
import './styles/global.css';

type FilterType = 'all' | DependencyType;

const App: React.FC = () => {
  const [modules, setModules] = useState<ModuleNode[]>(sampleDependencyData.modules);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [showReportModal, setShowReportModal] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'info' }>({
    visible: false,
    message: '',
    type: 'info'
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const report = useMemo<AnalysisReport>(() => {
    return generateAnalysisReport(modules);
  }, [modules]);

  const reportText = useMemo(() => {
    return reportToText(report);
  }, [report]);

  const showToast = useCallback((message: string, type: 'success' | 'info' = 'info') => {
    setToast({ visible: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 2500);
  }, []);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        if (data.modules && Array.isArray(data.modules)) {
          setModules(data.modules);
          setSelectedNode(null);
          showToast('依赖文件加载成功', 'success');
        } else {
          showToast('JSON 格式不正确，缺少 modules 字段', 'info');
        }
      } catch (err) {
        showToast('JSON 解析失败', 'info');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }, [showToast]);

  const handleLoadSample = useCallback(() => {
    setModules(sampleDependencyData.modules);
    setSelectedNode(null);
    showToast('已加载示例数据', 'success');
  }, [showToast]);

  const handleExportReport = useCallback(() => {
    setShowReportModal(true);
  }, []);

  const handleCopyReport = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      showToast('报告已复制到剪贴板', 'success');
    } catch (err) {
      showToast('复制失败，请手动选择复制', 'info');
    }
  }, [reportText, showToast]);

  const handleDownloadReport = useCallback(() => {
    downloadReport(reportText);
    showToast('报告已下载', 'success');
  }, [reportText, showToast]);

  return (
    <div className="app-container">
      <div className="graph-view-container">
        <div className="top-toolbar">
          <div className="toolbar-left">
            <button className="glass-button primary" onClick={() => fileInputRef.current?.click()}>
              <span>📂</span>
              <span>上传文件</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden-file-input"
              onChange={handleFileUpload}
            />
            <button className="glass-button" onClick={handleLoadSample}>
              <span>🎯</span>
              <span>加载示例</span>
            </button>
            <button className="glass-button" onClick={handleExportReport}>
              <span>📊</span>
              <span>导出分析</span>
            </button>
          </div>

          <div className="toolbar-right">
            <input
              type="text"
              className="glass-input search-box"
              placeholder="搜索模块名..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="type-tabs">
              <button
                className={`type-tab ${filterType === 'all' ? 'active' : ''}`}
                onClick={() => setFilterType('all')}
              >
                全部
              </button>
              <button
                className={`type-tab ${filterType === 'internal' ? 'active' : ''}`}
                onClick={() => setFilterType('internal')}
              >
                内部
              </button>
              <button
                className={`type-tab ${filterType === 'external' ? 'active' : ''}`}
                onClick={() => setFilterType('external')}
              >
                外部
              </button>
            </div>
          </div>
        </div>

        <GraphView
          modules={modules}
          selectedNode={selectedNode}
          onSelectNode={setSelectedNode}
          searchTerm={searchTerm}
          filterType={filterType}
        />
      </div>

      <SidePanel
        modules={modules}
        selectedNode={selectedNode}
        onSelectNode={setSelectedNode}
      />

      <div className={`modal-overlay ${showReportModal ? 'visible' : ''}`} onClick={() => setShowReportModal(false)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-title">依赖分析报告</div>
            <button className="modal-close" onClick={() => setShowReportModal(false)}>
              ✕
            </button>
          </div>
          <div className="modal-body">
            <div className="stat-grid" style={{ marginBottom: '20px' }}>
              <div className="stat-item">
                <div className="stat-value">{report.totalModules}</div>
                <div className="stat-label">模块总数</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{report.maxDependencyDepth}</div>
                <div className="stat-label">最大依赖深度</div>
              </div>
              <div className="stat-item">
                <div className={`stat-value ${report.circularDependencyCount > 0 ? 'warning' : ''}`}>
                  {report.circularDependencyCount}
                </div>
                <div className="stat-label">环形依赖</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{report.keyModules.length}</div>
                <div className="stat-label">关键模块</div>
              </div>
            </div>

            <div className="section-title">关键模块 Top 5</div>
            {report.keyModules.map((m, idx) => (
              <div key={m.name} className="glass-card" style={{ marginBottom: '8px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '13px',
                      color: 'var(--text-primary)',
                      marginRight: '8px'
                    }}>
                      #{idx + 1}
                    </span>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                      color: 'var(--text-secondary)'
                    }}>
                      {m.name}
                    </span>
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    color: 'var(--accent-cyan)'
                  }}>
                    影响分数: {m.impactScore.toFixed(1)}
                  </div>
                </div>
              </div>
            ))}

            <div className="section-title">报告文本</div>
            <pre className="report-text">{reportText}</pre>
          </div>
          <div className="modal-footer">
            <button className="glass-button" onClick={handleCopyReport}>
              <span>📋</span>
              <span>复制到剪贴板</span>
            </button>
            <button className="glass-button primary" onClick={handleDownloadReport}>
              <span>💾</span>
              <span>下载 .txt 文件</span>
            </button>
          </div>
        </div>
      </div>

      <div className={`toast ${toast.visible ? 'visible' : ''} ${toast.type}`}>
        {toast.message}
      </div>
    </div>
  );
};

export default App;
