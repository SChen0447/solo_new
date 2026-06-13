<template>
  <div class="bookshelf-page">
    <!-- 状态栏（拖拽目标区） -->
    <div
      class="status-zones"
      @dragover.prevent="onZoneDragOver"
      @dragleave="onZoneDragLeave"
      @drop="onZoneDrop"
    >
      <div
        v-for="zone in statusZones"
        :key="zone.value"
        class="status-zone"
        :class="{ 'is-active': activeDropZone === zone.value, 'is-drag-hover': dragHoverZone === zone.value }"
        :data-status="zone.value"
      >
        <span class="zone-icon">{{ zone.icon }}</span>
        <span class="zone-label">{{ zone.label }}</span>
        <span class="zone-count">{{ zoneCount(zone.value) }}</span>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <div class="tag-filter">
          <button
            class="tag-btn"
            :class="{ active: currentTag === 'all' }"
            @click="onTagSelect('all', $event)"
          >
            <span class="tag-dot" style="background: #3e2723"></span>
            全部
          </button>
          <button
            v-for="t in ALL_TAGS"
            :key="t"
            class="tag-btn"
            :class="{ active: currentTag === t }"
            @click="onTagSelect(t, $event)"
          >
            <span class="tag-dot" :style="{ background: tagColor(t) }"></span>
            {{ t }}
          </button>
        </div>
      </div>

      <div class="toolbar-right">
        <button
          class="fate-btn"
          :disabled="isSlotRunning || displayBooks.length === 0"
          @click="onFateClick($event)"
        >
          <span class="fate-icon">{{ isSlotRunning ? '🎰' : '🎲' }}</span>
          <span>{{ isSlotRunning ? '命运抽取中...' : '命运之书' }}</span>
        </button>
        <button class="add-btn" @click="toggleAddForm($event)">
          <span class="add-icon">+</span>
          <span>{{ showAddForm ? '收起' : '添加书籍' }}</span>
        </button>
      </div>
    </div>

    <!-- 添加书籍表单（淡入动画） -->
    <Transition name="form-fade">
      <form v-if="showAddForm" class="add-form" @submit.prevent="onSubmitForm">
        <div class="form-grid">
          <div class="form-item">
            <label>书名 *</label>
            <input
              v-model="formData.title"
              type="text"
              placeholder="请输入书名"
              required
            />
          </div>
          <div class="form-item">
            <label>作者 *</label>
            <input
              v-model="formData.author"
              type="text"
              placeholder="请输入作者"
              required
            />
          </div>
          <div class="form-item form-item-wide">
            <label>封面图片 URL</label>
            <input
              v-model="formData.coverUrl"
              type="url"
              placeholder="https://... (留空使用默认)"
            />
          </div>
          <div class="form-item form-item-wide">
            <label>标签 *</label>
            <div class="tag-picker">
              <label
                v-for="t in ALL_TAGS"
                :key="t"
                class="tag-opt"
                :class="{ checked: formData.tags.includes(t) }"
              >
                <input
                  type="checkbox"
                  :value="t"
                  v-model="formData.tags"
                  :style="{ display: 'none' }"
                />
                <span>{{ t }}</span>
              </label>
            </div>
          </div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn-ghost" @click.stop="toggleAddForm">取消</button>
          <button type="submit" class="btn-primary" :disabled="formData.tags.length === 0 || !formData.title || !formData.author">
            添加到书架
          </button>
        </div>
      </form>
    </Transition>

    <!-- 书架网格（标签切换 0.4s 淡入淡出） -->
    <TransitionGroup
      name="shelf-fade"
      tag="div"
      class="shelf-grid"
      @before-enter="onCardBeforeEnter"
      @enter="onCardEnter"
      @leave="onCardLeave"
    >
      <BookCard
        v-for="(b, idx) in displayBooks"
        :key="b.id"
        :book="b"
        :is-slotting="isSlotRunning && slotIdxMap.get(b.id) !== undefined"
        :is-highlighted="highlightId === b.id"
        :flow-in-delay="flowInDelayMap.get(b.id) ?? 0"
        @update:status="(s) => emit('update-status', { id: b.id, status: s })"
        @drag-start="onCardDragStart"
        @drag-end="onCardDragEnd"
        @delete="emit('delete-book', b.id)"
        @highlight-done="onHighlightDone"
      />
    </TransitionGroup>

    <Transition name="empty-fade">
      <div v-if="displayBooks.length === 0 && !isSlotRunning" class="empty-state">
        <div class="empty-icon">📭</div>
        <h3 class="empty-title">
          {{ currentTag === 'all' ? '书架空空如也' : `暂无「${currentTag}」类书籍` }}
        </h3>
        <p class="empty-hint">点击右上角「添加书籍」开始构建你的私人藏书阁</p>
      </div>
    </Transition>

    <!-- 拖拽幽灵提示 -->
    <div
      v-if="draggingBookId"
      class="drag-ghost-hint"
      :style="ghostStyle"
    >
      拖到上方状态栏切换阅读状态
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, reactive, onBeforeUnmount, nextTick } from 'vue'
import BookCard from './BookCard.vue'
import type { Book, TagType, ReadingStatus } from '@/types'
import { ALL_TAGS, Tag, STATUS_LABELS } from '@/types'

