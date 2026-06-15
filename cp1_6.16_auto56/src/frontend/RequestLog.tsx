import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';

interface RequestLogEntry {
  id: string;
  method: string;
  path: string;
  query: Record<string, any>;
  params: Record<string, any>;
  body: any;
  statusCode: number;
  responseTime: number;
  timestamp: number;
  endpointId?: string;
}

interface RequestLogProps {
  logs: RequestLogEntry[];
  onClear: () => void;
}

const METHOD_COLORS: Record<string, string> = {
  GET: '#4CAF50',
  POST: '#2196F3',
  PUT: '#FF9800',
  DELETE: '#F44336',
};

function statusCodeColor(code: number): string {
  if (code >= 200 && code < 300) return '#4CAF50';
  if (code >= 400 && code < 500) return '#FF9800';
  if (code >= 500) return '#F44336';
  return '#D4D4D4';
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', { hour12: false }) + '.' + String(d.getMilliseconds()).padStart(3, '0');
}

const ITEM_HEIGHT = 36;
const VISIBLE_BUFFER = 10;

function RequestLog({ logs, onClear }: RequestLogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);

  const filteredLogs = useMemo(() => {
    if (!searchTerm.trim()) return logs;
    const term = searchTerm.toLowerCase();
    return logs.filter(
      (log) =>
        log.path.toLowerCase().includes(term) ||
        String(log.statusCode).includes(term) ||
        log.method.toLowerCase().includes(term)
    );
  }, [logs, searchTerm]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const handleScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      setScrollTop(scrollContainerRef.current.scrollTop);
    }
  }, []);

  const totalHeight = filteredLogs.length * ITEM_HEIGHT;
  const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - VISIBLE_BUFFER);
  const visibleCount = Math.ceil(containerHeight / ITEM_HEIGHT) + VISIBLE_BUFFER * 2;
  const endIndex = Math.min(filteredLogs.length, startIndex + visibleCount);
  const visibleItems = filteredLogs.slice(startIndex, endIndex);

  return (
    <div className="request-log">
      <div className="log-toolbar">
        <input
          className="log-search"
          type="text"
          placeholder="Search by path or status code..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <span className="log-count">{filteredLogs.length} requests</span>
        <button className="log-clear-btn" onClick={onClear}>
          Clear
        </button>
      </div>
      <div className="log-list-container" ref={scrollContainerRef} onScroll={handleScroll}>
        <div className="log-list-inner" style={{ height: totalHeight }}>
          <div
            className="log-list-items"
            style={{ transform: `translateY(${startIndex * ITEM_HEIGHT}px)` }}
          >
            {visibleItems.map((log) => {
              const isError = log.statusCode >= 400;
              const isSlow = log.responseTime > 200;
              return (
                <div
                  key={log.id}
                  className={`log-entry ${isError ? 'log-entry-error' : ''}`}
                  style={{ height: ITEM_HEIGHT }}
                >
                  {isError && <div className="log-error-bar" />}
                  <span className="log-timestamp">{formatTime(log.timestamp)}</span>
                  <span
                    className="log-method-tag"
                    style={{ backgroundColor: METHOD_COLORS[log.method] || '#888' }}
                  >
                    {log.method}
                  </span>
                  <span className="log-path">{log.path}</span>
                  <span
                    className="log-status"
                    style={{ color: statusCodeColor(log.statusCode) }}
                  >
                    {log.statusCode}
                  </span>
                  <span className={`log-response-time ${isSlow ? 'log-response-slow' : ''}`}>
                    {log.responseTime}ms
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RequestLog;
