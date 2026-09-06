# Office Panel TFT Prep Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare the office US-portrait NSPanel so the operator only fills secrets; host an interim TFT on HA; and document an animated MaxxMeter Nextion layout ready to compile.

**Architecture:** Config templates + PowerShell prep/host scripts stage TFT files for Home Assistant `/config/www/` and scaffold `secrets.yaml`. Animated UI lives only in the US portrait layout markdown (Nextion-native timers). No ESPHome component-contract changes; no binary `.HMI` generation.

**Tech Stack:** PowerShell, ESPHome YAML secrets, Nextion Editor (operator), markdown layout specs, Home Assistant local www (`/local/*.tft`).

## Global Constraints

- HA host default: `192.168.1.7`
- ESPHome device name: `office_nspanel`
- Profile YAML: `panel/esphome/office-panel.yaml`
- Interim local TFT: `panel/nextion/starter/nspanel_portrait.tft`
- Interim HA name: `maxxmeter_us_portrait_interim.tft`
- Final HA name: `maxxmeter_us_portrait.tft`
- Interim URL: `http://192.168.1.7:8123/local/maxxmeter_us_portrait_interim.tft`
- Final URL: `http://192.168.1.7:8123/local/maxxmeter_us_portrait.tft`
- ESPHome contract unchanged: pages `overview`/`detail`/`status`; components `t0`–`t6`, `j0`–`j3`; vscope global
- Do not commit real `panel/esphome/secrets.yaml`
- Do not require Supervisor API
- Animations are Nextion-native only (no new ESPHome lambda for cosmetics)
- Timer IDs must be explicit: `tm_breathe`, `tm_bar`, `tm_crit`, `tm_heart`

## File Structure

| File | Responsibility |
|------|----------------|
| `panel/esphome/secrets.example.yaml` | Operator template with interim/final URL comments |
| `scripts/host-tft-on-ha.ps1` | US-default hosting instructions + URL verify |
| `scripts/prepare-office-panel.ps1` | Single entry: verify TFT, scaffold secrets, print checklist |
| `panel/nextion/OFFICE-PANEL-FLASH.md` | US-first operator walkthrough |
| `panel/nextion/README.md` | Point to prepare script + animations |
| `panel/nextion/maxxmeter-us-portrait-layout.md` | Full animated layout + Editor checklist |
| `docs/superpowers/specs/2026-09-05-office-panel-tft-prep-design.md` | Spec (already written; mark implemented when done) |

---

### Task 1: Secrets example for US interim/final URLs

**Files:**
- Modify: `panel/esphome/secrets.example.yaml`

**Interfaces:**
- Consumes: none
- Produces: example keys that `prepare-office-panel.ps1` copies when scaffolding secrets

- [ ] **Step 1: Replace `secrets.example.yaml` with US-first template**

Write the full file:

```yaml
# Copy to secrets.yaml (or run scripts/prepare-office-panel.ps1)
# Fill every YOUR_* / paste-* value. Do not commit secrets.yaml.

wifi_ssid: "YOUR_WIFI"
wifi_password: "YOUR_WIFI_PASSWORD"

collector_host: "192.168.1.7"

# MaxxMeter ingress → Panels → Office panel
panel_id: "panel_xxx"
panel_api_key: "xxx"
panel_api_key_bearer: "Bearer xxx"

# Must match existing office_nspanel ESPHome config (OTA will fail if wrong)
api_encryption_key: "paste-existing-key"
ota_password: "paste-existing-ota-password"

# TFT OTA URL (US portrait only for office-panel.yaml)
# Interim (stock-replacement starter hosted on HA):
nextion_update_url_us: "http://192.168.1.7:8123/local/maxxmeter_us_portrait_interim.tft"
# After Nextion Editor compile, switch to:
# nextion_update_url_us: "http://192.168.1.7:8123/local/maxxmeter_us_portrait.tft"

# EU profile only (unused by office-panel.yaml):
# nextion_update_url_eu: "http://192.168.1.7:8123/local/maxxmeter_eu.tft"
```

- [ ] **Step 2: Confirm office-panel still references the US secret**

