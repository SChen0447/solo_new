import { useEffect, useRef } from 'react';
import { useEditor } from '../context/EditorContext';

interface PreviewPanelProps {
  onScroll?: (ratio: number) => void;
  scrollTarget?: number | null;
}

function PreviewPanel({ onScroll, scrollTarget }: PreviewPanelProps) {
  const { content } = useEditor();
  const previewRef = useRef<HTMLDivElement>(null);
  const internalScrollRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (scrollTarget === null || scrollTarget === undefined) return;
    const node = previewRef.current;
    if (!node) return;
    internalScrollRef.current = true;
    const maxScroll = node.scrollHeight - node.clientHeight;
    node.scrollTop = maxScroll * scrollTarget;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      internalScrollRef.current = false;
      rafRef.current = null;
    });
  }, [scrollTarget]);

  const handleScroll = () => {
    if (internalScrollRef.current) return;
    const node = previewRef.current;
    if (!node || !onScroll) return;
    const max = node.scrollHeight - node.clientHeight;
    const ratio = max > 0 ? node.scrollTop / max : 0;
    onScroll(ratio);
  };

  const renderContent = content || '<p style="color:#9ca3af;margin:0;">暂无内容，开始在左侧编辑区输入...</p>';

  return (
    <div className="preview-wrapper">
      <div className="preview-label">预览</div>
      <div className="preview-panel" ref={previewRef} onScroll={handleScroll}>
        <div className="preview-card markdown-style" dangerouslySetInnerHTML={{ __html: renderContent }} />
      </div>
    </div>
  );
}

export default PreviewPanel;
