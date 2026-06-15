import type { FrameData } from '@/types';
import { formatTimestamp } from '@/utils/stack';

interface StyleSnapshotPanelProps {
  frame: FrameData | null;
  startTime: number;
}

export function StyleSnapshotPanel({ frame, startTime }: StyleSnapshotPanelProps) {
  if (!frame) {
    return (
      <div className="panel style-snapshot-panel">
        <div className="panel-header">
          <h3 className="panel-title">样式快照</h3>
        </div>
        <div className="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <p>点击时间轴上的色块查看该帧的样式快照</p>
        </div>
      </div>
    );
  }

  return (
    <div className="panel style-snapshot-panel">
      <div className="panel-header">
        <h3 className="panel-title">样式快照</h3>
        <div className="frame-info">
          <span>帧 {frame.id + 1}</span>
          <span>{formatTimestamp(frame.timestamp, startTime)}</span>
          <span style={{ color: frame.fps < 30 ? '#FFC107' : '#4CAF50' }}>
            {frame.fps.toFixed(0)} FPS
          </span>
        </div>
      </div>
      {frame.reflowElements.length > 0 && (
        <div className="reflow-warning">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 16h2v2h-2v-2zm0-6h2v4h-2v-4z" />
          </svg>
          <span>检测到 {frame.reflowElements.length} 次重排</span>
        </div>
      )}
      <div className="snapshot-content">
        {frame.styleSnapshot.length === 0 ? (
          <div className="empty-state">
            <p>该帧未检测到动画元素</p>
          </div>
        ) : (
          frame.styleSnapshot.map((snapshot, index) => (
            <div key={index} className="element-snapshot">
              <div className="element-path">{snapshot.elementPath}</div>
              <div className="element-styles">
                {Object.entries(snapshot.styles).map(([key, value]) => (
                  <div key={key} className="style-row">
                    <span className="style-prop">{key}:</span>
                    <span className="style-value">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
