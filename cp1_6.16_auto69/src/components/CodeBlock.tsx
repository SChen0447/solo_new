import { useState, useCallback } from 'react';
import { Copy, Play, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { executeCode } from '@/utils/codeExecutor';
import styles from './CodeBlock.module.css';

interface CodeBlockProps {
  code: string;
  language: string;
  filename: string;
  blockId: string;
}

export function CodeBlock({ code, language, filename, blockId }: CodeBlockProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [output, setOutput] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [localCode, setLocalCode] = useState(code);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(localCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [localCode]);

  const handleRun = useCallback(async () => {
    setIsRunning(true);
    setOutput('');
    try {
      const result = await executeCode(language, localCode);
      setOutput(result);
    } catch (error) {
      setOutput(`[ERROR] ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsRunning(false);
    }
  }, [language, localCode]);

  const toggleCollapse = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  const firstLine = localCode.split('\n')[0] || '';

  return (
    <div className={`card ${styles.codeBlock}`}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.filename}>{filename}</span>
          <span className={styles.languageTag}>{language}</span>
        </div>
        <div className={styles.headerRight}>
          <button
            className={styles.actionButton}
            onClick={handleCopy}
            title="复制代码"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
          <button
            className={styles.actionButton}
            onClick={handleRun}
            title="运行代码"
            disabled={isRunning}
          >
            <Play size={16} />
          </button>
          <button
            className={styles.actionButton}
            onClick={toggleCollapse}
            title={collapsed ? '展开' : '折叠'}
          >
            {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          <div className={styles.codeContainer}>
            <textarea
              className={styles.codeEditor}
              value={localCode}
              onChange={(e) => setLocalCode(e.target.value)}
              spellCheck={false}
            />
            <div className={styles.lineNumbers}>
              {localCode.split('\n').map((_, i) => (
                <div key={i} className={styles.lineNumber}>
                  {i + 1}
                </div>
              ))}
            </div>
          </div>

          {output && (
            <div className={styles.outputContainer}>
              <div className={styles.outputHeader}>输出</div>
              <pre className={styles.output}>
                <code>{output}</code>
              </pre>
            </div>
          )}
        </>
      )}

      {collapsed && (
        <div className={styles.collapsedPreview}>
          <code>{firstLine}{localCode.split('\n').length > 1 ? '...' : ''}</code>
        </div>
      )}
    </div>
  );
}
