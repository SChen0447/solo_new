import { useEffect, useRef } from 'react'
import { SceneCanvas } from './SceneCanvas'
import { UIPanel } from './UIPanel'
import { EEGAnalyzer } from '../modules/eegAnalyzer'
import { useEEGStore, BandData } from '../store/useStore'

export function App() {
  const setBandData = useEEGStore((state) => state.setBandData)
  const speedMultiplier = useEEGStore((state) => state.speedMultiplier)
  const analyzerRef = useRef<EEGAnalyzer | null>(null)

  useEffect(() => {
    const handleData = (data: BandData) => {
      setBandData(data)
    }

    analyzerRef.current = new EEGAnalyzer(handleData, 5)
    analyzerRef.current.start()

    return () => {
      if (analyzerRef.current) {
        analyzerRef.current.stop()
      }
    }
  }, [setBandData])

  useEffect(() => {
    if (analyzerRef.current) {
      analyzerRef.current.setSpeed(speedMultiplier)
    }
  }, [speedMultiplier])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <SceneCanvas />
      <UIPanel />
    </div>
  )
}