const props = defineProps<{
  books: Book[]
  selectedTag?: TagType | 'all'
}>()

const emit = defineEmits<{
  (e: 'add-book', payload: Omit<Book, 'id' | 'createdAt' | 'status'>): void
  (e: 'update-status', payload: { id: string; status: ReadingStatus }): void
  (e: 'select-tag', tag: TagType | 'all'): void
  (e: 'delete-book', id: string): void
}>()

const TAG_COLORS: Record<string, string> = {
  [Tag.NOVEL]: '#e57373',
  [Tag.TECHNOLOGY]: '#64b5f6',
  [Tag.HISTORY]: '#a1887f',
  [Tag.PHILOSOPHY]: '#ba68c8',
  [Tag.SCIENCE]: '#81c784',
  [Tag.BIOGRAPHY]: '#ffb74d'
}

const tagColor = (t: string): string => TAG_COLORS[t] ?? '#90a4ae'

const statusZones: { value: ReadingStatus; label: string; icon: string }[] = [
  { value: 'unread', label: STATUS_LABELS.unread, icon: '📕' },
  { value: 'reading', label: STATUS_LABELS.reading, icon: '📖' },
  { value: 'read', label: STATUS_LABELS.read, icon: '✅' }
]

const zoneCount = (s: ReadingStatus) => props.books.filter(b => b.status === s).length
const activeDropZone = ref<ReadingStatus | null>(null)
const dragHoverZone = ref<ReadingStatus | null>(null)

const currentTag = ref<TagType | 'all'>(props.selectedTag ?? 'all')
watch(() => props.selectedTag, (v) => {
  if (v !== undefined) currentTag.value = v
})

const showAddForm = ref(false)
const formData = reactive({
  title: '',
  author: '',
  coverUrl: '',
  tags: [] as TagType[]
})
const pendingInsertIds = ref<Set<string>>(new Set())
const flowInDelayMap = ref<Map<string, number>>(new Map())

const draggingBookId = ref<string | null>(null)
const ghostPos = reactive({ x: 0, y: 0 })

const isSlotRunning = ref(false)
const slotIdxMap = ref<Map<string, number>>(new Map())
const highlightId = ref<string | null>(null)

let slotIntervalId: ReturnType<typeof setInterval> | null = null
let slotTimeoutId: ReturnType<typeof setTimeout> | null = null
let rafId: number | null = null

const displayBooks = computed(() => {
  const filtered = currentTag.value === 'all'
    ? [...props.books]
    : props.books.filter(b => b.tags.includes(currentTag.value as TagType))
  return filtered.sort((a, b) => b.createdAt - a.createdAt)
})

