import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { eventBus } from './core/EventBus';

declare global {
  interface Window {
    __cssEventBus__?: typeof eventBus;
  }
}

window.__cssEventBus__ = eventBus;

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
