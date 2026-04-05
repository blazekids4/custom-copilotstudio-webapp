# Deployment Tripwires

Common deployment issues encountered when provisioning this project, with root causes and fixes. Read this before your first `deploy.ps1` run to save time.

---

## 1. Model Quota Exceeded (`InsufficientQuota`)

**Error:**

```
InsufficientQuota: This operation require 75 new capacity in quota
One Thousand Tokens Per Minute - gpt-5.4 - DataZoneStandard,
which is bigger than the current available capacity 0.
```

**Root Cause:**
Azure OpenAI model quotas are **per-model, per-SKU-tier, per-subscription** — not per resource group. If you already have deployments of the same model+SKU elsewhere in the subscription, the capacity stacks against a shared ceiling.

The `capacity` values in `main.parameters.json` are **absolute K TPM** values, not percentages of your quota.

**How to Fix:**

1. Check your current usage:
   ```powershell
   az cognitiveservices usage list --location eastus2 -o table
   ```
2. Options:
   - **Reduce capacity** in `main.parameters.json` for the affected model
   - **Remove the model** from the `modelDeployments` array
   - **Delete or reduce** existing deployments of that model elsewhere in the subscription
   - **Request a quota increase** in Azure Portal → Subscriptions → Usage + quotas

**Prevention:** Before deploying, review your subscription's current model quota usage. The deploy script does not pre-check quotas.

---

## 2. AI Search Region Capacity (`InsufficientResourcesAvailable`)

**Error:**

```
InsufficientResourcesAvailable: The region 'eastus2' is currently out of
the resources required to provision new services.
Try creating the service in another region.
```

**Root Cause:**
Some Azure regions run out of capacity for new AI Search instances, especially on the Basic and Free tiers. This is an Azure-side constraint — not a subscription quota issue.

**How to Fix:**
The Bicep template includes a `searchLocation` parameter. In `main.parameters.json` this already defaults to `centralus` to avoid high-demand region issues:

```json
"searchLocation": { "value": "${AZURE_SEARCH_LOCATION=centralus}" }
```

To override, set it via azd:

```powershell
azd env set AZURE_SEARCH_LOCATION centralus
```

AI Search does not need to be co-located with your other resources — cross-region latency is minimal for search queries.

**Prevention:** The `searchLocation` parameter in `main.parameters.json` already defaults to `centralus` to avoid this issue. If you need a different region, override via `azd env set AZURE_SEARCH_LOCATION <region>`.

---

## 3. Container App Fails — Image Not Yet in ACR (`MANIFEST_UNKNOWN`)

**Error:**

```
ContainerAppOperationError: Failed to provision revision for container app.
Invalid value: "crXXX.azurecr.io/api:latest":
GET https:: MANIFEST_UNKNOWN: manifest tagged by "latest" is not found
```

**Root Cause:**
Classic chicken-and-egg problem. The Bicep template creates the Container App referencing `api:latest` from ACR, but no Docker image has been pushed yet because this is the first deployment.

**How to Fix:**
This is now fixed in the Bicep templates. The `container-app.bicep` module accepts an optional `containerImage` parameter, and `main.bicep` defaults it to a public placeholder (`mcr.microsoft.com/azuredocs/containerapps-helloworld:latest`). On first provision, the Container App starts with the placeholder, and `azd deploy api` replaces it with the real image.

The `deploy.ps1` fallback recovery also now derives the ACR endpoint from the ACR name (`${acrName}.azurecr.io`) instead of reading `AZURE_CONTAINER_REGISTRY_ENDPOINT`, which may not be saved when provisioning fails partway.

If running manually, push the image first:

```powershell
$acrName = azd env get-value AZURE_CONTAINER_REGISTRY_NAME
az acr login --name $acrName
docker build -t "${acrName}.azurecr.io/api:latest" .
docker push "${acrName}.azurecr.io/api:latest"
azd provision
```

**Prevention:** Always use `deploy.ps1` for first-time deployments. It handles the image-push ordering automatically.

---

## 4. Deployment Conflict — Previous Deployment Still Active (`DeploymentActive`)

**Error:**

```
DeploymentActive: The deployment with resource id '...' cannot be saved,
because this would overwrite an existing deployment which is still active.
```

**Root Cause:**
A previous `azd provision` run was cancelled or failed partway, but ARM still considers some nested deployments (e.g., `cosmos-db`, `openai`) as active. ARM won't allow a new deployment with the same name until the previous one completes or is cancelled.

**How to Fix:**
Cancel the stuck deployments:

