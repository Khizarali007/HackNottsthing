import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import TestSlider from './TestSlider.jsx'





createRoot(document.getElementById('root')).render(
  <StrictMode>
    <TestSlider />
  </StrictMode>,
)