Run: `Select-String -Path panel/esphome/office-panel.yaml -Pattern "nextion_update_url"`
Expected: line containing `!secret nextion_update_url_us`

- [ ] **Step 3: Commit**

```bash
git add panel/esphome/secrets.example.yaml
git commit -m "Point office-panel secrets example at HA-hosted US portrait TFT URLs."
```

---

### Task 2: Update host-tft-on-ha.ps1 for US defaults

**Files:**
- Modify: `scripts/host-tft-on-ha.ps1`

**Interfaces:**
- Consumes: local TFT path, HA host, remote filename
- Produces: printed copy instructions + optional HTTP check; exit 0 on success, non-zero if TFT missing

- [ ] **Step 1: Rewrite `scripts/host-tft-on-ha.ps1`**

```powershell
# Host a TFT on Home Assistant www and print the URL for ESPHome nextion_update_url
#
# US portrait (office) defaults:
#   .\scripts\host-tft-on-ha.ps1 -Mode interim
#   .\scripts\host-tft-on-ha.ps1 -Mode final
# EU:
#   .\scripts\host-tft-on-ha.ps1 -TftPath panel\nextion\starter\nspanel_blank.tft -RemoteName maxxmeter_eu.tft -SecretKey nextion_update_url_eu

param(
  [string]$HaHost = "192.168.1.7",
  [ValidateSet("interim", "final", "custom")]
  [string]$Mode = "interim",
  [string]$TftPath = "",
  [string]$RemoteName = "",
  [string]$SecretKey = "nextion_update_url_us",
  [switch]$SkipVerify
)

$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")

switch ($Mode) {
  "interim" {
    if (-not $TftPath) {
      $TftPath = Join-Path $Root "panel\nextion\starter\nspanel_portrait.tft"
    }
    if (-not $RemoteName) { $RemoteName = "maxxmeter_us_portrait_interim.tft" }
  }
  "final" {
    if (-not $TftPath) {
      $TftPath = Join-Path $Root "panel\nextion\maxxmeter_us_portrait.tft"
    }
    if (-not $RemoteName) { $RemoteName = "maxxmeter_us_portrait.tft" }
  }
  "custom" {
    if (-not $TftPath -or -not $RemoteName) {
      Write-Error "Mode custom requires -TftPath and -RemoteName"
    }
  }
}

if (-not (Test-Path $TftPath)) {
  Write-Error "TFT not found: $TftPath"
}

$Url = "http://${HaHost}:8123/local/$RemoteName"
$SizeKb = [math]::Round((Get-Item $TftPath).Length / 1KB, 1)

Write-Host ""
Write-Host "=== Home Assistant TFT hosting ($Mode) ==="
Write-Host ""
Write-Host "1. Copy TFT to HA www folder:"
Write-Host "   Local: $TftPath ($SizeKb KB)"
Write-Host "   HA:    /config/www/$RemoteName"
Write-Host ""
Write-Host "   Via File Editor add-on, or Samba: \\${HaHost}\config\www\"
Write-Host ""
Write-Host "2. Verify: $Url"
Write-Host ""
Write-Host "3. In panel/esphome/secrets.yaml:"
Write-Host "   ${SecretKey}: `"$Url`""
Write-Host ""
Write-Host "4. OTA flash ESPHome so the panel downloads the TFT:"
Write-Host "   cd panel\esphome"
Write-Host "   esphome run office-panel.yaml"
Write-Host ""

