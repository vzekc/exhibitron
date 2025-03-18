import { buildInfo } from '../generated/buildInfo'
import './BuildInfo.css'

export function BuildInfo() {
  return (
    <div className="build-info">
      <div className="build-info-trigger" title="Build Information" />
      <div className="build-info-chip">
        <div className="build-info-chip-content">
          <span>{buildInfo.buildMode}</span>
          <span>{buildInfo.branchName}</span>
          <span>{buildInfo.commitSha}</span>
          <span>{new Date(buildInfo.deploymentDate).toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}
