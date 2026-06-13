<template>
  <div class="app-root">
    <nav class="navbar">
      <div class="navbar-inner">
        <div class="brand">
          <span class="brand-icon">📚</span>
          <h1 class="brand-title">我的虚拟书架</h1>
        </div>
        <div class="navbar-stats">
          <div class="stat-item">
            <span class="stat-num">{{ books.length }}</span>
            <span class="stat-label">本书</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-num">{{ unreadCount }}</span>
            <span class="stat-label">未读</span>
          </div>
          <div class="stat-item">
            <span class="stat-num">{{ readingCount }}</span>
            <span class="stat-label">在读</span>
          </div>
          <div class="stat-item">
            <span class="stat-num">{{ readCount }}</span>
            <span class="stat-label">已读</span>
          </div>
        </div>
      </div>
    </nav>

    <main class="app-main">
      <router-view
        :books="books"
        :selected-tag="selectedTag"
        @add-book="handleAddBook"
        @update-status="handleUpdateStatus"
        @select-tag="handleSelectTag"
        @delete-book="handleDeleteBook"
      />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, provide, onMounted } from 'vue'
import type { Book, TagType, ReadingStatus } from '@/types'
import { Tag } from '@/types'

const STORAGE_KEY = 'virtual-bookshelf-data'

const defaultBooks: Book[] = [
  {
    id: 'b1',
    title: '活着',
    author: '余华',
    coverUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&q=80',
    tags: [Tag.NOVEL, Tag.HISTORY],
    status: 'read',
    createdAt: Date.now() - 3600000 * 24 * 30
  },
  {
    id: 'b2',
    title: '深入理解计算机系统',
    author: 'Randal E. Bryant',
    coverUrl: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=300&q=80',
    tags: [Tag.TECHNOLOGY, Tag.SCIENCE],
    status: 'reading',
    createdAt: Date.now() - 3600000 * 24 * 15
  },
  {
    id: 'b3',
    title: '人类简史',
    author: '尤瓦尔·赫拉利',
    coverUrl: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=300&q=80',
    tags: [Tag.HISTORY, Tag.PHILOSOPHY],
    status: 'unread',
    createdAt: Date.now() - 3600000 * 24 * 7
  },
  {
    id: 'b4',
    title: '三体',
    author: '刘慈欣',
    coverUrl: 'https://images.unsplash.com/photo-1614544048536-0d28caf77f41?w=300&q=80',
    tags: [Tag.NOVEL, Tag.SCIENCE],
    status: 'unread',
    createdAt: Date.now() - 3600000 * 24 * 3
  },
  {
    id: 'b5',
    title: '乔布斯传',
    author: '沃尔特·艾萨克森',
    coverUrl: 'https://images.unsplash.com/photo-1589998059171-988d887df646?w=300&q=80',
    tags: [Tag.BIOGRAPHY, Tag.TECHNOLOGY],
    status: 'read',
    createdAt: Date.now() - 3600000 * 24 * 60
  },
  {
    id: 'b6',
    title: '百年孤独',
    author: '加西亚·马尔克斯',
    coverUrl: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=300&q=80',
    tags: [Tag.NOVEL],
    status: 'unread',
    createdAt: Date.now() - 3600000 * 24 * 1
  }
]

const books = ref<Book[]>([])
const selectedTag = ref<TagType | 'all'>('all')

const unreadCount = computed(() => books.value.filter(b => b.status === 'unread').length)
const readingCount = computed(() => books.value.filter(b => b.status === 'reading').length)
const readCount = computed(() => books.value.filter(b => b.status === 'read').length)

const loadBooks = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Book[]
      books.value = parsed
    } else {
      books.value = defaultBooks
      saveBooks()
    }
  } catch {
    books.value = defaultBooks
    saveBooks()
  }
}

const saveBooks = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(books.value))
  } catch {
    /* ignore */
  }
}

const handleAddBook = (book: Omit<Book, 'id' | 'createdAt' | 'status'>) => {
  const newBook: Book = {
    ...book,
    id: `b_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    status: 'unread',
    createdAt: Date.now()
  }
  books.value.unshift(newBook)
  saveBooks()
}

const handleUpdateStatus = ({ id, status }: { id: string; status: ReadingStatus }) => {
  const target = books.value.find(b => b.id === id)
  if (target) {
    target.status = status
    saveBooks()
  }
}

const handleSelectTag = (tag: TagType | 'all') => {
  selectedTag.value = tag
}

const handleDeleteBook = (id: string) => {
  books.value = books.value.filter(b => b.id !== id)
  saveBooks()
}

provide<{
  books: typeof books
  updateStatus: (payload: { id: string; status: ReadingStatus }) => void
  deleteBook: (id: string) => void
}>('bookshelf-store', {
  books,
  updateStatus: handleUpdateStatus,
  deleteBook: handleDeleteBook
})

onMounted(() => {
  loadBooks()
})
</script>

<style scoped>
.app-root {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.navbar {
  background: linear-gradient(135deg, #5d4037 0%, #3e2723 100%);
  border-bottom: 3px solid #2c1810;
  box-shadow: 0 4px 16px rgba(62, 39, 35, 0.25);
  position: sticky;
  top: 0;
  z-index: 100;
}

.navbar-inner {
  max-width: 1400px;
  margin: 0 auto;
  padding: 16px 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-icon {
  font-size: 34px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.brand-title {
  color: #fff8e1;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 2px;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}

.navbar-stats {
  display: flex;
  align-items: center;
  gap: 18px;
  background: rgba(255, 248, 225, 0.1);
  padding: 10px 20px;
  border-radius: 12px;
  backdrop-filter: blur(4px);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 48px;
}

.stat-num {
  font-size: 22px;
  font-weight: 700;
  color: #ffe082;
  line-height: 1;
}

.stat-label {
  font-size: 12px;
  color: rgba(255, 248, 225, 0.75);
  margin-top: 4px;
  letter-spacing: 1px;
}

.stat-divider {
  width: 1px;
  height: 32px;
  background: rgba(255, 248, 225, 0.2);
}

.app-main {
  flex: 1;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
  padding: 28px;
}

@media (max-width: 768px) {
  .navbar-inner {
    padding: 14px 16px;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .brand-title {
    font-size: 20px;
  }

  .navbar-stats {
    width: 100%;
    justify-content: space-around;
    padding: 8px 12px;
  }

  .stat-item {
    min-width: 40px;
  }

  .stat-num {
    font-size: 18px;
  }

  .app-main {
    padding: 16px;
  }
}
</style>
