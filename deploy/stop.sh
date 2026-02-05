#!/bin/bash
#
# VET Protocol - Stop All Services
#

echo "Stopping VET Protocol services..."

systemctl stop vet-probe-runner.timer 2>/dev/null
systemctl stop vet-nostr-poster 2>/dev/null
systemctl stop vet-nostr-announcer 2>/dev/null
systemctl stop vet-master-gate 2>/dev/null
systemctl stop vet-engagement-bot 2>/dev/null

echo "All services stopped."
echo ""
echo "To restart: bash /root/Vetprotocol/deploy/setup.sh"
