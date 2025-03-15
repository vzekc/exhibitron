import { BuildInfo as BuildInfoType } from '../types/BuildInfo'
import { buildInfo as productionBuildInfo } from '../generated/buildInfo'
import { buildInfo as developmentBuildInfo } from '../buildInfo.dev'
import './BuildInfo.css'

// Use production build info if it exists, otherwise fall back to development
const buildInfo: BuildInfoType =
  process.env.NODE_ENV === 'production' ? productionBuildInfo : developmentBuildInfo

export function BuildInfo() {
  return (
    <div className="build-info">
      <div className="build-info-trigger" title="Build Information" />
      <div className="build-info-chip">
        <div className="build-info-chip-content">
          {buildInfo.environment === 'development' ? (
            <span>Development</span>
          ) : (
            <>
              <span>{buildInfo.branchName}</span>
              <span>{buildInfo.commitSha.substring(0, 7)}</span>
              <span>{new Date(buildInfo.deploymentDate).toLocaleString()}</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