if (-not $SkipVerify) {
  try {
    $resp = Invoke-WebRequest -Uri $Url -Method Head -TimeoutSec 8 -UseBasicParsing
    Write-Host "URL check: HTTP $($resp.StatusCode) (reachable)"
  } catch {
    Write-Host "URL check: not reachable yet (copy the file to HA www, then re-run)."
    Write-Host "  $($_.Exception.Message)"
  }
}
```

- [ ] **Step 2: Dry-run interim mode**

Run: `powershell -File scripts/host-tft-on-ha.ps1 -Mode interim -SkipVerify`
Expected: prints local path ending in `nspanel_portrait.tft`, remote `maxxmeter_us_portrait_interim.tft`, secret key `nextion_update_url_us`

- [ ] **Step 3: Commit**

```bash
git add scripts/host-tft-on-ha.ps1
git commit -m "Default TFT hosting helper to US portrait interim/final modes."
```

---

### Task 3: Create prepare-office-panel.ps1

**Files:**
- Create: `scripts/prepare-office-panel.ps1`

**Interfaces:**
- Consumes: `secrets.example.yaml`, starter interim TFT, optional built final TFT, `host-tft-on-ha.ps1`
- Produces: scaffolds `panel/esphome/secrets.yaml` only when missing; prints operator checklist; exit 1 if interim TFT missing

- [ ] **Step 1: Write `scripts/prepare-office-panel.ps1`**

```powershell
# Prepare office US portrait panel: stage TFT instructions + secrets scaffold.
# Operator only fills secrets.yaml values after this runs.
#
# Usage:
#   .\scripts\prepare-office-panel.ps1
#   .\scripts\prepare-office-panel.ps1 -HaHost 192.168.1.7 -Mode interim

param(
  [string]$HaHost = "192.168.1.7",
  [ValidateSet("interim", "final")]
  [string]$Mode = "interim"
)

$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$EsphomeDir = Join-Path $Root "panel\esphome"
$ExampleSecrets = Join-Path $EsphomeDir "secrets.example.yaml"
$SecretsPath = Join-Path $EsphomeDir "secrets.yaml"
$InterimTft = Join-Path $Root "panel\nextion\starter\nspanel_portrait.tft"
$FinalTft = Join-Path $Root "panel\nextion\maxxmeter_us_portrait.tft"

Write-Host "=== MaxxMeter office panel prepare ($Mode) ==="
Write-Host "Device: office_nspanel | HA: $HaHost"
Write-Host ""

if (-not (Test-Path $InterimTft)) {
  Write-Error @"
Interim TFT missing: $InterimTft
Restore from NSPanel-Easy portrait TFT or re-download into panel/nextion/starter/
"@
}

if ($Mode -eq "final" -and -not (Test-Path $FinalTft)) {
  Write-Error @"
Final TFT missing: $FinalTft
Compile in Nextion Editor from panel/nextion/maxxmeter-us-portrait-layout.md
Or run with -Mode interim until the real UI is built.
"@
}

if (-not (Test-Path $SecretsPath)) {
  if (-not (Test-Path $ExampleSecrets)) {
    Write-Error "Missing template: $ExampleSecrets"
  }
  Copy-Item $ExampleSecrets $SecretsPath
  Write-Host "Created $SecretsPath from secrets.example.yaml"
} else {
  Write-Host "Keeping existing secrets.yaml (not overwritten)"
}

Write-Host ""
& (Join-Path $PSScriptRoot "host-tft-on-ha.ps1") -HaHost $HaHost -Mode $Mode

Write-Host ""
Write-Host "=== Fill these secrets (only config you must add) ==="
Write-Host "  wifi_ssid, wifi_password"
Write-Host "  panel_id, panel_api_key, panel_api_key_bearer   (MaxxMeter → Panels)"
Write-Host "  api_encryption_key, ota_password               (existing office_nspanel ESPHome)"
Write-Host "  nextion_update_url_us                          (printed above)"
Write-Host ""
Write-Host "=== Then ==="
Write-Host "  1. Copy the TFT into HA /config/www/ as instructed above"
Write-Host "  2. cd panel\esphome"
Write-Host "  3. esphome run office-panel.yaml"
Write-Host "  4. MaxxMeter ingress → connect AI accounts"
Write-Host ""
if ($Mode -eq "interim") {
  Write-Host "Note: interim TFT replaces stock UI; MaxxMeter bars need the full animated TFT."
  Write-Host "Build checklist: panel/nextion/maxxmeter-us-portrait-layout.md"
}
```

- [ ] **Step 2: Run prepare in interim mode**

Run: `powershell -File scripts/prepare-office-panel.ps1 -Mode interim`
Expected:
- Creates `panel/esphome/secrets.yaml` if absent
- Does not error on missing final TFT
- Prints fill checklist

- [ ] **Step 3: Re-run and confirm secrets are preserved**

Run again. Expected: `Keeping existing secrets.yaml (not overwritten)`

- [ ] **Step 4: Ensure secrets.yaml stays untracked**

Run: `git check-ignore -v panel/esphome/secrets.yaml`
Expected: a `.gitignore` rule matches. If not, add `panel/esphome/secrets.yaml` to `.gitignore` and commit that in this task.

- [ ] **Step 5: Commit**

```bash
git add scripts/prepare-office-panel.ps1
# and .gitignore only if changed
git commit -m "Add prepare-office-panel script for config-only TFT staging."
```

---

### Task 4: Animated US portrait layout + Editor checklist

**Files:**
- Modify: `panel/nextion/maxxmeter-us-portrait-layout.md`

**Interfaces:**
- Consumes: existing component positions and ESPHome IDs
- Produces: explicit timer IDs and Event code an operator pastes into Nextion Editor

- [ ] **Step 1: Append accent strip + animation components to overview header section**

After the overview Header table, add:

```markdown
### Accent strip (animation target)

