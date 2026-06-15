import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { Toaster } from 'react-hot-toast'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3000,
        style: {
          background: '#252526',
          color: '#fff',
          border: '1px solid #3e3e42',
          borderRadius: '8px',
          fontSize: '13px'
        },
        success: {
          iconTheme: {
            primary: '#4caf50',
            secondary: '#fff'
          }
        },
        error: {
          iconTheme: {
            primary: '#f44336',
            secondary: '#fff'
          }
        }
      }}
    />
  </React.StrictMode>
)
