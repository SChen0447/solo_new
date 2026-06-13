import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { HomePage } from '@/pages/HomePage';
import { RecipePage } from '@/pages/RecipePage';

const App: React.FC = () => {
  return (
    <div className="app-container">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/recipe/:id" element={<RecipePage />} />
      </Routes>
    </div>
  );
};

export default App;
