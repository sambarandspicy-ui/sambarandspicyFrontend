[CmdletBinding()]
param(
    [ValidateSet('Chrome', 'Edge')]
    [string]$Browser = 'Chrome',
    [string]$Url = 'http://localhost:3000/billing',
    [switch]$Setup
)

$ErrorActionPreference = 'Stop'
$uri = $null
if (-not [Uri]::TryCreate($Url, [UriKind]::Absolute, [ref]$uri) -or $uri.Scheme -notin @('http', 'https')) {
    throw 'Url must be an absolute http or https URL.'
}

$relativePath = if ($Browser -eq 'Chrome') { 'Google\Chrome\Application\chrome.exe' } else { 'Microsoft\Edge\Application\msedge.exe' }
$candidates = @(
    (Join-Path $env:ProgramFiles $relativePath),
    (Join-Path ${env:ProgramFiles(x86)} $relativePath),
    (Join-Path $env:LOCALAPPDATA $relativePath)
)
$executable = $candidates | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
if (-not $executable) {
    throw "$Browser was not found in its standard Windows installation folders. Install it or use -Browser Edge."
}

$profile = Join-Path $env:LOCALAPPDATA "SambarSpicy\Kiosk$Browser"
$arguments = @("--user-data-dir=`"$profile`"", "--app=`"$($uri.AbsoluteUri)`"")
if (-not $Setup) { $arguments += '--kiosk-printing' }

if ($Setup) {
    Write-Host 'Setup mode: print one receipt and select the printer, paper size, and headers/footers in the browser print dialog.'
} else {
    Write-Host 'Kiosk printing enabled. Receipts are sent to the destination saved in this browser profile.'
}
Write-Host 'Close any existing Sambar & Spicy kiosk windows before switching modes.'
Start-Process -FilePath $executable -ArgumentList $arguments
