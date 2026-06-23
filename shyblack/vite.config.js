import { defineConfig, createLogger } from 'vite'
import react from '@vitejs/plugin-react'

const logger = createLogger()
const loggerWarn = logger.warn.bind(logger)
logger.warn = (msg, options) => {
  if (msg.includes('"node:crypto"') || msg.includes("'node:crypto'")) return
  loggerWarn(msg, options)
}

export default defineConfig({
  customLogger: logger,
  plugins: [react()],
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
