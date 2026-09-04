param([switch]$Force)
. (Join-Path $PSScriptRoot 'common.ps1')

Assert-RagflowFiles
if ((Test-Path -LiteralPath $script:RagflowEnvFile) -and -not $Force) {
    Write-Host "RAGFlow environment already exists: $script:RagflowEnvFile"
    Write-Host 'Use -Force only when you intentionally want to rotate local infrastructure passwords.'
    exit 0
}

function New-RandomSecret {
    param([int]$ByteCount = 24)
    $bytes = New-Object byte[] $ByteCount
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
    return ([BitConverter]::ToString($bytes) -replace '-', '').ToLowerInvariant()
}

$content = Get-Content -LiteralPath $script:RagflowEnvExample -Raw
$secrets = [ordered]@{
    ELASTIC_PASSWORD = New-RandomSecret
    OPENSEARCH_PASSWORD = "RfA1!$(New-RandomSecret 20)"
    OCEANBASE_PASSWORD = New-RandomSecret
    SEEKDB_PASSWORD = New-RandomSecret
    MYSQL_PASSWORD = New-RandomSecret
    MINIO_PASSWORD = New-RandomSecret
    REDIS_PASSWORD = New-RandomSecret
}
foreach ($item in $secrets.GetEnumerator()) {
    $pattern = "(?m)^$([regex]::Escape($item.Key))=.*$"
    $content = [regex]::Replace($content, $pattern, "$($item.Key)=$($item.Value)")
}

[System.IO.File]::WriteAllText($script:RagflowEnvFile, $content, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "Created local RAGFlow environment: $script:RagflowEnvFile"
Write-Host 'Secrets were generated locally and are excluded from Git.'



