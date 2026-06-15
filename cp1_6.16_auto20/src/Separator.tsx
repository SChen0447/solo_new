import { useRef, useState, useCallback } from 'react'
import { useAudioStore } from './store'

const MAX_FILE_SIZE = 20 * 1024 * 1024

export default function Separator() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState('')
  
  const {
    file,
    fileName,
    duration,
    separationProgress,
    isSeparating,
    isSeparated,
    qualityScore,
    setFile,
    setFileName,
    setDuration,
    setOriginalWaveform,
    setVocalWaveform,
    setAccompanimentWaveform,
    startSeparation,
    setSeparationProgress,
    completeSeparation,
    setQualityScore,
    setVocalVolume,
    setAccompanimentVolume,
  } = useAudioStore()

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  const generateWaveformData = (length: number, seed?: number): number[] => {
    const data: number[] = []
    const s = seed || Math.random()
    for (let i = 0; i < length; i++) {
      const base = Math.sin(i * 0.02 + s * 10) * 0.3
      const mid = Math.sin(i * 0.05 + s * 5) * 0.2
      const detail = Math.sin(i * 0.1 + s * 7) * 0.15
      const noise = (Math.random() - 0.5) * 0.1
      const value = Math.abs(base + mid + detail + noise)
      data.push(Math.min(1, Math.max(0.05, value)))
    }
    return data
  }

  const generateVocalWaveform = (original: number[]): number[] => {
    return original.map((v, i) => {
      const vocalFactor = Math.sin(i * 0.03) * 0.4 + 0.5
      return v * vocalFactor * 0.7
    })
  }

  const generateAccompanimentWaveform = (original: number[]): number[] => {
    return original.map((v, i) => {
      const accFactor = Math.cos(i * 0.02) * 0.3 + 0.6
      return v * accFactor * 0.8
    })
  }

  const processAudioFile = useCallback(async (audioFile: File) => {
    if (!audioFile.type.includes('audio/mpeg') && !audioFile.type.includes('audio/mp3')) {
      setError('请上传MP3格式的音频文件')
      return
    }
    
    if (audioFile.size > MAX_FILE_SIZE) {
      setError('文件大小不能超过20MB')
      return
    }

    setError('')
    setFile(audioFile)
    setFileName(audioFile.name)

    try {
      const arrayBuffer = await audioFile.arrayBuffer()
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      
      setDuration(audioBuffer.duration)

      const channelData = audioBuffer.getChannelData(0)
      const samples = 500
      const blockSize = Math.floor(channelData.length / samples)
      const waveformData: number[] = []

      for (let i = 0; i < samples; i++) {
        let sum = 0
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(channelData[i * blockSize + j])
        }
        waveformData.push(sum / blockSize)
      }

      const maxVal = Math.max(...waveformData)
      const normalizedData = waveformData.map(v => v / maxVal)
      
      setOriginalWaveform(normalizedData)
      audioContext.close()
    } catch (e) {
      setError('音频文件解析失败，请确保文件格式正确')
      console.error(e)
    }
  }, [setFile, setFileName, setDuration, setOriginalWaveform])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files[0]) {
      processAudioFile(files[0])
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = e.dataTransfer.files
    if (files && files[0]) {
      processAudioFile(files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const simulateSeparation = useCallback(() => {
    if (!file) return

    startSeparation()

    const totalDuration = 8000 + Math.random() * 4000
    const interval = totalDuration / 10
    let progress = 0

    const timer = setInterval(() => {
      progress += 10
      setSeparationProgress(progress)

      if (progress >= 100) {
        clearInterval(timer)
        
        const originalWaveform = useAudioStore.getState().originalWaveform
        const vocalWaveform = generateVocalWaveform(originalWaveform)
        const accompanimentWaveform = generateAccompanimentWaveform(originalWaveform)
        
        setVocalWaveform(vocalWaveform)
        setAccompanimentWaveform(accompanimentWaveform)
        setVocalVolume(80)
        setAccompanimentVolume(80)
        
        const score = Math.floor(75 + Math.random() * 20)
        setQualityScore(score)
        
        completeSeparation()
      }
    }, interval)
  }, [file, startSeparation, setSeparationProgress, setVocalWaveform, setAccompanimentWaveform, setQualityScore, completeSeparation, setVocalVolume, setAccompanimentVolume])

  const getQualityLabel = (score: number): { label: string; desc: string } => {
    if (score >= 90) return { label: '优异', desc: '人声与伴奏分离度极高，音质纯净' }
    if (score >= 80) return { label: '良好', desc: '分离效果良好，细节清晰可辨' }
    return { label: '一般', desc: '基本可用，存在轻微混叠' }
  }

  const radius = 52
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (separationProgress / 100) * circumference

  return (
    <div className="card">
      <input
        ref={fileInputRef}
        type="file"
        accept=".mp3,audio/mpeg,audio/mp3"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {!file ? (
        <div
          className={`upload-area ${isDragging ? 'dragover' : ''}`}
          onClick={handleUploadClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="upload-icon">🎵</div>
          <div className="upload-text">点击或拖拽上传MP3文件</div>
          <div className="upload-hint">支持MP3格式，最大20MB</div>
          {error && <div style={{ color: '#e94560', marginTop: '12px', fontSize: '13px' }}>{error}</div>}
        </div>
      ) : (
        <>
          <div className="file-info">
            <div className="file-icon">🎧</div>
            <div className="file-details">
              <div className="file-name">{fileName}</div>
              <div className="file-meta">
                {formatFileSize(file.size)} · {duration > 0 ? `${Math.floor(duration / 60)}:${Math.floor(duration % 60).toString().padStart(2, '0')}` : '加载中...'}
              </div>
            </div>
            <button
              className="btn-secondary"
              onClick={handleUploadClick}
              disabled={isSeparating}
            >
              重新选择
            </button>
          </div>

          <div className="separator-section">
            {isSeparating ? (
              <div className="progress-ring-container">
                <svg className="progress-ring" width="120" height="120">
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#e94560" />
                      <stop offset="100%" stopColor="#ff7b54" />
                    </linearGradient>
                  </defs>
                  <circle
                    className="progress-ring-bg"
                    cx="60"
                    cy="60"
                    r={radius}
                  />
                  <circle
                    className="progress-ring-fill"
                    cx="60"
                    cy="60"
                    r={radius}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                  />
                </svg>
                <div className="progress-text">
                  <div className="progress-percent">{Math.round(separationProgress)}%</div>
                  <div className="progress-label">分离中...</div>
                </div>
              </div>
            ) : isSeparated ? (
              <div className="quality-score">
                <div className="quality-number">{qualityScore}</div>
                <div className="quality-text">
                  <span className="quality-label">{getQualityLabel(qualityScore).label}</span>
                  <span className="quality-desc">{getQualityLabel(qualityScore).desc}</span>
                </div>
              </div>
            ) : null}

            {!isSeparating && (
              <button
                className="btn-primary"
                onClick={simulateSeparation}
                disabled={!file || isSeparating}
              >
                {isSeparated ? '重新分离' : '开始分离'}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
