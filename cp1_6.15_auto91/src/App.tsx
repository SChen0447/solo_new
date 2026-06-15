import ControlPanel from './components/ControlPanel'
import CanvasArea from './components/CanvasArea'

function App() {
  return (
    <div className="app-root">
      <div className="app-layout">
        <aside className="app-sidebar">
          <ControlPanel />
        </aside>
        <main className="app-main">
          <CanvasArea />
        </main>
      </div>
    </div>
  )
}

export default App
