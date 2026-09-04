param([switch]$RemoveData)
. (Join-Path $PSScriptRoot 'common.ps1')
Assert-DockerReady
if ($RemoveData) {
    Write-Warning 'Removing RAGFlow containers and persistent volumes. All RAGFlow datasets will be deleted.'
    $confirmation = Read-Host 'Type DELETE-RAGFLOW-DATA to continue'
    if ($confirmation -ne 'DELETE-RAGFLOW-DATA') {
        Write-Host 'Cancelled.'
        exit 1
    }
    Invoke-RagflowCompose -ComposeArguments @('down', '--volumes')
} else {
    Invoke-RagflowCompose -ComposeArguments @('down')
}


