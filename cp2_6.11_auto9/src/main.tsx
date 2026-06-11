import React from 'react';
import ReactDOM from 'react-dom/client';
import Gallery from './gallery';
import './style.css';

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <Gallery />
  </React.StrictMode>
);