```powershell
az deployment group cancel --name "cosmos-db" --resource-group "rg-<your-env-name>"
az deployment group cancel --name "openai" --resource-group "rg-<your-env-name>"
```

Then re-run `deploy.ps1`.

**Prevention:** Avoid pressing Ctrl+C during `azd provision`. If you must cancel, wait for the cancellation to propagate before re-running. ARM deployments can take up to 7 days to expire on their own.

---

## 5. AI Search `semanticSearch` Free Tier Conflict

**Error:**

```
Failed: Search service: srch-XXXX
Make sure you aren't deploying a free service
```

**Root Cause:**
The `semanticSearch` property in `ai-search.bicep` was set to `'free'`. Azure only allows one free-tier semantic search configuration per subscription, or the region may not support the free tier.

**How to Fix:**
The template now uses `semanticSearch: 'standard'`. If you see this error on an older version of the code, update `infra/modules/ai-search.bicep`:

```bicep
properties: {
  semanticSearch: 'standard'  // not 'free'
}
```

**Prevention:** Use `'standard'` for semantic search unless you specifically need to avoid the cost (semantic search on Standard adds usage-based pricing on top of the Basic SKU).

---

## 6. Setup Script Fails — Missing Environment Variables (`Bearer token / non-TLS`)

**Error:**

```
ServiceRequestError: Bearer token authentication is not permitted
for non-TLS protected (non-https) URLs.
```

**Root Cause:**
`setup_search.py` reads configuration from `os.environ` (e.g., `AZURE_SEARCH_ENDPOINT`). After `azd provision`, outputs are stored in the azd environment but are **not** automatically injected into the current shell session. Without the env vars set, the endpoint resolves to an empty string, triggering the non-HTTPS error.

**How to Fix:**
This is now fixed in `deploy.ps1` — Step 3 loads all azd env values into the current process before calling the Python script:

```powershell
azd env get-values | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        $key = $Matches[1]
        $val = $Matches[2].Trim('"')
        [Environment]::SetEnvironmentVariable($key, $val, 'Process')
    }
}
python -m backend.setup_search
```

If running manually, load the env vars first, then run the script.

**Prevention:** Always use the latest `deploy.ps1`. If running steps manually, always load azd env values into your shell before running backend scripts.

---

## 7. Soft-Deleted Cognitive Services Resource Blocks Redeployment (`FlagMustBeSetForRestore`)

**Error:**

```
FlagMustBeSetForRestore: An existing resource with ID
'.../Microsoft.CognitiveServices/accounts/oai-XXXX'
has been soft-deleted. To restore the resource, you must specify
'restore' to be 'true' in the property.
```

**Root Cause:**
When you delete a resource group, Cognitive Services (AI Foundry) resources are **soft-deleted** by default and retained for 48 hours. Redeploying with the same resource name (which happens because names are derived from a deterministic `uniqueString`) fails because ARM sees the soft-deleted resource and refuses to create a new one.

**How to Fix:**
Purge the soft-deleted resource before re-provisioning:

```powershell
az cognitiveservices account purge \
    --name oai-XXXX \
    --resource-group rg-<your-env-name> \
    --location <region>
```

Then re-run `deploy.ps1`.

**Prevention:** When tearing down for redeployment, use `azd down --purge` instead of `az group delete`. This deletes resources and purges soft-deleted items in one step.

---

## 8. VPN Routing Blocks Connections to Azure Services (`Connection timed out`)

**Error:**

```
ServiceRequestTimeoutError: Connection to srch-XXXX.search.windows.net
timed out. (connect timeout=300)
```

With `Test-NetConnection` showing:
```
InterfaceAlias : MSFT-AzVPN-Manual
TcpTestSucceeded : False
```

**Root Cause:**
A corporate or Azure VPN adapter intercepts traffic destined for Azure public endpoints and routes it through the VPN tunnel, where it gets dropped or blocked by network policy. This affects `setup_search.py` and any local script that calls Azure services.

**How to Fix:**
Disconnect the VPN before running `setup_search.py` or other local Azure SDK scripts. Verify connectivity with:

```powershell
Test-NetConnection <service>.search.windows.net -Port 443
```

If `TcpTestSucceeded` is `True`, the connection is good.

**Prevention:** Run local admin scripts (like `setup_search.py`) outside the VPN. The deployed Container App uses managed identity over the Azure backbone and is not affected by local VPN routing.

---

## 9. AI Search Setup Returns `403 Forbidden` — Missing RBAC for Local User

**Error:**

```
HttpResponseError: Operation returned an invalid status 'Forbidden'
```

