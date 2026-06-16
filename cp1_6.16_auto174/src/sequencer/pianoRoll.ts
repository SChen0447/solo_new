import { SequencerCore, NoteEvent } from './sequencerCore'
import { audioEngine } from '../audioEngine/audioEngine'

export interface PianoRollOptions {
  pixelsPerBeat: number
  noteHeight: number
  gridColor: string
  backgroundColor: string
  whiteKeyColor: string
  blackKeyColor: string
  lowColor: string
  highColor: string
  selectedColor: string
  playheadColor: string
}

const DEFAULT_OPTIONS: PianoRollOptions = {
  pixelsPerBeat: 60,
  noteHeight: 16,
  gridColor: '#2A2A4A',
  backgroundColor: '#1A1A2E',
  whiteKeyColor: '#3A3A3A',
  blackKeyColor: '#2A2A2A',
  lowColor: '#4A90D9',
  highColor: '#FF6B6B',
  selectedColor: '#FFFFFF',
  playheadColor: '#FF0000',
}

const BLACK_KEYS = [1, 3, 6, 8, 10]
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export class PianoRoll {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private sequencer: SequencerCore
  private options: PianoRollOptions
  private width: number = 0
  private height: number = 0
  private totalNotes: number = 88
  private visibleBeats: number = 16
  private scrollX: number = 0
  private scrollY: number = 0
  private isDragging: boolean = false
  private dragType: 'move' | 'resize-left' | 'resize-right' | null = null
  private draggedNoteId: string | null = null
  private dragStartX: number = 0
  private dragStartY: number = 0
  private dragStartPitch: number = 0
  private illuminatedNotes: Map<string, number> = new Map()
  private animationFrameId: number | null = null
  private onNotePlayed: ((noteId: string, trackId: string, pitch: number, velocity: number, duration?: number) => void) | null = null
  private onNoteStopped: ((noteId: string) => void) | null = null
  private selectedTrackId: string | null = null

  constructor(
    canvas: HTMLCanvasElement,
    sequencer: SequencerCore,
    options?: Partial<PianoRollOptions>
  ) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get 2D context')
    this.ctx = ctx
    this.sequencer = sequencer
    this.options = { ...DEFAULT_OPTIONS, ...options }

    this.resize()
    this.setupEventListeners()
    this.sequencer.subscribe(() => this.render())
  }

  public setOnNotePlayed(callback: (noteId: string, trackId: string, pitch: number, velocity: number, duration?: number) => void): void {
    this.onNotePlayed = callback
  }

  public setOnNoteStopped(callback: (noteId: string) => void): void {
    this.onNoteStopped = callback
  }

  public setSelectedTrack(trackId: string | null): void {
    this.selectedTrackId = trackId
    this.render()
  }

  public resize(): void {
    const dpr = window.devicePixelRatio || 1
    const rect = this.canvas.getBoundingClientRect()
    this.width = rect.width
    this.height = rect.height
    this.canvas.width = rect.width * dpr
    this.canvas.height = rect.height * dpr
    this.ctx.scale(dpr, dpr)
    this.visibleBeats = Math.ceil(this.width / this.options.pixelsPerBeat) + 4
    this.render()
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown)
    this.canvas.addEventListener('mousemove', this.handleMouseMove)
    this.canvas.addEventListener('mouseup', this.handleMouseUp)
    this.canvas.addEventListener('mouseleave', this.handleMouseUp)
    this.canvas.addEventListener('wheel', this.handleWheel, { passive: false })

    this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false })
    this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false })
    this.canvas.addEventListener('touchend', this.handleTouchEnd)

    window.addEventListener('keydown', this.handleKeyDown)
    window.addEventListener('resize', this.resize)
  }

  private getMousePosition(e: MouseEvent | Touch): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left + this.scrollX,
      y: e.clientY - rect.top + this.scrollY,
    }
  }

  private getNoteAtPosition(x: number, y: number): { note: NoteEvent; hitEdge: 'left' | 'right' | 'none' } | null {
    const state = this.sequencer.getState()
    const edgeMargin = 6

    for (const track of state.tracks) {
      if (!track.visible) continue

      for (const note of track.notes) {
        const noteX = note.startTime * this.options.pixelsPerBeat
        const noteY = (this.totalNotes - 1 - note.pitch) * this.options.noteHeight
        const noteWidth = note.duration * this.options.pixelsPerBeat
        const noteHeight = this.options.noteHeight

        if (x >= noteX && x <= noteX + noteWidth && y >= noteY && y <= noteY + noteHeight) {
          let hitEdge: 'left' | 'right' | 'none' = 'none'
          if (x <= noteX + edgeMargin) hitEdge = 'left'
          else if (x >= noteX + noteWidth - edgeMargin) hitEdge = 'right'
          return { note, hitEdge }
        }
      }
    }

    return null
  }

  private handleMouseDown = (e: MouseEvent): void => {
    const { x, y } = this.getMousePosition(e)
    const hit = this.getNoteAtPosition(x, y)

    if (hit) {
      this.sequencer.selectNote(hit.note.id)

      if (hit.hitEdge === 'left') {
        this.dragType = 'resize-left'
      } else if (hit.hitEdge === 'right') {
        this.dragType = 'resize-right'
      } else {
        this.dragType = 'move'
        this.dragStartPitch = hit.note.pitch
      }

      this.draggedNoteId = hit.note.id
      this.dragStartX = x
      this.dragStartY = y
      this.isDragging = true
      this.canvas.style.cursor = hit.hitEdge === 'none' ? 'move' : 'ew-resize'
    } else {
      const state = this.sequencer.getState()
      const trackId = this.selectedTrackId || state.selectedTrackId || state.tracks[0]?.id

      if (trackId) {
        const startTime = Math.floor(x / this.options.pixelsPerBeat / 0.125) * 0.125
        const pitch = Math.max(0, Math.min(this.totalNotes - 1, this.totalNotes - 1 - Math.floor(y / this.options.noteHeight)))
        const duration = 0.5
        const velocity = 0.8

        const note = this.sequencer.addNote(trackId, startTime, duration, pitch, velocity)

        if (this.onNotePlayed) {
          this.onNotePlayed(note.id, note.trackId, note.pitch, note.velocity, note.duration)
        } else {
          audioEngine.playNote(note.id, note.trackId, note.pitch, note.velocity, undefined, note.duration)
        }
      }
    }
  }

  private handleMouseMove = (e: MouseEvent): void => {
    const { x, y } = this.getMousePosition(e)

    if (!this.isDragging && !this.sequencer.getState().isPlaying) {
      const hit = this.getNoteAtPosition(x, y)
      if (hit) {
        this.canvas.style.cursor = hit.hitEdge === 'none' ? 'move' : 'ew-resize'
      } else {
        this.canvas.style.cursor = 'crosshair'
      }
    }

    if (this.isDragging && this.draggedNoteId) {
      const deltaX = x - this.dragStartX
      const deltaY = y - this.dragStartY
      const deltaTime = deltaX / this.options.pixelsPerBeat
      const deltaPitch = -Math.round(deltaY / this.options.noteHeight)

      if (this.dragType === 'move') {
        this.sequencer.moveNote(this.draggedNoteId, deltaTime, deltaPitch)

        const note = this.sequencer.getNoteById(this.draggedNoteId)
        if (note && note.pitch !== this.dragStartPitch) {
          if (this.onNoteStopped) {
            this.onNoteStopped(this.draggedNoteId)
          } else {
            audioEngine.stopNote(this.draggedNoteId)
          }
          if (this.onNotePlayed) {
            this.onNotePlayed(note.id, note.trackId, note.pitch, note.velocity, note.duration)
          } else {
            audioEngine.playNote(note.id, note.trackId, note.pitch, note.velocity, undefined, note.duration)
          }
          this.dragStartPitch = note.pitch
        }
      } else if (this.dragType === 'resize-left') {
        this.sequencer.resizeNote(this.draggedNoteId, deltaTime, true)
      } else if (this.dragType === 'resize-right') {
        this.sequencer.resizeNote(this.draggedNoteId, deltaTime, false)
      }

      this.dragStartX = x
      this.dragStartY = y
    }
  }

  private handleMouseUp = (): void => {
    if (this.isDragging && this.draggedNoteId) {
      const note = this.sequencer.getNoteById(this.draggedNoteId)
      if (note) {
        if (this.onNoteStopped) {
          this.onNoteStopped(this.draggedNoteId)
        } else {
          audioEngine.stopNote(this.draggedNoteId)
        }
      }
    }

    this.isDragging = false
    this.dragType = null
    this.draggedNoteId = null
    this.canvas.style.cursor = 'crosshair'
  }

  private handleWheel = (e: WheelEvent): void => {
    e.preventDefault()

    if (e.ctrlKey || e.metaKey) {
      const scale = e.deltaY > 0 ? 0.9 : 1.1
      this.options.pixelsPerBeat = Math.max(20, Math.min(200, this.options.pixelsPerBeat * scale))
    } else {
      this.scrollX += e.deltaX
      this.scrollY += e.deltaY
      this.scrollX = Math.max(0, this.scrollX)
      this.scrollY = Math.max(0, Math.min(this.totalNotes * this.options.noteHeight - this.height, this.scrollY))
    }

    this.render()
  }

  private handleTouchStart = (e: TouchEvent): void => {
    if (e.touches.length === 1) {
      e.preventDefault()
      const touch = e.touches[0]
      this.handleMouseDown({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent)
    }
  }

  private handleTouchMove = (e: TouchEvent): void => {
    if (e.touches.length === 1) {
      e.preventDefault()
      const touch = e.touches[0]
      this.handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent)
    } else if (e.touches.length === 2) {
      e.preventDefault()
    }
  }

  private handleTouchEnd = (): void => {
    this.handleMouseUp()
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    const state = this.sequencer.getState()
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (state.selectedNoteId) {
        this.sequencer.deleteNote(state.selectedNoteId)
      }
    }
  }

  public illuminateNote(noteId: string): void {
    this.illuminatedNotes.set(noteId, performance.now())
  }

  private getNoteColor(pitch: number, isSelected: boolean, isIlluminated: boolean): string {
    if (isIlluminated) return '#FFFFFF'
    if (isSelected) return this.options.selectedColor

    const ratio = pitch / (this.totalNotes - 1)
    const lowR = parseInt(this.options.lowColor.slice(1, 3), 16)
    const lowG = parseInt(this.options.lowColor.slice(3, 5), 16)
    const lowB = parseInt(this.options.lowColor.slice(5, 7), 16)
    const highR = parseInt(this.options.highColor.slice(1, 3), 16)
    const highG = parseInt(this.options.highColor.slice(3, 5), 16)
    const highB = parseInt(this.options.highColor.slice(5, 7), 16)

    const r = Math.round(lowR + (highR - lowR) * ratio)
    const g = Math.round(lowG + (highG - lowG) * ratio)
    const b = Math.round(lowB + (highB - lowB) * ratio)

    return `rgb(${r}, ${g}, ${b})`
  }

  private isBlackKey(pitch: number): boolean {
    return BLACK_KEYS.includes(pitch % 12)
  }

  private render(): void {
    const state = this.sequencer.getState()
    const ctx = this.ctx

    ctx.fillStyle = this.options.backgroundColor
    ctx.fillRect(0, 0, this.width, this.height)

    ctx.save()
    ctx.translate(-this.scrollX, -this.scrollY)

    const totalHeight = this.totalNotes * this.options.noteHeight
    const totalWidth = this.visibleBeats * this.options.pixelsPerBeat

    for (let i = 0; i < this.totalNotes; i++) {
      const pitch = this.totalNotes - 1 - i
      const y = i * this.options.noteHeight
      const isBlack = this.isBlackKey(pitch)

      ctx.fillStyle = isBlack ? this.options.blackKeyColor : this.options.whiteKeyColor
      ctx.fillRect(0, y, 60, this.options.noteHeight)

      ctx.strokeStyle = this.options.gridColor
      ctx.lineWidth = 0.5
      ctx.strokeRect(0, y, 60, this.options.noteHeight)

      if (!isBlack) {
        const octave = Math.floor(pitch / 12) - 1
        const noteName = NOTE_NAMES[pitch % 12]
        if (noteName === 'C') {
          ctx.fillStyle = '#888'
          ctx.font = '10px sans-serif'
          ctx.fillText(`${noteName}${octave}`, 4, y + this.options.noteHeight - 4)
        }
      }
    }

    ctx.fillStyle = this.options.backgroundColor
    ctx.fillRect(60, 0, totalWidth, totalHeight)

    for (let beat = 0; beat <= this.visibleBeats; beat++) {
      const x = 60 + beat * this.options.pixelsPerBeat
      ctx.strokeStyle = beat % 4 === 0 ? '#3A3A5A' : this.options.gridColor
      ctx.lineWidth = beat % 4 === 0 ? 1 : 0.5
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, totalHeight)
      ctx.stroke()
    }

    for (let i = 0; i < this.totalNotes; i++) {
      const y = i * this.options.noteHeight
      const pitch = this.totalNotes - 1 - i
      const isBlack = this.isBlackKey(pitch)

      ctx.strokeStyle = this.options.gridColor
      ctx.lineWidth = isBlack ? 0.5 : 0.25
      ctx.beginPath()
      ctx.moveTo(60, y)
      ctx.lineTo(60 + totalWidth, y)
      ctx.stroke()

      if (isBlack) {
        ctx.fillStyle = 'rgba(42, 42, 42, 0.3)'
        ctx.fillRect(60, y, totalWidth, this.options.noteHeight)
      }
    }

    const now = performance.now()
    for (const track of state.tracks) {
      if (!track.visible) continue

      for (const note of track.notes) {
        const noteX = 60 + note.startTime * this.options.pixelsPerBeat
        const noteY = (this.totalNotes - 1 - note.pitch) * this.options.noteHeight
        const noteWidth = Math.max(4, note.duration * this.options.pixelsPerBeat)
        const noteHeight = this.options.noteHeight - 1

        const isSelected = note.id === state.selectedNoteId
        const illuminatedAt = this.illuminatedNotes.get(note.id)
        const isIlluminated = illuminatedAt !== undefined && now - illuminatedAt < 100

        if (!isIlluminated && illuminatedAt !== undefined && now - illuminatedAt >= 100) {
          this.illuminatedNotes.delete(note.id)
        }

        const color = this.getNoteColor(note.pitch, isSelected, isIlluminated)

        ctx.fillStyle = color
        ctx.beginPath()
        ctx.roundRect(noteX, noteY, noteWidth, noteHeight, 3)
        ctx.fill()

        if (isSelected) {
          ctx.strokeStyle = '#FFFFFF'
          ctx.lineWidth = 2
          ctx.stroke()

          ctx.shadowColor = 'rgba(255, 255, 255, 0.5)'
          ctx.shadowBlur = 8
          ctx.stroke()
          ctx.shadowBlur = 0
        }

        ctx.fillStyle = isIlluminated ? '#000' : 'rgba(255, 255, 255, 0.7)'
        ctx.font = 'bold 9px sans-serif'
        const noteName = NOTE_NAMES[note.pitch % 12]
        const octave = Math.floor(note.pitch / 12) - 1
        ctx.fillText(`${noteName}${octave}`, noteX + 4, noteY + noteHeight - 4)

        const velocityWidth = (noteWidth - 8) * note.velocity
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
        ctx.fillRect(noteX + 4, noteY + 2, velocityWidth, 2)
      }
    }

    if (state.isPlaying || state.currentTime > 0) {
      const playheadX = 60 + state.currentTime * this.options.pixelsPerBeat
      ctx.strokeStyle = this.options.playheadColor
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(playheadX, 0)
      ctx.lineTo(playheadX, totalHeight)
      ctx.stroke()

      ctx.fillStyle = this.options.playheadColor
      ctx.beginPath()
      ctx.moveTo(playheadX - 6, 0)
      ctx.lineTo(playheadX + 6, 0)
      ctx.lineTo(playheadX, 8)
      ctx.closePath()
      ctx.fill()
    }

    ctx.restore()
  }

  public start(): void {
    const animate = () => {
      this.render()
      this.animationFrameId = requestAnimationFrame(animate)
    }
    this.animationFrameId = requestAnimationFrame(animate)
  }

  public stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  public dispose(): void {
    this.stop()
    this.canvas.removeEventListener('mousedown', this.handleMouseDown)
    this.canvas.removeEventListener('mousemove', this.handleMouseMove)
    this.canvas.removeEventListener('mouseup', this.handleMouseUp)
    this.canvas.removeEventListener('mouseleave', this.handleMouseUp)
    this.canvas.removeEventListener('wheel', this.handleWheel)
    this.canvas.removeEventListener('touchstart', this.handleTouchStart)
    this.canvas.removeEventListener('touchmove', this.handleTouchMove)
    this.canvas.removeEventListener('touchend', this.handleTouchEnd)
    window.removeEventListener('keydown', this.handleKeyDown)
    window.removeEventListener('resize', this.resize)
  }
}
