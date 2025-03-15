import { BuildInfo } from './types/BuildInfo'

export const buildInfo: BuildInfo = {
  deploymentDate: new Date().toISOString(),
  branchName: 'development',
  commitSha: 'development',
  environment: 'development',
}
