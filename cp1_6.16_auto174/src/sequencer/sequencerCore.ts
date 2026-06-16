import { v4 as uuidv4 } from 'uuid'

export interface NoteEvent {
  id: string
  trackId: string
  startTime: number
  duration: number
  pitch: number
  velocity: number
}

export interface Track {
  id: string
  name: string
  color: string
  notes: NoteEvent[]
  visible: boolean
}

export interface SequencerState {
  tracks: Track[]
  bpm: number
  isPlaying: boolean
  isLooping: boolean
  currentTime: number
  loopStart: number
  loopEnd: number
  selectedNoteId: string | null
  selectedTrackId: string | null
}

const TRACK_COLORS = ['#4A90D9', '#FF6B6B', '#00FF88', '#FFD700']
const DEFAULT_TRACK_NAMES = ['Melody', 'Bass', 'Chords', 'Drums']

const STORAGE_KEY = 'music_sequencer_state'
const AUTO_SAVE_INTERVAL = 3000

export class SequencerCore {
  private state: SequencerState
  private listeners: Set<() => void> = new Set()
  private autoSaveTimer: number | null = null
  private playTimer: number | null = null
  private playStartTime: number = 0
  private scheduledNotes: Set<string> = new Set()
  private onNoteTrigger: ((note: NoteEvent, type: 'start' | 'stop') => void) | null = null

  constructor() {
    this.state = this.loadFromStorage() || {
      tracks: [
        { id: uuidv4(), name: 'Melody', color: '#4A90D9', notes: [], visible: true },
      ],
      bpm: 120,
      isPlaying: false,
      isLooping: false,
      currentTime: 0,
      loopStart: 0,
      loopEnd: 16,
      selectedNoteId: null,
      selectedTrackId: null,
    }
    this.startAutoSave()
  }

