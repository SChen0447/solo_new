<template>
  <div class="app-container">
    <div ref="canvasContainer" class="canvas-container"></div>
    <ControlPanel
      :brushMode="brushMode"
      :brushRadius="brushRadius"
      :canUndo="canUndo"
      :canRedo="canRedo"
      @update:brushMode="handleBrushModeChange"
      @update:brushRadius="handleRadiusChange"
      @undo="handleUndo"
      @redo="handleRedo"
    />
    <div ref="cursorIndicator" class="cursor-indicator" :class="brushMode" :style="cursorStyle">
      <div class="halo"></div>
      <div class="center-dot"></div>
    </div>
    <div v-if="!cameraReady" class="loading-overlay">
      <div class="loading-content">
        <div class="spinner"></div>
        <p>正在初始化摄像头和手势识别...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import ControlPanel from './ui/ControlPanel.vue'
import { SceneManager } from './core/SceneManager'
import { MeshDeformer, BrushMode } from './core/MeshDeformer'
import { HandTracker } from './hand/HandTracker'
import { GestureMapper, SculptCommand } from './hand/GestureMapper'

const canvasContainer = ref<HTMLDivElement | null>(null)
const cursorIndicator = ref<HTMLDivElement | null>(null)
const cameraReady = ref(false)

const brushMode = ref<BrushMode>('inflate')
const brushRadius = ref(3)
const canUndo = ref(false)
const canRedo = ref(false)

const cursorPosition = reactive({ x: 0, y: 0, visible: false })

const cursorStyle = computed(() => ({
  left: `${cursorPosition.x}px`,
  top: `${cursorPosition.y}px`,
  width: `${brushRadius.value * 20}px`,
  height: `${brushRadius.value * 20}px`,
  opacity: cursorPosition.visible ? 1 : 0,
  transform: 'translate(-50%, -50%)'
}))

let sceneManager: SceneManager | null = null
let meshDeformer: MeshDeformer | null = null
let handTracker: HandTracker | null = null
let gestureMapper: GestureMapper | null = null
let animationFrameId: number = 0
let lastFrameTime = 0
const targetFPS = 60
const frameInterval = 1000 / targetFPS

const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

function playVibrationSound(intensity: number = 0.3) {
  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()
  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)
  oscillator.frequency.value = 80 + intensity * 40
  oscillator.type = 'sine'
  gainNode.gain.setValueAtTime(0, audioContext.currentTime)
  gainNode.gain.linearRampToValueAtTime(0.1 * intensity, audioContext.currentTime + 0.01)
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.05)
  oscillator.start(audioContext.currentTime)
  oscillator.stop(audioContext.currentTime + 0.05)
}

function createParticles(position: THREE.Vector3, count: number = 5) {
  if (!sceneManager) return
  sceneManager.createParticles(position, count)
}

function handleSculptCommand(command: SculptCommand) {
  if (!meshDeformer || !sceneManager) return

  cursorPosition.x = command.screenX
  cursorPosition.y = command.screenY
  cursorPosition.visible = command.isActive

  if (command.isActive && command.worldPosition) {
    const result = meshDeformer.deform(
      command.worldPosition,
      brushMode.value,
      brushRadius.value,
      command.intensity
    )

    if (result.deformed && sceneManager) {
      sceneManager.updateClayMesh(meshDeformer.getVertexArray())
      createParticles(command.worldPosition, Math.floor(command.intensity * 8))
      if (Math.random() < 0.3) {
        playVibrationSound(command.intensity)
      }
      canUndo.value = meshDeformer.canUndo()
      canRedo.value = meshDeformer.canRedo()
    }
  }
}

function handleBrushModeChange(mode: BrushMode) {
  brushMode.value = mode
}

function handleRadiusChange(radius: number) {
  brushRadius.value = radius
}

