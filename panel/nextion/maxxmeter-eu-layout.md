# MaxxMeter EU layout — 480×320 landscape

Design spec for **Sonoff NSPanel EU** (`maxxmeter-eu.HMI` → `maxxmeter_eu.tft`).

All components updated by ESPHome must use **vscope: global** in Nextion Editor so values persist across page changes.

## Color palette

| Role | Hex | Nextion Editor (RGB) | Usage |
| --- | --- | --- | --- |
| Background | `#12121A` | 18,18,26 | Page `.bco` |
| Card / bar track | `#252538` | 37,37,56 | Progress bar `.bco`, card rects |
| Text primary | `#E8E8F0` | 232,232,240 | Titles, values |
| Text muted | `#888899` | 136,136,153 | Labels, hints |
| Accent | `#7C6BF0` | 124,107,240 | "MaxxMeter" header |
| Green (OK) | `#22C55E` | 34,197,94 | Bar fill &lt; 70% |
| Yellow (warn) | `#EAB308` | 234,179,8 | Bar fill 70–89% |
| Red (critical) | `#EF4444` | 239,68,68 | Bar fill ≥ 90% |

Thresholds match server defaults: **warn 70%**, **critical 90%** (ESPHome sets bar `.pco` at runtime).

## Typography

| Font ID | Size | Style | Use |
| --- | --- | --- | --- |
| `font0` | 16 | Regular | Muted labels, status line |
| `font1` | 20 | Bold | Section headers, bar captions |
| `font2` | 28 | Bold | Account title (`t0`) |
| `font3` | 36 | Bold | Detail page title |

Create fonts in Editor → Font Generator (ASCII). Assign per component below.

---

## Page: `overview` (default / left button)

Primary usage view. Shows first account from API (multi-account mini-cards are optional; see bottom).

### Header (static)

| Component | Type | x | y | w | h | Text | Font | pco | bco |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `t_hdr` | Text | 16 | 8 | 200 | 32 | MaxxMeter | font3 | `#7C6BF0` | transparent |
| `t_hint` | Text | 300 | 14 | 164 | 24 | Overview | font0 | `#888899` | transparent |

### Primary account (ESPHome)

| Component | Type | x | y | w | h | Font | pco | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `t0` | Text | 16 | 52 | 448 | 32 | font2 | `#E8E8F0` | Account label (API `label`) |
| `l_sess` | Text | 16 | 96 | 120 | 24 | Session | font1 | `#888899` | Static label |
| `l_week` | Text | 16 | 156 | 120 | 24 | Weekly | font1 | `#888899` | Static label |
| `j0` | Progress | 16 | 122 | 448 | 18 | — | — | Session 0–100; `.bco` track `#252538`, `.pco` set by ESPHome |
| `j1` | Progress | 16 | 182 | 448 | 18 | — | — | Weekly 0–100 |
| `t1` | Text | 16 | 212 | 448 | 24 | font0 | `#888899` | `S:xx% W:yy%` |

**Progress bar settings:** `min=0`, `max=100`, `direction=0` (left→right), `vscope=global`.

### Optional mini-cards (up to 3 accounts — not updated in ESPHome v0.1)

Place below `t1` when you want a static mock-up; wire in a future firmware release.

| Component | Type | x | y | w | h | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `card0` | Rectangle | 16 | 248 | 144 | 56 | Fill `#252538`, radius 6 |
| `t10` | Text | 24 | 254 | 128 | 20 | Account 2 label placeholder |
| `j10` | Progress | 24 | 278 | 128 | 10 | Mini session bar |
| `card1` | Rectangle | 168 | 248 | 144 | 56 | |
| `t11` | Text | 176 | 254 | 128 | 20 | Account 3 label |
| `j11` | Progress | 176 | 278 | 128 | 10 | |
| `card2` | Rectangle | 320 | 248 | 144 | 56 | |
| `t12` | Text | 328 | 254 | 128 | 20 | Account 4 label |
| `j12` | Progress | 328 | 278 | 128 | 10 | |

---

