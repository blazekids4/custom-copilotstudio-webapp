<#
.SYNOPSIS
    Deploys the frontend-only Next.js static site to Azure Static Web Apps
    with Microsoft Entra ID (Azure AD) authentication.

.DESCRIPTION
    This script:
    1. Builds the Next.js static export.
    2. Provisions an Azure Static Web App (Standard tier — required for custom auth).
    3. Registers (or reuses) a Microsoft Entra ID app registration.
    4. Configures the SWA with the Entra ID client ID.
    5. Deploys the out/ folder via the SWA CLI.

.PARAMETER ResourceGroup
    Name of the Azure resource group. Default: rg-frontend-auth-entra

.PARAMETER AppName
    Name of the Azure Static Web App. Default: swa-frontend-auth-entra

.PARAMETER Location
    Azure region. Default: eastus2

.PARAMETER EntraAppName
    Display name for the Entra ID app registration. Default: swa-frontend-auth-entra

.PARAMETER TenantId
    (Optional) Entra ID tenant ID. If omitted, uses your current Azure CLI tenant.

.PARAMETER SkipBuild
    Skip the npm build step if the out/ folder is already up to date.

.EXAMPLE
    .\deploy-swa.ps1
    .\deploy-swa.ps1 -ResourceGroup my-rg -AppName my-swa -EntraAppName my-app-reg
    .\deploy-swa.ps1 -SkipBuild
#>

param(
    [string]$ResourceGroup = "rg-frontend-auth-entra",
    [string]$AppName       = "swa-frontend-auth-entra",
    [string]$Location      = "eastus2",
    [string]$EntraAppName  = "swa-frontend-auth-entra",
    [string]$TenantId      = "",
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

if (-not $TenantId) {
    $TenantId = $account.tenantId
}
Write-Host "Using tenant: $TenantId" -ForegroundColor Cyan

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

    # ── Provision Azure Static Web App (Standard tier) ────────────────
    Write-Host "`n==> Ensuring resource group '$ResourceGroup' exists..." -ForegroundColor Green
    az group create --name $ResourceGroup --location $Location --output none

    $existing = az staticwebapp show --name $AppName --resource-group $ResourceGroup 2>$null
    if ($existing) {
        Write-Host "==> Static Web App '$AppName' already exists." -ForegroundColor Cyan
    }
    else {
        Write-Host "==> Creating Static Web App '$AppName' (Standard tier for custom auth)..." -ForegroundColor Green
        az staticwebapp create `
            --name $AppName `
            --resource-group $ResourceGroup `
            --location $Location `
            --sku Standard `
            --output none
    }

    # Get the SWA hostname for redirect URIs
    $hostname = (az staticwebapp show `
        --name $AppName `
        --resource-group $ResourceGroup `
        --query "defaultHostname" `
        --output tsv)
    Write-Host "==> SWA hostname: $hostname" -ForegroundColor Cyan

    # ── Entra ID App Registration ─────────────────────────────────────
    Write-Host "`n==> Checking for Entra ID app registration '$EntraAppName'..." -ForegroundColor Green

    $existingApp = az ad app list --display-name $EntraAppName --query "[0]" 2>$null | ConvertFrom-Json
    if ($existingApp) {
        $clientId = $existingApp.appId
        Write-Host "==> App registration already exists. Client ID: $clientId" -ForegroundColor Cyan
    }
    else {
        Write-Host "==> Creating Entra ID app registration..." -ForegroundColor Green

        $redirectUri = "https://$hostname/.auth/login/aad/callback"

        $appJson = az ad app create `
            --display-name $EntraAppName `
            --sign-in-audience "AzureADMyOrg" `
            --web-redirect-uris $redirectUri `
            --enable-id-token-issuance true `
            --query "{appId: appId, id: id}" `
            --output json | ConvertFrom-Json

        $clientId = $appJson.appId
        Write-Host "==> App registration created. Client ID: $clientId" -ForegroundColor Green
    }

    # ── Create client secret on app registration ─────────────────────
    Write-Host "==> Creating client secret on app registration..." -ForegroundColor Green
    $secretJson = az ad app credential reset `
        --id $clientId `
        --display-name "SWA Auth" `
        --years 2 `
        --query "{password: password}" `
        --output json | ConvertFrom-Json
    $clientSecret = $secretJson.password
    Write-Host "==> Client secret created." -ForegroundColor Green

    # ── Update staticwebapp.config.json with tenant & client ID ───────
    Write-Host "==> Updating staticwebapp.config.json with tenant and client ID..." -ForegroundColor Green
    $configPath = Join-Path $PSScriptRoot "staticwebapp.config.json"
    $config = Get-Content $configPath -Raw
    $config = $config -replace "<TENANT_ID>", $TenantId
    Set-Content $configPath -Value $config

    # Copy config into the out/ folder so it's deployed
    Copy-Item $configPath -Destination "./out/staticwebapp.config.json" -Force

    # ── Set the AAD_CLIENT_ID and AAD_CLIENT_SECRET app settings ──────
    Write-Host "==> Setting AAD_CLIENT_ID and AAD_CLIENT_SECRET app settings..." -ForegroundColor Green
    az staticwebapp appsettings set `
        --name $AppName `
        --resource-group $ResourceGroup `
        --setting-names "AAD_CLIENT_ID=$clientId" "AAD_CLIENT_SECRET=$clientSecret" `
        --output none

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

    # ── Summary ───────────────────────────────────────────────────────
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "Deployment complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "URL:              https://$hostname" -ForegroundColor Cyan
    Write-Host "Auth provider:    Microsoft Entra ID" -ForegroundColor Cyan
    Write-Host "Tenant ID:        $TenantId" -ForegroundColor Cyan
    Write-Host "Client ID:        $clientId" -ForegroundColor Cyan
    Write-Host "SKU:              Standard" -ForegroundColor Cyan
    Write-Host "========================================`n" -ForegroundColor Cyan

    Write-Host "NOTE: Only users in your Entra ID tenant can access this app." -ForegroundColor Yellow
    Write-Host "To allow specific external users, configure invitations in the Azure Portal." -ForegroundColor Yellow
}
finally {
    Pop-Location
}
