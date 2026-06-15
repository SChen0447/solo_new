import html2canvas from 'html2canvas';

export type RenderStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface ScreenshotResult {
  canvas: HTMLCanvasElement | null;
  dataUrl: string;
}

export interface SandboxHandle {
  setHtml: (html: string) => void;
  getScreenshot: () => Promise<ScreenshotResult>;
  getStatus: () => RenderStatus;
  destroy: () => void;
}

export function createSandbox(
  iframe: HTMLIFrameElement,
  onStatusChange?: (status: RenderStatus) => void
): SandboxHandle {
  let currentStatus: RenderStatus = 'idle';
  let loadTimeout: ReturnType<typeof setTimeout> | null = null;

  const setStatus = (status: RenderStatus) => {
    currentStatus = status;
    onStatusChange?.(status);
  };

  const handleLoad = () => {
    if (loadTimeout) {
      clearTimeout(loadTimeout);
      loadTimeout = null;
    }
    setStatus('ready');
  };

  const handleError = () => {
    if (loadTimeout) {
      clearTimeout(loadTimeout);
      loadTimeout = null;
    }
    setStatus('error');
  };

  iframe.addEventListener('load', handleLoad);
  iframe.addEventListener('error', handleError);

  const setHtml = (html: string) => {
    setStatus('loading');

    if (loadTimeout) {
      clearTimeout(loadTimeout);
    }

    try {
      const wrappedHtml = wrapHtml(html);
      const blob = new Blob([wrappedHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);

      iframe.onload = () => {
        URL.revokeObjectURL(url);
        handleLoad();
      };
      iframe.src = url;

      loadTimeout = setTimeout(() => {
        if (currentStatus === 'loading') {
          setStatus('ready');
        }
      }, 5000);
    } catch (e) {
      handleError();
    }
  };

  const getScreenshot = async (): Promise<ScreenshotResult> => {
    try {
      const iframeDoc = iframe.contentDocument;
      if (!iframeDoc || !iframeDoc.body) {
        return { canvas: null, dataUrl: '' };
      }

      const target = iframeDoc.body;
      const canvas = await html2canvas(target, {
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
        logging: false,
        scale: 1,
      });

      const dataUrl = canvas.toDataURL('image/png');
      return { canvas, dataUrl };
    } catch (e) {
      return { canvas: null, dataUrl: '' };
    }
  };

  const getStatus = (): RenderStatus => currentStatus;

  const destroy = () => {
    iframe.removeEventListener('load', handleLoad);
    iframe.removeEventListener('error', handleError);
    if (loadTimeout) {
      clearTimeout(loadTimeout);
    }
  };

  return {
    setHtml,
    getScreenshot,
    getStatus,
    destroy,
  };
}

function wrapHtml(rawHtml: string): string {
  const trimmed = rawHtml.trim();

  if (trimmed.toLowerCase().startsWith('<!doctype') || trimmed.toLowerCase().startsWith('<html')) {
    return trimmed;
  }

  const hasBody = /<body[\s>]/i.test(trimmed);
  const hasHead = /<head[\s>]/i.test(trimmed);
  const hasMetaCharset = /<meta[^>]*charset[^>]*>/i.test(trimmed);
  const hasHtmlTag = /<html[\s>]/i.test(trimmed);

  let result = trimmed;

  if (!hasBody) {
    result = `<body>${result}</body>`;
  }

  if (!hasHead) {
    const headContent = [
      '<head>',
      hasMetaCharset ? '' : '<meta charset="UTF-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
      '</head>',
    ].join('');
    result = headContent + result;
  } else if (!hasMetaCharset) {
    result = result.replace(/<head[\s>]/i, '$&<meta charset="UTF-8">');
  }

  if (!hasHtmlTag) {
    result = `<html>${result}</html>`;
  }

  if (!trimmed.toLowerCase().startsWith('<!doctype')) {
    result = `<!DOCTYPE html>${result}`;
  }

  return result;
}

export function readHtmlFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.name.toLowerCase().endsWith('.html') && !file.name.toLowerCase().endsWith('.htm')) {
      reject(new Error('请选择HTML文件'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = () => {
      reject(new Error('文件读取失败'));
    };
    reader.readAsText(file);
  });
}
