import { useEffect, useRef } from 'react'
import { useAppStore } from '@/store/AppState'
import { ParticleSystemManager } from '@/particleModule/particleSystem'

export default function ParticleCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const managerRef = useRef<ParticleSystemManager | null>(null)

  const emotion = useAppStore((s) => s.emotion)
  const intensity = useAppStore((s) => s.intensity)
  const style = useAppStore((s) => s.style)
  const faceLandmarks = useAppStore((s) => s.faceLandmarks)
  const uploadedImage = useAppStore((s) => s.uploadedImage)

  useEffect(() => {
    if (!containerRef.current) return

    if (managerRef.current) {
      managerRef.current.dispose()
    }

    managerRef.current = new ParticleSystemManager({
      container: containerRef.current,
      emotion,
      intensity,
      style,
      faceLandmarks,
      imageWidth: 600,
      imageHeight: 400,
    })

    const handleResize = () => {
      managerRef.current?.resize()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      managerRef.current?.dispose()
      managerRef.current = null
    }
  }, [])

  useEffect(() => {
    managerRef.current?.updateConfig(emotion, intensity, style, faceLandmarks)
  }, [emotion, intensity, style, faceLandmarks])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 2,
      }}
    />
  )
}
