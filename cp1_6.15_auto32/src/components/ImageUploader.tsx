import React, { useRef, useState, useCallback, useEffect } from 'react'
import { useEditorStore } from '@/store/useEditorStore'
import { Upload, Image as ImageIcon, X, AlertCircle, UploadCloud } from 'lucide-react'
import { ACCEPTED_TYPES, MAX_FILE_SIZE } from '@/types'

export const ImageUploader: React.FC = () => {
  const { setOriginalImage, clearImage, isDragging, setDragging, uploadError, clearUploadError, originalImageDataUrl, imageName, imageWidth, imageHeight } = useEditorStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const [hoverPulse, setHoverPulse] = useState(false)

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return '仅支持 JPG、PNG、WebP 格式'
    }
    if (file.size > MAX_FILE_SIZE) {
      return '文件大小不能超过 10MB'
    }
    return null
  }

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const file = Array.from(files)[0]
    if (!file) return
    const err = validateFile(file)
    if (err) {
      useEditorStore.setState({ uploadError: err })
      return
    }
    clearUploadError()
    await setOriginalImage(file)
  }, [setOriginalImage, clearUploadError])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
    if (e.dataTransfer.files.length) {
      handleFiles(e.dataTransfer.files)
    }
  }, [handleFiles, setDragging])

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(true)
  }

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.currentTarget === e.target) {
      setDragging(false)
    }
  }

  useEffect(() => {
    const globalDrop = (e: DragEvent) => {
      e.preventDefault()
      setDragging(false)
      if (e.dataTransfer?.files?.length) {
        handleFiles(e.dataTransfer.files)
      }
    }
    const globalOver = (e: DragEvent) => e.preventDefault()
    window.addEventListener('drop', globalDrop)
    window.addEventListener('dragover', globalOver)
    return () => {
      window.removeEventListener('drop', globalDrop)
      window.removeEventListener('dragover', globalOver)
    }
  }, [handleFiles, setDragging])

  if (originalImageDataUrl) {
    return (
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div
          style={{
            position: 'relative',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            border: '1px solid var(--border-color)',
            aspectRatio: '1',
            background: 'var(--bg-primary)',
          }}
        >
          <img
            src={originalImageDataUrl}
            alt="Original"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              animation: 'fadeIn var(--transition-slow)',
            }}
          />
          <button
            onClick={(e) => {
              e.stopPropagation()
              clearImage()
            }}
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              transition: 'all var(--transition-normal)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--error)'
              e.currentTarget.style.transform = 'scale(1.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(0,0,0,0.7)'
              e.currentTarget.style.transform = 'scale(1)'
            }}
            title="移除图片"
          >
            <X size={16} />
          </button>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '4px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            <ImageIcon size={14} />
            <span title={imageName} style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {imageName}
            </span>
          </div>
          <div style={{ color: 'var(--text-muted)' }}>
            {imageWidth} × {imageHeight} px
          </div>
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all var(--transition-normal)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent-primary)'
            e.currentTarget.style.background = 'rgba(108, 99, 255, 0.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-color)'
            e.currentTarget.style.background = 'var(--bg-primary)'
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <Upload size={16} />
          重新上传
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          style={{ display: 'none' }}
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>
    )
  }

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onMouseEnter={() => setHoverPulse(true)}
        onMouseLeave={() => setHoverPulse(false)}
        style={{
          cursor: 'pointer',
          aspectRatio: '1',
          borderRadius: 'var(--radius-md)',
          border: '2px dashed',
          borderColor: isDragging
            ? 'var(--accent-primary)'
            : hoverPulse
            ? 'var(--accent-primary)'
            : 'var(--border-color)',
          background: isDragging
            ? 'rgba(108, 99, 255, 0.08)'
            : 'var(--bg-primary)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          padding: '20px',
          transition: 'all var(--transition-slow)',
          animation: isDragging || hoverPulse ? 'pulse-border 1.5s infinite' : undefined,
        }}
      >
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: isDragging ? 'rgba(108, 99, 255, 0.15)' : 'var(--bg-card-hover)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all var(--transition-slow)',
          transform: isDragging ? 'scale(1.15)' : 'scale(1)',
        }}>
          {isDragging ? (
            <UploadCloud size={32} style={{ color: 'var(--accent-primary)' }} />
          ) : (
            <Upload size={32} style={{ color: 'var(--accent-primary)' }} />
          )}
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>
            {isDragging ? '释放以上传图片' : '点击或拖拽上传'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            JPG / PNG / WebP · 最大 10MB
          </div>
        </div>
      </div>

      {uploadError && (
        <div
          onClick={clearUploadError}
          style={{
            padding: '10px 12px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(248, 113, 113, 0.1)',
            border: '1px solid rgba(248, 113, 113, 0.3)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            fontSize: '12px',
            color: 'var(--error)',
            cursor: 'pointer',
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
          <div>
            {uploadError}
            <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '2px' }}>点击关闭</div>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        style={{ display: 'none' }}
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />
    </div>
  )
}
