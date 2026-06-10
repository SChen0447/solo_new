import React, { useEffect, useRef, useState, useCallback } from 'react'
import type {
  GameState,
  Submarine,
  SoundBall,
  Obstacle,
  FishSchool,
  Jellyfish,
  TrailParticle,
  Shockwave,
  TrackLayer,
  CollectedNote,
  NoteColor,
  InstrumentType,
} from './types'
import {
  CANVAS_RATIO,
  MAX_CANVAS_WIDTH,
  COLORS,
  NOTE_COLORS,
  NOTE_INSTRUMENTS,
  COLOR_KEYS,
  BASE_FREQUENCY,
  SEMITONE_RATIO,
  SUBMARINE,
  SOUND_BALL,
  OBSTACLE,
  FISH,
  JELLYFISH,
  TRAIL,
  SHOCKWAVE,
  TRACK,
  COLLISION,
  INITIAL_LIVES,
} from './config'

const CANVAS_W = 360
const CANVAS_H = 640

let idCounter = 1
const nextId = () => idCounter++

function randRange(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

function createInitialState(): GameState {
  const trackLayers = new Map<NoteColor, TrackLayer>()
  COLOR_KEYS.forEach((c) => {
    trackLayers.set(c, {
      color: c,
      layer: 0,
      targetWidth: TRACK.minWidth,
      currentWidth: TRACK.minWidth,
      fadeTimer: 0,
    })
  })

  return {
    status: 'playing',
    lives: INITIAL_LIVES,
    score: 0,
    submarine: {
      x: CANVAS_W / 2,
      y: CANVAS_H - 80,
      width: SUBMARINE.width,
      height: SUBMARINE.height,
      speed: SUBMARINE.baseSpeed,
      baseSpeed: SUBMARINE.baseSpeed,
      hitFlashTimer: 0,
      slowTimer: 0,
      propellerAngle: 0,
      windowPulse: 0,
    },
    soundBalls: [],
    obstacles: [],
    fishSchools: [],
    jellyfish: [],
    trailParticles: [],
    shockwaves: [],
    trackLayers,
    currentColorChain: null,
    collectedNotes: [],
    spawnTimer: 0,
    obstacleTimer: 1500,
    fishTimer: 3000,
    jellyfishTimer: 2000,
    scrollOffset: 0,
  }
}

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const stateRef = useRef<GameState>(createInitialState())
  const keysRef = useRef<Set<string>>(new Set())
  const mouseXRef = useRef<number | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const lastTrailSpawnRef = useRef<Map<number, number>>(new Map())
  const animFrameRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const [, forceUpdate] = useState(0)
  const [gameOverInfo, setGameOverInfo] = useState<{ score: number; notes: CollectedNote[] } | null>(null)

  const ensureAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return audioCtxRef.current
  }, [])

  const playNote = useCallback((color: NoteColor, layer: number) => {
    const ctx = ensureAudio()
    if (ctx.state === 'suspended') ctx.resume()
    const instrument = NOTE_INSTRUMENTS[color]
    const freq = BASE_FREQUENCY * Math.pow(SEMITONE_RATIO, Math.min(layer, TRACK.maxLayers))
    const now = ctx.currentTime
    const duration = 0.15

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    switch (instrument as InstrumentType) {
      case 'piano':
        osc.type = 'triangle'
        break
      case 'violin':
        osc.type = 'sawtooth'
        break
      case 'drum':
        osc.type = 'square'
        break
      case 'harp':
        osc.type = 'sine'
        break
      case 'flute':
        osc.type = 'sine'
        break
    }

    osc.frequency.value = freq
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(instrument === 'drum' ? 0.35 : 0.25, now + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration)

    if (instrument === 'flute') {
      const vibrato = ctx.createOscillator()
      const vibGain = ctx.createGain()
      vibrato.frequency.value = 5
      vibGain.gain.value = 3
      vibrato.connect(vibGain).connect(osc.frequency)
      vibrato.start(now)
      vibrato.stop(now + duration)
    }

    osc.connect(gain).connect(ctx.destination)
    osc.start(now)
    osc.stop(now + duration)
  }, [ensureAudio])

  const spawnSoundBall = useCallback((state: GameState) => {
    const color = COLOR_KEYS[Math.floor(Math.random() * COLOR_KEYS.length)]
    const ball: SoundBall = {
      id: nextId(),
      baseX: randRange(50, CANVAS_W - 50),
      x: 0,
      y: -30,
      color,
      radius: SOUND_BALL.radius,
      speed: randRange(SOUND_BALL.baseSpeed * 0.8, SOUND_BALL.baseSpeed * 1.3),
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleAmp: SOUND_BALL.wobbleAmp,
      collected: false,
      spawnTime: performance.now(),
    }
    ball.x = ball.baseX
    state.soundBalls.push(ball)
    lastTrailSpawnRef.current.set(ball.id, 0)
  }, [])

  const spawnObstacle = useCallback((state: GameState) => {
    const width = randRange(OBSTACLE.reefMinWidth, OBSTACLE.reefMaxWidth)
    const height = randRange(OBSTACLE.reefMinHeight, OBSTACLE.reefMaxHeight)
    state.obstacles.push({
      id: nextId(),
      type: 'reef',
      x: randRange(30, CANVAS_W - 30 - width),
      y: -height,
      width,
      height,
      rotation: Math.random() * Math.PI * 2,
      speed: OBSTACLE.reefSpeed,
    })
  }, [])

  const spawnFishSchool = useCallback((state: GameState) => {
    state.fishSchools.push({
      id: nextId(),
      x: 0,
      y: -50,
      baseX: randRange(80, CANVAS_W - 80),
      fishCount: Math.floor(randRange(FISH.minCount, FISH.maxCount + 1)),
      phase: Math.random() * Math.PI * 2,
      amplitude: FISH.amplitude,
      period: FISH.period,
      speed: FISH.speed,
    })
  }, [])

  const spawnJellyfish = useCallback((state: GameState) => {
    state.jellyfish.push({
      x: randRange(40, CANVAS_W - 40),
      y: CANVAS_H + 30,
      radius: randRange(JELLYFISH.minRadius, JELLYFISH.maxRadius),
      alpha: randRange(0.3, 0.6),
      pulsePhase: Math.random() * Math.PI * 2,
      speed: JELLYFISH.speed,
    })
  }, [])

  const addShockwave = useCallback((state: GameState, x: number, y: number, color: string) => {
    state.shockwaves.push({
      x,
      y,
      color,
      radius: SHOCKWAVE.initialRadius,
      maxRadius: SHOCKWAVE.finalRadius,
      alpha: 1,
      life: SHOCKWAVE.duration,
      maxLife: SHOCKWAVE.duration,
    })
  }, [])

  const collectBall = useCallback((state: GameState, ball: SoundBall) => {
    if (ball.collected) return
    ball.collected = true

    const color = ball.color
    let layer = 1

    if (state.currentColorChain === color) {
      const existing = state.trackLayers.get(color)!
      layer = Math.min(existing.layer + 1, TRACK.maxLayers)
      existing.layer = layer
      existing.targetWidth = TRACK.minWidth + ((TRACK.maxWidth - TRACK.minWidth) * layer) / TRACK.maxLayers
      existing.fadeTimer = 0
    } else {
      if (state.currentColorChain !== null) {
        const prev = state.trackLayers.get(state.currentColorChain)!
        if (prev.layer > 0) {
          prev.fadeTimer = TRACK.fadeDuration
        }
      }
      state.currentColorChain = color
      const tl = state.trackLayers.get(color)!
      layer = 1
      tl.layer = 1
      tl.targetWidth = TRACK.minWidth + ((TRACK.maxWidth - TRACK.minWidth) * 1) / TRACK.maxLayers
      tl.fadeTimer = 0
    }

    state.collectedNotes.push({ color, layer, time: performance.now() })
    addShockwave(state, ball.x, ball.y, NOTE_COLORS[color])
    playNote(color, layer - 1)
  }, [addShockwave, playNote])

  const hitReef = useCallback((state: GameState) => {
    if (state.submarine.hitFlashTimer > 0) return
    state.lives -= 1
    state.submarine.hitFlashTimer = SUBMARINE.hitFlashDuration
    if (state.lives <= 0) {
      state.status = 'gameover'
      const notes = [...state.collectedNotes]
      const maxLayer = notes.reduce((m, n) => Math.max(m, n.layer), 0)
      const score = Math.floor(notes.length * (1 + 0.2 * maxLayer))
      state.score = score
      setGameOverInfo({ score, notes })
    }
  }, [])

  const hitFish = useCallback((state: GameState) => {
    state.submarine.slowTimer = SUBMARINE.slowDuration
    state.submarine.speed = state.submarine.baseSpeed * SUBMARINE.slowMultiplier
  }, [])

  const rectsIntersect = (ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number): boolean => {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by
  }

  const update = useCallback((dt: number, state: GameState) => {
    if (state.status !== 'playing') return

    state.scrollOffset = (state.scrollOffset + dt * 0.03) % 1000

    const sub = state.submarine
    if (sub.hitFlashTimer > 0) sub.hitFlashTimer = Math.max(0, sub.hitFlashTimer - dt)
    if (sub.slowTimer > 0) {
      sub.slowTimer = Math.max(0, sub.slowTimer - dt)
      if (sub.slowTimer === 0) sub.speed = sub.baseSpeed
    }
    sub.propellerAngle = (sub.propellerAngle + dt * 0.02) % (Math.PI * 2)
    sub.windowPulse = (sub.windowPulse + dt * 0.0025) % (Math.PI * 2)

    if (keysRef.current.has('ArrowLeft') || keysRef.current.has('a')) {
      sub.x -= sub.speed
    }
    if (keysRef.current.has('ArrowRight') || keysRef.current.has('d')) {
      sub.x += sub.speed
    }
    if (mouseXRef.current !== null) {
      const target = mouseXRef.current
      if (Math.abs(target - sub.x) > sub.speed) {
        sub.x += target > sub.x ? sub.speed : -sub.speed
      } else {
        sub.x = target
      }
    }
    sub.x = Math.max(sub.width / 2 + 20, Math.min(CANVAS_W - sub.width / 2 - 20, sub.x))

    state.spawnTimer -= dt
    if (state.spawnTimer <= 0) {
      spawnSoundBall(state)
      state.spawnTimer = SOUND_BALL.spawnInterval
    }
    state.obstacleTimer -= dt
    if (state.obstacleTimer <= 0) {
      spawnObstacle(state)
      state.obstacleTimer = OBSTACLE.spawnInterval + Math.random() * 1000
    }
    state.fishTimer -= dt
    if (state.fishTimer <= 0) {
      spawnFishSchool(state)
      state.fishTimer = FISH.spawnInterval + Math.random() * 1500
    }
    state.jellyfishTimer -= dt
    if (state.jellyfishTimer <= 0) {
      spawnJellyfish(state)
      state.jellyfishTimer = JELLYFISH.spawnInterval + Math.random() * 2000
    }

    for (let i = state.soundBalls.length - 1; i >= 0; i--) {
      const ball = state.soundBalls[i]
      if (ball.collected) {
        state.soundBalls.splice(i, 1)
        lastTrailSpawnRef.current.delete(ball.id)
        continue
      }
      ball.y += ball.speed
      ball.wobblePhase += SOUND_BALL.wobbleSpeed
      ball.x = ball.baseX + Math.sin(ball.wobblePhase) * ball.wobbleAmp

      const lastSpawn = lastTrailSpawnRef.current.get(ball.id) || 0
      if (performance.now() - lastSpawn > TRAIL.spawnInterval) {
        if (state.trailParticles.length < TRAIL.maxParticles) {
          state.trailParticles.push({
            x: ball.x,
            y: ball.y + ball.radius,
            radius: ball.radius * 0.4,
            color: NOTE_COLORS[ball.color],
            alpha: 0.8,
            life: TRAIL.particleLife,
            maxLife: TRAIL.particleLife,
          })
        }
        lastTrailSpawnRef.current.set(ball.id, performance.now())
      }

      const dx = sub.x - ball.x
      const dy = sub.y - ball.y
      if (Math.hypot(dx, dy) < COLLISION.ballCollectRadius) {
        collectBall(state, ball)
      }

      if (ball.y > CANVAS_H + 40) {
        state.soundBalls.splice(i, 1)
        lastTrailSpawnRef.current.delete(ball.id)
      }
    }

    for (let i = state.trailParticles.length - 1; i >= 0; i--) {
      const p = state.trailParticles[i]
      p.life -= dt
      p.alpha = (p.life / p.maxLife) * 0.8
      p.radius = Math.max(1, p.radius * (p.life / p.maxLife))
      if (p.life <= 0) state.trailParticles.splice(i, 1)
    }

    for (let i = state.shockwaves.length - 1; i >= 0; i--) {
      const s = state.shockwaves[i]
      s.life -= dt
      const t = 1 - s.life / s.maxLife
      s.radius = SHOCKWAVE.initialRadius + (SHOCKWAVE.finalRadius - SHOCKWAVE.initialRadius) * t
      s.alpha = 1 - t
      if (s.life <= 0) state.shockwaves.splice(i, 1)
    }

    for (let i = state.obstacles.length - 1; i >= 0; i--) {
      const o = state.obstacles[i]
      o.y += o.speed
      if (rectsIntersect(sub.x - sub.width / 2, sub.y - sub.height / 2, sub.width, sub.height, o.x, o.y, o.width, o.height)) {
        hitReef(state)
      }
      if (o.y > CANVAS_H + 50) state.obstacles.splice(i, 1)
    }

    for (let i = state.fishSchools.length - 1; i >= 0; i--) {
      const f = state.fishSchools[i]
      f.y += f.speed
      f.phase += (dt / f.period) * Math.PI * 2
      f.x = f.baseX + Math.sin(f.phase) * f.amplitude
      const fw = FISH.fishWidth * 2 + (f.fishCount - 1) * 14
      const fh = FISH.fishHeight * 3
      if (rectsIntersect(sub.x - sub.width / 2, sub.y - sub.height / 2, sub.width, sub.height, f.x - fw / 2, f.y - fh / 2, fw, fh)) {
        hitFish(state)
      }
      if (f.y > CANVAS_H + 60) state.fishSchools.splice(i, 1)
    }

    for (let i = state.jellyfish.length - 1; i >= 0; i--) {
      const j = state.jellyfish[i]
      j.y -= j.speed
      j.pulsePhase += (dt / JELLYFISH.pulsePeriod) * Math.PI * 2
      if (j.y < -40) state.jellyfish.splice(i, 1)
    }

    state.trackLayers.forEach((tl) => {
      if (tl.fadeTimer > 0) {
        tl.fadeTimer = Math.max(0, tl.fadeTimer - dt)
        const t = tl.fadeTimer / TRACK.fadeDuration
        tl.currentWidth = TRACK.minWidth + (tl.targetWidth - TRACK.minWidth) * t
        if (tl.fadeTimer === 0) {
          tl.layer = 0
          tl.targetWidth = TRACK.minWidth
          tl.currentWidth = TRACK.minWidth
        }
      } else if (tl.layer > 0) {
        if (tl.currentWidth < tl.targetWidth) {
          tl.currentWidth = Math.min(tl.targetWidth, tl.currentWidth + dt * 0.2)
        }
      }
    })
  }, [spawnSoundBall, spawnObstacle, spawnFishSchool, spawnJellyfish, collectBall, hitReef, hitFish])

  const drawBackground = useCallback((ctx: CanvasRenderingContext2D, state: GameState) => {
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H)
    grad.addColorStop(0, COLORS.bgTop)
    grad.addColorStop(1, COLORS.bgBottom)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

    ctx.fillStyle = COLORS.cliff
    ctx.beginPath()
    ctx.moveTo(0, 0)
    const offset = state.scrollOffset
    for (let y = 0; y <= CANVAS_H; y += 40) {
      const wobble = Math.sin((y + offset) * 0.02) * 10 + Math.sin((y + offset) * 0.007) * 15
      ctx.lineTo(25 + wobble, y)
    }
    ctx.lineTo(0, CANVAS_H)
    ctx.closePath()
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(CANVAS_W, 0)
    for (let y = 0; y <= CANVAS_H; y += 40) {
      const wobble = Math.cos((y + offset) * 0.02) * 10 + Math.cos((y + offset) * 0.007) * 15
      ctx.lineTo(CANVAS_W - 25 - wobble, y)
    }
    ctx.lineTo(CANVAS_W, CANVAS_H)
    ctx.closePath()
    ctx.fill()
  }, [])

  const drawJellyfish = useCallback((ctx: CanvasRenderingContext2D, j: Jellyfish) => {
    const pulse = 1 + Math.sin(j.pulsePhase) * 0.15
    const r = j.radius * pulse
    ctx.save()
    ctx.globalAlpha = j.alpha
    ctx.shadowColor = '#88ffff'
    ctx.shadowBlur = 15
    ctx.fillStyle = '#66ddff'
    ctx.beginPath()
    ctx.arc(j.x, j.y, r, Math.PI, 0)
    ctx.quadraticCurveTo(j.x + r, j.y + r * 0.6, j.x, j.y + r * 0.4)
    ctx.quadraticCurveTo(j.x - r, j.y + r * 0.6, j.x - r, j.y)
    ctx.closePath()
    ctx.fill()

    ctx.strokeStyle = '#66ddff'
    ctx.lineWidth = 1.5
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath()
      const sx = j.x + i * (r * 0.25)
      ctx.moveTo(sx, j.y + r * 0.3)
      ctx.quadraticCurveTo(sx + 3, j.y + r * 0.8, sx, j.y + r * 1.3)
      ctx.stroke()
    }
    ctx.restore()
  }, [])

  const drawSubmarine = useCallback((ctx: CanvasRenderingContext2D, sub: Submarine) => {
    ctx.save()
    ctx.translate(sub.x, sub.y)
    const isHit = sub.hitFlashTimer > 0
    const bodyColor = isHit ? '#ff4757' : COLORS.submarine

    ctx.save()
    ctx.translate(-sub.width / 2 - 5, 0)
    ctx.rotate(sub.propellerAngle)
    ctx.fillStyle = '#636e72'
    ctx.fillRect(-1.5, -8, 3, 16)
    ctx.fillRect(-8, -1.5, 16, 3)
    ctx.restore()

    ctx.fillStyle = bodyColor
    ctx.beginPath()
    ctx.ellipse(0, 0, sub.width / 2, sub.height / 2, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = isHit ? '#c0392b' : '#1e80c0'
    ctx.beginPath()
    ctx.ellipse(0, 4, sub.width / 2 - 3, sub.height / 2 - 5, 0, 0, Math.PI * 2)
    ctx.fill()

    const pulse = 0.7 + Math.sin(sub.windowPulse) * 0.3
    ctx.save()
    ctx.shadowColor = COLORS.windowGlow
    ctx.shadowBlur = 12 * pulse
    ctx.fillStyle = COLORS.windowGlow
    ctx.globalAlpha = 0.6 + pulse * 0.4
    ctx.beginPath()
    ctx.arc(0, -2, 7, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(-2, -4, 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    ctx.restore()
  }, [])

  const drawSoundBall = useCallback((ctx: CanvasRenderingContext2D, ball: SoundBall) => {
    const color = NOTE_COLORS[ball.color]
    ctx.save()
    ctx.shadowColor = color
    ctx.shadowBlur = SOUND_BALL.glowRadius * 2
    ctx.globalAlpha = SOUND_BALL.glowAlpha
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(ball.x, ball.y, ball.radius + 4, 0, Math.PI * 2)
    ctx.fill()

    ctx.globalAlpha = 1
    ctx.shadowBlur = SOUND_BALL.glowRadius
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#ffffff'
    ctx.globalAlpha = 0.6
    ctx.beginPath()
    ctx.arc(ball.x - ball.radius * 0.3, ball.y - ball.radius * 0.3, ball.radius * 0.25, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }, [])

  const drawTrailParticles = useCallback((ctx: CanvasRenderingContext2D, particles: TrailParticle[]) => {
    for (const p of particles) {
      ctx.save()
      ctx.globalAlpha = p.alpha
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }, [])

  const drawShockwaves = useCallback((ctx: CanvasRenderingContext2D, waves: Shockwave[]) => {
    for (const s of waves) {
      ctx.save()
      ctx.globalAlpha = s.alpha
      ctx.strokeStyle = s.color
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }
  }, [])

  const drawObstacle = useCallback((ctx: CanvasRenderingContext2D, o: Obstacle) => {
    ctx.save()
    ctx.translate(o.x + o.width / 2, o.y + o.height / 2)
    ctx.rotate(o.rotation)
    const grad = ctx.createLinearGradient(-o.width / 2, -o.height / 2, o.width / 2, o.height / 2)
    grad.addColorStop(0, COLORS.reefDark)
    grad.addColorStop(1, COLORS.reefLight)
    ctx.fillStyle = grad
    ctx.beginPath()
    const w = o.width / 2
    const h = o.height / 2
    ctx.moveTo(-w, -h * 0.3)
    ctx.lineTo(-w * 0.5, -h)
    ctx.lineTo(w * 0.4, -h * 0.8)
    ctx.lineTo(w, -h * 0.1)
    ctx.lineTo(w * 0.6, h)
    ctx.lineTo(-w * 0.3, h * 0.9)
    ctx.lineTo(-w * 0.8, h * 0.4)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }, [])

  const drawFishSchool = useCallback((ctx: CanvasRenderingContext2D, f: FishSchool) => {
    ctx.save()
    ctx.fillStyle = COLORS.fish
    for (let i = 0; i < f.fishCount; i++) {
      const row = Math.floor(i / 3)
      const col = i % 3
      const ox = (col - 1) * 16
      const oy = (row - 1) * 14
      const fx = f.x + ox
      const fy = f.y + oy
      ctx.beginPath()
      ctx.ellipse(fx, fy, FISH.fishWidth / 2, FISH.fishHeight / 2, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(fx - FISH.fishWidth / 2, fy)
      ctx.lineTo(fx - FISH.fishWidth / 2 - 5, fy - 4)
      ctx.lineTo(fx - FISH.fishWidth / 2 - 5, fy + 4)
      ctx.closePath()
      ctx.fill()
    }
    ctx.restore()
  }, [])

  const drawUI = useCallback((ctx: CanvasRenderingContext2D, state: GameState) => {
    for (let i = 0; i < INITIAL_LIVES; i++) {
      const x = 20 + i * 22
      const y = 25
      const active = i < state.lives
      ctx.save()
      if (active) {
        ctx.shadowColor = COLORS.heart
        ctx.shadowBlur = 8
        ctx.fillStyle = COLORS.heart
        ctx.beginPath()
        ctx.arc(x, y, 8, 0, Math.PI * 2)
        ctx.fill()
      } else {
        ctx.strokeStyle = COLORS.heart
        ctx.globalAlpha = 0.4
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(x, y, 5, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.restore()
    }

    let yOffset = 60
    state.trackLayers.forEach((tl) => {
      if (tl.layer > 0 || tl.fadeTimer > 0) {
        const alpha = tl.fadeTimer > 0 ? tl.fadeTimer / TRACK.fadeDuration : 1
        const color = NOTE_COLORS[tl.color]
        ctx.save()
        ctx.globalAlpha = 0.4 * alpha
        ctx.fillStyle = color
        const x = CANVAS_W - tl.currentWidth - 15
        ctx.fillRect(x, yOffset, tl.currentWidth, TRACK.barHeight)
        ctx.globalAlpha = alpha
        ctx.fillStyle = COLORS.ui
        ctx.font = 'bold 12px sans-serif'
        ctx.textAlign = 'right'
        ctx.fillText(`×${tl.layer}`, CANVAS_W - 20, yOffset + TRACK.barHeight / 2 + 4)
        ctx.restore()
        yOffset += TRACK.barHeight + 4
      }
    })
  }, [])

  const drawStaff = useCallback((ctx: CanvasRenderingContext2D, notes: CollectedNote[]) => {
    const staffY = CANVAS_H / 2 - 80
    const staffX = 30
    const staffW = CANVAS_W - 60
    const lineGap = 10

    ctx.save()
    ctx.strokeStyle = COLORS.staff
    ctx.lineWidth = 1
    for (let i = 0; i < 5; i++) {
      ctx.beginPath()
      ctx.moveTo(staffX, staffY + i * lineGap)
      ctx.lineTo(staffX + staffW, staffY + i * lineGap)
      ctx.stroke()
    }

    const noteCount = notes.length
    const padding = 15
    const usableW = staffW - padding * 2
    const step = noteCount > 1 ? usableW / (noteCount - 1) : 0

    notes.forEach((note, i) => {
      const nx = staffX + padding + step * i
      const ny = staffY + (4 - (note.layer % 5)) * lineGap
      const size = 12 + (note.layer - 1) * ((20 - 12) / TRACK.maxLayers)
      const color = NOTE_COLORS[note.color]
      ctx.fillStyle = color
      ctx.shadowColor = color
      ctx.shadowBlur = 8
      ctx.beginPath()
      ctx.arc(nx, ny, size / 2, 0, Math.PI * 2)
      ctx.fill()
    })
    ctx.restore()
  }, [])

  const render = useCallback((ctx: CanvasRenderingContext2D, state: GameState) => {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)
    drawBackground(ctx, state)

    for (const j of state.jellyfish) drawJellyfish(ctx, j)
    drawTrailParticles(ctx, state.trailParticles)
    for (const o of state.obstacles) drawObstacle(ctx, o)
    for (const f of state.fishSchools) drawFishSchool(ctx, f)
    for (const ball of state.soundBalls) drawSoundBall(ctx, ball)
    drawSubmarine(ctx, state.submarine)
    drawShockwaves(ctx, state.shockwaves)
    drawUI(ctx, state)

    if (state.status === 'gameover' && gameOverInfo) {
      ctx.fillStyle = 'rgba(11, 0, 21, 0.85)'
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
      drawStaff(ctx, gameOverInfo.notes)

      ctx.save()
      ctx.fillStyle = COLORS.ui
      ctx.font = 'bold 18px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('旋律总谱', CANVAS_W / 2, CANVAS_H / 2 - 110)
      ctx.font = 'bold 22px sans-serif'
      ctx.fillStyle = COLORS.windowGlow
      ctx.shadowColor = COLORS.windowGlow
      ctx.shadowBlur = 10
      ctx.fillText(`得分：${gameOverInfo.score}`, CANVAS_W / 2, CANVAS_H / 2 + 40)
      ctx.restore()
    }
  }, [drawBackground, drawJellyfish, drawTrailParticles, drawObstacle, drawFishSchool, drawSoundBall, drawSubmarine, drawShockwaves, drawUI, gameOverInfo, drawStaff])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const loop = (t: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = t
      const dt = Math.min(50, t - lastTimeRef.current)
      lastTimeRef.current = t
      update(dt, stateRef.current)
      render(ctx, stateRef.current)
      animFrameRef.current = requestAnimationFrame(loop)
    }
    animFrameRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [update, render])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key)
      ensureAudio()
    }
    const onKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.key)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [ensureAudio])

  const handleCanvasMove = useCallback((clientX: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scale = CANVAS_W / rect.width
    mouseXRef.current = (clientX - rect.left) * scale
  }, [])

  const handleCanvasLeave = useCallback(() => {
    mouseXRef.current = null
  }, [])

  const handleCanvasClick = useCallback(() => {
    ensureAudio()
  }, [ensureAudio])

  const handleRestart = useCallback(() => {
    stateRef.current = createInitialState()
    lastTrailSpawnRef.current.clear()
    setGameOverInfo(null)
    forceUpdate((n) => n + 1)
  }, [])

  useEffect(() => {
    const updateSize = () => {
      const container = containerRef.current
      if (!container) return
      const w = Math.min(window.innerWidth, MAX_CANVAS_WIDTH)
      const h = w / CANVAS_RATIO
      if (container) {
        container.style.width = `${w}px`
        container.style.height = `${h}px`
      }
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        maxWidth: `${MAX_CANVAS_WIDTH}px`,
        width: '100%',
        aspectRatio: `${CANVAS_RATIO}`,
        touchAction: 'none',
      }}
    >
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        style={{ width: '100%', height: '100%', display: 'block', borderRadius: '8px', boxShadow: '0 0 40px rgba(0,212,255,0.2)' }}
        onMouseMove={(e) => handleCanvasMove(e.clientX)}
        onMouseLeave={handleCanvasLeave}
        onTouchMove={(e) => { e.preventDefault(); handleCanvasMove(e.touches[0].clientX) }}
        onTouchEnd={handleCanvasLeave}
        onClick={handleCanvasClick}
      />
      {gameOverInfo && (
        <button
          onClick={handleRestart}
          style={{
            position: 'absolute',
            left: '50%',
            bottom: '60px',
            transform: 'translateX(-50%)',
            padding: '14px 36px',
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#fff',
            background: 'linear-gradient(135deg, #1e90ff, #00d4ff)',
            border: 'none',
            borderRadius: '30px',
            cursor: 'pointer',
            boxShadow: '0 0 20px rgba(0,212,255,0.6)',
            letterSpacing: '2px',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 0 35px rgba(0,212,255,0.9)'
            e.currentTarget.style.transform = 'translateX(-50%) scale(1.05)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 0 20px rgba(0,212,255,0.6)'
            e.currentTarget.style.transform = 'translateX(-50%) scale(1)'
          }}
        >
          再潜一次
        </button>
      )}
    </div>
  )
}
