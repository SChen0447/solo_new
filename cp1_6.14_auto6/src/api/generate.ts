import type { ReviewMaterial } from '../store';

export interface GenerateRequest {
  course: string;
  chapter: string;
}

export async function generateReview(params: GenerateRequest): Promise<ReviewMaterial> {
  const startTime = performance.now();

  const response = await fetch('/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(params)
  });

  if (!response.ok) {
    let errorMessage = `请求失败：${response.status} ${response.statusText}`;
    try {
      const errData = await response.json();
      if (errData?.error) {
        errorMessage = errData.error;
      }
    } catch {
      // ignore
    }
    throw new Error(errorMessage);
  }

  const data: ReviewMaterial = await response.json();
  const elapsed = performance.now() - startTime;

  return data;
}
