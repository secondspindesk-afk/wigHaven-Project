
param(
    [string]$HfToken,
    [string]$HfUsername = "ben820",
    [string]$SpaceName = "wighaven-backend"
)

$ErrorActionPreference = "Stop"
$sourceDir = $PSScriptRoot
$tempDir = Join-Path $env:TEMP "hf-deploy-$(Get-Random)"

Write-Host "Deploying to $HfUsername/$SpaceName..."

# Clone
$repo = "https://user:$HfToken@huggingface.co/spaces/$HfUsername/$SpaceName"
git clone --depth 1 $repo $tempDir

# Copy
Get-ChildItem $sourceDir -Exclude "node_modules",".git",".env*", "logs", "dist", "public", "KnowledgeGuide", ".gemini", "deploy_backend.ps1" | Copy-Item -Destination $tempDir -Recurse -Force

# Push
Set-Location $tempDir
git config user.email "deploy@wighaven.local"
git config user.name "WigHaven Deploy"
git add -A
git commit -m "Deploy Update" --allow-empty
git push origin main

Write-Host "Done!"
Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
