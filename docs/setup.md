# MaxxMeter setup

## Home Assistant add-on

1. In Home Assistant → **Settings** → **Add-ons** → **Add-on store** → **Repositories**
2. Add: `https://github.com/YOUR_GITHUB_USER/maxx-meter`
3. Install **MaxxMeter**, configure MQTT/HA token in add-on options
4. Start the add-on and open **MaxxMeter** from the sidebar

## Connect accounts

1. Open ingress → **Accounts**
2. Add Claude / Cursor / Kimi accounts
3. Paste OAuth token or session cookie (OAuth PKCE flows coming soon)
   - **Claude:** OAuth bearer or session key → `api.anthropic.com/api/oauth/usage`
   - **Cursor:** `WorkosCursorSessionToken` from cursor.com dashboard cookies
   - **Kimi:** `sk-kimi-*` Coding Plan API key

## Register a panel

1. **Panels** → choose **NSPanel EU** or **US portrait**
2. Copy `panel_id` and `panel_api_key` into ESPHome secrets
3. Flash `panel/esphome/maxxmeter-eu.yaml` or `maxxmeter-us-portrait.yaml`
4. Build and OTA-upload the matching Nextion TFT (see `panel/nextion/README.md`)

## MQTT

Sensors appear under topics:

```
maxxmeter/users/{user_slug}/{account_id}/session_usage/state
maxxmeter/users/{user_slug}/{account_id}/weekly_usage/state
```

## Local development (no HA)

```bash
export MAXXMETER_DATA_DIR=./data
export MAXXMETER_TRUST_ALL_INGRESS=true
export MAXXMETER_DEV_USER_ID=dev
npm run dev
```