**Root Cause:**
The Bicep RBAC module grants roles to **managed identities** (Container App, AI Search, Foundry) only. Your local user (the identity `DefaultAzureCredential` resolves to when running `setup_search.py` locally) doesn't have any role on the Search service.

**How to Fix:**
Grant your signed-in user the required Search roles:

```powershell
$searchId = az search service show --name srch-XXXX \
    --resource-group rg-<env> --query id -o tsv
$myId = az ad signed-in-user show --query id -o tsv
az role assignment create --assignee $myId \
    --role "Search Service Contributor" --scope $searchId
az role assignment create --assignee $myId \
    --role "Search Index Data Contributor" --scope $searchId
```

Wait ~30 seconds for RBAC propagation, then retry.

**Prevention:** The deploy script could add the deploying user's principal ID to the RBAC module. For now, this is a one-time manual step on first deployment.

---

## 10. AI Search Rejects AAD Auth — `authOptions` Not Configured

**Error:**

```
HttpResponseError: Operation returned an invalid status 'Forbidden'
```

(Even after granting yourself Search RBAC roles.)

**Root Cause:**
By default, Azure AI Search only accepts **API key** authentication. The `setup_search.py` script uses `DefaultAzureCredential` (AAD/RBAC), which the Search service silently rejects with `403 Forbidden` unless you explicitly enable AAD auth via the `authOptions` property.

**How to Fix:**
This is now fixed in `ai-search.bicep` — the module sets `authOptions.aadOrApiKey` to allow both AAD and API key auth:

```bicep
properties: {
  authOptions: {
    aadOrApiKey: {
      aadAuthFailureMode: 'http403'
    }
  }
}
```

For an existing Search service, update it via CLI:

```powershell
az search service update --name srch-XXXX \
    --resource-group rg-<env> \
    --auth-options aadOrApiKey \
    --aad-auth-failure-mode http403
```

**Prevention:** The Bicep template now enables AAD auth by default. No manual action needed on new deployments.

---

## 11. Search Data Source Expects ARM Resource ID, Not Blob URL

**Error:**

```
Invalid resource ID string format: https://stXXX.blob.core.windows.net.
It must be in the following format:
/subscriptions/<sub>/resourceGroups/<rg>/providers/Microsoft.Storage/storageAccounts/<name>
```

**Root Cause:**
When using managed identity auth for an AI Search data source connection, the `connection_string` must be `ResourceId=/subscriptions/.../storageAccounts/<name>` — the full ARM resource ID. The code was previously passing the blob endpoint URL (`https://stXXX.blob.core.windows.net`) which is only valid with connection-string (key-based) auth.

**How to Fix:**
This is now fixed in `setup_search.py`. The script reads `AZURE_SUBSCRIPTION_ID` and `AZURE_RESOURCE_GROUP` from the environment, extracts the storage account name from the blob URL, and constructs the proper ARM resource ID.

**Prevention:** The `deploy.ps1` script injects all azd env values (including subscription ID and resource group) into the shell before running `setup_search.py`.

---

## 12. Stale `azd env` Values Override Parameter Defaults

**Error:**

```
The deployment 'text-embedding-3-small' was not found at endpoint
'https://oai-XXXX.cognitiveservices.azure.com/'.
Please verify the deployment exists.
```

**Root Cause:**
`main.parameters.json` uses the pattern `${VAR_NAME=default_value}`. If a previous run (or manual `azd env set`) stored a different value for that variable, the azd environment value **overrides** the default. In this case, `AZURE_OPENAI_EMBEDDING_DEPLOYMENT` was set to `text-embedding-3-small` from a prior experiment, but the actual deployed model is `text-embedding-3-large`.

**How to Fix:**
Correct the stale value:

```powershell
azd env set AZURE_OPENAI_EMBEDDING_DEPLOYMENT text-embedding-3-large
```

To see all current values:

```powershell
azd env get-values
```

**Prevention:** After changing model deployments in `main.parameters.json`, review `azd env get-values` and clear or update any stale overrides. The azd environment persists across runs.

---

## 13. ACR Remote Build Fails — `Permission denied` on `next` Binary

**Error:**

```
sh: next: Permission denied
The command '/bin/sh -c npm run build' returned a non-zero code: 126
```

**Root Cause:**
When ACR performs a remote Docker build, the `node_modules/.bin/next` symlink may lack execute permissions on Alpine Linux. This doesn't happen in local Docker builds (which use Docker Desktop) but occurs in ACR's build environment.

**How to Fix:**
This is now fixed in the Dockerfile. The build stage explicitly sets execute permission before running the build:

