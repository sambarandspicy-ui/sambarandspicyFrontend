param(
    [string]$Url = "http://localhost:3000/billing"
)

$ErrorActionPreference = "Stop"

if (-not $env:LOCALAPPDATA) {
    throw "LOCALAPPDATA is unavailable. Run this script from a Windows desktop session."
}

$browserCandidates = @(
    (Join-Path $env:ProgramFiles "Google\Chrome\Application\chrome.exe"),
    (Join-Path ${env:ProgramFiles(x86)} "Google\Chrome\Application\chrome.exe"),
    (Join-Path ${env:ProgramFiles(x86)} "Microsoft\Edge\Application\msedge.exe"),
    (Join-Path $env:ProgramFiles "Microsoft\Edge\Application\msedge.exe")
)
$browser = $browserCandidates | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
if (-not $browser) {
    throw "Chrome or Microsoft Edge was not found in the standard installation locations."
}

$profilePath = Join-Path $env:LOCALAPPDATA "SambarSpicy\ReceiptBrowser"
New-Item -ItemType Directory -Path $profilePath -Force | Out-Null

# A separate profile keeps receipt settings and sign-in independent of other browser windows.
# Kiosk printing uses this computer's default printer without displaying Chrome's print preview.
Start-Process -FilePath $browser -ArgumentList @(
    "--user-data-dir=`"$profilePath`"",
    "--no-first-run",
    "--disable-extensions",
    "--kiosk-printing",
    "--app=$Url"
)
