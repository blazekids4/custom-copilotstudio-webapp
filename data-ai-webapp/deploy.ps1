<#
.SYNOPSIS
    Deploy the frontend to Azure Static Web Apps and backend to Azure Container Apps.

.DESCRIPTION
    This script:
    1. Provisions infrastructure via azd
    2. Builds and deploys the backend container
    3. Builds and deploys the frontend to SWA
    4. Configures the SWA linked backend

.PARAMETER envName
    The azd environment name.
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$envName
)

$ErrorActionPreference = "Stop"

# ── Prerequisites check ─────────────────────────────────────
function Test-Command($cmd) {
    $null = Get-Command $cmd -ErrorAction SilentlyContinue
    return $?
}

$required = @("az", "azd", "node", "npm", "docker")
foreach ($cmd in $required) {
    if (-not (Test-Command $cmd)) {
        Write-Error "Required tool not found: $cmd"
        exit 1
    }
}

Write-Host "`n=== Step 1: Initialize azd environment ===" -ForegroundColor Cyan
azd env select $envName 2>$null
if ($LASTEXITCODE -ne 0) {
    azd init -e $envName
}

Write-Host "`n=== Step 2: Provision infrastructure ===" -ForegroundColor Cyan
azd provision

Write-Host "`n=== Step 3: Configure AI Search indexer pipeline ===" -ForegroundColor Cyan
python -m backend.setup_search

Write-Host "`n=== Step 4: Deploy backend (Container App) ===" -ForegroundColor Cyan
azd deploy api

Write-Host "`n=== Step 5: Build frontend ===" -ForegroundColor Cyan
Push-Location frontend
npm install
npm run build
Pop-Location

Write-Host "`n=== Step 6: Deploy frontend (Static Web App) ===" -ForegroundColor Cyan
$swaName = azd env get-value AZURE_STATIC_WEB_APP_NAME 2>$null
if ($swaName) {
    $deployToken = az staticwebapp secrets list --name $swaName --query "properties.apiKey" -o tsv
    npx @azure/static-web-apps-cli deploy ./frontend/out `
        --deployment-token $deployToken `
        --env production
}
else {
    Write-Warning "SWA name not found in azd env. Deploy frontend manually."
}

Write-Host "`n=== Step 7: Configure SWA backend link ===" -ForegroundColor Cyan
$acaUrl = azd env get-value AZURE_CONTAINER_APP_URL 2>$null
if ($swaName -and $acaUrl) {
    az staticwebapp backends link `
        --name $swaName `
        --backend-resource-id (az containerapp show --name (azd env get-value AZURE_CONTAINER_APP_NAME) --query id -o tsv) `
        --backend-region (azd env get-value AZURE_LOCATION)
    Write-Host "Linked SWA to backend: $acaUrl" -ForegroundColor Green
}

Write-Host "`n=== Deployment complete ===" -ForegroundColor Green
Write-Host "Backend:  $(azd env get-value AZURE_CONTAINER_APP_URL)"
Write-Host "Frontend: https://$(azd env get-value AZURE_STATIC_WEB_APP_URL)"
