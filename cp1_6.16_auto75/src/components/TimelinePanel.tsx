import { useRef, useEffect, useCallback } from 'react';
import type { FrameData } from '@/types';
import { formatTimestamp } from '@/utils/stack';

interface TimelinePanelProps {
  frames: FrameData[];
  selectedIndex: number;
  onSelectFrame: (index: number) => void;
  startTime: number;
}

function getFrameColor(frame: FrameData): string {
  if (frame.reflowElements.length > 0) {
    return '#F44336';
  }
  if (frame.fps < 30) {
    return '#FFC107';
  }
  return '#4CAF50';
}

export function TimelinePanel({ frames, selectedIndex, onSelectFrame, startTime }: TimelinePanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current && frames.length > 0) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [frames.length]);

  const handleFrameClick = useCallback(
    (index: number) => {
      onSelectFrame(index);
    },
    [onSelectFrame]
  );

  const duration = frames.length > 0 ? frames[frames.length - 1].timestamp - startTime : 0;

  return (
    <div className="panel timeline-panel" ref={containerRef}>
      <div className="panel-header">
        <h3 className="panel-title">时间轴</h3>
        <div className="timeline-stats">
          <span>帧数: <strong>{frames.length}</strong></span>
          <span>时长: <strong>{(duration / 1000).toFixed(2)}s</strong></span>
        </div>
      </div>
      <div className="timeline-legend">
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#4CAF50' }}></span>
          <span>正常帧</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#FFC107' }}></span>
          <span>低帧率 (&lt;30fps)</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#F44336' }}></span>
          <span>重排</span>
        </div>
      </div>
      <div className="timeline-container" ref={scrollRef}>
        <div className="timeline-tracks">
          {frames.length > 0 && (
            <div className="timeline-track labels">
              {Array.from({ length: Math.ceil(duration / 1000) + 1 }).map((_, i) => (
                <div
                  key={i}
                  className="timeline-label"
                  style={{ left: `${(i * 1000 / (duration || 1)) * 100}%` }}
                >
                  {i}s
                </div>
              ))}
            </div>
          )}
          <div className="timeline-track frames">
            {frames.map((frame, index) => (
              <div
                key={frame.id}
                className={`frame-block ${selectedIndex === index ? 'selected' : ''}`}
                style={{
                  backgroundColor: getFrameColor(frame),
                  left: `${((frame.timestamp - startTime) / (duration || 1)) * 100}%`,
                }}
                onClick={() => handleFrameClick(index)}
                title={`帧 ${index + 1}: ${frame.fps.toFixed(0)}fps, ${frame.duration.toFixed(1)}ms${frame.reflowElements.length > 0 ? `, ${frame.reflowElements.length}次重排` : ''}`}
              >
                {selectedIndex === index && (
                  <div className="frame-tooltip">
                    <div>帧: {index + 1}</div>
                    <div>FPS: {frame.fps.toFixed(1)}</div>
                    <div>耗时: {frame.duration.toFixed(1)}ms</div>
                    <div>时间: {formatTimestamp(frame.timestamp, startTime)}</div>
                    {frame.reflowElements.length > 0 && (
                      <div>重排: {frame.reflowElements.length}次</div>
                    )}
                    {frame.hasLongTask && (
                      <div>长任务: {frame.longTaskDuration.toFixed(1)}ms</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
