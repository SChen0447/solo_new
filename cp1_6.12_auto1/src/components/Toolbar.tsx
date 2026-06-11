import { useCallback, useState } from 'react';
import { Download, Copy, Sun, Moon, Check } from 'lucide-react';

interface ToolbarProps {
  content: string;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export default function Toolbar({ content, theme, onToggleTheme }: ToolbarProps) {
  const [copied, setCopied] = useState(false);

  const handleExportMd = useCallback(() => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [content]);

  const handleCopyHtml = useCallback(async () => {
    try {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = document.querySelector('.preview-content')?.innerHTML || '';
      const htmlContent = tempDiv.innerHTML;

      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([htmlContent], { type: 'text/html' }),
          'text/plain': new Blob([content], { type: 'text/plain' }),
        }),
      ]);

      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = document.querySelector('.preview-content')?.innerHTML || '';
      await navigator.clipboard.writeText(tempDiv.innerHTML);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [content]);

  return (
    <div className="toolbar">
      <button className="toolbar-btn" onClick={handleExportMd} title="导出 Markdown">
        <Download size={16} />
        <span>导出 .md</span>
      </button>
      <button className="toolbar-btn" onClick={handleCopyHtml} title="复制 HTML">
        {copied ? <Check size={16} /> : <Copy size={16} />}
        <span>{copied ? '已复制' : '复制 HTML'}</span>
      </button>
      <button className="toolbar-btn" onClick={onToggleTheme} title="切换主题">
        {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        <span>{theme === 'light' ? '暗色模式' : '亮色模式'}</span>
      </button>
    </div>
  );
}
