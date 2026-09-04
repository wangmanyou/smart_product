param(
    [string]$ApiKey,
    [string]$RagflowBaseUrl = 'http://127.0.0.1:9380'
)
. (Join-Path $PSScriptRoot 'common.ps1')

if ([string]::IsNullOrWhiteSpace($ApiKey)) {
    $secure = Read-Host 'Paste the RAGFlow API key' -AsSecureString
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try { $ApiKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}
if ([string]::IsNullOrWhiteSpace($ApiKey)) { throw 'RAGFlow API key cannot be empty.' }
if ($ApiKey -match '[\r\n]') { throw 'RAGFlow API key contains an invalid line break.' }

$newCodeRoot = (Resolve-Path (Join-Path $script:RagflowDeployRoot '../..')).Path
$target = Join-Path $newCodeRoot '.env.ai.local'
$example = Join-Path $newCodeRoot '.env.ai.example'
$content = Get-Content -LiteralPath $example -Raw
$content = [regex]::Replace($content, '(?m)^APP_AI_ENABLED=.*$', 'APP_AI_ENABLED=true')
$content = [regex]::Replace($content, '(?m)^RAGFLOW_BASE_URL=.*$', "RAGFLOW_BASE_URL=$($RagflowBaseUrl.TrimEnd('/'))")
$content = [regex]::Replace($content, '(?m)^RAGFLOW_API_KEY=.*$', "RAGFLOW_API_KEY=$ApiKey")
[System.IO.File]::WriteAllText($target, $content, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "Saved backend AI environment: $target"
Write-Host 'Complete the LLM_* values before starting intelligent Q&A.'

