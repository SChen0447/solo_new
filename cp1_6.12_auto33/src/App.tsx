import React, { useState, useEffect, useCallback } from 'react';
import Editor from './components/Editor';
import VersionSidebar from './components/VersionSidebar';
import DiffViewer from './components/DiffViewer';
import TimelineView from './components/TimelineView';
import { versionApi } from './api/versionApi';
import type { Version, VersionMeta, DiffSegment } from './types';

const initialContent = `# 欢迎使用版本写作工具

这是一个轻量级的在线写作与版本对比工具。

## 功能特点

- **Markdown 编辑**：支持标准 Markdown 语法
- **多版本管理**：随时保存草稿，每个版本都有独立标签
- **词级别对比**：精确到词的差异对比，新增用绿色、删除用红色、修改用黄色
- **时间线视图**：直观查看创作历程

## 快速开始

1. 在这里输入你的内容
2. 点击右下角"保存为新版本"按钮
3. 在右侧版本列表中选择两个版本
4. 点击"对比差异"查看修改详情

试试修改这段文字，然后保存一个新版本吧！
`;

const App: React.FC = () => {
  const [content, setContent] = useState(initialContent);
  const [versions, setVersions] = useState<VersionMeta[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showDiff, setShowDiff] = useState(false);
  const [diffSegments, setDiffSegments] = useState<DiffSegment[]>([]);
  const [diffOldVersion, setDiffOldVersion] = useState<VersionMeta | null>(null);
  const [diffNewVersion, setDiffNewVersion] = useState<VersionMeta | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentVersionId, setCurrentVersionId] = useState<string | null>(null);

  const fetchVersions = useCallback(async () => {
    try {
      const data = await versionApi.getVersions();
      setVersions(data);
    } catch (err) {
      console.error('Failed to fetch versions:', err);
    }
  }, []);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  const handleVersionSaved = useCallback((version: Version) => {
    setCurrentVersionId(version.id);
    fetchVersions();
  }, [fetchVersions]);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(v => v !== id);
      }
      if (prev.length >= 2) {
        return [prev[1], id];
      }
      return [...prev, id];
    });
  }, []);

  const handleCompare = useCallback(async () => {
    if (selectedIds.length !== 2) return;

    const sorted = [...selectedIds].sort((a, b) => {
      const va = versions.find(v => v.id === a);
      const vb = versions.find(v => v.id === b);
      return (va?.createdAt || 0) - (vb?.createdAt || 0);
    });

    const oldId = sorted[0];
    const newId = sorted[1];

    setIsLoading(true);
    try {
      const result = await versionApi.getDiff(oldId, newId);
      setDiffSegments(result.segments);
      setDiffOldVersion(versions.find(v => v.id === oldId) || null);
      setDiffNewVersion(versions.find(v => v.id === newId) || null);
      setShowDiff(true);
    } catch (err) {
      console.error('Failed to fetch diff:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedIds, versions]);

  const handleLoadVersion = useCallback(async (id: string) => {
    try {
      const version = await versionApi.getVersion(id);
      setContent(version.content);
      setCurrentVersionId(id);
    } catch (err) {
      console.error('Failed to load version:', err);
    }
  }, []);

  const handleUpdateVersion = useCallback(async (id: string, data: { label?: string; comment?: string }) => {
    try {
      await versionApi.updateVersion(id, data);
      fetchVersions();
    } catch (err) {
      console.error('Failed to update version:', err);
    }
  }, [fetchVersions]);

  const handleApplyNew = useCallback(async () => {
    if (diffNewVersion) {
      try {
        const version = await versionApi.getVersion(diffNewVersion.id);
        setContent(version.content);
        setCurrentVersionId(version.id);
        setShowDiff(false);
      } catch (err) {
        console.error('Failed to apply version:', err);
      }
    }
  }, [diffNewVersion]);

  const handleCloseDiff = useCallback(() => {
    setShowDiff(false);
  }, []);

  const handleTimelineSelect = useCallback((id: string) => {
    handleLoadVersion(id);
  }, [handleLoadVersion]);

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.logo}>📝 版本写作</h1>
          <span style={styles.subtitle}>轻量级在线写作与版本对比工具</span>
        </div>
        {currentVersionId && (
          <div style={styles.currentVersionBadge}>
            <span style={styles.badgeLabel}>当前编辑版本：</span>
            <span style={styles.badgeValue}>
              {versions.find(v => v.id === currentVersionId)?.label || '未知'}
            </span>
          </div>
        )}
      </header>

      <main style={styles.main}>
        <div style={styles.leftPanel}>
          <div style={styles.editorSection}>
            <Editor
              content={content}
              onChange={setContent}
              onVersionSaved={handleVersionSaved}
            />
          </div>

          {showDiff && (
            <div style={styles.diffSection}>
              <DiffViewer
                oldVersion={diffOldVersion}
                newVersion={diffNewVersion}
                segments={diffSegments}
                onApplyNew={handleApplyNew}
                onClose={handleCloseDiff}
              />
            </div>
          )}

          <div style={styles.timelineSection}>
            <TimelineView
              versions={versions}
              onSelectVersion={handleTimelineSelect}
              selectedId={currentVersionId || undefined}
            />
          </div>
        </div>

        <aside style={styles.sidebar}>
          <VersionSidebar
            versions={versions}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onCompare={handleCompare}
            onLoadVersion={handleLoadVersion}
            onUpdateVersion={handleUpdateVersion}
          />
        </aside>
      </main>

      {isLoading && (
        <div style={styles.loadingOverlay}>
          <div style={styles.loadingSpinner} />
          <span style={styles.loadingText}>加载中...</span>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  app: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-color)',
    overflow: 'hidden',
  },
  header: {
    padding: '12px 24px',
    background: 'var(--bg-card)',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: 'var(--shadow-sm)',
    zIndex: 10,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logo: {
    fontSize: '18px',
    fontWeight: 700,
    color: 'var(--primary-color)',
    margin: 0,
  },
  subtitle: {
    fontSize: '13px',
    color: 'var(--text-muted)',
  },
  currentVersionBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 14px',
    background: 'var(--bg-hover)',
    borderRadius: '20px',
  },
  badgeLabel: {
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  badgeValue: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--primary-color)',
  },
  main: {
    flex: 1,
    display: 'flex',
    minHeight: 0,
    padding: '16px',
    gap: '16px',
  },
  leftPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    gap: '16px',
  },
  editorSection: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  diffSection: {
    height: '340px',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  timelineSection: {
    flexShrink: 0,
    height: '200px',
  },
  sidebar: {
    width: '320px',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  loadingOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(232, 238, 244, 0.8)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    zIndex: 9999,
    backdropFilter: 'blur(4px)',
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '3px solid var(--border-color)',
    borderTopColor: 'var(--primary-color)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
  },
};

export default App;
