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

### Accent strip (animation target)

| Component | Type | x | y | w | h | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `r_accent` | Rectangle | 12 | 44 | 296 | 3 | Fill `#7C6BF0`; breathe target |

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

### Status heartbeat glyph

| Component | Type | x | y | w | h | Text | Font | pco |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `t_heart` | Text | 280 | 16 | 28 | 28 | ● | font1 | `#888899` |

---

## Component index

Identical to EU — see [maxxmeter-eu-layout.md — Component index](./maxxmeter-eu-layout.md#component-index-esphome-contract).

---

## Animations (Nextion-native)

Do **not** rename ESPHome components. Add timers below on the named pages. All timers: **vscope global** where the Editor allows.

Nextion `pco`/`bco` use RGB565, not 24-bit CSS hex.

### Shared variables (Program.s or page globals)

Create numeric globals:

| Name | Initial | Purpose |
| --- | --- | --- |
| `va_breathe` | 0 | Boot breathe cycle counter |
| `va_bar_step` | 0 | Bar settle step 0–8 |
| `va_j0_target` | 0 | Session % captured when the overview page opens |
| `va_j1_target` | 0 | Weekly % captured when the overview page opens |
| `va_j0_crit` | 0 | Session critical pulse toggle |
| `va_j1_crit` | 0 | Weekly critical pulse toggle |
| `va_heart` | 0 | Heartbeat toggle |

> ESPHome overwrites `j0`/`j1` on poll. Bar settle is cosmetic on page show; overwrites mid-animation are OK.

### Timers

| Timer ID | Page | Period | Role |
| --- | --- | --- | --- |
| `tm_breathe` | `overview` | 200 ms | Accent breathe (~3 cycles ≈ 800 ms feel via color toggle every 200 ms × 8 ticks) |
| `tm_bar` | `overview` | 50 ms | Bar settle 0→target over ~400 ms (8 steps) |
| `tm_crit` | `overview` | 400 ms | Pulse red on `j0`/`j1` when val ≥ 90 |
| `tm_heart` | `status` | 1000 ms | Blink `t_heart` every ~2 s (toggle each tick; visible every other) |

### `overview` Preinitialize / show events

**Page `overview` → Event → Postinitialize:**

```
va_breathe.val=0
va_bar_step.val=0
va_j0_crit.val=0
va_j1_crit.val=0
va_j0_target.val=j0.val
va_j1_target.val=j1.val
j0.val=0
j1.val=0
t0.pco=0x8C53
tm_breathe.en=1
tm_bar.en=1
tm_crit.en=1
```

**`tm_breathe` Timer Event:**

```
if(va_breathe.val<8)
{
  if(va_breathe.val%2==0)
  {
    t_hdr.pco=0x7B5E
    r_accent.bco=0x7B5E
  }else
  {
    t_hdr.pco=0x4A10
    r_accent.bco=0x4A10
  }
  va_breathe.val++
}else
{
  t_hdr.pco=0x7B5E
  r_accent.bco=0x7B5E
  tm_breathe.en=0
}
```

**`tm_bar` Timer Event:**

```
if(va_bar_step.val<8)
{
  va_bar_step.val++
  j0.val=va_j0_target.val*va_bar_step.val/8
  j1.val=va_j1_target.val*va_bar_step.val/8
  // Soft enter for title
  if(va_bar_step.val==2)
  {
    t0.pco=0xEF5E
  }
}else
{
  tm_bar.en=0
}
```

**`tm_crit` Timer Event:**

```
if(j0.val>=90)
{
  if(va_j0_crit.val==0)
  {
    j0.pco=0xEA28
    va_j0_crit.val=1
  }else
  {
    j0.pco=0x98C3
    va_j0_crit.val=0
  }
}else
{
  va_j0_crit.val=0
}
if(j1.val>=90)
{
  if(va_j1_crit.val==0)
  {
    j1.pco=0xEA28
    va_j1_crit.val=1
  }else
  {
    j1.pco=0x98C3
    va_j1_crit.val=0
  }
}else
{
  va_j1_crit.val=0
}
```

### `detail` soft page enter

**Page `detail` → Preinitialize:**

```
t0.pco=0x8C53
```

**Page `detail` → Timer `tm_bar` (reuse or add page-local 50 ms, 3 ticks) / or Postinitialize delay via `tm_bar`:**

```
t0.pco=0xEF5E
```

Simplest: in `detail` Preinitialize set `t0.pco=0x8C53`, then enable a page timer `tm_bar` for one 80 ms tick that sets `t0.pco=0xEF5E` and disables itself.

### `status` heartbeat

**Page `status` → Preinitialize:**

```
t_heart.txt="●"
t_heart.pco=0x8C53
va_heart.val=0
tm_heart.en=1
```

**`tm_heart` Timer Event:**

```
if(va_heart.val==0)
{
  t_heart.pco=0x262B
  va_heart.val=1
}else
{
  t_heart.pco=0x8C53
  va_heart.val=0
}
```

Disable `tm_heart` only if you add offline UI later; for v0.1 leave enabled on status page.

## Nextion Editor build checklist

1. **New project** → model matching US NSPanel (often NX3224K028 / panel IC) → **Portrait** 320×480, background `#12121A`.
2. **Fonts** — create `font0`–`font3` per Typography table.
3. **Page `overview`** — place static header `t_hdr`, `t_hint`, accent `r_accent`, ESPHome `t0`,`l_sess`,`j0`,`l_week`,`j1`,`t1` (vscope **global** on ESPHome components). Progress `min=0` `max=100`, track `.bco` `#252538`.
4. **Page `detail`** — `t0`,`t6`,`j2`,`j3`,`t2`,`t3` (+ static labels); vscope global on ESPHome comps.
5. **Page `status`** — `t_hdr2`,`t4`,`t5`,`l_poll`,`t_heart`,`t0`.
6. **Globals + timers** — create `va_*` and `tm_breathe`,`tm_bar`,`tm_crit`,`tm_heart` per Animations section; paste Event code.
7. **Optional** mini-cards `t10`–`t12` / `j10`–`j12`.
8. **Compile** → File → TFT file output → save as `panel/nextion/maxxmeter_us_portrait.tft`.
9. **Host** → `.\scripts\prepare-office-panel.ps1 -Mode final` and copy to HA www.

### Pre-flash verification

- [ ] Portrait 320×480; pages named exactly `overview`, `detail`, `status`
- [ ] ESPHome IDs present with global vscope: `t0`–`t6`, `j0`–`j3`
- [ ] Progress bars max 100
- [ ] Timers `tm_breathe`, `tm_bar`, `tm_crit`, `tm_heart` behave in Editor debug/simulator
- [ ] Boot breathe stops after ~3 cycles; heartbeat blinks on status
- [ ] Output filename `maxxmeter_us_portrait.tft`
