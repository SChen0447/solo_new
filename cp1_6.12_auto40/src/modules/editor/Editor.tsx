import React, { useCallback, useMemo, useEffect, useState, useRef } from 'react';
import { createEditor, Editor as SlateEditor, Transforms, Element as SlateElement, Text, Range, Path } from 'slate';
import { Slate, Editable, withReact, ReactEditor } from 'slate-react';
import { withHistory } from 'slate-history';
import { useCollaboration } from '../collaboration/CollaborationProvider';
import type { OnlineUser } from '../../types';

type MarkKey = 'bold' | 'italic';

const LIST_TYPES = ['numbered-list', 'bulleted-list'];

function toggleBlock(editor: SlateEditor, format: string) {
  const isActive = isBlockActive(editor, format);
  const isList = LIST_TYPES.includes(format);

  Transforms.unwrapNodes(editor, {
    match: (n) => !SlateEditor.isEditor(n) && SlateElement.isElement(n) && LIST_TYPES.includes(n.type),
    split: true,
  });

  Transforms.setNodes(editor, {
    type: isActive ? 'paragraph' : isList ? 'list-item' : (format as any),
  });

  if (!isActive && isList) {
    const block = { type: format as any, children: [] };
    Transforms.wrapNodes(editor, block as any);
  }
}

function toggleMark(editor: SlateEditor, format: MarkKey) {
  const isActive = isMarkActive(editor, format);
  if (isActive) {
    SlateEditor.removeMark(editor, format);
  } else {
    SlateEditor.addMark(editor, format, true);
  }
}

function isBlockActive(editor: SlateEditor, format: string): boolean {
  const { selection } = editor;
  if (!selection) return false;
  const [match] = SlateEditor.nodes(editor, {
    at: SlateEditor.unhangRange(editor, selection),
    match: (n) => !SlateEditor.isEditor(n) && SlateElement.isElement(n) && n.type === format,
  });
  return !!match;
}

function isMarkActive(editor: SlateEditor, format: MarkKey): boolean {
  const marks = SlateEditor.marks(editor) as Record<string, boolean> | null;
  return marks ? !!marks[format] : false;
}

interface ToolbarProps {
  editor: SlateEditor;
}

function Toolbar({ editor }: ToolbarProps) {
  return (
    <div style={styles.toolbar}>
      <ToolbarButton
        label="B"
        title="加粗 (Ctrl+B)"
        active={isMarkActive(editor, 'bold')}
        onClick={() => toggleMark(editor, 'bold')}
        styleOverride={styles.boldBtn}
      />
      <ToolbarButton
        label="I"
        title="斜体 (Ctrl+I)"
        active={isMarkActive(editor, 'italic')}
        onClick={() => toggleMark(editor, 'italic')}
        styleOverride={styles.italicBtn}
      />
      <div style={styles.divider} />
      <ToolbarButton
        label="H1"
        title="标题1 (Ctrl+1)"
        active={isBlockActive(editor, 'heading-one')}
        onClick={() => toggleBlock(editor, 'heading-one')}
      />
      <ToolbarButton
        label="H2"
        title="标题2 (Ctrl+2)"
        active={isBlockActive(editor, 'heading-two')}
        onClick={() => toggleBlock(editor, 'heading-two')}
      />
      <ToolbarButton
        label="H3"
        title="标题3 (Ctrl+3)"
        active={isBlockActive(editor, 'heading-three')}
        onClick={() => toggleBlock(editor, 'heading-three')}
      />
      <div style={styles.divider} />
      <ToolbarButton
        label="• 列表"
        title="无序列表 (Ctrl+Shift+8)"
        active={isBlockActive(editor, 'bulleted-list')}
        onClick={() => toggleBlock(editor, 'bulleted-list')}
      />
      <ToolbarButton
        label="1. 列表"
        title="有序列表 (Ctrl+Shift+7)"
        active={isBlockActive(editor, 'numbered-list')}
        onClick={() => toggleBlock(editor, 'numbered-list')}
      />
    </div>
  );
}

interface ToolbarButtonProps {
  label: string;
  title: string;
  active: boolean;
  onClick: () => void;
  styleOverride?: React.CSSProperties;
}

