# Compile & upload TFT — office panel quick guide

This guide covers your **office NSPanel** on HA **`192.168.1.7`**.

## What you need

| Item | Status |
|------|--------|
| Nextion Editor (Windows) | [Download v1.68.1](https://nextion.tech/nextion-editor/) — not in winget |
| USB data cable to panel | Required for first TFT flash (COM port) |
| MaxxMeter add-on running on HA | Ingress → Panels → register **Office panel** |
| ESPHome flashed with MaxxMeter YAML | `panel/esphome/maxxmeter-eu.yaml` (EU) or `-us-portrait` (US) |

## Step 1 — Build the TFT (Nextion Editor)

There is **no pre-built MaxxMeter `.tft` in the repo yet**. Use the layout spec:

- EU (480×320): [maxxmeter-eu-layout.md](./maxxmeter-eu-layout.md)
- US portrait: [maxxmeter-us-portrait-layout.md](./maxxmeter-us-portrait-layout.md)

**Fast path using NSPanel-Easy blank** (already downloaded to `starter/`):

1. Install Nextion Editor
2. Open `panel/nextion/starter/nspanel_blank.hmi`
3. Rename pages to **`overview`**, **`detail`**, **`status`** (Page attributes → name)
4. Confirm components **`t0`, `t1`, `j0`, `j1`, `j2`, `j3`, `t2`–`t6`** exist with **vscope: global**
5. **File → TFT file output** → compile → save as `maxxmeter_eu.tft`

Checklist: [maxxmeter-eu-layout.md — build checklist](./maxxmeter-eu-layout.md#nextion-editor-build-checklist)

## Step 2 — Flash TFT over USB (panel attached to this PC)

```powershell
cd D:\Code\token-panel
.\scripts\flash-tft-usb.ps1          # lists COM ports
.\scripts\flash-tft-usb.ps1 -Port COM3
```

If upload fails:

- Use a **data** USB cable (not charge-only)
- Try **115200** baud (default); retry with `-Baud 9600`
- Power on panel while **holding left button** to enter UART upload mode
- Close anything else using the COM port (ESPHome logs, Nextion Editor upload)

**Interim option:** `starter/nspanel_blank.tft` has `t0`/`j0`/`j1` but wrong page names — OK for testing usage text before you finish the full MaxxMeter UI.

## Step 3 — Host TFT on Home Assistant (for OTA updates)

```powershell
.\scripts\host-tft-on-ha.ps1 -HaHost 192.168.1.7
```

Then upload `maxxmeter_eu.tft` to **`/config/www/maxxmeter_eu.tft`** via:

- **File Editor** add-on, or
- **Samba** `\\192.168.1.7\config\www\`

Verify: `http://192.168.1.7:8123/local/maxxmeter_eu.tft`

## Step 4 — ESPHome secrets (office panel)

Create `panel/esphome/secrets.yaml` (from `secrets.example.yaml`):

```yaml
wifi_ssid: "YOUR_WIFI"
wifi_password: "YOUR_WIFI_PASSWORD"
collector_host: "192.168.1.7"
panel_id: "PASTE_FROM_MAXXMETER_DASHBOARD"
panel_api_key: "PASTE_FROM_MAXXMETER_DASHBOARD"
panel_api_key_bearer: "Bearer PASTE_SAME_KEY"
nextion_update_url_eu: "http://192.168.1.7:8123/local/maxxmeter_eu.tft"
api_encryption_key: "GENERATE_IN_ESPHOME"
ota_password: "choose-a-password"
```

Get **panel_id** and **api_key** from HA → **MaxxMeter** → **Panels** → your Office panel card.

## Step 5 — Flash / OTA ESPHome firmware

```powershell
cd D:\Code\token-panel\panel\esphome
esphome run maxxmeter-eu.yaml
```

Or use **ESPHome Dashboard** on HA (Settings → Add-ons → ESPHome) if the device is already adopted.

After firmware with `tft_url` is running, ESPHome pushes the TFT from HA www on boot.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| COM3 not listed | Re-plug USB; check Device Manager → Ports |
| HA `:8765` unreachable from panel | MaxxMeter add-on must be running; use `collector_host: 192.168.1.7` |
| Blank screen after flash | Wrong profile (EU vs US) or TFT model mismatch — use NX4832K035 480×320 for EU |
| Bars don't move | Connect accounts in MaxxMeter ingress; check panel API key in secrets |
