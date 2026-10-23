---
name: desktop-auth
description: Configure and troubleshoot sign-in (auth-oidc module) with an OpenID Connect provider. Use when setting up the identity provider or when sign-in fails.
---

# Auth

This skill belongs to Desktop Starter App Builder. `AGENT_START.md` in the builder root is the authority; if this skill and that file disagree, follow `AGENT_START.md`.

## Steps
1. Confirm the module is installed (`.desktop-starter.json`) or add it with desktop-module-add.
2. Confirm `moduleOptions["auth-oidc"]` has `issuer` and `clientId` of a public (native/SPA) client with no secret.
3. Tell the user to register `<scheme>://auth/callback` as a redirect URI at the provider; the scheme is in `app.config.json`.
4. To test, run the app (installed build on Linux), click Sign in, complete login in the browser and confirm the status shows the signed-in user.
5. Main-process or Rust code that calls APIs uses `getAccessToken()` / `access_token()`; tokens never go to the interface.

## Done when
Sign-in completes and the module's unit tests pass.
