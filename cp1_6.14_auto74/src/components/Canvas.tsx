import { useRef, useEffect, useCallback } from 'react';
import { useIdeaStore } from '../store/useIdeaStore';
import { IdeaCard } from './IdeaCard';
import styles from './Canvas.module.css';

export function Canvas() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const cards = useIdeaStore((s) => s.cards);
  const scale = useIdeaStore((s) => s.scale);
  const setScale = useIdeaStore((s) => s.setScale);
  const openEditor = useIdeaStore((s) => s.openEditor);

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setScale(scale + delta);
      }
    },
    [scale, setScale]
  );

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    wrapper.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      wrapper.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (rect) {
        const x = e.clientX - rect.left - 170;
        const y = e.clientY - rect.top - 80;
        openEditor(Math.max(20, x), Math.max(80, y));
      }
    }
  };

  const scalePercent = Math.round(scale * 100);

  return (
    <div
      ref={wrapperRef}
      className={styles.canvasWrapper}
      onClick={handleCanvasClick}
    >
      <div
        className={styles.canvasSurface}
        style={{ transform: `scale(${scale})` }}
      >
        {cards.map((card) => (
          <IdeaCard key={card.id} card={card} scale={scale} />
        ))}
      </div>

      <div className={styles.scaleIndicator}>缩放 {scalePercent}%</div>

      {cards.length === 0 && (
        <div className={styles.emptyHint}>
          <div className={styles.emptyHintIcon}>✦</div>
          <div className={styles.emptyHintText}>点击画布空白处</div>
          <div className={styles.emptyHintText}>记录你的第一片灵感</div>
          <div className={styles.emptyHintSub}>
            按住 Ctrl + 滚轮可缩放画布
          </div>
        </div>
      )}
    </div>
  );
}
