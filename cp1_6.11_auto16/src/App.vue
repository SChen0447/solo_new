<template>
  <div class="app-container">
    <header class="navbar">
      <div class="navbar-content">
        <div class="logo">
          <span class="logo-icon">💡</span>
          <span class="logo-text">点子投票墙</span>
        </div>
        <button class="fab-btn" @click="showPublishModal = true">
          <span class="fab-icon">+</span>
          <span class="fab-text">发布创意</span>
        </button>
      </div>
    </header>

    <main class="main-content">
      <div class="toolbar">
        <div class="toolbar-left">
          <div class="sort-wrapper">
            <label class="sort-label">排序方式:</label>
            <select 
              v-model="selectedSort" 
              class="sort-select"
              @change="handleSortChange"
            >
              <option value="hot">🔥 投票热度</option>
              <option value="latest">⏰ 最新发布</option>
              <option value="mostUp">👍 最多赞同</option>
              <option value="controversial">⚖️ 争议最大</option>
            </select>
          </div>
          <button 
            v-if="ideas.length < 100"
            class="bulk-btn" 
            @click="handleGenerateBulk"
          >
            ➕ 生成100条测试数据
          </button>
        </div>
        <div class="stats">
          共 <span class="stats-number">{{ ideas.length }}</span> 个点子
          <span v-if="ideas.length >= 100" class="perf-indicator">⚡ 高性能模式已启用</span>
        </div>
      </div>

      <TransitionGroup 
        name="list" 
        tag="div" 
        class="ideas-grid"
      >
        <IdeaCard
          v-for="(idea, index) in sortedIdeas"
          :key="idea.id"
          :idea="idea"
          :index="index"
          :user-vote="getUserVote(idea.id)"
          :format-time="formatTime"
          :parse-avatar="parseAvatar"
          @vote="handleVote"
          @open-detail="openDetail"
        />
      </TransitionGroup>

      <div v-if="sortedIdeas.length === 0" class="empty-state">
        <div class="empty-icon">✨</div>
        <h3 class="empty-title">还没有任何点子</h3>
        <p class="empty-desc">点击右上角的"发布创意"按钮，成为第一个分享想法的人吧！</p>
      </div>
    </main>

    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showPublishModal" class="modal-overlay" @click.self="showPublishModal = false">
          <div class="publish-modal">
            <button class="close-btn" @click="showPublishModal = false">
              <span>✕</span>
            </button>
            
            <h2 class="modal-title">发布你的创意</h2>
            <p class="modal-desc">分享你的好点子，让大家一起来投票！</p>
            
            <form class="publish-form" @submit.prevent="handlePublish">
              <div class="form-group">
                <label for="title">创意标题 <span class="required">*</span></label>
                <input 
                  id="title"
                  v-model="newIdea.title" 
                  type="text" 
                  placeholder="用一句话概括你的创意（最多20字）"
                  maxlength="20"
                  @input="validateTitle"
                />
                <div class="form-hint">
                  <span :class="{ error: titleError }">{{ titleError || newIdea.title.length }}/20</span>
                </div>
              </div>
              
              <div class="form-group">
                <label for="description">详细描述 <span class="required">*</span></label>
                <textarea 
                  id="description"
                  v-model="newIdea.description" 
                  placeholder="详细描述你的想法，让大家更好地理解（最多200字）"
                  maxlength="200"
                  @input="validateDescription"
                ></textarea>
                <div class="form-hint">
                  <span :class="{ error: descError }">{{ descError || newIdea.description.length }}/200</span>
                </div>
              </div>

              <div class="form-preview">
                <span class="preview-label">发布身份:</span>
                <div class="preview-avatar" :style="{ backgroundColor: currentAvatarInfo.color }">
                  <span class="avatar-initial">{{ currentAvatarInfo.initial }}</span>
                </div>
                <span class="preview-name">{{ currentUserName }}</span>
              </div>
              
              <button 
                type="submit" 
                class="submit-btn"
                :disabled="!canSubmit"
              >
                发布创意 🚀
              </button>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <IdeaDetail
      v-if="selectedIdea"
      :visible="showDetailModal"
      :idea="selectedIdea"
      :format-time="formatTime"
      :parse-avatar="parseAvatar"
      :current-user-avatar="currentUserAvatar"
      @close="closeDetail"
      @add-comment="handleAddComment"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import IdeaCard from './components/IdeaCard.vue'
