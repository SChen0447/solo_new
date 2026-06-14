import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import ClassListPage from './pages/ClassListPage';
import HomeworkDetailPage from './pages/HomeworkDetailPage';
import HomeworkSubmitPage from './pages/HomeworkSubmitPage';

function App() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<ClassListPage />} />
          <Route path="/class/:classId/homework/:id" element={<HomeworkDetailPage />} />
          <Route path="/submit/:id" element={<HomeworkSubmitPage />} />
          <Route path="/homework/:id/submit" element={<HomeworkSubmitPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