const createRipple = (e: MouseEvent) => {
  const target = e.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height)
  const ripple = document.createElement('span')
  ripple.style.cssText = `
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.55);
    width: ${size}px;
    height: ${size}px;
    left: ${e.clientX - rect.left - size / 2}px;
    top: ${e.clientY - rect.top - size / 2}px;
    transform: scale(0);
    pointer-events: none;
    animation: ripple 0.6s ease-out forwards;
    z-index: 5;
  `
  target.appendChild(ripple)
  setTimeout(() => ripple.remove(), 650)
}

const onTagSelect = (tag: TagType | 'all', e: MouseEvent) => {
  createRipple(e)
  currentTag.value = tag
  emit('select-tag', tag)
}

const toggleAddForm = (e?: MouseEvent) => {
  if (e) createRipple(e)
  showAddForm.value = !showAddForm.value
  if (!showAddForm.value) {
    formData.title = ''
    formData.author = ''
    formData.coverUrl = ''
    formData.tags = []
  }
}

const resetForm = () => {
  formData.title = ''
  formData.author = ''
  formData.coverUrl = ''
  formData.tags = []
}

const onSubmitForm = async () => {
  if (!formData.title || !formData.author || formData.tags.length === 0) return
  const payload: Omit<Book, 'id' | 'createdAt' | 'status'> = {
    title: formData.title.trim(),
    author: formData.author.trim(),
    coverUrl: formData.coverUrl.trim() || getDefaultCover(formData.tags[0]),
    tags: [...formData.tags]
  }
  emit('add-book', payload)
  pendingInsertIds.value.add(`__new_${Date.now()}`)
  await nextTick()
  const newBook = props.books[0]
  if (newBook) {
    const idx = displayBooks.value.findIndex(b => b.id === newBook.id)
    flowInDelayMap.value.set(newBook.id, (idx >= 0 ? idx : 0) * 50)
  }
  resetForm()
  showAddForm.value = false
}

const getDefaultCover = (t: TagType): string => {
  const colors: Record<string, string> = {
    [Tag.NOVEL]: 'e57373',
    [Tag.TECHNOLOGY]: '64b5f6',
    [Tag.HISTORY]: 'a1887f',
    [Tag.PHILOSOPHY]: 'ba68c8',
    [Tag.SCIENCE]: '81c784',
    [Tag.BIOGRAPHY]: 'ffb74d'
  }
  const c = colors[t] ?? '90a4ae'
  return `data:image/svg+xml;utf8,` + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#${c}"/><stop offset="1" stop-color="#3e2723"/></linearGradient></defs><rect fill="url(#g)" width="300" height="400"/><text x="50%" y="45%" font-family="serif" font-size="60" text-anchor="middle" dominant-baseline="middle" fill="#fff8e1" opacity="0.9">📖</text><text x="50%" y="65%" font-family="sans-serif" font-size="18" font-weight="700" text-anchor="middle" dominant-baseline="middle" fill="#fff8e1">${t}</text></svg>`
  )
}

const onCardBeforeEnter = () => { /* hook */ }
const onCardEnter = (_el: Element, done: () => void) => {
  done()
}
const onCardLeave = (_el: Element, done: () => void) => {
  done()
}

const onCardDragStart = (p: { id: string; el: HTMLElement }) => {
  draggingBookId.value = p.id
  const onMove = (e: MouseEvent) => {
    ghostPos.x = e.clientX
    ghostPos.y = e.clientY
  }
  window.addEventListener('dragover', onMove as unknown as EventListener)
  const cleanup = () => window.removeEventListener('dragover', onMove as unknown as EventListener)
  onBeforeUnmount(cleanup)
  const storedCleanup = (window as unknown as { __dragCleanup?: () => void }).__dragCleanup
  if (storedCleanup) storedCleanup()
  ;(window as unknown as { __dragCleanup?: () => void }).__dragCleanup = cleanup
}

