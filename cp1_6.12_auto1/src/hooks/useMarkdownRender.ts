import { useState, useEffect, useRef } from 'react';

export function useMarkdownRender(content: string, delay: number = 200) {
  const [debouncedContent, setDebouncedContent] = useState(content);
  const [isRendering, setIsRendering] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setIsRendering(true);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      setDebouncedContent(content);
      setIsRendering(false);
    }, delay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [content, delay]);

  return { debouncedContent, isRendering };
}