function ToolbarButton({ label, title, active, onClick, styleOverride }: ToolbarButtonProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...styles.toolBtn,
        ...(active ? styles.toolBtnActive : {}),
        ...(hovered ? styles.toolBtnHover : {}),
        ...styleOverride,
      }}
    >
      {label}
    </button>
  );
}

function CursorMarker({ user, top, left }: { user: OnlineUser; top: number; left: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        top,
        left,
        pointerEvents: 'none',
        zIndex: 10,
      }}
    >
      <div
        style={{
          width: 2,
          height: 20,
          backgroundColor: user.color,
          borderRadius: 1,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: -18,
          left: 0,
          backgroundColor: user.color,
          color: '#fff',
          fontSize: 10,
          padding: '1px 5px',
          borderRadius: 3,
          whiteSpace: 'nowrap',
          fontWeight: 600,
        }}
      >
        {user.name}
      </div>
    </div>
  );
}

interface EditorProps {
  docTitle: string;
}

export default function Editor({ docTitle }: EditorProps) {
  const editor = useMemo(() => withHistory(withReact(createEditor())), []);
  const { ydoc, onlineUsers, sendCursorUpdate, cursors } = useCollaboration();
  const [cursorPositions, setCursorPositions] = useState<{ userId: string; user: OnlineUser; top: number; left: number }[]>([]);

  const yxmlFragment = useMemo(() => ydoc.getXmlFragment('document'), [ydoc]);

  const initialValue: any[] = useMemo(() => {
    try {
      const json = yxmlFragment.toJSON();
      if (json && Array.isArray(json) && json.length > 0) {
        return json;
      }
    } catch {}
    return [{ type: 'paragraph', children: [{ text: '' }] }];
  }, []);

  const renderElement = useCallback((props: any) => {
    const { attributes, children, element } = props;
    switch (element.type) {
      case 'heading-one':
        return <h1 {...attributes} style={styles.h1}>{children}</h1>;
      case 'heading-two':
        return <h2 {...attributes} style={styles.h2}>{children}</h2>;
      case 'heading-three':
        return <h3 {...attributes} style={styles.h3}>{children}</h3>;
      case 'bulleted-list':
        return <ul {...attributes} style={styles.ul}>{children}</ul>;
      case 'numbered-list':
        return <ol {...attributes} style={styles.ol}>{children}</ol>;
      case 'list-item':
        return <li {...attributes}>{children}</li>;
      default:
        return <p {...attributes} style={styles.paragraph}>{children}</p>;
    }
  }, []);

  const renderLeaf = useCallback((props: any) => {
    const { attributes, children, leaf } = props;
    let el = children;
    if (leaf.bold) el = <strong>{el}</strong>;
    if (leaf.italic) el = <em>{el}</em>;
    return <span {...attributes}>{el}</span>;
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const isMod = event.ctrlKey || event.metaKey;
      const isShift = event.shiftKey;

      if (isMod) {
        switch (event.key) {
          case 'b':
          case 'B':
            event.preventDefault();
            event.stopPropagation();
            toggleMark(editor, 'bold');
            return;
          case 'i':
          case 'I':
            event.preventDefault();
            event.stopPropagation();
            toggleMark(editor, 'italic');
            return;
          case '1':
            event.preventDefault();
            event.stopPropagation();
            toggleBlock(editor, 'heading-one');
            return;
          case '2':
            event.preventDefault();
            event.stopPropagation();
            toggleBlock(editor, 'heading-two');
            return;
          case '3':
            event.preventDefault();
            event.stopPropagation();
            toggleBlock(editor, 'heading-three');
            return;
          case '8':
            if (isShift) {
              event.preventDefault();
              event.stopPropagation();
              toggleBlock(editor, 'bulleted-list');
              return;
            }
            break;
          case '7':
            if (isShift) {
              event.preventDefault();
              event.stopPropagation();
              toggleBlock(editor, 'numbered-list');
              return;
            }
            break;
        }
      }
    },
    [editor]
  );

  const handleChange = useCallback(
    (value: any[]) => {
      const { selection } = editor;
      if (selection && Range.isCollapsed(selection)) {
        try {
          const domPoint = ReactEditor.toDOMPoint(editor, selection.anchor);
          const rect = domPoint[0].parentElement?.getBoundingClientRect();
          if (rect) {
            sendCursorUpdate({
              top: rect.top,
              left: rect.left,
              path: selection.anchor.path,
              offset: selection.anchor.offset,
            });
          }
        } catch {}
      }

      try {
        const json = JSON.stringify(value);
        const parsed = JSON.parse(json);
        ydoc.transact(() => {
          yxmlFragment.delete(0, yxmlFragment.length);
          for (const node of parsed) {
            const yNode = new Y.XmlElement(node.type || 'paragraph');
            if (node.children) {
              for (const child of node.children) {
                if (child.text !== undefined) {
                  const yText = new Y.XmlText();
                  yText.insert(0, child.text);
                  if (child.bold) yText.format(0, child.text.length, { bold: true });
                  if (child.italic) yText.format(0, child.text.length, { italic: true });
                  yNode.push([yText]);
                }
              }
            }
            yxmlFragment.push([yNode]);
          }
        });
      } catch (e) {
        console.error('[Editor] yjs sync error:', e);
      }
    },
    [editor, ydoc, yxmlFragment, sendCursorUpdate]
  );

  useEffect(() => {
    const positions: typeof cursorPositions = [];
    cursors.forEach((val, userId) => {
      positions.push({ userId, user: val.user, top: val.cursor?.top ?? 0, left: val.cursor?.left ?? 0 });
    });
    setCursorPositions(positions);
  }, [cursors]);

  return (
    <div style={styles.container}>
      <Toolbar editor={editor} />
      <div style={styles.editorWrap}>
        <div style={styles.docTitle}>{docTitle}</div>
        <div style={{ position: 'relative' }}>
          {cursorPositions.map((cp) => (
            <CursorMarker key={cp.userId} user={cp.user} top={cp.top} left={cp.left} />
          ))}
          <Slate editor={editor} initialValue={initialValue} onChange={handleChange}>
            <Editable
              renderElement={renderElement}
              renderLeaf={renderLeaf}
              onKeyDown={handleKeyDown}
              placeholder="开始编辑..."
              style={styles.editable}
              spellCheck
            />
          </Slate>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minHeight: 0,
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '8px 16px',
    backgroundColor: '#2C3E50',
    borderBottom: '1px solid #1a252f',
    flexShrink: 0,
    flexWrap: 'wrap',
  },
  toolBtn: {
    border: 'none',
    background: 'transparent',
    color: '#CBD5E1',
    padding: '6px 10px',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    transition: 'background 0.15s, color 0.15s',
    userSelect: 'none' as const,
  },
  toolBtnActive: {
    background: 'rgba(255,255,255,0.15)',
    color: '#fff',
  },
  toolBtnHover: {
    background: 'rgba(255,255,255,0.1)',
    color: '#fff',
  },
  boldBtn: {
    fontWeight: 700,
  },
  italicBtn: {
    fontStyle: 'italic',
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    margin: '0 4px',
  },
  editorWrap: {
    flex: 1,
    overflowY: 'auto',
    backgroundColor: '#fff',
    padding: '24px 48px',
  },
  docTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: '#1E293B',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottom: '1px solid #E2E8F0',
  },
  editable: {
    minHeight: 400,
    fontSize: 15,
    lineHeight: 1.75,
    color: '#334155',
    outline: 'none',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  paragraph: {
    margin: '0 0 8px 0',
    lineHeight: 1.75,
  },
  h1: {
    fontSize: 28,
    fontWeight: 700,
    color: '#0F172A',
    margin: '24px 0 12px 0',
    lineHeight: 1.3,
  },
  h2: {
    fontSize: 22,
    fontWeight: 600,
    color: '#1E293B',
    margin: '20px 0 10px 0',
    lineHeight: 1.35,
  },
  h3: {
    fontSize: 18,
    fontWeight: 600,
    color: '#334155',
    margin: '16px 0 8px 0',
    lineHeight: 1.4,
  },
  ul: {
    margin: '8px 0',
    paddingLeft: 24,
    listStyleType: 'disc',
  },
  ol: {
    margin: '8px 0',
    paddingLeft: 24,
    listStyleType: 'decimal',
  },
};
