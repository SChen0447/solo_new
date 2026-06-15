import { useState, useCallback } from 'react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import JSZip from 'jszip';
import type { ExportProgress, ExportFormat } from '@/types';

export function useExport() {
  const [progress, setProgress] = useState<ExportProgress>({
    status: 'idle',
    progress: 0,
  });

  const estimateDuration = useCallback((content: string): number => {
    const codeBlockCount = (content.match(/```/g) || []).length / 2;
    const apiCount = (content.match(/### (GET|POST|PUT|DELETE)/g) || []).length;
    const baseDuration = 3000;
    const codeBlockTime = codeBlockCount * 100;
    const apiTime = apiCount * 50;
    return Math.min(5000, Math.max(3000, baseDuration + codeBlockTime + apiTime));
  }, []);

  const runWithProgress = useCallback(async (
    totalTime: number,
    callback: () => Promise<void>
  ) => {
    setProgress({ status: 'processing', progress: 0, message: '开始导出...' });

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min(95, (elapsed / totalTime) * 100);
      setProgress({
        status: 'processing',
        progress: newProgress,
        message: newProgress < 50 ? '正在处理文档...' : newProgress < 80 ? '正在生成文件...' : '即将完成...',
      });
    }, 100);

    try {
      await callback();
      clearInterval(interval);
      setProgress({ status: 'completed', progress: 100, message: '导出完成！' });
      setTimeout(() => {
        setProgress({ status: 'idle', progress: 0 });
      }, 1000);
    } catch (error) {
      clearInterval(interval);
      setProgress({
        status: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : '导出失败',
      });
    }
  }, []);

  const generatePDF = useCallback(async (
    content: string,
    title: string
  ): Promise<Uint8Array> => {
    const pdfDoc = await PDFDocument.create();
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const courierFont = await pdfDoc.embedFont(StandardFonts.Courier);

    const pageWidth = 612;
    const pageHeight = 792;
    const margin = 50;
    const contentWidth = pageWidth - 2 * margin;
    const lineHeight = 15;
    const fontSize = 12;
    const headerFontSize = 10;

    const lines = content.split('\n');
    let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    let yPosition = pageHeight - margin;
    let pageNumber = 1;

    const drawHeaderFooter = (page: typeof currentPage, pageNum: number) => {
      const footerY = 30;
      page.drawText(title, {
        x: margin,
        y: pageHeight - 30,
        size: headerFontSize,
        font: helveticaBoldFont,
        color: rgb(0.2, 0.2, 0.2),
      });
      page.drawText(`第 ${pageNum} 页`, {
        x: pageWidth - margin - 50,
        y: footerY,
        size: headerFontSize,
        font: helveticaFont,
        color: rgb(0.4, 0.4, 0.4),
      });
    };

    const newPage = () => {
      pageNumber++;
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      yPosition = pageHeight - margin;
      drawHeaderFooter(currentPage, pageNumber);
    };

    drawHeaderFooter(currentPage, pageNumber);

    let inCodeBlock = false;
    for (const line of lines) {
      if (line.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        continue;
      }

      const currentFont = inCodeBlock ? courierFont : helveticaFont;
      const currentFontSize = inCodeBlock ? 10 : fontSize;
      const textColor = inCodeBlock ? rgb(0.1, 0.1, 0.1) : rgb(0, 0, 0);

      const words = line.split(' ');
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const textWidth = currentFont.widthOfTextAtSize(testLine, currentFontSize);

        if (textWidth > contentWidth && currentLine) {
          if (yPosition < margin + lineHeight) newPage();
          currentPage.drawText(currentLine, {
            x: margin,
            y: yPosition,
            size: currentFontSize,
            font: currentFont,
            color: textColor,
          });
          yPosition -= lineHeight;
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }

      if (currentLine) {
        if (yPosition < margin + lineHeight) newPage();
        currentPage.drawText(currentLine, {
          x: margin,
          y: yPosition,
          size: currentFontSize,
          font: currentFont,
          color: textColor,
        });
        yPosition -= lineHeight;
      }
    }

    return pdfDoc.save();
  }, []);

  const exportPDF = useCallback(async (content: string, title: string) => {
    const duration = estimateDuration(content);

    await runWithProgress(duration, async () => {
      const pdfBytes = await generatePDF(content, title);
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${title || 'document'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
  }, [estimateDuration, runWithProgress, generatePDF]);

  const exportMarkdown = useCallback(async (content: string, title: string) => {
    const duration = estimateDuration(content);

    await runWithProgress(duration, async () => {
      const zip = new JSZip();
      zip.file(`${title || 'document'}.md`, content);

      const images = content.match(/!\[.*?\]\((.*?)\)/g) || [];
      for (let i = 0; i < images.length; i++) {
        const match = images[i].match(/!\[.*?\]\((.*?)\)/);
        if (match && match[1] && !match[1].startsWith('http')) {
          try {
            const response = await fetch(match[1]);
            const blob = await response.blob();
            zip.file(`images/${match[1].split('/').pop()}`, blob);
          } catch {
            // Skip images that can't be fetched
          }
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${title || 'document'}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
  }, [estimateDuration, runWithProgress]);

  const exportDocument = useCallback((
    format: ExportFormat,
    content: string,
    title: string
  ) => {
    if (format === 'pdf') {
      return exportPDF(content, title);
    } else {
      return exportMarkdown(content, title);
    }
  }, [exportPDF, exportMarkdown]);

  return {
    progress,
    exportDocument,
    isExporting: progress.status === 'processing',
  };
}
