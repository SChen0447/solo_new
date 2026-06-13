<template>
  <div class="bookshelf-page">
    <!-- 拖拽状态栏（顶部放置区） -->
    <div class="drop-zones">
      <div
        v-for="zone in dropZones"
        :key="zone.value"
        class="drop-zone"
        :class="{
          'is-dragging': draggingId != null,
          'is-hover': hoverZone === zone.value,
          'is-active': activeZone === zone.value
        }"
        :data-status="zone.value"
        @dragover.prevent="onZoneDragOver($event, zone.value)"
        @dragenter.prevent="onZoneDragEnter(zone.value)"
        @dragleave="onZoneDragLeave(zone.value)"
        @drop="onZoneDrop($event, zone.value)"
      >
        <span class="zone-icon">{{ zone.icon }}</span>
        <div class="zone-meta">
          <div class="zone-label">{{ zone.label }}</div>
          <div class="zone-sub">拖到此处切换为「{{ zone.label }}」</div>
        </div>
        <span class="zone-count">{{ zoneCount(zone.value) }}</span>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="tag-bar">
        <button
          class="tag-btn"
          :class="{ active: currentTag === 'all' }"
          @click="pickTag('all', $event)"
        >
          <span class="tag-dot dot-all"></span>
          全部
          <span class="tag-count">{{ books.length }}</span>
        </button>
        <button
          v-for="t in ALL_TAGS"
          :key="t"
          class="tag-btn"
          :class="{ active: currentTag === t }"
          @click="pickTag(t, $event)"
        >
          <span class="tag-dot" :style="{ background: tagColor(t) }"></span>
          {{ t }}
          <span class="tag-count">{{ tagCount(t) }}</span>
        </button>
      </div>

      <div class="actions">
        <button
          class="fate-btn"
          :disabled="slotting || visibleBooks.length === 0"
          @click="onFate($event)"
        >
          <span class="fate-icon" :class="{ spin: slotting }">{{ slotting ? '🎰' : '🎲' }}</span>
          <span class="fate-label">{{ slotting ? '命运抽取中…' : '命运之书' }}</span>
        </button>
        <button class="add-btn" @click="toggleForm($event)">
          <span class="plus">{{ showAddForm ? '−' : '+' }}</span>
          <span>{{ showAddForm ? '收起' : '添加书籍' }}</span>
        </button>
      </div>
    </div>

    <!-- 添加表单（淡入动画） -->
    <Transition name="form-slide">
      <form v-if="showAddForm" class="add-form" @submit.prevent="onSubmit">
        <div class="form-title">
          <span>📝</span>
          往书架里加一本新书
        </div>
        <div class="form-grid">
          <div class="field">
            <label>书名 <i>*</i></label>
            <input v-model="form.title" type="text" placeholder="如：百年孤独" required />
          </div>
          <div class="field">
            <label>作者 <i>*</i></label>
            <input v-model="form.author" type="text" placeholder="如：加西亚·马尔克斯" required />
          </div>
          <div class="field field-wide">
            <label>封面图片 URL</label>
            <input v-model="form.coverUrl" type="url" placeholder="https://… 留空会根据首个标签生成默认封面" />
          </div>
          <div class="field field-wide">
            <label>标签 <i>*</i>（至少选一个）</label>
            <div class="tag-options">
              <label
                v-for="t in ALL_TAGS"
                :key="t"
                class="tag-opt"
                :class="{ checked: form.tags.includes(t) }"
              >
                <input
                  type="checkbox"
                  :value="t"
                  v-model="form.tags"
                  style="display:none"
                  @change="noop"
                />
                <span class="opt-dot" :style="{ background: tagColor(t) }"></span>
                <span class="opt-label">{{ t }}</span>
              </label>
            </div>
          </div>
        </div>
        <div class="form-foot">
          <button type="button" class="btn-cancel" @click.stop="toggleForm">取消</button>
          <button
            type="submit"
            class="btn-submit"
            :disabled="!canSubmit"
          >
            🏷️ 添加到书架
          </button>
        </div>
      </form>
    </Transition>

    <!-- 书架网格：响应式 + 0.4s 淡入淡出 -->
    <div class="grid-wrap">
      <TransitionGroup
        name="shelf"
        tag="div"
        class="shelf-grid"
      >
        <BookCard
          v-for="(b, idx) in visibleBooks"
          :key="b.id"
          :book="b"
          :is-slot-cursor="slotCursorId === b.id"
          :is-winner="winnerId === b.id"
          :flow-in-delay="flowDelayOf(b.id, idx)"
          @update:status="(s) => emit('update-status', { id: b.id, status: s })"
          @drag-start="onCardDragStart"
          @drag-end="onCardDragEnd"
          @delete="emit('delete-book', b.id)"
          @winner-ready="onWinnerReady"
        />
      </TransitionGroup>

      <Transition name="empty">
        <div v-if="visibleBooks.length === 0 && !slotting" class="empty">
          <div class="empty-illustration">�</div>
          <h3>{{ currentTag === 'all' ? '书架空空如也' : `暂无「${currentTag}」分类的书籍` }}</h3>
          <p>点击右上角 <b>添加书籍</b> 开始构建你的私人藏书阁吧～</p>
        </div>
      </Transition>
    </div>

    <!-- 拖拽期间的悬浮提示 -->
    <div
      v-if="draggingId"
      class="drag-tip"
      :style="tipStyle"
    >
      ↑ 拖到上方状态栏切换阅读状态
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick, onBeforeUnmount } from 'vue'
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