const onCardDragEnd = () => {
  draggingBookId.value = null
  activeDropZone.value = null
  dragHoverZone.value = null
  const cleanup = (window as unknown as { __dragCleanup?: () => void }).__dragCleanup
  if (cleanup) { cleanup(); (window as unknown as { __dragCleanup?: () => void }).__dragCleanup = undefined }
}

const onZoneDragOver = (e: DragEvent) => {
  if (!draggingBookId.value || !e.dataTransfer) return
  e.dataTransfer.dropEffect = 'move'
  const target = (e.target as HTMLElement).closest('[data-status]') as HTMLElement | null
  if (target) {
    const s = target.dataset.status as ReadingStatus
    dragHoverZone.value = s
    activeDropZone.value = s
  } else {
    dragHoverZone.value = null
  }
}

const onZoneDragLeave = () => {
  dragHoverZone.value = null
}

const onZoneDrop = (e: DragEvent) => {
  const target = (e.target as HTMLElement).closest('[data-status]') as HTMLElement | null
  const bookId = draggingBookId.value
  if (target && bookId) {
    const status = target.dataset.status as ReadingStatus
    emit('update-status', { id: bookId, status })
  }
  onCardDragEnd()
}

const ghostStyle = computed(() => ({
  left: `${ghostPos.x + 18}px`,
  top: `${ghostPos.y + 18}px`
}))

const onFateClick = (e: MouseEvent) => {
  createRipple(e)
  if (isSlotRunning.value || displayBooks.value.length === 0) return
  const books = displayBooks.value
  const len = books.length
  const totalDuration = 2000
  const startInterval = 60
  const step = 1.06

  isSlotRunning.value = true
  highlightId.value = null
  slotIdxMap.value.clear()

  let interval = startInterval
  let elapsed = 0
  let round = 0

  const tick = () => {
    slotIdxMap.value.clear()
    for (let i = 0; i < len; i++) {
      slotIdxMap.value.set(books[i].id, (round + i) % len)
    }
    round++
    elapsed += interval
    interval = Math.min(interval * step, 260)

    if (elapsed < totalDuration) {
      slotIntervalId = setTimeout(tick, interval)
    } else {
      finishSlot()
    }
  }
  tick()

  slotTimeoutId = setTimeout(() => {
    if (isSlotRunning.value) finishSlot()
  }, totalDuration + 200)
}

const finishSlot = () => {
  if (slotIntervalId) { clearTimeout(slotIntervalId); slotIntervalId = null }
  if (slotTimeoutId) { clearTimeout(slotTimeoutId); slotTimeoutId = null }
  slotIdxMap.value.clear()
  isSlotRunning.value = false

  const pool = displayBooks.value
  if (pool.length === 0) return
  const winner = pool[Math.floor(Math.random() * pool.length)]
  highlightId.value = winner.id
}

const onHighlightDone = () => {
  if (highlightId.value !== null) {
    const t = setTimeout(() => {
      highlightId.value = null
    }, 800)
    onBeforeUnmount(() => clearTimeout(t))
  }
}

onBeforeUnmount(() => {
  if (slotIntervalId) clearTimeout(slotIntervalId)
  if (slotTimeoutId) clearTimeout(slotTimeoutId)
  if (rafId !== null) cancelAnimationFrame(rafId)
})
</script>

<style scoped>
.bookshelf-page {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ============ 状态栏 ============ */
.status-zones {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  padding: 4px;
}

.status-zone {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 16px 20px;
  background: linear-gradient(135deg, rgba(255, 248, 225, 0.85), rgba(255, 236, 179, 0.6));
  border: 2px dashed #a1887f;
  border-radius: 14px;
  transition: all 0.25s ease;
  cursor: pointer;
}

.status-zone.is-drag-hover {
  background: linear-gradient(135deg, #ffcc80, #ffb74d);
  border-style: solid;
  border-color: #e65100;
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 8px 20px rgba(230, 81, 0, 0.3);
}

.status-zone.is-active {
  border-color: #ff6f00;
  box-shadow: 0 0 0 3px rgba(255, 152, 0, 0.18);
}

.zone-icon {
  font-size: 26px;
  filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.15));
}

