# Enabling Authentication (Free Tier)

Azure Static Web Apps on the **Free tier** includes two pre-configured identity providers that work out of the box — no app registration or custom configuration required:

- **Microsoft Entra ID (Azure AD)** — `/.auth/login/aad`
- **GitHub** — `/.auth/login/github`

## Step 1: Add `staticwebapp.config.json`

Create a `staticwebapp.config.json` file in the project root (next to `package.json`):

```json
{
  "routes": [
    {
      "route": "/*",
      "allowedRoles": ["authenticated"]
    }
  ],
  "responseOverrides": {
    "401": {
      "statusCode": 302,
      "redirect": "/login"
    }
  },
  "navigationFallback": {
    "rewrite": "/index.html"
  }
}
```

This locks down all routes to authenticated users and redirects unauthenticated visitors to a `/login` page.

## Step 2: Create a Login Page

Add a simple login page at `public/login.html` (or as a route in your app) that presents both sign-in options:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sign In</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0f172a;
      color: #f1f5f9;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
    }
    .login-card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 2.5rem;
      text-align: center;
      max-width: 380px;
      width: 100%;
    }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    p  { color: #94a3b8; margin-bottom: 1.5rem; font-size: 0.95rem; }
    .btn {
      display: block;
      width: 100%;
      padding: 0.75rem;
      margin-bottom: 0.75rem;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      text-align: center;
    }
    .btn-microsoft { background: #6366f1; color: white; }
    .btn-microsoft:hover { background: #818cf8; }
    .btn-github { background: #333; color: white; }
    .btn-github:hover { background: #555; }
  </style>
</head>
<body>
  <div class="login-card">
    <h1>Sign In</h1>
    <p>Choose a provider to continue</p>
    <a class="btn btn-microsoft" href="/.auth/login/aad">
      Sign in with Microsoft
    </a>
    <a class="btn btn-github" href="/.auth/login/github">
      Sign in with GitHub
    </a>
  </div>
</body>
</html>
```

> **Note:** The login page itself must be accessible without authentication. Add an exception route in `staticwebapp.config.json`:

```json
{
  "routes": [
    {
      "route": "/login",
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
      "redirect": "/login"
    }
  }
}
```

Route order matters — more specific routes must come first.

## Step 3: Redeploy

Rebuild and redeploy so the config and login page are included in the `out/` folder:

```powershell
.\deploy-swa.ps1
```

After deployment, unauthenticated visitors will be redirected to your login page, where they can choose Microsoft or GitHub.

## Step 4: Invite Users (Required)

On the Free tier, authentication alone does not grant access. Users who sign in will have the `anonymous` role by default. You must **invite** each user and assign them a role to match your route rules.

1. Go to the **Azure Portal** → your Static Web App → **Role management**
2. Click **Invite**
3. Enter the user's email, select the provider (`aad` or `github`), and assign the role `authenticated`
4. The user receives an invitation link — once they accept, they can access the app

## Accessing User Info

Once signed in, you can fetch user details from the built-in endpoint:

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

Navigate users to `/.auth/logout` to sign them out. You can add a convenience route:

```json
{
  "routes": [
    { "route": "/logout", "redirect": "/.auth/logout" }
  ]
}
```

## Disabling a Provider

To disable a provider you don't want, return a 404 for its login route:

```json
{
  "routes": [
    { "route": "/.auth/login/github", "statusCode": 404 }
  ]
}
```

## Summary

| Item | Value |
|------|-------|
| **SKU** | Free |
| **Providers** | Microsoft Entra ID + GitHub (pre-configured) |
| **App registration needed?** | No |
| **User access** | Invitation-based (Azure Portal → Role management) |
| **Microsoft login URL** | `/.auth/login/aad` |
| **GitHub login URL** | `/.auth/login/github` |
| **User info endpoint** | `/.auth/me` |
| **Logout URL** | `/.auth/logout` |

For more details, see the [Azure Static Web Apps authentication docs](https://learn.microsoft.com/azure/static-web-apps/authentication-authorization).