/* ---------- 常量 ---------- */
const TAG_COLORS: Record<string, string> = {
  [Tag.NOVEL]: '#e57373',
  [Tag.TECHNOLOGY]: '#42a5f5',
  [Tag.HISTORY]: '#a1887f',
  [Tag.PHILOSOPHY]: '#ab47bc',
  [Tag.SCIENCE]: '#66bb6a',
  [Tag.BIOGRAPHY]: '#ffa726'
}
const tagColor = (t: string) => TAG_COLORS[t] ?? '#90a4ae'

const dropZones: { value: ReadingStatus; label: string; icon: string }[] = [
  { value: 'unread', label: STATUS_LABELS.unread, icon: '📕' },
  { value: 'reading', label: STATUS_LABELS.reading, icon: '📖' },
  { value: 'read', label: STATUS_LABELS.read, icon: '✅' }
]

/* ---------- 状态 ---------- */
const currentTag = ref<TagType | 'all'>(props.selectedTag ?? 'all')
watch(() => props.selectedTag, (v) => { if (v !== undefined) currentTag.value = v })

const showAddForm = ref(false)
const form = reactive<{ title: string; author: string; coverUrl: string; tags: TagType[] }>({
  title: '',
  author: '',
  coverUrl: '',
  tags: []
})

const slotting = ref(false)
const slotCursorId = ref<string | null>(null)
const winnerId = ref<string | null>(null)

const draggingId = ref<string | null>(null)
const hoverZone = ref<ReadingStatus | null>(null)
const activeZone = ref<ReadingStatus | null>(null)
const tip = reactive({ x: 0, y: 0 })

const flowDelayMap = ref<Map<string, number>>(new Map())
const mountedIds = ref<Set<string>>(new Set())
let lastSeenTag: TagType | 'all' = currentTag.value

/* ---------- 计算 ---------- */
const visibleBooks = computed(() => {
  const arr = currentTag.value === 'all'
    ? [...props.books]
    : props.books.filter(b => b.tags.includes(currentTag.value as TagType))
  return arr.sort((a, b) => b.createdAt - a.createdAt)
})

const canSubmit = computed(() => form.title.trim() && form.author.trim() && form.tags.length > 0)

const zoneCount = (s: ReadingStatus) => props.books.filter(b => b.status === s).length
const tagCount = (t: TagType) => props.books.filter(b => b.tags.includes(t)).length

const tipStyle = computed(() => ({
  left: `${tip.x + 20}px`,
  top: `${tip.y + 20}px`
}))

