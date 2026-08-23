# MaxxMeter

**Token maxxing, on your wall.**

MaxxMeter turns classic Sonoff NSPanels (ESP32 + Nextion) into live AI subscription usage dashboards for **Cursor**, **Claude**, and **Kimi Coding** plans.

## Features

- Home Assistant add-on with **ingress dashboard** (Overview, Accounts, Panels, Settings)
- **Multi-user** — each HA user connects their own provider accounts
- **Multi-panel** — register EU (480×320) and US portrait (320×480) NSPanels with per-panel API keys
- **MQTT** auto-discovery sensors (no custom Python integration)
- **REST API** for wall panels on port `8765`
- In-house TypeScript connectors for Claude, Cursor, and Kimi

## Quick start

1. Add this repository to Home Assistant Add-on store (see [docs/setup.md](docs/setup.md))
2. Install and start the **MaxxMeter** add-on
3. Open the ingress dashboard → **Accounts** → connect providers
4. **Panels** → register your NSPanel → copy ESPHome secrets
5. Flash [panel/esphome/](panel/esphome/) and upload the matching Nextion TFT

## Development

```bash
npm install
npm install --prefix dashboard
npm run build
MAXXMETER_DEV_USER_ID=dev npm run dev
```

- Panel API: `http://localhost:8765`
- Ingress dashboard: `http://localhost:8099`

```bash
npm test
```

## License

MIT