| Component | Type | x | y | w | h | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `r_accent` | Rectangle | 12 | 44 | 296 | 3 | Fill `#7C6BF0`; breathe target |

### Status heartbeat glyph (status page)

| Component | Type | x | y | w | h | Text | Font | pco |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `t_heart` | Text | 280 | 16 | 28 | 28 | ● | font1 | `#888899` |
```

- [ ] **Step 2: Insert full Animations section before the Nextion Editor build checklist**

Insert this exact section:

```markdown
## Animations (Nextion-native)

Do **not** rename ESPHome components. Add timers below on the named pages. All timers: **vscope global** where the Editor allows.

### Shared variables (Program.s or page globals)

Create numeric globals:

| Name | Initial | Purpose |
| --- | --- | --- |
| `va_breathe` | 0 | Boot breathe cycle counter |
| `va_bar_step` | 0 | Bar settle step 0–8 |
| `va_j0_target` | 0 | Last session % (updated when ESPHome sets j0, optional manual mirror) |
| `va_j1_target` | 0 | Last weekly % |
| `va_crit` | 0 | 1 while critical pulse active |
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

**Page `overview` → Event → Preinitialize (or Postinitialize):**

```
va_breathe.val=0
va_bar_step.val=0
j0.val=0
j1.val=0
t0.pco=0x888899
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
    t_hdr.pco=0x7C6BF0
    r_accent.bco=0x7C6BF0
  }else
  {
    t_hdr.pco=0x4A4080
    r_accent.bco=0x4A4080
  }
  va_breathe.val++
}else
{
  t_hdr.pco=0x7C6BF0
  r_accent.bco=0x7C6BF0
  tm_breathe.en=0
}
```

**`tm_bar` Timer Event:**

```
if(va_bar_step.val<8)
{
  va_bar_step.val++
  // Soft enter for title
  if(va_bar_step.val==2)
  {
    t0.pco=0xE8E8F0
  }
  // If ESPHome already wrote targets, bars jump forward; otherwise stay until poll
}else
{
  tm_bar.en=0
}
```

**`tm_crit` Timer Event:**

```
if(j0.val>=90)
{
  if(va_crit.val==0)
  {
    j0.pco=0xEF4444
    va_crit.val=1
  }else
  {
    j0.pco=0x991B1B
    va_crit.val=0
  }
}else if(j1.val>=90)
{
  if(va_crit.val==0)
  {
    j1.pco=0xEF4444
    va_crit.val=1
  }else
  {
    j1.pco=0x991B1B
    va_crit.val=0
  }
}else
{
  va_crit.val=0
}
```

### `detail` soft page enter

**Page `detail` → Preinitialize:**

```
t0.pco=0x888899
```

**Page `detail` → Timer `tm_bar` (reuse or add page-local 50 ms, 3 ticks) / or Postinitialize delay via `tm_bar`:**

```
t0.pco=0xE8E8F0
```

Simplest: in `detail` Preinitialize set `t0.pco=0x888899`, then enable a page timer `tm_bar` for one 80 ms tick that sets `t0.pco=0xE8E8F0` and disables itself.

### `status` heartbeat

**Page `status` → Preinitialize:**

```
t_heart.txt="●"
t_heart.pco=0x888899
va_heart.val=0
tm_heart.en=1
```