/* ---------- 行为：涟漪 ---------- */
const addRipple = (e: MouseEvent) => {
  const target = e.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height) * 1.5
  const r = document.createElement('span')
  r.style.cssText = `
    position:absolute;
    border-radius:50%;
    background:rgba(255,255,255,0.55);
    width:${size}px;height:${size}px;
    left:${e.clientX - rect.left - size / 2}px;
    top:${e.clientY - rect.top - size / 2}px;
    transform:scale(0);
    pointer-events:none;
    animation:ripple 0.6s ease-out forwards;
    z-index:5;
  `
  target.style.position = target.style.position || 'relative'
  target.style.overflow = 'hidden'
  target.appendChild(r)
  setTimeout(() => r.remove(), 650)
}

/* ---------- 行为：标签切换 ---------- */
const pickTag = (tag: TagType | 'all', e: MouseEvent) => {
  addRipple(e)
  if (currentTag.value === tag) return
  currentTag.value = tag
  emit('select-tag', tag)
}

/* 标签切换后给新显示的卡片按索引分配 flow-in delay */
watch(visibleBooks, () => {
  const changed = lastSeenTag !== currentTag.value
  lastSeenTag = currentTag.value
  if (changed) {
    mountedIds.value.clear()
  }
}, { flush: 'post' })

const flowDelayOf = (id: string, idx: number) => {
  if (flowDelayMap.value.has(id)) return flowDelayMap.value.get(id)!
  const d = Math.min(idx * 55, 500)
  flowDelayMap.value.set(id, d)
  return d
}

/* ---------- 行为：添加表单 ---------- */
const toggleForm = (e?: MouseEvent) => {
  if (e) addRipple(e)
  showAddForm.value = !showAddForm.value
  if (!showAddForm.value) resetForm()
}

const resetForm = () => {
  form.title = ''
  form.author = ''
  form.coverUrl = ''
  form.tags = []
}

