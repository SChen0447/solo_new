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
 *   - ImageItem 类型：图片数据结构（id, title, thumbUrl, placeholderUrl, fullUrl, width, height）
 *   - imageService.getImages()：返回图片列表 Promise
 *   - imageService.cacheImage()：缓存单张图片
 *   - imageService.preloadNeighbors()：预加载当前图片的前后邻居
 */
export interface ImageItem {
  id: number
  title: string
  thumbUrl: string
  placeholderUrl: string
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
      placeholderUrl: `${PICSUM_BASE}/seed/${seed}/60/40`,
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
