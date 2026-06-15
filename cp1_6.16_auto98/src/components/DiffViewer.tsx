import { useState, useCallback } from 'react';
import ReactDiffViewer from 'react-diff-viewer-continued';
import useStore from '@/store';

export default function DiffViewer() {
  const diffOpen = useStore((s) => s.diffOpen);
  const setDiffOpen = useStore((s) => s.setDiffOpen);
  const diffOldVersion = useStore((s) => s.diffOldVersion);
  const diffNewVersion = useStore((s) => s.diffNewVersion);
  const setDocument = useStore((s) => s.setDocument);
  const setVersions = useStore((s) => s.setVersions);
  const setVersionsPage = useStore((s) => s.setVersionsPage);
  const setActiveVersionId = useStore((s) => s.setActiveVersionId);
  const setRollbackNotification = useStore((s) => s.setRollbackNotification);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useState(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  });

  const handleRollback = useCallback(async () => {
    if (!diffOldVersion) return;
    try {
      const res = await fetch(`/api/versions/${diffOldVersion.id}/rollback`, { method: 'POST' });
      const data = await res.json();
      setDocument({ ...useStore.getState().document!, content: data.version.content });
      const listRes = await fetch(`/api/documents/${useStore.getState().document!.id}/versions?page=1&limit=20`);
      const listData = await listRes.json();
      setVersions(listData.versions, listData.total, listData.hasMore);
      setVersionsPage(1);
      setActiveVersionId(null);
      setConfirmOpen(false);
      setDiffOpen(false);
      setRollbackNotification(true);
      setTimeout(() => setRollbackNotification(false), 3000);
    } catch (e) {
      console.error('回滚失败', e);
    }
  }, [diffOldVersion, setDocument, setVersions, setVersionsPage, setActiveVersionId, setDiffOpen, setRollbackNotification]);

  if (!diffOpen || !diffOldVersion || !diffNewVersion) return null;

  return (
    <>
      <div
        className={`diff-overlay fixed inset-0 z-40 flex ${isMobile ? 'flex-col' : ''}`}
        style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
        onClick={() => setDiffOpen(false)}
      >
        <div
          className={`diff-panel bg-white flex flex-col ${isMobile ? 'w-full h-full' : 'w-1/2 h-full ml-auto'}`}
          style={{ boxShadow: '-4px 0 20px rgba(0,0,0,0.1)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold" style={{ color: '#1976D2' }}>
              版本差异对比
            </h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setConfirmOpen(true)}
                className="rollback-btn px-3 py-1.5 rounded-md text-white text-xs font-medium transition-all duration-200"
                style={{ backgroundColor: '#D32F2F' }}
                onMouseEnter={(e) => ((e.target as HTMLElement).style.backgroundColor = '#B71C1C')}
                onMouseLeave={(e) => ((e.target as HTMLElement).style.backgroundColor = '#D32F2F')}
              >
                回滚到此版本
              </button>
              <button
                onClick={() => setDiffOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors duration-200"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#666" strokeWidth="2">
                  <path d="M2 2l10 10M12 2L2 12" />
                </svg>
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ReactDiffViewer
              oldValue={diffOldVersion.content}
              newValue={diffNewVersion.content}
              splitView={true}
              leftTitle={`版本 ${diffOldVersion.versionNumber}`}
              rightTitle={`版本 ${diffNewVersion.versionNumber}`}
              styles={{
                variables: {
                  light: {
                    diffViewerBackground: '#fff',
                    addedBackground: '#C8E6C9',
                    removedBackground: '#FFCDD2',
                    wordAddedBackground: '#A5D6A7',
                    wordRemovedBackground: '#EF9A9A',
                    addedGutterBackground: '#E8F5E9',
                    removedGutterBackground: '#FFEBEE',
                    gutterBackground: '#f5f5f5',
                    gutterBackgroundDark: '#eee',
                  },
                },
                contentText: {
                  fontSize: '13px',
                  lineHeight: '1.5',
                },
                diffContainer: {
                  display: 'flex',
                  flexDirection: 'row',
                },
              }}
            />
          </div>
        </div>
      </div>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setConfirmOpen(false)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-sm w-full mx-4"
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.15)', borderRadius: '8px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-base font-semibold mb-2" style={{ color: '#333' }}>确认回滚</h4>
            <p className="text-sm mb-4" style={{ color: '#666' }}>
              确定要回滚到版本 {diffOldVersion.versionNumber} 吗？当前版本将作为备份保留。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                className="px-4 py-2 rounded-md text-sm transition-all duration-200"
                style={{ backgroundColor: '#f5f5f5', color: '#666' }}
              >
                取消
              </button>
              <button
                onClick={handleRollback}
                className="px-4 py-2 rounded-md text-sm text-white transition-all duration-200"
                style={{ backgroundColor: '#D32F2F' }}
                onMouseEnter={(e) => ((e.target as HTMLElement).style.backgroundColor = '#B71C1C')}
                onMouseLeave={(e) => ((e.target as HTMLElement).style.backgroundColor = '#D32F2F')}
              >
                确认回滚
              </button>
            </div>
          </div>
        </div>
      )}

      {useStore((s) => s.rollbackNotification) && (
        <div className="rollback-notification fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-6">
          <div
            className="px-6 py-3 rounded-lg text-white text-sm font-medium shadow-lg"
            style={{ backgroundColor: '#4CAF50' }}
          >
            回滚成功！已恢复到版本 {diffOldVersion?.versionNumber}
          </div>
        </div>
      )}
    </>
  );
}
