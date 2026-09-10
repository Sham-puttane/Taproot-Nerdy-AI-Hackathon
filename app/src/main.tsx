import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { keepFresh } from './sw-update'

keepFresh()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
