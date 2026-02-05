#!/bin/bash
#
# VET Protocol - Service Status
#

echo "=============================================="
echo "  VET PROTOCOL SERVICE STATUS"
echo "=============================================="
echo ""

echo "=== Probe Runner (Timer) ==="
systemctl status vet-probe-runner.timer --no-pager -l 2>/dev/null || echo "Not installed"
echo ""

echo "=== Nostr Auto-Poster ==="
systemctl status vet-nostr-poster --no-pager -l 2>/dev/null || echo "Not installed"
echo ""

echo "=== Nostr Announcer ==="
systemctl status vet-nostr-announcer --no-pager -l 2>/dev/null || echo "Not installed"
echo ""

echo "=== Master Gate ==="
systemctl status vet-master-gate --no-pager -l 2>/dev/null || echo "Not installed"
echo ""

echo "=== Engagement Bot ==="
systemctl status vet-engagement-bot --no-pager -l 2>/dev/null || echo "Not installed"
echo ""

echo "=== Recent Logs ==="
echo "Probe runner:"
tail -5 /var/log/vet-probe-runner.log 2>/dev/null || echo "  No logs yet"
echo ""
echo "Nostr poster:"
tail -5 /var/log/vet-nostr-poster.log 2>/dev/null || echo "  No logs yet"
