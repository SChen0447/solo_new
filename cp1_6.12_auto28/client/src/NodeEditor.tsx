import React, { useState, useRef, useEffect } from 'react';
import { MindMapNode } from './types';

interface NodeEditorProps {
  node: MindMapNode;
  onSubmit: (text: string, note?: string) => void;
  onCancel: () => void;
}

const NodeEditor: React.FC<NodeEditorProps> = ({ node, onSubmit, onCancel }) => {
  const [text, setText] = useState(node.text);
  const [note, setNote] = useState(node.note || '');
  const [showNoteInput, setShowNoteInput] = useState(!!node.note);
  const textInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textInputRef.current) {
      textInputRef.current.focus();
      textInputRef.current.select();
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit(text.trim() || node.text, note.trim() || undefined);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const handleNoteKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit(text.trim() || node.text, note.trim() || undefined);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div className="node-editor" onClick={(e) => e.stopPropagation()}>
      <input
        ref={textInputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        className="node-text-input"
        placeholder="输入节点文字"
      />
      {showNoteInput ? (
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={handleNoteKeyDown}
          className="node-note-input"
          placeholder="输入备注，按回车保存"
          autoFocus
        />
      ) : (
        <button
          className="add-note-btn"
          onClick={(e) => {
            e.stopPropagation();
            setShowNoteInput(true);
          }}
        >
          + 添加备注
        </button>
      )}
    </div>
  );
};

export default NodeEditor;
