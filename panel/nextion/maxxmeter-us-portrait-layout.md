# MaxxMeter US portrait layout — 320×480

Design spec for **Sonoff NSPanel US** (`maxxmeter-us-portrait.HMI` → `maxxmeter_us_portrait.tft`).

Component names and ESPHome contract are **identical** to the EU profile — only positions and sizes change.

All ESPHome-updated components: **vscope: global**.

## Color palette

Same as EU — see [maxxmeter-eu-layout.md](./maxxmeter-eu-layout.md#color-palette).

| Role | Hex |
| --- | --- |
| Background | `#12121A` |
| Card / bar track | `#252538` |
| Text primary | `#E8E8F0` |
| Text muted | `#888899` |
| Accent | `#7C6BF0` |
| Green | `#22C55E` |
| Yellow | `#EAB308` |
| Red | `#EF4444` |

## Typography

| Font ID | Size | Use |
| --- | --- | --- |
| `font0` | 14 | Muted text, status line |
| `font1` | 18 | Section labels |
| `font2` | 24 | Account title |
| `font3` | 30 | Page headers |

---

## Page: `overview` (default / left button)

### Header (static)

| Component | Type | x | y | w | h | Text | Font | pco |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `t_hdr` | Text | 12 | 12 | 200 | 28 | MaxxMeter | font3 | `#7C6BF0` |
| `t_hint` | Text | 180 | 16 | 128 | 20 | Overview | font0 | `#888899` |

### Primary account (ESPHome)

| Component | Type | x | y | w | h | Font | pco | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `t0` | Text | 12 | 52 | 296 | 28 | font2 | `#E8E8F0` | Account label |
| `l_sess` | Text | 12 | 96 | 100 | 20 | Session | font1 | `#888899` |
| `j0` | Progress | 12 | 118 | 296 | 16 | — | — | Session bar |
| `l_week` | Text | 12 | 148 | 100 | 20 | Weekly | font1 | `#888899` |
| `j1` | Progress | 12 | 170 | 296 | 16 | — | — | Weekly bar |
| `t1` | Text | 12 | 198 | 296 | 22 | font0 | `#888899` | `S:xx% W:yy%` |

**Progress:** `min=0`, `max=100`, track `.bco` `#252538`.

### Optional mini-cards (not updated in ESPHome v0.1)

Stacked vertically below status line.

| Component | Type | x | y | w | h | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `card0` | Rectangle | 12 | 232 | 296 | 72 | Fill `#252538` |
| `t10` | Text | 20 | 240 | 280 | 18 | Placeholder label |
| `j10` | Progress | 20 | 264 | 280 | 10 | Mini bar |
| `card1` | Rectangle | 12 | 312 | 296 | 72 | |
| `t11` | Text | 20 | 320 | 280 | 18 | |
| `j11` | Progress | 20 | 344 | 280 | 10 | |
| `card2` | Rectangle | 12 | 392 | 296 | 72 | |
| `t12` | Text | 20 | 400 | 280 | 18 | |
| `j12` | Progress | 20 | 424 | 280 | 10 | |

---

## Page: `detail` (right button)

| Component | Type | x | y | w | h | Font | pco | ESPHome |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `t0` | Text | 12 | 16 | 296 | 32 | font3 | `#E8E8F0` | Account label |
| `t6` | Text | 12 | 52 | 200 | 22 | font0 | `#7C6BF0` | Provider |
| `l_d_sess` | Text | 12 | 88 | 140 | 20 | Session | font1 | `#888899` | Static |
| `j2` | Progress | 12 | 112 | 296 | 24 | — | — | Session (mirror `j0`) |
| `t2` | Text | 12 | 142 | 296 | 18 | font0 | `#888899` | Session reset |
| `l_d_week` | Text | 12 | 172 | 140 | 20 | Weekly | font1 | `#888899` | Static |
| `j3` | Progress | 12 | 196 | 296 | 24 | — | — | Weekly (mirror `j1`) |
| `t3` | Text | 12 | 226 | 296 | 18 | font0 | `#888899` | Weekly reset |

---

## Page: `status`

| Component | Type | x | y | w | h | Font | pco | ESPHome |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `t_hdr2` | Text | 12 | 16 | 200 | 28 | Status | font3 | `#7C6BF0` | Static |
| `t4` | Text | 12 | 56 | 296 | 26 | font1 | `#E8E8F0` | WiFi status |
| `t5` | Text | 12 | 92 | 296 | 22 | font0 | `#888899` | Last update |
| `l_poll` | Text | 12 | 130 | 200 | 18 | Poll: 60s | font0 | `#888899` | Static |
| `t0` | Text | 12 | 420 | 296 | 24 | font0 | `#888899` | Panel label |

---

## Component index

Identical to EU — see [maxxmeter-eu-layout.md — Component index](./maxxmeter-eu-layout.md#component-index-esphome-contract).

---

## Nextion Editor build checklist

1. **New project** → Model: NX3224K028 (or US panel IC) → Orientation: **Portrait** 320×480.
2. **Fonts** — `font0`–`font3` (slightly smaller than EU; see table).
3. **Page `overview`** — Dark background, place `t0`, `j0`, `j1`, `t1`; vscope global on ESPHome components.
4. **Page `detail`** — `t6`, `j2`, `j3`, `t2`, `t3`.
5. **Page `status`** — `t4`, `t5`.
6. **Optional** — Vertical mini-cards `t10`–`t12`.
7. **Compile** → `maxxmeter_us_portrait.tft`.
8. **Upload** — Set `nextion_update_url` in `maxxmeter-us-portrait.yaml`.

### Pre-flash verification

- [ ] Portrait 320×480, pages `overview` / `detail` / `status`
- [ ] Same component IDs as EU spec
- [ ] Progress bars max 100, global vscope
- [ ] GPIO buttons map to overview / detail (see `maxxmeter-base.yaml`)