const defaultCoverFor = (t: TagType) => {
  const c = tagColor(t).replace('#', '')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#${c}"/><stop offset="1" stop-color="#3e2723"/></linearGradient></defs><rect fill="url(#g)" width="300" height="400" rx="6"/><rect x="18" y="16" width="264" height="368" fill="none" stroke="rgba(255,248,225,0.35)" stroke-width="2" rx="4"/><text x="50%" y="44%" font-size="72" text-anchor="middle" dominant-baseline="middle" fill="#fff8e1" opacity="0.92">📖</text><text x="50%" y="62%" font-family="sans-serif" font-size="22" font-weight="800" text-anchor="middle" dominant-baseline="middle" fill="#fff8e1" letter-spacing="2">${t}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

const onSubmit = async () => {
  if (!canSubmit.value) return
  const payload: Omit<Book, 'id' | 'createdAt' | 'status'> = {
    title: form.title.trim(),
    author: form.author.trim(),
    coverUrl: form.coverUrl.trim() || defaultCoverFor(form.tags[0]),
    tags: [...form.tags]
  }
  emit('add-book', payload)
  await nextTick()
  /* 把新出现的顶条卡片分配 delay，实现从左到右流动 */
  const list = visibleBooks.value
  for (let i = 0; i < list.length; i++) {
    if (!flowDelayMap.value.has(list[i].id)) {
      flowDelayMap.value.set(list[i].id, Math.min(i * 55, 500))
    }
  }
  resetForm()
  showAddForm.value = false
}

const noop = () => {}

/* ---------- 行为：拖拽 ---------- */
const _onDocDragMove = (e: DragEvent) => {
  if (e.clientX != null) tip.x = e.clientX
  if (e.clientY != null) tip.y = e.clientY
}

const onCardDragStart = (p: { id: string; rect: DOMRect }) => {
  draggingId.value = p.id
  tip.x = p.rect.left
  tip.y = p.rect.top
  document.addEventListener('dragover', _onDocDragMove as unknown as EventListener)
  document.addEventListener('drop', _onDocDrop as unknown as EventListener, true)
}

const _onDocDrop = (e: DragEvent) => {
  /* 兜底：在任何地方 drop 都清理 */
  setTimeout(cleanupDrag, 0)
  void e
}

const cleanupDrag = () => {
  draggingId.value = null
  hoverZone.value = null
  activeZone.value = null
  document.removeEventListener('dragover', _onDocDragMove as unknown as EventListener)
  document.removeEventListener('drop', _onDocDrop as unknown as EventListener, true)
}

const onCardDragEnd = () => cleanupDrag()

const onZoneDragOver = (e: DragEvent, s: ReadingStatus) => {
  if (!draggingId.value || !e.dataTransfer) return
  e.dataTransfer.dropEffect = 'move'
  activeZone.value = s
}

const onZoneDragEnter = (s: ReadingStatus) => {
  hoverZone.value = s
  activeZone.value = s
}

const onZoneDragLeave = (s: ReadingStatus) => {
  if (hoverZone.value === s) hoverZone.value = null
}

const onZoneDrop = (e: DragEvent, s: ReadingStatus) => {
  e.preventDefault()
  e.stopPropagation()
  const bookId = draggingId.value
  if (!bookId) return
  emit('update-status', { id: bookId, status: s })
  cleanupDrag()
}

/* ---------- 行为：命运之书老虎机（2秒快速来回滚动） ---------- */
const SLOT_DURATION = 2000
const SLOT_START_INTERVAL = 55
const SLOT_EASE_FACTOR = 1.07

let slotIntervalId: ReturnType<typeof setTimeout> | null = null
let slotFinishTimer: ReturnType<typeof setTimeout> | null = null

const clearSlotTimers = () => {
  if (slotIntervalId) { clearTimeout(slotIntervalId); slotIntervalId = null }
  if (slotFinishTimer) { clearTimeout(slotFinishTimer); slotFinishTimer = null }
}

const onFate = (e: MouseEvent) => {
  addRipple(e)
  if (slotting.value || visibleBooks.value.length === 0) return
  clearSlotTimers()
  winnerId.value = null

  const pool = visibleBooks.value
  const len = pool.length
  if (len === 0) return

  slotting.value = true
  let cursor = 0
  let interval = SLOT_START_INTERVAL
  let elapsed = 0

  const tick = () => {
    /* 来回滚动：先向右递增，过半后可以回跳制造「来回」观感 */
    const step = elapsed < SLOT_DURATION * 0.6
      ? 1
      : (Math.random() < 0.55 ? 1 : -1)
    cursor = (cursor + step + len) % len
    slotCursorId.value = pool[cursor].id

    elapsed += interval
    interval = Math.min(interval * SLOT_EASE_FACTOR, 250)

    if (elapsed < SLOT_DURATION) {
      slotIntervalId = setTimeout(tick, interval)
    } else {
      finalizeSlot(pool, cursor)
    }
  }
  tick()

  slotFinishTimer = setTimeout(() => {
    if (slotting.value) finalizeSlot(pool, cursor)
  }, SLOT_DURATION + 250)
}

const finalizeSlot = (pool: Book[], cursor: number) => {
  clearSlotTimers()
  slotting.value = false
  slotCursorId.value = null
  if (pool.length === 0) return
  /* 在最后位置 ±1 中随机，模拟老虎机「咔哒停住」 */
  const len = pool.length
  const finalIdx = (cursor + (Math.floor(Math.random() * 3) - 1) + len) % len
  const winner = pool[finalIdx]
  winnerId.value = winner.id
}

const onWinnerReady = () => {
  const t = setTimeout(() => { winnerId.value = null }, 900)
  onBeforeUnmount(() => clearTimeout(t))
}

onBeforeUnmount(() => {
  clearSlotTimers()
  cleanupDrag()
})
</script>

<style scoped>
.bookshelf-page {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 22px;
}

/* ============ 状态栏（拖拽放置区） ============ */
.drop-zones {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

.drop-zone {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  background: linear-gradient(135deg, rgba(255, 248, 225, 0.9), rgba(255, 236, 179, 0.75));
  border: 2px dashed #a1887f;
  border-radius: 16px;
  transition: all 0.28s cubic-bezier(0.22, 1, 0.36, 1);
  overflow: hidden;
}

.drop-zone::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at var(--mx, 50%) var(--my, 50%), rgba(255, 152, 0, 0.22), transparent 60%);
  opacity: 0;
  transition: opacity 0.28s ease;
  pointer-events: none;
}

