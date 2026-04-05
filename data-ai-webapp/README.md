# Data AI WebApp

A data-centric AI application with **Azure Static Web Apps** (frontend) + **Azure Container Apps** (backend), powered by **Azure AI Foundry** with 13 model deployments, Cosmos DB, AI Search, and Blob Storage.

## Architecture

```
┌──────────────────────┐     ┌───────────────────────────────────┐
│  Azure Static Web    │     │  Azure Container Apps (Backend)   │
│  Apps (Frontend)     │     │                                   │
│                      │     │  ┌─────────────┐                 │
│  Next.js SPA         │────▶│  │  FastAPI     │                 │
│  Entra ID Auth       │/api │  │  Python 3.12 │                 │
│  CDN Delivery        │     │  └──────┬──────┘                 │
│                      │     │         │                         │
└──────────────────────┘     │    Managed Identity               │
                             │         │                         │
                       ┌─────┴─────────┴──────────────────┐     │
                       │                                    │     │
                       │  ┌────────────────────────────┐   │     │
                       │  │  Azure AI Foundry (AIServices) │   │
                       │  │  14 Model Deployments       │   │     │
                       │  │  Agent Service              │   │     │
                       │  └────────────────────────────┘   │     │
                       │                                    │     │
                       │  Blob Storage  │  Cosmos DB        │     │
                       │  AI Search     │                   │     │
                       └────────────────────────────────────┘     │
                                                                  │
                       └──────────────────────────────────────────┘
```

## Features

> **First time deploying?** Read [DEPLOYMENT-TRIPWIRES.md](DEPLOYMENT-TRIPWIRES.md) before running `deploy.ps1` — it covers quota limits, region capacity, container image ordering, and other common blockers.

| Feature                   | Description                                                                      |
| ------------------------- | -------------------------------------------------------------------------------- |
| **RAG Chat**              | Multi-turn chat grounded in your uploaded documents                              |
| **Search Modes**          | Hybrid (keyword + vector), pure vector (broad semantic sweep), or keyword-only   |
| **Folder Organization**   | User-defined subfolder paths at upload (e.g. `reports/q1`)                       |
| **Document Tagging**      | Comma-separated tags at upload, filterable in search                             |
| **File Management**       | Upload (PDF, DOCX, TXT, CSV, MD, JSON), download, delete with per-user isolation |
| **Conversation History**  | Resume past conversations from sidebar, full message replay                      |
| **AI Search Indexer**     | Automatic extract → chunk → embed → index pipeline for all file types            |
| **Foundry Agent Service** | Create, invoke, and manage AI agents via Azure AI Foundry SDK                    |
| **Analytics**             | Dashboard with file, conversation, and message counts                            |
| **Entra ID Auth**         | Built-in SWA authentication, no secrets in frontend                              |
| **Managed Identity**      | All Azure SDK calls use `DefaultAzureCredential` — no keys                       |

## Tech Stack

| Layer       | Technology                                                             |
| ----------- | ---------------------------------------------------------------------- |
| Frontend    | Next.js 15, React 19, pure CSS, static export                          |
| Backend     | Python 3.12, FastAPI, uvicorn                                          |
| Storage     | Azure Blob Storage                                                     |
| Database    | Azure Cosmos DB (serverless)                                           |
| Search      | Azure AI Search (basic SKU)                                            |
| AI Platform | Azure AI Foundry (`AIServices` kind) with `allowProjectManagement`     |
| AI SDKs     | `azure-ai-agents` (1.1+), `azure-ai-projects` (2.0+), `azure-ai-inference`, `openai` (2.8+) |
| Auth        | Entra ID via SWA built-in auth, `disableLocalAuth` on Foundry          |
| Infra       | Bicep modules (`@2025-09-01` API), deployed via azd                    |
| Hosting     | Azure Static Web Apps + Azure Container Apps                           |

## Model Deployments

13 models deployed via `@batchSize(1)` array pattern across three SKU tiers:

