import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { AudioFile, Annotation } from '../../../shared/types';
import { LABEL_NAMES, formatTime } from './waveform';

interface ReportData {
  audioFile: AudioFile;
  annotations: Annotation[];
  exportedAt: string;
}

export async function generateAnnotationReport(
  audioFile: AudioFile,
  annotations: Annotation[]
): Promise<void> {
  const reportData: ReportData = {
    audioFile,
    annotations: [...annotations].sort((a, b) => a.startTime - b.startTime),
    exportedAt: new Date().toLocaleString('zh-CN'),
  };

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let currentY = margin;

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('音频批注协作报告', margin, currentY);
  currentY += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(128, 128, 128);
  doc.text(`导出时间: ${reportData.exportedAt}`, margin, currentY);
  currentY += 15;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('音频信息', margin, currentY);
  currentY += 8;

  doc.setFillColor(240, 240, 240);
  doc.roundedRect(margin, currentY, contentWidth, 30, 3, 3, 'F');
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  
  const infoItems = [
    { label: '文件名:', value: audioFile.name },
    { label: '时长:', value: formatTime(audioFile.duration) },
    { label: '格式:', value: audioFile.format.toUpperCase() },
    { label: '大小:', value: `${(audioFile.size / 1024 / 1024).toFixed(2)} MB` },
    { label: '批注总数:', value: `${annotations.length} 条` },
  ];

  infoItems.forEach((item, index) => {
    const x = margin + 5 + (index % 2) * (contentWidth / 2);
    const y = currentY + 7 + Math.floor(index / 2) * 10;
    doc.setFont('helvetica', 'bold');
    doc.text(item.label, x, y);
    doc.setFont('helvetica', 'normal');
    doc.text(item.value, x + 25, y);
  });

  currentY += 40;

  if (currentY + 20 > pageHeight - margin) {
    doc.addPage();
    currentY = margin;
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('批注详情', margin, currentY);
  currentY += 10;

  if (reportData.annotations.length === 0) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(128, 128, 128);
    doc.text('暂无批注', margin + 10, currentY + 5);
  } else {
    for (let i = 0; i < reportData.annotations.length; i++) {
      const annotation = reportData.annotations[i];
      
      if (currentY + 35 > pageHeight - margin) {
        doc.addPage();
        currentY = margin;
      }

      const colorMap: Record<string, [number, number, number]> = {
        '#e74c3c': [231, 76, 60],
        '#3498db': [52, 152, 219],
        '#f39c12': [243, 156, 18],
        '#2ecc71': [46, 204, 113],
      };

      const rgb = colorMap[annotation.color] || [100, 100, 100];
      
      doc.setFillColor(rgb[0], rgb[1], rgb[2]);
      doc.roundedRect(margin, currentY, 6, 6, 2, 2, 'F');

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(`${i + 1}. ${LABEL_NAMES[annotation.labelType] || '未分类'}`, margin + 10, currentY + 5);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(128, 128, 128);
      doc.text(
        `时间: ${formatTime(annotation.startTime)} - ${formatTime(annotation.endTime)}`,
        margin + 10,
        currentY + 12
      );

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      
      const contentLines = doc.splitTextToSize(annotation.content, contentWidth - 15);
      doc.text(contentLines, margin + 10, currentY + 20);

      const createdAt = new Date(annotation.createdAt).toLocaleString('zh-CN');
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`创建时间: ${createdAt}`, margin + 10, currentY + 22 + contentLines.length * 5);

      currentY += 28 + contentLines.length * 5;
    }
  }

  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(150, 150, 150);
  doc.text('音乐Demo协作批注平台 - 自动生成报告', margin, pageHeight - 10);

  const fileName = `批注报告_${audioFile.name.replace(/\.[^/.]+$/, '')}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}

export async function generateReportFromElement(elementId: string): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('找不到报告元素');
  }

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const imgWidth = 210;
  const pageHeight = 297;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft >= 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  const fileName = `批注报告_${new Date().toISOString().slice(0, 10)}.pdf`;
  pdf.save(fileName);
}
