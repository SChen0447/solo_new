import React from 'react';
import ReactDOM from 'react-dom/client';
import GameCanvas from './GameCanvas';

function App() {
  return <GameCanvas />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
