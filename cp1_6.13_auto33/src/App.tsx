import { BrowserRouter, Routes, Route } from 'react-router-dom';
import IdeaBoard from './IdeaBoard';
import IdeaDetail from './IdeaDetail';

const globalStyles = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Nunito', sans-serif;
    background-color: #F7F1E0;
    color: #333;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  @keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes bounceIn {
    0% { transform: scale(0); }
    50% { transform: scale(1.15); }
    100% { transform: scale(1); }
  }

  @keyframes dropIn {
    0% { transform: translateY(-80px); opacity: 0; }
    60% { transform: translateY(10px); opacity: 1; }
    80% { transform: translateY(-5px); }
    100% { transform: translateY(0); }
  }

  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.2); }
    100% { transform: scale(1); }
  }

  @keyframes floatUp {
    0% { transform: translateY(0) scale(1); opacity: 1; }
    100% { transform: translateY(-60px) scale(0.3); opacity: 0; }
  }

  @keyframes slideUp {
    from { transform: translateY(30px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  @keyframes putoBounce {
    0% { transform: scale(1); }
    30% { transform: scale(0.85); }
    60% { transform: scale(1.1); }
    100% { transform: scale(1); }
  }

  @keyframes toastIn {
    0% { transform: translateY(-20px); opacity: 0; }
    100% { transform: translateY(0); opacity: 1; }
  }

  @keyframes toastOut {
    0% { transform: translateY(0); opacity: 1; }
    100% { transform: translateY(-20px); opacity: 0; }
  }
`;

export default function App() {
  return (
    <>
      <style>{globalStyles}</style>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<IdeaBoard />} />
          <Route path="/idea/:id" element={<IdeaDetail />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}
