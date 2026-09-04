param([switch]$SkipTests)
$deployRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$newCodeRoot = (Resolve-Path (Join-Path $deployRoot '../..')).Path
$envFile = Join-Path $newCodeRoot '.env.ai.local'
$backendRoot = Join-Path $newCodeRoot 'backend'
if (-not (Test-Path -LiteralPath $envFile)) {
    throw "Missing $envFile. Run deploy/ragflow/scripts/set-backend-api-key.ps1 first."
}

Get-Content -LiteralPath $envFile | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith('#')) { return }
    $parts = $line -split '=', 2
    if ($parts.Count -eq 2) { [Environment]::SetEnvironmentVariable($parts[0], $parts[1], 'Process') }
}

$mavenCommand = $null
$wrapper = Join-Path $backendRoot 'mvnw.cmd'
if (Test-Path -LiteralPath $wrapper) {
    $mavenCommand = $wrapper
} else {
    $maven = Get-Command 'mvn.cmd' -ErrorAction SilentlyContinue
    if ($maven) {
        $mavenCommand = $maven.Source
    }
}
if (-not $mavenCommand) {
    throw 'Maven was not found. Install Maven or add mvn.cmd to PATH.'
}

Push-Location $backendRoot
try {
    $mavenArgs = @()
    if ($SkipTests) { $mavenArgs += '-DskipTests' }
    $mavenArgs += 'spring-boot:run'
    & $mavenCommand @mavenArgs
    exit $LASTEXITCODE
} finally {
    Pop-Location
}