| Deployment Name             | Model                  | SKU              | Capacity |
| --------------------------- | ---------------------- | ---------------- | -------- |
| `gpt-4-1`                   | gpt-4.1                | Standard         | 250      |
| `o4-mini`                   | o4-mini                | Standard         | 250      |
| `text-embedding-3-large`    | text-embedding-3-large | Standard         | 87       |
| `gpt-5-mini-dz`             | gpt-5-mini             | DataZoneStandard | 75       |
| `gpt-5-nano-dz`             | gpt-5-nano             | DataZoneStandard | 500      |
| `model-router-dz`           | model-router           | DataZoneStandard | 75       |
| `o3-dz`                     | o3                     | DataZoneStandard | 75       |
| `gpt-image-1-5-dz`          | gpt-image-1.5          | DataZoneStandard | 1        |
| `text-embedding-3-small-dz` | text-embedding-3-small | DataZoneStandard | 250      |
| `text-embedding-3-large-dz` | text-embedding-3-large | DataZoneStandard | 250      |
| `gpt-5-3-chat-gs`           | gpt-5.3-chat           | GlobalStandard   | 250      |
| `gpt-5-3-codex-gs`          | gpt-5.3-codex          | GlobalStandard   | 250      |
| `gpt-5-1-codex-mini-gs`     | gpt-5.1-codex-mini     | GlobalStandard   | 250      |

Models are defined in `main.parameters.json` — add or remove entries without changing Bicep code.

## Project Structure

```
data-ai-webapp/
├── backend/
│   ├── main.py                 # FastAPI app entry point
│   ├── config.py               # Settings from environment variables
│   ├── auth.py                 # SWA identity header extraction
│   ├── setup_search.py         # One-time AI Search index/indexer setup
│   ├── models/
│   │   └── schemas.py          # Pydantic request/response models
│   ├── routers/
│   │   ├── chat.py             # /api/chat — RAG conversation
│   │   ├── files.py            # /api/files — upload, list, download, delete
│   │   ├── analytics.py        # /api/analytics — usage stats
│   │   ├── agents.py           # /api/agents — Foundry Agent Service
│   │   └── health.py           # /api/health — liveness probe
│   └── services/
│       ├── blob_storage.py     # Azure Blob Storage client (folders + tags)
│       ├── cosmos.py           # Azure Cosmos DB client
│       ├── search.py           # Azure AI Search client (3 search modes)
│       ├── openai_service.py   # Azure OpenAI client
│       └── foundry_agents.py   # Azure AI Foundry Agent Service client
├── frontend/
│   ├── app/
│   │   ├── globals.css         # Design tokens + component styles
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Main app shell (view routing + conversation selection)
│   ├── components/
│   │   ├── sidebar.tsx         # Navigation + clickable conversation history
│   │   ├── chat.tsx            # Chat UI + search mode controls
│   │   ├── file-browser.tsx    # File upload (folder + tags) + download + management
│   │   └── analytics.tsx       # Stats dashboard
│   ├── lib/
│   │   ├── api.ts              # Backend API client
│   │   └── types.ts            # TypeScript interfaces
│   ├── staticwebapp.config.json # SWA auth + routing config
│   └── package.json
├── infra/
│   ├── main.bicep              # Orchestrator
│   ├── main.parameters.json    # Model deployments + env config
│   └── modules/
│       ├── container-app.bicep
│       ├── container-apps-environment.bicep
│       ├── container-registry.bicep
│       ├── storage.bicep
│       ├── cosmos-db.bicep
│       ├── ai-search.bicep     # Basic SKU + system-assigned MI
│       ├── openai.bicep        # AI Foundry resource + @batchSize(1) models
│       ├── static-web-app.bicep
│       └── rbac.bicep          # Role assignments for all managed identities
├── azure.yaml                  # azd service definition
├── Dockerfile                  # Multi-stage build
├── deploy.ps1                  # Full deployment script (7 steps)
├── requirements.txt            # Python dependencies
├── .env.example                # Environment variable template
└── .gitignore
```

