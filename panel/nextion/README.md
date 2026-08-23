# Nextion TFT (EU + US portrait)

MaxxMeter requires a custom Nextion UI per hardware profile:

| Profile | Resolution | HMI project | Output TFT |
| --- | --- | --- | --- |
| NSPanel EU | 480×320 landscape | `maxxmeter-eu.HMI` | `maxxmeter_eu.tft` |
| NSPanel US portrait | 320×480 | `maxxmeter-us-portrait.HMI` | `maxxmeter_us_portrait.tft` |

## Build steps

1. Install [Nextion Editor](https://nextion.tech/nextion-editor/)
2. Create pages: `overview`, `detail`, `status`
3. Use shared component names expected by ESPHome (`t0` text, progress bars `j0`/`j1`)
4. Compile → `.tft`
5. Host on GitHub releases or HA `/config/www/`
6. Set `nextion_update_url` in ESPHome and OTA flash

**Note:** HMI source files are placeholders in v0.1 — design the UI in Nextion Editor following the page layout in the project plan. ESPHome currently displays raw JSON on `t0` until TFT pages are completed.

Reference: [NSPanel-Easy TFT upload](https://edwardtfn.github.io/NSPanel-Easy/)
