import { useCallback, useMemo, useRef, memo } from 'react';

interface Props {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
  language?: string;
  minLines?: number;
}

const KEYWORDS_TS = new Set([
  'function', 'const', 'let', 'var', 'return', 'if', 'else', 'for', 'while',
  'class', 'interface', 'type', 'import', 'export', 'from', 'default', 'new',
  'this', 'super', 'extends', 'implements', 'async', 'await', 'try', 'catch',
  'throw', 'switch', 'case', 'break', 'continue', 'typeof', 'instanceof',
  'void', 'null', 'undefined', 'true', 'false', 'enum', 'readonly', 'static',
  'public', 'private', 'protected', 'abstract', 'as', 'in', 'of', 'yield',
  'delete', 'do', 'finally', 'with', 'debugger',
]);

const KEYWORDS_PY = new Set([
  'def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'import',
  'from', 'as', 'try', 'except', 'finally', 'raise', 'with', 'yield',
  'lambda', 'pass', 'break', 'continue', 'and', 'or', 'not', 'is', 'in',
  'True', 'False', 'None', 'self', 'global', 'nonlocal', 'assert', 'del',
  'async', 'await', 'print',
]);

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function highlightCode(code: string, language?: string): string {
  const lang = (language || '').toLowerCase();
  const keywords = lang.includes('python') || lang.includes('py')
    ? KEYWORDS_PY
    : KEYWORDS_TS;

  let result = '';
  let i = 0;
  const len = code.length;

  while (i < len) {
    if (code[i] === '/' && code[i + 1] === '/') {
      let end = code.indexOf('\n', i);
      if (end === -1) end = len;
      result += `<span class="hl-comment">${escapeHtml(code.slice(i, end))}</span>`;
      i = end;
      continue;
    }

    if (code[i] === '/' && code[i + 1] === '*') {
      let end = code.indexOf('*/', i + 2);
      if (end === -1) end = len;
      else end += 2;
      result += `<span class="hl-comment">${escapeHtml(code.slice(i, end))}</span>`;
      i = end;
      continue;
    }

    if (code[i] === '#' && (lang.includes('python') || lang.includes('py'))) {
      let end = code.indexOf('\n', i);
      if (end === -1) end = len;
      result += `<span class="hl-comment">${escapeHtml(code.slice(i, end))}</span>`;
      i = end;
      continue;
    }

    if (code[i] === '"' || code[i] === "'" || code[i] === '`') {
      const quote = code[i];
      let j = i + 1;
      while (j < len) {
        if (code[j] === '\\') { j += 2; continue; }
        if (code[j] === quote) { j++; break; }
        j++;
      }
      result += `<span class="hl-string">${escapeHtml(code.slice(i, j))}</span>`;
      i = j;
      continue;
    }

    if (/[0-9]/.test(code[i]) && (i === 0 || !/[a-zA-Z_]/.test(code[i - 1]))) {
      let j = i;
      while (j < len && /[0-9.xXa-fA-F_]/.test(code[j])) j++;
      result += `<span class="hl-number">${escapeHtml(code.slice(i, j))}</span>`;
      i = j;
      continue;
    }

    if (/[a-zA-Z_$]/.test(code[i])) {
      let j = i;
      while (j < len && /[a-zA-Z0-9_$]/.test(code[j])) j++;
      const word = code.slice(i, j);
      if (keywords.has(word)) {
        result += `<span class="hl-keyword">${escapeHtml(word)}</span>`;
      } else if (j < len && code[j] === '(') {
        result += `<span class="hl-function">${escapeHtml(word)}</span>`;
      } else if (word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase()) {
        result += `<span class="hl-type">${escapeHtml(word)}</span>`;
      } else {
        result += escapeHtml(word);
      }
      i = j;
      continue;
    }

    if ('=<>!+-*/%&|^~?:'.includes(code[i])) {
      let j = i + 1;
      while (j < len && '=<>!+-*/%&|^~?:'.includes(code[j])) j++;
      result += `<span class="hl-operator">${escapeHtml(code.slice(i, j))}</span>`;
      i = j;
      continue;
    }

    result += escapeHtml(code[i]);
    i++;
  }

  return result;
}

const CodeEditor = memo(function CodeEditor({
  value,
  onChange,
  placeholder,
  disabled,
  language,
  minLines = 15,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const lines = useMemo(() => {
    const count = value.split('\n').length;
    return Math.max(count, minLines);
  }, [value, minLines]);

  const highlighted = useMemo(() => {
    return highlightCode(value, language);
  }, [value, language]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const ta = textareaRef.current;
      if (!ta) return;

      if (e.key === 'Tab') {
        e.preventDefault();
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const newValue =
          value.substring(0, start) + '  ' + value.substring(end);
        onChange(newValue);
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = start + 2;
        });
        return;
      }

      if (e.key === 'Enter') {
        const start = ta.selectionStart;
        const lineStart = value.lastIndexOf('\n', start - 1) + 1;
        const currentLine = value.substring(lineStart, start);
        const indent = currentLine.match(/^(\s*)/)?.[1] || '';
        const charBefore = value[start - 1];
        let extra = '';
        if (charBefore === '{' || charBefore === '(' || charBefore === '[') {
          extra = '  ';
        }
        e.preventDefault();
        const newValue =
          value.substring(0, start) + '\n' + indent + extra + value.substring(ta.selectionEnd);
        onChange(newValue);
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = start + 1 + indent.length + extra.length;
        });
        return;
      }

      const pairs: Record<string, string> = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'", '`': '`' };
      if (pairs[e.key]) {
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        if (start !== end) {
          e.preventDefault();
          const wrapped = pairs[e.key] + value.substring(start, end) + pairs[e.key];
          const newValue = value.substring(0, start) + wrapped + value.substring(end);
          onChange(newValue);
          requestAnimationFrame(() => {
            ta.selectionStart = start + 1;
            ta.selectionEnd = end + 1;
          });
        }
      }
    },
    [value, onChange]
  );

  const handleScroll = useCallback(() => {
    const ta = textareaRef.current;
    const pre = ta?.parentElement?.querySelector('.code-highlight-pre') as HTMLElement | null;
    if (ta && pre) {
      pre.scrollTop = ta.scrollTop;
      pre.scrollLeft = ta.scrollLeft;
    }
  }, []);

  return (
    <div className="code-editor-wrap">
      <div className="code-editor-inner">
        <div className="code-line-numbers">
          {Array.from({ length: lines }, (_, i) => (
            <div key={i} className="code-line-num">
              {i + 1}
            </div>
          ))}
        </div>
        <div className="code-textarea-overlay">
          <pre
            className="code-highlight-pre"
            dangerouslySetInnerHTML={{ __html: highlighted + '\n' }}
            aria-hidden="true"
          />
          <textarea
            ref={textareaRef}
            className="code-textarea"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onScroll={handleScroll}
            placeholder={placeholder}
            disabled={disabled}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
          />
        </div>
      </div>
    </div>
  );
});

export default CodeEditor;
