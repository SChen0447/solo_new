import { useEffect, useRef, useCallback } from 'react';
import useStore from '@/store';

export default function VersionList() {
  const document = useStore((s) => s.document);
  const versions = useStore((s) => s.versions);
  const versionsHasMore = useStore((s) => s.versionsHasMore);
  const versionsPage = useStore((s) => s.versionsPage);
  const setVersionsPage = useStore((s) => s.setVersionsPage);
  const appendVersions = useStore((s) => s.appendVersions);
  const activeVersionId = useStore((s) => s.activeVersionId);
  const setActiveVersionId = useStore((s) => s.setActiveVersionId);
  const setDocument = useStore((s) => s.setDocument);
  const setDiffOpen = useStore((s) => s.setDiffOpen);
  const setDiffVersions = useStore((s) => s.setDiffVersions);
  const sidebarCollapsed = useStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useStore((s) => s.setSidebarCollapsed);
  const listRef = useRef<HTMLDivElement>(null);

  const loadVersions = useCallback(
    async (page: number) => {
      if (!document) return;
      try {
        const res = await fetch(`/api/documents/${document.id}/versions?page=${page}&limit=20`);
        const data = await res.json();
        if (page === 1) {
          useStore.getState().setVersions(data.versions, data.total, data.hasMore);
        } else {
          appendVersions(data.versions, data.total, data.hasMore);
        }
      } catch (e) {
        console.error('加载版本列表失败', e);
      }
    },
    [document, appendVersions]
  );

  useEffect(() => {
    loadVersions(1);
  }, [document?.id]);

  const handleScroll = useCallback(() => {
    if (!listRef.current || !versionsHasMore) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    if (scrollHeight - scrollTop - clientHeight < 50) {
      const nextPage = versionsPage + 1;
      setVersionsPage(nextPage);
      loadVersions(nextPage);
    }
  }, [versionsHasMore, versionsPage, setVersionsPage, loadVersions]);

  const handleVersionClick = useCallback(
    async (versionId: string) => {
      try {
        const res = await fetch(`/api/versions/${versionId}`);
        const data = await res.json();
        setActiveVersionId(versionId);
        setDocument({ ...useStore.getState().document!, content: data.version.content });
      } catch (e) {
        console.error('加载版本失败', e);
      }
    },
    [setActiveVersionId, setDocument]
  );

  const handleCompare = useCallback(
    async (versionId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const idx = versions.findIndex((v) => v.id === versionId);
      if (idx === -1 || idx === versions.length - 1) return;
      const newVersion = versions[idx];
      const oldVersion = versions[idx + 1];
      setDiffVersions(oldVersion, newVersion);
      setDiffOpen(true);
    },
    [versions, setDiffVersions, setDiffOpen]
  );

  if (sidebarCollapsed) {
    return (
      <div className="version-sidebar-collapsed flex flex-col items-center py-4 gap-3" style={{ width: '48px', backgroundColor: '#FAFAFA', borderRight: '1px solid #E0E0E0' }}>
        <button
          onClick={() => setSidebarCollapsed(false)}
          className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-200 transition-colors duration-200"
          title="展开版本列表"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#1976D2" strokeWidth="2">
            <path d="M6 3l5 5-5 5" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div
      className="version-sidebar flex flex-col h-full"
      style={{ width: '280px', backgroundColor: '#FAFAFA', borderRight: '1px solid #E0E0E0' }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold" style={{ color: '#1976D2' }}>版本历史</h3>
        <button
          onClick={() => setSidebarCollapsed(true)}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 transition-colors duration-200 md:hidden"
          title="折叠"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#666" strokeWidth="2">
            <path d="M4 2l4 4-4 4" />
          </svg>
        </button>
      </div>
      <div ref={listRef} onScroll={handleScroll} className="flex-1 overflow-y-auto">
        {versions.map((v) => (
          <div
            key={v.id}
            onClick={() => handleVersionClick(v.id)}
            className={`version-list-item flex items-center justify-between px-4 py-3 cursor-pointer transition-colors duration-200 ${
              activeVersionId === v.id ? 'active-version' : ''
            }`}
            style={{
              backgroundColor: activeVersionId === v.id ? '#E3F2FD' : 'transparent',
            }}
            onMouseEnter={(e) => {
              if (activeVersionId !== v.id) (e.currentTarget as HTMLElement).style.backgroundColor = '#BBDEFB';
            }}
            onMouseLeave={(e) => {
              if (activeVersionId !== v.id) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
            }}
          >
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-xs font-medium" style={{ color: '#333' }}>版本 {v.versionNumber}</span>
              <span className="text-xs" style={{ color: '#9E9E9E' }}>{v.createdAt}</span>
            </div>
            <button
              onClick={(e) => handleCompare(v.id, e)}
              className="compare-btn w-7 h-7 flex items-center justify-center rounded-full border-2 transition-all duration-200 shrink-0"
              style={{ borderColor: '#1976D2', color: '#1976D2' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = '#1976D2';
                (e.currentTarget as HTMLElement).style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                (e.currentTarget as HTMLElement).style.color = '#1976D2';
              }}
              title="与上一版本对比"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 6h10M8 3l3 3-3 3" />
              </svg>
            </button>
          </div>
        ))}
        {versionsHasMore && (
          <div className="text-center py-3 text-xs text-gray-400">加载更多...</div>
        )}
      </div>
    </div>
  );
}
