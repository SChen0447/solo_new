export function parseCallStack(error: Error): { functionName: string; stackTrace: string } {
  const stack = error.stack || '';
  const stackTrace = stack;

  const lines = stack.split('\n');
  let functionName = 'anonymous';

  for (const line of lines) {
    const match = line.match(/at\s+([^\s]+)\s+\(/);
    if (match && match[1] && !match[1].includes('requestAnimationFrame')) {
      functionName = match[1];
      break;
    }
  }

  return { functionName, stackTrace };
}

export function formatTime(ms: number): string {
  if (ms < 1000) {
    return `${ms.toFixed(0)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

export function formatTimestamp(timestamp: number, startTime: number): string {
  const elapsed = timestamp - startTime;
  const seconds = Math.floor(elapsed / 1000);
  const ms = Math.floor(elapsed % 1000);
  return `${seconds.toString().padStart(2, '0')}:${ms.toString().padStart(3, '0')}`;
}
