import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'

export default defineConfig({
  // Siempre el mismo puerto: los datos guardados (cuentas, páginas) van ligados a esta dirección
  server: { port: 5173, strictPort: true },
  plugins: [
    react(),
    electron({
      main: {
        entry: 'electron/main.ts',
      },
      preload: {
        input: 'electron/preload.ts',
        vite: {
          build: {
            rolldownOptions: {
              // El preload con sandbox debe ser CommonJS; .cjs evita que "type": "module" lo trate como ESM
              output: {
                entryFileNames: '[name].cjs',
                chunkFileNames: '[name].cjs',
              },
            },
          },
        },
      },
    }),
  ],
})