```dockerfile
RUN chmod +x node_modules/.bin/next && npm run build
```

**Prevention:** Already applied in the Dockerfile. No manual action needed.

---

## 14. `openai` Version Conflict with `azure-ai-projects` v2

**Error:**

```
ERROR: Cannot install openai==1.58.1 because these package versions
have conflicting dependencies.
azure-ai-projects 2.0.1 depends on openai>=2.8.0
```

**Root Cause:**
`azure-ai-projects` v2 requires `openai>=2.8.0`. If `requirements.txt` pins an older version (e.g., `openai==1.58.1`), pip cannot resolve the dependency tree.

**How to Fix:**
Update the `openai` pin in `requirements.txt`:

```
openai>=2.8.0,<3
```

The `AsyncAzureOpenAI` client used in the backend is compatible with openai v2.

**Prevention:** When upgrading `azure-ai-projects` or `azure-ai-agents` to new major versions, check their dependency requirements and update `openai` accordingly. Use `pip install --dry-run` to detect conflicts before committing.

---

## 15. SDK Migration: `AIProjectClient.agents` Removed in v2

**Error:**

```
AttributeError: 'AIProjectClient' object has no attribute 'agents'
```

**Root Cause:**
In `azure-ai-projects` v1 (beta), agent operations were accessed via `AIProjectClient.agents.threads`, `.messages`, `.runs`. In v2 (stable), the `.agents` sub-client was removed entirely. Agent operations now live in the standalone `azure-ai-agents` package via `AgentsClient`.

**How to Fix:**
Migrate agent code from:

```python
# OLD (azure-ai-projects v1 beta)
from azure.ai.projects import AIProjectClient
client = AIProjectClient(endpoint, credential)
client.agents.threads.create()
client.agents.messages.create(...)
client.agents.runs.create_and_process(...)
```

To:

```python
# NEW (azure-ai-agents 1.1+ stable)
from azure.ai.agents import AgentsClient
client = AgentsClient(endpoint, credential)
client.threads.create()
client.messages.create(...)
client.runs.create_and_process(...)
# Or use the combined helper:
client.create_thread_and_process_run(agent_id=..., thread=...)
```

**Prevention:** This migration is already done in `foundry_agents.py`. When reviewing SDK upgrade guides, check the [migration doc](https://learn.microsoft.com/azure/foundry/agents/how-to/migrate).

---

## 16. SWA Frontend Deploys to Preview Instead of Production (`--env production`)

**Symptom:**

The SWA shows "Congratulations on your new site!" placeholder even after a successful `swa deploy`. The environment status remains `WaitingForDeployment`.

**Root Cause:**
Azure Static Web Apps uses `default` as the production environment name, not `production`. Using `--env production` silently creates a preview environment that doesn't serve on the main hostname.

**How to Fix:**
Deploy with `--env default`:

```powershell
swa deploy --app-location ./frontend/out --deployment-token $deployToken --env default
```

**Prevention:** This is now fixed in `deploy.ps1`. The script uses `--env default` for the SWA deploy step.

---

## Quick Reference: Pre-Flight Checklist

Before running `deploy.ps1` for the first time:

- [ ] **Check model quotas** — run `az cognitiveservices usage list --location <region> -o table` and compare against capacities in `main.parameters.json`
- [ ] **Check AI Search availability** — if your region is high-demand, set `AZURE_SEARCH_LOCATION` to an alternate region
- [ ] **Docker running** — Container App deployment requires Docker Desktop to be running
- [ ] **Azure CLI logged in** — run `az login` and `azd auth login`
- [ ] **No orphaned deployments** — if a prior run failed, check for stuck ARM deployments with `az deployment group list --resource-group rg-<env-name> --query "[?properties.provisioningState=='Running']"`
- [ ] **No soft-deleted Cognitive Services** — if redeploying, purge first: `az cognitiveservices account purge --name <name> --resource-group <rg> --location <region>`, or use `azd down --purge`
- [ ] **VPN disconnected** — if using `MSFT-AzVPN-Manual` or similar, disconnect before running `setup_search.py`
- [ ] **Search RBAC for local user** — after first provision, grant yourself `Search Service Contributor` and `Search Index Data Contributor` roles on the Search resource
- [ ] **No stale azd env values** — run `azd env get-values` and verify keys like `AZURE_OPENAI_EMBEDDING_DEPLOYMENT` match what's in `main.parameters.json`
- [ ] **SDK version compatibility** — ensure `openai>=2.8.0` in `requirements.txt` (required by `azure-ai-projects` v2)
