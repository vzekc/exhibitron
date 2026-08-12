#!/bin/sh
#
# Run as the forced command on the deployment key: it receives the push and
# then builds what arrived.
#
# The whole body is one braced block so that the shell parses the file before
# running any of it. This script is a symlink into the checkout it is about to
# replace, and a shell reads a script as it goes — without the block, updating
# this file mid-deployment makes the shell resume at a byte offset that now
# means something else.
{
set -e

git-receive-pack exhibitron

# Keep the client's stderr so a failure can be reported back to whoever pushed,
# rather than only into a log file on this machine.
exec 3>&2
exec >> deploy-exhibitron.log 2>&1
trap 'echo "deployment failed:" >&3; tail -20 deploy-exhibitron.log >&3' EXIT

date
cd exhibitron
# refs/heads/ because there is a directory called deployment and a branch
# called deploy, and git will not guess between a revision and a path.
git reset --hard refs/heads/deploy
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
  deployment/expire-visitor-photos.service)
if [ -n "$expiry_key" ] && [ ! -f "/var/lib/exhibitron/visitor-photos-expired-$expiry_key" ]; then
  if sudo install -m 644 deployment/expire-visitor-photos.service \
       deployment/expire-visitor-photos.timer /etc/systemd/system/ &&
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
trap - EXIT
}