**`tm_heart` Timer Event:**

```
if(va_heart.val==0)
{
  t_heart.pco=0x22C55E
  va_heart.val=1
}else
{
  t_heart.pco=0x888899
  va_heart.val=0
}
```

Disable `tm_heart` only if you add offline UI later; for v0.1 leave enabled on status page.
```

- [ ] **Step 3: Replace the Nextion Editor build checklist with the expanded list**

Replace the checklist section with:

```markdown
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
```

- [ ] **Step 4: Commit**

```bash
git add panel/nextion/maxxmeter-us-portrait-layout.md
git commit -m "Add Nextion-native animations and build checklist for US portrait TFT."
```

---

### Task 5: Operator docs (OFFICE-PANEL-FLASH + README)

**Files:**
- Modify: `panel/nextion/OFFICE-PANEL-FLASH.md`
- Modify: `panel/nextion/README.md`

**Interfaces:**
- Consumes: prepare/host script UX from Tasks 2–3; layout path from Task 4
- Produces: US-first docs so operator never follows EU-only paths by accident

- [ ] **Step 1: Rewrite `panel/nextion/OFFICE-PANEL-FLASH.md`**

```markdown
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
| Bars don’t move on interim TFT | Expected — need full MaxxMeter component IDs |
| Wrong orientation | Must be 320×480 portrait |
```

- [ ] **Step 2: Update `panel/nextion/README.md` intro table / compile section**

At the top of the Compile section (or after the profile table), add:

```markdown
## Office panel (US) — start here

1. `.\scripts\prepare-office-panel.ps1 -Mode interim`
2. Build animated UI from [maxxmeter-us-portrait-layout.md](./maxxmeter-us-portrait-layout.md)
3. `.\scripts\prepare-office-panel.ps1 -Mode final`

Walkthrough: [OFFICE-PANEL-FLASH.md](./OFFICE-PANEL-FLASH.md)
```

Change the example `nextion_update_url_us` in the Wire section to the HA local interim/final URLs (not the edwardtfn raw GitHub URL).

- [ ] **Step 3: Commit**

```bash
git add panel/nextion/OFFICE-PANEL-FLASH.md panel/nextion/README.md
git commit -m "Document US portrait prepare path for office panel TFT."
```

---

### Task 6: Smoke verification + spec status

**Files:**
- Modify: `docs/superpowers/specs/2026-09-05-office-panel-tft-prep-design.md` (status line only)

**Interfaces:**
- Consumes: Tasks 1–5 deliverables
- Produces: verified script output; spec marked ready for operator use

- [ ] **Step 1: Run host + prepare smoke**

```powershell
powershell -File scripts/host-tft-on-ha.ps1 -Mode interim
powershell -File scripts/prepare-office-panel.ps1 -Mode interim
```

Expected: no errors; interim path and URL printed; secrets scaffold message OK.

- [ ] **Step 2: Confirm layout doc contains timer IDs**

Run: `Select-String -Path panel/nextion/maxxmeter-us-portrait-layout.md -Pattern "tm_breathe|tm_bar|tm_crit|tm_heart"`
Expected: matches for all four.

- [ ] **Step 3: Update spec status**

Set status to: `Implemented — operator fills secrets + Nextion compile`

- [ ] **Step 4: Final commit**

```bash
git add docs/superpowers/specs/2026-09-05-office-panel-tft-prep-design.md
git commit -m "Mark office panel TFT prep design implemented."
```

- [ ] **Step 5: Push when operator asks**

Do not push unless requested. Local commits are enough for handoff.

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| Secrets template interim/final URLs | Task 1 |
| prepare-office-panel.ps1 | Task 3 |
| host-tft-on-ha.ps1 US defaults | Task 2 |
| OFFICE-PANEL-FLASH + README | Task 5 |
| Animated layout + timer IDs | Task 4 |
| Config-only finish line | Tasks 1–3 + 5 |
| No Supervisor API | Tasks 2–3 |
| No ESPHome contract change | Global + Task 4 |
| Smoke / ignore secrets | Task 3 step 4, Task 6 |
| Operator Nextion compile still required | Task 4–5 (explicit) |
