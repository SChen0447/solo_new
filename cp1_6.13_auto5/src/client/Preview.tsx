import React, { useState, useEffect, useRef, useMemo } from 'react';
import { marked } from 'marked';
import katex from 'katex';

interface PreviewProps {
  content: string;
}

const Preview: React.FC<PreviewProps> = ({ content }) => {
  const [html, setHtml] = useState<string>('');
  const [fadeIn, setFadeIn] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const renderMarkdownWithLatex = (text: string): string => {
    let processed = text;

    processed = processed.replace(/\$\$([\s\S]+?)\$\$/g, (match, equation) => {
      try {
        const html = katex.renderToString(equation.trim(), {
          displayMode: true,
          throwOnError: false,
          output: 'html',
        });
        return `<div class="katex-block">${html}</div>`;
      } catch (e) {
        return match;
      }
    });

    processed = processed.replace(/\$([^\n$]+?)\$/g, (match, equation) => {
      try {
        const html = katex.renderToString(equation.trim(), {
          displayMode: false,
          throwOnError: false,
          output: 'html',
        });
        return `<span class="katex-inline">${html}</span>`;
      } catch (e) {
        return match;
      }
    });

    const renderer = new marked.Renderer();
    
    renderer.code = function (code, lang) {
      const language = lang || '';
      return `<pre class="code-block"><code class="language-${language}">${code}</code></pre>`;
    };

    renderer.link = function (href, title, text) {
      return `<a href="${href}" title="${title || ''}" target="_blank" rel="noopener noreferrer">${text}</a>`;
    };

    renderer.image = function (href, title, text) {
      return `<img src="${href}" alt="${text}" title="${title || ''}" class="markdown-image" />`;
    };

    renderer.table = function (header, body) {
      return `<div class="table-wrapper"><table><thead>${header}</thead><tbody>${body}</tbody></table></div>`;
    };

    marked.setOptions({
      renderer,
      breaks: true,
      gfm: true,
    });

    return marked(processed) as string;
  };

  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    setFadeIn(false);

    debounceTimer.current = setTimeout(() => {
      const rendered = renderMarkdownWithLatex(content);
      setHtml(rendered);
      requestAnimationFrame(() => {
        setFadeIn(true);
      });
    }, 150);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [content]);

  const displayHtml = useMemo(() => html, [html]);

  return (
    <div className="preview-container" ref={containerRef}>
      <div className="preview-header">
        <span className="preview-title">预览</span>
      </div>
      <div
        className={`markdown-body ${fadeIn ? 'fade-in' : 'fade-out'}`}
        dangerouslySetInnerHTML={{ __html: displayHtml }}
      />
    </div>
  );
};

export default Preview;
