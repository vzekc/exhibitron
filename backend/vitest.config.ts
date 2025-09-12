import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    setupFiles: ['src/test/global-setup.ts'],
    include: ['src/modules/**/test.ts', 'src/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
    },
    testTimeout: 60000, // Increase timeout to 15 seconds for CI compatibility
  },
})
