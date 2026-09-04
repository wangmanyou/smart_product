. (Join-Path $PSScriptRoot 'common.ps1')
Assert-DockerReady
Invoke-RagflowCompose -ComposeArguments @('ps')

