# Data AI WebApp

A data-centric AI application with **Azure Static Web Apps** (frontend) + **Azure Container Apps** (backend), powered by **Azure AI Foundry** with 14 model deployments, Cosmos DB, AI Search, and Blob Storage.

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

| Feature | Description |
|---------|-------------|
| **RAG Chat** | Multi-turn chat grounded in your uploaded documents |
| **Foundry Agent Service** | Create, invoke, and manage AI agents via Azure AI Foundry SDK |
| **File Upload** | Upload TXT, CSV, MD, JSON files — auto-chunked & indexed |
| **Hybrid Search** | Keyword + vector search via Azure AI Search |
| **Analytics** | Dashboard with file, conversation, and message counts |
| **Entra ID Auth** | Built-in SWA authentication, no secrets in frontend |
| **Managed Identity** | All Azure SDK calls use `DefaultAzureCredential` — no keys |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, pure CSS, static export |
| Backend | Python 3.12, FastAPI, uvicorn |
| Storage | Azure Blob Storage |
| Database | Azure Cosmos DB (serverless) |
| Search | Azure AI Search (basic SKU) |
| AI Platform | Azure AI Foundry (`AIServices` kind) with `allowProjectManagement` |
| AI SDKs | `azure-ai-projects`, `azure-ai-agents`, `azure-ai-inference`, `openai` |
| Auth | Entra ID via SWA built-in auth, `disableLocalAuth` on Foundry |
| Infra | Bicep modules (`@2025-09-01` API), deployed via azd |
| Hosting | Azure Static Web Apps + Azure Container Apps |

## Model Deployments

14 models deployed via `@batchSize(1)` array pattern across three SKU tiers:

| Deployment Name | Model | SKU | Capacity |
|----------------|-------|-----|----------|
| `gpt-4-1` | gpt-4.1 | Standard | 250 |
| `o4-mini` | o4-mini | Standard | 250 |
| `text-embedding-3-large` | text-embedding-3-large | Standard | 87 |
| `gpt-5-4-dz` | gpt-5.4 | DataZoneStandard | 75 |
| `gpt-5-mini-dz` | gpt-5-mini | DataZoneStandard | 75 |
| `gpt-5-nano-dz` | gpt-5-nano | DataZoneStandard | 500 |
| `model-router-dz` | model-router | DataZoneStandard | 75 |
| `o3-dz` | o3 | DataZoneStandard | 75 |
| `gpt-image-1-5-dz` | gpt-image-1.5 | DataZoneStandard | 1 |
| `text-embedding-3-small-dz` | text-embedding-3-small | DataZoneStandard | 250 |
| `text-embedding-3-large-dz` | text-embedding-3-large | DataZoneStandard | 250 |
| `gpt-5-3-chat-gs` | gpt-5.3-chat | GlobalStandard | 250 |
| `gpt-5-3-codex-gs` | gpt-5.3-codex | GlobalStandard | 250 |
| `gpt-5-1-codex-mini-gs` | gpt-5.1-codex-mini | GlobalStandard | 250 |

Models are defined in `main.parameters.json` — add or remove entries without changing Bicep code.

## Project Structure

```
data-ai-webapp/
├── backend/
│   ├── main.py                 # FastAPI app entry point
│   ├── config.py               # Settings from environment variables
│   ├── auth.py                 # SWA identity header extraction
│   ├── models/
│   │   └── schemas.py          # Pydantic request/response models
│   ├── routers/
│   │   ├── chat.py             # /api/chat — RAG conversation
│   │   ├── files.py            # /api/files — upload, list, delete
│   │   ├── analytics.py        # /api/analytics — usage stats
│   │   ├── agents.py           # /api/agents — Foundry Agent Service
│   │   └── health.py           # /api/health — liveness probe
│   └── services/
│       ├── blob_storage.py     # Azure Blob Storage client
│       ├── cosmos.py           # Azure Cosmos DB client
│       ├── search.py           # Azure AI Search client
│       ├── openai_service.py   # Azure OpenAI client
│       └── foundry_agents.py   # Azure AI Foundry Agent Service client
├── frontend/
│   ├── app/
│   │   ├── globals.css         # Design tokens + component styles
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Main app shell
│   ├── components/
│   │   ├── sidebar.tsx         # Navigation + conversation list
│   │   ├── chat.tsx            # Chat UI with markdown rendering
│   │   ├── file-browser.tsx    # File upload + management
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
│       ├── ai-search.bicep
│       ├── openai.bicep        # AI Foundry resource + @batchSize(1) models
│       └── static-web-app.bicep
├── azure.yaml                  # azd service definition
├── Dockerfile                  # Multi-stage build
├── deploy.ps1                  # Full deployment script
├── requirements.txt            # Python dependencies
└── .env.example                # Environment variable template
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

```bash
# Provision Azure resources
azd provision

