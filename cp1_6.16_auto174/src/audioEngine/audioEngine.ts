import { EffectNode } from './effectNode'

export interface EnvelopeParams {
  attack: number
  decay: number
  sustain: number
  release: number
}

export interface OscillatorConfig {
  type: OscillatorType
  mix: number
  envelope: EnvelopeParams
}

export interface TrackConfig {
  id: string
  name: string
  oscillators: {
    sine: OscillatorConfig
    square: OscillatorConfig
    sawtooth: OscillatorConfig
    noise: { mix: number; envelope: EnvelopeParams }
  }
  volume: number
  muted: boolean
}

export interface ActiveNote {
  id: string
  trackId: string
  oscillators: {
    sine: { osc: OscillatorNode; gain: GainNode } | null
    square: { osc: OscillatorNode; gain: GainNode } | null
    sawtooth: { osc: OscillatorNode; gain: GainNode } | null
    noise: { source: AudioBufferSourceNode; gain: GainNode; filter: BiquadFilterNode } | null
  }
  envelopeGains: {
    sine: GainNode
    square: GainNode
    sawtooth: GainNode
    noise: GainNode
  }
  trackGain: GainNode
  startTime: number
}

export type WaveformData = {
  left: Float32Array
  right: Float32Array
}

export type SpectrumData = Float32Array

const NOTE_FREQUENCIES: Record<string, number> = {}
for (let i = 0; i < 88; i++) {
  const noteName = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'][i % 12]
  const octave = Math.floor((i + 9) / 12) - 1
  NOTE_FREQUENCIES[`${noteName}${octave}`] = 440 * Math.pow(2, (i - 48) / 12)
}

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

export class AudioEngine {
  private context: AudioContext | null = null
  private masterGain: GainNode | null = null
  private analyser: AnalyserNode | null = null
  private waveformDataL: Float32Array | null = null
  private waveformDataR: Float32Array | null = null
  private spectrumData: Float32Array | null = null
  private effectNode: EffectNode | null = null
  private activeNotes: Map<string, ActiveNote> = new Map()
  private tracks: Map<string, TrackConfig> = new Map()
  private trackGains: Map<string, GainNode> = new Map()
  private noiseBuffer: AudioBuffer | null = null
  private audioBuffer: AudioBuffer | null = null
  private audioSource: AudioBufferSourceNode | null = null

  public async init(): Promise<void> {
    this.context = new (window.AudioContext || (window as any).webkitAudioContext)()
    
    this.masterGain = this.context.createGain()
    this.masterGain.gain.value = 0.5
    
    this.analyser = this.context.createAnalyser()
    this.analyser.fftSize = 256
    this.analyser.smoothingTimeConstant = 0.8
    
    this.waveformDataL = new Float32Array(this.analyser.fftSize)
    this.waveformDataR = new Float32Array(this.analyser.fftSize)
    this.spectrumData = new Float32Array(this.analyser.frequencyBinCount)
    
    this.effectNode = new EffectNode(this.context)
    
    this.noiseBuffer = this.createNoiseBuffer()
    
    this.effectNode.output.connect(this.masterGain)
    this.masterGain.connect(this.analyser)
    this.analyser.connect(this.context.destination)
  }

