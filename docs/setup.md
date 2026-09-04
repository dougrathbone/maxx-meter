# MaxxMeter setup

## Home Assistant add-on

1. In Home Assistant → **Settings** → **Add-ons** → **Add-on store** → **Repositories**
2. Add: `https://github.com/dougrathbone/maxx-meter`
3. Install **MaxxMeter**, configure MQTT/HA token in add-on options
4. Start the add-on and open **MaxxMeter** from the sidebar

Add-on options (MQTT, poll interval, HA token) are applied on **startup** into
`/data/settings.json`. The dashboard Settings tab writes that same file and does
**not** overwrite Supervisor's `/data/options.json`. Leave MQTT password / HA token
blank in add-on options to keep a value already saved in the dashboard.

## Connect accounts

See [connect-accounts.md](./connect-accounts.md) for full steps.

1. Open ingress → **Accounts**
2. Add Claude / Cursor / Kimi accounts
3. **Claude:** click **OAuth Connect** (recommended) or paste a bearer token
4. **Cursor:** paste `WorkosCursorSessionToken` from cursor.com cookies
5. **Kimi:** paste `sk-kimi-*` Coding Plan API key

## Register a panel

1. **Panels** → choose **NSPanel EU** or **US portrait**
2. Select which accounts the panel should display (or leave all unchecked for every account)
3. Copy `panel_id` and `panel_api_key` into ESPHome secrets
4. Flash `panel/esphome/maxxmeter-eu.yaml` or `maxxmeter-us-portrait.yaml`
5. Build and OTA-upload the matching Nextion TFT (see `panel/nextion/README.md`)

## MQTT

Sensors appear under topics:

```
maxxmeter/users/{user_slug}/{account_id}/session_usage/state
maxxmeter/users/{user_slug}/{account_id}/weekly_usage/state
maxxmeter/users/{user_slug}/{account_id}/auth_ok/state
```

Home Assistant MQTT discovery also publishes:

```
homeassistant/sensor/maxxmeter/{user_slug}_{account_id}_session_usage/config
homeassistant/binary_sensor/maxxmeter/{user_slug}_{account_id}_auth_ok/config
```

Optional Lovelace card: [ha-config/packages/maxxmeter_lovelace.yaml](../ha-config/packages/maxxmeter_lovelace.yaml)

## Local development (no HA)

```bash
export MAXXMETER_DATA_DIR=./data
export MAXXMETER_TRUST_ALL_INGRESS=true
export MAXXMETER_DEV_USER_ID=dev
export MAXXMETER_DEV_IS_ADMIN=true
npm run dev
```

Dashboard: `http://localhost:8099` — Panel API: `http://localhost:8765`

## Ingress paths

Home Assistant serves the add-on from `/api/hassio_ingress/<session>/` and strips that prefix
before forwarding, passing it back in the `X-Ingress-Path` header. The add-on injects a
matching `<base href>` into `index.html`, and the dashboard resolves every API call against
`document.baseURI`, so nothing may use root-absolute URLs (`/assets/...`, `/api/...`) — those
resolve against Home Assistant itself and return 404.
