export type InstrumentType = 'keyboard' | 'guitar' | 'drums' | 'bass'

export interface NoteEvent {
  instrument: InstrumentType
  note: string
  frequency: number
  velocity: number
  startTime: number
  duration?: number
}

export interface Recording {
  id: string
  name: string
  date: Date
  duration: number
  events: NoteEvent[]
}

interface ActiveNote {
  oscillator: OscillatorNode
  gainNode: GainNode
  instrument: InstrumentType
  note: string
}

class AudioEngine {
  private audioContext: AudioContext | null = null
  private masterGain: GainNode | null = null
  private analyser: AnalyserNode | null = null
  private activeNotes: Map<string, ActiveNote> = new Map()
  private instrumentGains: Map<InstrumentType, GainNode> = new Map()
  private isRecording = false
  private recordingStartTime = 0
  private recordedEvents: NoteEvent[] = []
  private recordings: Recording[] = []
  private playbackSource: AudioBufferSourceNode | null = null
  private scheduledNotes: { stop: () => void }[] = []

  constructor() {
    this.initContext()
  }

  private initContext() {
    if (typeof window !== 'undefined' && window.AudioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      this.masterGain = this.audioContext.createGain()
      this.masterGain.gain.value = 0.5
      this.masterGain.connect(this.audioContext.destination)

      this.analyser = this.audioContext.createAnalyser()
      this.analyser.fftSize = 2048
      this.masterGain.connect(this.analyser)

      const instruments: InstrumentType[] = ['keyboard', 'guitar', 'drums', 'bass']
      instruments.forEach(inst => {
        const gain = this.audioContext!.createGain()
        gain.gain.value = inst === 'drums' ? 0.7 : 0.5
        gain.connect(this.masterGain!)
        this.instrumentGains.set(inst, gain)
      })
    }
  }