.drop-zone.is-dragging {
  background: linear-gradient(135deg, #fff3c4, #ffe082);
  border-color: #8d6e63;
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(62, 39, 35, 0.2);
}

.drop-zone.is-hover,
.drop-zone.is-active {
  border-style: solid;
  border-color: #e65100;
  background: linear-gradient(135deg, #ffcc80, #ffb74d);
  transform: translateY(-4px) scale(1.02);
  box-shadow: 0 16px 32px rgba(230, 81, 0, 0.35);
}

.drop-zone.is-hover::before,
.drop-zone.is-active::before { opacity: 1; }

.zone-icon {
  font-size: 34px;
  filter: drop-shadow(0 3px 5px rgba(0, 0, 0, 0.18));
  flex-shrink: 0;
}

.zone-meta { flex: 1; min-width: 0; }

.zone-label {
  font-size: 18px;
  font-weight: 800;
  color: #3e2723;
  letter-spacing: 1px;
}

.zone-sub {
  font-size: 12px;
  color: #795548;
  margin-top: 2px;
  opacity: 0.85;
}

.zone-count {
  background: #3e2723;
  color: #ffe082;
  min-width: 34px;
  padding: 4px 12px;
  border-radius: 18px;
  font-size: 14px;
  font-weight: 800;
  text-align: center;
  flex-shrink: 0;
  box-shadow: inset 0 0 0 2px rgba(255, 224, 130, 0.25);
}

/* ============ 工具栏 ============ */
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
  padding: 14px 18px;
  background: rgba(255, 248, 225, 0.78);
  backdrop-filter: blur(8px);
  border: 2px solid #8d6e63;
  border-radius: 18px;
  box-shadow: 0 6px 16px rgba(62, 39, 35, 0.12);
}

.tag-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  flex: 1;
  min-width: 280px;
}

.tag-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 16px;
  border: 2px solid #bcaaa4;
  background: #fffdf7;
  color: #5d4037;
  border-radius: 24px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.tag-btn:hover {
  background: #ffe0b2;
  border-color: #8d6e63;
  transform: translateY(-1px);
}

