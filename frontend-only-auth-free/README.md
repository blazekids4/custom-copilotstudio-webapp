# Frontend-Only with Free Tier Auth — Azure Static Web App

A **zero-backend** reference project identical to [`frontend-only-public`](../frontend-only-public), but with **authentication required** using Azure Static Web Apps' built-in pre-configured providers — **Microsoft Entra ID** and **GitHub** — on the **Free tier**.

No app registration, no custom OAuth configuration, no cost.

## How It Compares

| Aspect | `frontend-only-public` | `frontend-only-auth-free` | `frontend-only-auth-entra` |
|--------|----------------------|--------------------------|---------------------------|
| **Access** | Public | Sign-in required | Sign-in required |
| **SKU** | Free | Free | Standard (~$9/mo) |
| **Providers** | — | Entra ID + GitHub (shared) | Entra ID (custom app reg) |
| **Tenant lock** | — | No (any Microsoft/GitHub account) | Yes (your org only) |
| **User management** | — | Invitation-based | Tenant-wide or group-based |
| **App registration** | — | Not needed | Created automatically |

## Project Structure

```
frontend-only-auth-free/
├── app/                         # Next.js app directory (pages + layout)
├── components/                  # React components (memory game)
├── public/
│   └── login.html               # Login page with Microsoft + GitHub buttons
├── deploy-swa.ps1               # One-command deployment script
├── staticwebapp.config.json     # Route rules + auth config
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

## Quick Start

```powershell
# Install dependencies
npm install

# Run locally (auth is not enforced locally)
npm run dev          # http://localhost:3000

# Build static export
npm run build        # produces ./out/
```

## Deploy

```powershell
# 1. Log in to Azure
az login

# 2. Deploy
.\deploy-swa.ps1

# Optional: customize names
.\deploy-swa.ps1 -ResourceGroup my-rg -AppName my-swa -Location westus2

# Optional: skip build
.\deploy-swa.ps1 -SkipBuild
```

The script will:
1. Run `npm ci` + `npm run build`
2. Copy `staticwebapp.config.json` and `login.html` into the `out/` folder
3. Create the resource group and Static Web App (Free tier)
4. Deploy via SWA CLI
5. Print the live URL and next steps

## How Auth Works

### Flow

```
User visits any page
  → SWA checks for auth cookie
  → No cookie → 401
  → 401 triggers redirect to /login.html
  → User clicks "Sign in with Microsoft" or "Sign in with GitHub"
  → Redirected to /.auth/login/aad or /.auth/login/github
  → Identity provider handles sign-in
  → Callback sets auth cookie
  → User redirected to the app
```

### Key File: `staticwebapp.config.json`

```json
{
  "routes": [
    {
      "route": "/login.html",
      "allowedRoles": ["anonymous"]
    },
    {
      "route": "/*",
      "allowedRoles": ["authenticated"]
    }
  ],
  "responseOverrides": {
    "401": {
      "statusCode": 302,
      "redirect": "/login.html"
    }
  }
}
```

- `/login.html` is accessible to everyone (anonymous)
- All other routes require the `authenticated` role
- Unauthenticated requests are redirected to the login page

## Inviting Users (Required)

On the Free tier, anyone with a Microsoft or GitHub account can **authenticate**, but they only get the `anonymous` role. To actually access protected routes, users must be **invited** and assigned a role.

1. Go to the **Azure Portal** → your Static Web App → **Role management**
2. Click **Invite**
3. Enter the user's email
4. Select the provider: `aad` (Microsoft) or `github`
5. Assign the role: `authenticated`
6. Click **Generate invite link**
7. Share the link with the user — once they accept, they can access the app

## Accessing User Info

Once signed in, fetch user details from the built-in endpoint:

```typescript
const res = await fetch("/.auth/me");
const { clientPrincipal } = await res.json();

// clientPrincipal:
// {
//   identityProvider: "aad" | "github",
//   userId: "abc123...",
//   userDetails: "user@contoso.com",
//   userRoles: ["anonymous", "authenticated"]
// }
```

## Logout

Navigate to `/.auth/logout` to sign out and clear the auth cookie.

## Disabling a Provider

To remove one of the sign-in options, add a 404 route in `staticwebapp.config.json`:

```json
{
  "routes": [
    { "route": "/.auth/login/github", "statusCode": 404 }
  ]
}
```

And remove the corresponding button from `public/login.html`.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| **User can sign in but gets 403** | They haven't been invited — go to Role management and invite them with the `authenticated` role |
| **Login page doesn't appear** | Make sure `staticwebapp.config.json` and `login.html` are in the `out/` folder (the deploy script handles this) |
| **Auth works in production but not locally** | Expected — SWA auth endpoints only work when deployed. Use `swa start` for local auth emulation |

## Local Auth Emulation

To test auth locally, use the SWA CLI dev server instead of `npm run dev`:

```powershell
npm run build
swa start ./out
```

This starts a local emulator at `http://localhost:4280` with mock auth support.
