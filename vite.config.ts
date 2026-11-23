import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'

export default defineConfig({
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
