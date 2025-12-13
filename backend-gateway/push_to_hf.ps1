#!/usr/bin/env pwsh
# Push Rust Gateway to HuggingFace Space
# Usage: .\push_to_hf.ps1 -HfToken "hf_xxx"

param(
    [Parameter(Mandatory=$true)]
    [string]$HfToken,
    [string]$HfUsername = "ben820",
    [string]$SpaceName = "wighaven-gateway"
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Pushing to HuggingFace Space: $HfUsername/$SpaceName" -ForegroundColor Cyan

# Source directory (Rust gateway)
$sourceDir = "$PSScriptRoot\speedgateway"

# Create temp directory for HF repo
$tempDir = Join-Path $env:TEMP "hf-push-$(Get-Random)"
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

try {
    # Clone HF space repo (shallow)
    Write-Host "📥 Cloning HuggingFace Space..." -ForegroundColor Yellow
    $hfRepoUrl = "https://user:$HfToken@huggingface.co/spaces/$HfUsername/$SpaceName"
    git clone --depth 1 $hfRepoUrl $tempDir 2>&1 | Out-Null
    
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to clone HF repo. Check your token has write access."
    }

    # Remove old files (except .git and secrets-related)
    Write-Host "🧹 Cleaning old files..." -ForegroundColor Yellow
    Get-ChildItem $tempDir -Exclude ".git" | Remove-Item -Recurse -Force

    # Copy new files
    Write-Host "📦 Copying new files..." -ForegroundColor Yellow
    Get-ChildItem $sourceDir | Copy-Item -Destination $tempDir -Recurse -Force

    # Stage, commit and push
    Push-Location $tempDir
    try {
        # Set git identity for this repo
        git config user.email "deploy@wighaven.local"
        git config user.name "WigHaven Deploy"
        
        git add -A
        git commit -m "Update gateway v3.0 - optimized WebSocket + decoy UI" --allow-empty
        
        Write-Host "🚀 Pushing to HuggingFace..." -ForegroundColor Yellow
        git push origin main 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Successfully pushed to HuggingFace!" -ForegroundColor Green
            Write-Host "🔗 https://huggingface.co/spaces/$HfUsername/$SpaceName" -ForegroundColor Cyan
        } else {
            throw "Git push failed"
        }
    } finally {
        Pop-Location
    }
} finally {
    # Cleanup
    if (Test-Path $tempDir) {
        Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}
