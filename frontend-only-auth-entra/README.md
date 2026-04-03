# Frontend-Only with Entra ID Auth — Azure Static Web App

A **zero-backend** reference project identical to [`frontend-only-public`](../frontend-only-public), but with **Microsoft Entra ID (Azure AD) authentication** enforced — unauthenticated users are automatically redirected to sign in.

## What's Different from `frontend-only-public`

| Aspect | `frontend-only-public` | `frontend-only-auth-entra` |
|--------|----------------------|---------------------------|
| **Access** | Public (anyone) | Entra ID sign-in required |
| **SKU** | Free | Standard (required for custom auth providers) |
| **Config** | None | `staticwebapp.config.json` with route rules |
| **Deploy script** | Provisions SWA only | Also creates Entra ID app registration + configures app settings |
| **Extra files** | — | `staticwebapp.config.json` |

## Project Structure

```
frontend-only-auth-entra/
├── app/                         # Next.js app directory (pages + layout)
├── components/                  # React components (memory game)
├── deploy-swa.ps1               # One-command Azure deployment with Entra ID setup
├── staticwebapp.config.json     # Auth routes, Entra ID provider config
├── swa-cli.config.json          # SWA CLI configuration
├── next.config.ts               # Next.js config (static export)
├── package.json
└── tsconfig.json
```

## Prerequisites

| Tool | Install |
|------|---------|
| **Node.js** ≥ 18 | [nodejs.org](https://nodejs.org) |
| **Azure CLI** | [Install Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli) |
| **SWA CLI** | Auto-installed by the deploy script, or `npm i -g @azure/static-web-apps-cli` |

You also need sufficient permissions in your Entra ID tenant to create an **app registration** (typically the Application Developer role or higher).

## Quick Start

```powershell
# Install dependencies
npm install

# Run locally (no auth enforced locally)
npm run dev          # http://localhost:3000

# Build static export
npm run build        # produces ./out/
```

## Deploy to Azure (with Entra ID Auth)

```powershell
# 1. Log in to Azure
az login

# 2. Deploy — builds, provisions SWA, creates Entra app registration, deploys
.\deploy-swa.ps1

# Optional: customize names
.\deploy-swa.ps1 -ResourceGroup my-rg -AppName my-swa -EntraAppName my-app-reg

# Optional: specify tenant explicitly
.\deploy-swa.ps1 -TenantId "00000000-0000-0000-0000-000000000000"

# Optional: skip build if out/ is already current
.\deploy-swa.ps1 -SkipBuild
```

### What the Deploy Script Does

1. Runs `npm ci` + `npm run build` to produce the `out/` folder
2. Creates the resource group and Static Web App (**Standard tier** — required for custom auth)
3. Creates an Entra ID app registration with the correct redirect URI
4. Sets the `AAD_CLIENT_ID` app setting on the SWA
5. Patches `staticwebapp.config.json` with your tenant ID
6. Deploys the `out/` folder via SWA CLI
7. Prints the live URL, tenant ID, and client ID

## How Entra ID Auth Works

Azure Static Web Apps has a [built-in authentication framework](https://learn.microsoft.com/azure/static-web-apps/authentication-authorization) that handles the OAuth 2.0 / OpenID Connect flow without any backend code.

### Auth Flow

```
User visits site
    → SWA checks for auth cookie
    → If missing, returns 401
    → 401 triggers redirect to /.auth/login/aad (Entra ID sign-in page)
    → User signs in
    → Entra ID redirects back to /.auth/login/aad/callback
    → SWA sets auth cookie
    → User is redirected to the original page
```

### Key Configuration: `staticwebapp.config.json`

```json
{
  "auth": {
    "identityProviders": {
      "azureActiveDirectory": {
        "registration": {
          "openIdIssuer": "https://login.microsoftonline.com/<TENANT_ID>/v2.0",
          "clientIdSettingName": "AAD_CLIENT_ID"
        }
      }
    }
  },
  "routes": [
    { "route": "/*", "allowedRoles": ["authenticated"] }
  ],
  "responseOverrides": {
    "401": {
      "redirect": "/.auth/login/aad?post_login_redirect_uri=.referrer",
      "statusCode": 302
    }
  }
}
```

- **`openIdIssuer`** — Points to your Entra ID tenant's OpenID configuration
- **`clientIdSettingName`** — References the app setting name (not the value) where the Client ID is stored
- **`routes`** — Requires the `authenticated` role for all pages
- **`responseOverrides`** — Automatically redirects 401s to the Entra sign-in page

### Accessing User Info (Client-Side)

Once authenticated, you can fetch the current user's info from the built-in `/.auth/me` endpoint:

```typescript
const response = await fetch("/.auth/me");
const { clientPrincipal } = await response.json();

// clientPrincipal contains:
// {
//   identityProvider: "aad",
//   userId: "...",
//   userDetails: "user@contoso.com",
//   userRoles: ["authenticated", "anonymous"],
//   claims: [...]
// }
```

### Logout

Navigate to `/.auth/logout` or use the `/logout` route (configured as a redirect in `staticwebapp.config.json`).

## Cost Considerations

| SKU | Custom Auth | Price |
|-----|------------|-------|
| **Free** | GitHub & pre-configured AAD (invitation only) | Free |
| **Standard** | Custom OpenID Connect (Entra ID, Okta, Auth0, etc.) | ~$9/month per app |

The Standard tier is required for the custom Entra ID provider configuration used in this project. The Free tier only supports the built-in pre-configured providers.

## Restricting Access by Role or Group

To restrict to specific Entra ID groups, update your routes:

```json
{
  "routes": [
    {
      "route": "/*",
      "allowedRoles": ["reader"]
    }
  ]
}
```

Then assign roles via the Azure Portal under **Static Web Apps → Role management**, or use the [invitation system](https://learn.microsoft.com/azure/static-web-apps/authentication-authorization#role-management).

## Troubleshooting

| Issue | Fix |
|-------|-----|
| **403 after login** | Check that the Entra ID app redirect URI matches `https://<hostname>/.auth/login/aad/callback` |
| **Login loops** | Verify `AAD_CLIENT_ID` app setting matches the app registration's Application (client) ID |
| **"AADSTS50011" error** | The redirect URI in the app registration doesn't match — update it in the Azure Portal under **App registrations → Authentication** |
| **"Custom authentication not supported" error** | Upgrade the SWA from Free to Standard tier |
