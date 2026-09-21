import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Honour a PORT handed in by the launcher (5173 is often taken by other projects).
  server: { port: Number(process.env.PORT) || 5173 },
})
