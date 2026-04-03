<#
.SYNOPSIS
    Deploys the frontend-only Next.js static site to Azure Static Web Apps.

.DESCRIPTION
    This script provisions (or reuses) an Azure Static Web App and deploys the
    static build output from the Next.js "export" build.

.PARAMETER ResourceGroup
    Name of the Azure resource group to create or use. Default: rg-frontend-only-poc

.PARAMETER AppName
    Name of the Azure Static Web App. Default: swa-frontend-only-poc

.PARAMETER Location
    Azure region. Default: eastus2

.PARAMETER SkipBuild
    Skip the npm build step if the out/ folder is already up to date.

.EXAMPLE
    .\deploy-swa.ps1
    .\deploy-swa.ps1 -ResourceGroup my-rg -AppName my-swa -Location westus2
    .\deploy-swa.ps1 -SkipBuild
#>

param(
    [string]$ResourceGroup = "rg-frontend-only-poc",
    [string]$AppName       = "swa-frontend-only-poc",
    [string]$Location      = "eastus2",
    [switch]$SkipBuild
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ── Prerequisites check ──────────────────────────────────────────────
function Assert-Command([string]$Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        Write-Error "Required command '$Name' not found. Please install it first."
    }
}

Assert-Command "az"
Assert-Command "node"
Assert-Command "npm"

# Check SWA CLI
if (-not (Get-Command "swa" -ErrorAction SilentlyContinue)) {
    Write-Host "Installing Azure Static Web Apps CLI..." -ForegroundColor Yellow
    npm install -g @azure/static-web-apps-cli
}

# ── Ensure Azure login ───────────────────────────────────────────────
$account = az account show 2>$null | ConvertFrom-Json
if (-not $account) {
    Write-Host "Not logged in to Azure. Running 'az login'..." -ForegroundColor Yellow
    az login
}
Write-Host "Using subscription: $($account.name) ($($account.id))" -ForegroundColor Cyan

# ── Build ─────────────────────────────────────────────────────────────
Push-Location $PSScriptRoot
try {
    if (-not $SkipBuild) {
        Write-Host "`n==> Installing dependencies..." -ForegroundColor Green
        npm ci

        Write-Host "==> Building static export..." -ForegroundColor Green
        npm run build

        if (-not (Test-Path "./out/index.html")) {
            Write-Error "Build failed: out/index.html not found."
        }
        Write-Host "==> Build complete. Output in ./out/" -ForegroundColor Green
    }
    else {
        if (-not (Test-Path "./out/index.html")) {
            Write-Error "out/index.html not found. Run without -SkipBuild first."
        }
        Write-Host "==> Skipping build (using existing ./out/ folder)" -ForegroundColor Yellow
    }

    # ── Provision Azure resources ─────────────────────────────────────
    Write-Host "`n==> Ensuring resource group '$ResourceGroup' exists..." -ForegroundColor Green
    az group create --name $ResourceGroup --location $Location --output none

    $existing = az staticwebapp show --name $AppName --resource-group $ResourceGroup 2>$null
    if ($existing) {
        Write-Host "==> Static Web App '$AppName' already exists." -ForegroundColor Cyan
    }
    else {
        Write-Host "==> Creating Static Web App '$AppName'..." -ForegroundColor Green
        az staticwebapp create `
            --name $AppName `
            --resource-group $ResourceGroup `
            --location $Location `
            --sku Free `
            --output none
    }

    # ── Get deployment token ──────────────────────────────────────────
    Write-Host "==> Retrieving deployment token..." -ForegroundColor Green
    $token = (az staticwebapp secrets list `
        --name $AppName `
        --resource-group $ResourceGroup `
        --query "properties.apiKey" `
        --output tsv)

    if (-not $token) {
        Write-Error "Failed to retrieve deployment token."
    }

    # ── Deploy with SWA CLI ───────────────────────────────────────────
    Write-Host "==> Deploying to Azure Static Web Apps..." -ForegroundColor Green
    swa deploy ./out `
        --deployment-token $token `
        --env production

    # ── Output URL ────────────────────────────────────────────────────
    $hostname = (az staticwebapp show `
        --name $AppName `
        --resource-group $ResourceGroup `
        --query "defaultHostname" `
        --output tsv)

    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "Deployment complete!" -ForegroundColor Green
    Write-Host "URL: https://$hostname" -ForegroundColor Cyan
    Write-Host "========================================`n" -ForegroundColor Cyan
}
finally {
    Pop-Location
}
