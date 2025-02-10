import type { Config } from 'jest'

const config: Config = {
  // Automatically clear mock calls, instances, contexts and results before every test
  clearMocks: true,

  // Make calling deprecated APIs throw helpful error messages
  errorOnDeprecated: false
}

export default config
