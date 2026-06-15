import GIF from 'gif.js'
import { saveAs } from 'file-saver'

export interface FrameData {
  imageData: ImageData
  delay: number
}

export interface GifExportOptions {
  frames: FrameData[]
  width: number
  height: number
  quality?: number
  loop?: boolean
  onProgress?: (progress: number) => void
  onFinish?: (blob: Blob) => void
  onError?: (error: Error) => void
}

export const exportGif = (options: GifExportOptions): Promise<Blob> => {
  const {
    frames,
    width,
    height,
    quality = 10,
    loop = true,
    onProgress,
    onFinish,
    onError
  } = options

  return new Promise((resolve, reject) => {
    const gif = new GIF({
      workers: 2,
      quality,
      width,
      height,
      workerScript: '/gif.worker.js',
      repeat: loop ? 0 : -1,
      transparent: null
    } as any)

    gif.on('progress', (p: number) => {
      onProgress?.(p)
    })

    gif.on('finished', (blob: Blob) => {
      onFinish?.(blob)
      resolve(blob)
    })

    gif.on('abort', () => {
      const err = new Error('GIF encoding aborted')
      onError?.(err)
      reject(err)
    })

    try {
      for (const frame of frames) {
        gif.addFrame(frame.imageData, { delay: frame.delay, copy: true })
      }
      gif.render()
    } catch (err) {
      onError?.(err as Error)
      reject(err)
    }
  })
}

export const downloadBlob = (blob: Blob, filename: string): void => {
  saveAs(blob, filename)
}

export const exportPng = (
  canvas: HTMLCanvasElement,
  pixelSize: number,
  filename: string = 'pixel-art.png'
): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => {
        if (blob) {
          saveAs(blob, filename)
          resolve()
        } else {
          reject(new Error('Failed to create PNG blob'))
        }
      }, 'image/png')
    } catch (err) {
      reject(err)
    }
  })
}
