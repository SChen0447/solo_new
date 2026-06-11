/**
 * imageService.ts - 图片数据服务
 *
 * 调用关系：
 *   - 被 App.vue 调用：App.onMounted → imageService.getImages() 加载图片列表
 *   - 被 App.vue 调用：App.watch(currentIndex) → imageService.preloadNeighbors() 预加载相邻图片
 *
 * 数据流向：
 *   imageService.getImages() → App.vue (images ref) → ThumbnailGrid (props.images) / LightboxViewer (props.images)
 *   imageService.cacheImage() → imageService.preloadNeighbors() → 浏览器图片缓存
 *
 * 导出：
 *   - ImageItem 类型：图片数据结构（id, title, thumbUrl, placeholderBase64, fullUrl, width, height）
 *   - imageService.getImages()：返回图片列表 Promise
 *   - imageService.cacheImage()：缓存单张图片
 *   - imageService.preloadNeighbors()：预加载当前图片的前后邻居
 */
export interface ImageItem {
  id: number
  title: string
  thumbUrl: string
  placeholderBase64: string
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

const PLACEHOLDER_COLORS = [
  '#4a6fa5', '#2e8b8b', '#3a7a5c', '#8b6e4e', '#a55d4a',
  '#9b7b4e', '#5b7fa5', '#4e8b6e', '#6a8ba5', '#a58b5b',
  '#7a6e5b', '#4a7a8b', '#8b5b7a', '#5b6e8b', '#6e8b7a',
  '#4e7a6e', '#8b7a5b', '#5b8ba5', '#7a8b4e', '#6e5b8b'
]

const generatePlaceholderSvg = (color: string, seed: string): string => {
  const darkerColor = color
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${darkerColor};stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#1a1a2e;stop-opacity:1"/>
    </linearGradient>
  </defs>
  <rect width="600" height="400" fill="url(#g)"/>
  <circle cx="480" cy="80" r="60" fill="rgba(255,255,255,0.06)"/>
  <circle cx="120" cy="320" r="90" fill="rgba(255,255,255,0.04)"/>
  <rect x="50" y="200" width="200" height="120" rx="4" fill="rgba(255,255,255,0.03)"/>
</svg>`
  return `data:image/svg+xml;base64,${btoa(svg)}`
}

const generateImages = (): ImageItem[] => {
  return SEEDS.map((seed, index) => {
    const id = index + 1
    const width = 1920
    const height = 1080 + ((index % 3) * 180)
    const color = PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length]
    return {
      id,
      title: `作品 ${String(id).padStart(2, '0')} · ${seed}`,
      placeholderBase64: generatePlaceholderSvg(color, seed),
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
