import React, { useEffect, useRef } from 'react'
import ReactDOM from 'react-dom/client'
import ControlPanel from './ui'
import { PlantScene } from './scene'
import { usePlantStore } from './store'
import { calculatePlantStructure } from './plant'

const App: React.FC = () => {
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<PlantScene | null>(null)
  const { light, humidity, temperature, setPlantStructure } = usePlantStore()

  useEffect(() => {
    if (!canvasContainerRef.current) return

    const scene = new PlantScene(canvasContainerRef.current)
    sceneRef.current = scene
    scene.start()

    const initialStructure = calculatePlantStructure(50, 50, 50)
    setPlantStructure(initialStructure)
    scene.updatePlantStructure(initialStructure)

    return () => {
      scene.dispose()
    }
  }, [])

  useEffect(() => {
    if (!sceneRef.current) return

    const startTime = performance.now()
    const newStructure = calculatePlantStructure(light, humidity, temperature)
    const calcTime = performance.now() - startTime

    if (calcTime > 200) {
      console.warn(`Plant structure calculation took ${calcTime}ms, exceeds 200ms limit`)
    }

    setPlantStructure(newStructure)
    sceneRef.current.updatePlantStructure(newStructure)
  }, [light, humidity, temperature, setPlantStructure])

  return (
    <div style={styles.appContainer}>
      <div ref={canvasContainerRef} style={styles.canvasContainer} />
      <ControlPanel />
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  appContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden'
  },
  canvasContainer: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0
  }
}

const styleElement = document.createElement('style')
styleElement.textContent = `
  input[type="range"] {
    -webkit-appearance: none;
    appearance: none;
  }
  
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--slider-color, #f1c40f);
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    border: 2px solid white;
    transition: transform 0.1s ease;
  }
  
  input[type="range"]::-webkit-slider-thumb:hover {
    transform: scale(1.1);
  }
  
  input[type="range"]::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--slider-color, #f1c40f);
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    border: 2px solid white;
  }

  input[type="range"]::-webkit-slider-runnable-track {
    height: 6px;
    border-radius: 3px;
    background: #555;
  }

  input[type="range"]::-moz-range-track {
    height: 6px;
    border-radius: 3px;
    background: #555;
  }
`
document.head.appendChild(styleElement)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
