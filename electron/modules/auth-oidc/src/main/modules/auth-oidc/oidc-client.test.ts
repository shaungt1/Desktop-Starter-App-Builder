import { describe, expect, it, vi } from "vitest";
import { createOidcClient } from "./oidc-client";
import { codeChallenge } from "./pkce";

const ISSUER = "https://id.example.com";
const NOW = 1_800_000_000_000;

function idToken(claims: Record<string, unknown>): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none" })}.${encode(claims)}.`;
}

describe("PKCE", () => {
  it("derives the RFC 7636 example challenge", () => {
    expect(codeChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe(
      "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
    );
  });
});

describe("OIDC client", () => {
  it("signs in with PKCE and validates the ID token", async () => {
    let authorizeUrl = "";
    let tokenBody = "";
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/.well-known/openid-configuration")) {
        return Response.json({
          issuer: ISSUER,
          authorization_endpoint: `${ISSUER}/authorize`,
          token_endpoint: `${ISSUER}/token`,
        });
      }
      tokenBody = String(init?.body);
      const nonce = new URL(authorizeUrl).searchParams.get("nonce");
      return Response.json({
        access_token: "access",
        refresh_token: "refresh",
        expires_in: 600,
        id_token: idToken({
          iss: ISSUER,
          aud: "desktop",
          sub: "user-1",
          email: "a@example.com",
          exp: NOW / 1000 + 600,
          nonce,
        }),
      });
    });
    const client = createOidcClient(
      { issuer: ISSUER, clientId: "desktop", redirectUri: "myapp://auth/callback", scopes: ["openid", "email"] },
      {
        fetch: fetchMock,
        now: () => NOW,
        openBrowser: async (url) => {
          authorizeUrl = url;
        },
        waitForCallback: async (state) => {
          await Promise.resolve();
          return new URL(`myapp://auth/callback?code=abc&state=${state}`);
        },
      },
    );

    const result = await client.signIn();
    const authorize = new URL(authorizeUrl);
    expect(authorize.searchParams.get("code_challenge_method")).toBe("S256");
    expect(authorize.searchParams.get("redirect_uri")).toBe("myapp://auth/callback");
    const verifier = new URLSearchParams(tokenBody).get("code_verifier") ?? "";
    expect(codeChallenge(verifier)).toBe(authorize.searchParams.get("code_challenge"));
    expect(result.user).toEqual({ sub: "user-1", email: "a@example.com", name: undefined });
    expect(result.tokens.expiresAt).toBe(NOW + 600_000);
  });

  it("rejects an ID token issued for another client", async () => {
    let nonce = "";
    const client = createOidcClient(
      { issuer: ISSUER, clientId: "desktop", redirectUri: "myapp://auth/callback", scopes: ["openid"] },
      {
        now: () => NOW,
        fetch: async (url) =>
          url.endsWith("openid-configuration")
            ? Response.json({ issuer: ISSUER, authorization_endpoint: `${ISSUER}/a`, token_endpoint: `${ISSUER}/t` })
            : Response.json({
                access_token: "x",
                id_token: idToken({ iss: ISSUER, aud: "someone-else", sub: "u", exp: NOW / 1000 + 60, nonce }),
              }),
        openBrowser: async (url) => {
          nonce = new URL(url).searchParams.get("nonce") ?? "";
        },
        waitForCallback: async (state) => new URL(`myapp://auth/callback?code=c&state=${state}`),
      },
    );
    await expect(client.signIn()).rejects.toThrow(/audience/u);
  });
});
