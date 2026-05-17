#!/usr/bin/env bash
#
# Lean deploy: build locally, scp a tarball, install prod deps on the box,
# swap a current symlink, restart the systemd unit. No GitHub Actions,
# no Litestream, no CD — those layer on once staging is confirmed working.
#
# Uses only `tar`, `scp`, `ssh` so it runs unchanged from Git Bash on
# Windows (no rsync needed).
#
# Usage:
#   EC2_HOST=ec2-user@<elastic-ip> EC2_KEY=~/.ssh/oudejeuner.pem ./infra/deploy.sh
#
# The first deploy needs the EC2 to have already run infra/setup_ec2.sh.

set -euo pipefail

EC2_HOST="${EC2_HOST:-}"
EC2_KEY="${EC2_KEY:-$HOME/.ssh/oudejeuner.pem}"

if [[ -z "$EC2_HOST" ]]; then
  echo "EC2_HOST not set. Example:" >&2
  echo "  EC2_HOST=ec2-user@1.2.3.4 ./infra/deploy.sh" >&2
  exit 1
fi

if [[ ! -f "$EC2_KEY" ]]; then
  echo "SSH key not found at $EC2_KEY (set EC2_KEY)." >&2
  exit 1
fi

SSH_OPTS="-i $EC2_KEY -o StrictHostKeyChecking=accept-new"

RELEASE_TS=$(date -u +%Y%m%d-%H%M%S)
TARBALL="release-${RELEASE_TS}.tar.gz"
REMOTE_RELEASE="/opt/oudejeuner/releases/$RELEASE_TS"
REMOTE_CURRENT="/opt/oudejeuner/current"

cleanup() { rm -f "$TARBALL"; }
trap cleanup EXIT

echo "==> Building locally"
npm run build

echo "==> Packaging release tarball"
tar -czf "$TARBALL" \
  --exclude='.next/cache' \
  .next public package.json package-lock.json next.config.mjs drizzle \
  scripts/db-migrate.mjs

echo "==> Uploading"
scp $SSH_OPTS "$TARBALL" "$EC2_HOST:/tmp/"

echo "==> Extracting on remote"
ssh $SSH_OPTS "$EC2_HOST" bash -se <<EOF
set -euo pipefail
sudo install -d -o oudejeuner -g oudejeuner "$REMOTE_RELEASE"
sudo tar -C "$REMOTE_RELEASE" -xzf "/tmp/$TARBALL"
sudo chown -R oudejeuner:oudejeuner "$REMOTE_RELEASE"
rm "/tmp/$TARBALL"
EOF

echo "==> Installing prod deps on remote (native better-sqlite3 build)"
ssh $SSH_OPTS "$EC2_HOST" "cd $REMOTE_RELEASE && sudo -u oudejeuner npm ci --omit=dev"

echo "==> Applying Drizzle migrations on remote"
ssh $SSH_OPTS "$EC2_HOST" "cd $REMOTE_RELEASE && sudo -u oudejeuner bash -c 'set -a; source /etc/oudejeuner/env; set +a; node scripts/db-migrate.mjs'"

echo "==> Swapping current symlink and restarting"
ssh $SSH_OPTS "$EC2_HOST" "sudo ln -sfn $REMOTE_RELEASE $REMOTE_CURRENT && sudo systemctl restart oudejeuner"

echo "==> Pruning old releases (keeping last 3)"
ssh $SSH_OPTS "$EC2_HOST" "ls -1dt /opt/oudejeuner/releases/* | tail -n +4 | sudo xargs -r rm -rf"

echo
echo "Deployed $RELEASE_TS."
echo "Tail logs with: ssh $EC2_HOST 'sudo journalctl -u oudejeuner -n 50 --no-pager'"
