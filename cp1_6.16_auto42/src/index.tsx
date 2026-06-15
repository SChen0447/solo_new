import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const style = document.createElement('style');
style.textContent = `
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  
  body {
    margin: 0;
    padding: 0;
    background-color: #1a1a2e;
  }
  
  #root {
    width: 100%;
  }
  
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  ::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
  }
  
  ::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
  }
  
  ::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }
  
  input:focus, select:focus {
    border-color: #0f3460 !important;
    box-shadow: 0 0 0 2px rgba(15, 52, 96, 0.3);
  }
  
  button:hover {
    background-color: #0f3460 !important;
    border-color: rgba(255, 255, 255, 0.2) !important;
  }
  
  button:active {
    transform: scale(0.98);
  }
  
  @media (max-width: 968px) {
    [data-main-grid] {
      grid-template-columns: 1fr !important;
      padding: 16px !important;
    }
    [data-dashboard-summary] {
      grid-template-columns: 1fr 1fr !important;
    }
    [data-charts-row] {
      grid-template-columns: 1fr !important;
    }
  }
  
  @media (max-width: 600px) {
    [data-app-header] {
      padding: 16px 20px !important;
    }
    [data-app-header] h1 {
      font-size: 20px !important;
    }
    [data-main-grid] {
      padding: 12px !important;
    }
    [data-dashboard-summary] {
      grid-template-columns: 1fr !important;
    }
  }
`;
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
