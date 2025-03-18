export interface BuildInfo {
  deploymentDate: string
  branchName: string
  commitSha: string
  environment: 'development' | 'production'
  buildMode: 'development' | 'production'
}

export const defaultBuildInfo: BuildInfo = {
  deploymentDate: new Date().toISOString(),
  branchName: 'development',
  commitSha: 'development',
  environment: 'development',
  buildMode: 'development',
}
