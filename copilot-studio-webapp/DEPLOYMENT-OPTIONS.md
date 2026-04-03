# Azure Deployment Decision Tree

Use this guide to choose the right Azure hosting model for the Custom Copilot Studio web application.

---

## Quick Decision Flowchart

```
                  ┌─────────────────────────────────┐
                  │  Do you need a backend at all?   │
                  │  (API calls, auth, databases)    │
                  └───────────┬─────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
        ┌─────▼─────┐  ┌─────▼─────┐  ┌──────▼──────┐
        │    NO     │  │   YES –   │  │   YES –     │
        │  (pure    │  │  light /  │  │   heavy /   │
        │ frontend) │  │ stateless │  │  stateful   │
        └─────┬─────┘  └─────┬─────┘  └──────┬──────┘
              │              │               │
              ▼              │               │
   ┌──────────────────┐      │               │
   │  Azure Static    │      │               │
   │  Web App         │      │               │
   │  (Vercel-like    │      │               │
   │   rapid deploy)  │      │               │
   └──────────────────┘      │               │
                             │               │
                  ┌──────────▼──────────┐     │
                  │  Can the backend    │     │
                  │  run as serverless  │     │
                  │  Azure Functions?   │     │
                  └─────┬──────────┬────┘     │
                        │          │          │
                  ┌─────▼────┐ ┌───▼────┐     │
                  │   YES    │ │   NO   │     │
                  └─────┬────┘ └───┬────┘     │
                        │          │          │
                        ▼          └──────────┤
            ┌──────────────────┐              │
            │  Azure Static    │              │
            │  Web App         │              ▼
            │  + Azure         │  ┌────────────────────┐
            │  Functions API   │  │  Azure Container   │
            └──────────────────┘  │  App                │
                                  │  (current setup)    │
                                  └────────────────────┘
```

---

## Why This App Currently Uses Container Apps

This project bundles a **Next.js static frontend** with a **Python aiohttp backend** in a single Docker container. The backend:

- Runs a **long-lived aiohttp web server** with in-memory session state
- Uses **MSAL `ConfidentialClientApplication`** with an in-process token cache
- Maintains persistent Copilot Studio conversations via the **Microsoft Agents SDK `CopilotClient`**
- Handles the full **OAuth2 authorization code flow** server-side

These characteristics make it a poor fit for Static Web Apps without significant re-architecture.

---

## Comparison Table

