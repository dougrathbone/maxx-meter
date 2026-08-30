# Nextion TFT (EU + US portrait)

MaxxMeter requires a custom Nextion UI per hardware profile:

| Profile | Resolution | HMI project | Output TFT | Layout spec |
| --- | --- | --- | --- | --- |
| NSPanel EU | 480×320 landscape | `maxxmeter-eu.HMI` | `maxxmeter_eu.tft` | [maxxmeter-eu-layout.md](./maxxmeter-eu-layout.md) |
| NSPanel US portrait | 320×480 | `maxxmeter-us-portrait.HMI` | `maxxmeter_us_portrait.tft` | [maxxmeter-us-portrait-layout.md](./maxxmeter-us-portrait-layout.md) |

## Design in Nextion Editor

`.HMI` files are binary and cannot be committed. Use the layout specs above for pixel coordinates, colors, fonts, and the Editor checklist.

**Pages (required names):** `overview`, `detail`, `status`

**ESPHome component contract:**

| Component | Purpose |
| --- | --- |
| `t0` | Account / title label |
| `t1` | Status line (`S:xx% W:yy%`) |
| `t2` | Session reset time (detail) |
| `t3` | Weekly reset time (detail) |
| `t4` | WiFi / link status (status page) |
| `t5` | Last successful poll (status page) |
| `t6` | Provider name (detail) |
| `j0` | Session progress 0–100 (overview) |
| `j1` | Weekly progress 0–100 (overview) |
| `j2` | Session progress mirror (detail) |
| `j3` | Weekly progress mirror (detail) |

Set **vscope: global** on all ESPHome-updated components. Bar fill color (`.pco`) is set at runtime from usage thresholds (green &lt; 70%, yellow 70–89%, red ≥ 90%).

## Compile and upload TFT

1. Install [Nextion Editor](https://nextion.tech/nextion-editor/)
2. Follow the build checklist in the matching layout spec
3. Compile → `.tft`
4. Host the file where the panel can HTTP-download it:
   - **GitHub release** — e.g. `https://github.com/you/maxx-meter/releases/download/v0.1.0/maxxmeter_eu.tft`
   - **Home Assistant** — copy to `/config/www/maxxmeter_eu.tft` → `http://homeassistant.local:8123/local/maxxmeter_eu.tft`
5. Set `nextion_update_url` in the profile YAML (see below) and flash ESPHome

### USB upload (first time)

If OTA TFT upload is not configured yet, use [NSPanel-Easy](https://edwardtfn.github.io/NSPanel-Easy/) or Nextion Editor serial upload, then switch to OTA for updates.

**Office panel walkthrough:** [OFFICE-PANEL-FLASH.md](./OFFICE-PANEL-FLASH.md) — USB flash scripts, HA hosting at `192.168.1.7`, ESPHome secrets.

## Wire `nextion_update_url` in ESPHome

Each profile YAML defines a substitution placeholder. Set it in `secrets.yaml` or override in the profile file:

```yaml
# secrets.yaml
nextion_update_url_eu: "http://homeassistant.local:8123/local/maxxmeter_eu.tft"
nextion_update_url_us: "http://homeassistant.local:8123/local/maxxmeter_us_portrait.tft"
```

Profile files pass this into the display component:

- EU: `panel/esphome/maxxmeter-eu.yaml` → `nextion_update_url: !secret nextion_update_url_eu`
- US: `panel/esphome/maxxmeter-us-portrait.yaml` → `nextion_update_url: !secret nextion_update_url_us`

After flashing firmware, ESPHome can push the TFT over UART when the URL is set. Re-flash or use the ESPHome **Update** action if only the TFT changed.

## Flash firmware

```bash
esphome run panel/esphome/maxxmeter-eu.yaml
# or
esphome run panel/esphome/maxxmeter-us-portrait.yaml
```

Physical buttons: **left** = previous account, **right** = next account. Use TFT touch for the **detail** page.

Reference: [NSPanel-Easy TFT upload](https://edwardtfn.github.io/NSPanel-Easy/)
