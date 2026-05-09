#!/usr/bin/env bash
#
# One-shot EC2 bootstrap for the Ou Dejeuner staging origin.
#
# Run this on a fresh Amazon Linux 2023 (ARM64) t4g.nano instance, as
# ec2-user, after SSH'ing in:
#
#   curl -fsSL https://raw.githubusercontent.com/<your-fork>/main/infra/setup_ec2.sh | sudo bash
#
# Or copy this script over manually and: sudo bash setup_ec2.sh
#
# What it does:
#   - installs Node 20, nginx, build deps for better-sqlite3
#   - creates a dedicated `oudejeuner` user
#   - creates /opt/oudejeuner, /var/lib/oudejeuner, /etc/oudejeuner
#   - drops the systemd unit and nginx config (assumes infra/ has been
#     copied to /tmp/infra)
#   - leaves placeholders for the Cloudflare Origin CA cert + key
#   - leaves a placeholder for /etc/oudejeuner/env
#
# After this runs, you'll still need to:
#   1. Paste the Cloudflare Origin CA cert into /etc/ssl/oudejeuner/origin.pem
#   2. Paste the Origin CA private key into /etc/ssl/oudejeuner/origin.key
#   3. Fill /etc/oudejeuner/env with the gate passwords + cookie secret
#   4. Upload the seeded SQLite DB to /var/lib/oudejeuner/oudejeuner.db
#   5. Run the deploy from your laptop (infra/deploy.sh)

set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Run as root (sudo)." >&2
  exit 1
fi

INFRA_DIR="${INFRA_DIR:-/tmp/infra}"

echo "==> Updating packages"
dnf -y update

echo "==> Installing Node.js 20 (NodeSource ARM64)"
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
dnf -y install nodejs gcc-c++ make python3 nginx tar gzip rsync

echo "==> Creating oudejeuner user + dirs"
id -u oudejeuner >/dev/null 2>&1 || useradd --system --shell /sbin/nologin --home-dir /opt/oudejeuner oudejeuner
mkdir -p /opt/oudejeuner /opt/oudejeuner/releases /var/lib/oudejeuner /etc/oudejeuner /etc/ssl/oudejeuner
chown -R oudejeuner:oudejeuner /opt/oudejeuner /var/lib/oudejeuner
chmod 750 /etc/oudejeuner /etc/ssl/oudejeuner

echo "==> Placing nginx config"
cp "$INFRA_DIR/nginx-oudejeuner.conf" /etc/nginx/conf.d/oudejeuner.conf
# Disable the default AL2023 server block so :443 only answers for our names.
sed -i 's|^\(\s*listen\s*80\s*default_server\s*;\)|# \1|' /etc/nginx/nginx.conf || true

echo "==> Placing systemd unit"
cp "$INFRA_DIR/oudejeuner.service" /etc/systemd/system/oudejeuner.service

echo "==> Generating placeholder env file (mode 600)"
if [[ ! -f /etc/oudejeuner/env ]]; then
  cat > /etc/oudejeuner/env <<'EOF'
# Fill these in before starting the service.
DATABASE_URL=/var/lib/oudejeuner/oudejeuner.db
OFFICE_GATE_PASSWORD=
OFFICE_GATE_PASSWORD_READONLY=
GATE_COOKIE_SECRET=
EOF
  chmod 600 /etc/oudejeuner/env
fi

echo "==> Generating placeholder cert files"
if [[ ! -f /etc/ssl/oudejeuner/origin.pem ]]; then
  : > /etc/ssl/oudejeuner/origin.pem
  : > /etc/ssl/oudejeuner/origin.key
  chmod 600 /etc/ssl/oudejeuner/origin.key
fi

echo "==> Enabling services (not starting yet — app needs deploy first)"
systemctl daemon-reload
systemctl enable nginx
systemctl enable oudejeuner

echo
echo "Bootstrap complete. Next:"
echo "  1) Paste the Cloudflare Origin CA cert + key into /etc/ssl/oudejeuner/{origin.pem,origin.key}"
echo "  2) Fill /etc/oudejeuner/env with passwords + GATE_COOKIE_SECRET"
echo "  3) Upload the seeded DB:  scp data/oudejeuner.db ec2-user@<ip>:/tmp/  &&  sudo mv /tmp/oudejeuner.db /var/lib/oudejeuner/  &&  sudo chown oudejeuner:oudejeuner /var/lib/oudejeuner/oudejeuner.db"
echo "  4) From your laptop:  EC2_HOST=ec2-user@<ip> ./infra/deploy.sh"
echo "  5) sudo systemctl start oudejeuner && sudo systemctl start nginx"