function handleUndo() {
  if (meshDeformer && meshDeformer.undo() && sceneManager) {
    sceneManager.updateClayMesh(meshDeformer.getVertexArray())
    canUndo.value = meshDeformer.canUndo()
    canRedo.value = meshDeformer.canRedo()
  }
}

function handleRedo() {
  if (meshDeformer && meshDeformer.redo() && sceneManager) {
    sceneManager.updateClayMesh(meshDeformer.getVertexArray())
    canUndo.value = meshDeformer.canUndo()
    canRedo.value = meshDeformer.canRedo()
  }
}

function animate(currentTime: number) {
  animationFrameId = requestAnimationFrame(animate)

  const deltaTime = currentTime - lastFrameTime
  if (deltaTime < frameInterval) return
  lastFrameTime = currentTime - (deltaTime % frameInterval)

  if (sceneManager) {
    sceneManager.render()
  }
}

async function init() {
  if (!canvasContainer.value) return

  try {
    sceneManager = new SceneManager(canvasContainer.value)
    meshDeformer = new MeshDeformer(3, 5)
    sceneManager.initClayMesh(meshDeformer.getVertexArray(), meshDeformer.getIndexArray())

    const videoElement = document.getElementById('video-input') as HTMLVideoElement
    handTracker = new HandTracker(videoElement)

    gestureMapper = new GestureMapper()
    gestureMapper.onSculptCommand(handleSculptCommand)

    handTracker.onHandData((handData) => {
      if (!sceneManager) return
      const camera = sceneManager.getCamera()
      gestureMapper.processHandData(handData, camera, window.innerWidth, window.innerHeight)
    })

    await handTracker.init()
    cameraReady.value = true

    animationFrameId = requestAnimationFrame(animate)
  } catch (error) {
    console.error('Initialization error:', error)
    const fallback = document.getElementById('fallback')
    if (fallback) {
      fallback.style.display = 'block'
    }
  }
}

function handleResize() {
  if (sceneManager) {
    sceneManager.handleResize()
  }
}

onMounted(() => {
  init()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  cancelAnimationFrame(animationFrameId)
  if (handTracker) {
    handTracker.destroy()
  }
  if (sceneManager) {
    sceneManager.destroy()
  }
})
</script>

<style scoped>
.app-container {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
}

.canvas-container {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
}

.cursor-indicator {
  position: fixed;
  pointer-events: none;
  z-index: 100;
  transition: opacity 0.3s ease, width 0.2s ease, height 0.2s ease;
}

.cursor-indicator .halo {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  animation: pulse 1.5s ease-in-out infinite;
}

.cursor-indicator.inflate .halo {
  border: 2px solid #00ff88;
  box-shadow: 0 0 20px rgba(0, 255, 136, 0.5), inset 0 0 20px rgba(0, 255, 136, 0.1);
}

.cursor-indicator.deflate .halo {
  border: 2px solid #ff4466;
  box-shadow: 0 0 20px rgba(255, 68, 102, 0.5), inset 0 0 20px rgba(255, 68, 102, 0.1);
}

.cursor-indicator.smooth .halo {
  border: 2px solid #00fff5;
  box-shadow: 0 0 20px rgba(0, 255, 245, 0.5), inset 0 0 20px rgba(0, 255, 245, 0.1);
}

.cursor-indicator.scrape .halo {
  border: 2px solid #ffaa00;
  box-shadow: 0 0 20px rgba(255, 170, 0, 0.5), inset 0 0 20px rgba(255, 170, 0, 0.1);
}

.cursor-indicator .center-dot {
  position: absolute;
  width: 8px;
  height: 8px;
  background: white;
  border-radius: 50%;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.1); opacity: 1; }
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(10, 10, 30, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loading-content {
  text-align: center;
  color: #00fff5;
}

.spinner {
  width: 60px;
  height: 60px;
  border: 3px solid rgba(0, 255, 245, 0.2);
  border-top: 3px solid #00fff5;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-content p {
  font-size: 16px;
  text-shadow: 0 0 10px rgba(0, 255, 245, 0.5);
}
</style>
