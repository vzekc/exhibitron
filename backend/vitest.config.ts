import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    setupFiles: ['src/test/global-setup.ts'],
    include: ['src/modules/**/test.ts', 'src/**/*.test.ts'],
  },
})
