import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { useWorkshopStore } from './store/workshopStore'
import './index.css'

const initApp = async () => {
  await useWorkshopStore.getState().fetchAll()
}

initApp()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
