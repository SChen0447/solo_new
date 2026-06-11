export interface ImageItem {
  id: number
  title: string
  thumbUrl: string
  fullUrl: string
  width: number
  height: number
}

const PICSUM_BASE = 'https://picsum.photos'
const SEEDS = [
  'mountain', 'ocean', 'forest', 'city', 'sunset',
  'desert', 'aurora', 'waterfall', 'snow', 'beach',
  'canyon', 'lake', 'flower', 'star', 'cloud',
  'river', 'valley', 'island', 'meadow', 'hill'
]

const generateImages = (): ImageItem[] => {
  return SEEDS.map((seed, index) => {
    const id = index + 1
    const width = 1920
    const height = 1080 + ((index % 3) * 180)
    return {
      id,
      title: `作品 ${String(id).padStart(2, '0')} · ${seed}`,
      thumbUrl: `${PICSUM_BASE}/seed/${seed}/600/400`,
      fullUrl: `${PICSUM_BASE}/seed/${seed}/${width}/${height}`,
      width,
      height
    }
  })
}

const imageCache = new Map<string, HTMLImageElement>()

const cacheImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    if (imageCache.has(url)) {
      const cached = imageCache.get(url)!
      if (cached.complete) {
        resolve(cached)
        return
      }
    }
    const img = new Image()
    img.onload = () => {
      imageCache.set(url, img)
      resolve(img)
    }
    img.onerror = reject
    img.src = url
  })
}

const preloadNeighbors = async (images: ImageItem[], currentIndex: number): Promise<void> => {
  const neighbors = [
    images[(currentIndex - 1 + images.length) % images.length],
    images[(currentIndex + 1) % images.length]
  ]
  await Promise.allSettled(
    neighbors.map((img) => cacheImage(img.fullUrl))
  )
}

const getImages = (): Promise<ImageItem[]> => {
  return Promise.resolve(generateImages())
}

export const imageService = {
  getImages,
  cacheImage,
  preloadNeighbors
}
