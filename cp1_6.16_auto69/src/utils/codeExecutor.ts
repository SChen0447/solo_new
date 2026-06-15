export function executeJavaScript(code: string): Promise<string> {
  return new Promise((resolve) => {
    const logs: string[] = [];
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;

    console.log = (...args: unknown[]) => {
      logs.push(args.map((a) =>
        typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)
      ).join(' '));
      originalConsoleLog.apply(console, args);
    };

    console.error = (...args: unknown[]) => {
      logs.push(`[ERROR] ${args.map((a) =>
        typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)
      ).join(' ')}`);
      originalConsoleError.apply(console, args);
    };

    console.warn = (...args: unknown[]) => {
      logs.push(`[WARN] ${args.map((a) =>
        typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)
      ).join(' ')}`);
      originalConsoleWarn.apply(console, args);
    };

    try {
      const result = new Function(code)();
      if (result !== undefined) {
        logs.push(`=> ${typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)}`);
      }
    } catch (error) {
      logs.push(`[ERROR] ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
    }

    setTimeout(() => {
      resolve(logs.join('\n') || '(无输出)');
    }, 100);
  });
}

export function executePython(code: string): Promise<string> {
  return Promise.resolve('Python 代码执行需要后端支持，当前仅展示代码。\n\n模拟输出:\nHello, World!');
}

export async function executeCode(
  language: string,
  code: string
): Promise<string> {
  switch (language.toLowerCase()) {
    case 'javascript':
    case 'js':
      return executeJavaScript(code);
    case 'typescript':
    case 'ts':
      return executeJavaScript(code);
    case 'python':
    case 'py':
      return executePython(code);
    default:
      return `不支持的语言: ${language}`;
  }
}