  private createNoiseBuffer(): AudioBuffer {
    if (!this.context) throw new Error('AudioContext not initialized')
    const bufferSize = this.context.sampleRate * 2
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }
    return buffer
  }

  public getContext(): AudioContext {
    if (!this.context) throw new Error('AudioContext not initialized')
    return this.context
  }

  public getEffectNode(): EffectNode {
    if (!this.effectNode) throw new Error('EffectNode not initialized')
    return this.effectNode
  }

  public addTrack(track: TrackConfig): void {
    if (!this.context || !this.effectNode) throw new Error('AudioEngine not initialized')
    const trackGain = this.context.createGain()
    trackGain.gain.value = track.muted ? 0 : track.volume
    trackGain.connect(this.effectNode.input)
    this.trackGains.set(track.id, trackGain)
    this.tracks.set(track.id, track)
  }

  public updateTrack(trackId: string, updates: Partial<TrackConfig>): void {
    const track = this.tracks.get(trackId)
    if (!track) return
    Object.assign(track, updates)
    const trackGain = this.trackGains.get(trackId)
    if (trackGain) {
      trackGain.gain.value = track.muted ? 0 : track.volume
    }
  }

  public removeTrack(trackId: string): void {
    const trackGain = this.trackGains.get(trackId)
    if (trackGain) {
      trackGain.disconnect()
      this.trackGains.delete(trackId)
    }
    this.tracks.delete(trackId)
  }

  public async loadAudio(file: File): Promise<AudioBuffer> {
    if (!this.context) throw new Error('AudioContext not initialized')
    
    const arrayBuffer = await file.arrayBuffer()
    this.audioBuffer = await this.context.decodeAudioData(arrayBuffer)
    
    return this.audioBuffer
  }

  public playLoadedAudio(): void {
    if (!this.context || !this.audioBuffer || !this.effectNode) return
    
    this.stopLoadedAudio()
    
    this.audioSource = this.context.createBufferSource()
    this.audioSource.buffer = this.audioBuffer
    this.audioSource.connect(this.effectNode.input)
    this.audioSource.start()
  }

  public stopLoadedAudio(): void {
    if (this.audioSource) {
      this.audioSource.stop()
      this.audioSource.disconnect()
      this.audioSource = null
    }
  }

  public getLoadedAudioBuffer(): AudioBuffer | null {
    return this.audioBuffer
  }

  public playNote(
    noteId: string,
    trackId: string,
    midi: number,
    velocity: number,
    startTime?: number,
    duration?: number
  ): void {
    if (!this.context || !this.effectNode) throw new Error('AudioEngine not initialized')
    if (this.activeNotes.has(noteId)) return

    const track = this.tracks.get(trackId)
    if (!track) return

    const freq = midiToFreq(midi)
    const now = startTime ?? this.context.currentTime
    const trackGain = this.trackGains.get(trackId)
    if (!trackGain) return

    const activeNote: ActiveNote = {
      id: noteId,
      trackId,
      oscillators: { sine: null, square: null, sawtooth: null, noise: null },
      envelopeGains: {
        sine: this.context.createGain(),
        square: this.context.createGain(),
        sawtooth: this.context.createGain(),
        noise: this.context.createGain(),
      },
      trackGain: this.context.createGain(),
      startTime: now,
    }

    activeNote.trackGain.gain.value = velocity

    const types: Array<'sine' | 'square' | 'sawtooth'> = ['sine', 'square', 'sawtooth']
    types.forEach(type => {
      const config = track.oscillators[type]
      if (config.mix > 0) {
        const osc = this.context!.createOscillator()
        osc.type = type
        osc.frequency.value = freq

        const gain = this.context!.createGain()
        gain.gain.value = config.mix / 100

        osc.connect(gain)
        gain.connect(activeNote.envelopeGains[type])

        activeNote.oscillators[type] = { osc, gain }

        const env = config.envelope
        activeNote.envelopeGains[type].gain.cancelScheduledValues(now)
        activeNote.envelopeGains[type].gain.setValueAtTime(0, now)
        activeNote.envelopeGains[type].gain.linearRampToValueAtTime(1, now + env.attack)
        activeNote.envelopeGains[type].gain.linearRampToValueAtTime(env.sustain, now + env.attack + env.decay)

        osc.start(now)
      }
    })

    if (track.oscillators.noise.mix > 0) {
      const noiseSource = this.context.createBufferSource()
      noiseSource.buffer = this.noiseBuffer!
      noiseSource.loop = true

      const noiseGain = this.context.createGain()
      noiseGain.gain.value = track.oscillators.noise.mix / 100

      const noiseFilter = this.context.createBiquadFilter()
      noiseFilter.type = 'lowpass'
      noiseFilter.frequency.value = freq * 2
      noiseFilter.Q.value = 1

      noiseSource.connect(noiseFilter)
      noiseFilter.connect(noiseGain)
      noiseGain.connect(activeNote.envelopeGains.noise)

      activeNote.oscillators.noise = { source: noiseSource, gain: noiseGain, filter: noiseFilter }

      const env = track.oscillators.noise.envelope
      activeNote.envelopeGains.noise.gain.cancelScheduledValues(now)
      activeNote.envelopeGains.noise.gain.setValueAtTime(0, now)
      activeNote.envelopeGains.noise.gain.linearRampToValueAtTime(1, now + env.attack)
      activeNote.envelopeGains.noise.gain.linearRampToValueAtTime(env.sustain, now + env.attack + env.decay)

      noiseSource.start(now)
    }

    Object.values(activeNote.envelopeGains).forEach(gain => {
      gain.connect(activeNote.trackGain)
    })
    activeNote.trackGain.connect(trackGain)

    this.activeNotes.set(noteId, activeNote)

    if (duration !== undefined) {
      this.scheduleNoteStop(noteId, duration)
    }
  }

  private scheduleNoteStop(noteId: string, duration: number): void {
    const activeNote = this.activeNotes.get(noteId)
    if (!activeNote || !this.context) return

    const track = this.tracks.get(activeNote.trackId)
    if (!track) return

    const stopTime = activeNote.startTime + duration

    const types: Array<'sine' | 'square' | 'sawtooth'> = ['sine', 'square', 'sawtooth']
    types.forEach(type => {
      const config = track.oscillators[type]
      const envGain = activeNote.envelopeGains[type]
      envGain.gain.cancelScheduledValues(stopTime)
      envGain.gain.linearRampToValueAtTime(0, stopTime + config.envelope.release)
    })

    const noiseEnv = track.oscillators.noise.envelope
    activeNote.envelopeGains.noise.gain.cancelScheduledValues(stopTime)
    activeNote.envelopeGains.noise.gain.linearRampToValueAtTime(0, stopTime + noiseEnv.release)

    const maxRelease = Math.max(
      track.oscillators.sine.envelope.release,
      track.oscillators.square.envelope.release,
      track.oscillators.sawtooth.envelope.release,
      track.oscillators.noise.envelope.release
    )

    setTimeout(() => {
      this.stopNote(noteId)
    }, (duration + maxRelease) * 1000 + 100)
  }

  public stopNote(noteId: string): void {
    const activeNote = this.activeNotes.get(noteId)
    if (!activeNote) return

    const types: Array<'sine' | 'square' | 'sawtooth'> = ['sine', 'square', 'sawtooth']
    types.forEach(type => {
      const oscData = activeNote.oscillators[type]
      if (oscData) {
        try {
          oscData.osc.stop()
          oscData.osc.disconnect()
          oscData.gain.disconnect()
        } catch (e) {
          // Ignore
        }
      }
    })

    if (activeNote.oscillators.noise) {
      try {
        activeNote.oscillators.noise.source.stop()
        activeNote.oscillators.noise.source.disconnect()
        activeNote.oscillators.noise.gain.disconnect()
        activeNote.oscillators.noise.filter.disconnect()
      } catch (e) {
        // Ignore
      }
    }

    Object.values(activeNote.envelopeGains).forEach(gain => gain.disconnect())
    activeNote.trackGain.disconnect()

    this.activeNotes.delete(noteId)
  }

  public stopAllNotes(): void {
    const noteIds = Array.from(this.activeNotes.keys())
    noteIds.forEach(id => this.stopNote(id))
  }

  public getWaveformData(): WaveformData {
    if (!this.analyser || !this.waveformDataL || !this.waveformDataR) {
      return { left: new Float32Array(0), right: new Float32Array(0) }
    }
    this.analyser.getFloatTimeDomainData(this.waveformDataL as Float32Array<ArrayBuffer>)
    this.waveformDataR.set(this.waveformDataL)
    return {
      left: this.waveformDataL,
      right: this.waveformDataR,
    }
  }

  public getSpectrumData(): SpectrumData {
    if (!this.analyser || !this.spectrumData) {
      return new Float32Array(0)
    }
    this.analyser.getFloatFrequencyData(this.spectrumData as Float32Array<ArrayBuffer>)
    return this.spectrumData
  }

  public setMasterVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = volume
    }
  }

  public getMasterVolume(): number {
    return this.masterGain?.gain.value ?? 0
  }

  public dispose(): void {
    this.stopAllNotes()
    this.stopLoadedAudio()
    if (this.effectNode) {
      this.effectNode.disconnect()
    }
    if (this.analyser) {
      this.analyser.disconnect()
    }
    if (this.masterGain) {
      this.masterGain.disconnect()
    }
    if (this.context) {
      this.context.close()
    }
  }
}

export const audioEngine = new AudioEngine()
