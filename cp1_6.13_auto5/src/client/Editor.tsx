import React, { useRef, useEffect, useCallback, useState } from 'react';

interface RemoteUser {
  id: string;
  nickname: string;
  color: string;
  cursorPosition: number;
  selectionStart: number;
  selectionEnd: number;
}

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  onCursorChange?: (position: number, selectionStart: number, selectionEnd: number) => void;
  remoteUsers: RemoteUser[];
  myColor?: string;
}

interface CursorPosition {
  top: number;
  left: number;
  height: number;
}

const Editor: React.FC<EditorProps> = ({
  value,
  onChange,
  onCursorChange,
  remoteUsers,
  myColor = '#4ECDC4',
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const [lineCount, setLineCount] = useState(1);
  const [cursorInfo, setCursorInfo] = useState<{ position: number; selectionStart: number; selectionEnd: number }>({
    position: 0,
    selectionStart: 0,
    selectionEnd: 0,
  });

  useEffect(() => {
    const lines = value.split('\n').length;
    setLineCount(lines);
  }, [value]);

  const getCursorCoordinates = useCallback(
    (position: number): CursorPosition => {
      const textarea = textareaRef.current;
      if (!textarea) return { top: 0, left: 0, height: 20 };

      const textBeforeCursor = value.substring(0, position);
      const lines = textBeforeCursor.split('\n');
      const currentLineIndex = lines.length - 1;
      const currentLineText = lines[currentLineIndex];

      const lineHeight = 22;
      const fontSize = 14;
      const charWidth = fontSize * 0.6;

      const top = currentLineIndex * lineHeight;
      const left = currentLineText.length * charWidth;

      return {
        top,
        left,
        height: lineHeight,
      };
    },
    [value]
  );

  const getSelectionRect = useCallback(
    (start: number, end: number): { top: number; left: number; height: number; width: number; lines: number } => {
      if (start === end) {
        const pos = getCursorCoordinates(start);
        return { top: pos.top, left: pos.left, height: pos.height, width: 0, lines: 1 };
      }

      const text = value.substring(start, end);
      const lines = text.split('\n');
      const lineHeight = 22;
      const fontSize = 14;
      const charWidth = fontSize * 0.6;

      const startPos = getCursorCoordinates(start);

      if (lines.length === 1) {
        return {
          top: startPos.top,
          left: startPos.left,
          height: lineHeight,
          width: text.length * charWidth,
          lines: 1,
        };
      }

      return {
        top: startPos.top,
        left: startPos.left,
        height: lineHeight * lines.length,
        width: lines[lines.length - 1].length * charWidth,
        lines: lines.length,
      };
    },
    [value, getCursorCoordinates]
  );

  const handleScroll = useCallback(() => {
    const textarea = textareaRef.current;
    const highlight = highlightRef.current;
    const lineNumbers = lineNumbersRef.current;

    if (textarea && highlight) {
      highlight.scrollTop = textarea.scrollTop;
      highlight.scrollLeft = textarea.scrollLeft;
    }
    if (textarea && lineNumbers) {
      lineNumbers.scrollTop = textarea.scrollTop;
    }
  }, []);

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  const handleSelect = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea || !onCursorChange) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const position = end;

    setCursorInfo({ position, selectionStart: start, selectionEnd: end });
    onCursorChange(position, start, end);
  }, [onCursorChange]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.selectionStart = cursorInfo.selectionStart;
      textarea.selectionEnd = cursorInfo.selectionEnd;
    }
  }, [cursorInfo]);

  const renderRemoteCursors = () => {
    return remoteUsers.map((user) => {
      const { top, left, height } = getCursorCoordinates(user.cursorPosition);
      const hasSelection = user.selectionStart !== user.selectionEnd;

      const selectionElements = [];
      if (hasSelection) {
        const textBeforeStart = value.substring(0, user.selectionStart);
        const textBeforeEnd = value.substring(0, user.selectionEnd);
        const startLine = textBeforeStart.split('\n').length - 1;
        const endLine = textBeforeEnd.split('\n').length - 1;
        const lineHeight = 22;
        const charWidth = 14 * 0.6;

        for (let i = startLine; i <= endLine; i++) {
          const lines = value.split('\n');
          const lineText = lines[i] || '';
          let lineLeft = 0;
          let lineWidth = lineText.length * charWidth;

          if (i === startLine) {
            const startCol = user.selectionStart - textBeforeStart.lastIndexOf('\n') - 1;
            lineLeft = startCol * charWidth;
            lineWidth = (endLine === startLine ? user.selectionEnd - user.selectionStart : lineText.length - startCol) * charWidth;
          } else if (i === endLine) {
            lineWidth = (user.selectionEnd - value.substring(0, user.selectionEnd).lastIndexOf('\n') - 1) * charWidth;
          }

          selectionElements.push(
            <div
              key={`sel-${user.id}-${i}`}
              className="remote-selection"
              style={{
                top: i * lineHeight,
                left: lineLeft,
                width: lineWidth,
                height: lineHeight,
                backgroundColor: user.color,
                opacity: 0.3,
              }}
            />
          );
        }
      }

      return (
        <div key={user.id} className="remote-cursor" style={{ top, left }}>
          {selectionElements}
          <div
            className="cursor-line"
            style={{
              height,
              backgroundColor: user.color,
            }}
          />
          <div
            className="cursor-label"
            style={{
              backgroundColor: user.color,
            }}
          >
            {user.nickname}
          </div>
        </div>
      );
    });
  };

  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  return (
    <div className="editor-container" ref={containerRef}>
      <div className="line-numbers" ref={lineNumbersRef}>
        {lineNumbers.map((num) => (
          <div key={num} className="line-number">
            {num}
          </div>
        ))}
      </div>

      <div className="editor-content">
        <div className="highlight-overlay" ref={highlightRef}>
          <pre className="highlight-content">
            <code>{value + '\n'}</code>
          </pre>
          <div className="remote-cursors">{renderRemoteCursors()}</div>
        </div>

        <textarea
          ref={textareaRef}
          className="editor-textarea"
          value={value}
          onChange={handleInput}
          onScroll={handleScroll}
          onSelect={handleSelect}
          onKeyUp={handleSelect}
          onClick={handleSelect}
          onBlur={handleSelect}
          spellCheck={false}
        />
      </div>
    </div>
  );
};

export default Editor;