.zone-label {
  font-size: 16px;
  font-weight: 700;
  color: #3e2723;
  letter-spacing: 1px;
}

.zone-count {
  background: #3e2723;
  color: #ffe082;
  min-width: 28px;
  padding: 2px 10px;
  border-radius: 14px;
  font-size: 13px;
  font-weight: 700;
  text-align: center;
}

/* ============ 工具栏 ============ */
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  padding: 12px 18px;
  background: rgba(255, 248, 225, 0.7);
  backdrop-filter: blur(6px);
  border: 2px solid #8d6e63;
  border-radius: 16px;
  box-shadow: 0 4px 14px rgba(62, 39, 35, 0.1);
}

.toolbar-left { flex: 1; min-width: 280px; }

.tag-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 2px solid #bcaaa4;
  background: #fff8e1;
  color: #5d4037;
  border-radius: 22px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.22, 1, 0.36, 1);
  overflow: hidden;
}

.tag-btn:hover {
  background: #ffe0b2;
  border-color: #8d6e63;
  transform: translateY(-1px);
}

.tag-btn.active {
  background: linear-gradient(135deg, #5d4037, #3e2723);
  border-color: #2c1810;
  color: #ffe082;
  box-shadow: 0 4px 12px rgba(62, 39, 35, 0.35), inset 0 0 0 1px rgba(255, 224, 130, 0.2);
  transform: translateY(-2px);
}

.tag-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.toolbar-right {
  display: flex;
  gap: 10px;
  align-items: center;
}

.fate-btn, .add-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.25s ease;
  overflow: hidden;
  letter-spacing: 0.5px;
}

.fate-btn {
  background: linear-gradient(135deg, #ff9800 0%, #f57c00 50%, #e65100 100%);
  color: #fff;
  box-shadow: 0 4px 14px rgba(245, 124, 0, 0.4);
}

.fate-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 22px rgba(245, 124, 0, 0.5);
}

.fate-btn:active:not(:disabled) {
  transform: translateY(0);
}

.fate-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.fate-icon {
  font-size: 18px;
  display: inline-block;
  animation: none;
}

