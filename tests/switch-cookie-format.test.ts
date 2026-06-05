import { describe, it, expect } from "vitest";
import {
  stringFromBase64URL,
  stringToBase64URL,
} from "@supabase/ssr/dist/module/utils/base64url";
import { combineChunks } from "@supabase/ssr/dist/module/utils/chunker";

const CHUNK_SIZE = 3180;

// Stesso identico codice della route /api/auth/switch/[id].
function stringToBase64URLNode(str: string): string {
  return Buffer.from(str, "utf-8").toString("base64url");
}

function chunkCookieValue(value: string): string[] {
  if (encodeURIComponent(value).length <= CHUNK_SIZE) {
    return [value];
  }
  const chunks: string[] = [];
  let remaining = value;
  while (remaining.length > 0) {
    let sliceLen = Math.min(remaining.length, CHUNK_SIZE);
    while (
      sliceLen > 0 &&
      encodeURIComponent(remaining.slice(0, sliceLen)).length > CHUNK_SIZE
    ) {
      sliceLen--;
    }
    if (sliceLen <= 0) sliceLen = 1;
    chunks.push(remaining.slice(0, sliceLen));
    remaining = remaining.slice(sliceLen);
  }
  return chunks;
}

describe("base64url Node Buffer vs @supabase/ssr", () => {
  it("Buffer base64url produce lo stesso output di stringToBase64URL", () => {
    const samples = [
      "hello",
      "{}",
      '{"access_token":"abc.def.ghi","refresh_token":"xyz","expires_at":1234567890}',
      "Ciao, sono italian: à è ì ò ù",
    ];
    for (const s of samples) {
      expect(stringToBase64URLNode(s)).toBe(stringToBase64URL(s));
    }
  });
});

describe("switch cookie format round-trip", () => {
  function buildCookies(sessionJson: string, cookieName: string) {
    const cookieValue = "base64-" + stringToBase64URLNode(sessionJson);
    const chunks = chunkCookieValue(cookieValue);
    if (chunks.length === 1) {
      return [{ name: cookieName, value: chunks[0] }];
    }
    return chunks.map((c, i) => ({ name: `${cookieName}.${i}`, value: c }));
  }

  function readSession(
    cookies: { name: string; value: string }[],
    cookieName: string
  ): unknown {
    // Replica esatta del read di @supabase/ssr (cookies.js server storage):
    // combineChunks, poi se inizia con "base64-" decodifica.
    const retrieveSync = (name: string) =>
      Promise.resolve(cookies.find((c) => c.name === name)?.value ?? null);
    // combineChunks e' async ma sync-friendly qui
    return combineChunks(cookieName, retrieveSync).then((joined) => {
      if (!joined) return null;
      const decoded = joined.startsWith("base64-")
        ? stringFromBase64URL(joined.substring("base64-".length))
        : joined;
      return JSON.parse(decoded);
    });
  }

  it("singolo cookie (session piccola) si decodifica correttamente", async () => {
    const session = {
      access_token:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJleHAiOjE3MDAwMDAwMDB9.signature",
      refresh_token: "some-refresh-token-xyz",
      expires_at: 1700000000,
      expires_in: 3600,
      token_type: "bearer",
      user: { id: "abc", email: "test@test.com" },
      provider_token: null,
      provider_refresh_token: null,
    };
    const sessionJson = JSON.stringify(session);
    const cookies = buildCookies(sessionJson, "sb-test-auth-token");
    expect(cookies).toHaveLength(1);
    expect(cookies[0].name).toBe("sb-test-auth-token");
    expect(cookies[0].value).toMatch(/^base64-/);

    const recovered = await readSession(cookies, "sb-test-auth-token");
    expect(recovered).toEqual(session);
  });

  it("session grande (>3180 encoded) viene chunked e ricomposta", async () => {
    const bigUser: Record<string, unknown> = { id: "abc", email: "test@test.com" };
    for (let i = 0; i < 50; i++) {
      bigUser[`field_${i}`] = "x".repeat(100);
    }
    const session = {
      access_token: "x".repeat(700),
      refresh_token: "x".repeat(50),
      expires_at: 1700000000,
      expires_in: 3600,
      token_type: "bearer",
      user: bigUser,
    };
    const sessionJson = JSON.stringify(session);
    const cookies = buildCookies(sessionJson, "sb-test-auth-token");
    expect(cookies.length).toBeGreaterThan(1);
    for (const c of cookies) {
      expect(c.name).toMatch(/^sb-test-auth-token\.\d+$/);
      expect(encodeURIComponent(c.value).length).toBeLessThanOrEqual(CHUNK_SIZE);
    }

    const recovered = await readSession(cookies, "sb-test-auth-token");
    expect(recovered).toEqual(session);
  });
});