import IdeaDetail from './components/IdeaDetail.vue'
import { useIdeas, type VoteType, type SortType, type Idea } from './composables/useIdeas'

const {
  ideas,
  sortedIdeas,
  sortType,
  currentUserName,
  currentUserAvatar,
  addIdea,
  vote,
  getUserVote,
  addComment,
  setSortType,
  getIdeaById,
  formatTime,
  parseAvatar,
  generateBulkIdeas
} = useIdeas()

const showPublishModal = ref(false)
const showDetailModal = ref(false)
const selectedIdea = ref<Idea | null>(null)
const selectedSort = ref<SortType>('hot')

const newIdea = reactive({
  title: '',
  description: ''
})

const titleError = ref('')
const descError = ref('')

const currentAvatarInfo = computed(() => parseAvatar(currentUserAvatar.value))

const canSubmit = computed(() => {
  return newIdea.title.trim().length > 0 && 
         newIdea.description.trim().length > 0 &&
         !titleError.value && 
         !descError.value
})

function validateTitle() {
  if (newIdea.title.length > 20) {
    titleError.value = '标题不能超过20字'
  } else if (newIdea.title.trim().length === 0) {
    titleError.value = ''
  } else {
    titleError.value = ''
  }
}

function validateDescription() {
  if (newIdea.description.length > 200) {
    descError.value = '描述不能超过200字'
  } else if (newIdea.description.trim().length === 0) {
    descError.value = ''
  } else {
    descError.value = ''
  }
}

function handleSortChange() {
  setSortType(selectedSort.value)
}

function handleVote(ideaId: string, voteType: VoteType) {
  vote(ideaId, voteType)
}

function handlePublish() {
  if (!canSubmit.value) return
  
  addIdea(newIdea.title, newIdea.description)
  newIdea.title = ''
  newIdea.description = ''
  showPublishModal.value = false
}

function handleAddComment(ideaId: string, content: string) {
  addComment(ideaId, content)
}

function handleGenerateBulk() {
  const count = 100 - ideas.value.length
  if (count > 0) {
    generateBulkIdeas(count)
  }
}

function openDetail(ideaId: string) {
  const idea = getIdeaById(ideaId)
  if (idea) {
    selectedIdea.value = idea
    showDetailModal.value = true
  }
}

function closeDetail() {
  showDetailModal.value = false
  setTimeout(() => {
    selectedIdea.value = null
  }, 300)
}
</script>

<style scoped>
.app-container {
  min-height: 100vh;
}

.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 70px;
  background: rgba(26, 35, 50, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 100;
  display: flex;
  align-items: center;
}

