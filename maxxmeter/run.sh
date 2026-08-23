#!/usr/bin/with-contenv bash
set -e

export POLL_INTERVAL_SECONDS="${POLL_INTERVAL_SECONDS:-300}"
export WARN_PCT="${WARN_PCT:-70}"
export CRITICAL_PCT="${CRITICAL_PCT:-90}"
export MQTT_HOST="${MQTT_HOST:-core-mosquitto}"
export MQTT_PORT="${MQTT_PORT:-1883}"
export MQTT_USERNAME="${MQTT_USERNAME:-}"
export MQTT_PASSWORD="${MQTT_PASSWORD:-}"
export MQTT_TOPIC_PREFIX="${MQTT_TOPIC_PREFIX:-maxxmeter}"
export HA_URL="${HA_URL:-http://supervisor/core}"
export HA_TOKEN="${HA_TOKEN:-}"
export PANEL_API_PORT="8765"
export INGRESS_PORT="8099"
export MAXXMETER_DATA_DIR="/data"

node /app/dist/index.js
