import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ProveedorAvisos } from './controles/Avisos'
// Fuentes empaquetadas con la app: se ven igual en cualquier equipo y sin conexión
import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'
import './estilos/app.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ProveedorAvisos>
      <App />
    </ProveedorAvisos>
  </StrictMode>,
)
