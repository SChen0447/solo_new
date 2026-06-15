import React, { useEffect, useRef, useState } from 'react'
import { useStore } from '@/store/Store'
import { SimulationEngine } from '@/modules/physiology/SimulationEngine'
import CellScene from '@/modules/cell_model/CellScene'
import DataPanel from '@/modules/ui/DataPanel'
import DetailCard from '@/modules/ui/DetailCard'
import ControlPanel from '@/modules/ui/ControlPanel'

const App: React.FC = () => {
  const simulationEngineRef = useRef<SimulationEngine | null>(null)
  const cellType = useStore((state) => state.cellType)
  const params = useStore((state) => state.params)
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth)

  useEffect(() => {
    simulationEngineRef.current = new SimulationEngine()
    simulationEngineRef.current.start()

    return () => {
      simulationEngineRef.current?.dispose()
    }
  }, [])

  useEffect(() => {
    if (simulationEngineRef.current) {
      simulationEngineRef.current.setCellType(cellType)
    }
  }, [cellType])

  useEffect(() => {
    if (simulationEngineRef.current) {
      simulationEngineRef.current.setParams(params)
    }
  }, [params])

  useEffect(() => {
    const handleResize = (): void => {
      setViewportWidth(window.innerWidth)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const isMobile = viewportWidth < 900

  const layoutStyle: React.CSSProperties = isMobile
    ? {
        display: 'flex',
        flexDirection: 'column' as const,
        width: '100%',
        height: '100%',
      }
    : {
        display: 'flex',
        flexDirection: 'row' as const,
        width: '100%',
        height: '100%',
      }

  const sceneStyle: React.CSSProperties = isMobile
    ? {
        position: 'relative' as const,
        width: '100%',
        height: '55%',
        borderBottom: '1px solid #333',
      }
    : {
        position: 'relative' as const,
        width: '65%',
        height: '100%',
        borderRight: '1px solid #333',
      }

  const panelStyle: React.CSSProperties = isMobile
    ? {
        position: 'relative' as const,
        width: '100%',
        height: '45%',
      }
    : {
        position: 'relative' as const,
        width: '35%',
        height: '100%',
      }

  return (
    <div style={layoutStyle}>
      <div style={sceneStyle}>
        <CellScene />
        <DetailCard />
        {!isMobile && <ControlPanel />}
      </div>

      <div style={panelStyle}>
        <DataPanel />
        {isMobile && <ControlPanel />}
      </div>
    </div>
  )
}

export default App