  private loadFromStorage(): SequencerState | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (e) {
      console.error('Failed to load from localStorage:', e)
    }
    return null
  }

  private saveToStorage(): void {
    try {
      const stateToSave = {
        ...this.state,
        isPlaying: false,
        currentTime: 0,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave))
    } catch (e) {
      console.error('Failed to save to localStorage:', e)
    }
  }

  private startAutoSave(): void {
    this.stopAutoSave()
    this.autoSaveTimer = window.setInterval(() => {
      this.saveToStorage()
    }, AUTO_SAVE_INTERVAL)
  }

  private stopAutoSave(): void {
    if (this.autoSaveTimer !== null) {
      clearInterval(this.autoSaveTimer)
      this.autoSaveTimer = null
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify(): void {
    this.listeners.forEach(listener => listener())
  }

  public getState(): SequencerState {
    return { ...this.state }
  }

  public setNoteTriggerCallback(callback: (note: NoteEvent, type: 'start' | 'stop') => void): void {
    this.onNoteTrigger = callback
  }

  public addTrack(): void {
    if (this.state.tracks.length >= 4) return

    const trackIndex = this.state.tracks.length
    const newTrack: Track = {
      id: uuidv4(),
      name: DEFAULT_TRACK_NAMES[trackIndex] || `Track ${trackIndex + 1}`,
      color: TRACK_COLORS[trackIndex] || '#888888',
      notes: [],
      visible: true,
    }

    this.state.tracks.push(newTrack)
    this.state.selectedTrackId = newTrack.id
    this.notify()
  }

  public removeTrack(trackId: string): void {
    const index = this.state.tracks.findIndex(t => t.id === trackId)
    if (index === -1 || this.state.tracks.length <= 1) return

    this.state.tracks.splice(index, 1)
    if (this.state.selectedTrackId === trackId) {
      this.state.selectedTrackId = this.state.tracks[0]?.id || null
    }
    if (this.state.selectedNoteId) {
      const note = this.getNoteById(this.state.selectedNoteId)
      if (!note || note.trackId === trackId) {
        this.state.selectedNoteId = null
      }
    }
    this.notify()
  }

  public updateTrack(trackId: string, updates: Partial<Track>): void {
    const track = this.state.tracks.find(t => t.id === trackId)
    if (!track) return

    Object.assign(track, updates)
    this.notify()
  }

  public selectTrack(trackId: string | null): void {
    this.state.selectedTrackId = trackId
    this.notify()
  }

  public addNote(
    trackId: string,
    startTime: number,
    duration: number,
    pitch: number,
    velocity: number = 0.8
  ): NoteEvent {
    const track = this.state.tracks.find(t => t.id === trackId)
    if (!track) throw new Error('Track not found')

    const note: NoteEvent = {
      id: uuidv4(),
      trackId,
      startTime: Math.round(startTime / 0.125) * 0.125,
      duration: Math.max(0.25, Math.min(4, Math.round(duration / 0.125) * 0.125)),
      pitch: Math.round(pitch),
      velocity: Math.max(0, Math.min(1, velocity)),
    }

    track.notes.push(note)
    track.notes.sort((a, b) => a.startTime - b.startTime)
    this.state.selectedNoteId = note.id
    this.state.selectedTrackId = trackId
    this.notify()

    return note
  }

  public deleteNote(noteId: string): void {
    for (const track of this.state.tracks) {
      const index = track.notes.findIndex(n => n.id === noteId)
      if (index !== -1) {
        const note = track.notes[index]
        track.notes.splice(index, 1)
        if (this.state.selectedNoteId === noteId) {
          this.state.selectedNoteId = null
        }
        if (this.onNoteTrigger) {
          this.onNoteTrigger(note, 'stop')
        }
        this.notify()
        return
      }
    }
  }

  public moveNote(noteId: string, deltaTime: number, deltaPitch: number): void {
    const note = this.getNoteById(noteId)
    if (!note) return

    note.startTime = Math.max(0, Math.round((note.startTime + deltaTime) / 0.125) * 0.125)
    note.pitch = Math.max(0, Math.min(87, Math.round(note.pitch + deltaPitch)))
    this.notify()
  }

  public resizeNote(noteId: string, deltaDuration: number, fromStart: boolean = false): void {
    const note = this.getNoteById(noteId)
    if (!note) return

    if (fromStart) {
      const newDuration = note.duration - deltaDuration
      const newStartTime = note.startTime + deltaDuration
      if (newDuration >= 0.25 && newStartTime >= 0) {
        note.duration = Math.min(4, Math.round(newDuration / 0.125) * 0.125)
        note.startTime = Math.round(newStartTime / 0.125) * 0.125
      }
    } else {
      note.duration = Math.max(0.25, Math.min(4, Math.round((note.duration + deltaDuration) / 0.125) * 0.125))
    }
    this.notify()
  }

  public selectNote(noteId: string | null): void {
    this.state.selectedNoteId = noteId
    if (noteId) {
      const note = this.getNoteById(noteId)
      if (note) {
        this.state.selectedTrackId = note.trackId
      }
    }
    this.notify()
  }

  public getNoteById(noteId: string): NoteEvent | null {
    for (const track of this.state.tracks) {
      const note = track.notes.find(n => n.id === noteId)
      if (note) return note
    }
    return null
  }

  public getNotesAtTime(time: number, trackId?: string): NoteEvent[] {
    const tracks = trackId ? this.state.tracks.filter(t => t.id === trackId) : this.state.tracks
    const notes: NoteEvent[] = []

    for (const track of tracks) {
      for (const note of track.notes) {
        if (note.startTime <= time && note.startTime + note.duration > time) {
          notes.push(note)
        }
      }
    }

    return notes
  }

  public setBPM(bpm: number): void {
    this.state.bpm = Math.max(60, Math.min(200, bpm))
    this.notify()
  }

  public setLooping(enabled: boolean, loopStart?: number, loopEnd?: number): void {
    this.state.isLooping = enabled
    if (loopStart !== undefined) this.state.loopStart = loopStart
    if (loopEnd !== undefined) this.state.loopEnd = loopEnd
    this.notify()
  }

  public setCurrentTime(time: number): void {
    this.state.currentTime = Math.max(0, time)
    this.notify()
  }

  public play(): void {
    if (this.state.isPlaying) return

    this.state.isPlaying = true
    this.playStartTime = performance.now() - this.state.currentTime * 1000
    this.scheduledNotes.clear()
    this.notify()

    const tick = () => {
      if (!this.state.isPlaying) return

      const elapsed = (performance.now() - this.playStartTime) / 1000
      const beatTime = elapsed * (this.state.bpm / 60)

      if (this.state.isLooping && beatTime >= this.state.loopEnd) {
        this.playStartTime = performance.now() - this.state.loopStart * 1000
        this.scheduledNotes.clear()
        this.state.currentTime = this.state.loopStart
      } else {
        this.state.currentTime = beatTime
      }

      const currentTime = this.state.currentTime
      const allNotes = this.state.tracks.flatMap(t => t.notes)

      for (const note of allNotes) {
        const noteEnd = note.startTime + note.duration

        if (!this.scheduledNotes.has(note.id) && note.startTime <= currentTime && noteEnd > currentTime) {
          this.scheduledNotes.add(note.id)
          if (this.onNoteTrigger) {
            this.onNoteTrigger(note, 'start')
          }
        }

        if (this.scheduledNotes.has(note.id) && noteEnd <= currentTime) {
          this.scheduledNotes.delete(note.id)
          if (this.onNoteTrigger) {
            this.onNoteTrigger(note, 'stop')
          }
        }
      }

      this.notify()
      this.playTimer = requestAnimationFrame(tick)
    }

    this.playTimer = requestAnimationFrame(tick)
  }

  public pause(): void {
    this.state.isPlaying = false
    if (this.playTimer !== null) {
      cancelAnimationFrame(this.playTimer)
      this.playTimer = null
    }
    this.scheduledNotes.clear()
    this.notify()
  }

  public stop(): void {
    this.state.isPlaying = false
    this.state.currentTime = 0
    if (this.playTimer !== null) {
      cancelAnimationFrame(this.playTimer)
      this.playTimer = null
    }
    this.scheduledNotes.clear()
    this.notify()
  }

  public exportToJSON(): string {
    const exportData = {
      version: '1.0',
      bpm: this.state.bpm,
      loop: {
        enabled: this.state.isLooping,
        start: this.state.loopStart,
        end: this.state.loopEnd,
      },
      tracks: this.state.tracks.map(track => ({
        id: track.id,
        name: track.name,
        color: track.color,
        notes: track.notes.map(note => ({
          id: note.id,
          startTime: note.startTime,
          duration: note.duration,
          pitch: note.pitch,
          velocity: note.velocity,
        })),
      })),
      exportedAt: new Date().toISOString(),
    }

    return JSON.stringify(exportData, null, 2)
  }

  public downloadJSON(): void {
    const json = this.exportToJSON()
    const timestamp = new Date().getTime()
    const filename = `sequence_${timestamp}.json`
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  public dispose(): void {
    this.stop()
    this.stopAutoSave()
    this.saveToStorage()
    this.listeners.clear()
  }
}

export const sequencerCore = new SequencerCore()
