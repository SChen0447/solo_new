import { saveAs } from 'file-saver';
import type { ResumeData, TemplateId, SectionType } from '@/context/ResumeContext';

interface GeneratePdfRequest {
  resumeData: ResumeData;
  templateId: TemplateId;
  sectionOrder: SectionType[];
}

export async function exportResumeToPdf(
  resumeData: ResumeData,
  templateId: TemplateId,
  sectionOrder: SectionType[]
): Promise<void> {
  const previewEl = document.getElementById('resume-preview-content');
  if (!previewEl) {
    throw new Error('Preview element not found');
  }

  const htmlContent = previewEl.outerHTML;

  const body: GeneratePdfRequest = {
    resumeData,
    templateId,
    sectionOrder,
  };

  const response = await fetch('/api/generate-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, htmlContent }),
  });

  if (!response.ok) {
    throw new Error('Failed to generate PDF');
  }

  const blob = await response.blob();
  const fileName = resumeData.personalInfo.name
    ? `${resumeData.personalInfo.name}_Resume.pdf`
    : 'Resume.pdf';
  saveAs(blob, fileName);
}
