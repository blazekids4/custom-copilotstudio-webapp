<#
.SYNOPSIS
    Deploys the frontend-only static site to Azure Static Web Apps (Free tier)
    with pre-configured Microsoft Entra ID and GitHub authentication.

.DESCRIPTION
    This script builds the Next.js static export, provisions an Azure Static
    Web App on the Free tier, copies the login page and SWA config into the
    output folder, and deploys via the SWA CLI.

    No app registration is required — the Free tier uses Microsoft's shared
    pre-configured identity providers. User access is managed via the
    invitation system in the Azure Portal.

.PARAMETER ResourceGroup
    Name of the Azure resource group. Default: rg-frontend-auth-free

.PARAMETER AppName
    Name of the Azure Static Web App. Default: swa-frontend-auth-free

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
    [string]$ResourceGroup = "rg-frontend-auth-free",
    [string]$AppName       = "swa-frontend-auth-free",
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

if (-not (Get-Command "swa" -ErrorAction SilentlyContinue)) {
    Write-Host "Installing Azure Static Web Apps CLI..." -ForegroundColor Yellow
    npm install -g @azure/static-web-apps-cli
}

# ── Ensure Azure login ───────────────────────────────────────────────
$account = az account show 2>$null | ConvertFrom-Json
if (-not $account) {
    Write-Host "Not logged in to Azure. Running 'az login'..." -ForegroundColor Yellow
    az login
    $account = az account show | ConvertFrom-Json
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

    # ── Copy auth files into the build output ─────────────────────────
    Write-Host "==> Copying staticwebapp.config.json into out/..." -ForegroundColor Green
    Copy-Item "./staticwebapp.config.json" -Destination "./out/staticwebapp.config.json" -Force

    Write-Host "==> Copying login.html into out/..." -ForegroundColor Green
    Copy-Item "./public/login.html" -Destination "./out/login.html" -Force

    # ── Provision Azure Static Web App (Free tier) ────────────────────
    Write-Host "`n==> Ensuring resource group '$ResourceGroup' exists..." -ForegroundColor Green
    az group create --name $ResourceGroup --location $Location --output none

    $existing = az staticwebapp show --name $AppName --resource-group $ResourceGroup 2>$null
    if ($existing) {
        Write-Host "==> Static Web App '$AppName' already exists." -ForegroundColor Cyan
    }
    else {
        Write-Host "==> Creating Static Web App '$AppName' (Free tier)..." -ForegroundColor Green
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

    # ── Output URL & next steps ───────────────────────────────────────
    $hostname = (az staticwebapp show `
        --name $AppName `
        --resource-group $ResourceGroup `
        --query "defaultHostname" `
        --output tsv)

    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "Deployment complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "URL:       https://$hostname" -ForegroundColor Cyan
    Write-Host "Auth:      Microsoft Entra ID + GitHub (pre-configured)" -ForegroundColor Cyan
    Write-Host "SKU:       Free" -ForegroundColor Cyan
    Write-Host "========================================`n" -ForegroundColor Cyan

    Write-Host "NEXT STEP: Invite users in the Azure Portal" -ForegroundColor Yellow
    Write-Host "  1. Go to: Azure Portal > Static Web Apps > $AppName > Role management" -ForegroundColor Yellow
    Write-Host "  2. Click 'Invite' and assign the 'authenticated' role" -ForegroundColor Yellow
    Write-Host "  3. Users accept the invitation link to gain access" -ForegroundColor Yellow
}
finally {
    Pop-Location
}