# Deploy backend to Container Apps
azd deploy api

# Build and deploy frontend to SWA
cd frontend && npm install && npm run build && cd ..
swa deploy ./frontend/out --deployment-token <TOKEN>
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

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Liveness probe |
| `POST` | `/api/chat` | Send a message (RAG) |
| `GET` | `/api/chat/conversations` | List conversations |
| `DELETE` | `/api/chat/conversations/:id` | Delete a conversation |
| `POST` | `/api/files` | Upload a file |
| `GET` | `/api/files` | List uploaded files |
| `DELETE` | `/api/files/:id` | Delete a file |
| `GET` | `/api/analytics` | Get usage analytics |
| `POST` | `/api/agents` | Create a Foundry agent |
| `GET` | `/api/agents` | List Foundry agents |
| `POST` | `/api/agents/chat` | Chat with a Foundry agent |
| `DELETE` | `/api/agents/:id` | Delete a Foundry agent |

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
- **HTTPS only** — enforced at both SWA and Container App ingress
- **Blob Storage** — public access disabled, private container
- **Cosmos DB** — serverless, partitioned by `userId`
- **AI Search** — queries filtered by `userId`

## Cost Estimates

Costs scale with usage. Three scenarios: provisioned infrastructure with no users, early testing with ~5 users, and full rollout at ≤50 users.

### Pre-Launch (0 users — infrastructure provisioned, idle)

| Resource | SKU | Est. Monthly Cost | Notes |
|----------|-----|-------------------|-------|
| Static Web Apps | Standard | ~$9 | Fixed |
| Container Apps | Consumption | ~$0 | Scales to zero when idle |
| Cosmos DB | Serverless | ~$0 | Pay-per-request, no requests = no cost |
| Blob Storage | Standard LRS | ~$0.10 | Storage only, no egress |
| AI Search | Basic | ~$75 | Fixed — minimum for vector search |
| AI Foundry (AIServices) | S0 | ~$0 | Pay-per-token, no calls = no cost |
| Container Registry | Basic | ~$5 | Fixed |
| Log Analytics | PerGB2018 | ~$0–2 | Minimal ingestion |
| **Total** | | **~$89–91/mo** | Baseline infrastructure cost |

> AI Search Basic is the largest fixed cost. Consider Free tier during early development (limited to 50 MB, no vector search).

### Early Testing (~5 users)

| Resource | SKU | Est. Monthly Cost | Notes |
|----------|-----|-------------------|-------|
| Static Web Apps | Standard | ~$9 | Fixed |
| Container Apps | Consumption | ~$2–5 | Light traffic, 1 replica most of the time |
| Cosmos DB | Serverless | ~$1–3 | ~5K–20K RUs/day |
| Blob Storage | Standard LRS | ~$0.50 | Small file uploads |
| AI Search | Basic | ~$75 | Fixed |
| AI Foundry (AIServices) | S0 | ~$5–20 | Light chat + embedding usage |
| Container Registry | Basic | ~$5 | Fixed |
| Log Analytics | PerGB2018 | ~$2–5 | Moderate log ingestion |
| **Total** | | **~$100–122/mo** | |

### Full Rollout (≤50 users)

| Resource | SKU | Est. Monthly Cost | Notes |
|----------|-----|-------------------|-------|
| Static Web Apps | Standard | ~$9 | Fixed |
| Container Apps | Consumption | ~$10–25 | Steady traffic, auto-scaling 1–3 replicas |
| Cosmos DB | Serverless | ~$5–15 | ~50K–200K RUs/day |
| Blob Storage | Standard LRS | ~$1–3 | Moderate file storage + egress |
| AI Search | Basic | ~$75 | Fixed |
| AI Foundry (AIServices) | S0 | ~$30–100 | Regular chat, RAG, agents, embeddings |
| Container Registry | Basic | ~$5 | Fixed |
| Log Analytics | PerGB2018 | ~$5–10 | Full observability |
| **Total** | | **~$140–242/mo** | |

> Token costs vary significantly with model choice. `gpt-5-nano-dz` is ~10x cheaper per token than `gpt-4-1`. Use `model-router-dz` to auto-select the cheapest model that meets quality requirements.
