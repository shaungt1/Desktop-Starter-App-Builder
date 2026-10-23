import { describe, expect, it } from "vitest";
import { isExternalWebUrl, isTrustedUrl } from "./security";

describe("isTrustedUrl", () => {
  const origins = ["https://app.example.com"];

  it("accepts the packaged interface and listed origins", () => {
    expect(isTrustedUrl("file:///C:/app/index.html", origins)).toBe(true);
    expect(isTrustedUrl("https://app.example.com/dashboard", origins)).toBe(true);
  });

  it("rejects other origins, look-alike hosts and malformed input", () => {
    expect(isTrustedUrl("https://evil.example.com", origins)).toBe(false);
    expect(isTrustedUrl("https://app.example.com.evil.net", origins)).toBe(false);
    expect(isTrustedUrl("http://app.example.com", origins)).toBe(false);
    expect(isTrustedUrl("not a url", origins)).toBe(false);
  });
});

describe("isExternalWebUrl", () => {
  it("allows only web and mail links", () => {
    expect(isExternalWebUrl("https://example.com")).toBe(true);
    expect(isExternalWebUrl("mailto:team@example.com")).toBe(true);
    expect(isExternalWebUrl("file:///etc/passwd")).toBe(false);
    expect(isExternalWebUrl("javascript:alert(1)")).toBe(false);
  });
});
