import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { NocProvider } from './context/NocContext.jsx'
import { DashboardProvider } from './context/DashboardContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DashboardProvider>
      <NocProvider>
        <App />
      </NocProvider>
    </DashboardProvider>
  </StrictMode>,
)
