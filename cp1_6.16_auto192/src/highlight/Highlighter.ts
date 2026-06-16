import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-sql';

export type Language = 'javascript' | 'python' | 'html' | 'css' | 'sql';

export interface HighlightResult {
  html: string;
  language: Language;
}

const languageMap: Record<Language, string> = {
  javascript: 'javascript',
  python: 'python',
  html: 'markup',
  css: 'css',
  sql: 'sql'
};

export function highlight(code: string, language: Language): HighlightResult {
  const prismLang = languageMap[language];
  const grammar = Prism.languages[prismLang];
  
  if (!grammar) {
    return {
      html: escapeHtml(code),
      language
    };
  }
  
  const html = Prism.highlight(code, grammar, prismLang);
  
  return {
    html,
    language
  };
}

export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
