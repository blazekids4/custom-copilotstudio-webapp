# Deploy to Azure Container Apps

One-command deployment using the Azure Developer CLI (`azd`). Mimics the Vercel experience — provision infrastructure and deploy in a single step.

---

## Prerequisites

| Tool | Install |
|------|---------|
| **Azure Developer CLI** (`azd`) | `winget install Microsoft.Azd` |
| **Docker Desktop** | [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/) |
| **Azure subscription** | [Free tier works](https://azure.microsoft.com/free) |

Verify both are installed:

```powershell
azd version
docker --version
```

---

## Step 1 — Initialize `azd`

From the project root:

```powershell
azd init
```

When prompted:
- **Environment name**: pick a short name (e.g. `copilot-poc-dev`) — this becomes part of your Azure resource names
- **Azure subscription**: select yours
- **Azure location**: pick a region (e.g. `eastus2`)

---

## Step 2 — Set your secrets

These map to the same values in your `.env` file. Run each command:

```powershell
azd env set TENANT_ID        "<your-entra-tenant-id>"
azd env set CLIENT_ID         "<your-app-registration-client-id>"
azd env set CLIENT_SECRET      "<your-client-secret-value>"
azd env set REDIRECT_URI       "https://PLACEHOLDER"
azd env set COPILOT_CONNECTION_STRING "<your-copilot-studio-connection-string>"
azd env set ALLOWED_ORIGIN     ""
```

> **Note:** Set `REDIRECT_URI` to a placeholder for now. You'll update it after getting the app URL in Step 5.

---

## Step 3 — Authenticate with Azure

```powershell
azd auth login
```

This opens a browser to sign in with your Azure account. You'll select your subscription and region when `azd up` runs in the next step.

---

## Step 4 — Deploy everything

```powershell
azd up
```

This single command will:

1. Create a **Resource Group** (`rg-<env-name>`)
2. Create a **Container Registry** (ACR) to hold your Docker image
3. Create a **Container Apps Environment** with Log Analytics
4. **Build** the multi-stage Docker image (Next.js static export + Python backend)
5. **Push** the image to ACR
6. Create the **Container App** with your secrets injected as environment variables
7. Enable HTTPS ingress with a managed TLS certificate

Estimated time: ~3-5 minutes on first run.

---

## Step 5 — Update the redirect URI

After `azd up` completes, it prints the app URL:

```
WEB_URI = https://ca-web-abc123.kindocean-xyz.eastus2.azurecontainerapps.io
```

**Two things to update:**

### 5a. Update the Entra ID app registration

1. Go to [Azure Portal → App registrations](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps)
2. Open your app registration (`CLIENT_ID`)
3. Go to **Authentication** → **Redirect URIs**
4. Add your Container App URL (e.g. `https://ca-web-abc123.kindocean-xyz.eastus2.azurecontainerapps.io`)
5. **Save**

### 5b. Update the `azd` environment and re-provision

`azd deploy` only pushes a new container image — it does **not** update infrastructure secrets. You must run `azd up` (or `azd provision`) to push the updated secret values to the Container App.

```powershell
azd env set REDIRECT_URI "https://ca-web-abc123.kindocean-xyz.eastus2.azurecontainerapps.io"
azd up
```

> **Important:** Use `azd up` (not `azd deploy`) any time you change an `azd env` variable that maps to a Bicep parameter/secret. `azd up` = `azd provision` + `azd deploy`.

---

## Step 6 — Verify

Open the app URL in your browser. You should see the login page. Sign in with your Entra ID account and start chatting with the Copilot Studio agent.

Health check:

```powershell
curl https://ca-web-abc123.kindocean-xyz.eastus2.azurecontainerapps.io/api/health
# → {"status": "ok"}
```

---

## Day-to-day operations

### Redeploy after code changes

```powershell
azd deploy
```

Rebuilds the container and updates the app. Takes ~1-2 minutes.

> **Note:** `azd deploy` only updates the container image. If you changed any environment variables via `azd env set`, you must run `azd up` (or `azd provision`) instead to update the infrastructure secrets.

### View logs

```powershell
az containerapp logs show --name <app-name> --resource-group <rg-name> --follow
```

### Tear down everything

```powershell
azd down
```

Deletes all Azure resources created by `azd up`. Clean slate.

### Spin up a second environment (e.g. staging)

```powershell
azd env new copilot-poc-staging
azd env set TENANT_ID "..."
# ... set all secrets ...
azd up
```

Each environment gets its own isolated resource group.

---

## Cost

| State | Est. cost |
|-------|-----------|
| **Idle** (scale to zero) | ~$0/month |
| **Active use** (light POC traffic) | ~$1-5/month |
| **ACR Basic** | ~$5/month |

Container Apps only charges for vCPU/memory seconds consumed. With `minReplicas: 0`, you pay nothing when nobody is using the app.

---

## Architecture

```
Internet
   │
   ▼
┌─────────────────────────────────────────────┐
│  Azure Container Apps  (HTTPS, scale 0→3)   │
│  ┌───────────────────────────────────────┐  │
│  │  Python aiohttp  (:8080)              │  │
│  │  ├── /api/auth/*  → Entra ID OAuth    │  │
│  │  ├── /api/chat    → Copilot Studio    │  │
│  │  ├── /api/health  → health check      │  │
│  │  └── /*           → Next.js static    │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  ACR ← multi-stage Dockerfile               │
│  Log Analytics ← container logs             │
└─────────────────────────────────────────────┘
         │                    │
         ▼                    ▼
   Entra ID             Copilot Studio
   (OAuth2)             (Power Platform)
```

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `azd up` fails on Docker build | Make sure Docker Desktop is running |
| 401 on login | Verify `REDIRECT_URI` matches the app registration exactly |
| "Session expired" errors | The in-memory session store resets on redeploy — users need to re-login |
| Container keeps restarting | Check logs: `az containerapp logs show ...` — likely a missing env var |
| Can't reach the app | Verify ingress is set to external: `az containerapp show --name <name> -g <rg> --query properties.configuration.ingress` |
