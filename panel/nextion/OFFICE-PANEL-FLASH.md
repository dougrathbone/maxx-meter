# Office panel TFT — prepare & flash (US portrait)

Target: **office_nspanel** on Home Assistant **`192.168.1.7`**, MaxxMeter profile `panel/esphome/office-panel.yaml`.

## Fast path (config only after prepare)

```powershell
cd D:\Code\token-panel
.\scripts\prepare-office-panel.ps1 -Mode interim
```

Then:

1. Copy the printed local TFT → HA `/config/www/maxxmeter_us_portrait_interim.tft` (File Editor or `\\192.168.1.7\config\www\`).
2. Edit `panel/esphome/secrets.yaml` — fill Wi‑Fi, panel id/key, encryption key, OTA password (URL already set to interim).
3. Flash firmware:

```powershell
cd panel\esphome
esphome run office-panel.yaml
```

4. Open MaxxMeter → Panels / Accounts as needed.

## Full MaxxMeter UI (animated)

1. Install [Nextion Editor](https://nextion.tech/nextion-editor/).
2. Build from [maxxmeter-us-portrait-layout.md](./maxxmeter-us-portrait-layout.md) (includes animations).
3. Save TFT as `panel/nextion/maxxmeter_us_portrait.tft`.
4. Run:

```powershell
.\scripts\prepare-office-panel.ps1 -Mode final
```

5. Copy to `/config/www/maxxmeter_us_portrait.tft`, set `nextion_update_url_us` to the printed final URL, re-run `esphome run office-panel.yaml`.

## USB TFT upload (optional first flash)

```powershell
.\scripts\flash-tft-usb.ps1
.\scripts\flash-tft-usb.ps1 -Port COM3
```

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Still on stock UI | Confirm `/local/maxxmeter_us_portrait_interim.tft` returns 200; secrets URL matches; OTA firmware with `tft_url` |
| OTA rejected | `api_encryption_key` / `ota_password` must match existing `office_nspanel` |
| Bars don't move on interim TFT | Expected — need full MaxxMeter component IDs |
| Wrong orientation | Must be 320×480 portrait |
