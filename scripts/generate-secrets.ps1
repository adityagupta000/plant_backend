# ============================================================================
# Secret File Generator for Docker Secrets (PowerShell)
# Generates secure random secrets for the backend
# Usage: .\scripts\generate-secrets.ps1
# ============================================================================

param(
    [switch]$Force = $false
)

$ErrorActionPreference = "Stop"

Write-Host "[*] Generating Docker Secrets for Plant Health Backend..." -ForegroundColor Cyan
Write-Host ""

$SecretsDir = "./secrets"

# Function to generate random bytes
function Get-SecureRandomString {
    param([int]$ByteLength = 32)
    $bytes = New-Object byte[] $ByteLength
    $rng = [System.Security.Cryptography.RNGCryptoServiceProvider]::new()
    $rng.GetBytes($bytes)
    return ($bytes | ForEach-Object { $_.ToString("x2") }) -join ""
}

# Create secrets directory if it doesn't exist
if (-not (Test-Path $SecretsDir)) {
    Write-Host "[+] Creating secrets directory: $SecretsDir" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $SecretsDir -Force | Out-Null
}

# Function to generate a secret and save it to file
function New-Secret {
    param(
        [string]$SecretName,
        [switch]$Overwrite
    )
    
    $SecretFile = "$SecretsDir\$SecretName.txt"
    
    if ((Test-Path $SecretFile) -and -not $Overwrite) {
        Write-Host "[!] Secret already exists: $SecretFile (skipping)" -ForegroundColor Yellow
        return
    }
    
    Write-Host "[-] Generating: $SecretName" -ForegroundColor Green
    
    # Generate 64-character hex string (256-bit security)
    $SecretValue = Get-SecureRandomString -ByteLength 32
    
    # Write secret to file
    $SecretValue | Set-Content -Path $SecretFile -NoNewline
    
    Write-Host "[OK] Generated: $SecretFile" -ForegroundColor Green
}

# Generate all required secrets
New-Secret -SecretName "jwt_access_secret" -Overwrite:$Force
New-Secret -SecretName "jwt_refresh_secret" -Overwrite:$Force
New-Secret -SecretName "redis_password" -Overwrite:$Force

Write-Host ""
Write-Host "[OK] All secrets generated successfully!" -ForegroundColor Green
Write-Host ""

# List created files
Write-Host "[*] Created files:" -ForegroundColor Cyan
Get-ChildItem "$SecretsDir\*.txt" -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "    $($_.FullName)" -ForegroundColor White
}

Write-Host ""
Write-Host "[!] IMPORTANT:" -ForegroundColor Yellow
Write-Host "    * These files should NOT be committed to Git" -ForegroundColor Yellow
Write-Host "    * Ensure .gitignore includes ./secrets/" -ForegroundColor Yellow
Write-Host "    * In production, use Docker Swarm Secrets or Kubernetes" -ForegroundColor Yellow
Write-Host ""
Write-Host "[>] Ready to start: docker-compose up --build" -ForegroundColor Cyan
