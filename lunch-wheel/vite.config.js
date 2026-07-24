import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import { placesApiDevPlugin } from './vite-plugins/placesApiDev.js'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  if (env.GOOGLE_PLACES_API_KEY) {
    process.env.GOOGLE_PLACES_API_KEY = env.GOOGLE_PLACES_API_KEY
  }

  return {
    plugins: [react(), tailwindcss(), placesApiDevPlugin()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})
