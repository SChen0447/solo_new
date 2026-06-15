import { useEffect } from 'react';
import useStore from '@/store';
import DocumentEditor from '@/components/DocumentEditor';
import VersionList from '@/components/VersionList';
import DiffViewer from '@/components/DiffViewer';

export default function App() {
  const setDocument = useStore((s) => s.setDocument);
  const setVersions = useStore((s) => s.setVersions);
  const document = useStore((s) => s.document);

  useEffect(() => {
    const init = async () => {
      try {
        const docsRes = await fetch('/api/documents');
        const docsData = await docsRes.json();
        if (docsData.documents && docsData.documents.length > 0) {
          const doc = docsData.documents[0];
          setDocument(doc);
          const versionsRes = await fetch(`/api/documents/${doc.id}/versions?page=1&limit=20`);
          const versionsData = await versionsRes.json();
          setVersions(versionsData.versions, versionsData.total, versionsData.hasMore);
        } else {
          const createRes = await fetch('/api/documents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: '团队知识库文档', content: '欢迎使用团队知识库文档协作系统！\n\n在这里，您可以：\n- 实时编辑文档内容\n- 查看完整的版本历史\n- 对比不同版本之间的差异\n- 回滚到任意历史版本\n\n开始编辑您的文档吧！' }),
          });
          const createData = await createRes.json();
          setDocument(createData.document);
        }
      } catch (e) {
        console.error('初始化失败', e);
      }
    };
    init();
  }, [setDocument, setVersions]);

  if (!document) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: '#FAFAFA' }}>
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: '#1976D2', borderTopColor: 'transparent', borderWidth: '3px' }} />
          <p className="text-sm" style={{ color: '#9E9E9E' }}>加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen" style={{ backgroundColor: '#FAFAFA' }}>
      <VersionList />
      <main className="flex-1 flex flex-col min-w-0">
        <DocumentEditor />
      </main>
      <DiffViewer />
    </div>
  );
}
