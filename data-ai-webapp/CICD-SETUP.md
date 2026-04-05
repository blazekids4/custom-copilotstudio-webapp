# CI/CD Setup — Data AI WebApp

This guide documents the full process for setting up GitHub Actions CI/CD with **Azure federated credentials (OIDC)** — no secrets to rotate.

---

## Prerequisites

- Azure CLI (`az`) installed and authenticated
- Owner or User Access Administrator role on your Azure subscription
- GitHub repo: `blazekids4/custom-copilotstudio-webapp`

---

## 1. Create an Entra ID App Registration

```bash
az ad app create --display-name "data-ai-webapp-cicd"
```

Note the `appId` from the output — this is your **Application (client) ID**.

## 2. Create a Service Principal

```bash
az ad sp create --id <appId>
```

Note the `id` (object ID) from the output.

## 3. Add a Federated Credential for GitHub Actions

This lets GitHub Actions authenticate to Azure without storing any client secret.

> **PowerShell note:** Single-quoted JSON strings get mangled. Write to a temp file instead.

```powershell
# Write the credential JSON to a temp file
@{
    name      = "github-actions-master"
    issuer    = "https://token.actions.githubusercontent.com"
    subject   = "repo:blazekids4/custom-copilotstudio-webapp:ref:refs/heads/master"
    audiences = @("api://AzureADTokenExchange")
} | ConvertTo-Json | Set-Content -Path "$env:TEMP\fed-cred.json"

# Create the federated credential
az ad app federated-credential create `
    --id <appId> `
    --parameters "@$env:TEMP\fed-cred.json"
```

Or in Bash:

```bash
az ad app federated-credential create --id <appId> --parameters '{
  "name": "github-actions-master",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:blazekids4/custom-copilotstudio-webapp:ref:refs/heads/master",
  "audiences": ["api://AzureADTokenExchange"]
}'
```

## 4. Grant Subscription-Level Roles

The service principal needs **Contributor** (to deploy resources) and **User Access Administrator** (to assign RBAC roles during provisioning).

```bash
az role assignment create \
    --assignee <appId> \
    --role Contributor \
    --scope /subscriptions/<subscriptionId>

az role assignment create \
    --assignee <appId> \
    --role "User Access Administrator" \
    --scope /subscriptions/<subscriptionId>
```

---

## 5. Configure GitHub Repository Variables

Go to **Settings → Secrets and variables → Actions → Variables** and add:

| Variable                     | Value                                  |
| ---------------------------- | -------------------------------------- |
| `AZURE_CLIENT_ID`            | `e9ae0b57-1057-4bcf-b9bf-cc8bede654a6` |
| `AZURE_TENANT_ID`            | `6eef943b-5bf3-481a-8927-e07323bfe282` |
| `AZURE_SUBSCRIPTION_ID`      | `86f1d17d-24ca-4294-8dcd-0d14ed6e8797` |
| `AZURE_RESOURCE_GROUP`       | `rg-my-data-ai-app`                   |
| `AZURE_CONTAINER_REGISTRY`   | `crplytko3h4tj7k`                     |
| `AZURE_CONTAINER_APP`        | `ca-api-plytko3h4tj7k`                |
| `AZURE_STATIC_WEB_APP`       | `swa-plytko3h4tj7k`                   |

> These are **variables** (not secrets) because OIDC federated auth doesn't require any secret values.

---

## 6. GitHub Actions Workflow

The workflow lives at `.github/workflows/deploy-data-ai-webapp.yml`.

### Triggers

- **Push to `master`** when files in `data-ai-webapp/` change
- **Manual dispatch** via the Actions tab

### What It Does

No infrastructure provisioning — code deploys only. Backend and frontend deploy in parallel.

```
Checkout → OIDC Login → Build Docker Image → Push to ACR → Update Container App
Checkout → OIDC Login → Build Frontend → Deploy to Static Web App
```

### Full Workflow

