# Custom Copilot Studio Web Apps

A collection of reference projects showing different ways to build and deploy web applications on Azure — from zero-backend static sites to full-stack apps that authenticate with **Microsoft Copilot Studio** agents.

Each subfolder is a self-contained project with its own README, deploy script, and dependencies.

---

## Projects

| Folder | Description | Azure Service | Auth | Cost |
|--------|-------------|---------------|------|------|
| [`copilot-studio-webapp/`](copilot-studio-webapp/) | Full-stack app — Next.js frontend + Python backend that authenticates users via Entra ID and proxies chat to a Copilot Studio agent grounded with SharePoint knowledge | Azure Container Apps | Entra ID (OAuth2 confidential client) | Pay-per-use |
| [`data-ai-webapp/`](data-ai-webapp/) | Full-stack RAG app — Azure AI Foundry + AI Search + Cosmos DB + Blob Storage with 13 model deployments, file management, and analytics | Azure Container Apps + Static Web Apps | Entra ID (SWA built-in) | Pay-per-use |
| [`data-ai-webapp-demo/`](data-ai-webapp-demo/) | Static demo of the Data AI WebApp UI — mock data, no backend, no auth, shareable preview link | Azure Static Web Apps | None (public) | Free |
| [`frontend-only-public/`](frontend-only-public/) | Static web app with no authentication — publicly accessible | Azure Static Web Apps | None (public) | Free |
| [`frontend-only-auth-free/`](frontend-only-auth-free/) | Static web app with Free-tier auth — users sign in with Microsoft or GitHub (pre-configured providers, invitation-based access) | Azure Static Web Apps | Entra ID + GitHub (pre-configured) | Free |
| [`frontend-only-auth-entra/`](frontend-only-auth-entra/) | Static web app with custom Entra ID auth — locked to your organization's tenant via a custom app registration | Azure Static Web Apps | Entra ID (custom app reg) | ~$9/mo (Standard) |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         This Repository                                 │
├──────────────────────────┬──────────────────────────────────────────────┤
│                          │                                              │
│  copilot-studio-webapp/  │  Full-stack (Container App)                  │
│  ┌────────────────────┐  │  ┌──────────────────────────────────────┐   │
│  │ Next.js + Python   │──│──│ Entra ID → Copilot Studio Agent     │   │
│  │ Docker container   │  │  │ (SharePoint knowledge)               │   │
│  └────────────────────┘  │  └──────────────────────────────────────┘   │
│                          │                                              │
├──────────────────────────┼──────────────────────────────────────────────┤
│                          │                                              │
│  frontend-only-*/        │  Static sites (Azure Static Web Apps)        │
│  ┌────────────────────┐  │  ┌──────────────────────────────────────┐   │
│  │ Next.js static     │──│──│ No backend — built-in SWA auth       │   │
│  │ export → out/      │  │  │ or fully public                      │   │
│  └────────────────────┘  │  └──────────────────────────────────────┘   │
│                          │                                              │
└──────────────────────────┴──────────────────────────────────────────────┘
```

---

## Quick Start

Each project has its own setup instructions. Click the folder link above to see the full README.

### Copilot Studio Full-Stack App

```powershell
cd copilot-studio-webapp

# Configure environment
copy .env.template .env   # fill in your values

# Backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python app.py

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

See [copilot-studio-webapp/DEPLOY.md](copilot-studio-webapp/DEPLOY.md) for Azure Container Apps deployment.

### Static Web Apps (any frontend-only project)

```powershell
cd frontend-only-public   # or frontend-only-auth-free, frontend-only-auth-entra

npm install
npm run dev               # local dev at http://localhost:3000

az login
.\deploy-swa.ps1          # build + deploy to Azure Static Web Apps
```

---

## Choosing the Right Project

```
Do you need a Copilot Studio agent backend?
  ├── YES → copilot-studio-webapp/
  └── NO  → Do you need authentication?
              ├── NO  → frontend-only-public/
              └── YES → Do you need to restrict to your org's tenant?
                          ├── YES → frontend-only-auth-entra/  (Standard, ~$9/mo)
                          └── NO  → frontend-only-auth-free/   (Free tier)
```

---

## Auth Comparison

| | `public` | `auth-free` | `auth-entra` | `copilot-studio-webapp` |
|---|---|---|---|---|
| **Access** | Anyone | Invited users | Org tenant only | Org users (OAuth2) |
| **Providers** | — | Microsoft + GitHub | Microsoft (custom) | Microsoft (MSAL) |
| **App registration** | No | No | Auto-created | Manual |
| **SKU** | Free | Free | Standard | Container Apps |
| **User management** | — | Azure Portal invitations | Tenant-wide | Entra ID |

---

## Prerequisites

All projects need:
- **Node.js** ≥ 18
- **Azure CLI** (`az`)

The Copilot Studio project additionally needs:
- **Python** 3.9+
- **Docker Desktop** (for Azure deployment)
- **Azure Developer CLI** (`azd`)
- A published **Copilot Studio agent** with SharePoint knowledge
- An **Entra ID app registration** with Power Platform API permissions

---

## Repository Structure

```
custom-copilotstudio-webapp/
│
├── copilot-studio-webapp/         ← Full-stack Copilot Studio app
│   ├── app.py                     ← Python backend (auth + chat proxy)
│   ├── start_server.py            ← Alternative Agents SDK server
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── azure.yaml                 ← azd deployment config
│   ├── .env.template
│   ├── DEPLOY.md                  ← Azure Container Apps deploy guide
│   ├── DEPLOYMENT-OPTIONS.md      ← Hosting decision tree
│   ├── frontend/                  ← Next.js frontend (chat UI)
│   ├── infra/                     ← Bicep IaC templates
│   └── assets/                    ← Screenshots
│
├── frontend-only-public/          ← Static site — no auth
│   ├── app/                       ← Next.js app (Emoji Match game)
│   ├── components/
│   ├── deploy-swa.ps1
│   └── README.md
│
├── frontend-only-auth-free/       ← Static site — Free tier auth
│   ├── app/                       ← Next.js app (Clean Sweep game)
│   ├── components/
│   ├── public/login.html          ← Login page (Microsoft + GitHub)
│   ├── staticwebapp.config.json   ← Auth route rules
│   ├── deploy-swa.ps1
│   └── README.md
│
├── frontend-only-auth-entra/      ← Static site — Custom Entra ID auth
│   ├── app/                       ← Next.js app (Emoji Match game)
│   ├── components/
│   ├── staticwebapp.config.json   ← Entra ID provider config
│   ├── deploy-swa.ps1
│   └── README.md
│
├── .gitignore
└── README.md                      ← This file
```

> **Deploying `data-ai-webapp` for the first time?** Read [data-ai-webapp/DEPLOYMENT-TRIPWIRES.md](data-ai-webapp/DEPLOYMENT-TRIPWIRES.md) before running the deploy script.
