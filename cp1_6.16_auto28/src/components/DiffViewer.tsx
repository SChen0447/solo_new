import { useRef, useCallback, useEffect } from 'react';
import { ConflictCard } from './ConflictCard';
import { useAppStore } from '../store/useAppStore';
import type { ParagraphDiff } from '../types';

export function DiffViewer() {
  const { diffs, resolutions, selectVersion, editManual } = useAppStore();

  const leftRef = useRef<HTMLDivElement>(null);
  const middleRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const isSyncingRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const activePanelRef = useRef<'left' | 'middle' | 'right' | null>(null);

  const syncScroll = useCallback((source: 'left' | 'middle' | 'right') => {
    if (isSyncingRef.current) return;
    if (activePanelRef.current && activePanelRef.current !== source) return;

    activePanelRef.current = source;

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      isSyncingRef.current = true;

      const sourceEl =
        source === 'left' ? leftRef.current : source === 'middle' ? middleRef.current : rightRef.current;

      if (!sourceEl) {
        isSyncingRef.current = false;
        activePanelRef.current = null;
        return;
      }

      const scrollTop = sourceEl.scrollTop;

      if (source !== 'left' && leftRef.current) {
        leftRef.current.scrollTop = scrollTop;
      }
      if (source !== 'middle' && middleRef.current) {
        middleRef.current.scrollTop = scrollTop;
      }
      if (source !== 'right' && rightRef.current) {
        rightRef.current.scrollTop = scrollTop;
      }

      isSyncingRef.current = false;
    });
  }, []);

  const handleScrollEnd = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    activePanelRef.current = null;
    isSyncingRef.current = false;
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const renderParagraphA = (diff: ParagraphDiff) => {
    if (diff.type === 'added') {
      return <div className="paragraph-placeholder" />;
    }
    const bgClass = diff.type === 'equal'
      ? 'para-equal'
      : diff.type === 'removed'
      ? 'para-removed'
      : 'para-modified-side';

    return (
      <div className={`paragraph ${bgClass}`} data-diff-id={diff.id}>
        {diff.type === 'removed' && <span className="para-icon">−</span>}
        <p>{diff.contentA}</p>
      </div>
    );
  };

  const renderParagraphB = (diff: ParagraphDiff) => {
    if (diff.type === 'removed') {
      return <div className="paragraph-placeholder" />;
    }
    const bgClass = diff.type === 'equal'
      ? 'para-equal'
      : diff.type === 'added'
      ? 'para-added'
      : 'para-modified-side';

    return (
      <div className={`paragraph ${bgClass}`} data-diff-id={diff.id}>
        {diff.type === 'added' && <span className="para-icon">+</span>}
        <p>{diff.contentB}</p>
      </div>
    );
  };

  const renderMiddle = (diff: ParagraphDiff) => {
    if (diff.type === 'equal') {
      return (
        <div className="paragraph para-equal" data-diff-id={diff.id}>
          <p>{diff.contentA}</p>
        </div>
      );
    }

    return (
      <div className="conflict-wrapper" data-diff-id={diff.id}>
        <ConflictCard
          diff={diff}
          resolution={resolutions[diff.id]}
          onSelectA={() => selectVersion(diff.id, 'A')}
          onSelectB={() => selectVersion(diff.id, 'B')}
          onEdit={(content) => editManual(diff.id, content)}
        />
      </div>
    );
  };

  return (
    <div className="diff-viewer">
      <div className="diff-column column-a">
        <div className="column-header">A 版本</div>
        <div
          className="column-content"
          ref={leftRef}
          onScroll={() => syncScroll('left')}
          onWheel={() => syncScroll('left')}
          onMouseUp={handleScrollEnd}
          onTouchEnd={handleScrollEnd}
        >
          {diffs.map((diff) => (
            <div key={diff.id} className="paragraph-row">
              {renderParagraphA(diff)}
            </div>
          ))}
        </div>
      </div>

      <div className="diff-column column-merge">
        <div className="column-header">合并候选版</div>
        <div
          className="column-content"
          ref={middleRef}
          onScroll={() => syncScroll('middle')}
          onWheel={() => syncScroll('middle')}
          onMouseUp={handleScrollEnd}
          onTouchEnd={handleScrollEnd}
        >
          {diffs.map((diff) => (
            <div key={diff.id} className="paragraph-row">
              {renderMiddle(diff)}
            </div>
          ))}
        </div>
      </div>

      <div className="diff-column column-b">
        <div className="column-header">B 版本</div>
        <div
          className="column-content"
          ref={rightRef}
          onScroll={() => syncScroll('right')}
          onWheel={() => syncScroll('right')}
          onMouseUp={handleScrollEnd}
          onTouchEnd={handleScrollEnd}
        >
          {diffs.map((diff) => (
            <div key={diff.id} className="paragraph-row">
              {renderParagraphB(diff)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
