import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    setupFiles: ['src/test/global-setup.ts'],
    include: ['src/modules/**/test.ts', 'src/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
    },
    testTimeout: 60000,
    // Each suite provisions its own database in a setup hook; with all suites
    // running in parallel that takes well over the 10s default.
    hookTimeout: 60000,
  },
})
