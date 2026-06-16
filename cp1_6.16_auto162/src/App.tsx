import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { PoemEditor } from './pages/PoemEditor';
import './styles/global.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<PoemEditor />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
