import { FileText, Download, Maximize, Upload, Code } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useOpenApi } from '@/hooks/useOpenApi';
import styles from './Toolbar.module.css';

export function Toolbar() {
  const setShowExportDialog = useAppStore((state) => state.setShowExportDialog);
  const setIsFullscreen = useAppStore((state) => state.setIsFullscreen);
  const documentTitle = useAppStore((state) => state.documentTitle);
  const setDocumentTitle = useAppStore((state) => state.setDocumentTitle);
  const { importSpec } = useOpenApi();
  const fileInputRef = document.createElement('input');

  const handleImportClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          await importSpec(file);
        } catch (error) {
          alert(error instanceof Error ? error.message : '导入失败');
        }
      }
    };
    input.click();
  };

  return (
    <div className={styles.toolbar}>
      <div className={styles.leftSection}>
        <div className={styles.logo}>
          <FileText size={24} className={styles.logoIcon} />
          <span className={styles.logoText}>TechDoc Hub</span>
        </div>
        <input
          type="text"
          value={documentTitle}
          onChange={(e) => setDocumentTitle(e.target.value)}
          className={styles.titleInput}
          placeholder="文档标题"
        />
      </div>
      <div className={styles.rightSection}>
        <button
          className="btn-icon ripple"
          onClick={handleImportClick}
          title="导入 OpenAPI 规范"
        >
          <Upload size={20} />
        </button>
        <button
          className="btn-icon ripple"
          onClick={() => setIsFullscreen(true)}
          title="全屏阅读模式"
        >
          <Maximize size={20} />
        </button>
        <button
          className="btn-primary ripple"
          onClick={() => setShowExportDialog(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Download size={18} />
          导出
        </button>
      </div>
    </div>
  );
}
