import { useState, useEffect } from 'react';

export function useCountAnimation(target: number, duration: number = 500) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(0);
    const startTime = performance.now();
    const startValue = 0;
    const endValue = target;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const current = Math.round(startValue + (endValue - startValue) * easeOutQuart);
      setCount(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    const timer = setTimeout(() => {
      requestAnimationFrame(animate);
    }, 100);

    return () => clearTimeout(timer);
  }, [target, duration]);

  return count;
}
