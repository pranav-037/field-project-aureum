import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const backendEnv = loadEnv(mode, resolve(process.cwd(), '../backend'), '')
  const apiTarget = `http://127.0.0.1:${backendEnv.PORT || '5000'}`

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/health': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
