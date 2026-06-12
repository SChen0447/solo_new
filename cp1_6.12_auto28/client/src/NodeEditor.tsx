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
  const noteInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textInputRef.current) {
      textInputRef.current.focus();
      textInputRef.current.select();
    }
  }, []);

  useEffect(() => {
    if (showNoteInput && noteInputRef.current) {
      noteInputRef.current.focus();
    }
  }, [showNoteInput]);

  const handleSubmit = () => {
    const finalText = text.trim() || node.text;
    const finalNote = note.trim() || undefined;
    onSubmit(finalText, finalNote);
  };

  const handleTextKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!showNoteInput && !node.note) {
        handleSubmit();
      } else if (showNoteInput && noteInputRef.current) {
        noteInputRef.current.focus();
      } else {
        handleSubmit();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const handleNoteKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      textInputRef.current?.focus();
    }
  };

  const handleContainerMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div className="node-editor" onMouseDown={handleContainerMouseDown}>
      <input
        ref={textInputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleTextKeyDown}
        onBlur={() => {}}
        className="node-text-input"
        placeholder="输入节点文字，按回车继续"
      />
      {showNoteInput ? (
        <div className="note-input-container">
          <input
            ref={noteInputRef}
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={handleNoteKeyDown}
            className="node-note-input"
            placeholder="输入备注，按回车保存"
          />
          <button
            className="save-note-btn"
            onClick={handleSubmit}
            onMouseDown={handleContainerMouseDown}
          >
            ✓
          </button>
        </div>
      ) : (
        <button
          className="add-note-btn"
          onClick={(e) => {
            e.stopPropagation();
            setShowNoteInput(true);
          }}
          onMouseDown={handleContainerMouseDown}
        >
          + 添加备注
        </button>
      )}
    </div>
  );
};

export default NodeEditor;