.navbar-content {
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-icon {
  font-size: 32px;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

.logo-text {
  font-size: 22px;
  font-weight: 800;
  background: linear-gradient(135deg, #fff 0%, var(--accent-yellow) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.fab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border: none;
  border-radius: 50px;
  background: var(--accent-yellow);
  color: var(--primary-bg);
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 20px rgba(255, 212, 59, 0.4);
}

.fab-btn:hover {
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 8px 30px rgba(255, 212, 59, 0.5);
}

.fab-btn:active {
  transform: translateY(0) scale(0.98);
}

.fab-icon {
  font-size: 20px;
  font-weight: 800;
}

.main-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 110px 24px 60px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  flex-wrap: wrap;
  gap: 16px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.sort-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
}

.bulk-btn {
  padding: 10px 16px;
  border: 1px solid rgba(255, 212, 59, 0.3);
  border-radius: 12px;
  background: rgba(255, 212, 59, 0.1);
  color: var(--accent-yellow);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.bulk-btn:hover {
  background: rgba(255, 212, 59, 0.2);
  transform: translateY(-1px);
}

.perf-indicator {
  margin-left: 12px;
  font-size: 12px;
  color: var(--success);
  background: rgba(81, 207, 102, 0.15);
  padding: 4px 10px;
  border-radius: 12px;
}

.sort-label {
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 500;
}

.sort-select {
  padding: 10px 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  outline: none;
  transition: all 0.2s ease;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23ffd43b' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 16px center;
  padding-right: 40px;
}

.sort-select:hover {
  border-color: var(--accent-yellow);
  background-color: rgba(255, 212, 59, 0.05);
}

.sort-select:focus {
  border-color: var(--accent-yellow);
  box-shadow: 0 0 0 3px rgba(255, 212, 59, 0.1);
}

.sort-select option {
  background: var(--primary-bg);
  color: var(--text-primary);
}

.stats {
  font-size: 14px;
  color: var(--text-secondary);
}

.stats-number {
  color: var(--accent-yellow);
  font-weight: 700;
  font-size: 18px;
}

.ideas-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

@media (max-width: 1024px) {
  .ideas-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .ideas-grid {
    grid-template-columns: 1fr;
  }
  
  .navbar-content {
    padding: 0 16px;
  }
  
  .main-content {
    padding: 100px 16px 40px;
  }
  
  .fab-text {
    display: none;
  }
  
  .fab-btn {
    padding: 12px 16px;
  }
  
  .logo-text {
    font-size: 18px;
  }
}

.list-enter-active,
.list-leave-active,
.list-move {
  transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.list-enter-from {
  opacity: 0;
  transform: translateY(30px) scale(0.9);
}

.list-leave-to {
  opacity: 0;
  transform: translateY(-30px) scale(0.9);
}

.list-leave-active {
  position: absolute;
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  animation: pulse 2s ease-in-out infinite;
}

.empty-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.empty-desc {
  font-size: 15px;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.6;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.publish-modal {
  background: var(--primary-bg);
  border: 1px solid var(--glass-border);
  border-radius: 24px;
  padding: 40px;
  max-width: 550px;
  width: 100%;
  position: relative;
  animation: modalIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes modalIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-secondary);
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: rgba(255, 107, 107, 0.3);
  color: var(--danger);
  transform: rotate(90deg);
}

.modal-title {
  font-size: 28px;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.modal-desc {
  font-size: 15px;
  color: var(--text-secondary);
  margin: 0 0 32px 0;
}

.publish-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.required {
  color: var(--danger);
}

.form-group input,
.form-group textarea {
  padding: 14px 18px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-primary);
  font-size: 15px;
  font-family: inherit;
  outline: none;
  transition: all 0.2s ease;
}

.form-group textarea {
  min-height: 120px;
  resize: none;
  line-height: 1.6;
}

.form-group input:focus,
.form-group textarea:focus {
  border-color: var(--accent-yellow);
  background: rgba(255, 212, 59, 0.05);
  box-shadow: 0 0 0 4px rgba(255, 212, 59, 0.1);
}

.form-group input::placeholder,
.form-group textarea::placeholder {
  color: var(--text-secondary);
}

.form-hint {
  display: flex;
  justify-content: flex-end;
}

.form-hint span {
  font-size: 12px;
  color: var(--text-secondary);
}

.form-hint span.error {
  color: var(--danger);
  font-weight: 600;
}

.form-preview {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.preview-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.preview-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.preview-avatar .avatar-initial {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.preview-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--accent-yellow);
}

.submit-btn {
  padding: 16px 32px;
  border: none;
  border-radius: 50px;
  background: var(--accent-yellow);
  color: var(--primary-bg);
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 20px rgba(255, 212, 59, 0.4);
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(255, 212, 59, 0.5);
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .publish-modal,
.modal-leave-active .publish-modal {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-enter-from .publish-modal,
.modal-leave-to .publish-modal {
  opacity: 0;
  transform: scale(0.9) translateY(20px);
}

@media (max-width: 640px) {
  .publish-modal {
    padding: 24px;
    border-radius: 16px;
  }
  
  .modal-title {
    font-size: 22px;
  }
}
</style>
