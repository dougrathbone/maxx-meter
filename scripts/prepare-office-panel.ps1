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
