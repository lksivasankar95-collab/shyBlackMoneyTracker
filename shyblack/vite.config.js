import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/__tests__/**/*.test.js'],
    pool: 'forks',
    poolOptions: {
      forks: {
        execArgv: ['--require', './src/__tests__/setup.cjs'],
      },
    },
  },
})
