import React, { useCallback, useRef, useEffect } from 'react';
import { Language } from '../highlight/Highlighter';

interface CodeEditorProps {
  code: string;
  language: Language;
  onCodeChange: (code: string) => void;
  onLanguageChange: (language: Language) => void;
}

const languages: { key: Language; label: string }[] = [
  { key: 'javascript', label: 'JavaScript' },
  { key: 'python', label: 'Python' },
  { key: 'html', label: 'HTML' },
  { key: 'css', label: 'CSS' },
  { key: 'sql', label: 'SQL' }
];

export const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  language,
  onCodeChange,
  onLanguageChange
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(textarea.scrollHeight, 400)}px`;
    }
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [code, adjustHeight]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onCodeChange(e.target.value);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    setTimeout(adjustHeight, 0);
  };

  return (
    <div className="code-editor-container">
      <div className="language-selector">
        {languages.map((lang) => (
          <button
            key={lang.key}
            className={`language-btn ${language === lang.key ? 'active' : ''}`}
            onClick={() => onLanguageChange(lang.key)}
          >
            {lang.label}
          </button>
        ))}
      </div>
      <textarea
        ref={textareaRef}
        className="code-textarea"
        value={code}
        onChange={handleChange}
        onPaste={handlePaste}
        placeholder={`在此输入或粘贴${languages.find(l => l.key === language)?.label}代码...`}
        spellCheck={false}
      />
    </div>
  );
};