## Page: `detail` (right button)

Larger bars and reset-time placeholders for the primary account.

| Component | Type | x | y | w | h | Font | pco | ESPHome |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `t0` | Text | 16 | 16 | 448 | 36 | font3 | `#E8E8F0` | Account label (shared global) |
| `t6` | Text | 16 | 56 | 200 | 24 | font0 | `#7C6BF0` | Provider (`claude` / `cursor` / `kimi`) |
| `l_d_sess` | Text | 16 | 96 | 160 | 24 | Session | font1 | `#888899` | Static |
| `j2` | Progress | 16 | 124 | 448 | 28 | — | — | Mirrors `j0` value + color |
| `t2` | Text | 16 | 158 | 448 | 20 | font0 | `#888899` | Session reset (`resetsAt` or `—`) |
| `l_d_week` | Text | 16 | 188 | 160 | 24 | Weekly | font1 | `#888899` | Static |
| `j3` | Progress | 16 | 216 | 448 | 28 | — | — | Mirrors `j1` value + color |
| `t3` | Text | 16 | 250 | 448 | 20 | font0 | `#888899` | Weekly reset |

---

## Page: `status`

Connectivity and poll metadata. Reach via Editor debug or add a third button later.

| Component | Type | x | y | w | h | Font | pco | ESPHome |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `t_hdr2` | Text | 16 | 16 | 300 | 32 | Status | font3 | `#7C6BF0` | Static |
| `t4` | Text | 16 | 64 | 448 | 28 | font1 | `#E8E8F0` | WiFi / link status |
| `t5` | Text | 16 | 104 | 448 | 24 | font0 | `#888899` | Last successful poll |
| `l_poll` | Text | 16 | 148 | 200 | 20 | Poll interval | font0 | `#888899` | Static: "Every 60s" |
| `t0` | Text | 16 | 280 | 448 | 28 | font0 | `#888899` | Panel label fallback |

---

## Component index (ESPHome contract)

| Name | Page(s) | Updated by ESPHome | Purpose |
| --- | --- | --- | --- |
| `t0` | all | yes | Account / title label |
| `t1` | overview | yes | `S:xx% W:yy%` |
| `t2` | detail | yes | Session reset time |
| `t3` | detail | yes | Weekly reset time |
| `t4` | status | yes | WiFi status |
| `t5` | status | yes | Last update time |
| `t6` | detail | yes | Provider name |
| `j0` | overview | yes | Session bar 0–100 |
| `j1` | overview | yes | Weekly bar 0–100 |
| `j2` | detail | yes | Session bar (mirror) |
| `j3` | detail | yes | Weekly bar (mirror) |
| `t10`–`t12`, `j10`–`j12` | overview | no | Future multi-account cards |

---

## Nextion Editor build checklist

1. **New project** → Model: NX4832K035 (or your NSPanel EU panel IC) → Orientation: **Landscape** 480×320.
2. **Fonts** — Generate `font0`–`font3` per table above.
3. **Page `overview`** — Add page, set `.bco` to `#12121A`. Place header texts, then `t0`, labels, `j0`, `j1`, `t1`. Set each ESPHome component to **vscope: global**.
4. **Progress bars** — `j0`/`j1`: min 0, max 100, track `.bco` `#252538`, initial `.pco` green. Repeat for `j2`/`j3` on detail page.
5. **Page `detail`** — Add components per table; share global `t0`.
6. **Page `status`** — Add `t4`, `t5`, static labels.
7. **Optional mini-cards** — Rectangles + `t10`–`t12` if desired.
8. **Compile** → `maxxmeter_eu.tft`.
9. **Upload** — Host TFT and set `nextion_update_url` in ESPHome (see `README.md`).

### Pre-flash verification

- [ ] Page names exactly: `overview`, `detail`, `status`
- [ ] Component IDs match table (case-sensitive)
- [ ] `j0`–`j3` vscope global, max 100
- [ ] Left GPIO button sends `page overview` (already in `maxxmeter-base.yaml`)
- [ ] Right GPIO button sends `page detail`
