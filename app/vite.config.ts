import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' so the built site works from any static path (GitHub Pages, a subfolder)
export default defineConfig({
  base: './',
  plugins: [react()],
})
