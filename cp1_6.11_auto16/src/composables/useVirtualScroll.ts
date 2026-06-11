import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'

export function useVirtualScroll<T>(
  list: () => T[],
  options: {
    itemHeight: number
    containerRef: { value: HTMLElement | null }
    overscan?: number
    threshold?: number
  }
) {
  const { itemHeight, containerRef, overscan = 5, threshold = 100 } = options

  const scrollTop = ref(0)
  const containerHeight = ref(0)
  const isVirtualEnabled = ref(false)

  const totalCount = computed(() => list().length)

  const totalHeight = computed(() => totalCount.value * itemHeight)

  const startIndex = computed(() => {
    if (!isVirtualEnabled.value) return 0
    const start = Math.floor(scrollTop.value / itemHeight)
    return Math.max(0, start - overscan)
  })

  const endIndex = computed(() => {
    if (!isVirtualEnabled.value) return totalCount.value
    const visibleCount = Math.ceil(containerHeight.value / itemHeight)
    const end = Math.min(totalCount.value, startIndex.value + visibleCount + overscan * 2)
    return end
  })

  const visibleItems = computed(() => {
    return list().slice(startIndex.value, endIndex.value).map((item, index) => ({
      item,
      index: startIndex.value + index,
      top: (startIndex.value + index) * itemHeight
    }))
  })

  const offsetY = computed(() => {
    if (!isVirtualEnabled.value) return 0
    return startIndex.value * itemHeight
  })

  const spacerStyle = computed(() => ({
    height: totalHeight.value + 'px'
  }))

  const itemsContainerStyle = computed(() => ({
    transform: `translateY(${offsetY.value}px)`
  }))

  let rafId: number | null = null

  function updateContainerHeight() {
    if (containerRef.value) {
      containerHeight.value = containerRef.value.clientHeight
    }
  }

  function checkVirtualEnabled() {
    isVirtualEnabled.value = totalCount.value > threshold
  }

  function handleScroll() {
    if (rafId) {
      cancelAnimationFrame(rafId)
    }
    rafId = requestAnimationFrame(() => {
      if (containerRef.value) {
        scrollTop.value = containerRef.value.scrollTop
      }
      rafId = null
    })
  }

  function scrollToIndex(index: number) {
    if (containerRef.value) {
      containerRef.value.scrollTop = index * itemHeight
    }
  }

  function scrollToTop() {
    if (containerRef.value) {
      containerRef.value.scrollTop = 0
    }
  }

  watch(list, () => {
    checkVirtualEnabled()
    nextTick(updateContainerHeight)
  }, { deep: true })

  onMounted(() => {
    updateContainerHeight()
    checkVirtualEnabled()
    if (containerRef.value) {
      containerRef.value.addEventListener('scroll', handleScroll, { passive: true })
    }
    window.addEventListener('resize', updateContainerHeight)
  })

  onUnmounted(() => {
    if (rafId) {
      cancelAnimationFrame(rafId)
    }
    if (containerRef.value) {
      containerRef.value.removeEventListener('scroll', handleScroll)
    }
    window.removeEventListener('resize', updateContainerHeight)
  })

  return {
    visibleItems,
    spacerStyle,
    itemsContainerStyle,
    scrollTop,
    isVirtualEnabled,
    startIndex,
    endIndex,
    scrollToIndex,
    scrollToTop
  }
}
