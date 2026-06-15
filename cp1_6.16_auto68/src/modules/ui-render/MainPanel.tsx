import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import debounce from 'lodash/debounce';
import Editor from '@monaco-editor/react';
import SplitPane from 'react-split-pane';
import type { AuditIssue } from '@/types';
import { eventBus } from './EventBus';

interface MainPanelProps {
  tabId: string;
  htmlCode: string;
  onCodeChange: (code: string) => void;
  issues: AuditIssue[];
  windowWidth: number;
}

export const MainPanel: React.FC<MainPanelProps> = ({
  tabId,
  htmlCode,
  onCodeChange,
  issues,
  windowWidth,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [flashSelector, setFlashSelector] = useState<string | null>(null);
  const currentTabRef = useRef(tabId);
  const issuesRef = useRef(issues);

  useEffect(() => {
    currentTabRef.current = tabId;
  }, [tabId]);

  useEffect(() => {
    issuesRef.current = issues;
  }, [issues]);

  const debouncedEmit = useMemo(
    () =>
      debounce((code: string, id: string) => {
        eventBus.emit('code-change', { tabId: id, html: code });
      }, 300),
    []
  );

  useEffect(() => {
    return () => {
      debouncedEmit.cancel();
    };
  }, [debouncedEmit]);

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      const code = value || '';
      onCodeChange(code);
      debouncedEmit(code, tabId);
    },
    [onCodeChange, tabId, debouncedEmit]
  );

  useEffect(() => {
    const unbindAuditStart = eventBus.on('audit-start', ({ tabId: id }) => {
      if (id === currentTabRef.current) {
        setIsScanning(true);
        setTimeout(() => setIsScanning(false), 500);
      }
    });

    const unbindHighlight = eventBus.on('highlight-click', ({ tabId: id, selector }) => {
      if (id === currentTabRef.current) {
        setFlashSelector(selector);
        setTimeout(() => setFlashSelector(null), 1100);
        triggerElementFlash(selector);
      }
    });

    return () => {
      unbindAuditStart();
      unbindHighlight();
    };
  }, []);

  const triggerElementFlash = useCallback((selector: string) => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentDocument) return;

    try {
      const elements = iframe.contentDocument.querySelectorAll(selector);
      elements.forEach((el) => {
        el.classList.add('audit-highlight-flash');
        setTimeout(() => el.classList.remove('audit-highlight-flash'), 1100);
      });
    } catch (e) {
      // ignore
    }
  }, []);

  const applyHighlightsToIframe = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentDocument) return;

    const doc = iframe.contentDocument;

    const oldTags = doc.querySelectorAll('.audit-highlight-tag');
    oldTags.forEach((tag) => tag.remove());
    const oldHighlights = doc.querySelectorAll('.audit-highlight');
    oldHighlights.forEach((el) => {
      el.classList.remove('audit-highlight', 'audit-highlight-flash');
      el.style.border = '';
      el.style.position = '';
    });

    const currentIssues = issuesRef.current;
    const seenSelectors = new Set<string>();

    for (let i = currentIssues.length - 1; i >= 0; i--) {
      const issue = currentIssues[i];
      if (seenSelectors.has(issue.selector)) continue;
      seenSelectors.add(issue.selector);

      try {
        const elements = doc.querySelectorAll(issue.selector);
        elements.forEach((el) => {
          const htmlEl = el as HTMLElement;
          htmlEl.classList.add('audit-highlight');
          htmlEl.style.border = '2px solid #F4433680';
          if (htmlEl.style.position === '' || htmlEl.style.position === 'static') {
            htmlEl.style.position = 'relative';
          }

          const severityIcon =
            issue.severity === 'critical' ? '⛔' : issue.severity === 'medium' ? '⚠️' : 'ℹ️';
          const tag = doc.createElement('div');
          tag.className = `audit-highlight-tag ${issue.severity}`;
          tag.textContent = `${i + 1} ${severityIcon}`;
          htmlEl.appendChild(tag);
        });
      } catch (e) {
        // ignore invalid selector
      }
    }

    if (flashSelector) {
      try {
        doc.querySelectorAll(flashSelector).forEach((el) => {
          el.classList.add('audit-highlight-flash');
        });
      } catch (e) {
        // ignore
      }
    }
  }, [flashSelector]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      applyHighlightsToIframe();
    };

    iframe.addEventListener('load', handleLoad);
    return () => iframe.removeEventListener('load', handleLoad);
  }, [applyHighlightsToIframe]);

  useEffect(() => {
    const timer = setTimeout(applyHighlightsToIframe, 100);
    return () => clearTimeout(timer);
  }, [issues, applyHighlightsToIframe]);

  const getPreviewHtml = useCallback((html: string): string => {
    const trimmed = html.trim();
    let bodyContent = trimmed;
    let headContent = `
      <base target="_blank">
      <style>
        * { box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 16px; margin: 0; }
        @keyframes pulse-border {
          0%, 100% { border-color: #F4433680; }
          50% { border-color: #F44336CC; }
        }
        @keyframes flash-element {
          0% { border-color: #ffffff; border-width: 3px; box-shadow: 0 0 0 3px #ffffff; }
          100% { border-color: #F4433680; border-width: 2px; box-shadow: none; }
        }
        .audit-highlight {
          border: 2px solid #F4433680 !important;
          animation: pulse-border 0.6s ease-in-out infinite !important;
          position: relative;
        }
        .audit-highlight-flash {
          animation: flash-element 1s ease-out !important;
        }
        .audit-highlight-tag {
          position: absolute;
          top: -20px;
          left: 0;
          background: #F44336;
          color: white;
          font-size: 12px;
          padding: 2px 6px;
          border-radius: 4px;
          z-index: 9999;
          white-space: nowrap;
          pointer-events: none;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          font-family: system-ui, sans-serif;
          line-height: 1.4;
        }
        .audit-highlight-tag.medium { background: #FFC107; color: #333; }
        .audit-highlight-tag.low { background: #2196F3; }
      </style>
    `;

    if (/^<!doctype html>/i.test(trimmed) || /^<html/i.test(trimmed)) {
      if (!/<head>/i.test(trimmed)) {
        bodyContent = trimmed.replace(/<html([^>]*)>/i, `<html$1><head>${headContent}</head>`);
      } else {
        bodyContent = trimmed.replace(/<head>/i, `<head>${headContent}`);
      }
      if (!/charset/i.test(trimmed)) {
        bodyContent = bodyContent.replace(/<head>/i, '<head><meta charset="UTF-8">');
      }
    } else if (/^<body/i.test(trimmed)) {
      bodyContent = `<!DOCTYPE html><html><head><meta charset="UTF-8">${headContent}</head>${trimmed}</html>`;
    } else {
      bodyContent = `<!DOCTYPE html><html><head><meta charset="UTF-8">${headContent}</head><body>${trimmed}</body></html>`;
    }

    return bodyContent;
  }, []);

  const hidePreview = windowWidth < 900;
  const editorHeightStyle = { height: '100%', width: '100%' };

  const renderEditor = () => (
    <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: '#1e1e1e' }}>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          backgroundColor: '#f0f0f0',
          zIndex: 10,
          overflow: 'hidden',
        }}
      >
        {isScanning && (
          <div
            className="progress-bar-scan"
            style={{
              height: '100%',
              backgroundColor: 'var(--color-progress)',
            }}
          />
        )}
      </div>
      <Editor
        height="100%"
        defaultLanguage="html"
        value={htmlCode}
        onChange={handleEditorChange}
        theme="vs-dark"
        options={{
          fontSize: 14,
          lineHeight: 21,
          minimap: { enabled: false },
          automaticLayout: true,
          wordWrap: 'on',
          renderLineHighlight: 'all',
          formatOnPaste: true,
          autoClosingBrackets: 'always',
          autoClosingTags: true,
          suggestOnTriggerCharacters: true,
          tabSize: 2,
          scrollBeyondLastLine: false,
          padding: { top: 8, bottom: 8 },
        }}
      />
    </div>
  );

  const renderPreview = () => (
    <div style={{ width: '100%', height: '100%', backgroundColor: '#fff', position: 'relative' }}>
      <iframe
        ref={iframeRef}
        srcDoc={getPreviewHtml(htmlCode)}
        title="Accessibility Preview"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        style={{
          width: '100%',
          height: '100%',
          minHeight: '400px',
          border: '1px solid var(--color-border)',
          backgroundColor: 'white',
        }}
      />
    </div>
  );

  if (hidePreview) {
    return <div style={editorHeightStyle}>{renderEditor()}</div>;
  }

  return (
    <SplitPane split="vertical" minSize={100} defaultSize="50%" style={{ height: '100%' }}>
      {renderEditor()}
      {renderPreview()}
    </SplitPane>
  );
};

export default MainPanel;
