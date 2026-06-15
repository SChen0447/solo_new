import { useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { generateCode, highlightCode } from '@/utils/shapeRecognizer';

export default function CodePreview() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const generatedCode = useAppStore((s) => s.generatedCode);
  const shapes = useAppStore((s) => s.shapes);
  const selectShape = useAppStore((s) => s.selectShape);
  const codeGenerated = useAppStore((s) => s.codeGenerated);

  const highlightedCode = codeGenerated ? highlightCode(generatedCode) : '';

  useEffect(() => {
    if (!codeGenerated || !generatedCode) return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument;
    if (!doc) return;

    doc.open();
    doc.write(generatedCode);
    doc.close();

    doc.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const shapeId = target.closest('[data-shape-id]')?.getAttribute('data-shape-id');
      if (shapeId) {
        selectShape(shapeId);
      }
    });

    const allElements = doc.querySelectorAll('[data-shape-id]');
    allElements.forEach((el) => {
      (el as HTMLElement).style.cursor = 'pointer';
      (el as HTMLElement).style.transition = 'outline 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    });
  }, [generatedCode, codeGenerated, selectShape]);

  useEffect(() => {
    if (!codeGenerated || !generatedCode) return;
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument;
    if (!doc) return;

    const selectedId = useAppStore.getState().selectedShapeId;
    const allElements = doc.querySelectorAll('[data-shape-id]');
    allElements.forEach((el) => {
      const id = el.getAttribute('data-shape-id');
      if (id === selectedId) {
        (el as HTMLElement).style.outline = '2px dashed #e74c3c';
        (el as HTMLElement).style.outlineOffset = '2px';
      } else {
        (el as HTMLElement).style.outline = 'none';
      }
    });
  }, [codeGenerated, generatedCode, useAppStore.getState().selectedShapeId]);

  const handleCopy = useCallback(async () => {
    if (!generatedCode) return;
    try {
      await navigator.clipboard.writeText(generatedCode);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = generatedCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  }, [generatedCode]);

  const handleExport = useCallback(() => {
    if (!generatedCode) return;
    const blob = new Blob([generatedCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sketch2code.html';
    a.click();
    URL.revokeObjectURL(url);
  }, [generatedCode]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
        <span className="text-xs font-medium text-gray-500">
          {codeGenerated ? `${shapes.length} 个组件` : '点击「生成」按钮以生成代码'}
        </span>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            disabled={!codeGenerated}
            className="px-3 py-1 text-xs rounded border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            复制代码
          </button>
          <button
            onClick={handleExport}
            disabled={!codeGenerated}
            className="px-3 py-1 text-xs rounded border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            导出HTML
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto bg-gray-50" style={{ flexBasis: '45%' }}>
        {codeGenerated ? (
          <pre className="p-3 text-sm leading-relaxed" style={{ fontFamily: 'monospace', fontSize: '14px' }}>
            <code dangerouslySetInnerHTML={{ __html: highlightedCode }} />
          </pre>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            在左侧画布绘制图形后点击生成
          </div>
        )}
      </div>

      <div className="border-t border-gray-200" style={{ flexBasis: '55%', minHeight: 0 }}>
        <div className="px-3 py-1.5 border-b border-gray-100 bg-gray-50">
          <span className="text-xs font-medium text-gray-500">实时预览</span>
        </div>
        <div className="h-full overflow-hidden" style={{ height: 'calc(100% - 30px)' }}>
          <iframe
            ref={iframeRef}
            title="Preview"
            className="w-full h-full border-0"
            style={{ minHeight: '120px' }}
          />
        </div>
      </div>
    </div>
  );
}