```yaml
name: Deploy Data AI WebApp

on:
  push:
    branches: [master]
    paths:
      - "data-ai-webapp/**"
  workflow_dispatch:

permissions:
  id-token: write   # Required for OIDC federated credential
  contents: read

env:
  RESOURCE_GROUP: ${{ vars.AZURE_RESOURCE_GROUP }}
  ACR_NAME: ${{ vars.AZURE_CONTAINER_REGISTRY }}
  CONTAINER_APP: ${{ vars.AZURE_CONTAINER_APP }}
  SWA_NAME: ${{ vars.AZURE_STATIC_WEB_APP }}

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: data-ai-webapp

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Log in to Azure
        uses: azure/login@v2
        with:
          client-id: ${{ vars.AZURE_CLIENT_ID }}
          tenant-id: ${{ vars.AZURE_TENANT_ID }}
          subscription-id: ${{ vars.AZURE_SUBSCRIPTION_ID }}

      - name: Build and push container image
        run: |
          az acr login --name $ACR_NAME
          IMAGE="${ACR_NAME}.azurecr.io/data-ai-webapp:${{ github.sha }}"
          docker build -t "$IMAGE" .
          docker push "$IMAGE"

      - name: Deploy to Container App
        run: |
          az containerapp update \
            --name $CONTAINER_APP \
            --resource-group $RESOURCE_GROUP \
            --image "${ACR_NAME}.azurecr.io/data-ai-webapp:${{ github.sha }}"

  deploy-frontend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: data-ai-webapp

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Log in to Azure
        uses: azure/login@v2
        with:
          client-id: ${{ vars.AZURE_CLIENT_ID }}
          tenant-id: ${{ vars.AZURE_TENANT_ID }}
          subscription-id: ${{ vars.AZURE_SUBSCRIPTION_ID }}

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Build frontend
        working-directory: data-ai-webapp/frontend
        run: |
          npm ci
          npm run build

      - name: Deploy to Static Web App
        run: |
          DEPLOY_TOKEN=$(az staticwebapp secrets list --name "$SWA_NAME" --query "properties.apiKey" -o tsv)
          npx @azure/static-web-apps-cli deploy ./frontend/out \
            --deployment-token "$DEPLOY_TOKEN" \
            --env default
```

---

## Architecture Summary

| Component        | Azure Service          | Deploy Method              |
| ---------------- | ---------------------- | -------------------------- |
| Backend API      | Container App          | `azd deploy api` (Docker)  |
| Frontend         | Static Web App         | SWA CLI                    |
| Infrastructure   | Bicep (via `azd`)      | `azd provision`            |
| Auth (CI/CD)     | Entra ID + OIDC        | Federated credential       |
| AI Search        | Azure AI Search        | Python setup script        |
| Database         | Cosmos DB              | Provisioned via Bicep      |
| File Storage     | Blob Storage           | Provisioned via Bicep      |
| AI Models        | Azure OpenAI           | Provisioned via Bicep      |

---

## Troubleshooting

| Issue | Fix |
| ----- | --- |
| `AADSTS700024: Client assertion is not within its valid time range` | Check GitHub runner clock; re-run the workflow |
| `OIDC token subject mismatch` | Ensure the federated credential `subject` matches the branch (`ref:refs/heads/master`) |
| PowerShell JSON parsing errors | Use a temp file or here-string instead of inline JSON (see Step 3) |
| `Resource does not exist` on `az ad app federated-credential create` | You used the wrong `--id`; use the Application (client) ID, not the Object ID |
| Model quota exceeded during provision | See `DEPLOYMENT-TRIPWIRES.md` for quota troubleshooting |

---

## Reference IDs (Current Environment)

| Resource                | ID |
| ----------------------- | -- |
| Application (client) ID | `e9ae0b57-1057-4bcf-b9bf-cc8bede654a6` |
| Object ID               | `1edb7f35-f1e2-41b8-aba7-1b48baea2515` |
| Tenant ID               | `6eef943b-5bf3-481a-8927-e07323bfe282` |
| Subscription ID          | `86f1d17d-24ca-4294-8dcd-0d14ed6e8797` |
