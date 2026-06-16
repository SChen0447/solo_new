import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { CodeEditor } from './editor/CodeEditor';
import { PreviewPanel } from './editor/PreviewPanel';
import { ExportTools } from './editor/ExportTools';
import { highlight, Language } from './highlight/Highlighter';
import { themes, ThemeKey, defaultTheme, Theme } from './highlight/themes';
import { themeStyles } from './styles/themeStyles';

const sampleCode: Record<Language, string> = {
  javascript: `// JavaScript 示例
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(x => x * 2);

console.log(fibonacci(10));
console.log(doubled);`,
  python: `# Python 示例
def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)

numbers = [3, 6, 8, 10, 1, 2, 1]
print(quicksort(numbers))`,
  html: `<!-- HTML 示例 -->
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>示例页面</title>
  <style>
    body { font-family: Arial, sans-serif; }
    .container { max-width: 1200px; margin: 0 auto; }
  </style>
</head>
<body>
  <div class="container">
    <h1>欢迎使用代码高亮</h1>
    <p>这是一个示例 HTML 片段。</p>
  </div>
</body>
</html>`,
  css: `/* CSS 示例 */
:root {
  --primary-color: #2196F3;
  --secondary-color: #4CAF50;
}

.container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.button {
  padding: 12px 24px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(33, 150, 243, 0.4);
}`,
  sql: `-- SQL 示例
SELECT 
    u.id,
    u.username,
    u.email,
    COUNT(o.id) as order_count,
    SUM(o.total_amount) as total_spent
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at >= '2024-01-01'
    AND u.status = 'active'
GROUP BY u.id, u.username, u.email
HAVING COUNT(o.id) > 5
ORDER BY total_spent DESC
LIMIT 10;`
};

const App: React.FC = () => {
  const [code, setCode] = useState<string>(sampleCode.javascript);
  const [language, setLanguage] = useState<Language>('javascript');
  const [themeKey, setThemeKey] = useState<ThemeKey>(defaultTheme);
  const [highlightedHtml, setHighlightedHtml] = useState<string>('');
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false);
  const [leftWidth, setLeftWidth] = useState(45);
  const [isDragging, setIsDragging] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentTheme: Theme = themes[themeKey];
  const currentThemeCss = themeStyles[themeKey] || '';

  const performHighlight = useCallback((codeToHighlight: string, lang: Language) => {
    const startTime = performance.now();
    const result = highlight(codeToHighlight, lang);
    const duration = performance.now() - startTime;
    
    if (duration > 30) {
      console.warn(`高亮渲染耗时: ${duration.toFixed(2)}ms，超过30ms阈值`);
    }
    
    setHighlightedHtml(result.html);
  }, []);

  const debouncedHighlight = useCallback((codeToHighlight: string, lang: Language) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = window.setTimeout(() => {
      performHighlight(codeToHighlight, lang);
    }, 200);
  }, [performHighlight]);

  useEffect(() => {
    performHighlight(code, language);
  }, []);

  useEffect(() => {
    debouncedHighlight(code, language);
    
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [code, language, debouncedHighlight]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsThemeDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    let styleElement = document.getElementById('prism-theme-style') as HTMLStyleElement | null;
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'prism-theme-style';
      document.head.appendChild(styleElement);
    }
    
    styleElement.textContent = currentThemeCss;
    
    return () => {
    };
  }, [currentThemeCss]);

  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode);
  }, []);

  const handleLanguageChange = useCallback((newLanguage: Language) => {
    setLanguage(newLanguage);
    setCode(sampleCode[newLanguage]);
  }, []);

  const handleThemeChange = useCallback((newTheme: ThemeKey) => {
    setThemeKey(newTheme);
    setIsThemeDropdownOpen(false);
  }, []);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    
    if (newLeftWidth >= 20 && newLeftWidth <= 75) {
      setLeftWidth(newLeftWidth);
    }
  }, [isDragging]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    
    return () => {
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  const themeOptions = useMemo(() => 
    Object.entries(themes).map(([key, theme]) => ({
      key: key as ThemeKey,
      name: theme.name,
      primaryColor: theme.primaryColor
    })), 
  []);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">Code Highlight</h1>
        <div className="theme-selector" ref={dropdownRef}>
          <button
            className="theme-dropdown-btn"
            onClick={() => setIsThemeDropdownOpen(!isThemeDropdownOpen)}
          >
            <span
              className="theme-color-preview"
              style={{ backgroundColor: currentTheme.primaryColor }}
            />
            <span className="theme-name">{currentTheme.name}</span>
            <span className={`dropdown-arrow ${isThemeDropdownOpen ? 'open' : ''}`}>▼</span>
          </button>
          {isThemeDropdownOpen && (
            <div className="theme-dropdown-menu">
              {themeOptions.map((option) => (
                <button
                  key={option.key}
                  className={`theme-dropdown-item ${themeKey === option.key ? 'active' : ''}`}
                  onClick={() => handleThemeChange(option.key)}
                >
                  <span
                    className="theme-color-preview"
                    style={{ backgroundColor: option.primaryColor }}
                  />
                  <span>{option.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <div
        className="main-content"
        ref={containerRef}
        style={{ cursor: isDragging ? 'col-resize' : 'default' }}
      >
        <div
          className="editor-section"
          style={{ width: `calc(${leftWidth}% - 3px)` }}
        >
          <CodeEditor
            code={code}
            language={language}
            onCodeChange={handleCodeChange}
            onLanguageChange={handleLanguageChange}
          />
        </div>

        <div
          className={`resize-handle ${isDragging ? 'dragging' : ''}`}
          onMouseDown={handleDragStart}
        />

        <div
          className="preview-section"
          style={{ width: `calc(${100 - leftWidth}% - 3px)` }}
        >
          <ExportTools
            highlightedHtml={highlightedHtml}
            originalCode={code}
            theme={currentTheme}
            language={language}
            themeCssContent={currentThemeCss}
          />
          <PreviewPanel
            highlightedHtml={highlightedHtml}
            originalCode={code}
            theme={currentTheme}
            language={language}
          />
        </div>
      </div>
    </div>
  );
};

export default App;
