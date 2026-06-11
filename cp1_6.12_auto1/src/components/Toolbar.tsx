import { useCallback, useState } from 'react';
import { Download, Copy, Sun, Moon, Check } from 'lucide-react';

interface ToolbarProps {
  content: string;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

function generateFileName(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) return '';

  const firstLine = trimmed.split('\n')[0].trim();
  const title = firstLine.replace(/^#+\s*/, '').trim();

  if (title && title.length > 0) {
    const safeTitle = title
      .replace(/[\/\\:*?"<>|]/g, '-')
      .replace(/[\r\n\t]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50);
    if (safeTitle.length > 0) {
      return `${safeTitle}.md`;
    }
  }

  const now = new Date();
  const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
  return `markdown-${timestamp}.md`;
}

export default function Toolbar({ content, theme, onToggleTheme }: ToolbarProps) {
  const [copied, setCopied] = useState(false);
  const isEmpty = content.trim().length === 0;

  const handleExportMd = useCallback(() => {
    const trimmed = content.trim();
    if (!trimmed) {
      try {
        window.alert('内容为空，无法导出。请先输入 Markdown 内容。');
      } catch {
        // alert blocked, no-op
      }
      return;
    }

    const fileName = generateFileName(content);
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [content]);

  const handleCopyHtml = useCallback(async () => {
    const trimmed = content.trim();
    if (!trimmed) {
      try {
        window.alert('内容为空，无法复制。请先输入 Markdown 内容。');
      } catch {
        // alert blocked, no-op
      }
      return;
    }

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
      <button
        className={`toolbar-btn ${isEmpty ? 'toolbar-btn--disabled' : ''}`}
        onClick={handleExportMd}
        disabled={isEmpty}
        title={isEmpty ? '内容为空，无法导出' : '导出 Markdown'}
      >
        <Download size={16} />
        <span>导出 .md</span>
      </button>
      <button
        className={`toolbar-btn ${isEmpty ? 'toolbar-btn--disabled' : ''}`}
        onClick={handleCopyHtml}
        disabled={isEmpty}
        title={isEmpty ? '内容为空，无法复制' : '复制 HTML'}
      >
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
