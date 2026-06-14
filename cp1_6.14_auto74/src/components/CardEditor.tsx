import { useState, useEffect, useRef } from 'react';
import {
  useIdeaStore,
  EMOTIONS,
  createCardWithRandomPosition,
} from '../store/useIdeaStore';
import styles from './CardEditor.module.css';

export function CardEditor() {
  const editor = useIdeaStore((s) => s.editor);
  const closeEditor = useIdeaStore((s) => s.closeEditor);
  const addCard = useIdeaStore((s) => s.addCard);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedEmotion, setSelectedEmotion] = useState<string>('');
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editor.isOpen) {
      setTitle('');
      setContent('');
      setSelectedEmotion(EMOTIONS[0].id);
    }
  }, [editor.isOpen]);

  if (!editor.isOpen) return null;

  const titleValid = title.trim().length > 0 && title.trim().length <= 30;
  const contentValid = content.trim().length <= 200;
  const canSubmit = titleValid && contentValid && selectedEmotion;

  const handleSubmit = () => {
    if (!canSubmit) return;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight - 80;

    const cardData = createCardWithRandomPosition(
      title.trim(),
      content.trim(),
      selectedEmotion,
      viewportWidth,
      viewportHeight
    );

    addCard(cardData);
    closeEditor();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      closeEditor();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeEditor();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSubmit();
    }
  };

  const editorLeft = Math.min(
    Math.max(editor.x, 20),
    window.innerWidth - 380
  );
  const editorTop = Math.min(
    Math.max(editor.y, 80),
    window.innerHeight - 500
  );

  return (
    <div
      ref={overlayRef}
      className={styles.overlay}
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
    >
      <div
        className={styles.editor}
        style={{ left: editorLeft, top: editorTop }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.editorHeader}>
          <h3 className={styles.editorTitle}>记录灵感碎片</h3>
          <button className={styles.closeBtn} onClick={closeEditor}>
            ×
          </button>
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>
            标题 ({title.length}/30)
          </label>
          <input
            className={styles.input}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 30))}
            placeholder="给这个念头起个名字..."
            autoFocus
            maxLength={30}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>
            内容 ({content.length}/200)
          </label>
          <textarea
            className={styles.textarea}
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, 200))}
            placeholder="写下此刻的想法..."
            maxLength={200}
          />
          <span
            className={[
              styles.charCount,
              content.length > 200 ? styles.over : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {content.length}/200
          </span>
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>此刻的情绪</label>
          <div className={styles.emotionWheel}>
            {EMOTIONS.map((emotion) => (
              <button
                key={emotion.id}
                type="button"
                data-name={emotion.name}
                className={[
                  styles.emotionOption,
                  selectedEmotion === emotion.id ? styles.selected : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{ backgroundColor: emotion.color }}
                onClick={() => setSelectedEmotion(emotion.id)}
                title={emotion.name}
              />
            ))}
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.btnCancel} onClick={closeEditor}>
            取消
          </button>
          <button
            className={styles.btnConfirm}
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            贴上画板
          </button>
        </div>
      </div>
    </div>
  );
}