.fate-btn:disabled .fate-icon {
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.add-btn {
  background: linear-gradient(135deg, #3e2723, #5d4037);
  color: #fff8e1;
  box-shadow: 0 4px 14px rgba(62, 39, 35, 0.35);
}

.add-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 22px rgba(62, 39, 35, 0.5);
}

.add-icon {
  font-size: 18px;
  font-weight: 700;
}

/* ============ 表单 ============ */
.add-form {
  background: linear-gradient(135deg, #fff8e1, #fff3c4);
  border: 2px solid #8d6e63;
  border-radius: 16px;
  padding: 24px 28px;
  box-shadow: 0 8px 26px rgba(62, 39, 35, 0.18);
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}

.form-item-wide {
  grid-column: 1 / -1;
}

.form-item label {
  display: block;
  font-size: 13px;
  font-weight: 700;
  color: #5d4037;
  margin-bottom: 6px;
  letter-spacing: 0.5px;
}

.form-item input[type="text"],
.form-item input[type="url"] {
  width: 100%;
  padding: 10px 14px;
  border: 2px solid #d7ccc8;
  border-radius: 10px;
  background: #fffdf7;
  font-size: 14px;
  color: #3e2723;
  transition: all 0.2s ease;
  outline: none;
}

.form-item input:focus {
  border-color: #ff9800;
  box-shadow: 0 0 0 3px rgba(255, 152, 0, 0.15);
  background: #fff;
}

.tag-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-opt {
  position: relative;
  display: inline-flex;
  align-items: center;
  padding: 7px 14px;
  background: #fff;
  border: 2px solid #bcaaa4;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  color: #5d4037;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tag-opt:hover {
  border-color: #8d6e63;
  background: #ffe0b2;
}

.tag-opt.checked {
  background: linear-gradient(135deg, #5d4037, #3e2723);
  border-color: #2c1810;
  color: #ffe082;
  transform: scale(1.04);
  box-shadow: 0 2px 8px rgba(62, 39, 35, 0.3);
}

.form-actions {
  margin-top: 22px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn-ghost, .btn-primary {
  position: relative;
  padding: 10px 22px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;
}

.btn-ghost {
  background: transparent;
  border: 2px solid #8d6e63;
  color: #5d4037;
}

.btn-ghost:hover {
  background: rgba(141, 110, 99, 0.1);
}

.btn-primary {
  background: linear-gradient(135deg, #ff9800, #f57c00);
  color: #fff;
  border: none;
  box-shadow: 0 4px 12px rgba(245, 124, 0, 0.35);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(245, 124, 0, 0.5);
}

.btn-primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

/* 表单淡入 */
.form-fade-enter-active,
.form-fade-leave-active {
  transition: opacity 0.4s ease, transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}
.form-fade-enter-from {
  opacity: 0;
  transform: translateY(-14px) scale(0.98);
}
.form-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}

/* ============ 书架网格 ============ */
.shelf-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 22px;
  padding: 10px 4px;
}

/* 响应式断点 */
@media (max-width: 1100px) {
  .shelf-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 18px;
  }
}

@media (max-width: 820px) {
  .shelf-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
}

@media (max-width: 520px) {
  .shelf-grid {
    grid-template-columns: 1fr;
    gap: 18px;
    max-width: 340px;
    margin: 0 auto;
  }
}

/* 0.4s 卡片淡入淡出（标签过滤） */
.shelf-fade-enter-active,
.shelf-fade-leave-active {
  transition: opacity 0.4s ease, transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}
.shelf-fade-enter-from {
  opacity: 0;
  transform: translateY(10px) scale(0.96);
}
.shelf-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.96);
}
.shelf-fade-move {
  transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

/* ============ 空状态 ============ */
.empty-state {
  padding: 80px 24px;
  text-align: center;
  background: rgba(255, 248, 225, 0.6);
  border: 2px dashed #a1887f;
  border-radius: 20px;
}

.empty-icon {
  font-size: 68px;
  margin-bottom: 18px;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
}

.empty-title {
  font-size: 22px;
  color: #5d4037;
  font-weight: 700;
  margin-bottom: 8px;
}

.empty-hint {
  font-size: 14px;
  color: #8d6e63;
}

.empty-fade-enter-active,
.empty-fade-leave-active {
  transition: opacity 0.4s ease, transform 0.4s ease;
}
.empty-fade-enter-from,
.empty-fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

/* ============ 拖拽幽灵提示 ============ */
.drag-ghost-hint {
  position: fixed;
  z-index: 9999;
  pointer-events: none;
  padding: 8px 14px;
  background: rgba(62, 39, 35, 0.92);
  color: #ffe082;
  font-size: 12px;
  font-weight: 600;
  border-radius: 10px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(4px);
  animation: pulseHint 1s ease-in-out infinite;
}

@keyframes pulseHint {
  0%, 100% { opacity: 0.9; transform: translate(0, 0); }
  50% { opacity: 1; transform: translate(0, -2px); }
}

@media (max-width: 768px) {
  .status-zones {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .status-zone { padding: 12px 16px; }
  .form-grid { grid-template-columns: 1fr; }
  .toolbar { padding: 10px 12px; }
  .add-form { padding: 18px 16px; }
}
</style>
