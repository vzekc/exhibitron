import { buildInfo } from '@generated/buildInfo'

const BuildInfo = () => (
  <div className="group fixed bottom-0 right-0 p-4">
    <div className="h-8 w-8"></div>
    <div
      className="absolute bottom-0 right-0 hidden space-x-4 border-l border-t border-gray-200 bg-white p-4 group-hover:flex"
      title="Build Information">
      <div>{buildInfo.buildMode}</div>
      <div>{buildInfo.branchName}</div>
      <div>{buildInfo.commitSha}</div>
      <div className="whitespace-nowrap">
        {new Date(buildInfo.deploymentDate).toLocaleString('de-DE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })}
      </div>
    </div>
  </div>
)

export default BuildInfo
