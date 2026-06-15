import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef
} from 'react';

export interface FormatState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  h1: boolean;
  h2: boolean;
  insertOrderedList: boolean;
  insertUnorderedList: boolean;
  blockquote: boolean;
  formatBlock?: string;
}

export type FormatCommand =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strikethrough'
  | 'h1'
  | 'h2'
  | 'insertOrderedList'
  | 'insertUnorderedList'
  | 'blockquote'
  | 'removeFormat';

interface EditorContextType {
  content: string;
  setContent: (content: string) => void;
  formatState: FormatState;
  updateFormatState: () => void;
  execFormat: (command: FormatCommand) => void;
  wordCount: number;
  paragraphCount: number;
  showConfirmModal: boolean;
  setShowConfirmModal: (show: boolean) => void;
  clearAll: () => void;
  showSaveToast: boolean;
  lastSavedAt: number | null;
  isExternalUpdate: React.MutableRefObject<boolean>;
  editorRef: React.MutableRefObject<HTMLDivElement | null>;
}

const STORAGE_KEY = 'richtext-editor-content';

const initialFormatState: FormatState = {
  bold: false,
  italic: false,
  underline: false,
  strikethrough: false,
  h1: false,
  h2: false,
  insertOrderedList: false,
  insertUnorderedList: false,
  blockquote: false
};

const EditorContext = createContext<EditorContextType | undefined>(undefined);

function stripHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || '');
}

function countWords(text: string): number {
  return text.length;
}

function countParagraphs(html: string): number {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  const blocks = tmp.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote, div');
  let count = 0;
  blocks.forEach((el) => {
    if ((el.textContent || '').trim().length > 0) {
      count++;
    }
  });
  return count > 0 ? count : (stripHtml(html).trim().length > 0 ? 1 : 0);
}

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const [content, setContentState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved || '';
    } catch {
      return '';
    }
  });
  const [formatState, setFormatState] = useState<FormatState>(initialFormatState);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  const isExternalUpdate = useRef<boolean>(true);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef(content);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  const plainText = stripHtml(content);
  const wordCount = countWords(plainText);
  const paragraphCount = countParagraphs(content);

  const setContent = useCallback((newContent: string) => {
    setContentState(newContent);
  }, []);

  const updateFormatState = useCallback(() => {
    try {
      const newState: FormatState = { ...initialFormatState };
      newState.bold = document.queryCommandState('bold');
      newState.italic = document.queryCommandState('italic');
      newState.underline = document.queryCommandState('underline');
      newState.strikethrough = document.queryCommandState('strikeThrough');
      newState.insertOrderedList = document.queryCommandState('insertOrderedList');
      newState.insertUnorderedList = document.queryCommandState('insertUnorderedList');

      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        let node: Node | null = selection.anchorNode;
        while (node && node.nodeType !== 1) {
          node = node.parentNode;
        }
        while (node) {
          const tag = (node as HTMLElement).tagName;
          if (tag === 'H1') newState.h1 = true;
          if (tag === 'H2') newState.h2 = true;
          if (tag === 'BLOCKQUOTE') newState.blockquote = true;
          node = (node as HTMLElement).parentElement;
        }
      }

      setFormatState(newState);
    } catch {
      setFormatState(initialFormatState);
    }
  }, []);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      Promise.resolve().then(() => {
        try {
          localStorage.setItem(STORAGE_KEY, contentRef.current);
          setLastSavedAt(Date.now());
          setShowSaveToast(true);
          if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
          toastTimerRef.current = setTimeout(() => {
            setShowSaveToast(false);
          }, 1500);
        } catch {
          // ignore storage errors
        }
      });
    }, 5000);
  }, []);

  useEffect(() => {
    if (content !== '') {
      scheduleSave();
    }
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [content, scheduleSave]);

  const execFormat = useCallback((command: FormatCommand) => {
    try {
      if (editorRef.current) {
        editorRef.current.focus();
      }

      switch (command) {
        case 'h1':
        case 'h2': {
          const tag = command === 'h1' ? 'H1' : 'H2';
          document.execCommand('formatBlock', false, tag);
          break;
        }
        case 'blockquote': {
          document.execCommand('formatBlock', false, 'BLOCKQUOTE');
          break;
        }
        case 'strikethrough':
          document.execCommand('strikeThrough', false);
          break;
        default:
          document.execCommand(command, false);
      }

      updateFormatState();

      if (editorRef.current) {
        isExternalUpdate.current = false;
        setContentState(editorRef.current.innerHTML);
      }
    } catch {
      // ignore
    }
  }, [updateFormatState]);

  const clearAll = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    isExternalUpdate.current = true;
    setContentState('');
    setFormatState(initialFormatState);
    setShowConfirmModal(false);
    setLastSavedAt(null);
  }, []);

  const value: EditorContextType = {
    content,
    setContent,
    formatState,
    updateFormatState,
    execFormat,
    wordCount,
    paragraphCount,
    showConfirmModal,
    setShowConfirmModal,
    clearAll,
    showSaveToast,
    lastSavedAt,
    isExternalUpdate,
    editorRef
  };

  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  );
}

export function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) {
    throw new Error('useEditor must be used within EditorProvider');
  }
  return ctx;
}
