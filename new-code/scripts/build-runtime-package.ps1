$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$ReleaseDir = Join-Path $Root "release"
$PackageDir = Join-Path $ReleaseDir "smart-product-runtime"
$ZipPath = Join-Path $ReleaseDir "smart-product-runtime.zip"

Set-Location (Join-Path $Root "frontend-app")
npm.cmd run build

Set-Location (Join-Path $Root "backend")
mvn.cmd -DskipTests clean package

if (Test-Path $PackageDir) {
    Remove-Item -LiteralPath $PackageDir -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $PackageDir | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $PackageDir "backend-app") | Out-Null

$Jar = Get-ChildItem -LiteralPath (Join-Path $Root "backend\target") -Filter "*.jar" |
    Where-Object { $_.Name -notlike "*sources*" -and $_.Name -notlike "*javadoc*" } |
    Select-Object -First 1
if (-not $Jar) {
    throw "Backend jar not found."
}

Copy-Item -LiteralPath $Jar.FullName -Destination (Join-Path $PackageDir "backend-app\app.jar") -Force
Copy-Item -LiteralPath (Join-Path $Root "frontend-app\dist") -Destination (Join-Path $PackageDir "frontend-dist") -Recurse -Force
Copy-Item -LiteralPath (Join-Path $Root "deploy") -Destination (Join-Path $PackageDir "deploy") -Recurse -Force
Copy-Item -LiteralPath (Join-Path $Root "db") -Destination (Join-Path $PackageDir "db") -Recurse -Force
Copy-Item -LiteralPath (Join-Path $Root "docker-compose.runtime.yml") -Destination (Join-Path $PackageDir "docker-compose.runtime.yml") -Force
Copy-Item -LiteralPath (Join-Path $Root "docker-compose.parallel.yml") -Destination (Join-Path $PackageDir "docker-compose.parallel.yml") -Force
Copy-Item -LiteralPath (Join-Path $Root "docker-compose.app-only.yml") -Destination (Join-Path $PackageDir "docker-compose.app-only.yml") -Force
Copy-Item -LiteralPath (Join-Path $Root "PACKAGE_RELEASE.md") -Destination (Join-Path $PackageDir "PACKAGE_RELEASE.md") -Force
Copy-Item -LiteralPath (Join-Path $Root "START_STOP.md") -Destination (Join-Path $PackageDir "START_STOP.md") -Force
Copy-Item -LiteralPath (Join-Path $Root "PRODUCTION_SECURITY_HTTPS.md") -Destination (Join-Path $PackageDir "PRODUCTION_SECURITY_HTTPS.md") -Force

if (Test-Path $ZipPath) {
    Remove-Item -LiteralPath $ZipPath -Force
}
Compress-Archive -Path (Join-Path $PackageDir "*") -DestinationPath $ZipPath -Force

Write-Host "Runtime package created:"
Write-Host $ZipPath
