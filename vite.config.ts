import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    // Force a single copy of three. A drei sub-dep (stats-gl) carries a nested
    // three@0.170, and once @react-three/postprocessing was added Vite could pull
    // that second instance — its EffectComposer then renders against the wrong
    // three and blanks the canvas ("THREE.WARNING: Multiple instances …").
    dedupe: ['three', '@react-three/fiber'],
  },
})
