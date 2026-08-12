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

# The one-shot job that deletes this exhibition's visitor photos three months
# after it ends. Installed on every deployment so that it is never forgotten,
# and skipped once it has run — it removes its own units, and the marker it
# leaves is what stops the next deployment putting them back. Nothing here may
# fail the deployment: a booth that cannot be deployed is a worse problem than
# a timer that has to be installed by hand.
cd ..
expiry_key=$(sed -n 's/^ExecStart=.*expire-visitor-photos \([a-z0-9]*\) .*/\1/p' \
  deploy/expire-visitor-photos.service)
if [ -n "$expiry_key" ] && [ ! -f "/var/lib/exhibitron/visitor-photos-expired-$expiry_key" ]; then
  if sudo install -m 644 deploy/expire-visitor-photos.service \
       deploy/expire-visitor-photos.timer /etc/systemd/system/ &&
     sudo systemctl daemon-reload &&
     sudo systemctl enable --now expire-visitor-photos.timer; then
    systemctl list-timers --no-pager expire-visitor-photos.timer | head -2
  else
    echo "WARNING: could not install the photo expiry timer — install it by hand"
  fi
else
  echo "photo expiry for $expiry_key has already run; not reinstalling"
fi

date
