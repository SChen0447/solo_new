import React, { useState, useEffect, useRef, useCallback } from 'react'
import { audioEngine, TrackConfig } from './audioEngine/audioEngine'
import { sequencerCore, NoteEvent } from './sequencer/sequencerCore'
import { PianoRoll } from './sequencer/pianoRoll'
import { Visualizer } from './visualizer/visualizer'

type ViewMode = 'editor' | 'visualizer'

const createDefaultTrackConfig = (trackId: string, trackName: string): TrackConfig => ({
  id: trackId,
  name: trackName,
  oscillators: {
    sine: {
      type: 'sine',
      mix: 50,
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 },
    },
    square: {
      type: 'square',
      mix: 0,
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.2 },
    },
    sawtooth: {
      type: 'sawtooth',
      mix: 0,
      envelope: { attack: 0.02, decay: 0.2, sustain: 0.6, release: 0.4 },
    },
    noise: {
      mix: 0,
      envelope: { attack: 0.001, decay: 0.05, sustain: 0.3, release: 0.1 },
    },
  },
  volume: 0.7,
  muted: false,
})

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('editor')
  const [, forceUpdate] = useState(0)
  const pianoRollRef = useRef<PianoRoll | null>(null)
  const visualizerRef = useRef<Visualizer | null>(null)
  const pianoRollCanvasRef = useRef<HTMLCanvasElement>(null)
  const visualizerCanvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  const initializeAudio = useCallback(async () => {
    if (isInitialized) return

    try {
      await audioEngine.init()

      const state = sequencerCore.getState()
      state.tracks.forEach(track => {
        const config = createDefaultTrackConfig(track.id, track.name)
        audioEngine.addTrack(config)
      })

      sequencerCore.setNoteTriggerCallback((note: NoteEvent, type: 'start' | 'stop') => {
        if (type === 'start') {
          audioEngine.playNote(note.id, note.trackId, note.pitch, note.velocity, undefined, note.duration)
          if (pianoRollRef.current) {
            pianoRollRef.current.illuminateNote(note.id)
          }
        } else {
          audioEngine.stopNote(note.id)
        }
      })

      sequencerCore.subscribe(() => forceUpdate(n => n + 1))
      setIsInitialized(true)
    } catch (e) {
      console.error('Failed to initialize audio engine:', e)
    }
  }, [isInitialized])

  useEffect(() => {
    if (!isInitialized) return

    if (pianoRollCanvasRef.current && !pianoRollRef.current) {
      pianoRollRef.current = new PianoRoll(pianoRollCanvasRef.current, sequencerCore)
      pianoRollRef.current.start()
    }

    if (visualizerCanvasRef.current && !visualizerRef.current) {
      visualizerRef.current = new Visualizer(visualizerCanvasRef.current, audioEngine)
    }

    return () => {
      if (pianoRollRef.current) {
        pianoRollRef.current.dispose()
        pianoRollRef.current = null
      }
      if (visualizerRef.current) {
        visualizerRef.current.dispose()
        visualizerRef.current = null
      }
      audioEngine.dispose()
      sequencerCore.dispose()
    }
  }, [isInitialized])

  useEffect(() => {
    if (!isInitialized) return

    const state = sequencerCore.getState()
    if (state.isPlaying) {
      visualizerRef.current?.start()
    } else {
      visualizerRef.current?.stop()
    }
  }, [isInitialized, sequencerCore.getState().isPlaying])

  const handlePlay = async () => {
    await initializeAudio()
    sequencerCore.play()
  }

  const handlePause = () => {
    sequencerCore.pause()
    audioEngine.stopAllNotes()
  }

  const handleStop = () => {
    sequencerCore.stop()
    audioEngine.stopAllNotes()
  }

  const handleLoopToggle = () => {
    const state = sequencerCore.getState()
    sequencerCore.setLooping(!state.isLooping)
  }

  const handleBPMChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const bpm = parseInt(e.target.value)
    if (!isNaN(bpm)) {
      sequencerCore.setBPM(bpm)
    }
  }

  const handleAddTrack = () => {
    if (!isInitialized) return
    sequencerCore.addTrack()
    const state = sequencerCore.getState()
    const newTrack = state.tracks[state.tracks.length - 1]
    if (newTrack) {
      const config = createDefaultTrackConfig(newTrack.id, newTrack.name)
      audioEngine.addTrack(config)
    }
  }

  const handleRemoveTrack = (trackId: string) => {
    sequencerCore.removeTrack(trackId)
    audioEngine.removeTrack(trackId)
  }

  const handleTrackNameChange = (trackId: string, name: string) => {
    sequencerCore.updateTrack(trackId, { name })
    audioEngine.updateTrack(trackId, { name })
  }

  const handleMuteToggle = (trackId: string) => {
    const state = sequencerCore.getState()
    const track = state.tracks.find(t => t.id === trackId)
    if (track) {
      audioEngine.updateTrack(trackId, { muted: !track.visible })
      sequencerCore.updateTrack(trackId, { visible: !track.visible })
    }
  }

  const handleTrackSelect = (trackId: string) => {
    sequencerCore.selectTrack(trackId)
    if (pianoRollRef.current) {
      pianoRollRef.current.setSelectedTrack(trackId)
    }
  }

  const handleOscillatorMixChange = (trackId: string, oscType: 'sine' | 'square' | 'sawtooth' | 'noise', value: number) => {
    const tracks = audioEngine['tracks'] as Map<string, TrackConfig>
    const trackConfig = tracks.get(trackId)
    if (!trackConfig) return

    const updatedOscillators = {
      ...trackConfig.oscillators,
      [oscType]: {
        ...trackConfig.oscillators[oscType],
        mix: value,
      },
    }

    audioEngine.updateTrack(trackId, { oscillators: updatedOscillators })
    forceUpdate(n => n + 1)
  }

  const handleEnvelopeChange = (trackId: string, oscType: 'sine' | 'square' | 'sawtooth' | 'noise', param: string, value: number) => {
    const tracks = audioEngine['tracks'] as Map<string, TrackConfig>
    const trackConfig = tracks.get(trackId)
    if (!trackConfig) return

    const oscConfig = trackConfig.oscillators[oscType]
    const updatedOscillators = {
      ...trackConfig.oscillators,
      [oscType]: {
        ...oscConfig,
        envelope: {
          ...oscConfig.envelope,
          [param]: value,
        },
      },
    }

    audioEngine.updateTrack(trackId, { oscillators: updatedOscillators })
    forceUpdate(n => n + 1)
  }

  const handleVolumeChange = (trackId: string, value: number) => {
    audioEngine.updateTrack(trackId, { volume: value })
    forceUpdate(n => n + 1)
  }

  const handleEffectToggle = (effect: 'reverb' | 'delay' | 'filter') => {
    const effectNode = audioEngine.getEffectNode()
    const current = effectNode.chain[effect].enabled
    if (effect === 'reverb') effectNode.setReverbEnabled(!current)
    else if (effect === 'delay') effectNode.setDelayEnabled(!current)
    else effectNode.setFilterEnabled(!current)
    forceUpdate(n => n + 1)
  }

  const handleEffectParamChange = (effect: 'reverb' | 'delay' | 'filter', param: string, value: number) => {
    const effectNode = audioEngine.getEffectNode()
    if (effect === 'reverb') {
      effectNode.setReverbParams({ [param]: value })
    } else if (effect === 'delay') {
      effectNode.setDelayParams({ [param]: value })
    } else {
      effectNode.setFilterParams({ [param]: value })
    }
    forceUpdate(n => n + 1)
  }

  const handleFilterTypeChange = (type: BiquadFilterType) => {
    audioEngine.getEffectNode().setFilterParams({ type })
    forceUpdate(n => n + 1)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      alert('File size must be less than 10MB')
      return
    }

    if (!file.type.includes('wav') && !file.type.includes('mpeg') && !file.type.includes('mp3')) {
      alert('Please select a WAV or MP3 file')
      return
    }

    try {
      await initializeAudio()
      const buffer = await audioEngine.loadAudio(file)
      if (visualizerRef.current) {
        visualizerRef.current.setLoadedAudioBuffer(buffer)
      }
      audioEngine.playLoadedAudio()
      visualizerRef.current?.start()
    } catch (err) {
      console.error('Failed to load audio:', err)
      alert('Failed to load audio file')
    }
  }

  const handleExportJSON = () => {
    sequencerCore.downloadJSON()
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 100)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
  }

  const state = sequencerCore.getState()
  const effectNode = isInitialized ? audioEngine.getEffectNode() : null

  return (
    <div className="app" onClick={initializeAudio}>
      <div className="nav-tabs">
        <button
          className={`nav-tab ${viewMode === 'editor' ? 'active' : ''}`}
          onClick={() => setViewMode('editor')}
        >
          Editor
        </button>
        <button
          className={`nav-tab ${viewMode === 'visualizer' ? 'active' : ''}`}
          onClick={() => setViewMode('visualizer')}
        >
          Visualizer
        </button>
      </div>

      <div className="transport-bar">
        <div className="transport-buttons">
          <button
            className={`transport-btn play ${state.isPlaying ? 'active' : ''}`}
            onClick={state.isPlaying ? handlePause : handlePlay}
            title={state.isPlaying ? 'Pause' : 'Play'}
          >
            {state.isPlaying ? '⏸' : '▶'}
          </button>
          <button className="transport-btn" onClick={handleStop} title="Stop">
            ⬛
          </button>
          <button
            className={`transport-btn ${state.isLooping ? 'active' : ''}`}
            onClick={handleLoopToggle}
            title="Loop"
          >
            ↻
          </button>
        </div>

        <div className="bpm-control">
          <span className="bpm-label">BPM</span>
          <input
            type="number"
            className="bpm-input"
            value={state.bpm}
            onChange={handleBPMChange}
            min={60}
            max={200}
          />
        </div>

        <div className="time-display">{formatTime(state.currentTime)}</div>

        <div className="io-controls">
          <input
            type="file"
            ref={fileInputRef}
            className="file-input"
            accept=".wav,.mp3,audio/wav,audio/mpeg,audio/mp3"
            onChange={handleFileSelect}
          />
          <button className="io-btn" onClick={() => fileInputRef.current?.click()}>
            📁 Load Audio
          </button>
          <button className="io-btn" onClick={handleExportJSON}>
            💾 Export JSON
          </button>
        </div>
      </div>

      <div className="main-content">
        {viewMode === 'editor' && (
          <>
            <div className="sidebar">
              {isInitialized && state.tracks.map(track => {
                const trackConfig = audioEngine['tracks'].get(track.id)
                return (
                  <div key={track.id} className="track-panel">
                    <div className="track-header">
                      <div className="track-header-row">
                        <span
                          className="track-color-indicator"
                          style={{ backgroundColor: track.color }}
                        />
                        <input
                          type="text"
                          className="track-name"
                          value={track.name}
                          onChange={(e) => handleTrackNameChange(track.id, e.target.value)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#E0E0E0',
                            fontSize: '13px',
                            fontWeight: '600',
                            outline: 'none',
                          }}
                        />
                      </div>
                    </div>

                    <div className="track-controls">
                      <button
                        className={`control-btn ${state.selectedTrackId === track.id ? 'active' : ''}`}
                        onClick={() => handleTrackSelect(track.id)}
                      >
                        Sel
                      </button>
                      <button
                        className={`control-btn ${!track.visible ? 'active' : ''}`}
                        onClick={() => handleMuteToggle(track.id)}
                      >
                        {track.visible ? '🔊' : '🔇'}
                      </button>
                      {state.tracks.length > 1 && (
                        <button
                          className="control-btn danger"
                          onClick={() => handleRemoveTrack(track.id)}
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <div className="slider-group">
                      <div className="slider-label">
                        <span>Volume</span>
                        <span>{trackConfig ? Math.round(trackConfig.volume * 100) : 0}%</span>
                      </div>
                      <input
                        type="range"
                        className="slider"
                        min={0}
                        max={1}
                        step={0.01}
                        value={trackConfig?.volume || 0}
                        onChange={(e) => handleVolumeChange(track.id, parseFloat(e.target.value))}
                      />
                    </div>

                    <div className="oscillator-section">
                      <div className="oscillator-title">Sine Wave</div>
                      <div className="slider-group">
                        <div className="slider-label">
                          <span>Mix</span>
                          <span>{trackConfig?.oscillators.sine.mix || 0}%</span>
                        </div>
                        <input
                          type="range"
                          className="slider"
                          min={0}
                          max={100}
                          step={1}
                          value={trackConfig?.oscillators.sine.mix || 0}
                          onChange={(e) => handleOscillatorMixChange(track.id, 'sine', parseFloat(e.target.value))}
                        />
                      </div>
                      <div className="envelope-group">
                        <div className="slider-group">
                          <div className="slider-label">
                            <span>Attack</span>
                            <span>{(trackConfig?.oscillators.sine.envelope.attack || 0).toFixed(2)}s</span>
                          </div>
                          <input
                            type="range"
                            className="slider"
                            min={0}
                            max={2}
                            step={0.01}
                            value={trackConfig?.oscillators.sine.envelope.attack || 0}
                            onChange={(e) => handleEnvelopeChange(track.id, 'sine', 'attack', parseFloat(e.target.value))}
                          />
                        </div>
                        <div className="slider-group">
                          <div className="slider-label">
                            <span>Decay</span>
                            <span>{(trackConfig?.oscillators.sine.envelope.decay || 0).toFixed(2)}s</span>
                          </div>
                          <input
                            type="range"
                            className="slider"
                            min={0}
                            max={2}
                            step={0.01}
                            value={trackConfig?.oscillators.sine.envelope.decay || 0}
                            onChange={(e) => handleEnvelopeChange(track.id, 'sine', 'decay', parseFloat(e.target.value))}
                          />
                        </div>
                        <div className="slider-group">
                          <div className="slider-label">
                            <span>Sustain</span>
                            <span>{Math.round((trackConfig?.oscillators.sine.envelope.sustain || 0) * 100)}%</span>
                          </div>
                          <input
                            type="range"
                            className="slider"
                            min={0}
                            max={1}
                            step={0.01}
                            value={trackConfig?.oscillators.sine.envelope.sustain || 0}
                            onChange={(e) => handleEnvelopeChange(track.id, 'sine', 'sustain', parseFloat(e.target.value))}
                          />
                        </div>
                        <div className="slider-group">
                          <div className="slider-label">
                            <span>Release</span>
                            <span>{(trackConfig?.oscillators.sine.envelope.release || 0).toFixed(2)}s</span>
                          </div>
                          <input
                            type="range"
                            className="slider"
                            min={0}
                            max={2}
                            step={0.01}
                            value={trackConfig?.oscillators.sine.envelope.release || 0}
                            onChange={(e) => handleEnvelopeChange(track.id, 'sine', 'release', parseFloat(e.target.value))}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="oscillator-section">
                      <div className="oscillator-title">Square Wave</div>
                      <div className="slider-group">
                        <div className="slider-label">
                          <span>Mix</span>
                          <span>{trackConfig?.oscillators.square.mix || 0}%</span>
                        </div>
                        <input
                          type="range"
                          className="slider"
                          min={0}
                          max={100}
                          step={1}
                          value={trackConfig?.oscillators.square.mix || 0}
                          onChange={(e) => handleOscillatorMixChange(track.id, 'square', parseFloat(e.target.value))}
                        />
                      </div>
                    </div>

                    <div className="oscillator-section">
                      <div className="oscillator-title">Sawtooth Wave</div>
                      <div className="slider-group">
                        <div className="slider-label">
                          <span>Mix</span>
                          <span>{trackConfig?.oscillators.sawtooth.mix || 0}%</span>
                        </div>
                        <input
                          type="range"
                          className="slider"
                          min={0}
                          max={100}
                          step={1}
                          value={trackConfig?.oscillators.sawtooth.mix || 0}
                          onChange={(e) => handleOscillatorMixChange(track.id, 'sawtooth', parseFloat(e.target.value))}
                        />
                      </div>
                    </div>

                    <div className="oscillator-section">
                      <div className="oscillator-title">Noise</div>
                      <div className="slider-group">
                        <div className="slider-label">
                          <span>Mix</span>
                          <span>{trackConfig?.oscillators.noise.mix || 0}%</span>
                        </div>
                        <input
                          type="range"
                          className="slider"
                          min={0}
                          max={100}
                          step={1}
                          value={trackConfig?.oscillators.noise.mix || 0}
                          onChange={(e) => handleOscillatorMixChange(track.id, 'noise', parseFloat(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}

              {state.tracks.length < 4 && (
                <button className="add-track-btn" onClick={handleAddTrack}>
                  + Add Track ({state.tracks.length}/4)
                </button>
              )}

              {isInitialized && effectNode && (
                <div className="effects-panel">
                  <div className="section-title">Effects</div>

                  <div className="effect-section">
                    <div className="effect-header">
                      <span className="effect-name">Reverb</span>
                      <div
                        className={`toggle-switch ${effectNode.chain.reverb.enabled ? 'active' : ''}`}
                        onClick={() => handleEffectToggle('reverb')}
                      />
                    </div>
                    <div className="slider-group">
                      <div className="slider-label">
                        <span>Wet</span>
                        <span>{Math.round(effectNode.chain.reverb.params.wet * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        className="slider"
                        min={0}
                        max={1}
                        step={0.01}
                        value={effectNode.chain.reverb.params.wet}
                        onChange={(e) => handleEffectParamChange('reverb', 'wet', parseFloat(e.target.value))}
                      />
                    </div>
                    <div className="slider-group">
                      <div className="slider-label">
                        <span>Decay</span>
                        <span>{effectNode.chain.reverb.params.decay.toFixed(1)}s</span>
                      </div>
                      <input
                        type="range"
                        className="slider"
                        min={0.1}
                        max={5}
                        step={0.1}
                        value={effectNode.chain.reverb.params.decay}
                        onChange={(e) => handleEffectParamChange('reverb', 'decay', parseFloat(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="effect-section">
                    <div className="effect-header">
                      <span className="effect-name">Delay</span>
                      <div
                        className={`toggle-switch ${effectNode.chain.delay.enabled ? 'active' : ''}`}
                        onClick={() => handleEffectToggle('delay')}
                      />
                    </div>
                    <div className="slider-group">
                      <div className="slider-label">
                        <span>Wet</span>
                        <span>{Math.round(effectNode.chain.delay.params.wet * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        className="slider"
                        min={0}
                        max={1}
                        step={0.01}
                        value={effectNode.chain.delay.params.wet}
                        onChange={(e) => handleEffectParamChange('delay', 'wet', parseFloat(e.target.value))}
                      />
                    </div>
                    <div className="slider-group">
                      <div className="slider-label">
                        <span>Time</span>
                        <span>{effectNode.chain.delay.params.delayTime.toFixed(2)}s</span>
                      </div>
                      <input
                        type="range"
                        className="slider"
                        min={0.01}
                        max={2}
                        step={0.01}
                        value={effectNode.chain.delay.params.delayTime}
                        onChange={(e) => handleEffectParamChange('delay', 'delayTime', parseFloat(e.target.value))}
                      />
                    </div>
                    <div className="slider-group">
                      <div className="slider-label">
                        <span>Feedback</span>
                        <span>{Math.round(effectNode.chain.delay.params.feedback * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        className="slider"
                        min={0}
                        max={0.9}
                        step={0.01}
                        value={effectNode.chain.delay.params.feedback}
                        onChange={(e) => handleEffectParamChange('delay', 'feedback', parseFloat(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="effect-section">
                    <div className="effect-header">
                      <span className="effect-name">Filter</span>
                      <div
                        className={`toggle-switch ${effectNode.chain.filter.enabled ? 'active' : ''}`}
                        onClick={() => handleEffectToggle('filter')}
                      />
                    </div>
                    <div className="slider-group">
                      <div className="slider-label">
                        <span>Type</span>
                      </div>
                      <select
                        className="select"
                        value={effectNode.chain.filter.params.type}
                        onChange={(e) => handleFilterTypeChange(e.target.value as BiquadFilterType)}
                      >
                        <option value="lowpass">Low Pass</option>
                        <option value="highpass">High Pass</option>
                        <option value="bandpass">Band Pass</option>
                        <option value="notch">Notch</option>
                      </select>
                    </div>
                    <div className="slider-group">
                      <div className="slider-label">
                        <span>Frequency</span>
                        <span>{Math.round(effectNode.chain.filter.params.frequency)}Hz</span>
                      </div>
                      <input
                        type="range"
                        className="slider"
                        min={20}
                        max={20000}
                        step={1}
                        value={effectNode.chain.filter.params.frequency}
                        onChange={(e) => handleEffectParamChange('filter', 'frequency', parseFloat(e.target.value))}
                      />
                    </div>
                    <div className="slider-group">
                      <div className="slider-label">
                        <span>Q</span>
                        <span>{effectNode.chain.filter.params.Q.toFixed(1)}</span>
                      </div>
                      <input
                        type="range"
                        className="slider"
                        min={0.1}
                        max={10}
                        step={0.1}
                        value={effectNode.chain.filter.params.Q}
                        onChange={(e) => handleEffectParamChange('filter', 'Q', parseFloat(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="editor-area">
              <div className="piano-roll-container">
                <canvas
                  ref={pianoRollCanvasRef}
                  className="piano-roll-canvas"
                />
              </div>
            </div>
          </>
        )}

        {viewMode === 'visualizer' && (
          <div className="visualizer-container" style={{ width: '100%' }}>
            <canvas
              ref={visualizerCanvasRef}
              className="visualizer-canvas"
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default App
