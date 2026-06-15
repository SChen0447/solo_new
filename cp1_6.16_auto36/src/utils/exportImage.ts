import { toPng } from 'html-to-image'
import { saveAs } from 'file-saver'

export async function generateSnapshot(element: HTMLElement): Promise<string> {
  const dataUrl = await toPng(element, {
    quality: 1,
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor: undefined,
  })
  return dataUrl
}

export function downloadImage(dataUrl: string, filename: string = 'codesnap.png'): void {
  saveAs(dataUrl, filename)
}

export async function copyImageToClipboard(dataUrl: string): Promise<boolean> {
  try {
    const blob = await (await fetch(dataUrl)).blob()
    const clipboardItem = new ClipboardItem({ 'image/png': blob })
    await navigator.clipboard.write([clipboardItem])
    return true
  } catch (err) {
    console.error('复制图片到剪贴板失败:', err)
    return false
  }
}
