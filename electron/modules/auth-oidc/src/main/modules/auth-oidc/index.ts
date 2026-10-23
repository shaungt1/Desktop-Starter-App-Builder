/**
 * Sign-in module (OpenID Connect with PKCE in the system browser).
 *
 * Plan options (moduleOptions["auth-oidc"]): issuer, clientId, scopes, audience.
 * Register <scheme>://auth/callback as a redirect URI at your identity provider.
 * Tokens are kept in secure storage; the renderer only sees who is signed in.
 * Other main-process code calls `getAccessToken()` to call your APIs.
 */
import { net, shell } from "electron";
import { appConfig, moduleOptions } from "../../app-config";
import { onDeepLink } from "../../deep-links";
import { procedure } from "../../ipc/procedure";
import { getSecretStore } from "../secure-storage";
import { defineMainModule } from "../types";
import { createOidcClient, type OidcClient, type TokenSet, type UserClaims } from "./oidc-client";

const TOKEN_KEY = "auth-oidc.tokens";
const USER_KEY = "auth-oidc.user";
const CALLBACK_TIMEOUT_MS = 5 * 60 * 1000;
/** Refresh this long before expiry so a request never carries a token that expires mid-flight. */
const REFRESH_MARGIN_MS = 60 * 1000;

interface Options extends Record<string, unknown> {
  issuer: string;
  clientId: string;
  scopes: string | string[];
  audience: string;
}

let client: OidcClient | undefined;
const waiters = new Map<string, (url: URL) => void>();

function settings() {
  const options = moduleOptions<Options>("auth-oidc");
  if (!options.issuer || !options.clientId) {
    throw new Error('Set moduleOptions["auth-oidc"].issuer and clientId in the project plan.');
  }
  const scopes = options.scopes ?? "openid profile email offline_access";
  return {
    issuer: options.issuer,
    clientId: options.clientId,
    audience: options.audience,
    redirectUri: `${appConfig.scheme}://auth/callback`,
    scopes: Array.isArray(scopes) ? scopes : scopes.split(/[\s,]+/u).filter(Boolean),
  };
}

function oidc(): OidcClient {
  client ??= createOidcClient(settings(), {
    fetch: (url, init) => net.fetch(url, init),
    openBrowser: (url) => shell.openExternal(url),
    waitForCallback: (state) =>
      new Promise<URL>((resolve, reject) => {
        const timer = setTimeout(() => {
          waiters.delete(state);
          reject(new Error("Sign-in timed out."));
        }, CALLBACK_TIMEOUT_MS);
        waiters.set(state, (url) => {
          clearTimeout(timer);
          waiters.delete(state);
          resolve(url);
        });
      }),
  });
  return client;
}

function readTokens(): TokenSet | undefined {
  const raw = getSecretStore().get(TOKEN_KEY);
  return raw ? (JSON.parse(raw) as TokenSet) : undefined;
}

function readUser(): UserClaims | undefined {
  const raw = getSecretStore().get(USER_KEY);
  return raw ? (JSON.parse(raw) as UserClaims) : undefined;
}

/** A valid access token for API calls from the main process, refreshing it when needed. */
export async function getAccessToken(): Promise<string | undefined> {
  const tokens = readTokens();
  if (!tokens) {
    return undefined;
  }
  if (tokens.expiresAt - REFRESH_MARGIN_MS > Date.now()) {
    return tokens.accessToken;
  }
  if (!tokens.refreshToken) {
    return undefined;
  }
  const refreshed = await oidc().refresh(tokens.refreshToken);
  getSecretStore().set(TOKEN_KEY, JSON.stringify(refreshed));
  return refreshed.accessToken;
}

export const mainModule = defineMainModule({
  id: "auth-oidc",
  setup({ logger }) {
    onDeepLink((url) => {
      if (url.host !== "auth" || url.pathname !== "/callback") {
        return;
      }
      const state = url.searchParams.get("state") ?? "";
      const resolve = waiters.get(state);
      if (resolve) {
        resolve(url);
      } else {
        logger.warn("Ignored sign-in callback with an unknown state.");
      }
    });
  },
  router: {
    status: procedure.handler(() => {
      const user = readUser();
      return { signedIn: Boolean(readTokens()), user: user ?? null };
    }),
    signIn: procedure.handler(async () => {
      const { tokens, user } = await oidc().signIn();
      getSecretStore().set(TOKEN_KEY, JSON.stringify(tokens));
      if (user) {
        getSecretStore().set(USER_KEY, JSON.stringify(user));
      }
      return { signedIn: true, user: user ?? null };
    }),
    signOut: procedure.handler(async () => {
      const idToken = readTokens()?.idToken;
      getSecretStore().delete(TOKEN_KEY);
      getSecretStore().delete(USER_KEY);
      const logoutUrl = await oidc()
        .signOutUrl(idToken)
        .catch(() => undefined);
      if (logoutUrl) {
        await shell.openExternal(logoutUrl);
      }
      return { signedIn: false, user: null };
    }),
  },
});
