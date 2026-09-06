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