| Criteria | Static Web App (frontend only) | Static Web App + Functions | Container App |
|----------|-------------------------------|---------------------------|---------------------|
| **Best for** | Pure frontends — the Azure equivalent of a Vercel deploy | Static frontends with lightweight serverless APIs | Full-stack apps needing a custom runtime or long-lived server |
| **Frontend hosting** | Global CDN, automatic SSL, preview environments | Global CDN, automatic SSL | Container serves its own static files behind an HTTPS ingress |
| **Backend support** | None needed — no API routes | Azure Functions (Node.js, Python, C#) — stateless, short-lived | Any language/framework — stateless or stateful, long-lived |
| **Session / state** | N/A — no server-side logic | No in-memory state; must use external store (Redis, Cosmos DB) | In-memory state works (but not across replicas) |
| **Python support** | N/A | Azure Functions Python worker (v2) — cold starts, 230 s max execution | Full control — any Python framework, no timeout limits |
| **Auth** | Built-in Easy Auth (Entra ID, GitHub, etc.) — zero-code | Built-in Easy Auth — zero-code | You manage auth yourself (MSAL, middleware, etc.) |
| **Custom Docker** | Not supported | Not supported | Full Dockerfile support |
| **Scaling** | Automatic; Azure-managed, globally distributed | Automatic; Azure-managed | KEDA-based autoscaling with fine-grained control (min/max replicas, scale rules) |
| **Cost (low traffic)** | **Free tier** — 100 GB bandwidth, 2 custom domains, SSL included | **Free tier** — same as frontend-only, Functions included | Consumption plan: pay per vCPU-second + memory-second (can scale to zero) |
| **Cost (high traffic)** | Standard tier ~$9/mo flat | Standard tier ~$9/mo flat | Scales with usage; more expensive at high throughput |
| **Cold starts** | None — static assets served from CDN | Functions can have 1-10 s cold starts | Possible if scaled to zero; warm instances respond instantly |
| **CI/CD** | `swa deploy` or `git push` — automatic preview & production deploys | `swa deploy` or `git push` — automatic preview & production deploys | `azd deploy` / GitHub Actions / Azure Pipelines |
| **Networking** | Public; Private Endpoints on Standard tier | Public; Private Endpoints on Standard tier | Full VNet integration, private ingress, service-to-service networking |
| **Deployment complexity** | Lowest — connect GitHub repo and push, or `swa deploy` | Low — same as above, plus a `/api` folder with Functions | Medium — Docker build + registry push + Bicep infra |
| **Vercel equivalent** | **Direct equivalent** — same DX, same speed, Azure-native | No direct Vercel parallel (Vercel doesn't support Python Functions) | No Vercel parallel — custom container workloads |

---

## When to Choose Static Web App (Frontend Only)

> **This is the Azure equivalent of a Vercel / Netlify rapid deploy.** Pure frontend, no backend, ship it in minutes.

Choose this if **all** of the following are true:

- [ ] Your app is a **pure frontend** — HTML/CSS/JS or a Next.js static export
- [ ] You have **no backend, API calls, or database requirements**
- [ ] You want the **fastest path to production in Azure** — `swa deploy` or `git push`
- [ ] You want **free hosting** with automatic SSL and a global CDN
- [ ] You want to stay in the **Azure ecosystem** (vs. a third-party like Vercel)

### How to Deploy (Vercel-like Speed, Azure-native)

```bash
# 1. Install the Azure Static Web Apps CLI
npm i -g @azure/static-web-apps-cli

# 2. Build the Next.js frontend as a static export
cd frontend
npm run build          # outputs to out/ (with `output: 'export'` in next.config.ts)

# 3. Deploy to Azure in one command
swa deploy ./out --env production
```

Or connect your GitHub repo in the Azure Portal — every push to `main` auto-deploys via a generated GitHub Actions workflow, and PRs get preview environments.

| Step | How | Time |
|------|-----|------|
| Create Static Web App | Azure Portal or `az staticwebapp create` | ~1 minute |
| Connect GitHub repo | One-click in Portal | 30 seconds |
| First deploy | Automatic on push | ~90 seconds |
| Custom domain | Add in Portal, auto-validated | 2-5 minutes |
| SSL certificate | Automatic (managed by Azure) | Instant |
| Preview environments | Every PR gets a staged URL | Automatic |

### When This Works for This Project

If you strip out the Python backend and build a **frontend-only** version (e.g., a branded landing page, documentation site, or UI prototype without Copilot chat), Static Web App is the fastest Azure option.

> **Key limitation:** No Python backend = no Copilot Studio chat. If you need auth + MSAL + Agents SDK, see Container Apps below.

---

## When to Choose Static Web App + Azure Functions

Choose this if **all** of the following are true:

- [ ] Your frontend is a static export (HTML/CSS/JS) — e.g., `next build && next export`
- [ ] You need a **lightweight API** but your endpoints are **stateless** and complete within the Functions timeout (230 s)
- [ ] You don't need **in-memory session state** (or you can move sessions to Redis / Cosmos DB)
- [ ] You don't need a **custom Docker image** or system-level dependencies
- [ ] You want **zero-config auth** via Easy Auth (Entra ID, GitHub, Twitter, etc.)
- [ ] You want the **lowest cost** for apps with simple API needs

### What Would Need to Change in This Project

To deploy this app as a Static Web App + Functions, you would need to:

1. **Re-write `app.py`** as a set of Azure Functions (Python v2) in an `/api` folder
2. **Externalize session state** — replace the in-memory `user_sessions` dict with Azure Cache for Redis or Cosmos DB
3. **Handle MSAL token caching** via a distributed cache instead of in-process
4. **Verify Copilot Studio SDK compatibility** — the `CopilotClient` conversation lifecycle must work within a stateless function invocation
5. **Export the frontend** as a fully static build (`next export`) and remove server-side rendering if used

> **Effort estimate:** Significant re-architecture. The stateful backend is the primary blocker.

---

## When to Choose Container App

Choose **Azure Container App** if **any** of the following are true:

- [x] Your backend is a **long-lived server** (aiohttp, FastAPI, Flask, Express, etc.)
- [x] You need **in-memory state** or long-running connections (WebSockets, SSE)
- [x] You use a **custom Dockerfile** with specific system dependencies
- [x] You need **full control** over the runtime environment
- [x] You want to run **multiple services** (sidecar containers, Dapr integration)
- [x] You need **VNet integration** or private networking
- [x] Your workload has **variable traffic** and you want KEDA-based autoscaling

### Why This Project Fits Container Apps

| Requirement | Container App Support |
|---|---|
| aiohttp long-lived server | Runs natively in a container |
| MSAL in-memory token cache | Works within a single replica |
| Copilot Studio `CopilotClient` | No timeout or cold-start constraints |
| Single `Dockerfile` bundles frontend + backend | Multi-stage build, one container |
| `azd up` one-command deploy | Built-in support via Bicep + ACR |

---

## Hybrid Approach (Future Optimization)

If you want the **CDN performance of a Static Web App** with the **backend flexibility of a Container App**, consider:

```
┌────────────────────────┐       ┌──────────────────────────┐
│  Azure Static Web App  │──────▶│  Azure Container App     │
│  (Next.js static       │  API  │  (Python backend only)   │
│   export on CDN)       │ calls │                          │
└────────────────────────┘       └──────────────────────────┘
```

1. Deploy the **Next.js frontend** to a Static Web App (global CDN, free tier)
2. Deploy the **Python backend** to a Container App (full runtime control)
3. Configure the Static Web App's `staticwebapp.config.json` to proxy `/api/*` to the Container App, or call the Container App URL directly from the frontend

**Benefits:** CDN-cached frontend, independent scaling, lower cost for the static layer, full backend flexibility.

**Trade-offs:** Two deployments to manage, CORS configuration between services, slightly more complex networking.

---

## Summary

| | Static Web App (frontend only) | Static Web App + Functions | Container App |
|---|---|---|---|
| **This project today** | Frontend-only (no Copilot chat) | Requires significant re-architecture | **Current deployment target — works as-is** |
| **Best for** | Pure frontends, rapid prototyping — Vercel-like DX in Azure | Static sites with lightweight stateless APIs | Full-stack apps with custom runtimes |
| **Cost** | Free tier (100 GB, SSL, CDN) | Free tier (same + Functions included) | Higher (but can scale to zero) |
| **Deploy speed** | Fastest — `swa deploy` or `git push` | Fast — same as frontend-only | Medium — Docker build + Bicep provisioning |
| **Complexity** | Lowest — no infra to manage | Low deployment, high code changes for this project | Higher deployment, lowest code changes needed |
| **Python backend** | N/A — no backend | Via Azure Functions (re-architecture needed) | Native support |

### Recommendations

- **Frontend-only / prototype / landing page** → **Azure Static Web App** (frontend only). Vercel-like speed, Azure-native, free tier, `swa deploy` and done.
- **Static frontend + lightweight stateless API** → **Azure Static Web App + Azure Functions**. Same deployment simplicity, add an `/api` folder with Functions.
- **This project with the full Copilot Studio backend** → **Azure Container Apps**. The stateful Python backend with MSAL token caching and the Agents SDK is purpose-built for a containerized deployment.
