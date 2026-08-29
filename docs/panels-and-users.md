# Panels and users

## Multi-user (Home Assistant)

- Each HA user sees only **their** accounts and panels in the ingress dashboard.
- MQTT entities are published under `maxxmeter/<ownerUserId>/...` (configurable prefix).
- HA admins can manage global settings; user switcher UI is planned for a future release.

Dev fallback (no ingress headers):

```bash
MAXXMETER_DEV_USER_ID=dev-user
MAXXMETER_DEV_USER_NAME=Developer
```

## Multi-panel

1. Register each NSPanel in **Panels** with a label and profile:
   - **NSPanel EU** — 480×320 landscape
   - **NSPanel US portrait** — 320×480
2. Copy **panel ID** and **API key** into ESPHome `secrets.yaml`.
3. Flash the matching profile YAML from `panel/esphome/`.

Each panel polls:

```http
GET http://<collector_host>:8765/api/v1/panels/<panelId>/usage
Authorization: Bearer <apiKey>
```

The response includes usage for all accounts owned by the panel's registering user (filtered server-side).

## Nextion TFT

Design `.HMI` files in Nextion Editor to match component names used in ESPHome:

| Component | Purpose |
|-----------|---------|
| `t0` | Account / title label |
| `t1` | Status line (`S:xx% W:yy%`) |
| `j0` | Session usage progress (0–100) |
| `j1` | Weekly usage progress (0–100) |

See `panel/nextion/README.md` for Editor workflow.

## Regenerating API keys

Use **Regenerate key** in the dashboard if a key is leaked. Update ESPHome secrets and re-flash or OTA.
