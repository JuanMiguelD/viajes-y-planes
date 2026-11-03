import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/nunito'
import '@fontsource/caveat/600.css'
import '@fontsource/caveat/700.css'
import './index.css'
import App from './App.tsx'
import { applyCachedTheme } from './appSettings.tsx'

// Antes de montar, para que no haya un parpadeo con los colores por defecto.
applyCachedTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Permite notificaciones aun con la pestaña en segundo plano y que el ícono se agregue al celular.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined)
  })
}
