<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
        <div class="modal-content">
          <button class="close-btn" @click="$emit('close')">
            <span>✕</span>
          </button>

          <div class="detail-header">
            <div class="avatar" :style="{ backgroundColor: avatarInfo.color }">
              <span class="avatar-initial">{{ avatarInfo.initial }}</span>
            </div>
            <div class="author-info">
              <span class="author-name">{{ idea.authorName }}</span>
              <span class="post-time">{{ formatTime(idea.createdAt) }}</span>
            </div>
          </div>

          <h2 class="detail-title">{{ idea.title }}</h2>
          <p class="detail-description">{{ idea.description }}</p>

          <div class="chart-section">
            <h3 class="section-title">投票统计</h3>
            <div class="bar-chart">
              <div class="bar-item">
                <div class="bar-label">
                  <span class="bar-icon">👍</span>
                  <span>赞</span>
                </div>
                <div class="bar-track">
                  <div 
                    class="bar-fill up" 
                    :style="{ height: barHeights.up + '%' }"
                  >
                    <span class="bar-value">{{ idea.votes.up }}</span>
                  </div>
                </div>
              </div>
              <div class="bar-item">
                <div class="bar-label">
                  <span class="bar-icon">🤔</span>
                  <span>中立</span>
                </div>
                <div class="bar-track">
                  <div 
                    class="bar-fill neutral" 
                    :style="{ height: barHeights.neutral + '%' }"
                  >
                    <span class="bar-value">{{ idea.votes.neutral }}</span>
                  </div>
                </div>
              </div>
              <div class="bar-item">
                <div class="bar-label">
                  <span class="bar-icon">👎</span>
                  <span>踩</span>
                </div>
                <div class="bar-track">
                  <div 
                    class="bar-fill down" 
                    :style="{ height: barHeights.down + '%' }"
                  >
                    <span class="bar-value">{{ idea.votes.down }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="comment-section">
            <h3 class="section-title">评论区 ({{ idea.comments.length }})</h3>
            
            <div class="comment-input-wrapper">
              <div class="input-avatar" :style="{ backgroundColor: currentAvatarInfo.color }">
                <span class="avatar-initial">{{ currentAvatarInfo.initial }}</span>
              </div>
              <div class="input-area">
                <textarea 
                  v-model="newComment" 
                  placeholder="写下你的想法... (最多50字)"
                  maxlength="50"
                  @keydown.enter.ctrl="submitComment"
                ></textarea>
                <div class="input-actions">
                  <span class="char-count">{{ newComment.length }}/50</span>
                  <button 
                    class="submit-btn" 
                    :disabled="!newComment.trim()"
                    @click="submitComment"
                  >
                    发表评论
                  </button>
                </div>
              </div>
            </div>

            <div class="comments-list">
              <TransitionGroup name="comment">
                <div 
                    v-for="comment in sortedComments" 
                    :key="comment.id"
                    class="comment-item"
                  >
                    <div class="comment-avatar" :style="{ backgroundColor: parseAvatar(comment.authorAvatar).color }">
                      <span class="avatar-initial">{{ parseAvatar(comment.authorAvatar).initial }}</span>
                    </div>
                  <div class="comment-bubble">
                    <div class="comment-header">
                      <span class="comment-author">{{ comment.authorName }}</span>
                      <span class="comment-time">{{ formatTime(comment.createdAt) }}</span>
                    </div>
                    <p class="comment-content">{{ comment.content }}</p>
                  </div>
                </div>
              </TransitionGroup>
              
              <div v-if="idea.comments.length === 0" class="no-comments">
                暂无评论，来发表第一条评论吧！
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Idea } from '@/composables/useIdeas'

const props = defineProps<{
  visible: boolean
  idea: Idea
  formatTime: (timestamp: number) => string
  parseAvatar: (avatar: string) => { color: string; emoji: string }
  currentUserAvatar: string
}>()

const emit = defineEmits<{
  close: []
  addComment: [ideaId: string, content: string]
}>()

const newComment = ref('')

const avatarInfo = computed(() => props.parseAvatar(props.idea.authorAvatar))
const currentAvatarInfo = computed(() => props.parseAvatar(props.currentUserAvatar))

const maxVotes = computed(() => {
  return Math.max(props.idea.votes.up, props.idea.votes.neutral, props.idea.votes.down, 1)
})

const barHeights = computed(() => ({
  up: (props.idea.votes.up / maxVotes.value) * 100,
  neutral: (props.idea.votes.neutral / maxVotes.value) * 100,
  down: (props.idea.votes.down / maxVotes.value) * 100
}))

const sortedComments = computed(() => {
  return [...props.idea.comments].sort((a, b) => b.createdAt - a.createdAt)
})