.tag-btn.active {
  background: linear-gradient(135deg, #ff9800, #e65100);
  border-color: #bf360c;
  color: #fff;
  box-shadow: 0 6px 16px rgba(230, 81, 0, 0.45), inset 0 0 0 1px rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.tag-btn.active .tag-count {
  background: rgba(255, 255, 255, 0.22);
  color: #fff;
}

.tag-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.dot-all {
  background: conic-gradient(#e57373, #42a5f5, #a1887f, #ab47bc, #66bb6a, #ffa726, #e57373);
}

.tag-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  padding: 1px 8px;
  background: rgba(141, 110, 99, 0.15);
  color: #5d4037;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
  margin-left: 2px;
}

.actions {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-shrink: 0;
}

.fate-btn, .add-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 11px 22px;
  border: none;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.28s cubic-bezier(0.22, 1, 0.36, 1);
  overflow: hidden;
  letter-spacing: 0.5px;
}

.fate-btn {
  background: linear-gradient(135deg, #ff9800 0%, #f57c00 55%, #d84315 100%);
  color: #fff;
  box-shadow: 0 6px 18px rgba(245, 124, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.25);
}

.fate-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 26px rgba(245, 124, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.fate-btn:active:not(:disabled) { transform: translateY(0); }

.fate-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.fate-icon {
  font-size: 20px;
  display: inline-block;
}

.fate-icon.spin {
  animation: spin3d 0.55s linear infinite;
}

@keyframes spin3d {
  0% { transform: rotateY(0deg) scale(1); }
  50% { transform: rotateY(180deg) scale(1.15); }
  100% { transform: rotateY(360deg) scale(1); }
}

.add-btn {
  background: linear-gradient(135deg, #5d4037, #3e2723);
  color: #fff8e1;
  box-shadow: 0 6px 18px rgba(62, 39, 35, 0.4);
}

.add-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 26px rgba(62, 39, 35, 0.55);
}

.plus {
  font-size: 20px;
  font-weight: 900;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
}

/* ============ 添加表单 ============ */
.add-form {
  background: linear-gradient(135deg, #fff8e1, #fff3c4);
  border: 2px solid #8d6e63;
  border-radius: 18px;
  padding: 26px 28px;
  box-shadow: 0 12px 32px rgba(62, 39, 35, 0.2);
  position: relative;
  overflow: hidden;
}

.add-form::before {
  content: '';
  position: absolute;
  top: -40%;
  right: -15%;
  width: 320px;
  height: 320px;
  background: radial-gradient(circle, rgba(255, 152, 0, 0.18), transparent 65%);
  pointer-events: none;
}

.form-title {
  font-size: 18px;
  font-weight: 800;
  color: #3e2723;
  margin-bottom: 18px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  letter-spacing: 0.5px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  position: relative;
}

.field-wide { grid-column: 1 / -1; }

.field label {
  display: block;
  font-size: 13px;
  font-weight: 700;
  color: #5d4037;
  margin-bottom: 7px;
  letter-spacing: 0.3px;
}

.field label i {
  color: #e53935;
  font-style: normal;
  margin-left: 2px;
}

.field input[type="text"],
.field input[type="url"] {
  width: 100%;
  padding: 11px 16px;
  border: 2px solid #d7ccc8;
  border-radius: 12px;
  background: #fffdf7;
  font-size: 14px;
  color: #3e2723;
  transition: all 0.22s ease;
  outline: none;
  font-family: inherit;
}

.field input:focus {
  border-color: #ff9800;
  background: #fff;
  box-shadow: 0 0 0 4px rgba(255, 152, 0, 0.15);
}

.tag-options {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.tag-opt {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #fff;
  border: 2px solid #bcaaa4;
  border-radius: 22px;
  font-size: 14px;
  font-weight: 700;
  color: #5d4037;
  cursor: pointer;
  transition: all 0.24s cubic-bezier(0.22, 1, 0.36, 1);
}

.tag-opt:hover {
  border-color: #8d6e63;
  background: #ffe0b2;
  transform: translateY(-1px);
}

.tag-opt.checked {
  background: linear-gradient(135deg, #5d4037, #3e2723);
  border-color: #2c1810;
  color: #ffe082;
  transform: translateY(-2px) scale(1.04);
  box-shadow: 0 6px 14px rgba(62, 39, 35, 0.35);
}

.opt-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
}

.tag-opt.checked .opt-dot {
  box-shadow: 0 0 0 2px rgba(255, 224, 130, 0.45), 0 1px 3px rgba(0, 0, 0, 0.3);
}

.form-foot {
  margin-top: 22px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  position: relative;
}

.btn-cancel, .btn-submit {
  position: relative;
  padding: 10px 24px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.24s ease;
  overflow: hidden;
}

.btn-cancel {
  background: transparent;
  border: 2px solid #8d6e63;
  color: #5d4037;
}

.btn-cancel:hover {
  background: rgba(141, 110, 99, 0.12);
  transform: translateY(-1px);
}

.btn-submit {
  background: linear-gradient(135deg, #ff9800, #e65100);
  color: #fff;
  border: none;
  box-shadow: 0 6px 16px rgba(245, 124, 0, 0.4);
}

.btn-submit:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(245, 124, 0, 0.55);
}

.btn-submit:disabled { opacity: 0.55; cursor: not-allowed; }

/* 表单淡入 */
.form-slide-enter-active,
.form-slide-leave-active {
  transition:
    opacity 0.4s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.4s cubic-bezier(0.22, 1, 0.36, 1),
    max-height 0.4s ease;
  overflow: hidden;
}
.form-slide-enter-from {
  opacity: 0;
  transform: translateY(-18px) scale(0.98);
  max-height: 0;
}
.form-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.98);
  max-height: 0;
}

/* ============ 书架网格 & 响应式 ============ */
.grid-wrap {
  position: relative;
  min-height: 220px;
}

.shelf-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  padding: 6px 4px 24px;
}

/* 响应式断点：桌面4列、平板2列、手机1列 */
@media (min-width: 1600px) {
  .shelf-grid { gap: 28px; }
}

@media (max-width: 1100px) {
  .shelf-grid { grid-template-columns: repeat(3, 1fr); gap: 20px; }
}

@media (max-width: 820px) {
  .shelf-grid { grid-template-columns: repeat(2, 1fr); gap: 18px; }
}

@media (max-width: 520px) {
  .shelf-grid {
    grid-template-columns: 1fr;
    gap: 20px;
    max-width: 340px;
    margin: 0 auto;
  }
}

/* 0.4s 标签过滤：卡片淡入淡出 + 位移 */
.shelf-enter-active,
.shelf-leave-active {
  transition:
    opacity 0.4s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}
.shelf-enter-from {
  opacity: 0;
  transform: translateY(14px) scale(0.94);
}
.shelf-leave-to {
  opacity: 0;
  transform: translateY(-14px) scale(0.94);
}
.shelf-leave-active {
  position: absolute !important;
  width: calc((100% - 3 * 24px) / 4);
}
@media (max-width: 1100px) {
  .shelf-leave-active { width: calc((100% - 2 * 20px) / 3); }
}
@media (max-width: 820px) {
  .shelf-leave-active { width: calc((100% - 18px) / 2); }
}
@media (max-width: 520px) {
  .shelf-leave-active { width: 100%; max-width: 340px; left: 50%; transform: translateX(-50%); }
}
.shelf-move {
  transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

/* ============ 空状态 ============ */
.empty {
  padding: 72px 24px;
  text-align: center;
  background: rgba(255, 248, 225, 0.7);
  border: 2px dashed #a1887f;
  border-radius: 22px;
}

.empty-illustration {
  font-size: 72px;
  margin-bottom: 16px;
  filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.12));
}

.empty h3 {
  font-size: 22px;
  color: #5d4037;
  font-weight: 800;
  margin: 0 0 10px;
}

.empty p {
  font-size: 14px;
  color: #8d6e63;
  margin: 0;
}

.empty p b { color: #e65100; }

.empty-enter-active,
.empty-leave-active {
  transition: all 0.4s ease;
}
.empty-enter-from,
.empty-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

/* ============ 拖拽提示 ============ */
.drag-tip {
  position: fixed;
  z-index: 9999;
  pointer-events: none;
  padding: 9px 16px;
  background: rgba(62, 39, 35, 0.94);
  color: #ffe082;
  font-size: 12px;
  font-weight: 700;
  border-radius: 10px;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(6px);
  border: 1px solid rgba(255, 224, 130, 0.3);
  animation: dragPulse 1.1s ease-in-out infinite;
  white-space: nowrap;
}

@keyframes dragPulse {
  0%, 100% { opacity: 0.92; transform: translateY(0); }
  50% { opacity: 1; transform: translateY(-3px); box-shadow: 0 14px 30px rgba(0, 0, 0, 0.4); }
}

/* ripple keyframes */
@keyframes ripple {
  to { transform: scale(4); opacity: 0; }
}

/* 响应式适配：平板/手机的状态栏和表单 */
@media (max-width: 820px) {
  .drop-zones {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .drop-zone { padding: 12px 16px; }
  .zone-icon { font-size: 28px; }
  .zone-label { font-size: 16px; }
  .zone-sub { display: none; }

  .form-grid { grid-template-columns: 1fr; }
  .toolbar { padding: 12px; }
  .add-form { padding: 18px 16px; }
}

@media (max-width: 520px) {
  .actions { width: 100%; }
  .fate-btn, .add-btn { flex: 1; justify-content: center; }
  .tag-bar { width: 100%; }
}
</style>
