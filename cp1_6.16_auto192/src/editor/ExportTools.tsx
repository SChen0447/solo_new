import React, { useState, useCallback } from 'react';
import { Theme } from '../highlight/themes';
import { Language } from '../highlight/Highlighter';

interface ExportToolsProps {
  highlightedHtml: string;
  originalCode: string;
  theme: Theme;
  language: Language;
  themeCssContent: string;
}

export const ExportTools: React.FC<ExportToolsProps> = ({
  highlightedHtml,
  originalCode,
  theme,
  language,
  themeCssContent
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyHtml = useCallback(async () => {
    const lines = originalCode.split('\n');
    const lineNumbersHtml = lines
      .map((_, i) => {
        const lineNum = i + 1;
        const isBold = lineNum % 10 === 0;
        return `<div class="line-number${isBold ? ' bold' : ''}">${lineNum}</div>`;
      })
      .join('');

    const fullHtml = `<div class="code-block" style="display: flex; background-color: ${theme.backgroundColor}; color: ${theme.textColor}; font-family: 'Fira Code', monospace; font-size: 14px; border-radius: 8px; overflow: hidden;">
  <div class="line-numbers" style="width: 40px; padding: 16px 8px; text-align: right; background-color: ${adjustBrightness(theme.backgroundColor, -5)}; opacity: 0.7; user-select: none;">
    ${lineNumbersHtml}
  </div>
  <pre class="code-content" style="flex: 1; padding: 16px; margin: 0; overflow-x: auto;"><code>${highlightedHtml}</code></pre>
</div>`;

    try {
      await navigator.clipboard.writeText(fullHtml);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  }, [highlightedHtml, originalCode, theme]);

  const handleExportHtml = useCallback(async () => {
    const generateHtml = () => {
      const lines = originalCode.split('\n');
      const lineNumbersHtml = lines
        .map((_, i) => {
          const lineNum = i + 1;
          const isBold = lineNum % 10 === 0;
          return `<div class="line-number${isBold ? ' bold' : ''}">${lineNum}</div>`;
        })
        .join('');

      const now = new Date();
      const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
      const filename = `highlight-${timestamp}.html`;

      const fullDocument = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Highlighted Code - ${language.toUpperCase()}</title>
  <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    ${themeCssContent}
    body {
      margin: 0;
      padding: 40px;
      background-color: #FAFAFA;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    .header {
      margin-bottom: 20px;
      padding: 16px 20px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .header h1 {
      margin: 0 0 8px 0;
      font-size: 20px;
      color: #333;
    }
    .header .meta {
      font-size: 14px;
      color: #666;
    }
    .code-block {
      display: flex;
      background-color: ${theme.backgroundColor};
      color: ${theme.textColor};
      font-family: 'Fira Code', monospace;
      font-size: 14px;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .line-numbers {
      width: 40px;
      padding: 16px 8px;
      text-align: right;
      background-color: ${adjustBrightness(theme.backgroundColor, -5)};
      opacity: 0.7;
      user-select: none;
    }
    .line-number {
      line-height: 1.6;
      font-size: 13px;
    }
    .line-number.bold {
      font-weight: 600;
    }
    .code-content {
      flex: 1;
      padding: 16px;
      margin: 0;
      overflow-x: auto;
    }
    .code-content code {
      font-family: 'Fira Code', monospace;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Highlighted Code</h1>
      <div class="meta">
        <strong>语言:</strong> ${language.toUpperCase()} | 
        <strong>主题:</strong> ${theme.name} | 
        <strong>行数:</strong> ${lines.length} | 
        <strong>字符:</strong> ${originalCode.length}
      </div>
    </div>
    <div class="code-block">
      <div class="line-numbers">
        ${lineNumbersHtml}
      </div>
      <pre class="code-content"><code>${highlightedHtml}</code></pre>
    </div>
  </div>
</body>
</html>`;

      return { filename, content: fullDocument };
    };

    try {
      let result;
      if (originalCode.length > 5000) {
        result = await new Promise<{ filename: string; content: string }>((resolve) => {
          setTimeout(() => resolve(generateHtml()), 0);
        });
      } else {
        result = generateHtml();
      }

      const blob = new Blob([result.content], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('导出失败:', err);
    }
  }, [highlightedHtml, originalCode, theme, language, themeCssContent]);

  return (
    <div className="export-tools">
      <button
        className={`export-btn copy-btn ${copied ? 'copied' : ''}`}
        onClick={handleCopyHtml}
      >
        {copied ? '✓ 已复制' : '复制 HTML'}
      </button>
      <button
        className="export-btn export-file-btn"
        onClick={handleExportHtml}
      >
        导出文件
      </button>
    </div>
  );
};

function adjustBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0x00ff) + amt;
  const B = (num & 0x0000ff) + amt;
  return (
    '#' +
    (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    )
      .toString(16)
      .slice(1)
  );
}
