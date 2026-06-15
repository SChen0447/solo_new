import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import BrainstormPage from './pages/BrainstormPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/topic/:id" element={<BrainstormPage />} />
      </Routes>
    </BrowserRouter>
  );
}