  resume() {
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume()
    }
  }

  getContext(): AudioContext | null {
    return this.audioContext
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyser
  }

  getMasterVolume(): number {
    return this.masterGain?.gain.value ?? 0.5
  }

  setMasterVolume(value: number) {
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(value, this.audioContext!.currentTime, 0.05)
    }
  }

  getInstrumentVolume(instrument: InstrumentType): number {
    return this.instrumentGains.get(instrument)?.gain.value ?? 0.5
  }

  setInstrumentVolume(instrument: InstrumentType, value: number) {
    const gain = this.instrumentGains.get(instrument)
    if (gain && this.audioContext) {
      gain.gain.setTargetAtTime(value, this.audioContext.currentTime, 0.05)
    }
  }

  private getNoteFrequency(note: string, octave: number = 4): number {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    const noteIndex = noteNames.indexOf(note.toUpperCase())
    if (noteIndex === -1) return 440
    const semitones = noteIndex - 9 + (octave - 4) * 12
    return 440 * Math.pow(2, semitones / 12)
  }

  playNote(
    instrument: InstrumentType,
    note: string,
    octave: number = 4,
    velocity: number = 0.8
  ): string {
    if (!this.audioContext || !this.instrumentGains.has(instrument)) {
      this.resume()
      if (!this.audioContext) return ''
    }

    const noteId = `${instrument}-${note}-${octave}-${Date.now()}`
    const frequency = this.getNoteFrequency(note, octave)
    const instrumentGain = this.instrumentGains.get(instrument)!

    const oscillator = this.audioContext!.createOscillator()
    const gainNode = this.audioContext!.createGain()

    const now = this.audioContext!.currentTime
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(velocity, now + 0.02)

    switch (instrument) {
      case 'keyboard':
        oscillator.type = 'triangle'
        break
      case 'guitar':
        oscillator.type = 'sawtooth'
        break
      case 'bass':
        oscillator.type = 'sine'
        break
      case 'drums':
        oscillator.type = 'square'
        break
    }

    oscillator.frequency.setValueAtTime(frequency, now)
    oscillator.connect(gainNode)
    gainNode.connect(instrumentGain)
    oscillator.start(now)

    this.activeNotes.set(noteId, { oscillator, gainNode, instrument, note: `${note}${octave}` })

    if (this.isRecording) {
      this.recordedEvents.push({
        instrument,
        note: `${note}${octave}`,
        frequency,
        velocity,
        startTime: this.audioContext!.currentTime - this.recordingStartTime,
      })
    }

    return noteId
  }

  stopNote(noteId: string) {
    const active = this.activeNotes.get(noteId)
    if (active && this.audioContext) {
      const now = this.audioContext.currentTime
      active.gainNode.gain.cancelScheduledValues(now)
      active.gainNode.gain.setValueAtTime(active.gainNode.gain.value, now)
      active.gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
      active.oscillator.stop(now + 0.15)
      this.activeNotes.delete(noteId)
    }
  }

  playDrum(type: 'kick' | 'snare' | 'hihat' | 'tom') {
    if (!this.audioContext) {
      this.resume()
      if (!this.audioContext) return
    }

    const instrumentGain = this.instrumentGains.get('drums')!
    const now = this.audioContext.currentTime

    if (type === 'kick') {
      const osc = this.audioContext.createOscillator()
      const gain = this.audioContext.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(150, now)
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.15)
      gain.gain.setValueAtTime(1, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
      osc.connect(gain)
      gain.connect(instrumentGain)
      osc.start(now)
      osc.stop(now + 0.3)
    } else if (type === 'snare') {
      const noise = this.createNoiseBuffer()
      const noiseSource = this.audioContext.createBufferSource()
      noiseSource.buffer = noise
      const noiseGain = this.audioContext.createGain()
      const filter = this.audioContext.createBiquadFilter()
      filter.type = 'highpass'
      filter.frequency.value = 1000
      noiseGain.gain.setValueAtTime(0.8, now)
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2)
      noiseSource.connect(filter)
      filter.connect(noiseGain)
      noiseGain.connect(instrumentGain)
      noiseSource.start(now)
      noiseSource.stop(now + 0.2)

      const osc = this.audioContext.createOscillator()
      const oscGain = this.audioContext.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(200, now)
      oscGain.gain.setValueAtTime(0.5, now)
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
      osc.connect(oscGain)
      oscGain.connect(instrumentGain)
      osc.start(now)
      osc.stop(now + 0.15)
    } else if (type === 'hihat') {
      const noise = this.createNoiseBuffer()
      const noiseSource = this.audioContext.createBufferSource()
      noiseSource.buffer = noise
      const noiseGain = this.audioContext.createGain()
      const filter = this.audioContext.createBiquadFilter()
      filter.type = 'highpass'
      filter.frequency.value = 7000
      noiseGain.gain.setValueAtTime(0.3, now)
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05)
      noiseSource.connect(filter)
      filter.connect(noiseGain)
      noiseGain.connect(instrumentGain)
      noiseSource.start(now)
      noiseSource.stop(now + 0.05)
    } else if (type === 'tom') {
      const osc = this.audioContext.createOscillator()
      const gain = this.audioContext.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(250, now)
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.2)
      gain.gain.setValueAtTime(0.8, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25)
      osc.connect(gain)
      gain.connect(instrumentGain)
      osc.start(now)
      osc.stop(now + 0.25)
    }

    if (this.isRecording) {
      this.recordedEvents.push({
        instrument: 'drums',
        note: type,
        frequency: 0,
        velocity: 1,
        startTime: this.audioContext.currentTime - this.recordingStartTime,
      })
    }
  }

  private createNoiseBuffer(): AudioBuffer {
    const bufferSize = this.audioContext!.sampleRate * 0.5
    const buffer = this.audioContext!.createBuffer(1, bufferSize, this.audioContext!.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }
    return buffer
  }

  startRecording() {
    if (!this.audioContext) return
    this.isRecording = true
    this.recordingStartTime = this.audioContext.currentTime
    this.recordedEvents = []
  }

  stopRecording(): Recording | null {
    if (!this.isRecording || !this.audioContext) return null
    this.isRecording = false
    const duration = this.audioContext.currentTime - this.recordingStartTime

    const recording: Recording = {
      id: `rec-${Date.now()}`,
      name: `录制 ${new Date().toLocaleTimeString()}`,
      date: new Date(),
      duration,
      events: [...this.recordedEvents],
    }
    this.recordings.push(recording)
    return recording
  }

  getRecordings(): Recording[] {
    return [...this.recordings]
  }

  playRecording(recordingId: string) {
    const recording = this.recordings.find(r => r.id === recordingId)
    if (!recording || !this.audioContext) return

    this.stopPlayback()

    const now = this.audioContext.currentTime
    recording.events.forEach(event => {
      const startTime = now + event.startTime
      
      if (event.instrument === 'drums') {
        setTimeout(() => {
          this.playDrum(event.note as any)
        }, event.startTime * 1000)
      } else {
        const noteId = this.playNote(
          event.instrument,
          event.note.replace(/\d/g, ''),
          parseInt(event.note.match(/\d+/)?.[0] || '4'),
          event.velocity
        )
        this.scheduledNotes.push({
          stop: () => this.stopNote(noteId)
        })
        setTimeout(() => {
          this.stopNote(noteId)
        }, (event.startTime + 0.3) * 1000)
      }
    })
  }

  stopPlayback() {
    this.scheduledNotes.forEach(n => n.stop())
    this.scheduledNotes = []
    if (this.playbackSource) {
      this.playbackSource.stop()
      this.playbackSource = null
    }
  }

  stopAllNotes() {
    this.activeNotes.forEach((_, id) => this.stopNote(id))
  }

  isRecordingActive(): boolean {
    return this.isRecording
  }

  getWaveformData(): Uint8Array {
    if (!this.analyser) return new Uint8Array(0)
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount)
    this.analyser.getByteTimeDomainData(dataArray)
    return dataArray
  }
}

export const audioEngine = new AudioEngine()
export default audioEngine
