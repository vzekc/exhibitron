#!/bin/sh
set -e

git-receive-pack exhibitron
exec >> deploy-exhibitron.log 2>&1
date
cd exhibitron
git reset --hard deploy
pnpm install --recursive

# Generate build info for frontend
mkdir -p frontend/src/generated
cat > frontend/src/generated/buildInfo.ts << EOL
import { BuildInfo } from '../types/BuildInfo';

export const buildInfo: BuildInfo = {
  deploymentDate: '$(date -u +"%Y-%m-%dT%H:%M:%SZ")',
  branchName: '$(git rev-parse --abbrev-ref HEAD)',
  commitSha: '$(git rev-parse HEAD)',
  environment: 'production'
};
EOL

pnpm build
cd backend
pnpm migration:up
sudo systemctl restart exhibitron
date
