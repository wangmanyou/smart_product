param([int]$WaitSeconds = 0)
. (Join-Path $PSScriptRoot 'common.ps1')

Assert-DockerReady
$apiPort = Get-RagflowEnvValue 'SVR_HTTP_PORT'
$webPort = Get-RagflowEnvValue 'SVR_WEB_HTTP_PORT'
if (-not $apiPort) { $apiPort = '9380' }
if (-not $webPort) { $webPort = '19080' }
$healthUrl = "http://127.0.0.1:$apiPort/api/v1/system/healthz"
$deadline = (Get-Date).AddSeconds([math]::Max(0, $WaitSeconds))

while ($true) {
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri $healthUrl -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Host "RAGFlow API is healthy: $healthUrl"
            Write-Host "RAGFlow Web: http://127.0.0.1:$webPort"
            Invoke-RagflowCompose -ComposeArguments @('ps')
            exit 0
        }
    } catch {
        if ($WaitSeconds -le 0 -or (Get-Date) -ge $deadline) {
            Write-Warning "RAGFlow health check failed: $($_.Exception.Message)"
            try { Invoke-RagflowCompose -ComposeArguments @('ps') } catch { }
            try { Invoke-RagflowCompose -ComposeArguments @('logs', '--tail', '120', 'ragflow-cpu') } catch { }
            exit 1
        }
    }
    Write-Host 'Waiting for RAGFlow API...'
    Start-Sleep -Seconds 10
}

