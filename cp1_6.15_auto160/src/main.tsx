import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { BookProvider } from './context/BookContext';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BookProvider>
      <App />
    </BookProvider>
  </React.StrictMode>
);
