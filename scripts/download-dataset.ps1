$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$target = Join-Path $root 'dataset'
New-Item -ItemType Directory -Force -Path $target | Out-Null
$csv = Join-Path $target 'hotel_bookings.csv'
if (Test-Path -LiteralPath $csv) { Write-Host 'Dataset exists; left unchanged.'; exit 0 }
$zip = Join-Path $target 'hotel-booking-demand.zip'
Invoke-WebRequest -Uri 'https://www.kaggle.com/api/v1/datasets/download/jessemostipak/hotel-booking-demand' -OutFile $zip
Expand-Archive -LiteralPath $zip -DestinationPath $target -Force
if (-not (Test-Path -LiteralPath $csv)) { throw 'Download did not contain hotel_bookings.csv; obtain the CSV from the Kaggle dataset page.' }
Get-FileHash -LiteralPath $csv -Algorithm SHA256
