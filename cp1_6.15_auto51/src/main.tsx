import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import { AvatarCreator } from './components/AvatarCreator';
import { CommunityGallery } from './components/CommunityGallery';
import { AvatarDetail } from './components/AvatarDetail';
import { LoginPage } from './components/LoginPage';
import { Navbar } from './components/Navbar';
import { Notification } from './components/Notification';

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Notification />
      <Routes>
        <Route path="/" element={<CommunityGallery />} />
        <Route path="/create" element={<AvatarCreator />} />
        <Route path="/avatar/:id" element={<AvatarDetail />} />
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
