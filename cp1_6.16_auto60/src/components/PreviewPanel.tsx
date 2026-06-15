import React, { useRef, useEffect, useCallback } from 'react';
import { useAppStore, VisualDiffData } from '../stores/appStore';
import { createSandbox, SandboxHandle, RenderStatus } from '../core/RenderSandbox';

interface PreviewPanelProps {
  side: 'left' | 'right';
  onSandboxReady: (side: 'left' | 'right', sandbox: SandboxHandle) => void;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({ side, onSandboxReady }) => {
  const code = useAppStore((s) => (side === 'left' ? s.leftCode : s.rightCode));
  const visualDiff = useAppStore((s) => s.visualDiff);
  const showVisualDiff = useAppStore((s) => s.ui.showVisualDiff);
  const setRenderStatus = useAppStore((s) => s.setRenderStatus);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const sandboxRef = useRef<SandboxHandle | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!iframeRef.current) return;

    const handleStatus = (status: RenderStatus) => {
      setRenderStatus(side, status);
    };

    const sandbox = createSandbox(iframeRef.current, handleStatus);
    sandboxRef.current = sandbox;
    onSandboxReady(side, sandbox);

    return () => {
      sandbox.destroy();
    };
  }, [side, onSandboxReady, setRenderStatus]);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!sandboxRef.current) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      sandboxRef.current?.setHtml(code);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [code]);

  const renderDiffOverlay = useCallback(() => {
    if (side !== 'right' || !visualDiff || !showVisualDiff || visualDiff.regions.length === 0) {
      return null;
    }

    return (
      <div className="visual-diff-overlay">
        {visualDiff.regions.map((region, idx) => (
          <div
            key={idx}
            className="diff-region"
            style={{
              left: `${(region.x / visualDiff.scaleX)}px`,
              top: `${(region.y / visualDiff.scaleY)}px`,
              width: `${(region.width / visualDiff.scaleX)}px`,
              height: `${(region.height / visualDiff.scaleY)}px`,
            }}
            title={`差异区域 ${idx + 1}: 位置(${region.x}, ${region.y}) 大小${region.width}x${region.height} 占比${region.areaPercent.toFixed(2)}%`}
          />
        ))}
      </div>
    );
  }, [side, visualDiff, showVisualDiff]);

  const title = side === 'left' ? '预览 - 左侧' : '预览 - 右侧';
  const badgeColor = side === 'left' ? '#4caf50' : '#ff9800';

  return (
    <div className="panel-wrapper">
      <div className="panel-header">
        <div className="panel-label">
          <span className="panel-label-badge" style={{ backgroundColor: badgeColor }}></span>
          {title}
        </div>
        <div style={{ fontSize: '11px', color: '#858585' }}>
          {visualDiff && side === 'right' && showVisualDiff
            ? `${visualDiff.regions.length} 处视觉差异`
            : ''}
        </div>
      </div>
      <div ref={containerRef} className="preview-container">
        <iframe
          ref={iframeRef}
          className="preview-iframe"
          title={`preview-${side}`}
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        />
        {renderDiffOverlay()}
      </div>
    </div>
  );
};

export default PreviewPanel;
