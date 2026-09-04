param([switch]$SkipDockerCheck)
. (Join-Path $PSScriptRoot 'common.ps1')

if (-not $SkipDockerCheck) { Assert-DockerReady }

$errors = [System.Collections.Generic.List[string]]::new()
$warnings = [System.Collections.Generic.List[string]]::new()

$dockerMemRaw = & docker info --format '{{.MemTotal}}'
if ($LASTEXITCODE -eq 0 -and $dockerMemRaw -match '^\d+$') {
    $dockerMemGb = [math]::Round(([double]$dockerMemRaw / 1GB), 1)
    Write-Host "Docker memory: $dockerMemGb GB"
    if ([double]$dockerMemRaw -lt 16GB) { $warnings.Add("RAGFlow officially recommends at least 16 GB RAM; Docker currently exposes $dockerMemGb GB.") }
}

$drive = Get-PSDrive -Name ([System.IO.Path]::GetPathRoot($script:RagflowDeployRoot).TrimEnd(':','\')) -ErrorAction SilentlyContinue
if ($drive) {
    $freeGb = [math]::Round($drive.Free / 1GB, 1)
    Write-Host "Free disk on deployment drive: $freeGb GB"
    if ($freeGb -lt 50) { $warnings.Add("RAGFlow officially recommends at least 50 GB free disk; only $freeGb GB is available.") }
}

$mapCount = & docker run --rm alpine:3.20 sh -c 'cat /proc/sys/vm/max_map_count'
if ($LASTEXITCODE -ne 0 -or -not ($mapCount -match '^\d+$')) {
    $warnings.Add('Could not verify vm.max_map_count.')
} elseif ([int64]$mapCount -lt 262144) {
    $errors.Add("vm.max_map_count is $mapCount; Elasticsearch requires at least 262144.")
} else {
    Write-Host "vm.max_map_count: $mapCount"
}

$ports = [ordered]@{
    9380='RAGFlow API'; 19080='RAGFlow Web'; 19443='RAGFlow HTTPS'; 19381='Admin API';
    19382='MCP'; 19383='Go admin'; 19384='Go API'; 19200='Elasticsearch';
    19306='RAGFlow MySQL'; 19000='MinIO API'; 19001='MinIO Console'; 19379='RAGFlow Redis'
}
$existingContainers = @()
if (Test-Path -LiteralPath $script:RagflowEnvFile) {
    $existingContainers = @(& docker compose --project-name $script:RagflowProjectName --env-file $script:RagflowEnvFile -f $script:RagflowComposeFile ps -q 2>$null)
}
if ($existingContainers.Count -gt 0) {
    Write-Host 'Existing RAGFlow project containers found; occupied RAGFlow ports are expected.'
} else {
    $listeners = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue
    foreach ($entry in $ports.GetEnumerator()) {
        if ($listeners | Where-Object LocalPort -eq $entry.Key) {
            $errors.Add("Port $($entry.Key) ($($entry.Value)) is already in use.")
        }
    }
}

foreach ($warning in $warnings) { Write-Warning $warning }
foreach ($errorMessage in $errors) { Write-Host "ERROR: $errorMessage" -ForegroundColor Red }
if ($errors.Count -gt 0) { exit 1 }
Write-Host 'RAGFlow prerequisite checks passed.'

