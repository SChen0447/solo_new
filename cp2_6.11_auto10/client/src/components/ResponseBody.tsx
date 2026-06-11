import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';

interface ResponseBodyProps {
  body: string;
  isJson: boolean;
}

const CHUNK_SIZE = 4096;
const INITIAL_CHUNKS = 4;

const ResponseBody: React.FC<ResponseBodyProps> = ({ body, isJson }) => {
  const [displayedText, setDisplayedText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const chunkIndexRef = useRef<number>(0);

  const formattedBody = useMemo(() => {
    if (!body) return '';
    if (isJson) {
      try {
        return JSON.stringify(JSON.parse(body), null, 2);
      } catch {
        return body;
      }
    }
    return body;
  }, [body, isJson]);

  const renderChunks = useCallback(() => {
    if (chunkIndexRef.current * CHUNK_SIZE >= formattedBody.length) {
      setIsLoading(false);
      return;
    }

    const start = chunkIndexRef.current * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, formattedBody.length);
    const nextChunk = formattedBody.slice(start, end);

    setDisplayedText((prev) => prev + nextChunk);
    chunkIndexRef.current++;

    if (end < formattedBody.length) {
      animationFrameRef.current = requestAnimationFrame(renderChunks);
    } else {
      setIsLoading(false);
    }
  }, [formattedBody]);

  useEffect(() => {
    setDisplayedText('');
    setIsLoading(true);
    chunkIndexRef.current = 0;

    if (formattedBody.length <= CHUNK_SIZE * INITIAL_CHUNKS) {
      setDisplayedText(formattedBody);
      setIsLoading(false);
      return;
    }

    const initialChunk = formattedBody.slice(0, CHUNK_SIZE * INITIAL_CHUNKS);
    setDisplayedText(initialChunk);
    chunkIndexRef.current = INITIAL_CHUNKS;

    animationFrameRef.current = requestAnimationFrame(renderChunks);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [formattedBody, renderChunks]);

  const lineNumbers = useMemo(() => {
    const lines = displayedText.split('\n').length;
    return Array.from({ length: lines }, (_, i) => i + 1);
  }, [displayedText]);

  return (
    <div className="response-body-container" ref={containerRef} style={{
      height: '100%',
      overflow: 'auto',
      fontFamily: 'Consolas, Monaco, monospace',
      fontSize: 13,
      lineHeight: 1.5,
      backgroundColor: '#272822',
      color: '#f8f8f2',
      display: 'flex',
      position: 'relative',
    }}>
      <div style={{
        flexShrink: 0,
        padding: '12px 8px',
        textAlign: 'right',
        color: '#75715e',
        backgroundColor: '#1e1f1c',
        userSelect: 'none',
        minWidth: 50,
        position: 'sticky',
        left: 0,
        zIndex: 1,
      }}>
        {lineNumbers.map((num) => (
          <div key={num} style={{ height: '1.5em' }}>{num}</div>
        ))}
        {isLoading && <div style={{ height: '1.5em', color: '#49483e' }}>...</div>}
      </div>
      <pre style={{
        margin: 0,
        padding: '12px 16px',
        flex: 1,
        whiteSpace: 'pre',
        wordBreak: 'normal',
        overflowWrap: 'normal',
        overflowX: 'auto',
      }}>
        <code>{displayedText}</code>
      </pre>
      {isLoading && (
        <div style={{
          position: 'sticky',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '8px 16px',
          background: 'linear-gradient(transparent, rgba(39, 40, 34, 0.9))',
          fontSize: 12,
          color: '#75715e',
          textAlign: 'center',
          pointerEvents: 'none',
        }}>
          渲染中... ({Math.floor((displayedText.length / formattedBody.length) * 100)}%)
        </div>
      )}
    </div>
  );
};

export default ResponseBody;
