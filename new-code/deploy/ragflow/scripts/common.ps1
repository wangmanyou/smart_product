Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$script:RagflowDeployRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$script:RagflowVersion = (Get-Content -LiteralPath (Join-Path $script:RagflowDeployRoot 'VERSION') -Raw).Trim()
$script:RagflowRuntimeRoot = Join-Path $script:RagflowDeployRoot "vendor/$script:RagflowVersion"
$script:RagflowComposeFile = Join-Path $script:RagflowRuntimeRoot 'docker-compose.yml'
$script:RagflowSafetyComposeFile = Join-Path $script:RagflowRuntimeRoot 'docker-compose.safety.yml'
$script:RagflowEnvExample = Join-Path $script:RagflowRuntimeRoot '.env.example'
$script:RagflowEnvFile = Join-Path $script:RagflowRuntimeRoot '.env'
$script:RagflowProjectName = 'smart-product-ragflow'

function Assert-RagflowFiles {
    foreach ($path in @($script:RagflowComposeFile, $script:RagflowSafetyComposeFile, $script:RagflowEnvExample)) {
        if (-not (Test-Path -LiteralPath $path)) {
            throw "RAGFlow deployment file is missing: $path"
        }
    }
}

function Assert-DockerReady {
    & docker info --format '{{.ServerVersion}}' | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw 'Docker Desktop is not ready. Start Docker Desktop and ensure the current user can access the Linux engine.'
    }
}

function Invoke-RagflowCompose {
    param(
        [Parameter(ValueFromRemainingArguments = $true)]
        [string[]]$ComposeArguments
    )
    Assert-RagflowFiles
    if (-not (Test-Path -LiteralPath $script:RagflowEnvFile)) {
        throw "RAGFlow .env is missing. Run scripts/initialize.ps1 first."
    }
    $composeFiles = @('-f', $script:RagflowComposeFile, '-f', $script:RagflowSafetyComposeFile)
    & docker compose --project-name $script:RagflowProjectName --env-file $script:RagflowEnvFile @composeFiles @ComposeArguments
    if ($LASTEXITCODE -ne 0) {
        throw "docker compose failed with exit code $LASTEXITCODE"
    }
}

function Get-RagflowEnvValue {
    param([Parameter(Mandatory = $true)][string]$Name)
    if (-not (Test-Path -LiteralPath $script:RagflowEnvFile)) { return $null }
    $line = Get-Content -LiteralPath $script:RagflowEnvFile | Where-Object { $_ -match "^$([regex]::Escape($Name))=" } | Select-Object -First 1
    if (-not $line) { return $null }
    return ($line -split '=', 2)[1]
}
