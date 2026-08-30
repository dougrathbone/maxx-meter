# Flash MaxxMeter TFT to NSPanel over USB (COM port)

param(
  [string]$Port = "",
  [string]$Profile = "eu",
  [int]$Baud = 115200
)

$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$Tft = Join-Path $Root "panel\nextion\starter\nspanel_blank.tft"
$Nexus = Join-Path $Root "tools\Nexus\Nexus.py"

if ($Profile -eq "us") {
  Write-Host "US portrait TFT not bundled yet - build maxxmeter_us_portrait.tft in Nextion Editor first."
  exit 1
}

if (-not (Test-Path $Tft)) {
  Write-Host "Starter TFT missing. Download with:"
  Write-Host "curl -L -o `"$Tft`" https://raw.githubusercontent.com/edwardtfn/NSPanel-Easy/main/hmi/nspanel_blank.tft"
  exit 1
}

if (-not (Test-Path $Nexus)) {
  Write-Host "Cloning Nexus uploader..."
  git clone --depth 1 https://github.com/UNUF/Nexus.git (Join-Path $Root "tools\Nexus")
}

python -m pip install -q pyserial

if (-not $Port) {
  Write-Host "Available COM ports:"
  python $Nexus -l
  Write-Host ""
  Write-Host "Re-run with: .\scripts\flash-tft-usb.ps1 -Port COM3"
  exit 0
}

Write-Host "Uploading $Tft to $Port at ${Baud} baud..."
Write-Host "Tip: Power on while holding left button if upload fails (UART mode)."
python $Nexus -i $Tft -p $Port -u $Baud
Write-Host "Done."
