#!/usr/bin/with-contenv bash
set -e

# Ports and data dir only. Do not export MQTT_*/POLL_* defaults here — those
# overrode add-on options and dashboard settings on every load.
export MAXXMETER_DATA_DIR="/data"
export NODE_ENV=production
export PANEL_API_PORT="8765"
export INGRESS_PORT="8099"

node /app/dist/index.js
