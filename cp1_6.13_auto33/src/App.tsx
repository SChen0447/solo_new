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
