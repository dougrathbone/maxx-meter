# Office panel TFT prep + animated US portrait UI

**Date:** 2026-09-05  
**Status:** Approved (conversation) — pending user review of this written spec  
**Scope:** Prepare MaxxMeter US portrait TFT path for `office_nspanel` so the operator only fills config; interim TFT hosting; animated Nextion layout for the real MaxxMeter UI.

## Goal

Get the office NSPanel off the default/stock TFT and ready for MaxxMeter:

1. **Interim** — host a flashable US portrait TFT on Home Assistant so the panel can leave stock UI immediately.
2. **Full UI** — complete animated US portrait layout + build checklist so one Nextion Editor compile produces `maxxmeter_us_portrait.tft`.
3. **Config-only finish** — scripts and templates leave Wi‑Fi, panel API credentials, and ESPHome encryption/OTA secrets as the only required operator input.

## Non-goals

- Generating a proprietary `.HMI` / `.tft` binary without Nextion Editor (formats are closed; not reliable).
- Changing the ESPHome ↔ Nextion component contract (`t0`–`t6`, `j0`–`j3`, pages `overview` / `detail` / `status`).
- EU landscape TFT work in this pass (docs may mention parity; implementation targets US portrait / office panel).
- Connecting AI provider accounts (operator does that in MaxxMeter ingress after firmware works).

## Context

| Item | Value |
|------|--------|
| HA host | `192.168.1.7` |
| ESPHome device name | `office_nspanel` |
| Profile | US portrait 320×480 |
| Profile YAML | `panel/esphome/office-panel.yaml` |
| Starter interim TFT | `panel/nextion/starter/nspanel_portrait.tft` |
| Layout spec | `panel/nextion/maxxmeter-us-portrait-layout.md` |
| Secrets template | `panel/esphome/secrets.example.yaml` |

There is **no** compiled MaxxMeter `.tft` in the repo today. ESPHome uses `tft_url: ${nextion_update_url}` from secrets.

## Architecture

```
┌─────────────────┐     prepare script      ┌──────────────────────────┐
│ Local repo      │ ──────────────────────► │ HA /config/www/          │
│ starter/*.tft   │   (copy instructions /  │ maxxmeter_us_portrait*.  │
│ + built TFT     │    optional upload)     │ tft                      │
└─────────────────┘                         └────────────┬─────────────┘
                                                         │ HTTP
┌─────────────────┐     secrets.yaml        ┌────────────▼─────────────┐
│ Operator config │ ──────────────────────► │ office_nspanel ESPHome   │
│ wifi, keys, ids │                         │ nextion tft_url + poller │
└─────────────────┘                         └────────────┬─────────────┘
                                                         │ UART
                                                         ▼
                                              Nextion display (TFT)
```

**Phases**

1. **Prep kit** — templates, scripts, docs aligned on US portrait + office device name.  
2. **Interim host** — `nspanel_portrait.tft` published as `maxxmeter_us_portrait_interim.tft` on HA www.  
3. **Animated layout** — Nextion-native timers/effects documented in the US layout spec + checklist.  
4. **Operator** — install Nextion Editor, compile real TFT, replace interim URL in secrets, flash/OTA ESPHome once.

## Components

### 1. Secrets template (`panel/esphome/secrets.example.yaml`)

Must document clearly:

| Key | Purpose |
|-----|---------|
| `wifi_ssid` / `wifi_password` | Operator |
| `collector_host` | Default `192.168.1.7` |
| `panel_id` / `panel_api_key` / `panel_api_key_bearer` | From MaxxMeter → Panels |
| `api_encryption_key` / `ota_password` | From existing `office_nspanel` ESPHome config (must match for OTA) |
| `nextion_update_url_us` | Interim URL first; switch to final TFT URL after compile |

Interim URL shape:

`http://192.168.1.7:8123/local/maxxmeter_us_portrait_interim.tft`

Final URL shape:

`http://192.168.1.7:8123/local/maxxmeter_us_portrait.tft`

Do not commit real `secrets.yaml`.

### 2. Prepare script (`scripts/prepare-office-panel.ps1`)

Single entry point that:

1. Verifies starter interim TFT exists (and optional built `maxxmeter_us_portrait.tft` if present).
2. Prints exact copy destinations for HA `/config/www/`.
3. Optionally invokes/extends hosting helper for US naming.
4. Writes or refreshes a **local** `secrets.yaml` from the example **only if missing**, preserving existing values when re-run.
5. Prints a short “fill these keys” checklist and the ESPHome run command for `office-panel.yaml`.

Does **not** require Supervisor API (known 401 for some tokens). File copy to HA may remain Samba/File Editor; script documents that path and verifies the public HTTP URL when reachable.

### 3. Host helper (`scripts/host-tft-on-ha.ps1`)

Update defaults/docs for US portrait:

- Default remote name: `maxxmeter_us_portrait.tft` (or accept `-RemoteName`).
- Support interim vs final via parameters.
- Keep EU usable via explicit `-RemoteName` / `-TftPath`.

### 4. Docs

Update:

- `panel/nextion/OFFICE-PANEL-FLASH.md` — US-first, interim then full, office device name.
- `panel/nextion/README.md` — point to animations section + prepare script.
- `panel/nextion/maxxmeter-us-portrait-layout.md` — animation timers + build checklist.

### 5. Animated Nextion UI (layout spec only in-repo)

All motion is **Nextion-native** (page timers / component attributes). ESPHome continues to set text and bar values; cosmetics do not require new component IDs.

| Motion | Behavior |
|--------|----------|
| Boot breathe | On `overview` show: accent header / accent strip pulses ~3 cycles (~800ms) via timer |
| Bar settle | On `overview` show: `j0`/`j1` step from 0 toward last value over ~400ms (timer); ESPHome may overwrite mid-animation — acceptable |
| Soft page enter | `t0` brief fade-in / visibility ramp on overview and detail show |
| Critical pulse | When bar val ≥ 90, that progress `.pco` pulses red via timer; stop when val &lt; 90 |
| Status heartbeat | On `status`, muted “●” or last-update line blink ~2s while “online” text is shown |

**Constraints**

- Pages remain `overview`, `detail`, `status`.
- ESPHome-updated components stay **vscope: global** with IDs above.
- Palette stays MaxxMeter dark theme from existing layout.
- No new ESPHome lambda dependencies for animations in this pass.

Timer / event naming in the checklist must be explicit (e.g. `tm_breathe`, `tm_bar`, `tm_crit`, `tm_heart`) so a human can build once in Nextion Editor without inventing IDs.

## Operator finish line (config only)

After prep kit lands, operator:

1. Copy interim (then final) TFT into HA `www` as instructed by the prepare script.
2. Create `panel/esphome/secrets.yaml` and fill placeholders.
3. Build `maxxmeter_us_portrait.tft` in Nextion Editor from the updated checklist (one-time).
4. `esphome run office-panel.yaml` (OTA) with matching encryption/OTA secrets.
5. Connect accounts in MaxxMeter ingress.

## Error handling

| Failure | Handling |
|---------|----------|
| Interim TFT missing | Prepare script exits with path to download/restore starter |
| HA `/local/...tft` 404 | Script/docs: verify File Editor/Samba copy; do not claim success |
| OTA ESPHome fails | Docs: encryption key / ota password must match existing device |
| Wrong orientation TFT | Checklist: 320×480 portrait only for office panel |
| Bars don’t move after interim TFT | Expected until MaxxMeter component IDs exist; full TFT required |

## Testing

- Prepare script dry-run on Windows: prints correct paths/URLs; does not overwrite filled secrets.
- HTTP HEAD/GET `http://192.168.1.7:8123/local/maxxmeter_us_portrait_interim.tft` after operator copies file.
- Layout checklist self-contained: someone can build HMI without reading ESPHome YAML.
- No change to existing vitest suite required unless scripts grow testable pure helpers (optional).

## Implementation order

1. Secrets example + host/prepare scripts (US defaults).
2. OFFICE-PANEL-FLASH + README updates.
3. Animated US portrait layout + Nextion Editor checklist.
4. Smoke: prepare script output; confirm interim file staging instructions.

## Success criteria

- Operator can leave stock TFT via interim hosted file + ESPHome `nextion_update_url_us`.
- Animated MaxxMeter US layout is complete enough to compile without further design decisions.
- Only config values remain as operator-filled secrets; no ambiguous “pick a URL” steps.
