---
name: georgedrury-auth
description: Add "Login with George Drury" single sign-on to a personal project as an OAuth 2.1 / OIDC client of auth.georgedrury.co.uk. Use when setting up authentication on a new personal site or app that should share the central login instead of rolling its own. Covers registering the client, installing the DB-free SSO block with design-studio add, gating pages on the session, and the better-auth alternative for projects that already have a database.
---

# Login with George Drury

`auth.georgedrury.co.uk` is the central single sign-on for George's personal
projects – passwordless (email OTP or passkey), allowlisted, and a standard
OAuth 2.1 / OIDC provider. A new project becomes a client of it rather than
owning users. These are single-identity tools: they authenticate George, they
do not create users, so the default integration needs **no database and no
auth framework** – the `georgedrury-sso` registry block is four small files
and four env vars.

## Provider endpoints

Issuer: `https://auth.georgedrury.co.uk/api/auth`. Everything auto-resolves
from the discovery document:

```
https://auth.georgedrury.co.uk/api/auth/.well-known/openid-configuration
```

For reference:

| Endpoint | Path |
| --- | --- |
| authorize | `/api/auth/oauth2/authorize` |
| token | `/api/auth/oauth2/token` |
| userinfo | `/api/auth/oauth2/userinfo` |
| jwks | `/api/auth/jwks` |
| end session | `/api/auth/oauth2/end-session` |

Scopes: `openid`, `profile`, `email`, `offline_access`. Grants:
`authorization_code` (PKCE enforced), `refresh_token`, `client_credentials`.

## 1. Register the app (once, on the auth service)

Sign in at `auth.georgedrury.co.uk` and open the dashboard, then **Register
client**. Fill in:

- **Name**: the app's display name.
- **Redirect URIs** (one per line): `https://<app-domain>/api/sso/callback`,
  plus `http://localhost:3000/api/sso/callback` for local dev.
- **Scopes**: keep the default `openid profile email offline_access` –
  `offline_access` is what yields the refresh token silent renewal runs on.
- **First-party app**: leave on so the client carries `skip_consent` and the
  consent screen is bypassed.

Registering returns the `client_id` and `client_secret`. The secret is hashed
at rest and shown **once** – copy it immediately (rotate from the dashboard if
it's lost). Hand-inserted database rows won't work; the hash won't match and
token exchange will fail.

## 2. Install the block

```sh
design-studio add georgedrury-sso
```

This installs `jose` and writes:

| File | Role |
| --- | --- |
| `lib/sso.ts` | PKCE, token exchange, refresh, encrypted session cookie, `getSession` |
| `proxy.ts` | deny-by-default gate – redirects to sign-in, renews stale sessions |
| `app/api/sso/login/route.ts` | starts the OAuth redirect |
| `app/api/sso/callback/route.ts` | exchanges the code, seals the session cookie |
| `app/api/sso/signout/route.ts` | clears the session cookie |
| `components/sign-in-with-george.tsx` | the sign-in button |
| `app/login/page.tsx` | convenience login page |

Then fill `.env.local` (the add stubs the keys):

```sh
GEORGEDRURY_CLIENT_ID="…from step 1…"
GEORGEDRURY_CLIENT_SECRET="…from step 1…"
GEORGEDRURY_AUTH_URL="https://auth.georgedrury.co.uk"
SSO_COOKIE_SECRET="$(openssl rand -base64 32)"
```

`SSO_COOKIE_SECRET` is any long random string – it is hashed to the cookie
encryption key, so there is no format requirement.

## 3. Gate on the session

The installed `proxy.ts` gates everything by default – any route not in its
`PUBLIC_PATHS` array redirects to sign-in, and stale sessions renew there.
For a proprietary tool that is usually all the auth code the project needs;
read the identity wherever it matters:

```tsx
import { getSession } from '@/lib/sso';

const session = await getSession();
// session?.email is the identity – no allowlist, no user table
```

For a mostly public site (or one with its own proxy already), delete the
block's `proxy.ts` and gate individual pages instead:

```tsx
// app/page.tsx (or a layout)
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/sso';

export default async function Page() {
  const session = await getSession();
  if (!session) redirect('/login');
  return <App />;
}
```

Without the proxy there is no writable context renewing sessions on page
loads, so call `refreshSession()` from a route handler or server action if
the ten-minute revocation bound matters – otherwise a revoked client lingers
until the id_token expires.

Sign-out is a form post:

```tsx
<form action="/api/sso/signout" method="post">
  <button type="submit">Sign out</button>
</form>
```

## How the session works

No database, no better-auth. The provider's **id_token** (a JWKS-signed JWT
carrying `email`) is the session credential, held with the refresh token in an
encrypted httpOnly cookie. `getSession()` verifies it statelessly with `jose`
against `/api/auth/jwks`, checking issuer and audience.

Revocation: deleting or rotating the client in the dashboard kills its refresh
tokens immediately, but an already-minted id_token stays signature-valid for
hours. The block therefore treats id_tokens older than ten minutes as stale
and renews them in `proxy.ts` on the next request – a revoked client fails
that refresh and the session is cleared. Sessions surviving past a revoke are
bounded by that refresh cadence, not the token lifetime. (`getSession()`
itself never writes – server component renders can't set cookies – it just
reports `stale: true`; `refreshSession()` is the same renewal for route
handlers and server actions.) Expired sessions also self-heal on the next
sign-in redirect – the provider keeps its own session, so the round trip is
silent.

## Allowlist behaviour

The auth service only issues a code to allowlisted addresses. A non-allowlisted
person can press the button but cannot complete sign-in – they stall at
`auth.georgedrury.co.uk`, never reaching the callback. The client project needs
no allowlist of its own; gate on "has a session" and treat every signed-in user
as trusted.

## Verify

Click the button → redirected to `auth.georgedrury.co.uk` → passkey or email
code → returned to the callback → `getSession` returns the user. In dev,
register the `localhost:3000` redirect URI (step 1) or the callback is
rejected. First-party clients are managed from the dashboard's Clients panel
(rotate secret, delete); they do not appear under "Authorised apps", which
only lists consent-screen grants.

## Alternative: the project already has a database

If the client project runs better-auth with its own database anyway, skip the
block and wire the provider as a `genericOAuth` entry instead – redirect URI
`https://<app-domain>/api/auth/oauth2/callback/georgedrury`:

```ts
// lib/auth.ts
import { betterAuth } from 'better-auth';
import { genericOAuth } from 'better-auth/plugins';

export const auth = betterAuth({
  // …database, baseURL, secret per george-stack…
  plugins: [
    genericOAuth({
      config: [
        {
          providerId: 'georgedrury',
          discoveryUrl:
            'https://auth.georgedrury.co.uk/api/auth/.well-known/openid-configuration',
          clientId: process.env.GEORGEDRURY_CLIENT_ID as string,
          clientSecret: process.env.GEORGEDRURY_CLIENT_SECRET as string,
          scopes: ['openid', 'profile', 'email'],
        },
      ],
    }),
  ],
});
```

Client side, `createAuthClient({ plugins: [genericOAuthClient()] })` and
`authClient.signIn.oauth2({ providerId: 'georgedrury', callbackURL: '/' })`.
better-auth serves the callback automatically and `auth.api.getSession` reads
the session.
