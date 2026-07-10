$ErrorActionPreference = "Stop"

$WorkspaceRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
$SecretDirectory = Join-Path $WorkspaceRoot "spring-runtime-data\dev\secrets"
$SecretPath = Join-Path $SecretDirectory "jwt-secret"

function Test-JwtSecret {
    param([Parameter(Mandatory = $true)][string]$EncodedSecret)

    try {
        $decoded = [Convert]::FromBase64String($EncodedSecret)
        try {
            return $decoded.Length -ge 32
        } finally {
            [Array]::Clear($decoded, 0, $decoded.Length)
        }
    } catch [System.FormatException] {
        return $false
    }
}

if (Test-Path -LiteralPath $SecretPath) {
    $existingSecret = [System.IO.File]::ReadAllText($SecretPath).Trim()
    if (-not (Test-JwtSecret -EncodedSecret $existingSecret)) {
        throw "Existing development JWT secret is invalid: $SecretPath. It must be Base64 and decode to at least 32 bytes. Delete or replace the file, then run this script again."
    }

    Write-Host "Development JWT secret already exists; keeping it unchanged:"
    Write-Host $SecretPath
    exit 0
}

New-Item -ItemType Directory -Force -Path $SecretDirectory | Out-Null

$randomBytes = New-Object byte[] 48
$randomNumberGenerator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
try {
    $randomNumberGenerator.GetBytes($randomBytes)
    $encodedSecret = [Convert]::ToBase64String($randomBytes)
    [System.IO.File]::WriteAllText(
        $SecretPath,
        $encodedSecret,
        [System.Text.UTF8Encoding]::new($false)
    )
} finally {
    [Array]::Clear($randomBytes, 0, $randomBytes.Length)
    $randomNumberGenerator.Dispose()
}

Write-Host "Generated a Git-ignored development JWT secret:"
Write-Host $SecretPath
Write-Host "The secret value was not printed. Keep this file stable so existing login tokens remain valid."
