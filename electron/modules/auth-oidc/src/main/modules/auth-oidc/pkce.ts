/**
 * OAuth 2.0 PKCE helpers (RFC 7636). The app is a public client with no
 * secret: it proves it started the sign-in by presenting a random
 * "verifier" whose SHA-256 hash ("challenge") it sent first.
 */
import { createHash, randomBytes } from "node:crypto";

export function base64Url(buffer: Buffer): string {
  return buffer.toString("base64url");
}

export function randomToken(bytes = 32): string {
  return base64Url(randomBytes(bytes));
}

export function codeChallenge(verifier: string): string {
  return base64Url(createHash("sha256").update(verifier).digest());
}

export interface PkceRequest {
  verifier: string;
  challenge: string;
  state: string;
  nonce: string;
}

export function createPkceRequest(): PkceRequest {
  const verifier = randomToken(48);
  return { verifier, challenge: codeChallenge(verifier), state: randomToken(16), nonce: randomToken(16) };
}

/** Decodes a JWT payload without verifying the signature (see oidc-client.ts for why that is acceptable here). */
export function decodeJwtPayload(token: string): Record<string, unknown> {
  const payload = token.split(".")[1];
  if (!payload) {
    throw new Error("Malformed ID token.");
  }
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<string, unknown>;
}
