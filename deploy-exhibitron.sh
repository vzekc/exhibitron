#!/bin/sh
set -e

git-receive-pack exhibitron
exec >> deploy-exhibitron.log 2>&1
date
cd exhibitron
git reset --hard deploy
pnpm install --recursive
pnpm build
cd backend
pnpm migration:up
sudo systemctl restart exhibitron
date
