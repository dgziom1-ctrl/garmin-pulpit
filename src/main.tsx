import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { setupServiceWorker } from './lib/pwa'
import './index.css'

const container = document.getElementById('root')
if (!container) throw new Error('Brak elementu #root w index.html')

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

setupServiceWorker()
