import { useEffect, useRef } from 'react';
import { useEditor } from '../context/EditorContext';

interface EditorAreaProps {
  onScroll?: (ratio: number) => void;
  scrollTarget?: number | null;
}

function EditorArea({ onScroll, scrollTarget }: EditorAreaProps) {
  const { content, setContent, updateFormatState, isExternalUpdate, editorRef } = useEditor();
  const internalScrollRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (editorRef.current) {
      if (isExternalUpdate.current) {
        const cur = editorRef.current;
        if (cur.innerHTML !== content) {
          cur.innerHTML = content;
        }
        isExternalUpdate.current = false;
      }
    }
  }, [content, editorRef, isExternalUpdate]);

  useEffect(() => {
    const node = editorRef.current;
    if (!node) return;

    if (node.innerHTML === '' && content === '') {
      // ensure contentEditable has a <br> so caret can be placed
      node.innerHTML = '';
    }
  }, []);

  useEffect(() => {
    const handleSelection = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const node = editorRef.current;
      if (!node) return;
      if (node.contains(sel.anchorNode)) {
        updateFormatState();
      }
    };
    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, [updateFormatState, editorRef]);

  useEffect(() => {
    if (scrollTarget === null || scrollTarget === undefined) return;
    const node = editorRef.current;
    if (!node) return;
    internalScrollRef.current = true;
    const maxScroll = node.scrollHeight - node.clientHeight;
    node.scrollTop = maxScroll * scrollTarget;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      internalScrollRef.current = false;
      rafRef.current = null;
    });
  }, [scrollTarget, editorRef]);

  const handleInput = () => {
    const node = editorRef.current;
    if (!node) return;
    isExternalUpdate.current = false;
    setContent(node.innerHTML);
  };

  const handleScroll = () => {
    if (internalScrollRef.current) return;
    const node = editorRef.current;
    if (!node || !onScroll) return;
    const max = node.scrollHeight - node.clientHeight;
    const ratio = max > 0 ? node.scrollTop / max : 0;
    onScroll(ratio);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  const handleKeyUp = () => {
    updateFormatState();
  };

  const handleMouseUp = () => {
    updateFormatState();
  };

  return (
    <div className="editor-area-wrapper">
      <div className="editor-label">编辑区</div>
      <div
        className="editor-area"
        ref={editorRef as React.MutableRefObject<HTMLDivElement>}
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        onInput={handleInput}
        onScroll={handleScroll}
        onPaste={handlePaste}
        onKeyUp={handleKeyUp}
        onMouseUp={handleMouseUp}
        onBlur={updateFormatState}
        data-placeholder="在此输入内容，使用上方工具栏格式化文本..."
      />
    </div>
  );
}

export default EditorArea;