function submitComment() {
  if (!newComment.value.trim()) return
  emit('addComment', props.idea.id, newComment.value)
  newComment.value = ''
}

watch(() => props.visible, (val) => {
  if (val) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})
</script>

<style scoped>
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

.modal-content {
  background: var(--primary-bg);
  border: 1px solid var(--glass-border);
  border-radius: 24px;
  padding: 32px;
  max-width: 700px;
  width: 100%;
  max-height: 85vh;
  overflow-y: auto;
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

.detail-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.avatar-initial {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.input-avatar .avatar-initial {
  font-size: 16px;
}

.comment-avatar .avatar-initial {
  font-size: 14px;
}

.author-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.author-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}

.post-time {
  font-size: 14px;
  color: var(--text-secondary);
}

.detail-title {
  font-size: 24px;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0 0 16px 0;
  line-height: 1.3;
}

.detail-description {
  font-size: 15px;
  color: var(--text-secondary);
  line-height: 1.8;
  margin: 0 0 28px 0;
  padding: 20px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16px;
  border-left: 4px solid var(--accent-yellow);
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 20px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title::before {
  content: '';
  width: 4px;
  height: 20px;
  background: var(--accent-yellow);
  border-radius: 2px;
}

.chart-section {
  margin-bottom: 32px;
}

.bar-chart {
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
  height: 200px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16px;
  gap: 20px;
}

.bar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.bar-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--text-secondary);
  order: 2;
}

.bar-icon {
  font-size: 20px;
}

.bar-track {
  width: 60px;
  height: 140px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px 12px 4px 4px;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: flex-end;
  order: 1;
}

.bar-fill {
  width: 100%;
  min-height: 4px;
  border-radius: 12px 12px 4px 4px;
  position: relative;
  transition: height 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 8px;
}

.bar-fill.up {
  background: linear-gradient(180deg, #51cf66 0%, #37b24d 50%, #2f9e44 100%);
  box-shadow: 0 0 20px rgba(81, 207, 102, 0.4);
}

.bar-fill.neutral {
  background: linear-gradient(180deg, #ffd43b 0%, #fab005 50%, #f59f00 100%);
  box-shadow: 0 0 20px rgba(255, 212, 59, 0.4);
}

.bar-fill.down {
  background: linear-gradient(180deg, #ff6b6b 0%, #f03e3e 50%, #e03131 100%);
  box-shadow: 0 0 20px rgba(255, 107, 107, 0.4);
}

.bar-value {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.comment-section {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 28px;
}

.comment-input-wrapper {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.input-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.input-avatar span {
  font-size: 18px;
}

.input-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

textarea {
  width: 100%;
  min-height: 80px;
  padding: 12px 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-primary);
  font-size: 14px;
  font-family: inherit;
  resize: none;
  outline: none;
  transition: all 0.2s ease;
}

textarea:focus {
  border-color: var(--accent-yellow);
  background: rgba(255, 212, 59, 0.05);
  box-shadow: 0 0 0 3px rgba(255, 212, 59, 0.1);
}

textarea::placeholder {
  color: var(--text-secondary);
}

.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.char-count {
  font-size: 12px;
  color: var(--text-secondary);
}

.submit-btn {
  padding: 8px 20px;
  border: none;
  border-radius: 20px;
  background: var(--accent-yellow);
  color: var(--primary-bg);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 212, 59, 0.4);
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.comments-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.comment-item {
  display: flex;
  gap: 12px;
}

.comment-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.comment-avatar span {
  font-size: 16px;
}

.comment-bubble {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 0 16px 16px 16px;
  padding: 12px 16px;
  position: relative;
}

.comment-bubble::before {
  content: '';
  position: absolute;
  top: 0;
  left: -8px;
  width: 0;
  height: 0;
  border-top: 12px solid rgba(255, 255, 255, 0.05);
  border-left: 12px solid transparent;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.comment-author {
  font-size: 13px;
  font-weight: 600;
  color: var(--accent-yellow);
}

.comment-time {
  font-size: 11px;
  color: var(--text-secondary);
}

.comment-content {
  font-size: 14px;
  color: var(--text-primary);
  line-height: 1.6;
  margin: 0;
  word-break: break-word;
}

.no-comments {
  text-align: center;
  color: var(--text-secondary);
  font-size: 14px;
  padding: 40px 20px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 16px;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  opacity: 0;
  transform: scale(0.9) translateY(20px);
}

.comment-enter-active,
.comment-leave-active {
  transition: all 0.3s ease;
}

.comment-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.comment-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.comment-move {
  transition: transform 0.3s ease;
}

@media (max-width: 640px) {
  .modal-content {
    padding: 20px;
    border-radius: 16px;
  }
  
  .detail-title {
    font-size: 20px;
  }
  
  .bar-track {
    width: 45px;
  }
}
</style>
