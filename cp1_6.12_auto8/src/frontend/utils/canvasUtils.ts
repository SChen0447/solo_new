export function throttle<T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    lastArgs = args;

    if (now - lastCall >= delay) {
      lastCall = now;
      fn(...args);
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    } else if (!timeoutId) {
      const remaining = delay - (now - lastCall);
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        if (lastArgs) {
          fn(...lastArgs);
        }
        timeoutId = null;
      }, remaining);
    }
  };
}

export function validateDrawElement(element: any): boolean {
  if (!element || typeof element !== 'object') return false;
  if (typeof element.id !== 'string' || element.id.length === 0) return false;
  if (typeof element.color !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(element.color)) return false;
  if (typeof element.thickness !== 'number' || element.thickness <= 0) return false;
  if (typeof element.userId !== 'string' || element.userId.length === 0) return false;

  if (element.type === 'pen') {
    if (!Array.isArray(element.points)) return false;
    if (element.points.length === 0) return false;
    for (const p of element.points) {
      if (typeof p.x !== 'number' || typeof p.y !== 'number') return false;
    }
    return true;
  }

  if (element.type === 'rectangle' || element.type === 'circle' || element.type === 'line') {
    if (!element.start || typeof element.start.x !== 'number' || typeof element.start.y !== 'number') return false;
    if (!element.end || typeof element.end.x !== 'number' || typeof element.end.y !== 'number') return false;
    return true;
  }

  return false;
}

export function validateStickyNote(sticky: any): boolean {
  if (!sticky || typeof sticky !== 'object') return false;
  if (typeof sticky.id !== 'string' || sticky.id.length === 0) return false;
  if (typeof sticky.x !== 'number' || typeof sticky.y !== 'number') return false;
  if (typeof sticky.width !== 'number' || sticky.width <= 0) return false;
  if (typeof sticky.height !== 'number' || sticky.height <= 0) return false;
  if (typeof sticky.content !== 'string') return false;
  if (typeof sticky.color !== 'string') return false;
  if (typeof sticky.borderColor !== 'string') return false;
  if (typeof sticky.userId !== 'string' || sticky.userId.length === 0) return false;
  return true;
}

export function validateStickyUpdatePayload(payload: any): boolean {
  if (!validateStickyNote(payload)) return false;
  if (typeof payload.content !== 'string') return false;
  return true;
}

export function parseDrawElementFromMessage(message: string): { valid: boolean; element?: any; error?: string } {
  try {
    const parsed = JSON.parse(message);
    if (parsed.type === 'draw' || parsed.type === 'draw-update' || parsed.type === 'draw-finish') {
      if (!validateDrawElement(parsed.element)) {
        return { valid: false, error: 'Invalid draw element structure' };
      }
      return { valid: true, element: parsed.element };
    }
    return { valid: false, error: 'Not a draw message' };
  } catch (e) {
    return { valid: false, error: 'JSON parse error' };
  }
}

export function parseStickyUpdateFromMessage(message: string): { valid: boolean; sticky?: any; error?: string } {
  try {
    const parsed = JSON.parse(message);
    if (parsed.type === 'sticky-add' || parsed.type === 'sticky-update') {
      if (!validateStickyNote(parsed.sticky)) {
        return { valid: false, error: 'Invalid sticky note structure' };
      }
      return { valid: true, sticky: parsed.sticky };
    }
    return { valid: false, error: 'Not a sticky message' };
  } catch (e) {
    return { valid: false, error: 'JSON parse error' };
  }
}

export function createDrawPathElement(
  id: string,
  points: { x: number; y: number }[],
  color: string,
  thickness: number,
  userId: string
) {
  return {
    id,
    type: 'pen' as const,
    points,
    color,
    thickness,
    userId,
  };
}

export function createDrawShapeElement(
  type: 'rectangle' | 'circle' | 'line',
  id: string,
  start: { x: number; y: number },
  end: { x: number; y: number },
  color: string,
  thickness: number,
  userId: string
) {
  return {
    id,
    type,
    start,
    end,
    color,
    thickness,
    userId,
  };
}

export function createStickyNote(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  content: string,
  color: string,
  borderColor: string,
  userId: string
): StickyNote {
  return {
    id,
    x,
    y,
    width,
    height,
    content,
    color,
    borderColor,
    userId,
  };
}

export interface StickyNote {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  color: string;
  borderColor: string;
  userId: string;
}

export function shouldBroadcastCursorMove(lastEmitTime: number, throttleMs: number = 50): boolean {
  return Date.now() - lastEmitTime >= throttleMs;
}

export function measureFrameRate(durationMs: number = 1000): Promise<number> {
  return new Promise((resolve) => {
    let frameCount = 0;
    const startTime = performance.now();

    function countFrame() {
      frameCount++;
      if (performance.now() - startTime < durationMs) {
        requestAnimationFrame(countFrame);
      } else {
        const fps = (frameCount / durationMs) * 1000;
        resolve(Math.round(fps));
      }
    }
    requestAnimationFrame(countFrame);
  });
}

export function measureWebSocketLatency(
  send: (msg: string) => void,
  onMessage: (handler: (msg: string) => void) => () => void,
  echoMessage: string = 'ping'
): Promise<number> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const unsub = onMessage((msg) => {
      if (msg === echoMessage) {
        const latency = Date.now() - startTime;
        unsub();
        resolve(latency);
      }
    });
    send(echoMessage);
  });
}
