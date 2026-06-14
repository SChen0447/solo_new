import html2canvas from 'html2canvas'

export async function takeScreenshot(container: HTMLElement | null, fileName: string): Promise<void> {
  if (!container) return
  const canvas = await html2canvas(container, {
    backgroundColor: null,
    scale: 2,
    useCORS: true,
  })
  const link = document.createElement('a')
  link.download = fileName
  link.href = canvas.toDataURL('image/png')
  link.click()
}
