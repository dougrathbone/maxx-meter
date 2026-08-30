# Host a TFT on Home Assistant www and print the URL for ESPHome nextion_update_url

param(
  [string]$HaHost = "192.168.1.7",
  [string]$TftPath = "",
  [string]$RemoteName = "maxxmeter_eu.tft"
)

$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
if (-not $TftPath) {
  $TftPath = Join-Path $Root "panel\nextion\starter\nspanel_blank.tft"
}

if (-not (Test-Path $TftPath)) {
  Write-Error "TFT not found: $TftPath"
}

$Url = "http://${HaHost}:8123/local/$RemoteName"
Write-Host ""
Write-Host "=== Home Assistant TFT hosting ==="
Write-Host ""
Write-Host "1. Copy TFT to HA www folder:"
Write-Host "   Local: $TftPath"
Write-Host "   HA:    /config/www/$RemoteName"
Write-Host ""
Write-Host "   Via File Editor add-on, or Samba: \\${HaHost}\config\www\"
Write-Host ""
Write-Host "2. Verify: $Url"
Write-Host ""
Write-Host "3. In panel/esphome/secrets.yaml:"
Write-Host "   nextion_update_url_eu: `"$Url`""
Write-Host ""
Write-Host "4. OTA flash ESPHome to push TFT from URL on boot."
Write-Host ""
