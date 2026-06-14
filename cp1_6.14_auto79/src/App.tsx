import { Routes, Route, Navigate } from 'react-router-dom'
import SceneListPage from './pages/SceneListPage'
import EditorPage from './pages/EditorPage'
import PreviewPage from './pages/PreviewPage'

function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Navigate to="/scenes" replace />} />
        <Route path="/scenes" element={<SceneListPage />} />
        <Route path="/scenes/:id/edit" element={<EditorPage />} />
        <Route path="/scenes/:id/preview" element={<PreviewPage />} />
      </Routes>
    </div>
  )
}

export default App
