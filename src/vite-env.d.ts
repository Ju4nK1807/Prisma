/// <reference types="vite/client" />

import type { ApiPrisma } from '../electron/preload'

declare global {
  interface Window {
    // Ausente si la interfaz se abre en un navegador normal en lugar de Electron
    prisma: ApiPrisma | undefined
  }
}
