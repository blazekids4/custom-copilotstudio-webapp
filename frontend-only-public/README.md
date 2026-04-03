# Frontend-Only — Azure Static Web App Starter

A **zero-backend** reference project that shows how to build a static web app and deploy it to [Azure Static Web Apps](https://learn.microsoft.com/azure/static-web-apps/overview) using the SWA CLI.

The included demo is an emoji memory card game built with Next.js + React, but the deployment pattern works with **any** static site framework.

## Project Structure

```
frontend-only/
├── app/                    # Next.js app directory (pages + layout)
├── components/             # React components (memory game)
├── deploy-swa.ps1          # One-command Azure deployment script
├── swa-cli.config.json     # SWA CLI configuration
├── next.config.ts          # Next.js config (static export)
├── package.json
└── tsconfig.json
```

## Prerequisites

| Tool | Install |
|------|---------|
| **Node.js** ≥ 18 | [nodejs.org](https://nodejs.org) |
| **Azure CLI** | [Install Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli) |
| **SWA CLI** | Auto-installed by the deploy script, or `npm i -g @azure/static-web-apps-cli` |

## Quick Start

```powershell
# Install dependencies
npm install

# Run locally
npm run dev          # http://localhost:3000

# Build static export
npm run build        # produces ./out/
```

## Deploy to Azure Static Web Apps

```powershell
# 1. Log in to Azure (one-time)
az login

# 2. Deploy (builds + provisions + deploys)
.\deploy-swa.ps1

# Optional: customize resource group, app name, region
.\deploy-swa.ps1 -ResourceGroup my-rg -AppName my-swa -Location westus2

# Optional: skip the build if out/ is already current
.\deploy-swa.ps1 -SkipBuild
```

The script will:
1. Run `npm ci` + `npm run build`
2. Create the resource group and Static Web App (Free tier) if they don't exist
3. Deploy the `out/` folder via the SWA CLI
4. Print the live URL

## Authentication

By default the site is **public**. To require authentication, create a `staticwebapp.config.json` in the project root:

```json
{
  "routes": [
    {
      "route": "/*",
      "allowedRoles": ["authenticated"]
    }
  ]
}
```

The Free tier supports GitHub and Azure AD (invitation-based) providers. The Standard tier adds custom OpenID Connect.

---

## Switching Frameworks

The deployment script and SWA infrastructure are **framework-agnostic** — Azure Static Web Apps just serves static files from a folder. To use a different stack, you only need to change two things:

1. **Build command** — what produces the static output
2. **Output directory** — where the built files land

Update these in [`swa-cli.config.json`](swa-cli.config.json) and the build will work the same way.

### Framework Quick-Reference

| Framework | Create Project | Build Command | Output Dir | Config Change |
|-----------|---------------|---------------|------------|---------------|
| **Next.js** (current) | `npx create-next-app@latest` | `npm run build` | `out` | Add `output: "export"` to `next.config.ts` |
| **React (Vite)** | `npm create vite@latest -- --template react-ts` | `npm run build` | `dist` | None needed |
| **Vue (Vite)** | `npm create vite@latest -- --template vue-ts` | `npm run build` | `dist` | None needed |
| **Svelte (SvelteKit)** | `npx sv create` | `npm run build` | `build` | Use `@sveltejs/adapter-static` |
| **Angular** | `npx @angular/cli new my-app` | `npm run build` | `dist/<app-name>/browser` | None needed |
| **Astro** | `npm create astro@latest` | `npm run build` | `dist` | None needed |
| **Plain HTML/CSS/JS** | Manual | N/A | `.` (root) | No build step |

### Step-by-Step: Switching to a Different Stack

#### React (Vite)

```bash
npm create vite@latest frontend-only -- --template react-ts
cd frontend-only
npm install
```

Update `swa-cli.config.json`:
```json
{
  "configurations": {
    "frontend-only-poc": {
      "appLocation": ".",
      "outputLocation": "dist",
      "appBuildCommand": "npm run build"
    }
  }
}
```

Update the deploy script's build check — change `out/index.html` to `dist/index.html` in `deploy-swa.ps1`.

#### Vue (Vite)

```bash
npm create vite@latest frontend-only -- --template vue-ts
cd frontend-only
npm install
```

Same `swa-cli.config.json` as React (Vite) above — output goes to `dist/`.

#### Svelte (SvelteKit)

```bash
npx sv create frontend-only
cd frontend-only
npm install
npm install -D @sveltejs/adapter-static
```

Update `svelte.config.js`:
```js
import adapter from "@sveltejs/adapter-static";

export default {
  kit: {
    adapter: adapter({ fallback: "index.html" }),
  },
};
```

Update `swa-cli.config.json`:
```json
{
  "configurations": {
    "frontend-only-poc": {
      "appLocation": ".",
      "outputLocation": "build",
      "appBuildCommand": "npm run build"
    }
  }
}
```

#### Angular

```bash
npx @angular/cli new frontend-only --style css --ssr false
cd frontend-only
npm install
```

Update `swa-cli.config.json` (replace `my-app` with your project name):
```json
{
  "configurations": {
    "frontend-only-poc": {
      "appLocation": ".",
      "outputLocation": "dist/my-app/browser",
      "appBuildCommand": "npm run build"
    }
  }
}
```

#### Astro

```bash
npm create astro@latest frontend-only
cd frontend-only
npm install
```

Update `swa-cli.config.json`:
```json
{
  "configurations": {
    "frontend-only-poc": {
      "appLocation": ".",
      "outputLocation": "dist",
      "appBuildCommand": "npm run build"
    }
  }
}
```

#### Plain HTML / CSS / JS

No build step needed. Put your files directly in a folder (e.g., `public/`) and point the deploy at it:

```json
{
  "configurations": {
    "frontend-only-poc": {
      "appLocation": ".",
      "outputLocation": "public",
      "appBuildCommand": ""
    }
  }
}
```

In `deploy-swa.ps1`, use the `-SkipBuild` flag or remove the build step entirely.

### Summary

Regardless of which framework you choose, the deployment workflow stays the same:

```
npm run build  →  static files land in output dir  →  SWA CLI deploys them
```

The only moving parts are the **build command** and **output directory** in `swa-cli.config.json`.


### Quotas and Costs

[Quotas - Azure Static Web Apps](https://learn.microsoft.com/en-us/azure/static-web-apps/quotas)

[Plans - Azure Static Web Apps](https://learn.microsoft.com/en-us/azure/static-web-apps/plans)

[Pricing - Azure Static Web Apps](https://azure.microsoft.com/en-us/pricing/details/app-service/static/)