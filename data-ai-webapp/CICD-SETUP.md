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

| Variable                   | Value                                  |
| -------------------------- | -------------------------------------- |
| `AZURE_CLIENT_ID`          | `e9ae0b57-1057-4bcf-b9bf-cc8bede654a6` |
| `AZURE_TENANT_ID`          | `6eef943b-5bf3-481a-8927-e07323bfe282` |
| `AZURE_SUBSCRIPTION_ID`    | `86f1d17d-24ca-4294-8dcd-0d14ed6e8797` |
| `AZURE_ENV_NAME`           | Your azd environment name (e.g. `dev`) |
| `AZURE_LOCATION`           | Target region (e.g. `eastus2`)         |

> These are **variables** (not secrets) because OIDC federated auth doesn't require any secret values.

---

## 6. GitHub Actions Workflow

The workflow lives at `.github/workflows/deploy-data-ai-webapp.yml`.

### Triggers

- **Push to `master`** when files in `data-ai-webapp/` change
- **Manual dispatch** via the Actions tab

### What It Does

```
Checkout → Install azd → OIDC Login → Provision Infra → Setup AI Search → Deploy Backend → Build Frontend → Deploy Frontend
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
  AZURE_ENV_NAME: ${{ vars.AZURE_ENV_NAME }}
  AZURE_LOCATION: ${{ vars.AZURE_LOCATION }}
  AZURE_SUBSCRIPTION_ID: ${{ vars.AZURE_SUBSCRIPTION_ID }}

jobs:
  deploy:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: data-ai-webapp

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install azd
        uses: Azure/setup-azd@v2

      - name: Log in with Azure (federated credentials)
        run: |
          azd auth login `
            --client-id "${{ vars.AZURE_CLIENT_ID }}" `
            --federated-credential-provider "github" `
            --tenant-id "${{ vars.AZURE_TENANT_ID }}"
        shell: pwsh

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Provision infrastructure
        run: azd provision --no-prompt

      - name: Set up AI Search index
        run: |
          azd env get-values | ForEach-Object {
            if ($_ -match '^([^=]+)=(.*)$') {
              $key = $Matches[1]
              $val = $Matches[2].Trim('"')
              [Environment]::SetEnvironmentVariable($key, $val, 'Process')
            }
          }
          pip install -r requirements.txt
          python -m backend.setup_search
        shell: pwsh

      - name: Deploy backend (Container App)
        run: azd deploy api --no-prompt

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Build frontend
        working-directory: data-ai-webapp/frontend
        run: |
          npm ci
          npm run build

      - name: Deploy frontend (Static Web App)
        working-directory: data-ai-webapp
        run: |
          SWA_NAME=$(azd env get-value AZURE_STATIC_WEB_APP_NAME)
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
