$ErrorActionPreference = "Stop"

function Assert-ChildPath {
    param(
        [Parameter(Mandatory = $true)][string]$ParentPath,
        [Parameter(Mandatory = $true)][string]$CandidatePath
    )

    $parentFull = [System.IO.Path]::GetFullPath($ParentPath)
    $candidateFull = [System.IO.Path]::GetFullPath($CandidatePath)
    $separator = [System.IO.Path]::DirectorySeparatorChar.ToString()
    if (-not $parentFull.EndsWith($separator)) {
        $parentFull += $separator
    }

    if (-not $candidateFull.StartsWith($parentFull, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Unsafe generated path outside release directory: $candidateFull"
    }

    return $candidateFull
}

function Test-SensitiveFileName {
    param([Parameter(Mandatory = $true)][string]$Name)

    $lowerName = $Name.ToLowerInvariant()
    if ($lowerName -eq ".env.server") {
        return $true
    }
    if ($lowerName.StartsWith(".env.server.") -and $lowerName -ne ".env.server.example") {
        return $true
    }
    if ($lowerName -eq "jwt-secret" -or $lowerName.StartsWith("jwt-secret.")) {
        return $true
    }
    return $false
}

function Assert-NoSensitivePackageFiles {
    param([Parameter(Mandatory = $true)][string]$TargetPath)

    $forbiddenDirectories = @(
        Get-ChildItem -LiteralPath $TargetPath -Recurse -Force -Directory |
            Where-Object { $_.Name -ieq "spring-server-secrets" }
    )
    $forbiddenFiles = @(
        Get-ChildItem -LiteralPath $TargetPath -Recurse -Force -File |
            Where-Object { Test-SensitiveFileName -Name $_.Name }
    )

    if ($forbiddenDirectories.Count -gt 0 -or $forbiddenFiles.Count -gt 0) {
        $found = @($forbiddenDirectories.FullName) + @($forbiddenFiles.FullName)
        throw "Sensitive deployment material must not enter the runtime package: $($found -join ', ')"
    }
}

function Assert-NoSensitiveZipEntries {
    param([Parameter(Mandatory = $true)][string]$ArchivePath)

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = [System.IO.Compression.ZipFile]::OpenRead($ArchivePath)
    try {
        $forbiddenEntries = @(
            $archive.Entries | Where-Object {
                $normalized = $_.FullName.Replace('\', '/')
                $leafName = [System.IO.Path]::GetFileName($normalized)
                (Test-SensitiveFileName -Name $leafName) -or
                    $normalized.ToLowerInvariant().Contains('/spring-server-secrets/') -or
                    $normalized.ToLowerInvariant().StartsWith('spring-server-secrets/')
            }
        )
        if ($forbiddenEntries.Count -gt 0) {
            throw "Sensitive deployment material was found in the ZIP: $($forbiddenEntries.FullName -join ', ')"
        }
    } finally {
        $archive.Dispose()
    }
}

$Root = [System.IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$ReleaseDir = Join-Path $Root "release"
$PackageDir = Assert-ChildPath -ParentPath $ReleaseDir -CandidatePath (Join-Path $ReleaseDir "smart-product-runtime")
$ZipPath = Assert-ChildPath -ParentPath $ReleaseDir -CandidatePath (Join-Path $ReleaseDir "smart-product-runtime.zip")

if ((Split-Path -Leaf $PackageDir) -ne "smart-product-runtime") {
    throw "Unexpected runtime package directory: $PackageDir"
}

Set-Location (Join-Path $Root "frontend-app")
npm.cmd run build

Set-Location (Join-Path $Root "backend")
mvn.cmd clean package

New-Item -ItemType Directory -Force -Path $ReleaseDir | Out-Null
if (Test-Path -LiteralPath $PackageDir) {
    Remove-Item -LiteralPath $PackageDir -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $PackageDir | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $PackageDir "backend-app") | Out-Null

$Jar = Get-ChildItem -LiteralPath (Join-Path $Root "backend\target") -Filter "*.jar" |
    Where-Object { $_.Name -notlike "*sources*" -and $_.Name -notlike "*javadoc*" } |
    Select-Object -First 1
if (-not $Jar) {
    throw "Backend jar not found."
}

Copy-Item -LiteralPath $Jar.FullName -Destination (Join-Path $PackageDir "backend-app\app.jar") -Force
Copy-Item -LiteralPath (Join-Path $Root "frontend-app\dist") -Destination (Join-Path $PackageDir "frontend-dist") -Recurse -Force
Copy-Item -LiteralPath (Join-Path $Root "deploy") -Destination (Join-Path $PackageDir "deploy") -Recurse -Force
Copy-Item -LiteralPath (Join-Path $Root "db") -Destination (Join-Path $PackageDir "db") -Recurse -Force
Copy-Item -LiteralPath (Join-Path $Root "docker-compose.server.yml") -Destination (Join-Path $PackageDir "docker-compose.server.yml") -Force
Copy-Item -LiteralPath (Join-Path $Root ".env.server.example") -Destination (Join-Path $PackageDir ".env.server.example") -Force
Copy-Item -LiteralPath (Join-Path $Root "PACKAGE_RELEASE.md") -Destination (Join-Path $PackageDir "PACKAGE_RELEASE.md") -Force
Copy-Item -LiteralPath (Join-Path $Root "START_STOP.md") -Destination (Join-Path $PackageDir "START_STOP.md") -Force
Copy-Item -LiteralPath (Join-Path $Root "PRODUCTION_SECURITY_HTTPS.md") -Destination (Join-Path $PackageDir "PRODUCTION_SECURITY_HTTPS.md") -Force
Copy-Item -LiteralPath (Join-Path $Root "JWT_SECRET_SETUP.md") -Destination (Join-Path $PackageDir "JWT_SECRET_SETUP.md") -Force

# Real server secrets are intentionally never copied. Stop immediately if one appears in the generated directory.
Assert-NoSensitivePackageFiles -TargetPath $PackageDir

if (Test-Path -LiteralPath $ZipPath) {
    Remove-Item -LiteralPath $ZipPath -Force
}
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory(
    $PackageDir,
    $ZipPath,
    [System.IO.Compression.CompressionLevel]::Optimal,
    $false
)

# Verify the archive itself as a second line of defense.
Assert-NoSensitiveZipEntries -ArchivePath $ZipPath

Write-Host "Runtime package created (real JWT secret excluded):"
Write-Host $ZipPath
