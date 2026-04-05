<#
.SYNOPSIS
    Deploy the Writer's Studio demo frontend to Azure Static Web Apps (free tier, no auth).

.PARAMETER appName
    Name of the SWA resource to create.

.PARAMETER resourceGroup
    Resource group to deploy into (created if it doesn't exist).

.PARAMETER location
    Azure region for the SWA. Default: centralus
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$appName,

    [Parameter(Mandatory = $true)]
    [string]$resourceGroup,

    [string]$location = "centralus"
)

$ErrorActionPreference = "Stop"

Write-Host "`n=== Step 1: Build static site ===" -ForegroundColor Cyan
npm install
npm run build

Write-Host "`n=== Step 2: Ensure resource group exists ===" -ForegroundColor Cyan
az group create --name $resourceGroup --location $location -o none 2>$null

Write-Host "`n=== Step 3: Create Static Web App (Free tier) ===" -ForegroundColor Cyan
$existing = az staticwebapp show --name $appName --resource-group $resourceGroup 2>$null
if (-not $existing) {
    az staticwebapp create `
        --name $appName `
        --resource-group $resourceGroup `
        --location $location `
        --sku Free `
        -o none
    Write-Host "Created SWA: $appName" -ForegroundColor Green
} else {
    Write-Host "SWA already exists: $appName" -ForegroundColor Yellow
}

Write-Host "`n=== Step 4: Deploy to SWA ===" -ForegroundColor Cyan
$deployToken = az staticwebapp secrets list --name $appName --resource-group $resourceGroup --query "properties.apiKey" -o tsv
npx @azure/static-web-apps-cli deploy ./out `
    --deployment-token $deployToken `
    --env production

$hostname = az staticwebapp show --name $appName --resource-group $resourceGroup --query "defaultHostname" -o tsv
Write-Host "`n=== Writer's Studio deployed ===" -ForegroundColor Green
Write-Host "URL: https://$hostname" -ForegroundColor Cyan
