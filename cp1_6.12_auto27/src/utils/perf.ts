const perfTimers: Map<string, number> = new Map();

export function perfStart(label: string): void {
  perfTimers.set(label, performance.now());
}

export function perfEnd(label: string): number {
  const start = perfTimers.get(label);
  if (start === undefined) return -1;
  const duration = performance.now() - start;
  perfTimers.delete(label);
  if (duration > 100) {
    console.warn(`[Perf] ${label} took ${duration.toFixed(2)}ms (> 100ms threshold)`);
  } else {
    console.debug(`[Perf] ${label} took ${duration.toFixed(2)}ms`);
  }
  return duration;
}

export function scheduleUpdate(callback: () => void, label: string): void {
  perfStart(label);
  requestAnimationFrame(() => {
    callback();
    requestAnimationFrame(() => {
      perfEnd(label);
    });
  });
}

export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn(...args);
      timer = null;
    }, delay);
  };
}

export function throttle<T extends (...args: unknown[]) => void>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= limit) {
      lastCall = now;
      fn(...args);
    } else if (!timer) {
      timer = setTimeout(() => {
        lastCall = Date.now();
        fn(...args);
        timer = null;
      }, limit - (now - lastCall));
    }
  };
}