## Prerequisites

- [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli)
- [Azure Developer CLI (azd)](https://learn.microsoft.com/azure/developer/azure-developer-cli/install-azd)
- [Node.js 20+](https://nodejs.org/)
- [Python 3.12+](https://www.python.org/)
- [Docker](https://www.docker.com/)
- An Azure subscription with access to Azure OpenAI

## Quick Start

### 1. Clone and configure

```bash
cd data-ai-webapp
cp .env.example .env
```

### 2. Deploy everything

```powershell
# Login
azd auth login
az login

# Deploy infrastructure + backend + frontend
.\deploy.ps1 -envName "my-data-ai-app"
```

### 3. Or deploy step by step

```powershell
# Provision Azure resources (uses placeholder image for Container App on first run)
azd provision

# Load azd outputs into your shell
azd env get-values | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2].Trim('"'), 'Process')
    }
}

# Grant yourself Search RBAC (first time only)
$searchName = (azd env get-values | Select-String 'AZURE_SEARCH_ENDPOINT' | ForEach-Object { if ($_ -match 'https://([^.]+)\.') { $Matches[1] } })
$searchId = az search service show --name $searchName `
    --resource-group (azd env get-value AZURE_RESOURCE_GROUP) --query id -o tsv
$myId = az ad signed-in-user show --query id -o tsv
az role assignment create --assignee $myId --role "Search Service Contributor" --scope $searchId
az role assignment create --assignee $myId --role "Search Index Data Contributor" --scope $searchId

# Configure AI Search indexer pipeline (one-time)
python -m backend.setup_search

# Deploy backend to Container Apps
azd deploy api

# Build and deploy frontend to SWA
cd frontend && npm install && npm run build && cd ..
swa deploy ./frontend/out --deployment-token <TOKEN> --env default
```

### 4. Local development

**Backend:**

```bash
pip install -r requirements.txt
cp .env.example .env
# Fill in .env with your Azure resource endpoints
uvicorn backend.main:app --reload --port 8080
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

| Method   | Path                          | Description                                                               |
| -------- | ----------------------------- | ------------------------------------------------------------------------- |
| `GET`    | `/api/health`                 | Liveness probe                                                            |
| `POST`   | `/api/chat`                   | Send a message (RAG, supports `searchMode`, `filterFolder`, `filterTags`) |
| `GET`    | `/api/chat/conversations`     | List conversations                                                        |
| `GET`    | `/api/chat/conversations/:id` | Get conversation with full message history                                |
| `DELETE` | `/api/chat/conversations/:id` | Delete a conversation                                                     |
| `POST`   | `/api/files`                  | Upload a file (with `folderPath` and `tags`)                              |
| `GET`    | `/api/files`                  | List uploaded files                                                       |
| `GET`    | `/api/files/:id/download`     | Download a file                                                           |
| `DELETE` | `/api/files/:id`              | Delete a file                                                             |
| `GET`    | `/api/analytics`              | Get usage analytics                                                       |
| `POST`   | `/api/agents`                 | Create a Foundry agent                                                    |
| `GET`    | `/api/agents`                 | List Foundry agents                                                       |
| `POST`   | `/api/agents/chat`            | Chat with a Foundry agent                                                 |
| `DELETE` | `/api/agents/:id`             | Delete a Foundry agent                                                    |

## Authentication Flow

1. User visits the SWA URL → redirected to Entra ID login
2. SWA validates the token and injects `x-ms-client-principal-*` headers
3. SWA proxies `/api/*` requests to the Container App backend
4. Backend reads identity from headers — no secrets needed in the frontend
5. Backend uses **Managed Identity** to access all Azure services (Blob, Cosmos, Search, OpenAI)

## Security

- **No secrets in frontend** — SWA handles auth at the platform level
- **Managed Identity** — backend uses `DefaultAzureCredential` for all Azure SDK calls
- **`disableLocalAuth: true`** — Foundry resource enforces AAD-only, no API keys
- **OData injection protection** — all search filter values are escaped
- **HTTPS only** — enforced at both SWA and Container App ingress
- **Blob Storage** — public access disabled, private container
- **Cosmos DB** — serverless, partitioned by `userId`
- **AI Search** — queries filtered by `userId`
- **RBAC** — managed identity role assignments for Search → Storage, Search → OpenAI, Container App → Storage/OpenAI, Foundry → Storage. The deploying user must manually grant themselves `Search Service Contributor` and `Search Index Data Contributor` for the one-time `setup_search.py` step
- **AI Search AAD auth** — `authOptions.aadOrApiKey` enabled on the Search service for RBAC-based access from both the local setup script and the Container App

## Per-User Data Isolation

Each authenticated user has fully isolated data across all layers:

| Layer            | Isolation          | Mechanism                                           |
| ---------------- | ------------------ | --------------------------------------------------- |
| **Blob Storage** | Virtual subfolders | `{userId}/{folderPath}/{fileId}/{fileName}`         |
| **Cosmos DB**    | Partition key      | `/userId` on `conversations` and `files` containers |
| **AI Search**    | OData filter       | Every query includes `userId eq '{userId}'`         |

## Search Modes

The chat UI includes a **⚙ Search** settings panel:

| Mode                 | Description                                   | Best For                                             |
| -------------------- | --------------------------------------------- | ---------------------------------------------------- |
| **Hybrid** (default) | Keyword + vector search combined              | Targeted Q&A                                         |
| **Vector**           | Pure semantic similarity, no keyword matching | Broad exploratory questions across diverse documents |
| **Keyword**          | Exact text matching, no embeddings            | Finding specific terms or codes                      |

Additional controls:

- **Results count**: 3 / 5 / 10 / 20 / 50 — controls how many chunks the LLM sees
- **Folder filter**: scope search to a specific folder path
- **Tag filter**: comma-separated, matches documents with ANY of the specified tags

## Document Indexing Pipeline

Files are indexed automatically by the AI Search indexer (no code runs at upload time):

```
Upload → Blob Storage (with metadata: userId, fileId, folderPath, tags)
              ↓
    AI Search Indexer (hourly schedule)
        → Document cracking (PDF, DOCX, PPTX, HTML, TXT, CSV, etc.)
        → TextSplitSkill (2000 char pages, 200 overlap)
        → AzureOpenAIEmbeddingSkill (text-embedding-3-large)
        → Index projection (each chunk inherits userId, folderPath, tags)
```

## AI Search Index Schema

| Field           | Type                | Filterable     | Facetable | Purpose                       |
| --------------- | ------------------- | -------------- | --------- | ----------------------------- |
| `id`            | String (key)        | Yes            | —         | Chunk ID                      |
| `content`       | String (searchable) | —              | —         | Chunk text                    |
| `contentVector` | Collection(Single)  | —              | —         | 1536-dim embedding (configured in `setup_search.py`) |
| `userId`        | String              | Yes            | —         | Per-user isolation            |
| `fileName`      | String              | Yes            | Yes       | Filter by file                |
| `fileId`        | String              | Yes            | —         | Group chunks by file          |
| `folderPath`    | String              | Yes            | Yes       | Filter by user-defined folder |
| `tags`          | Collection(String)  | Yes            | Yes       | Filter by user-defined tags   |
| `contentType`   | String              | Yes            | Yes       | Filter by MIME type           |
| `uploadedAt`    | DateTimeOffset      | Yes (sortable) | —         | Date-range queries            |
| `chunkIndex`    | Int32               | Yes (sortable) | —         | Order within document         |

## Known Limitations

- **SDK versions** — `azure-ai-agents` (1.1+) and `azure-ai-projects` (2.0+) are stable. `azure-ai-inference` is still pre-release (1.0.0b9). Agent operations use `AgentsClient` from `azure-ai-agents` directly (the old `AIProjectClient.agents` sub-client was removed in `azure-ai-projects` v2). The `openai` package must be `>=2.8.0` to satisfy `azure-ai-projects` v2 dependencies.
- **Indexer latency** — the AI Search indexer runs hourly. Newly uploaded files may not appear in search results for up to 60 minutes. Trigger manually via `az search indexer run` for immediate indexing.
- **No PDF preview** — files can be downloaded but not previewed inline in the browser.

See [DEPLOYMENT-TRIPWIRES.md](DEPLOYMENT-TRIPWIRES.md) for a full list of deployment gotchas and how to resolve them.

## Cost Estimates

Costs scale with usage. Three scenarios: provisioned infrastructure with no users, early testing with ~5 users, and full rollout at ≤50 users.

### Pre-Launch (0 users — infrastructure provisioned, idle)

| Resource                | SKU          | Est. Monthly Cost | Notes                                  |
| ----------------------- | ------------ | ----------------- | -------------------------------------- |
| Static Web Apps         | Standard     | ~$9               | Fixed                                  |
| Container Apps          | Consumption  | ~$0               | Scales to zero when idle               |
| Cosmos DB               | Serverless   | ~$0               | Pay-per-request, no requests = no cost |
| Blob Storage            | Standard LRS | ~$0.10            | Storage only, no egress                |
| AI Search               | Basic        | ~$75              | Fixed — minimum for vector search      |
| AI Foundry (AIServices) | S0           | ~$0               | Pay-per-token, no calls = no cost      |
| Container Registry      | Basic        | ~$5               | Fixed                                  |
| Log Analytics           | PerGB2018    | ~$0–2             | Minimal ingestion                      |
| **Total**               |              | **~$89–91/mo**    | Baseline infrastructure cost           |

> AI Search Basic is the largest fixed cost. Consider Free tier during early development (limited to 50 MB, no vector search).

### Early Testing (~5 users)

| Resource                | SKU          | Est. Monthly Cost | Notes                                     |
| ----------------------- | ------------ | ----------------- | ----------------------------------------- |
| Static Web Apps         | Standard     | ~$9               | Fixed                                     |
| Container Apps          | Consumption  | ~$2–5             | Light traffic, 1 replica most of the time |
| Cosmos DB               | Serverless   | ~$1–3             | ~5K–20K RUs/day                           |
| Blob Storage            | Standard LRS | ~$0.50            | Small file uploads                        |
| AI Search               | Basic        | ~$75              | Fixed                                     |
| AI Foundry (AIServices) | S0           | ~$5–20            | Light chat + embedding usage              |
| Container Registry      | Basic        | ~$5               | Fixed                                     |
| Log Analytics           | PerGB2018    | ~$2–5             | Moderate log ingestion                    |
| **Total**               |              | **~$100–122/mo**  |                                           |

### Full Rollout (≤50 users)

| Resource                | SKU          | Est. Monthly Cost | Notes                                     |
| ----------------------- | ------------ | ----------------- | ----------------------------------------- |
| Static Web Apps         | Standard     | ~$9               | Fixed                                     |
| Container Apps          | Consumption  | ~$10–25           | Steady traffic, auto-scaling 1–3 replicas |
| Cosmos DB               | Serverless   | ~$5–15            | ~50K–200K RUs/day                         |
| Blob Storage            | Standard LRS | ~$1–3             | Moderate file storage + egress            |
| AI Search               | Basic        | ~$75              | Fixed                                     |
| AI Foundry (AIServices) | S0           | ~$30–100          | Regular chat, RAG, agents, embeddings     |
| Container Registry      | Basic        | ~$5               | Fixed                                     |
| Log Analytics           | PerGB2018    | ~$5–10            | Full observability                        |
| **Total**               |              | **~$140–242/mo**  |                                           |

> Token costs vary significantly with model choice. `gpt-5-nano-dz` is ~10x cheaper per token than `gpt-4-1`. Use `model-router-dz` to auto-select the cheapest model that meets quality requirements.
