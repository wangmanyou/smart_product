param(
    [switch]$SkipPull,
    [switch]$NoWait
)
. (Join-Path $PSScriptRoot 'common.ps1')

Assert-DockerReady
if (-not (Test-Path -LiteralPath $script:RagflowEnvFile)) {
    & (Join-Path $PSScriptRoot 'initialize.ps1')
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

& (Join-Path $PSScriptRoot 'doctor.ps1') -SkipDockerCheck
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Invoke-RagflowCompose -ComposeArguments @('config', '--quiet')
if (-not $SkipPull) {
    Invoke-RagflowCompose -ComposeArguments @('pull')
}
Invoke-RagflowCompose -ComposeArguments @('up', '-d')

if (-not $NoWait) {
    & (Join-Path $PSScriptRoot 'health-check.ps1') -WaitSeconds 1800
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

