import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'node:crypto': 'crypto',
    },
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return
        warn(warning)
      },
    },
  },
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
