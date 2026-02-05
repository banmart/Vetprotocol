#!/bin/bash
#
# VET Protocol Server Setup Script
# Run this on your production server to activate all services
#
# Usage: bash deploy/setup.sh
#

set -e

echo "=============================================="
echo "  VET PROTOCOL - SERVER DEPLOYMENT"
echo "=============================================="
echo ""

# Configuration
VET_DIR="/root/Vetprotocol"
LOG_DIR="/var/log"

# Check we're running as root
if [ "$EUID" -ne 0 ]; then
  echo "ERROR: Please run as root (sudo bash deploy/setup.sh)"
  exit 1
fi

# Check .env exists
if [ ! -f "$VET_DIR/.env" ]; then
  echo "ERROR: $VET_DIR/.env not found!"
  echo ""
  echo "Create it with:"
  echo "  cp $VET_DIR/.env.example $VET_DIR/.env"
  echo "  nano $VET_DIR/.env"
  echo ""
  echo "Required variables:"
  echo "  - NEXT_PUBLIC_SUPABASE_URL"
  echo "  - NEXT_PUBLIC_SUPABASE_ANON_KEY"
  echo "  - SUPABASE_SERVICE_ROLE_KEY"
  echo "  - VET_NOSTR_PRIVATE_KEY"
  echo "  - VET_NOSTR_PUBKEY"
  echo "  - NOSTR_PRIVATE_KEY"
  exit 1
fi

echo "[1/5] Installing Node.js dependencies..."
cd $VET_DIR
npm install --silent 2>/dev/null || yarn install --silent 2>/dev/null || echo "Dependencies may already be installed"

echo "[2/5] Creating log files..."
touch $LOG_DIR/vet-probe-runner.log
touch $LOG_DIR/vet-nostr-poster.log
touch $LOG_DIR/vet-nostr-announcer.log
touch $LOG_DIR/vet-master-gate.log
touch $LOG_DIR/vet-engagement-bot.log
chmod 644 $LOG_DIR/vet-*.log

echo "[3/5] Installing systemd services..."
cp $VET_DIR/deploy/vet-probe-runner.service /etc/systemd/system/
cp $VET_DIR/deploy/vet-probe-runner.timer /etc/systemd/system/
cp $VET_DIR/deploy/vet-nostr-poster.service /etc/systemd/system/
cp $VET_DIR/deploy/vet-nostr-announcer.service /etc/systemd/system/
cp $VET_DIR/deploy/vet-master-gate.service /etc/systemd/system/
cp $VET_DIR/deploy/vet-engagement-bot.service /etc/systemd/system/

echo "[4/5] Reloading systemd..."
systemctl daemon-reload

echo "[5/5] Enabling and starting services..."

# Probe runner (timer-based, every 15 min)
systemctl enable vet-probe-runner.timer
systemctl start vet-probe-runner.timer
echo "  [x] Probe runner timer started (every 15 min)"

# Nostr poster (continuous)
systemctl enable vet-nostr-poster
systemctl start vet-nostr-poster
echo "  [x] Nostr auto-poster started"

# Nostr announcer (continuous)
systemctl enable vet-nostr-announcer
systemctl start vet-nostr-announcer
echo "  [x] Nostr announcer started"

# Master gate interviewer (continuous)
systemctl enable vet-master-gate
systemctl start vet-master-gate
echo "  [x] Master gate interviewer started"

# Engagement bot (continuous)
systemctl enable vet-engagement-bot
systemctl start vet-engagement-bot
echo "  [x] Engagement bot started"

echo ""
echo "=============================================="
echo "  DEPLOYMENT COMPLETE!"
echo "=============================================="
echo ""
echo "Services running:"
echo "  - vet-probe-runner.timer  (every 15 min)"
echo "  - vet-nostr-poster        (continuous)"
echo "  - vet-nostr-announcer     (continuous)"
echo "  - vet-master-gate         (continuous)"
echo "  - vet-engagement-bot      (continuous)"
echo ""
echo "Useful commands:"
echo "  systemctl status vet-probe-runner.timer"
echo "  systemctl status vet-nostr-poster"
echo "  journalctl -u vet-nostr-poster -f"
echo "  tail -f /var/log/vet-probe-runner.log"
echo ""
echo "To stop all services:"
echo "  bash $VET_DIR/deploy/stop.sh"
echo ""
